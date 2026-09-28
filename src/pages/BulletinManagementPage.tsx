import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardSectionNav from '../components/DashboardSectionNav';
import { useAuth } from '../context/AuthContext';
import { listAdminAnnouncements } from '../features/bulletin/api/bulletin';
import { categoryLabels, formatBulletinDate } from '../features/bulletin/model/presentation';
import type { AnnouncementStatus } from '../features/bulletin/model/types';
import { canEditAnnouncement } from '../features/bulletin/model/permissions';
import { useRemoteData } from '../hooks/useRemoteData';

const statuses: Array<{ value: AnnouncementStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function BulletinManagementPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const statusParam = params.get('status');
  const status = (statusParam === 'draft' || statusParam === 'published' || statusParam === 'archived') ? statusParam : undefined;
  const search = params.get('search')?.trim() || undefined;
  const [searchText, setSearchText] = useState(search ?? '');
  const load = useCallback(
    (signal: AbortSignal) => listAdminAnnouncements({ page, limit: 20, status, search }, signal),
    [page, status, search],
  );
  const list = useRemoteData(load);

  function updateParams(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">Publishing workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Nexium Bulletin</h1>
            <p className="text-sm text-muted mt-2">Prepare, review and publish permanent student updates.</p>
          </div>
          <Link to="/dashboard/bulletin/new" className="btn-primary">Create announcement</Link>
        </div>

        <DashboardSectionNav active="bulletin" />

        <div className="card-base p-3 mb-5">
          <div className="flex gap-1 overflow-x-auto mb-3" aria-label="Announcement status">
            {statuses.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => updateParams({ status: item.value || undefined })}
                className={`btn-ghost whitespace-nowrap ${status === (item.value || undefined) ? 'bg-surface-2 text-[color:var(--nx-text)]' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); updateParams({ search: searchText.trim() || undefined }); }} className="flex gap-2">
            <label htmlFor="admin-bulletin-search" className="sr-only">Search announcements</label>
            <input id="admin-bulletin-search" className="input-base" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search announcements" />
            <button type="submit" className="btn-secondary">Search</button>
          </form>
        </div>

        {list.data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="card-base p-4"><p className="text-xs text-dim uppercase tracking-wider">Matching</p><p className="text-2xl font-semibold mt-1">{list.data.total}</p></div>
            <div className="card-base p-4"><p className="text-xs text-dim uppercase tracking-wider">On this page</p><p className="text-2xl font-semibold mt-1">{list.data.announcements.length}</p></div>
            <div className="card-base p-4 col-span-2 sm:col-span-1"><p className="text-xs text-dim uppercase tracking-wider">View</p><p className="text-sm font-semibold mt-2 capitalize">{status ?? 'All statuses'}</p></div>
          </div>
        )}

        {list.error ? (
          <div role="alert" className="alert-danger">Announcements could not be loaded. <button type="button" className="underline font-semibold" onClick={() => void list.refresh()}>Try again</button></div>
        ) : list.loading && !list.data ? (
          <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="card-base h-32 animate-pulse" />)}</div>
        ) : !list.data?.announcements.length ? (
          <div className="card-base p-10 text-center"><h2 className="text-lg font-semibold">No announcements found</h2><p className="text-sm text-muted mt-2">Create a draft or change the current filters.</p></div>
        ) : (
          <div className="space-y-3">
            {list.data.announcements.map((announcement) => (
              <article key={announcement.id} className="card-base p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`badge ${announcement.status === 'published' ? 'badge-success' : announcement.status === 'draft' ? 'badge-accent' : ''}`}>{announcement.status}</span>
                      <span className="badge">{categoryLabels[announcement.category]}</span>
                      {announcement.priority !== 'normal' && <span className={announcement.priority === 'urgent' ? 'badge badge-danger' : 'badge badge-accent'}>{announcement.priority}</span>}
                      {announcement.isPinned && <span className="badge">Pinned</span>}
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">{announcement.title}</h2>
                    <p className="text-sm text-muted mt-1">{announcement.summary}</p>
                    <p className="text-xs text-dim mt-3">Updated by {announcement.updater.name} · {formatBulletinDate(announcement.updatedAt)}{announcement.status === 'published' ? ` · ${announcement.readCount} readers` : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {announcement.status === 'published' && <Link to={`/student/news/${announcement.slug}`} className="btn-ghost" target="_blank" rel="noreferrer">View</Link>}
                    <Link to={`/dashboard/bulletin/${announcement.id}`} className="btn-secondary !py-2">
                      {canEditAnnouncement(user, {
                        createdBy: announcement.creator.id,
                        category: announcement.category,
                        status: announcement.status,
                      }) ? 'Edit' : 'View'}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {list.data && list.data.totalPages > 1 && (
          <nav aria-label="Announcement management pages" className="flex justify-center items-center gap-3 mt-7">
            <button type="button" className="btn-secondary !py-2" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>Previous</button>
            <span className="text-sm text-muted">Page {page} of {list.data.totalPages}</span>
            <button type="button" className="btn-secondary !py-2" disabled={page >= list.data.totalPages} onClick={() => updateParams({ page: String(page + 1) })}>Next</button>
          </nav>
        )}
      </main>
    </div>
  );
}
