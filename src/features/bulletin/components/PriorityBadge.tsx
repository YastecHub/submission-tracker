import type { AnnouncementPriority } from '../model/types';
import { priorityLabels } from '../model/presentation';

export default function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  if (priority === 'normal') return null;
  return (
    <span className={`badge ${priority === 'urgent' ? 'badge-danger' : 'badge-accent'}`}>
      <span aria-hidden="true">{priority === 'urgent' ? '!' : '●'}</span>
      {priorityLabels[priority]}
    </span>
  );
}
