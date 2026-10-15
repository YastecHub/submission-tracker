import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { checkReceipt, getStudentElection, getStudentResults } from '../features/elections/api/elections';
import { CandidateAvatar, Manifesto, StatusBadge, TurnoutBar } from '../features/elections/components/ElectionBits';
import ResultsView from '../features/elections/components/ResultsView';
import { useElectionLive } from '../features/elections/hooks/useElectionLive';
import { useNow } from '../features/elections/hooks/useNow';
import { errorMessage, formatDuration, formatLagos, formatReceipt, formatTime, loadBallot } from '../features/elections/model/election';
import type { ElectionResults, StudentElection } from '../features/elections/model/types';

function ReceiptChecker({ electionId }: { electionId: string }) {
  const { token } = useStudentAuth();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setResult(null);
    try {
      setResult((await checkReceipt(token!, electionId, code)).counted);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="card-base p-4 sm:p-5">
      <h2 className="font-semibold">Check your receipt</h2>
      <p className="text-sm text-muted mt-1">Enter the 10-character code you got after voting to confirm your ballot was counted. It never shows who you voted for.</p>
      <div className="flex gap-2 mt-3">
        <label htmlFor="receipt-code" className="sr-only">Receipt code</label>
        <input id="receipt-code" className="input-base uppercase tracking-widest" placeholder="ABCDE-12345" maxLength={11} value={code}
          onChange={(event) => { setCode(event.target.value.toUpperCase()); setResult(null); }} autoComplete="off" />
        <button type="submit" className="btn-secondary shrink-0" disabled={busy || code.replace(/-/g, '').length !== 10}>{busy ? 'Checking…' : 'Check'}</button>
      </div>
      {result === true && <p role="status" className="alert-success mt-3 text-sm">Counted. This ballot is in the results.</p>}
      {result === false && <p role="status" className="alert-danger mt-3 text-sm">No ballot with that code. Check the code for typos.</p>}
      {error && <p role="alert" className="alert-danger mt-3 text-sm">{error}</p>}
    </form>
  );
}

function Hero({ election, now, receipt }: { election: StudentElection; now: number; receipt?: { code: string; votedAt: string } }) {
  const closesIn = new Date(election.closesAt).getTime() - now;
  const opensIn = new Date(election.opensAt).getTime() - now;
  const { me } = election;

  if (me.blockedReason && !me.hasVoted) {
    return <div role="alert" className="alert-danger">{me.blockedReason}</div>;
  }
  if (me.hasVoted && election.status !== 'published') {
    return (
      <div className="card-base p-5 border-emerald-500/40">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl shrink-0">✓</span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">You have voted</h2>
            <p className="text-sm text-muted mt-1">Recorded at {formatTime(me.votedAt!)}. Your vote is secret and can&apos;t be changed.</p>
            {receipt && (
              <p className="text-sm mt-3">Receipt code: <span className="font-mono font-semibold tracking-widest">{formatReceipt(receipt.code)}</span></p>
            )}
            {election.status === 'open' && <p className="text-xs text-dim mt-2">Results are published by the electoral committee after voting closes at {formatTime(election.closesAt)}.</p>}
            {election.status === 'paused' && <p className="text-xs text-dim mt-2">Voting is paused for others at the moment; your vote is safe.</p>}
            {election.status === 'closed' && <p className="text-sm text-muted mt-2">Voting has closed. The results appear here as soon as the electoral committee publishes them.</p>}
          </div>
        </div>
      </div>
    );
  }
  switch (election.status) {
    case 'ready':
      return (
        <div className="card-base p-5">
          <p className="text-xs uppercase tracking-wider text-dim">Voting opens in</p>
          <p className="text-4xl font-semibold tabular-nums mt-1">{formatDuration(opensIn)}</p>
          <p className="text-sm text-muted mt-2">{formatLagos(election.opensAt)} – {formatLagos(election.closesAt)}. You&apos;re on the voter list; this page opens the ballot by itself.</p>
        </div>
      );
    case 'open':
      return (
        <div className="card-base p-5 border-[color:var(--nx-accent)]">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">Voting is open</p>
          <p className="text-sm text-muted mt-1">Closes at {formatTime(election.closesAt)} · <span className="tabular-nums font-medium text-[color:var(--nx-text)]">{formatDuration(closesIn)}</span> left</p>
          {closesIn < 15 * 60_000 && <p className="text-sm text-accent font-medium mt-2">Less than 15 minutes left. Vote now.</p>}
          <Link to={`/student/elections/${election.id}/vote`} className="btn-primary w-full justify-center mt-4 !py-3 text-base">Start voting</Link>
          <p className="text-xs text-dim mt-3">{election.positions.length} position{election.positions.length === 1 ? '' : 's'} · about a minute · you review everything before submitting</p>
        </div>
      );
    case 'paused':
      return (
        <div role="status" className="card-base p-5 border-[color:var(--nx-accent)]">
          <h2 className="font-semibold">Voting is paused</h2>
          <p className="text-sm text-muted mt-1">The electoral committee paused voting for a moment. Stay on this page: it updates by itself when voting resumes.</p>
        </div>
      );
    case 'closed':
      return (
        <div className="card-base p-5">
          <h2 className="font-semibold">Voting has closed</h2>
          <p className="text-sm text-muted mt-1">The electoral committee is preparing the results. This page shows them as soon as they are published.</p>
        </div>
      );
    default:
      return null;
  }
}

