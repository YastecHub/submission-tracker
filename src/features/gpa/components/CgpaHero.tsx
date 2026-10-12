import { degreeClass, formatGpa, type DegreeTone } from '../model/gpa';
import type { GpaSummary, SemesterView } from '../model/types';
import GpaSparkline from './GpaSparkline';

const TONE_CLASSES: Record<DegreeTone, string> = {
  first: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  upper: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  lower: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  third: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  pass: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  below: 'text-red-400 bg-red-500/10 border-red-500/30',
  none: 'text-muted bg-surface-2 border-nx',
};

export function DegreeBadge({ cgpa }: { cgpa: number | null }) {
  const band = degreeClass(cgpa);
  if (!band) return null;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[band.tone]}`}>{band.label}</span>;
}

export default function CgpaHero({ summary, semesters }: { summary: GpaSummary; semesters: SemesterView[] }) {
  const hasFinal = summary.cgpa !== null;
  const headline = hasFinal ? summary.cgpa : summary.projectedCgpa;
  const showProjection = hasFinal && summary.draftSemesters > 0 && summary.projectedCgpa !== null && summary.projectedCgpa !== summary.cgpa;

  return (
    <section className="card-base p-5 sm:p-6" aria-labelledby="cgpa-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="cgpa-heading" className="text-xs uppercase tracking-wider text-accent font-semibold">
            {hasFinal ? 'Your CGPA' : 'Projected CGPA'}
          </p>
          <p className="text-5xl sm:text-6xl font-semibold tracking-tight mt-1 tabular-nums" aria-live="polite">
            {formatGpa(headline)}
            <span className="text-lg text-dim font-normal ml-1">/ 5.00</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <DegreeBadge cgpa={headline} />
            <span className="text-xs text-muted">
              {hasFinal ? `${summary.units} units · ${summary.finalizedSemesters} final semester${summary.finalizedSemesters === 1 ? '' : 's'}` : 'From draft semesters - finalize them when results are official'}
            </span>
          </div>
        </div>
      </div>
      {showProjection && (
        <p className="text-sm text-muted mt-4">
          With your draft semester{summary.draftSemesters === 1 ? '' : 's'}: <span className="font-semibold text-[color:var(--nx-text)] tabular-nums">{formatGpa(summary.projectedCgpa)}</span>
        </p>
      )}
      <GpaSparkline semesters={semesters} />
    </section>
  );
}
