import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { deleteElection, getAdminElection } from '../features/elections/api/elections';
import { StatusBadge } from '../features/elections/components/ElectionBits';
import ActivityPanel from '../features/elections/components/admin/ActivityPanel';
import ControlPanel from '../features/elections/components/admin/ControlPanel';
import SetupPanel from '../features/elections/components/admin/SetupPanel';
import VotersPanel from '../features/elections/components/admin/VotersPanel';
import { useAction } from '../features/elections/hooks/useAction';
import { useElectionLive } from '../features/elections/hooks/useElectionLive';
import { staffToken } from '../features/elections/model/election';
import type { AdminElection } from '../features/elections/model/types';

type Tab = 'overview' | 'setup' | 'voters' | 'activity';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Candidates' },
  { id: 'voters', label: 'Voters' },
  { id: 'activity', label: 'Activity' },
];

export default function ElectionAdminPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? '';
  const [params, setParams] = useSearchParams();
  const load = useCallback((signal: AbortSignal) => getAdminElection(id, signal), [id]);
  const { data, loading, error, refresh } = useRemoteData(load);
  const [election, setElection] = useState<AdminElection | null>(null);
  const { busy, run } = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (data) setElection(data); }, [data]);

  const connected = useElectionLive(staffToken(), {
    onUpdate: (update) => { if (update.electionId === id) void refresh(true); },
    onRemoved: (event) => { if (event.electionId === id) navigate('/elections', { replace: true }); },
  });
  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 15_000);
    return () => clearInterval(timer);
  }, [connected, refresh]);

  // Picked once when the page opens, so a status change (e.g. locking) never moves you to another tab.
  const [defaultTab, setDefaultTab] = useState<Tab | null>(null);
  useEffect(() => {
    if (election && !defaultTab) setDefaultTab(role === 'dev' && election.status === 'draft' ? 'setup' : 'overview');
  }, [election, defaultTab, role]);
  const tab = (params.get('tab') as Tab | null) ?? defaultTab ?? 'overview';

  if (error && !election) {
    return <div className="page-base"><Navbar /><main className="max-w-4xl mx-auto px-4 py-8"><div role="alert" className="alert-danger">We couldn&apos;t load this election. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div></main></div>;
  }
  if (loading && !election) return <div className="page-base"><Navbar /><main className="max-w-4xl mx-auto px-4 py-8"><div className="card-base h-64 animate-pulse" /></main></div>;
  if (!election) return null;

  const canDelete = role === 'dev' && (election.isTest || election.counts.voted === 0) && !(['open', 'paused'].includes(election.status) && !election.isTest);

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <Link to="/elections" className="btn-ghost !px-0">← Elections</Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={election.status} />
            {election.isTest && <span className="badge">Test</span>}
            {!connected && <span className="badge" title="Live updates are reconnecting; the page refreshes every 15 seconds meanwhile.">Reconnecting…</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">{election.title}</h1>
        </div>

        <nav aria-label="Election sections" className="flex gap-1 bg-surface-2 border border-nx rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
          {TABS.map((item) => (
            <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => setParams({ tab: item.id }, { replace: true })}
              className={`shrink-0 px-3 sm:px-4 py-2 min-h-11 text-sm font-medium rounded-md ${tab === item.id ? 'bg-surface text-[color:var(--nx-text)] border border-nx' : 'text-muted hover:text-[color:var(--nx-text)]'}`}>
              {item.label}{item.id === 'voters' && <span className="text-dim ml-1.5">{election.counts.voters}</span>}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <ControlPanel election={election} role={role} userId={user?.id ?? ''} onChange={setElection} />}
        {tab === 'setup' && <SetupPanel election={election} role={role} onChange={setElection} />}
        {tab === 'voters' && <VotersPanel election={election} role={role} onChanged={() => void refresh(true)} />}
        {tab === 'activity' && <ActivityPanel electionId={election.id} version={election.version} />}

        {canDelete && (
          <button type="button" className="btn-ghost text-danger" onClick={() => setConfirmDelete(true)}>Delete this {election.isTest ? 'test ' : ''}election</button>
        )}
      </main>
      {confirmDelete && (
        <ConfirmModal title="Delete this election?" message={`${election.title} and everything in it${election.counts.voted ? `, including ${election.counts.voted} test votes,` : ''} will be removed. This can't be undone.`}
          confirmLabel="Delete" loading={busy !== null}
          onConfirm={async () => { const done = await run('delete', () => deleteElection(election.id), 'Election deleted.'); if (done !== undefined) navigate('/elections', { replace: true }); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)} />
      )}
    </div>
  );
}
