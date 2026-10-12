import { GRADES, GRADE_POINTS } from '../model/gpa';
import type { Grade } from '../model/types';

const TONES: Record<Grade, string> = {
  A: 'bg-emerald-500 text-black border-emerald-500',
  B: 'bg-sky-500 text-black border-sky-500',
  C: 'bg-amber-400 text-black border-amber-400',
  D: 'bg-orange-400 text-black border-orange-400',
  E: 'bg-orange-600 text-white border-orange-600',
  F: 'bg-red-500 text-white border-red-500',
};

/** One tap per course: A-F, or "?" while the result isn't out. */
export default function GradePicker({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: Grade | null;
  onChange: (grade: Grade | null) => void;
  label: string;
  disabled?: boolean;
}) {
  const options: Array<Grade | null> = [...GRADES, null];
  return (
    <div role="radiogroup" aria-label={`Grade for ${label}`} className="grid grid-cols-7 gap-1">
      {options.map((grade) => {
        const selected = value === grade;
        return (
          <button
            key={grade ?? 'pending'}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={grade ? `${grade} (${GRADE_POINTS[grade]} points)` : 'No result yet'}
            disabled={disabled}
            onClick={() => onChange(grade)}
            className={`h-10 min-w-0 rounded-lg border text-sm font-semibold transition-colors touch-manipulation disabled:opacity-60 ${
              selected
                ? grade ? TONES[grade] : 'bg-surface-2 border-[color:var(--nx-text-muted)] text-[color:var(--nx-text)]'
                : 'bg-surface-2 border-nx text-muted hover:text-[color:var(--nx-text)] hover:border-[color:var(--nx-border-hover)]'
            }`}
          >
            {grade ?? '?'}
          </button>
        );
      })}
    </div>
  );
}
