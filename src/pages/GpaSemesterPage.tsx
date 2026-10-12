import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import CoursePicker from '../features/gpa/components/CoursePicker';
import GradeSelect from '../features/gpa/components/GradeSelect';
import { SyncBadge } from '../features/gpa/components/SemesterCard';
import { useGpa } from '../features/gpa/hooks/GpaProvider';
import { courseFromCatalog, previousAttempt } from '../features/gpa/model/courses';
import { courseKey, formatGpa, MAX_COURSES_PER_SEMESTER, MAX_UNITS_PER_COURSE, semesterTitle, SESSIONS } from '../features/gpa/model/gpa';
import type { CatalogCourse, GpaCourse } from '../features/gpa/model/types';

const UNIT_OPTIONS = Array.from({ length: MAX_UNITS_PER_COURSE }, (_, index) => index + 1);
const HEAVY_LOAD_UNITS = 30;

function FlagToggle({ pressed, onClick, children, disabled }: { pressed: boolean; onClick: () => void; children: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border text-xs font-medium min-h-8 ${pressed ? 'bg-[color:var(--nx-accent-soft)] border-[color:var(--nx-accent)] text-accent' : 'border-nx text-dim hover:text-[color:var(--nx-text)]'}`}
    >
      {children}
    </button>
  );
}

export default function GpaSemesterPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const gpa = useGpa();
  const semester = gpa.getSemester(id);
  const [busy, setBusy] = useState<'finalize' | 'unlock' | 'delete' | 'resolve' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const existingCodes = useMemo(() => new Set((semester?.courses ?? []).map((course) => courseKey(course.code))), [semester?.courses]);

  if (!semester) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        {gpa.loading ? <div className="card-base h-64 animate-pulse" /> : (
          <>
            <div role="alert" className="alert-danger">This semester could not be found. It may have been deleted on another device.</div>
            <Link to="/student/gpa" className="btn-secondary mt-4">Back to GPA tracker</Link>
          </>
        )}
      </main>
    );
  }

  const current = semester;
  const editable = current.status === 'draft' && current.sync !== 'conflict';
  // An older or imported session outside the programme years stays selectable.
  const sessionOptions = current.sessionLabel && !SESSIONS.includes(current.sessionLabel) ? [current.sessionLabel, ...SESSIONS] : SESSIONS;
  const { totals } = current;
  const totalUnits = totals.units + totals.pendingUnits;

  function save(courses: GpaCourse[], sessionLabel = current.sessionLabel) {
    gpa.saveSemester(current.id, { sessionLabel, courses });
  }

  function updateCourse(key: string, patch: Partial<GpaCourse>) {
    save(current.courses.map((course) => (course.key === key ? { ...course, ...patch } : course)));
  }

  function addFromCatalog(courses: CatalogCourse[]) {
    const room = MAX_COURSES_PER_SEMESTER - current.courses.length;
    const added = courses.slice(0, room).map((course) => {
      const previous = previousAttempt(gpa.semesters, course.code, current);
      return courseFromCatalog(course, previous?.grade ?? null);
    });
    save([...current.courses, ...added]);
    const retakes = added.filter((course) => course.isRetake).map((course) => course.code);
    if (retakes.length) toast(`${retakes.join(', ')} marked as retake (you had an F before).`, 'info');
  }

  async function run(action: 'finalize' | 'unlock', work: () => Promise<void>, success: string) {
    setBusy(action);
    try {
      await work();
      toast(success, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    try {
      await gpa.deleteSemester(current.id);
      toast('Semester deleted.', 'success');
      navigate('/student/gpa', { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The semester could not be deleted.', 'error');
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  async function resolve(keep: 'mine' | 'saved') {
    setBusy('resolve');
    try {
      await gpa.resolveConflict(current.id, keep);
      toast(keep === 'mine' ? 'Your changes from this device were saved.' : 'Showing the saved version.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resolve the conflict.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const finalizeBlocker = current.courses.length === 0 ? 'Add your courses first.'
    : totals.pendingCourses > 0 ? `${totals.pendingCourses} course${totals.pendingCourses === 1 ? ' has' : 's have'} no grade yet.`
      : !gpa.online ? 'Connect to the internet to finalize.'
        : null;

  return (
    <main className="max-w-3xl mx-auto px-4 pt-6 pb-40">
      <Link to="/student/gpa" className="btn-ghost !px-0 mb-3">← GPA tracker</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{semesterTitle(current.level, current.semester)}</h1>
        {current.status === 'finalized' ? <span className="badge badge-success">Final</span> : <span className="badge badge-accent">Draft</span>}
        <SyncBadge semester={current} />
      </div>
      <p className="text-sm text-muted mt-1">
        {current.status === 'finalized'
          ? `Final results${current.finalizedAt ? ` since ${new Date(current.finalizedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}. Unlock to correct a grade.`
          : 'Changes save automatically, even offline. Finalize when the official results are out.'}
      </p>

      {current.sync === 'conflict' && (
        <div role="alert" className="card-base border-[color:var(--nx-danger)] p-4 mt-4">
          <p className="text-sm font-semibold">This semester was changed somewhere else</p>
          <p className="text-sm text-muted mt-1">{current.syncMessage ?? 'Choose which version to keep.'}</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button type="button" className="btn-primary justify-center" disabled={busy !== null || !gpa.online} onClick={() => void resolve('mine')}>Keep this device&apos;s changes</button>
            <button type="button" className="btn-secondary justify-center" disabled={busy !== null || !gpa.online} onClick={() => void resolve('saved')}>Use the saved version</button>
          </div>
        </div>
      )}
      {current.sync === 'error' && current.syncMessage && (
        <div role="alert" className="alert-danger mt-4 text-sm">Not saved: {current.syncMessage}</div>
      )}

      <div className="mt-5">
        <label htmlFor="session-label" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Session</label>
        <select
          id="session-label"
          className="input-base max-w-[12rem]"
          disabled={!editable}
          value={current.sessionLabel ?? ''}
          onChange={(event) => save(current.courses, event.target.value || null)}
        >
          {sessionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          <option value="">Not set</option>
        </select>
        {!editable && <p className="text-xs text-dim mt-1">Unlock the semester to change it.</p>}
      </div>

      <section className="mt-6" aria-labelledby="courses-heading">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 id="courses-heading" className="text-lg font-semibold">Courses</h2>
          <span className="text-xs text-dim">{current.courses.length} course{current.courses.length === 1 ? '' : 's'} · {totalUnits} units</span>
        </div>
        {totalUnits > HEAVY_LOAD_UNITS && (
          <p className="text-xs text-accent mb-3">That&apos;s {totalUnits} units - more than usual. Double-check for duplicates.</p>
        )}

        {current.courses.length === 0 ? (
          <p className="card-base p-5 text-sm text-muted">No courses yet. Add them below.</p>
        ) : (
          <ul className="space-y-2">
            {current.courses.map((course) => (
              <li key={course.key} className="card-base p-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{course.code}{!course.catalogCourseId && <span className="ml-2 text-[11px] text-dim font-normal">Not in course list</span>}</p>
                    <p className="text-xs text-muted truncate">{course.title}</p>
                  </div>
                  {editable ? (
                    <>
                      <button
                        type="button"
                        className="text-dim hover:text-[color:var(--nx-danger)] w-9 h-9 -mr-1 text-xl leading-none shrink-0"
                        aria-label={`Remove ${course.code}`}
                        onClick={() => save(current.courses.filter((item) => item.key !== course.key))}
                      >
                        &times;
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-muted shrink-0">{course.units} units · <span className="font-semibold text-[color:var(--nx-text)]">{course.grade ?? '?'}</span></span>
                  )}
                </div>
                {editable && (
                  <>
                    <div className="mt-3 flex gap-2">
                      <div className="min-w-0 flex-1">
                        <GradeSelect id={`grade-${course.key}`} value={course.grade} label={course.code} onChange={(grade) => updateCourse(course.key, { grade })} />
                      </div>
                      <label className="sr-only" htmlFor={`units-${course.key}`}>Units for {course.code}</label>
                      <select
                        id={`units-${course.key}`}
                        className="input-base !w-auto !py-2 !px-2 text-sm shrink-0"
                        value={course.units}
                        onChange={(event) => updateCourse(course.key, { units: Number(event.target.value) })}
                      >
                        {UNIT_OPTIONS.map((units) => <option key={units} value={units}>{units} unit{units === 1 ? '' : 's'}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <FlagToggle pressed={course.isCarryover} onClick={() => updateCourse(course.key, { isCarryover: !course.isCarryover })}>Carryover</FlagToggle>
                      <FlagToggle pressed={course.isRetake} onClick={() => updateCourse(course.key, { isRetake: !course.isRetake })}>Retake</FlagToggle>
                    </div>
                  </>
                )}
                {!editable && (course.isCarryover || course.isRetake) && (
                  <p className="text-[11px] text-dim mt-1">{[course.isCarryover && 'Carryover', course.isRetake && 'Retake'].filter(Boolean).join(' · ')}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && (
          <div className="mt-4 card-base p-4">
            <CoursePicker
              catalog={gpa.catalog}
              level={current.level}
              semester={current.semester}
              existingCodes={existingCodes}
              full={current.courses.length >= MAX_COURSES_PER_SEMESTER}
              onAddFromCatalog={addFromCatalog}
              onAddCustom={(course) => {
                const previous = previousAttempt(gpa.semesters, course.code, current);
                save([...current.courses, { ...course, isRetake: previous?.grade === 'F' }]);
              }}
            />
          </div>
        )}
      </section>

      <button type="button" className="btn-ghost text-danger mt-8" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>Delete this semester</button>

      <div
        className="fixed inset-x-0 z-30 bg-[color:rgba(24,24,27,0.97)] backdrop-blur border-t border-nx bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-dim uppercase tracking-wider">Semester GPA</p>
            <p className="text-2xl font-semibold tabular-nums leading-tight" aria-live="polite">
              {formatGpa(totals.gpa)}
              {totals.pendingCourses > 0 && <span className="text-xs text-dim font-normal ml-2">{totals.pendingCourses} blank, not counted yet</span>}
            </p>
          </div>
          {current.status === 'draft' ? (
            <div className="text-right">
              <button
                type="button"
                className="btn-primary !py-2.5"
                disabled={busy !== null || finalizeBlocker !== null || current.sync === 'conflict'}
                title={finalizeBlocker ?? undefined}
                onClick={() => void run('finalize', () => gpa.finalizeSemester(current.id), 'Semester finalized. It now counts in your CGPA.')}
              >
                {busy === 'finalize' ? 'Finalizing…' : 'Finalize results'}
              </button>
              {finalizeBlocker && <p className="text-[11px] text-dim mt-1">{finalizeBlocker}</p>}
            </div>
          ) : (
            <button
              type="button"
              className="btn-secondary !py-2.5"
              disabled={busy !== null || !gpa.online}
              title={gpa.online ? undefined : 'Connect to the internet to unlock'}
              onClick={() => void run('unlock', () => gpa.unlockSemester(current.id), 'Unlocked. Fix the grades, then finalize again.')}
            >
              {busy === 'unlock' ? 'Unlocking…' : 'Unlock to edit'}
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete this semester?"
          message={`${semesterTitle(current.level, current.semester)} and its ${current.courses.length} course${current.courses.length === 1 ? '' : 's'} will be removed from your GPA. This can't be undone.`}
          confirmLabel="Delete"
          loading={busy === 'delete'}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}
