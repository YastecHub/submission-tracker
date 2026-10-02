import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnnouncementCard from '../features/bulletin/components/AnnouncementCard';
import { useBulletinFeed } from '../features/bulletin/hooks/useBulletinFeed';
import { categoryLabels } from '../features/bulletin/model/presentation';
import type { AnnouncementCategory } from '../features/bulletin/model/types';
import { useStudentAuth } from '../context/StudentAuthContext';

const categories: AnnouncementCategory[] = ['general', 'academic', 'practical', 'finance', 'event', 'opportunity', 'emergency'];

export default function BulletinFeedPage() {
  const { token } = useStudentAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const categoryValue = params.get('category');
  const category = categories.includes(categoryValue as AnnouncementCategory) ? categoryValue as AnnouncementCategory : undefined;
  const importantOnly = params.get('priority') === 'important';
  const unreadOnly = params.get('unread') === 'true';
  const search = params.get('search')?.trim() || undefined;
  const [searchText, setSearchText] = useState(search ?? '');
  const [offline, setOffline] = useState(false);
  const feed = useBulletinFeed({ page, limit: 12, category, priority: importantOnly ? 'important' : undefined, search }, token);
  const announcements = (feed.data?.announcements ?? []).filter((item) => !unreadOnly || item.isUnread);

  useEffect(() => {
    const updateOnline = () => setOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  function updateParam(name: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParam('search', searchText.trim() || undefined);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-7 flex flex-wrap items-baseline gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">Permanent class updates</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Nexium Bulletin</h1>
          <p className="text-sm text-muted mt-2">Search announcements, guides, finance updates and opportunities.</p>
        </div>
        {offline && <span className="badge self-end" style={{ background: 'var(--nx-warning-bg)', color: 'var(--nx-warning)' }}>Offline - cached</span>}
      </div>

      <form onSubmit={submitSearch} role="search" className="flex gap-2 mb-4">
        <label htmlFor="bulletin-search" className="sr-only">Search Nexium Bulletin</label>
        <input id="bulletin-search" value={searchText} onChange={(event) => setSearchText(event.target.value)} className="input-base" placeholder="Search titles, summaries or contributors" />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Announcement filters">
        <button type="button" onClick={() => { const next = new URLSearchParams(); if (search) next.set('search', search); setParams(next); }} className={`shrink-0 btn-ghost whitespace-nowrap ${!category && !importantOnly && !unreadOnly ? 'bg-surface-2 text-[color:var(--nx-text)]' : ''}`}>All</button>
        <button type="button" onClick={() => updateParam('unread', unreadOnly ? undefined : 'true')} className={`shrink-0 btn-ghost whitespace-nowrap ${unreadOnly ? 'bg-surface-2 text-[color:var(--nx-text)]' : ''}`}>Unread</button>
        <button type="button" onClick={() => updateParam('priority', importantOnly ? undefined : 'important')} className={`shrink-0 btn-ghost whitespace-nowrap ${importantOnly ? 'bg-surface-2 text-[color:var(--nx-text)]' : ''}`}>Important</button>
        {categories.map((item) => (
          <button key={item} type="button" onClick={() => updateParam('category', category === item ? undefined : item)} className={`shrink-0 btn-ghost whitespace-nowrap ${category === item ? 'bg-surface-2 text-[color:var(--nx-text)]' : ''}`}>
            {categoryLabels[item]}
          </button>
        ))}
      </div>

      {unreadOnly && feed.data && announcements.length !== feed.data.announcements.length && (
        <p className="text-xs text-dim mb-4">Showing unread announcements on this page.</p>
      )}

      {feed.error ? (
        <div role="alert" className="alert-danger">We couldn&apos;t load the Bulletin. <button type="button" onClick={() => void feed.refresh()} className="underline font-semibold">Try again</button></div>
      ) : feed.loading && !feed.data ? (
        <div className="grid sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map((item) => <div key={item} className="card-base h-56 animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="card-base p-10 text-center">
          <h2 className="text-lg font-semibold">Nothing found</h2>
          <p className="text-sm text-muted mt-2">Try another search or clear a filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {announcements.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
        </div>
      )}

      {feed.data && feed.data.totalPages > 1 && (
        <nav aria-label="Bulletin pages" className="flex justify-center items-center gap-3 mt-8">
          <button type="button" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="btn-secondary !py-2">Previous</button>
          <span className="text-sm text-muted">Page {page} of {feed.data.totalPages}</span>
          <button type="button" disabled={page >= feed.data.totalPages} onClick={() => updateParam('page', String(page + 1))} className="btn-secondary !py-2">Next</button>
        </nav>
      )}
    </main>
  );
}
