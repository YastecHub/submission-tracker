import { useState, type FormEvent } from 'react';
import ConfirmModal from '../../../../components/ConfirmModal';
import { addPosition, removeCandidate, removePosition, runCommand, updateElection, updatePosition } from '../../api/elections';
import { useAction } from '../../hooks/useAction';
import { formatLagos, fromLocalInput, toLocalInput } from '../../model/election';
import type { AdminCandidate, AdminElection } from '../../model/types';
import { CandidateAvatar } from '../ElectionBits';
import CandidateDialog from './CandidateDialog';

const labelClass = 'block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider';

function Details({ election, onChange }: { election: AdminElection; onChange: (next: AdminElection) => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    title: election.title,
    description: election.description ?? '',
    opensAt: toLocalInput(election.opensAt),
    closesAt: toLocalInput(election.closesAt),
    registrationDeadline: toLocalInput(election.registrationDeadline),
    isTest: election.isTest,
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = await run('save', () => updateElection(election.id, {
      title: form.title,
      description: form.description,
      opensAt: fromLocalInput(form.opensAt),
      closesAt: fromLocalInput(form.closesAt),
      registrationDeadline: fromLocalInput(form.registrationDeadline),
      isTest: form.isTest,
    }), 'Saved.');
    if (next) onChange(next);
  }
  return (
    <form onSubmit={submit} className="card-base p-5 space-y-3">
      <h2 className="font-semibold">Details</h2>
      <div>
        <label htmlFor="edit-title" className={labelClass}>Title</label>
        <input id="edit-title" required maxLength={120} className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label htmlFor="edit-description" className={labelClass}>Description</label>
        <textarea id="edit-description" rows={2} maxLength={1000} className="input-base" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label htmlFor="edit-opens" className={labelClass}>Opens</label><input id="edit-opens" required type="datetime-local" className="input-base" value={form.opensAt} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} /></div>
        <div><label htmlFor="edit-closes" className={labelClass}>Closes</label><input id="edit-closes" required type="datetime-local" className="input-base" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} /></div>
        <div><label htmlFor="edit-registration" className={labelClass}>Registration deadline</label><input id="edit-registration" type="datetime-local" className="input-base" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-[color:var(--nx-accent)]" checked={form.isTest} onChange={(e) => setForm({ ...form, isTest: e.target.checked })} /> Test election (rehearsal)</label>
      <button type="submit" className="btn-secondary" disabled={busy !== null}>{busy ? 'Saving…' : 'Save details'}</button>
    </form>
  );
}

