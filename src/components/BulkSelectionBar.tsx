import type { ReactNode } from 'react';

/**
 * Bottom bar shown while rows are selected: how many, a short summary, and one action.
 * Sits above the phone's home indicator and doesn't cover the page on desktop.
 */
export default function BulkSelectionBar({ count, summary, actionLabel, busy, onAction, onClear }: {
  count: number;
  summary?: ReactNode;
  actionLabel: string;
  busy?: boolean;
  onAction: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pointer-events-none">
      <div role="region" aria-label="Selected rows" className="pointer-events-auto max-w-3xl mx-auto card-base border-[color:var(--nx-accent)] shadow-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{count} selected</p>
          {summary && <p className="text-xs text-muted mt-0.5">{summary}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1 sm:flex-initial" disabled={busy} onClick={onClear}>Clear</button>
          <button type="button" className="btn-primary flex-1 sm:flex-initial whitespace-nowrap" disabled={busy} onClick={onAction}>{busy ? 'Confirming…' : actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
