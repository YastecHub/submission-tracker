import { useCallback, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardSectionNav from '../components/DashboardSectionNav';
import { useToast } from '../context/ToastContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { downloadBirthdayExport, getBirthdayOverview } from '../features/birthdays/api/birthdays';
import type { BirthdayRow } from '../features/birthdays/model/types';

function when(daysUntil: number): string {
  if (daysUntil === 0) return 'Today 🎉';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

function Person({ row, extra }: { row: BirthdayRow; extra?: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {row.photoUrl
        ? <a href={row.photoUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={row.photoUrl} alt={`Photo of ${row.displayName}`} className="w-10 h-10 rounded-full object-cover border border-nx" /></a>
        : <span className="w-10 h-10 rounded-full bg-surface-2 border border-nx flex items-center justify-center shrink-0" aria-hidden="true">🎂</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{row.fullName}{row.preferredName && <span className="text-dim font-normal"> ({row.preferredName})</span>}</p>
        <p className="text-[11px] text-dim truncate">
          {row.matricNumber.startsWith('JUPEB-') ? 'JUPEB' : row.matricNumber} · {row.shareWithClass ? 'Classmates told' : 'Private'}{!row.photoUrl && ' · No photo'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium">{row.birthday}</p>
        {extra && <p className="text-[11px] text-accent">{extra}</p>}
      </div>
    </li>
  );
}

/** Birthdays for class reps and the developer: who has answered, what's coming up, and the export for the media team. */
export default function BirthdaysAdminPage() {
  const { toast } = useToast();
  const load = useCallback((signal: AbortSignal) => getBirthdayOverview(signal), []);
  const { data, loading, error, refresh } = useRemoteData(load);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((row) => !term || `${row.fullName} ${row.preferredName ?? ''} ${row.matricNumber} ${row.birthday}`.toLowerCase().includes(term));
  }, [data, search]);

  async function exportExcel() {
    setExporting(true);
    try {
      await downloadBirthdayExport();
    } catch {
      toast('The export failed. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function copyMissing() {
    const names = (data?.notAnswered ?? []).map((student) => student.fullName).join('\n');
    try {
      await navigator.clipboard.writeText(names);
      toast('Names copied. Paste them in the class group.', 'success');
    } catch {
      toast('Copying is not allowed in this browser.', 'error');
    }
  }

  const percent = data && data.counts.students ? Math.round((data.counts.answered / data.counts.students) * 100) : 0;

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">Class celebrations</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Birthdays</h1>
            <p className="text-sm text-muted mt-1">From the birthday form in the student app. Students are celebrated automatically on the day.</p>
          </div>
          <button type="button" className="btn-primary justify-center" disabled={exporting || !data?.rows.length} onClick={() => void exportExcel()}>
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>

        <DashboardSectionNav active="birthdays" />

        {error ? (
          <div role="alert" className="alert-danger">We couldn&apos;t load the birthdays. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div>
        ) : loading && !data ? (
          <div className="card-base h-48 animate-pulse" />
        ) : data && (
          <div className="space-y-5">
            <section className="card-base p-5" aria-label="Responses">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted">Filled in</p>
                <p className="text-sm"><span className="text-2xl font-semibold tabular-nums">{data.counts.answered}</span> <span className="text-dim">of {data.counts.students} students with accounts</span></p>
              </div>
              <div className="h-2 rounded-full bg-surface-2 mt-3 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Students who filled in the form">
                <div className="h-full bg-[color:var(--nx-accent)]" style={{ width: `${percent}%` }} />
              </div>
            </section>

            <section className="card-base p-5" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="font-semibold">Coming up (next 7 days)</h2>
              {data.upcoming.length
                ? <ul className="divide-y divide-[color:var(--nx-border)] mt-2">{data.upcoming.map((row) => <Person key={row.matricNumber} row={row} extra={when(row.daysUntil)} />)}</ul>
                : <p className="text-sm text-dim mt-2">No birthdays in the next 7 days.</p>}
            </section>

            <section className="card-base p-5" aria-labelledby="all-heading">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 id="all-heading" className="font-semibold">All birthdays <span className="text-dim font-normal">({data.rows.length})</span></h2>
                <label htmlFor="birthday-search" className="sr-only">Search birthdays</label>
                <input id="birthday-search" className="input-base sm:max-w-xs" placeholder="Search name, matric or month" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              {rows.length
                ? <ul className="divide-y divide-[color:var(--nx-border)] mt-2">{rows.map((row) => <Person key={row.matricNumber} row={row} />)}</ul>
                : <p className="text-sm text-dim mt-3">{data.rows.length ? 'No match.' : 'Nobody has filled in the form yet.'}</p>}
            </section>

            {data.notAnswered.length > 0 && (
              <details className="card-base p-5">
                <summary className="font-semibold cursor-pointer min-h-8">Not filled in yet <span className="text-dim font-normal">({data.notAnswered.length})</span></summary>
                <button type="button" className="btn-secondary !py-1.5 text-sm mt-3" onClick={() => void copyMissing()}>Copy names</button>
                <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {data.notAnswered.map((student) => <li key={student.matricNumber} className="truncate text-muted">{student.fullName}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
