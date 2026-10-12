import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useGpa } from '../features/gpa/hooks/GpaProvider';
import { degreeClass, formatGpa, GRADE_POINTS, roundGpa, semesterTitle } from '../features/gpa/model/gpa';

/**
 * Printable, transcript-style summary. Uses the browser's print dialog, so
 * "Save as PDF" works on phones and computers without extra libraries.
 */
export default function GpaTranscriptPage() {
  const { student } = useStudentAuth();
  const { semesters, loading } = useGpa();
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const draftCount = semesters.filter((semester) => semester.status === 'draft').length;

  const rows = useMemo(() => {
    let points = 0;
    let units = 0;
    return semesters
      .filter((semester) => includeDrafts || semester.status === 'finalized')
      .map((semester) => {
        points += semester.totals.points;
        units += semester.totals.units;
        return { semester, cgpa: roundGpa(points, units) };
      });
  }, [semesters, includeDrafts]);
  const final = rows.length ? rows[rows.length - 1].cgpa : null;
  const totalUnits = rows.reduce((sum, row) => sum + row.semester.totals.units, 0);
  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white text-zinc-900 py-6 print:py-0">
      <div className="max-w-3xl mx-auto px-4 print:px-0 mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Link to="/student/gpa" className="text-sm font-medium text-zinc-700 hover:underline">← Back to GPA tracker</Link>
        <span className="flex-1" />
        {draftCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={includeDrafts} onChange={(event) => setIncludeDrafts(event.target.checked)} />
            Include {draftCount} draft semester{draftCount === 1 ? '' : 's'}
          </label>
        )}
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-semibold">Print / Save as PDF</button>
      </div>

      <article className="max-w-3xl mx-auto bg-white shadow print:shadow-none rounded-xl print:rounded-none p-6 sm:p-10 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-zinc-300 pb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Unofficial academic record</p>
            <h1 className="text-2xl font-semibold mt-1">{student?.fullName}</h1>
            <p className="text-sm text-zinc-600 mt-1">Matric number {student?.matricNumber}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-widest text-zinc-500">CGPA</p>
            <p className="text-4xl font-semibold tabular-nums">{formatGpa(final)}</p>
            <p className="text-xs text-zinc-600">{degreeClass(final)?.label ?? ''}{final !== null ? ' · 5.0 scale' : ''}</p>
          </div>
        </header>

        {loading ? (
          <p className="py-10 text-center text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-zinc-500">
            No {includeDrafts ? '' : 'final '}semesters yet.{!includeDrafts && draftCount > 0 ? ' Finalize a semester or include drafts above.' : ''}
          </p>
        ) : rows.map(({ semester, cgpa }) => (
          <section key={semester.id} className="mt-6 break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                {semesterTitle(semester.level, semester.semester)}
                {semester.sessionLabel && <span className="font-normal text-zinc-500"> · {semester.sessionLabel}</span>}
                {semester.status === 'draft' && <span className="ml-2 text-xs font-normal text-zinc-500">(draft)</span>}
              </h2>
              <p className="text-sm text-zinc-600">GPA <span className="font-semibold text-zinc-900 tabular-nums">{formatGpa(semester.totals.gpa)}</span> · CGPA <span className="font-semibold text-zinc-900 tabular-nums">{formatGpa(cgpa)}</span></p>
            </div>
            <table className="w-full text-sm mt-2 border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-300">
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 pr-3 font-medium">Title</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Units</th>
                  <th className="py-1.5 pr-3 font-medium text-center">Grade</th>
                  <th className="py-1.5 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {semester.courses.map((course) => (
                  <tr key={course.key} className="border-b border-zinc-200">
                    <td className="py-1.5 pr-3 whitespace-nowrap font-medium">{course.code}</td>
                    <td className="py-1.5 pr-3">
                      {course.title}
                      {(course.isCarryover || course.isRetake) && (
                        <span className="text-xs text-zinc-500"> ({[course.isCarryover && 'carryover', course.isRetake && 'retake'].filter(Boolean).join(', ')})</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{course.units}</td>
                    <td className="py-1.5 pr-3 text-center font-semibold">{course.grade ?? '–'}</td>
                    <td className="py-1.5 text-right tabular-nums">{course.grade ? GRADE_POINTS[course.grade] * course.units : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="mt-8 pt-4 border-t border-zinc-300 text-xs text-zinc-500 flex flex-wrap justify-between gap-2">
          <span>{totalUnits} graded units · Generated {generated} with NEXIUM</span>
          <span>Self-reported by the student. Not an official university transcript.</span>
        </footer>
      </article>
    </div>
  );
}
