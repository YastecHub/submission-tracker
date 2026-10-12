import { useEffect, useMemo, useState } from 'react';
import { courseTotals, formatGpa, GRADES, MAX_GPA, roundGpa, requiredGpa, shortSemesterTitle } from '../model/gpa';
import type { Grade, SemesterView } from '../model/types';

/**
 * Two planning tools that never change saved data:
 * - What-if: pick likely grades for courses whose results aren't out yet.
 * - Target: the GPA needed next semester to reach a target CGPA.
 */
export default function GpaPlanner({ semesters, nextSemesterUnits }: { semesters: SemesterView[]; nextSemesterUnits: number }) {
  const pending = useMemo(() => semesters.flatMap((semester) => semester.courses
    .filter((course) => course.grade === null)
    .map((course) => ({ key: `${semester.id}:${course.key}`, semester, course }))), [semesters]);
  const [whatIf, setWhatIf] = useState<Record<string, Grade>>({});

  const current = useMemo(() => courseTotals(semesters.flatMap((semester) => semester.courses)), [semesters]);
  const withWhatIf = useMemo(() => courseTotals(semesters.flatMap((semester) => semester.courses.map((course) => (
    course.grade === null && whatIf[`${semester.id}:${course.key}`] ? { ...course, grade: whatIf[`${semester.id}:${course.key}`] } : course
  )))), [semesters, whatIf]);
  const whatIfCount = Object.keys(whatIf).filter((key) => pending.some((item) => item.key === key)).length;

  const suggestedTarget = current.gpa === null ? 4.5 : current.gpa >= 4.5 ? 5 : current.gpa >= 3.5 ? 4.5 : current.gpa >= 2.4 ? 3.5 : 2.4;
  const [targetText, setTargetText] = useState(suggestedTarget.toFixed(2));
  const [unitsText, setUnitsText] = useState(String(nextSemesterUnits || 20));
  const [unitsEdited, setUnitsEdited] = useState(false);
  // Follow the suggested load (course list or past average) until the student types their own.
  useEffect(() => {
    if (!unitsEdited) setUnitsText(String(nextSemesterUnits || 20));
  }, [nextSemesterUnits, unitsEdited]);
  const target = Number(targetText);
  const units = Number(unitsText);
  const validInputs = Number.isFinite(target) && target > 0 && target <= MAX_GPA && Number.isInteger(units) && units > 0 && units <= 60;
  const needed = validInputs ? requiredGpa(withWhatIf.points, withWhatIf.units, target, units) : null;
  const neededTwo = validInputs ? requiredGpa(withWhatIf.points, withWhatIf.units, target, units * 2) : null;

  return (
    <section className="card-base p-5 sm:p-6" aria-labelledby="planner-heading">
      <h2 id="planner-heading" className="text-lg font-semibold tracking-tight">Plan ahead</h2>
      <p className="text-sm text-muted mt-1">Try out grades and targets. Nothing here changes your saved results.</p>

      {pending.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">What if?</h3>
          <p className="text-xs text-dim mt-0.5">Pick the grade you expect for courses without results yet.</p>
          <ul className="mt-3 space-y-2">
            {pending.map(({ key, semester, course }) => (
              <li key={key} className="flex items-center justify-between gap-3 bg-surface-2 border border-nx rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{course.code} <span className="text-dim font-normal">· {course.units} units</span></p>
                  <p className="text-[11px] text-dim">{shortSemesterTitle(semester.level, semester.semester)}</p>
                </div>
                <label className="sr-only" htmlFor={`whatif-${key}`}>Expected grade for {course.code}</label>
                <select
                  id={`whatif-${key}`}
                  className="input-base !w-20 !py-1.5 text-sm"
                  value={whatIf[key] ?? ''}
                  onChange={(event) => setWhatIf((current) => {
                    const next = { ...current };
                    if (event.target.value) next[key] = event.target.value as Grade; else delete next[key];
                    return next;
                  })}
                >
                  <option value="">–</option>
                  {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <p className="text-sm mt-3" aria-live="polite">
            {whatIfCount > 0
              ? <>With these grades your CGPA would be <span className="font-semibold text-accent tabular-nums">{formatGpa(withWhatIf.gpa)}</span>.</>
              : <span className="text-dim">Choose a grade above to see the effect.</span>}
          </p>
        </div>
      )}

      <div className={pending.length > 0 ? 'mt-6 pt-5 border-t border-nx' : 'mt-5'}>
        <h3 className="text-sm font-semibold">Reach a target CGPA</h3>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="target-cgpa" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Target CGPA</label>
            <input id="target-cgpa" type="number" inputMode="decimal" min="0.01" max="5" step="0.01" className="input-base" value={targetText} onChange={(event) => setTargetText(event.target.value)} />
          </div>
          <div>
            <label htmlFor="target-units" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Units next semester</label>
            <input id="target-units" type="number" inputMode="numeric" min="1" max="60" step="1" className="input-base" value={unitsText} onChange={(event) => { setUnitsEdited(true); setUnitsText(event.target.value); }} />
          </div>
        </div>
        <div className="mt-3 text-sm" aria-live="polite">
          {!validInputs ? (
            <p className="text-dim">Enter a target between 0.01 and 5.00 and the units you expect to take.</p>
          ) : withWhatIf.units === 0 ? (
            <p className="text-muted">Get a GPA of <span className="font-semibold text-accent">{target.toFixed(2)}</span> or more next semester.</p>
          ) : needed !== null && needed <= 0 ? (
            <p className="text-muted">You are on track: you stay at or above {target.toFixed(2)} whatever happens next semester.</p>
          ) : needed !== null && needed <= MAX_GPA ? (
            <p className="text-muted">You need a GPA of at least <span className="font-semibold text-accent tabular-nums">{formatGpa(needed)}</span> over the next {units} units.</p>
          ) : (
            <p className="text-muted">
              {target.toFixed(2)} can&apos;t be reached in one semester of {units} units, even with straight As.
              {neededTwo !== null && neededTwo <= MAX_GPA
                ? <> Over two semesters you would need about <span className="font-semibold text-accent tabular-nums">{formatGpa(neededTwo)}</span> each.</>
                : ' Try a nearer target - every strong semester moves your CGPA up.'}
            </p>
          )}
          {validInputs && withWhatIf.units > 0 && (
            <p className="text-[11px] text-dim mt-1">Based on {withWhatIf.units} graded units so far (CGPA {formatGpa(roundGpa(withWhatIf.points, withWhatIf.units))}{whatIfCount ? ', including your what-if grades' : ''}).</p>
          )}
        </div>
      </div>
    </section>
  );
}
