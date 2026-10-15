import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { createCommitteeMember, createElection, listAdminElections, listCommittee } from '../features/elections/api/elections';
import { StatusBadge } from '../features/elections/components/ElectionBits';
import { useAction } from '../features/elections/hooks/useAction';
import { useElectionLive } from '../features/elections/hooks/useElectionLive';
import { formatLagos, fromLocalInput, staffToken } from '../features/elections/model/election';

const labelClass = 'block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider';

function NewElectionForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ title: '', description: '', opensAt: '', closesAt: '', registrationDeadline: '', isTest: false });
  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const created = await run('create', () => createElection({
      title: form.title,
      description: form.description,
      opensAt: fromLocalInput(form.opensAt),
      closesAt: fromLocalInput(form.closesAt),
      registrationDeadline: fromLocalInput(form.registrationDeadline),
      isTest: form.isTest,
    }), 'Election created. Add positions, candidates and the voter list next.');
    if (created) onCreated(created.id);
  }
  return (
    <form onSubmit={submit} className="card-base p-5 space-y-4">
      <h2 className="text-lg font-semibold">New election</h2>
      <div>
        <label htmlFor="election-title" className={labelClass}>Title</label>
        <input id="election-title" required maxLength={120} className="input-base" placeholder="e.g. Class Executive Elections 2026" value={form.title} onChange={(e) => set('title')(e.target.value)} />
      </div>
      <div>
        <label htmlFor="election-description" className={labelClass}>Description <span className="normal-case font-normal text-dim">(optional)</span></label>
        <textarea id="election-description" rows={2} maxLength={1000} className="input-base" value={form.description} onChange={(e) => set('description')(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="election-opens" className={labelClass}>Voting opens</label>
          <input id="election-opens" required type="datetime-local" className="input-base" value={form.opensAt} onChange={(e) => set('opensAt')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="election-closes" className={labelClass}>Voting closes</label>
          <input id="election-closes" required type="datetime-local" className="input-base" value={form.closesAt} onChange={(e) => set('closesAt')(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="election-registration" className={labelClass}>Registration deadline <span className="normal-case font-normal text-dim">(optional)</span></label>
        <input id="election-registration" type="datetime-local" className="input-base" value={form.registrationDeadline} onChange={(e) => set('registrationDeadline')(e.target.value)} />
        <p className="text-xs text-dim mt-1">Accounts created after this can&apos;t vote in this election (protects against someone registering a classmate&apos;s matric number at the last minute).</p>
      </div>
      <label className="flex items-start gap-3 cursor-pointer bg-surface-2 border border-nx rounded-lg px-3 py-3">
        <input type="checkbox" className="mt-1 accent-[color:var(--nx-accent)]" checked={form.isTest} onChange={(e) => set('isTest')(e.target.checked)} />
        <span><span className="text-sm font-medium">Test election (rehearsal)</span><span className="block text-xs text-dim mt-0.5">Shown with a Test badge and can be deleted afterwards, even with votes.</span></span>
      </label>
      <button type="submit" className="btn-primary" disabled={busy !== null}>{busy ? 'Creating…' : 'Create election'}</button>
    </form>
  );
}

function CommitteePanel() {
  const load = useCallback((signal: AbortSignal) => listCommittee(signal), []);
  const { data, refresh } = useRemoteData(load);
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  async function submit(event: FormEvent) {
    event.preventDefault();
    const done = await run('add', () => createCommitteeMember(form), `${form.name} can now sign in on the staff sign-in page.`);
    if (done !== undefined) { setForm({ name: '', email: '', password: '' }); void refresh(true); }
  }
  return (
    <section className="card-base p-5" aria-labelledby="committee-heading">
      <h2 id="committee-heading" className="text-lg font-semibold">Electoral committee</h2>
      <p className="text-sm text-muted mt-1">They run the election (open, pause, extend, close, publish). Publishing results needs both members.</p>
      <ul className="mt-3 space-y-2">
        {(data ?? []).map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 bg-surface-2 border border-nx rounded-lg px-3 py-2.5 text-sm">
            <span className="font-medium">{member.name}</span><span className="text-dim truncate">{member.email}</span>
          </li>
        ))}
        {data && !data.length && <li className="text-sm text-dim">No members yet.</li>}
      </ul>
      {(data?.length ?? 0) < 2 && (
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-3 gap-2">
          <label className="sr-only" htmlFor="committee-name">Name</label>
          <input id="committee-name" required className="input-base" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="sr-only" htmlFor="committee-email">Email</label>
          <input id="committee-email" required type="email" className="input-base" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="sr-only" htmlFor="committee-password">Temporary password</label>
          <input id="committee-password" required minLength={8} type="password" autoComplete="new-password" className="input-base" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="submit" className="btn-secondary sm:col-span-3" disabled={busy !== null}>{busy ? 'Adding…' : 'Add committee member'}</button>
          <p className="text-xs text-dim sm:col-span-3">Give them the password privately and ask them to change it after the first sign-in (Profile &amp; password).</p>
        </form>
      )}
    </section>
  );
}

export default function ElectionsAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDev = user?.role === 'dev';
  const load = useCallback((signal: AbortSignal) => listAdminElections(signal), []);
  const { data, loading, error, refresh } = useRemoteData(load);
  const [creating, setCreating] = useState(false);
  useElectionLive(staffToken(), { onUpdate: () => void refresh(true), onRemoved: () => void refresh(true) });

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            {isDev && <Link to="/dashboard" className="btn-ghost !px-0 mb-2">← Dashboard</Link>}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Elections</h1>
            <p className="text-sm text-muted mt-1">
              {isDev ? 'You set elections up; the electoral committee runs them. Nobody can see who anyone voted for.' : 'You run the election: open, pause, extend, close and publish the results. Nobody can see who anyone voted for.'}
            </p>
          </div>
          {isDev && !creating && <button type="button" className="btn-primary" onClick={() => setCreating(true)}>+ New election</button>}
        </div>

        {creating && <NewElectionForm onCreated={(id) => navigate(`/elections/${id}`)} />}

        {error ? (
          <div role="alert" className="alert-danger">We couldn&apos;t load the elections. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div>
        ) : loading && !data ? (
          <div className="card-base h-32 animate-pulse" />
        ) : !data?.length ? (
          <div className="card-base p-6 text-center text-sm text-muted">{isDev ? 'No elections yet. Create the first one.' : 'No elections yet. The developer sets them up.'}</div>
        ) : (
          <div className="space-y-3">
            {data.map((election) => (
              <Link key={election.id} to={`/elections/${election.id}`} className="card-interactive p-4 sm:p-5 block">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={election.effectiveStatus} />
                  {election.isTest && <span className="badge">Test</span>}
                </div>
                <h2 className="text-lg font-semibold mt-2">{election.title}</h2>
                <p className="text-sm text-muted mt-1">{formatLagos(election.opensAt)} – {formatLagos(election.closesAt)}</p>
                <p className="text-xs text-dim mt-2">
                  {election.counts.positions} positions · {election.counts.candidates} candidates · {election.counts.voters} on the voter list · {election.counts.voted} voted
                </p>
              </Link>
            ))}
          </div>
        )}

        {isDev && <CommitteePanel />}
      </main>
    </div>
  );
}
