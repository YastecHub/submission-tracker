import { Link } from 'react-router-dom';
import type { BulletinFeedItem } from '../model/types';
import { categoryLabels, formatBulletinDate } from '../model/presentation';
import PriorityBadge from './PriorityBadge';

export default function AnnouncementCard({ announcement }: { announcement: BulletinFeedItem }) {
  return (
    <article className={`card-interactive p-5 relative ${announcement.isUnread ? 'border-[color:var(--nx-accent)]' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">{categoryLabels[announcement.category]}</span>
        <PriorityBadge priority={announcement.priority} />
        {announcement.isPinned && <span className="badge" aria-label="Pinned announcement">Pinned</span>}
        {announcement.isUnread && <span className="badge badge-accent">Unread</span>}
      </div>
      <h2 className="text-lg font-semibold tracking-tight">
        <Link to={`/student/news/${announcement.slug}`} className="hover:text-accent transition-colors">
          {announcement.title}
        </Link>
      </h2>
      <p className="text-sm text-muted mt-2 leading-6">{announcement.summary}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim mt-4">
        <span>{formatBulletinDate(announcement.publishedAt)}</span>
        {announcement.contributorName && <span>From {announcement.contributorName}</span>}
      </div>
      <Link
        to={`/student/news/${announcement.slug}`}
        className="inline-flex text-sm font-medium text-accent mt-4 min-h-11 items-center"
        aria-label={`Read ${announcement.title}`}
      >
        Read announcement <span aria-hidden="true" className="ml-1">→</span>
      </Link>
    </article>
  );
}
