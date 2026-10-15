import { useCallback, useEffect, useState } from 'react';
import ConfirmModal from '../../../../components/ConfirmModal';
import { approvePublish, extendElection, getAdminResults, runCommand, type ElectionCommand } from '../../api/elections';
import { useAction } from '../../hooks/useAction';
import { useNow } from '../../hooks/useNow';
import { formatDuration, formatLagos, formatTime, fromLocalInput, toLocalInput } from '../../model/election';
import type { AdminElection, ElectionResults } from '../../model/types';
import ResultsView from '../ResultsView';
import NotificationsCard from './NotificationsCard';
import { TurnoutBar } from '../ElectionBits';

type Confirm = { command: ElectionCommand | 'publish'; title: string; message: string; label: string } | null;

/** What the committee (and the developer, read-only) sees about the running election. */
export default function ControlPanel({ election, role, userId, onChange }: { election: AdminElection; role: string; userId: string; onChange: (next: AdminElection) => void }) {
  const isCommittee = role === 'electoral_committee';
  const isDev = role === 'dev';
  const { busy, run } = useAction();
  const now = useNow();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [extendTo, setExtendTo] = useState('');
  const [results, setResults] = useState<ElectionResults | null>(null);
  const { status } = election;
  const canSeeResults = (isCommittee && (status === 'closed' || status === 'published')) || status === 'published';

  const loadResults = useCallback(() => {
    if (!canSeeResults) { setResults(null); return; }
    getAdminResults(election.id).then(setResults).catch(() => setResults(null));
  }, [canSeeResults, election.id]);
  useEffect(() => { loadResults(); }, [loadResults, status, election.counts.voted]);

  async function command(name: ElectionCommand, success: string) {
    setConfirm(null);
    const next = await run(name, () => runCommand(election.id, name), success);
    if (next) onChange(next);
  }

  async function publish() {
    setConfirm(null);
    const result = await run('publish', () => approvePublish(election.id));
    if (result) {
      onChange(result.detail);
      if (result.published) loadResults();
    }
  }

  async function extend() {
    const iso = fromLocalInput(extendTo);
    if (!iso) return;
    const next = await run('extend', () => extendElection(election.id, iso), `Voting now closes at ${formatTime(iso)}.`);
    if (next) { onChange(next); setExtendTo(''); }
  }

  const opensIn = new Date(election.opensAt).getTime() - now;
  const closesIn = new Date(election.closesAt).getTime() - now;
  const iApproved = election.approvals.some((approval) => approval.userId === userId);
  const soloAllowed = !!election.soloPublishAt && now >= new Date(election.soloPublishAt).getTime();
  const otherMembers = election.committee.filter((member) => member.id !== userId).map((member) => member.name).join(' or ') || 'the other member';

  return (
    <div className="space-y-4">
      <div className="card-base p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            {status === 'draft' && <p className="text-lg font-semibold">In setup</p>}
            {status === 'ready' && <><p className="text-xs uppercase tracking-wider text-dim">Opens automatically in</p><p className="text-3xl font-semibold tabular-nums">{formatDuration(opensIn)}</p></>}
            {status === 'open' && <><p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Voting open · closes in</p><p className="text-3xl font-semibold tabular-nums">{formatDuration(closesIn)}</p></>}
            {status === 'paused' && <p className="text-lg font-semibold text-accent">Paused: ballots are refused until you resume</p>}
            {status === 'closed' && <p className="text-lg font-semibold">Voting closed{election.closedAt ? ` at ${formatTime(election.closedAt)}` : ''}</p>}
            {status === 'published' && <p className="text-lg font-semibold text-emerald-400">Results published{election.publishedAt ? ` at ${formatTime(election.publishedAt)}` : ''}</p>}
          </div>
          <p className="text-sm text-muted">{formatLagos(election.opensAt)} – {formatLagos(election.closesAt)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          {[['On voter list', election.counts.voters], ['Registered', election.counts.registered], ['Voted', election.counts.voted]].map(([label, value]) => (
            <div key={label as string} className="bg-surface-2 border border-nx rounded-lg py-3">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-[11px] text-dim uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
        {status !== 'draft' && <div className="mt-4"><TurnoutBar voted={election.counts.voted} eligible={election.counts.voters} /></div>}
        {status === 'ready' && election.counts.registered < election.counts.voters && (
          <p className="text-xs text-dim mt-3">{election.counts.voters - election.counts.registered} people on the voter list still have no account. They must register before voting.</p>
        )}
      </div>

      {isCommittee && (
        <div className="card-base p-5 space-y-3">
          <h2 className="font-semibold">Controls</h2>
          {status === 'draft' && <p className="text-sm text-muted">The developer is still setting this election up.</p>}
          {status === 'ready' && (
            <>
              <p className="text-sm text-muted">Voting opens by itself at {formatLagos(election.opensAt)}. You can open it now instead.</p>
              <button type="button" className="btn-primary" disabled={busy !== null} onClick={() => setConfirm({ command: 'open', title: 'Open voting now?', message: `Voting is scheduled for ${formatLagos(election.opensAt)}. Opening now lets students vote immediately. This is logged.`, label: 'Open voting now' })}>Open voting now</button>
            </>
          )}
          {status === 'open' && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" disabled={busy !== null} onClick={() => setConfirm({ command: 'pause', title: 'Pause voting?', message: 'Students will not be able to submit ballots until you resume. Ballots already cast are safe.', label: 'Pause voting' })}>Pause</button>
              <button type="button" className="btn-secondary text-danger" disabled={busy !== null} onClick={() => setConfirm({ command: 'close', title: 'Close voting now?', message: `Voting is scheduled to close at ${formatTime(election.closesAt)}. Closing now is final: it can't be reopened.`, label: 'Close voting now' })}>Close now</button>
            </div>
          )}
          {status === 'paused' && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" disabled={busy !== null} onClick={() => void command('resume', 'Voting resumed.')}>Resume voting</button>
              <button type="button" className="btn-secondary text-danger" disabled={busy !== null} onClick={() => setConfirm({ command: 'close', title: 'Close voting now?', message: "Closing is final: it can't be reopened.", label: 'Close voting now' })}>Close now</button>
            </div>
          )}
          {(status === 'ready' || status === 'open' || status === 'paused') && (
            <div className="pt-2 border-t border-nx">
              <label htmlFor="extend-to" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Extend closing time</label>
              <div className="flex gap-2">
                <input id="extend-to" type="datetime-local" className="input-base min-w-0" min={toLocalInput(election.closesAt)} value={extendTo} onChange={(event) => setExtendTo(event.target.value)} />
                <button type="button" className="btn-secondary shrink-0" disabled={busy !== null || !extendTo} onClick={() => void extend()}>Extend</button>
              </div>
              <p className="text-xs text-dim mt-1">Currently {formatLagos(election.closesAt)}. It can be made later, never earlier.</p>
            </div>
          )}
          {status === 'closed' && (
            <div className="space-y-2">
              <p className="text-sm text-muted">Check the results below, then approve publishing. Results go live for everyone once both committee members approve{election.soloPublishAt ? `, or one member alone after ${formatTime(election.soloPublishAt)}` : ''}.</p>
              {election.approvals.length > 0 && (
                <p className="text-sm">Approved by: <span className="font-medium">{election.approvals.map((approval) => approval.name).join(', ')}</span></p>
              )}
              {iApproved && !soloAllowed ? (
                <p className="text-sm text-accent">You approved. Waiting for {otherMembers} to approve{election.soloPublishAt ? ` (or publish alone after ${formatTime(election.soloPublishAt)})` : ''}.</p>
              ) : (
                <button type="button" className="btn-primary" disabled={busy !== null || !results?.integrity?.ok}
                  onClick={() => setConfirm({ command: 'publish', title: iApproved ? 'Publish the results now?' : 'Approve publishing the results?', message: iApproved ? `${otherMembers} hasn't approved, and 30 minutes have passed since closing, so you can publish alone. Everyone sees the results at once. This cannot be undone.` : 'When both of you have approved, everyone sees the results at the same moment. This cannot be undone.', label: iApproved ? 'Publish now' : 'Approve publishing' })}>
                  {iApproved ? 'Publish now' : 'Approve publishing'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {status !== 'draft' && <NotificationsCard election={election} role={role} onChange={onChange} />}

      {isDev && status === 'closed' && (
        <p className="text-sm text-muted card-base p-4">Voting has closed. You will see the results once the electoral committee publishes them.</p>
      )}

      {canSeeResults && results && (
        <section className="space-y-3" aria-labelledby="admin-results-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="admin-results-heading" className="text-xl font-semibold">{status === 'published' ? 'Results' : 'Results preview (committee only)'}</h2>
            <span className="text-sm text-muted">Turnout {results.turnout.percent}% · {results.turnout.voted} of {results.turnout.eligible}</span>
          </div>
          {results.integrity && (
            <p className={`text-sm ${results.integrity.ok ? 'text-emerald-400' : 'text-danger'}`}>
              Integrity check: {results.integrity.ballots} ballots for {results.integrity.voters} voters {results.integrity.ok ? '✓' : '✗ (publishing blocked)'}
            </p>
          )}
          <ResultsView results={results} />
        </section>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          variant={confirm.command === 'close' ? 'danger' : 'warning'}
          loading={busy !== null}
          onConfirm={() => {
            if (confirm.command === 'publish') void publish();
            else void command(confirm.command, confirm.command === 'open' ? 'Voting is open.' : confirm.command === 'pause' ? 'Voting paused.' : confirm.command === 'close' ? 'Voting closed.' : 'Done.');
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
