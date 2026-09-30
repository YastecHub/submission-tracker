import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  levelLabel?: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function PreviousSessionArchive({
  title,
  subtitle,
  levelLabel = '100 Level',
  count,
  isOpen,
  onToggle,
  children,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="mt-8 border border-nx rounded-xl overflow-hidden bg-surface transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-2/60 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-nx flex items-center justify-center text-lg shrink-0">
            📦
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base sm:text-lg text-[color:var(--nx-text)] truncate">{title}</h3>
              <span className="badge">{levelLabel}</span>
              <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">Archived</span>
            </div>
            <p className="text-xs text-muted mt-0.5 truncate">
              {subtitle ?? `${count} record${count === 1 ? '' : 's'} preserved from last session`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-dim text-xs sm:text-sm shrink-0 ml-3">
          <span className="hidden sm:inline font-medium">{isOpen ? 'Hide records' : 'View records'}</span>
          <span className="badge font-mono text-xs">{count}</span>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-nx bg-surface-2/20">
          <div className="mb-4 text-xs text-dim bg-surface-2/50 border border-nx rounded-lg px-3 py-2">
            These are preserved records from the <strong>100 Level</strong> academic session. All historical submissions, receipts, and student data remain permanently accessible and unmodified.
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
