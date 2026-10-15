import { useCallback } from 'react';
import { useRemoteData } from '../../../../hooks/useRemoteData';
import { getAuditLog } from '../../api/elections';
import { formatLagos } from '../../model/election';

const ACTIONS: Record<string, string> = {
  created: 'created the election',
  updated: 'changed the details',
  'position-added': 'added a position',
  'position-renamed': 'renamed a position',
  'position-removed': 'removed a position',
  'candidate-added': 'added a candidate',
  'candidate-edited': 'edited a candidate',
  'candidate-removed': 'removed a candidate',
  'voters-replaced': 'uploaded the voter list',
  'voters-from-class-list': 'filled the voter list from the class list',
  'voters-added': 'added voters',
  'locked-ready': 'locked the election and handed it over',
  'unlocked-draft': 'unlocked the election for changes',
  'opened-early': 'opened voting',
  'auto-opened': 'opened voting on schedule',
  paused: 'paused voting',
  resumed: 'resumed voting',
  extended: 'extended the closing time',
  'closed-early': 'closed voting early',
  'auto-closed': 'closed voting on schedule',
  'approved-publish': 'approved publishing',
  published: 'published the results',
  'account-suspended': 'suspended an account',
  'account-restored': 'restored an account',
};

function describe(detail: Record<string, unknown> | null): string {
  if (!detail) return '';
  const parts: string[] = [];
  for (const key of ['title', 'name', 'candidate', 'position', 'matricNumber', 'reason']) if (detail[key]) parts.push(String(detail[key]));
  if (detail.from && detail.to) parts.push(`${String(detail.from).length > 20 ? formatLagos(String(detail.from)) : detail.from} → ${String(detail.to).length > 20 ? formatLagos(String(detail.to)) : detail.to}`);
  if (typeof detail.total === 'number') parts.push(`${detail.total} voters`);
  return parts.join(' · ');
}

/** Everything anyone did to the election, newest first. Never contains votes. */
export default function ActivityPanel({ electionId, version }: { electionId: string; version: number }) {
  const load = useCallback((signal: AbortSignal) => getAuditLog(electionId, signal), [electionId, version]);
  const { data, loading } = useRemoteData(load);
  if (loading && !data) return <div className="card-base h-40 animate-pulse" />;
  return (
    <ul className="card-base divide-y divide-[color:var(--nx-border)]">
      {(data ?? []).map((entry) => (
        <li key={entry.id} className="px-4 py-3">
          <p className="text-sm"><span className="font-medium">{entry.actor}</span> {ACTIONS[entry.action] ?? entry.action}</p>
          <p className="text-[11px] text-dim">{formatLagos(entry.at)}{describe(entry.detail) ? ` · ${describe(entry.detail)}` : ''}</p>
        </li>
      ))}
      {!data?.length && <li className="px-4 py-6 text-sm text-dim text-center">Nothing yet.</li>}
    </ul>
  );
}
