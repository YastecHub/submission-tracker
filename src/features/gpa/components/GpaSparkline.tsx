import { formatGpa, MAX_GPA, shortSemesterTitle } from '../model/gpa';
import type { SemesterView } from '../model/types';

/** Semester GPA trend. Final results are solid dots, drafts are hollow. */
export default function GpaSparkline({ semesters }: { semesters: SemesterView[] }) {
  const points = semesters.filter((semester) => semester.totals.gpa !== null);
  if (points.length < 2) return null;
  const width = 280;
  const height = 64;
  const pad = 8;
  const x = (index: number) => pad + (index * (width - pad * 2)) / (points.length - 1);
  const y = (gpa: number) => pad + ((MAX_GPA - gpa) * (height - pad * 2)) / MAX_GPA;
  const path = points.map((semester, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(semester.totals.gpa!).toFixed(1)}`).join(' ');
  const description = points.map((semester) => `${shortSemesterTitle(semester.level, semester.semester)}: ${formatGpa(semester.totals.gpa)}`).join(', ');

  return (
    <figure className="mt-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" role="img" aria-label={`Semester GPA trend. ${description}`}>
        <line x1={pad} x2={width - pad} y1={y(4.5)} y2={y(4.5)} stroke="var(--nx-border)" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--nx-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((semester, index) => (
          <circle
            key={semester.id}
            cx={x(index)}
            cy={y(semester.totals.gpa!)}
            r="3.5"
            fill={semester.status === 'finalized' ? 'var(--nx-accent)' : 'var(--nx-bg)'}
            stroke="var(--nx-accent)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <figcaption className="flex justify-between text-[11px] text-dim mt-1">
        <span>{shortSemesterTitle(points[0].level, points[0].semester)}</span>
        <span>Dashed line: 4.50 (First Class)</span>
        <span>{shortSemesterTitle(points[points.length - 1].level, points[points.length - 1].semester)}</span>
      </figcaption>
    </figure>
  );
}
