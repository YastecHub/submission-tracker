import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useStudentAuth } from '../../../context/StudentAuthContext';
import {
  createGpaSemester,
  deleteGpaSemester,
  finalizeGpaSemester,
  getCourseCatalog,
  getGpaRecord,
  importGpaCsv,
  unlockGpaSemester,
  updateGpaSemester,
} from '../api/gpa';
import { loadDrafts, mergeSemesters, newCourseKey, storeDrafts, type DraftMap, type LocalDraft } from '../model/drafts';
import { summarize } from '../model/gpa';
import type { CatalogCourse, GpaCourse, GpaRecordDto, GpaSemesterDto, GpaSummary, ImportResult, SemesterView } from '../model/types';

interface GpaContextValue {
  loading: boolean;
  loadError: boolean;
  online: boolean;
  semesters: SemesterView[];
  summary: GpaSummary;
  catalog: CatalogCourse[];
  pendingSyncCount: number;
  refresh: () => Promise<void>;
  getSemester: (id: string) => SemesterView | undefined;
  createSemester: (input: { level: number; semester: number; sessionLabel?: string | null; courses: GpaCourse[] }) => string;
  saveSemester: (id: string, content: { sessionLabel: string | null; courses: GpaCourse[] }) => void;
  finalizeSemester: (id: string) => Promise<void>;
  unlockSemester: (id: string) => Promise<void>;
  deleteSemester: (id: string) => Promise<void>;
  resolveConflict: (id: string, keep: 'mine' | 'saved') => Promise<void>;
  importCsv: (csv: string, options: { dryRun: boolean; finalize: boolean }) => Promise<ImportResult>;
  syncNow: () => Promise<void>;
}

const GpaContext = createContext<GpaContextValue | null>(null);
const SYNC_DELAY_MS = 800;

export function gpaErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response || error.response.status === 503) return 'You are offline. Connect to the internet and try again.';
    const message = (error.response.data as { error?: unknown } | undefined)?.error;
    if (typeof message === 'string') return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function isOfflineError(error: unknown): boolean {
  return axios.isAxiosError(error) && (!error.response || error.response.status === 503);
}

function upsertSemester(record: GpaRecordDto | null, semester: GpaSemesterDto): GpaRecordDto {
  const semesters = [...(record?.semesters ?? []).filter((item) => item.id !== semester.id), semester];
  return { semesters, summary: summarize(semesters) };
}

