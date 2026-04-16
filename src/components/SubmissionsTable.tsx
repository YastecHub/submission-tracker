import ConfirmButton from './ConfirmButton';
import type { Submission } from '../types';

interface Props {
  submissions: Submission[];
  onConfirmed: (updated: Submission) => void;
  loading?: boolean;
  pageOffset?: number;
}

function SkeletonRows() {
  return (
    <>
      {/* Mobile skeleton */}
      <ul className="divide-y divide-[color:var(--nx-border)] md:hidden">
        {[...Array(5)].map((_, i) => (
          <li key={i} className="px-4 py-4 flex items-start justify-between gap-3 animate-pulse">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-2 rounded w-2/3" />
              <div className="h-3 bg-surface-2 rounded w-1/3" />
              <div className="flex gap-2 mt-1">
                <div className="h-5 w-12 bg-surface-2 rounded-full" />
                <div className="h-5 w-16 bg-surface-2 rounded-full" />
              </div>
            </div>
            <div className="h-8 w-20 bg-surface-2 rounded-lg flex-shrink-0" />
          </li>
        ))}
      </ul>
      {/* Desktop skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 border-b border-nx">
              {['#', 'Full Name', 'Matric No.', 'Level', 'Submitted At', 'Status', 'Action'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-nx animate-pulse">
                <td className="px-4 py-3"><div className="h-3 w-4 bg-surface-2 rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-surface-2 rounded w-36" /></td>
                <td className="px-4 py-3"><div className="h-3 bg-surface-2 rounded w-24" /></td>
                <td className="px-4 py-3"><div className="h-3 bg-surface-2 rounded w-10" /></td>
                <td className="px-4 py-3"><div className="h-3 bg-surface-2 rounded w-20" /></td>
                <td className="px-4 py-3"><div className="h-5 w-16 bg-surface-2 rounded-full" /></td>
                <td className="px-4 py-3"><div className="h-8 w-20 bg-surface-2 rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function SubmissionsTable({ submissions, onConfirmed, loading, pageOffset = 0 }: Props) {
  if (loading) return <SkeletonRows />;

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-dim">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No submissions yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Card list — mobile */}
      <ul className="divide-y divide-[color:var(--nx-border)] md:hidden">
        {submissions.map((s, i) => {
          const submittedAt = new Date(s.submittedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <li key={s.id} className="px-4 py-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-dim font-mono">{pageOffset + i + 1}.</span>
                  <p className="font-semibold text-sm truncate">{s.fullName}</p>
                </div>
                <p className="text-xs text-muted font-mono">{s.matricNumber}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {s.level && (
                    <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
                      {s.level}
                    </span>
                  )}
                  <span className="text-xs text-dim">{submittedAt}</span>
                  {s.isConfirmed ? (
                    <span className="badge badge-success">Confirmed</span>
                  ) : (
                    <span className="badge badge-accent">Pending</span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 pt-1">
                <ConfirmButton submission={s} onConfirmed={onConfirmed} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 border-b border-nx">
              <th className="text-left px-4 py-3 font-semibold text-muted">#</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Full Name</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Matric No.</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Level</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Submitted At</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => {
              const submittedAt = new Date(s.submittedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <tr key={s.id} className="border-b border-nx hover:bg-surface-2 transition">
                  <td className="px-4 py-3 text-dim">{pageOffset + i + 1}</td>
                  <td className="px-4 py-3 font-medium">{s.fullName}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{s.matricNumber}</td>
                  <td className="px-4 py-3 text-muted">{s.level ?? '-'}</td>
                  <td className="px-4 py-3 text-muted text-xs">{submittedAt}</td>
                  <td className="px-4 py-3">
                    {s.isConfirmed ? (
                      <span className="badge badge-success">Confirmed</span>
                    ) : (
                      <span className="badge badge-accent">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ConfirmButton submission={s} onConfirmed={onConfirmed} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
