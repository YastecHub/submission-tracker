import { useState, type FormEvent } from 'react';
import { useDialogFocus } from '../../../../hooks/useDialogFocus';
import { useObjectUrl } from '../../../../hooks/useObjectUrl';
import { addCandidate, updateCandidate } from '../../api/elections';
import { useAction } from '../../hooks/useAction';
import type { AdminCandidate, AdminElection } from '../../model/types';
import { CandidateAvatar } from '../ElectionBits';

const MANIFESTO_MAX = 1500;
const labelClass = 'block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider';

/** Add a candidate, or fix one (name, photo, manifesto stay editable until results are published). */
export default function CandidateDialog({ election, positionId, candidate, profileOnly = false, onSaved, onClose }: {
  election: AdminElection;
  positionId: string;
  candidate?: AdminCandidate;
  /** The committee edits the profile only (name, nickname, photo, manifesto), never the matric number or position. */
  profileOnly?: boolean;
  onSaved: (next: AdminElection) => void;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(onClose);
  const inSetup = election.status === 'draft' && !profileOnly;
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    displayName: candidate?.displayName ?? '',
    matricNumber: candidate?.matricNumber ?? '',
    nickname: candidate?.nickname ?? '',
    manifesto: candidate?.manifesto ?? '',
    positionId,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const preview = useObjectUrl(photo);
  const shownPhoto = preview ?? (removePhoto ? null : candidate?.photoUrl ?? null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fields: Record<string, string | undefined> = {
      displayName: form.displayName,
      nickname: form.nickname,
      manifesto: form.manifesto,
      ...(inSetup ? { matricNumber: form.matricNumber, positionId: form.positionId } : {}),
    };
    const next = await run('save', () => (candidate
      ? updateCandidate(election.id, candidate.id, fields, photo, removePhoto)
      : addCandidate(election.id, fields, photo)), candidate ? 'Candidate updated.' : 'Candidate added.');
    if (next) onSaved(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div ref={panelRef} className="relative card-base w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6 rounded-b-none sm:rounded-b-[0.875rem]">
        <form onSubmit={submit} className="space-y-4">
          <h2 id="candidate-dialog-title" className="text-lg font-semibold">{candidate ? 'Edit candidate' : 'Add candidate'}</h2>
          {!inSetup && <p className="text-xs text-accent">The election is locked: you can fix the name, nickname, photo and manifesto (logged). Everything else is fixed.</p>}
          <div className="flex items-center gap-4">
            <CandidateAvatar name={form.displayName || '?'} photoUrl={shownPhoto} size="lg" />
            <div className="space-y-1">
              <label className="btn-secondary !py-2 cursor-pointer">
                {shownPhoto ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { setPhoto(event.target.files?.[0] ?? null); setRemovePhoto(false); }} />
              </label>
              {shownPhoto && <button type="button" className="block text-xs text-danger min-h-8" onClick={() => { setPhoto(null); setRemovePhoto(true); }}>Remove photo</button>}
              <p className="text-[11px] text-dim">JPG, PNG or WEBP under 5 MB. A clear face photo works best.</p>
            </div>
          </div>
          {inSetup && (
            <div>
              <label htmlFor="candidate-position" className={labelClass}>Position</label>
              <select id="candidate-position" className="input-base" value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })}>
                {election.positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="candidate-name" className={labelClass}>Full name</label>
            <input id="candidate-name" required maxLength={120} className="input-base" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="candidate-nickname" className={labelClass}>Nickname <span className="normal-case font-normal text-dim">(optional)</span></label>
              <input id="candidate-nickname" maxLength={60} className="input-base" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            </div>
            {inSetup && (
              <div>
                <label htmlFor="candidate-matric" className={labelClass}>Matric number <span className="normal-case font-normal text-dim">(optional)</span></label>
                <input id="candidate-matric" maxLength={30} className="input-base uppercase" value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="candidate-manifesto" className={labelClass}>Manifesto <span className="normal-case font-normal text-dim">(optional)</span></label>
            <textarea id="candidate-manifesto" rows={6} maxLength={MANIFESTO_MAX} className="input-base" value={form.manifesto} onChange={(e) => setForm({ ...form, manifesto: e.target.value })} />
            <p className="text-[11px] text-dim text-right">{form.manifesto.length}/{MANIFESTO_MAX}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={busy !== null}>{busy ? 'Saving…' : candidate ? 'Save changes' : 'Add candidate'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
