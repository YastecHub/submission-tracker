import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { listStudentElections } from '../features/elections/api/elections';
import { StatusBadge, TurnoutBar } from '../features/elections/components/ElectionBits';
import { useElectionLive } from '../features/elections/hooks/useElectionLive';
import { useNow } from '../features/elections/hooks/useNow';
import { formatDuration, formatLagos } from '../features/elections/model/election';
import type { StudentElection } from '../features/elections/model/types';

function ElectionCard({ election, now }: { election: StudentElection; now: number }) {
  const opensIn = new Date(election.opensAt).getTime() - now;
  const closesIn = new Date(election.closesAt).getTime() - now;
  const cta = election.status === 'open' && !election.me.hasVoted && !election.me.blockedReason ? 'Vote now'
    : election.status === 'published' ? 'See results' : 'View';
  return (
    <Link to={`/student/elections/${election.id}`} className="card-interactive p-4 sm:p-5 block">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={election.status} />
        {election.isTest && <span className="badge">Test</span>}
        {election.me.hasVoted && <span className="badge badge-success">You voted</span>}
      </div>
      <h2 className="text-lg font-semibold mt-2">{election.title}</h2>
      <p className="text-sm text-muted mt-1">
        {election.status === 'ready' && `Opens ${formatLagos(election.opensAt)} (in ${formatDuration(opensIn)})`}
        {election.status === 'open' && `Closes ${formatLagos(election.closesAt)} (in ${formatDuration(closesIn)})`}
        {election.status === 'paused' && 'Paused by the electoral committee'}
        {election.status === 'closed' && 'Voting has closed. Results are coming.'}
        {election.status === 'published' && 'The results are out.'}
      </p>
      {(election.status === 'open' || election.status === 'paused') && <div className="mt-4"><TurnoutBar voted={election.turnout.voted} eligible={election.turnout.eligible} /></div>}
      <span className={`mt-4 inline-flex ${cta === 'Vote now' ? 'btn-primary' : 'btn-secondary'} !py-2`}>{cta}</span>
    </Link>
  );
}

export default function StudentElectionsPage() {
  const { token } = useStudentAuth();
  const load = useCallback((signal: AbortSignal) => listStudentElections(token!, signal), [token]);
  const { data, loading, error, refresh } = useRemoteData(load, 0, !!token);
  const connected = useElectionLive(token, {
    onUpdate: (update) => { if (data?.some((election) => election.id === update.electionId) || update.status !== 'draft') void refresh(true); },
    onVoted: () => void refresh(true),
    onRemoved: () => void refresh(true),
  });
  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 20_000);
    return () => clearInterval(timer);
  }, [connected, refresh]);
  const now = useNow(data?.[0]?.serverTime);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-xs uppercase tracking-wider text-accent font-semibold">Class elections</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Elections</h1>
      <p className="text-sm text-muted mt-2">Your vote is secret: nobody, not even the electoral committee, can see who you voted for.</p>

      <div className="mt-6 space-y-3">
        {error ? (
          <div role="alert" className="alert-danger">We couldn&apos;t load the elections. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div>
        ) : loading && !data ? (
          <div className="card-base h-40 animate-pulse" aria-label="Loading elections" />
        ) : !data?.length ? (
          <div className="card-base p-6 text-center">
            <h2 className="font-semibold">No elections for you right now</h2>
            <p className="text-sm text-muted mt-2">When an election you can vote in is set up, it will appear here.</p>
          </div>
        ) : data.map((election) => <ElectionCard key={election.id} election={election} now={now} />)}
      </div>
    </main>
  );
}