/** The developer's setup: details, positions and candidates, then lock and hand over. */
export default function SetupPanel({ election, role, onChange }: { election: AdminElection; role: string; onChange: (next: AdminElection) => void }) {
  const isDev = role === 'dev';
  const editable = isDev && election.status === 'draft';
  const canFixProfiles = isDev && election.status !== 'published';
  const { busy, run } = useAction();
  const [newPosition, setNewPosition] = useState('');
  const [dialog, setDialog] = useState<{ positionId: string; candidate?: AdminCandidate } | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; label: string; action: () => Promise<void> }>(null);

  const problems = [
    !election.positions.length && 'Add at least one position.',
    ...election.positions.filter((position) => !position.candidates.length).map((position) => `Add a candidate for ${position.title}.`),
    !election.counts.voters && 'The voter list is empty: the class list has not been seeded yet.',
    new Date(election.closesAt).getTime() < Date.now() + 5 * 60_000 && 'The closing time has passed. Change the times.',
  ].filter(Boolean) as string[];

  async function add(event: FormEvent) {
    event.preventDefault();
    const next = await run('add-position', () => addPosition(election.id, newPosition));
    if (next) { onChange(next); setNewPosition(''); }
  }

  return (
    <div className="space-y-4">
      {isDev && election.status === 'draft' && (
        <div className="card-base p-5 border-[color:var(--nx-accent)]">
          <h2 className="font-semibold">Hand over to the electoral committee</h2>
          {problems.length ? (
            <ul className="text-sm text-muted mt-2 list-disc pl-5 space-y-1">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
          ) : (
            <p className="text-sm text-muted mt-1">Everything is in place. Locking freezes positions, candidates and the voter list; voting then opens by itself at {formatLagos(election.opensAt)} (or earlier if the committee opens it). You can still fix a candidate&apos;s name, photo or manifesto, and add late voters.</p>
          )}
          <button type="button" className="btn-primary mt-3" disabled={busy !== null || problems.length > 0}
            onClick={() => setConfirm({ title: 'Lock the election?', message: 'Positions, candidates and the voter list are frozen and the committee takes over. You can unlock again only before voting opens.', label: 'Lock and hand over', action: async () => { const next = await run('ready', () => runCommand(election.id, 'ready'), 'Locked. The committee can now see it as ready.'); if (next) onChange(next); } })}>
            Lock and hand over
          </button>
        </div>
      )}
      {isDev && election.status === 'ready' && (
        <div className="card-base p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Locked and waiting to open. Need a structural change? Unlock it (only before voting opens).</p>
          <button type="button" className="btn-secondary" disabled={busy !== null} onClick={() => setConfirm({ title: 'Unlock for changes?', message: 'The election goes back to setup until you lock it again. If it is not locked again before the opening time, it will not open.', label: 'Unlock', action: async () => { const next = await run('draft', () => runCommand(election.id, 'draft'), 'Back in setup.'); if (next) onChange(next); } })}>Back to setup</button>
        </div>
      )}

      {editable && <Details key={election.version} election={election} onChange={onChange} />}

      <section className="space-y-3" aria-labelledby="positions-heading">
        <h2 id="positions-heading" className="text-lg font-semibold">Positions and candidates</h2>
        {!election.positions.length && <p className="text-sm text-muted">No positions yet.</p>}
        {election.positions.map((position, index) => (
          <div key={position.id} className="card-base p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{position.title}{position.candidates.length === 1 && <span className="text-xs text-dim font-normal ml-2">Unopposed: Yes/No vote</span>}</h3>
              {editable && (
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" className="btn-ghost !px-2 !py-1" aria-label={`Move ${position.title} up`} disabled={index === 0 || busy !== null} onClick={async () => { const next = await run('move', () => updatePosition(election.id, position.id, { move: 'up' })); if (next) onChange(next); }}>↑</button>
                  <button type="button" className="btn-ghost !px-2 !py-1" aria-label={`Move ${position.title} down`} disabled={index === election.positions.length - 1 || busy !== null} onClick={async () => { const next = await run('move', () => updatePosition(election.id, position.id, { move: 'down' })); if (next) onChange(next); }}>↓</button>
                  <button type="button" className="btn-ghost !px-2 !py-1 text-danger" onClick={() => setConfirm({ title: `Remove ${position.title}?`, message: 'The position and its candidates are removed.', label: 'Remove', action: async () => { const next = await run('remove', () => removePosition(election.id, position.id), 'Position removed.'); if (next) onChange(next); } })}>Remove</button>
                </div>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {position.candidates.map((candidate) => (
                <li key={candidate.id} className="flex items-center gap-3 bg-surface-2 border border-nx rounded-lg p-2.5">
                  <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{candidate.displayName}{candidate.nickname && <span className="text-dim font-normal"> ({candidate.nickname})</span>}</p>
                    <p className="text-[11px] text-dim truncate">{candidate.matricNumber ?? 'No matric number'} · {candidate.manifesto ? `${candidate.manifesto.length} character manifesto` : 'No manifesto'}{!candidate.photoUrl && ' · No photo'}</p>
                  </div>
                  {canFixProfiles && <button type="button" className="btn-ghost !py-1 text-sm" onClick={() => setDialog({ positionId: position.id, candidate })}>Edit</button>}
                  {editable && <button type="button" className="btn-ghost !py-1 text-sm text-danger" aria-label={`Remove ${candidate.displayName}`} onClick={() => setConfirm({ title: `Remove ${candidate.displayName}?`, message: `They will no longer run for ${position.title}.`, label: 'Remove', action: async () => { const next = await run('remove', () => removeCandidate(election.id, candidate.id), 'Candidate removed.'); if (next) onChange(next); } })}>×</button>}
                </li>
              ))}
            </ul>
            {editable && <button type="button" className="btn-secondary !py-2 mt-3" onClick={() => setDialog({ positionId: position.id })}>+ Add candidate</button>}
          </div>
        ))}
        {editable && (
          <form onSubmit={add} className="flex gap-2">
            <label htmlFor="new-position" className="sr-only">New position</label>
            <input id="new-position" required maxLength={120} className="input-base" placeholder="New position, e.g. President" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} />
            <button type="submit" className="btn-primary shrink-0" disabled={busy !== null}>Add position</button>
          </form>
        )}
      </section>

      {dialog && (
        <CandidateDialog election={election} positionId={dialog.positionId} candidate={dialog.candidate}
          onSaved={(next) => { onChange(next); setDialog(null); }} onClose={() => setDialog(null)} />
      )}
      {confirm && (
        <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.label} variant="warning" loading={busy !== null}
          onConfirm={() => { const action = confirm.action; setConfirm(null); void action(); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}
