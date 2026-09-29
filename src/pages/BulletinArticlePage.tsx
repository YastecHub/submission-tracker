import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AnnouncementContent from '../features/bulletin/components/AnnouncementContent';
import PriorityBadge from '../features/bulletin/components/PriorityBadge';
import { getBulletinArticle, markBulletinArticleRead } from '../features/bulletin/api/bulletin';
import { categoryLabels, formatBulletinDateTime, sourceTypeLabels } from '../features/bulletin/model/presentation';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { useToast } from '../context/ToastContext';

function formatNaira(amount: string) {
  const value = Number(amount);
  return Number.isFinite(value) ? value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) : `₦${amount}`;
}

export default function BulletinArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { token } = useStudentAuth();
  const { toast } = useToast();
  const load = useCallback((signal: AbortSignal) => getBulletinArticle(slug, token!, signal), [slug, token]);
  const article = useRemoteData(load, 0, Boolean(token && slug));

  useEffect(() => {
    if (!article.data?.isUnread || !token) return;
    let active = true;
    markBulletinArticleRead(article.data.id, token)
      .then(() => { if (active) window.dispatchEvent(new Event('bulletin:read')); })
      .catch(() => {});
    return () => { active = false; };
  }, [article.data?.id, article.data?.isUnread, article.data?.version, token]);

  async function shareArticle() {
    const url = window.location.href;
    const usesNativeShare = typeof navigator.share === 'function';
    try {
      if (usesNativeShare) await navigator.share({ title: article.data?.title, url });
      else await navigator.clipboard.writeText(url);
      toast(usesNativeShare ? 'Share options opened.' : 'Link copied.', 'success');
    } catch {
      // Closing the native share sheet is not an error the student needs to see.
    }
  }

  if (article.loading && !article.data) return <main className="max-w-3xl mx-auto px-4 py-10"><div className="card-base h-80 animate-pulse" /></main>;
  if (article.error || !article.data) {
    return <main className="max-w-3xl mx-auto px-4 py-10"><div role="alert" className="alert-danger">This announcement could not be found or loaded.</div><Link to="/student/news" className="btn-secondary mt-4">Back to Bulletin</Link></main>;
  }

  const data = article.data;
  const wasUpdated = new Date(data.updatedAt).getTime() - new Date(data.publishedAt).getTime() > 60_000;
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <Link to="/student/news" className="btn-ghost !px-0 mb-5">← Back to Nexium Bulletin</Link>
      <article>
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge">{categoryLabels[data.category]}</span>
            <PriorityBadge priority={data.priority} />
            {data.isPinned && <span className="badge">Pinned</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">{data.title}</h1>
          <p className="text-lg text-muted leading-8 mt-4">{data.summary}</p>
          <div className="mt-5 text-sm text-dim space-y-1">
            <p>Published {formatBulletinDateTime(data.publishedAt)}{data.publisher ? ` by ${data.publisher.name}` : ''}</p>
            {wasUpdated && <p className="text-accent">Updated {formatBulletinDateTime(data.updatedAt)}</p>}
            <p>{sourceTypeLabels[data.sourceType]}</p>
          </div>
          {data.contributorName && (
            <div className="card-base p-4 mt-5">
              <p className="text-xs uppercase tracking-wider text-dim">Contributor</p>
              <p className="font-medium mt-1">{data.contributorName}</p>
              {data.contributorCredit && <p className="text-sm text-muted mt-1">{data.contributorCredit}</p>}
            </div>
          )}
        </header>

        {wasUpdated && <div className="badge badge-accent mb-6">This announcement has been updated since publication</div>}

        <AnnouncementContent document={data.content} media={data.media} />

        {data.paymentEvent && (
          <aside className="card-base p-5 mt-10 border-[color:var(--nx-accent)]" aria-labelledby="related-payment-heading">
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">Official payment details</p>
            <h2 id="related-payment-heading" className="text-xl font-semibold mt-2">{data.paymentEvent.title}</h2>
            <p className="text-2xl font-semibold mt-3">{formatNaira(data.paymentEvent.amount)}</p>
            <p className="text-sm text-muted mt-2">Deadline: {formatBulletinDateTime(data.paymentEvent.deadline)}</p>
            <Link to={`/payment/${data.paymentEvent.slug}`} className="btn-primary mt-5">
              {data.paymentEvent.isClosed ? 'View payment details' : 'Open payment page'}
            </Link>
          </aside>
        )}

        <footer className="border-t border-nx mt-10 pt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void shareArticle()} className="btn-secondary">Share announcement</button>
          <Link to="/student/news" className="btn-ghost">Browse more updates</Link>
        </footer>
      </article>
    </main>
  );
}
