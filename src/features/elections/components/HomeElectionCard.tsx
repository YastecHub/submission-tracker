import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { listStudentElections } from '../api/elections';
import { useElectionLive } from '../hooks/useElectionLive';
import { useNow } from '../hooks/useNow';
import { formatDuration, formatTime } from '../model/election';
import { StatusBadge } from './ElectionBits';

/** On the student home page while an election is upcoming, open, or just finished. */
export default function HomeElectionCard({ token }: { token: string }) {
  const load = useCallback((signal: AbortSignal) => listStudentElections(token, signal), [token]);
  const { data, refresh } = useRemoteData(load, 60_000, true);
  useElectionLive(token, { onUpdate: () => void refresh(true), onVoted: () => void refresh(true) });
  const now = useNow(data?.[0]?.serverTime, 30_000);
  const election = data?.find((item) => item.status === 'open' || item.status === 'paused')
    ?? data?.find((item) => item.status === 'ready')
    ?? data?.find((item) => item.status === 'published' && item.publishedAt && now - new Date(item.publishedAt).getTime() < 3 * 86_400_000)
    ?? data?.find((item) => item.status === 'closed');
  if (!election) return null;

  const needsVote = election.status === 'open' && !election.me.hasVoted && !election.me.blockedReason;
  const line = election.me.hasVoted && election.status !== 'published' ? 'You have voted. Thank you!'
    : election.status === 'open' ? `Voting closes at ${formatTime(election.closesAt)} (${formatDuration(new Date(election.closesAt).getTime() - now)} left).`
      : election.status === 'paused' ? 'Voting is paused for a moment.'
        : election.status === 'ready' ? `Voting opens at ${formatTime(election.opensAt)}.`
          : election.status === 'closed' ? 'Voting has closed. Results are coming.' : 'The results are out.';

  return (
    <section className={`card-base p-5 sm:p-6 mb-8 ${needsVote ? 'border-[color:var(--nx-accent)]' : ''}`} aria-labelledby="home-election-heading">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={election.status} />{election.isTest && <span className="badge">Test</span>}</div>
      <h2 id="home-election-heading" className="text-xl font-semibold mt-2">{election.title}</h2>
      <p className="text-sm text-muted mt-1">{line}</p>
      <Link to={needsVote ? `/student/elections/${election.id}/vote` : `/student/elections/${election.id}`}
        className={`${needsVote ? 'btn-primary' : 'btn-secondary'} mt-4 w-full sm:w-auto justify-center !py-2.5`}>
        {needsVote ? 'Vote now' : election.status === 'published' ? 'See the results' : 'Open election'}
      </Link>
    </section>
  );
}
