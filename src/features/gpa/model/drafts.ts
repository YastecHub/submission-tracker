import { compareSlots, courseRowKey, courseTotals } from './gpa';
import type { GpaCourse, GpaRecordDto, GpaSemesterDto, SemesterView, SyncState } from './types';

/**
 * Edits are saved on the device first and synced to the server in the background,
 * so the tracker keeps working offline. A draft is removed once the server has it.
 */
export interface LocalDraft {
  id: string;
  level: number;
  semester: number;
  sessionLabel: string | null;
  courses: GpaCourse[];
  /** Server version this draft was based on; null for a semester never saved to the server. */
  baseVersion: number | null;
  /** Increases on every local edit, so a sync that raced a new edit doesn't drop it. */
  revision: number;
  updatedAt: number;
  sync: Exclude<SyncState, 'synced'>;
  syncMessage: string | null;
}

export type DraftMap = Record<string, LocalDraft>;

const STORAGE_PREFIX = 'nexium:gpa-drafts:v1:';

export function draftStorageKey(studentId: string): string {
  return `${STORAGE_PREFIX}${studentId}`;
}

export function loadDrafts(studentId: string): DraftMap {
  try {
    const raw = localStorage.getItem(draftStorageKey(studentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function storeDrafts(studentId: string, drafts: DraftMap): void {
  try {
    if (Object.keys(drafts).length === 0) localStorage.removeItem(draftStorageKey(studentId));
    else localStorage.setItem(draftStorageKey(studentId), JSON.stringify(drafts));
  } catch {
    // Storage full or blocked: edits still sync while the page is open.
  }
}

export function newCourseKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function coursesFromServer(semester: GpaSemesterDto): GpaCourse[] {
  return semester.courses.map((course) => ({
    id: course.id,
    key: courseRowKey(course.code),
    catalogCourseId: course.catalogCourseId,
    code: course.code,
    title: course.title,
    units: course.units,
    grade: course.grade,
    isCarryover: course.isCarryover,
    isRetake: course.isRetake,
  }));
}

/** Combines the saved record with this device's unsynced edits, in level/semester order. */
export function mergeSemesters(record: GpaRecordDto | null, drafts: DraftMap): SemesterView[] {
  const views = new Map<string, SemesterView>();
  for (const semester of record?.semesters ?? []) {
    const courses = coursesFromServer(semester);
    views.set(semester.id, {
      id: semester.id,
      level: semester.level,
      semester: semester.semester,
      sessionLabel: semester.sessionLabel,
      status: semester.status,
      finalizedAt: semester.finalizedAt,
      version: semester.version,
      courses,
      totals: courseTotals(courses),
      sync: 'synced',
      syncMessage: null,
    });
  }
  for (const draft of Object.values(drafts)) {
    const saved = views.get(draft.id);
    views.set(draft.id, {
      id: draft.id,
      level: draft.level,
      semester: draft.semester,
      sessionLabel: draft.sessionLabel,
      // Only drafts can be edited, so an unsynced edit always belongs to a draft.
      status: 'draft',
      finalizedAt: null,
      version: saved?.version ?? draft.baseVersion,
      courses: draft.courses,
      totals: courseTotals(draft.courses),
      sync: draft.sync,
      syncMessage: draft.syncMessage,
    });
  }
  return [...views.values()].sort(compareSlots);
}

export function toPayloadCourses(courses: GpaCourse[]) {
  return courses.map((course) => ({
    catalogCourseId: course.catalogCourseId,
    code: course.code,
    title: course.title,
    units: course.units,
    grade: course.grade,
    isCarryover: course.isCarryover,
    isRetake: course.isRetake,
  }));
}
