import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGpa } from '../hooks/GpaProvider';
import { compareSlots, formatGpa, shortSemesterTitle } from '../model/gpa';
import { DegreeBadge } from './CgpaHero';

const hiddenKey = (studentId: string) => `nexium:hide-cgpa:${studentId}`;

function readHidden(studentId: string): boolean {
  try {
    return localStorage.getItem(hiddenKey(studentId)) === '1';
  } catch {
    return false;
  }
}

/**
 * The student's CGPA on their home page, once they have graded at least one course.
 * Students who haven't started see nothing here (the GPA quick action is below).
 */
export default function DashboardCgpaCard({ studentId }: { studentId: string }) {
  const { loading, semesters, summary, pendingSyncCount } = useGpa();
  const [hidden, setHidden] = useState(() => readHidden(studentId));

  useEffect(() => { setHidden(readHidden(studentId)); }, [studentId]);

  const latest = useMemo(
    () => [...semesters].sort(compareSlots).reverse().find((semester) => semester.totals.gpa !== null) ?? null,
    [semesters],
  );

  // Most students have nothing to show yet, so no placeholder while loading.
  if (loading && semesters.length === 0) return null;

  const hasFinal = summary.cgpa !== null;
  const headline = hasFinal ? summary.cgpa : summary.projectedCgpa;
  if (headline === null) return null;

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    try {
      if (next) localStorage.setItem(hiddenKey(studentId), '1');
      else localStorage.removeItem(hiddenKey(studentId));
    } catch {
      // Private mode: the choice lasts until the page closes.
    }
  }

  return (
    <section className="card-base p-5 sm:p-6 mb-8" aria-labelledby="home-cgpa-heading">
      <div className="flex items-start justify-between gap-3">
        <p id="home-cgpa-heading" className="text-xs uppercase tracking-wider text-accent font-semibold">
          {hasFinal ? 'Your CGPA' : 'Projected CGPA'}
        </p>
        <button type="button" className="btn-ghost !py-1 !px-2 text-xs -mt-1 -mr-2" onClick={toggleHidden} aria-pressed={hidden}>
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-1">
        <div className="min-w-0">
          <p className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums" data-testid="home-cgpa">
            {hidden ? <span aria-label="CGPA hidden">•.••</span> : formatGpa(headline)}
            <span className="text-base text-dim font-normal ml-1">/ 5.00</span>
          </p>
          {!hidden && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <DegreeBadge cgpa={headline} />
              <span className="text-xs text-muted">
                {hasFinal
                  ? `${summary.units} units · ${summary.finalizedSemesters} final semester${summary.finalizedSemesters === 1 ? '' : 's'}`
                  : 'From draft semesters'}
              </span>
            </div>
          )}
          {!hidden && latest && (
            <p className="text-sm text-muted mt-3">
              Latest: {shortSemesterTitle(latest.level, latest.semester)} GPA{' '}
              <span className="font-semibold text-[color:var(--nx-text)] tabular-nums">{formatGpa(latest.totals.gpa)}</span>
              {latest.status === 'draft' && <span className="text-dim"> (draft)</span>}
            </p>
          )}
          {pendingSyncCount > 0 && <p className="text-xs text-dim mt-2">Some changes are saved on this device and will sync when you are online.</p>}
        </div>
        <Link to="/student/gpa" className="btn-secondary !py-2 w-full sm:w-auto text-center justify-center shrink-0">
          Open GPA tracker
        </Link>
      </div>
    </section>
  );
}