export function GpaProvider({ children }: { children: ReactNode }) {
  const { student, token } = useStudentAuth();
  const studentId = student?.id ?? null;
  const [record, setRecord] = useState<GpaRecordDto | null>(null);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [drafts, setDraftsState] = useState<DraftMap>(() => (studentId ? loadDrafts(studentId) : {}));
  const draftsRef = useRef(drafts);
  const recordRef = useRef(record);
  const syncing = useRef<Promise<void> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  recordRef.current = record;

  const setDrafts = useCallback((update: (current: DraftMap) => DraftMap) => {
    const next = update(draftsRef.current);
    draftsRef.current = next;
    setDraftsState(next);
    if (studentId) storeDrafts(studentId, next);
  }, [studentId]);

  useEffect(() => {
    const loaded = studentId ? loadDrafts(studentId) : {};
    draftsRef.current = loaded;
    setDraftsState(loaded);
  }, [studentId]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getGpaRecord(token);
      setRecord(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const patchDraft = useCallback((id: string, patch: Partial<LocalDraft>) => {
    setDrafts((current) => (current[id] ? { ...current, [id]: { ...current[id], ...patch } } : current));
  }, [setDrafts]);

  const runSync = useCallback(async () => {
    if (!token) return;
    for (const draft of Object.values(draftsRef.current)) {
      if (draft.sync !== 'pending') continue;
      const startedRevision = draft.revision;
      patchDraft(draft.id, { sync: 'syncing', syncMessage: null });
      try {
        const saved = draft.baseVersion === null
          ? await createGpaSemester(token, {
            id: draft.id, level: draft.level, semester: draft.semester, sessionLabel: draft.sessionLabel, courses: draft.courses,
          })
          : await updateGpaSemester(token, draft.id, {
            expectedVersion: draft.baseVersion, sessionLabel: draft.sessionLabel, courses: draft.courses,
          });
        setRecord((current) => upsertSemester(current, saved));
        setDrafts((current) => {
          const latest = current[draft.id];
          if (!latest) return current;
          if (latest.revision === startedRevision) {
            const { [draft.id]: _synced, ...rest } = current;
            return rest;
          }
          // Edited while syncing: keep the newer edit and send it next.
          return { ...current, [draft.id]: { ...latest, baseVersion: saved.version, sync: 'pending', syncMessage: null } };
        });
      } catch (error) {
        if (isOfflineError(error)) {
          patchDraft(draft.id, { sync: 'pending', syncMessage: null });
          setOnline(false);
          return;
        }
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status === 409 || status === 404) {
          patchDraft(draft.id, {
            sync: 'conflict',
            syncMessage: status === 404 ? 'This semester was deleted on another device.' : gpaErrorMessage(error),
          });
          void refresh();
        } else if (status === 401) {
          patchDraft(draft.id, { sync: 'pending', syncMessage: 'Sign in again to sync.' });
          return;
        } else {
          patchDraft(draft.id, { sync: 'error', syncMessage: gpaErrorMessage(error) });
        }
      }
    }
    if (Object.values(draftsRef.current).some((draft) => draft.sync === 'pending')) {
      syncTimer.current = setTimeout(() => { void syncNow(); }, SYNC_DELAY_MS);
    }
  }, [token, patchDraft, setDrafts, refresh]);

  const syncNow = useCallback(async () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    if (syncing.current) return syncing.current;
    syncing.current = runSync().finally(() => { syncing.current = null; });
    return syncing.current;
  }, [runSync]);

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { void syncNow(); }, SYNC_DELAY_MS);
  }, [syncNow]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void refresh().then(() => syncNow());
    getCourseCatalog(token).then(setCatalog).catch(() => undefined);
  }, [token, refresh, syncNow]);

  useEffect(() => {
    const goOnline = () => { setOnline(true); void syncNow(); };
    const goOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === 'visible') void syncNow(); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [syncNow]);

  const semesters = useMemo(() => mergeSemesters(record, drafts), [record, drafts]);
  const summary = useMemo(() => summarize(semesters), [semesters]);
  const pendingSyncCount = useMemo(() => Object.values(drafts).filter((draft) => draft.sync !== 'conflict').length, [drafts]);
  const getSemester = useCallback((id: string) => semesters.find((semester) => semester.id === id), [semesters]);

  const createSemester = useCallback<GpaContextValue['createSemester']>((input) => {
    const id = newCourseKey();
    setDrafts((current) => ({
      ...current,
      [id]: {
        id,
        level: input.level,
        semester: input.semester,
        sessionLabel: input.sessionLabel ?? null,
        courses: input.courses,
        baseVersion: null,
        revision: 1,
        updatedAt: Date.now(),
        sync: 'pending',
        syncMessage: null,
      },
    }));
    scheduleSync();
    return id;
  }, [setDrafts, scheduleSync]);

  const saveSemester = useCallback<GpaContextValue['saveSemester']>((id, content) => {
    const existing = draftsRef.current[id];
    const saved = recordRef.current?.semesters.find((semester) => semester.id === id);
    if (!existing && (!saved || saved.status === 'finalized')) return;
    setDrafts((current) => {
      const base = current[id];
      return {
        ...current,
        [id]: {
          id,
          level: base?.level ?? saved!.level,
          semester: base?.semester ?? saved!.semester,
          sessionLabel: content.sessionLabel,
          courses: content.courses,
          baseVersion: base ? base.baseVersion : saved!.version,
          revision: (base?.revision ?? 0) + 1,
          updatedAt: Date.now(),
          // A conflict stays a conflict until the student chooses which copy to keep.
          sync: base?.sync === 'conflict' ? 'conflict' : 'pending',
          syncMessage: base?.sync === 'conflict' ? base.syncMessage : null,
        },
      };
    });
    scheduleSync();
  }, [setDrafts, scheduleSync]);

  const requireToken = useCallback(() => {
    if (!token) throw new Error('Sign in again to continue.');
    return token;
  }, [token]);

  /** Sends any unsynced edits for this semester first; fails if they can't be saved. */
  const flushSemester = useCallback(async (id: string) => {
    if (!draftsRef.current[id]) return;
    await syncNow();
    const draft = draftsRef.current[id];
    if (draft) {
      throw new Error(draft.sync === 'conflict' || draft.sync === 'error'
        ? draft.syncMessage ?? 'Resolve the problem with this semester first.'
        : 'You are offline. Your changes are saved on this device; connect to the internet to continue.');
    }
  }, [syncNow]);

  const finalizeSemester = useCallback(async (id: string) => {
    const activeToken = requireToken();
    await flushSemester(id);
    const saved = recordRef.current?.semesters.find((semester) => semester.id === id);
    if (!saved) throw new Error('This semester is not saved yet. Connect to the internet and try again.');
    try {
      const updated = await finalizeGpaSemester(activeToken, id, saved.version);
      setRecord((current) => upsertSemester(current, updated));
    } catch (error) {
      throw new Error(gpaErrorMessage(error));
    }
  }, [requireToken, flushSemester]);

  const unlockSemester = useCallback(async (id: string) => {
    const activeToken = requireToken();
    const saved = recordRef.current?.semesters.find((semester) => semester.id === id);
    if (!saved) throw new Error('Semester not found.');
    try {
      const updated = await unlockGpaSemester(activeToken, id, saved.version);
      setRecord((current) => upsertSemester(current, updated));
    } catch (error) {
      throw new Error(gpaErrorMessage(error));
    }
  }, [requireToken]);

  const deleteSemester = useCallback(async (id: string) => {
    const activeToken = requireToken();
    const draft = draftsRef.current[id];
    const saved = recordRef.current?.semesters.find((semester) => semester.id === id);
    if (saved || draft?.baseVersion !== null) {
      try {
        await deleteGpaSemester(activeToken, id);
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status !== 404) throw new Error(gpaErrorMessage(error));
      }
    }
    setDrafts((current) => {
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
    setRecord((current) => {
      if (!current) return current;
      const remaining = current.semesters.filter((semester) => semester.id !== id);
      return { semesters: remaining, summary: summarize(remaining) };
    });
  }, [requireToken, setDrafts]);

  const resolveConflict = useCallback(async (id: string, keep: 'mine' | 'saved') => {
    const activeToken = requireToken();
    const draft = draftsRef.current[id];
    if (!draft) return;
    if (keep === 'saved') {
      setDrafts((current) => {
        const { [id]: _dropped, ...rest } = current;
        return rest;
      });
      await refresh();
      return;
    }
    let latest: GpaRecordDto;
    try {
      latest = await getGpaRecord(activeToken);
    } catch (error) {
      throw new Error(gpaErrorMessage(error));
    }
    setRecord(latest);
    let target = latest.semesters.find((semester) => semester.id === id)
      ?? latest.semesters.find((semester) => semester.level === draft.level && semester.semester === draft.semester);
    if (target?.status === 'finalized') {
      try {
        target = await unlockGpaSemester(activeToken, target.id, target.version);
        setRecord((current) => upsertSemester(current, target!));
      } catch (error) {
        throw new Error(gpaErrorMessage(error));
      }
    }
    setDrafts((current) => {
      const { [id]: mine, ...rest } = current;
      if (!mine) return current;
      const targetId = target?.id ?? id;
      return {
        ...rest,
        [targetId]: { ...mine, id: targetId, baseVersion: target ? target.version : null, revision: mine.revision + 1, sync: 'pending', syncMessage: null },
      };
    });
    await syncNow();
  }, [requireToken, setDrafts, refresh, syncNow]);

  const importCsv = useCallback<GpaContextValue['importCsv']>(async (csv, options) => {
    const activeToken = requireToken();
    if (!options.dryRun) await syncNow();
    try {
      const result = await importGpaCsv(activeToken, { csv, ...options });
      if (result.imported && result.record) setRecord(result.record);
      return result;
    } catch (error) {
      throw new Error(gpaErrorMessage(error));
    }
  }, [requireToken, syncNow]);

  const value = useMemo<GpaContextValue>(() => ({
    loading: loading && !record && Object.keys(drafts).length === 0,
    loadError: loadError && !record,
    online,
    semesters,
    summary,
    catalog,
    pendingSyncCount,
    refresh,
    getSemester,
    createSemester,
    saveSemester,
    finalizeSemester,
    unlockSemester,
    deleteSemester,
    resolveConflict,
    importCsv,
    syncNow,
  }), [loading, record, drafts, loadError, online, semesters, summary, catalog, pendingSyncCount, refresh, getSemester,
    createSemester, saveSemester, finalizeSemester, unlockSemester, deleteSemester, resolveConflict, importCsv, syncNow]);

  return <GpaContext.Provider value={value}>{children}</GpaContext.Provider>;
}

export function useGpa(): GpaContextValue {
  const value = useContext(GpaContext);
  if (!value) throw new Error('useGpa must be used inside GpaProvider');
  return value;
}
