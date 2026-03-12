import ConfirmButton from './ConfirmButton';
import type { Submission } from '../types';

interface Props {
  submissions: Submission[];
  onConfirmed: (updated: Submission) => void;
}

export default function SubmissionsTable({ submissions, onConfirmed }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No submissions yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Card list — mobile */}
      <ul className="divide-y divide-gray-100 md:hidden">
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
                  <span className="text-xs text-gray-400 font-mono">{i + 1}.</span>
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.fullName}</p>
                </div>
                <p className="text-xs text-gray-500 font-mono">{s.matricNumber}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {s.level && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s.level}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{submittedAt}</span>
                  {s.isConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                      Pending
                    </span>
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
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Full Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Matric No.</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Level</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted At</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
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
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.matricNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{s.level ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{submittedAt}</td>
                  <td className="px-4 py-3">
                    {s.isConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        Pending
                      </span>
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
