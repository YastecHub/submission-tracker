import { useCallback, useMemo, useState } from 'react';
import { useRemoteData } from '../../../../hooks/useRemoteData';
import { getRegistrations, setSuspension, uploadVoters } from '../../api/elections';
import { useAction } from '../../hooks/useAction';
import { formatLagos } from '../../model/election';
import type { AdminElection, Registration, VoterUploadResult } from '../../model/types';

type Filter = 'all' | 'unregistered' | 'registered' | 'suspended';

function Upload({ election, onApplied }: { election: AdminElection; onApplied: () => void }) {
  const { busy, run } = useAction();
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<VoterUploadResult | null>(null);
  const locked = election.status !== 'draft';
  async function check() {
    const result = await run('check', () => uploadVoters(election.id, csv, true));
    if (result) setPreview(result);
  }
  async function apply() {
    const result = await run('apply', () => uploadVoters(election.id, csv, false), locked ? 'Voters added.' : 'Voter list saved.');
    if (result?.applied) { setPreview(null); setCsv(''); onApplied(); }
  }
  return (
    <div className="card-base p-5 space-y-3">
      <h2 className="font-semibold">{locked ? 'Add late voters' : 'Upload the voter list'}</h2>
      <p className="text-sm text-muted">
        CSV with a header: <code className="text-xs">matricNumber,fullName,email</code>. Email is optional, except for students without a matric number (e.g. JUPEB): they register with that email and the code goes only there.
        {locked ? ' The election is locked, so you can only add people now; nobody is removed.' : ' Uploading replaces the current list.'}
      </p>
      <label className="btn-secondary !py-2 cursor-pointer w-fit">
        Choose CSV file
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setCsv(await file.text()); setPreview(null); } }} />
      </label>
      <label htmlFor="voter-csv" className="sr-only">Voter list CSV</label>
      <textarea id="voter-csv" rows={6} className="input-base font-mono text-xs" placeholder={'matricNumber,fullName,email\n251106026,Yasir Oladimeji Oyebo,\n,Jupeb Student Name,jupeb.student@gmail.com'}
        value={csv} onChange={(event) => { setCsv(event.target.value); setPreview(null); }} />
      {preview && (
        <div className={`rounded-lg border p-3 text-sm ${preview.errorCount ? 'border-[color:var(--nx-danger)]' : 'border-nx bg-surface-2'}`}>
          {preview.errorCount ? (
            <>
              <p className="font-semibold text-danger">{preview.errorCount} problem{preview.errorCount === 1 ? '' : 's'} to fix first</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </>
          ) : (
            <p>
              <span className="font-semibold">{preview.total} voters</span>
              {preview.emailOnly > 0 && ` (${preview.emailOnly} sign up with email only)`}. {preview.added} new
              {preview.mode === 'replace' && preview.removed > 0 && `, ${preview.removed} will be removed`}.
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={!csv.trim() || busy !== null} onClick={() => void check()}>{busy === 'check' ? 'Checking…' : 'Check file'}</button>
        <button type="button" className="btn-primary" disabled={!preview || preview.errorCount > 0 || busy !== null} onClick={() => void apply()}>{busy === 'apply' ? 'Saving…' : locked ? 'Add voters' : 'Save voter list'}</button>
      </div>
    </div>
  );
}

function SuspendDialog({ row, onConfirm, onClose, busy }: { row: Registration; onConfirm: (reason: string) => void; onClose: () => void; busy: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="suspend-title">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative card-base w-full max-w-sm p-5">
        <h2 id="suspend-title" className="text-lg font-semibold">Suspend {row.account?.name}?</h2>
        <p className="text-sm text-muted mt-1">They are signed out everywhere and can&apos;t vote. A vote already cast stays counted (votes are secret and can&apos;t be traced). Use this when someone registered with a matric number that isn&apos;t theirs.</p>
        <label htmlFor="suspend-reason" className="block text-xs font-medium text-muted mt-3 mb-1.5 uppercase tracking-wider">Reason (logged)</label>
        <textarea id="suspend-reason" rows={3} maxLength={300} className="input-base" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2 mt-4">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary flex-1 !bg-[color:var(--nx-danger)] !border-[color:var(--nx-danger)] !text-white" disabled={busy || reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>Suspend</button>
        </div>
      </div>
    </div>
  );
}

/** The voter list with who has registered. The committee can suspend a suspicious account. */
export default function VotersPanel({ election, role, onChanged }: { election: AdminElection; role: string; onChanged: () => void }) {
  const isDev = role === 'dev';
  const isCommittee = role === 'electoral_committee';
  const load = useCallback((signal: AbortSignal) => getRegistrations(election.id, signal), [election.id]);
  const { data, loading, refresh } = useRemoteData(load);
  const { busy, run } = useAction();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [suspending, setSuspending] = useState<Registration | null>(null);
  const canUpload = isDev && !['closed', 'published'].includes(election.status);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (filter === 'unregistered' && row.account) return false;
      if (filter === 'registered' && (!row.account || row.account.suspended)) return false;
      if (filter === 'suspended' && !row.account?.suspended) return false;
      return !term || row.fullName.toLowerCase().includes(term) || row.matricNumber.toLowerCase().includes(term) || (row.account?.name.toLowerCase().includes(term) ?? false);
    });
  }, [data, filter, search]);
  const counts = useMemo(() => ({
    all: data?.length ?? 0,
    unregistered: data?.filter((row) => !row.account).length ?? 0,
    registered: data?.filter((row) => row.account && !row.account.suspended).length ?? 0,
    suspended: data?.filter((row) => row.account?.suspended).length ?? 0,
  }), [data]);

  async function changeSuspension(row: Registration, suspend: boolean, reason?: string) {
    const done = await run('suspend', () => setSuspension(election.id, row.account!.id, suspend, reason), suspend ? `${row.account!.name} is suspended.` : `${row.account!.name} is restored.`);
    if (done) { setSuspending(null); void refresh(true); onChanged(); }
  }

  return (
    <div className="space-y-4">
      {canUpload && <Upload election={election} onApplied={() => { void refresh(true); onChanged(); }} />}
      <div className="card-base p-4 sm:p-5">
        <div className="flex flex-wrap gap-1 bg-surface-2 border border-nx rounded-lg p-1 w-full sm:w-fit">
          {(['all', 'unregistered', 'registered', 'suspended'] as Filter[]).map((value) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
              className={`px-3 py-1.5 min-h-9 rounded-md text-sm ${filter === value ? 'bg-surface border border-nx text-[color:var(--nx-text)]' : 'text-muted'}`}>
              {value === 'all' ? 'All' : value === 'unregistered' ? 'No account yet' : value === 'registered' ? 'Registered' : 'Suspended'} <span className="text-dim">{counts[value]}</span>
            </button>
          ))}
        </div>
        <label htmlFor="voter-search" className="sr-only">Search voters</label>
        <input id="voter-search" className="input-base mt-3" placeholder="Search name or matric number" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isCommittee && <p className="text-xs text-dim mt-2">Check new registrations: if a name doesn&apos;t match its matric number or the email looks wrong, suspend the account before voting opens.</p>}
        {loading && !data ? <div className="h-40 animate-pulse mt-3" /> : (
          <ul className="mt-3 divide-y divide-[color:var(--nx-border)]">
            {rows.slice(0, 300).map((row) => (
              <li key={row.matricNumber} className="py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{row.fullName}</p>
                  <p className="text-[11px] text-dim truncate">
                    {row.emailOnly ? `No matric · ${row.seededEmail ?? ''}` : row.matricNumber}
                    {row.account && ` · ${row.account.email} · registered ${formatLagos(row.account.registeredAt)}`}
                    {row.account && row.account.name.toLowerCase() !== row.fullName.toLowerCase() && ` · account name: ${row.account.name}`}
                  </p>
                  {row.account?.suspended && <p className="text-[11px] text-danger">Suspended: {row.account.suspendedReason}</p>}
                </div>
                {!row.account ? <span className="badge shrink-0">No account</span>
                  : row.account.suspended ? (isCommittee ? <button type="button" className="btn-ghost !py-1 text-sm shrink-0" disabled={busy !== null} onClick={() => void changeSuspension(row, false)}>Restore</button> : <span className="badge badge-danger shrink-0">Suspended</span>)
                    : isCommittee ? <button type="button" className="btn-ghost !py-1 text-sm text-danger shrink-0" onClick={() => setSuspending(row)}>Suspend</button>
                      : <span className="badge badge-success shrink-0">Registered</span>}
              </li>
            ))}
            {!rows.length && <li className="py-6 text-center text-sm text-dim">Nobody here.</li>}
          </ul>
        )}
        {rows.length > 300 && <p className="text-xs text-dim mt-2">Showing the first 300. Search to narrow down.</p>}
      </div>
      {suspending && <SuspendDialog row={suspending} busy={busy !== null} onClose={() => setSuspending(null)} onConfirm={(reason) => void changeSuspension(suspending, true, reason)} />}
    </div>
  );
}