export default function StudentElectionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { token, student } = useStudentAuth();
  const navigate = useNavigate();
  const load = useCallback((signal: AbortSignal) => getStudentElection(token!, id, signal), [token, id]);
  const { data: election, loading, error, refresh } = useRemoteData(load, 0, !!token);
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [live, setLive] = useState<{ voted: number; eligible: number } | null>(null);

  const connected = useElectionLive(token, {
    onUpdate: (update) => {
      if (update.electionId !== id) return;
      setLive({ voted: update.voted, eligible: update.eligible });
      if (!election || update.status !== election.status || update.closesAt !== election.closesAt) void refresh(true);
    },
    onVoted: (event) => { if (event.electionId === id) void refresh(true); },
    onRemoved: (event) => { if (event.electionId === id) navigate('/student/elections', { replace: true }); },
  });
  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 20_000);
    return () => clearInterval(timer);
  }, [connected, refresh]);
  useEffect(() => { setLive(null); }, [election]);
  useEffect(() => {
    if (election?.status !== 'published' || !token) return;
    const controller = new AbortController();
    getStudentResults(token, id, controller.signal).then(setResults).catch(() => undefined);
    return () => controller.abort();
  }, [election?.status, token, id]);

  const now = useNow(election?.serverTime);
  // Opening and closing happen on the clock: refresh the moment we cross either (a few tries at most).
  const crossed = useRef<{ at: string; tries: number }>({ at: '', tries: 0 });
  useEffect(() => {
    if (!election) return;
    const next = election.status === 'ready' ? election.opensAt : election.status === 'open' || election.status === 'paused' ? election.closesAt : null;
    if (!next || now < new Date(next).getTime()) return;
    if (crossed.current.at !== next) crossed.current = { at: next, tries: 0 };
    if (crossed.current.tries >= 5 || (now - new Date(next).getTime()) < crossed.current.tries * 2000) return;
    crossed.current.tries += 1;
    void refresh(true);
  }, [now, election, refresh]);

  const receipt = election && student ? loadBallot(student.id, election.id).receipt : undefined;
  const turnout = live ?? election?.turnout;

  if (error && !election) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div role="alert" className="alert-danger">We couldn&apos;t load this election. It may not include you. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div>
        <Link to="/student/elections" className="btn-secondary mt-4">All elections</Link>
      </main>
    );
  }
  if (loading && !election) return <main className="max-w-3xl mx-auto px-4 py-8"><div className="card-base h-64 animate-pulse" /></main>;
  if (!election) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link to="/student/elections" className="btn-ghost !px-0">← Elections</Link>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <StatusBadge status={election.status} />
          {election.isTest && <span className="badge">Test election</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">{election.title}</h1>
        {election.description && <p className="text-sm text-muted mt-2 whitespace-pre-line">{election.description}</p>}
      </div>

      <Hero election={election} now={now} receipt={receipt} />

      {turnout && (election.status === 'open' || election.status === 'paused' || election.status === 'closed') && (
        <div className="card-base p-4 sm:p-5">
          <TurnoutBar voted={turnout.voted} eligible={turnout.eligible} label="students have voted" />
        </div>
      )}

      {election.status === 'published' && (
        <section aria-labelledby="results-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="results-heading" className="text-xl font-semibold">Results</h2>
            {results && <span className="text-sm text-muted">Turnout {results.turnout.percent}% ({results.turnout.voted} of {results.turnout.eligible})</span>}
          </div>
          {results ? <ResultsView results={results} /> : <div className="card-base h-48 animate-pulse" />}
        </section>
      )}

      {(election.status === 'closed' || election.status === 'published') && <ReceiptChecker electionId={election.id} />}

      {election.status !== 'published' && (
        <section aria-labelledby="candidates-heading" className="space-y-3">
          <h2 id="candidates-heading" className="text-xl font-semibold">Meet the candidates</h2>
          {election.positions.map((position) => (
            <div key={position.id} className="card-base p-4 sm:p-5">
              <h3 className="font-semibold">{position.title}{position.unopposed && <span className="text-xs text-dim font-normal ml-2">Unopposed: Yes / No vote</span>}</h3>
              <ul className="mt-3 space-y-4">
                {position.candidates.map((candidate) => (
                  <li key={candidate.id} className="flex gap-3">
                    <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{candidate.displayName}{candidate.nickname && <span className="text-dim font-normal"> ({candidate.nickname})</span>}</p>
                      <Manifesto text={candidate.manifesto} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
