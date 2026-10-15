import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { castBallot, getStudentElection } from '../features/elections/api/elections';
import { CandidateAvatar, Manifesto } from '../features/elections/components/ElectionBits';
import { useElectionLive } from '../features/elections/hooks/useElectionLive';
import { useNow } from '../features/elections/hooks/useNow';
import {
  errorMessage, formatDuration, formatReceipt, formatTime, isNetworkFailure, loadBallot, newReceiptCode, newRequestId, saveBallot,
  type StoredBallot,
} from '../features/elections/model/election';
import type { BallotChoice, StudentPosition } from '../features/elections/model/types';

type Phase = 'choosing' | 'submitting' | 'uncertain' | 'done';

function CheckIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>;
}

function PositionStep({ position, choice, onChoose }: { position: StudentPosition; choice?: BallotChoice; onChoose: (choice: BallotChoice) => void }) {
  if (position.unopposed) {
    const candidate = position.candidates[0];
    return (
      <div>
        <div className="card-base p-4 flex gap-3">
          <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg">{candidate.displayName}</p>
            {candidate.nickname && <p className="text-sm text-dim">{candidate.nickname}</p>}
            <Manifesto text={candidate.manifesto} />
          </div>
        </div>
        <p className="text-sm text-muted mt-4">{candidate.displayName} is the only candidate. Do you want them as {position.title}?</p>
        <div role="radiogroup" aria-label={`Yes or No for ${candidate.displayName}`} className="grid grid-cols-2 gap-3 mt-3">
          {([true, false] as const).map((approve) => {
            const selected = choice?.approve === approve;
            return (
              <button key={String(approve)} type="button" role="radio" aria-checked={selected}
                onClick={() => onChoose({ positionId: position.id, candidateId: candidate.id, approve })}
                className={`min-h-14 rounded-xl border-2 text-base font-semibold transition-colors ${selected
                  ? approve ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-400 bg-zinc-500/10'
                  : 'border-nx bg-surface hover:border-[color:var(--nx-border-hover)]'}`}>
                {approve ? 'Yes' : 'No'}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label={`Candidates for ${position.title}`} className="space-y-3">
      {position.candidates.map((candidate) => {
        const selected = choice?.candidateId === candidate.id;
        return (
          <div key={candidate.id} role="radio" aria-checked={selected} tabIndex={0}
            onClick={() => onChoose({ positionId: position.id, candidateId: candidate.id })}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onChoose({ positionId: position.id, candidateId: candidate.id }); } }}
            className={`rounded-xl border-2 p-4 flex gap-3 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nx-accent)] ${selected
              ? 'border-[color:var(--nx-accent)] bg-[color:var(--nx-accent-soft)]'
              : 'border-nx bg-surface hover:border-[color:var(--nx-border-hover)]'}`}>
            <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base">{candidate.displayName}</p>
              {candidate.nickname && <p className="text-sm text-dim">{candidate.nickname}</p>}
              <Manifesto text={candidate.manifesto} />
            </div>
            <span aria-hidden="true" className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 self-center ${selected ? 'border-[color:var(--nx-accent)] bg-[color:var(--nx-accent)] text-black' : 'border-nx'}`}>
              {selected && <CheckIcon />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function choiceLabel(position: StudentPosition, choice?: BallotChoice): string {
  if (!choice) return 'Not chosen';
  const candidate = position.candidates.find((item) => item.id === choice.candidateId);
  if (!candidate) return 'Not chosen';
  return position.unopposed ? `${choice.approve ? 'Yes' : 'No'} to ${candidate.displayName}` : candidate.displayName;
}

export default function StudentBallotPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { token, student } = useStudentAuth();
  const load = useCallback((signal: AbortSignal) => getStudentElection(token!, id, signal), [token, id]);
  const { data: election, loading, error, refresh } = useRemoteData(load, 0, !!token);
  const studentId = student?.id ?? '';
  const [ballot, setBallotState] = useState<StoredBallot>(() => loadBallot(studentId, id));
  const [step, setStep] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (loadBallot(studentId, id).submission ? 'uncertain' : 'choosing'));
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const setBallot = useCallback((next: StoredBallot) => {
    setBallotState(next);
    saveBallot(studentId, id, next);
  }, [studentId, id]);

  useElectionLive(token, {
    onUpdate: (update) => { if (update.electionId === id && update.status !== election?.status) void refresh(true); },
    onVoted: (event) => { if (event.electionId === id && phase !== 'done') void refresh(true); },
  });
  const now = useNow(election?.serverTime);

  const positions = useMemo(() => election?.positions ?? [], [election]);
  const reviewStep = positions.length;
  // Start where the student left off: the first position without a pick, else the review.
  useEffect(() => {
    if (step !== null || !positions.length) return;
    const firstOpen = positions.findIndex((position) => !ballot.choices[position.id]);
    setStep(firstOpen === -1 ? reviewStep : firstOpen);
  }, [positions, ballot.choices, step, reviewStep]);

  const goTo = (next: number) => {
    setStep(next);
    setProblem('');
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: 'start' }));
  };

  function choose(choice: BallotChoice) {
    if (phase !== 'choosing') return;
    setBallot({ ...ballot, choices: { ...ballot.choices, [choice.positionId]: choice } });
  }

  async function submit() {
    if (!token || !election) return;
    setConfirming(false);
    setProblem('');
    const choices = positions.map((position) => ballot.choices[position.id]).filter(Boolean);
    // A submission that may already have reached the server is always re-sent unchanged.
    const submission = ballot.submission ?? { requestId: newRequestId(), receiptCode: newReceiptCode(), choices };
    const pending = { ...ballot, submission };
    setBallot(pending);
    setPhase('submitting');
    try {
      const result = await castBallot(token, election.id, submission);
      setBallot({ choices: {}, receipt: { code: submission.receiptCode, votedAt: result.votedAt } });
      setPhase('done');
      void refresh(true);
    } catch (caught) {
      if (isNetworkFailure(caught)) {
        setPhase('uncertain');
        return;
      }
      // The server answered "no": nothing was recorded, so the next try starts fresh.
      setBallot({ choices: pending.choices });
      setPhase('choosing');
      setProblem(errorMessage(caught));
      if (axios.isAxiosError(caught) && caught.response?.status === 409) void refresh(true);
    }
  }

  // An earlier submission's outcome is unknown: if the server already shows the vote, it counted.
  useEffect(() => {
    if (phase === 'uncertain' && election?.me.hasVoted && ballot.submission) {
      setBallot({ choices: {}, receipt: { code: ballot.submission.receiptCode, votedAt: election.me.votedAt ?? new Date().toISOString() } });
      setPhase('done');
    }
  }, [phase, election, ballot.submission, setBallot]);

  if (error && !election) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div role="alert" className="alert-danger">We couldn&apos;t load the ballot. Check your connection. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div>
      </main>
    );
  }
  if (loading && !election) return <main className="max-w-2xl mx-auto px-4 py-8"><div className="card-base h-80 animate-pulse" /></main>;
  if (!election) return null;

  if (phase === 'done' && ballot.receipt) {
    const code = ballot.receipt.code;
    return (
      <main className="max-w-2xl mx-auto px-4 py-10 text-center">
        <span aria-hidden="true" className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-3xl">✓</span>
        <h1 className="text-2xl font-semibold mt-4">Your vote is in</h1>
        <p className="text-muted mt-2">Recorded at {formatTime(ballot.receipt.votedAt)}. Nobody can see who you voted for, and it can&apos;t be changed.</p>
        <div className="card-base p-5 mt-6 text-left">
          <p className="text-xs uppercase tracking-wider text-dim">Your receipt code</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.2em] mt-1">{formatReceipt(code)}</p>
          <p className="text-sm text-muted mt-2">After voting closes you can enter it on the election page to confirm your ballot was counted. It doesn&apos;t reveal your choices.</p>
          <button type="button" className="btn-secondary mt-3 !py-2" onClick={() => { void navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => undefined); }}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <Link to={`/student/elections/${election.id}`} className="btn-primary mt-6 w-full justify-center !py-3">Done</Link>
      </main>
    );
  }

  if (election.me.hasVoted && phase !== 'uncertain') return <Navigate to={`/student/elections/${election.id}`} replace />;
  if (election.me.blockedReason) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div role="alert" className="alert-danger">{election.me.blockedReason}</div>
        <Link to={`/student/elections/${election.id}`} className="btn-secondary mt-4">Back</Link>
      </main>
    );
  }

  const closesIn = new Date(election.closesAt).getTime() - now;
  const current = step ?? 0;
  const position = positions[current];
  const isReview = current >= reviewStep;
  const allChosen = positions.every((item) => !!ballot.choices[item.id]);
  const statusNote = election.status === 'paused'
    ? 'Voting is paused by the electoral committee. Your picks are saved on this phone; you can submit when it resumes.'
    : election.status === 'closed' || election.status === 'published'
      ? 'Voting has closed. Ballots can no longer be submitted.'
      : election.status === 'ready' ? 'Voting has not opened yet.' : '';
  const canSubmit = election.status === 'open' && allChosen && phase === 'choosing';

  return (
    <main className="max-w-2xl mx-auto px-4 pt-5 pb-44">
      <div ref={topRef} className="scroll-mt-20" />
      <div className="flex items-center justify-between gap-3">
        <Link to={`/student/elections/${election.id}`} className="btn-ghost !px-0">← Election</Link>
        {election.status === 'open' && (
          <span className={`text-xs tabular-nums ${closesIn < 15 * 60_000 ? 'text-accent font-semibold' : 'text-dim'}`}>Closes in {formatDuration(closesIn)}</span>
        )}
      </div>
      <p className="text-xs text-dim mt-2">Voting as <span className="text-[color:var(--nx-text)] font-medium">{student?.fullName}</span> · {student?.matricNumber}</p>

      {statusNote && <div role="status" className="alert-danger mt-4 text-sm">{statusNote}</div>}
      {problem && <div role="alert" className="alert-danger mt-4 text-sm">{problem}</div>}

      {phase === 'uncertain' && (
        <div role="alert" className="card-base p-4 mt-4 border-[color:var(--nx-accent)]">
          <p className="font-semibold">We couldn&apos;t confirm your vote yet</p>
          <p className="text-sm text-muted mt-1">The connection dropped while sending. Press Try again: your vote can only ever be counted once, so trying again is safe.</p>
          <div className="flex gap-2 mt-3">
            <button type="button" className="btn-primary" onClick={() => void submit()}>Try again</button>
            <button type="button" className="btn-secondary" onClick={() => void refresh(true)}>Check status</button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs text-dim">
          <span>{isReview ? 'Review' : `Position ${current + 1} of ${positions.length}`}</span>
          <span>{positions.filter((item) => ballot.choices[item.id]).length} of {positions.length} chosen</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
          <div className="h-full rounded-full bg-[color:var(--nx-accent)] transition-[width] duration-300" style={{ width: `${((isReview ? positions.length : current) / Math.max(1, positions.length)) * 100}%` }} />
        </div>
      </div>

      {!isReview && position ? (
        <section className="mt-5" aria-labelledby="position-title">
          <h1 id="position-title" className="text-2xl font-semibold tracking-tight">{position.title}</h1>
          <p className="text-sm text-muted mt-1 mb-4">{position.unopposed ? 'Choose Yes or No.' : 'Tap one candidate.'}</p>
          <PositionStep position={position} choice={ballot.choices[position.id]} onChoose={choose} />
        </section>
      ) : (
        <section className="mt-5" aria-labelledby="review-title">
          <h1 id="review-title" className="text-2xl font-semibold tracking-tight">Check your ballot</h1>
          <p className="text-sm text-muted mt-1 mb-4">Make sure every choice is right. After you submit, it can&apos;t be changed.</p>
          <ul className="space-y-2">
            {positions.map((item, index) => {
              const choice = ballot.choices[item.id];
              const candidate = item.candidates.find((entry) => entry.id === choice?.candidateId);
              return (
                <li key={item.id} className="card-base p-3.5 flex items-center gap-3">
                  {candidate ? <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} size="sm" /> : <span className="w-10 h-10 rounded-full border-2 border-dashed border-nx shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-dim">{item.title}</p>
                    <p className={`font-medium truncate ${choice ? '' : 'text-danger'}`}>{choiceLabel(item, choice)}</p>
                  </div>
                  {phase === 'choosing' && <button type="button" className="btn-ghost !py-1.5 text-sm shrink-0" onClick={() => goTo(index)}>Change</button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 z-30 bg-[color:rgba(24,24,27,0.97)] backdrop-blur border-t border-nx bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <button type="button" className="btn-secondary flex-1 justify-center !py-3" disabled={current === 0 || phase !== 'choosing'} onClick={() => goTo(current - 1)}>Back</button>
          {!isReview ? (
            <button type="button" className="btn-primary flex-[2] justify-center !py-3" disabled={!position || !ballot.choices[position.id]}
              onClick={() => goTo(current + 1)}>
              {current === positions.length - 1 ? 'Review my ballot' : 'Next'}
            </button>
          ) : (
            <button type="button" className="btn-primary flex-[2] justify-center !py-3" disabled={!canSubmit} onClick={() => setConfirming(true)}>
              {phase === 'submitting' ? 'Submitting…' : 'Submit my vote'}
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          title="Submit your vote?"
          message="Once you submit, your vote is final. Nobody, including you, can change it. Nobody can see who you voted for."
          confirmLabel="Yes, submit my vote"
          variant="warning"
          onConfirm={() => void submit()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </main>
  );
}

