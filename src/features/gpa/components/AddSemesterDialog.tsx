import { useMemo, useState, type FormEvent } from 'react';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { catalogForSlot, courseFromCatalog, previousAttempt } from '../model/courses';
import { LEVELS, nextOpenSlot, SEMESTERS, semesterTitle, slotKey } from '../model/gpa';
import type { CatalogCourse, GpaCourse, SemesterView } from '../model/types';

export default function AddSemesterDialog({
  semesters,
  catalog,
  onCreate,
  onOpenExisting,
  onClose,
}: {
  semesters: SemesterView[];
  catalog: CatalogCourse[];
  onCreate: (input: { level: number; semester: number; sessionLabel: string | null; courses: GpaCourse[] }) => void;
  onOpenExisting: (id: string) => void;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(onClose);
  const suggestion = useMemo(() => nextOpenSlot(semesters), [semesters]);
  const [level, setLevel] = useState(suggestion.level);
  const [semester, setSemester] = useState(suggestion.semester);
  const [session, setSession] = useState('');
  const [useCatalog, setUseCatalog] = useState(true);
  const existing = semesters.find((item) => slotKey(item.level, item.semester) === slotKey(level, semester));
  const listed = catalogForSlot(catalog, level, semester);
  const sessionValid = !session.trim() || /^\d{4}\/\d{4}$/.test(session.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (existing) {
      onOpenExisting(existing.id);
      return;
    }
    if (!sessionValid) return;
    const courses = useCatalog
      ? listed.map((course) => courseFromCatalog(course, previousAttempt(semesters, course.code, { level, semester })?.grade ?? null))
      : [];
    onCreate({ level, semester, sessionLabel: session.trim() || null, courses });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="add-semester-title">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div ref={panelRef} className="relative card-base w-full sm:max-w-md max-h-[92dvh] overflow-y-auto p-5 sm:p-6 rounded-b-none sm:rounded-b-[0.875rem] animate-fade-up">
      <form onSubmit={submit}>
        <h2 id="add-semester-title" className="text-lg font-semibold">Add a semester</h2>

        <fieldset className="mt-5">
          <legend className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Level</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {LEVELS.map((value) => (
              <button key={value} type="button" aria-pressed={level === value} onClick={() => setLevel(value)}
                className={`h-11 rounded-lg border text-sm font-semibold ${level === value ? 'bg-[color:var(--nx-accent)] text-black border-[color:var(--nx-accent)]' : 'bg-surface-2 border-nx text-muted'}`}>
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Semester</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {SEMESTERS.map((value) => (
              <button key={value} type="button" aria-pressed={semester === value} onClick={() => setSemester(value)}
                className={`h-11 rounded-lg border text-sm font-semibold ${semester === value ? 'bg-[color:var(--nx-accent)] text-black border-[color:var(--nx-accent)]' : 'bg-surface-2 border-nx text-muted'}`}>
                {value === 1 ? 'First' : 'Second'}
              </button>
            ))}
          </div>
        </fieldset>

        {existing ? (
          <p className="text-sm text-muted mt-5 bg-surface-2 border border-nx rounded-lg px-3 py-2.5">
            You already added {semesterTitle(level, semester)}. Open it to add or change courses.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <label htmlFor="semester-session" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Session <span className="normal-case font-normal text-dim">(optional)</span>
              </label>
              <input id="semester-session" className="input-base" placeholder="2025/2026" inputMode="numeric" value={session}
                onChange={(event) => setSession(event.target.value)} aria-invalid={!sessionValid} />
              {!sessionValid && <p className="text-xs text-danger mt-1">Use the format 2025/2026.</p>}
            </div>
            {listed.length > 0 ? (
              <label className="flex items-start gap-3 mt-4 cursor-pointer bg-surface-2 border border-nx rounded-lg px-3 py-3">
                <input type="checkbox" className="mt-1 accent-[color:var(--nx-accent)]" checked={useCatalog} onChange={(event) => setUseCatalog(event.target.checked)} />
                <span>
                  <span className="text-sm font-medium">Start with the {listed.length} listed course{listed.length === 1 ? '' : 's'}</span>
                  <span className="block text-xs text-dim mt-0.5">{listed.reduce((sum, course) => sum + course.units, 0)} units. Then just tap each grade. You can remove or add courses after.</span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-dim mt-4">No courses are listed for this semester yet. You can add your courses one by one.</p>
            )}
          </>
        )}

        <div className="flex gap-2 mt-6">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={!existing && !sessionValid}>{existing ? 'Open semester' : 'Add semester'}</button>
        </div>
      </form>
      </div>
    </div>
  );
}
