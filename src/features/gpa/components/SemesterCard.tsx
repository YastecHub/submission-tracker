import { Link } from 'react-router-dom';
import { formatGpa, semesterTitle } from '../model/gpa';
import type { SemesterView } from '../model/types';

export function SyncBadge({ semester }: { semester: SemesterView }) {
  if (semester.sync === 'synced') return null;
  const label = semester.sync === 'conflict' ? 'Needs attention'
    : semester.sync === 'error' ? 'Not saved'
      : semester.sync === 'syncing' ? 'Saving…'
        : 'On this device';
  const tone = semester.sync === 'conflict' || semester.sync === 'error' ? 'badge-danger' : 'badge';
  return <span className={`badge ${tone}`} title={semester.syncMessage ?? (semester.sync === 'pending' ? 'Saved on this device. It will sync when you are online.' : undefined)}>{label}</span>;
}

export default function SemesterCard({ semester }: { semester: SemesterView }) {
  const { totals } = semester;
  return (
    <Link to={`/student/gpa/semester/${semester.id}`} className="card-interactive p-4 flex items-center gap-4 focus-visible:border-[color:var(--nx-accent)]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{semesterTitle(semester.level, semester.semester)}</h3>
          {semester.status === 'finalized'
            ? <span className="badge badge-success">Final</span>
            : <span className="badge badge-accent">Draft</span>}
          <SyncBadge semester={semester} />
        </div>
        <p className="text-xs text-dim mt-1">
          {semester.sessionLabel ? `${semester.sessionLabel} · ` : ''}
          {semester.courses.length} course{semester.courses.length === 1 ? '' : 's'} · {totals.units + totals.pendingUnits} units
        </p>
        {semester.status === 'draft' && semester.courses.length > 0 && (
          <p className={`text-xs mt-1 font-medium ${totals.pendingCourses > 0 ? 'text-accent' : 'text-emerald-400'}`}>
            {totals.pendingCourses > 0
              ? `${semester.courses.length - totals.pendingCourses} of ${semester.courses.length} graded · tap to continue`
              : 'All graded · ready to finalize'}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-2xl font-semibold tabular-nums">{formatGpa(totals.gpa)}</p>
        <p className="text-[11px] text-dim uppercase tracking-wider">GPA</p>
      </div>
    </Link>
  );
}
