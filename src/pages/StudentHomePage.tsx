import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import AnnouncementCard from '../features/bulletin/components/AnnouncementCard';
import { useBulletinFeed } from '../features/bulletin/hooks/useBulletinFeed';

export default function StudentHomePage() {
  const { student, token } = useStudentAuth();
  const feed = useBulletinFeed({ page: 1, limit: 6 }, token);
  const announcements = feed.data?.announcements ?? [];
  const urgent = announcements.filter((item) => item.priority === 'urgent');
  const latest = announcements.filter((item) => item.priority !== 'urgent').slice(0, 4);
  const firstName = student?.fullName.split(/\s+/)[0] ?? 'Student';

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <section className="mb-8">
        <p className="text-xs uppercase tracking-wider text-accent font-semibold">Student home</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome, {firstName}</h1>
            <p className="text-sm text-muted mt-2">Important class information now has one permanent home.</p>
          </div>
          {feed.data && (
            <Link to="/student/news" className="btn-secondary !py-2 w-full sm:w-auto text-center justify-center">
              Open Nexium Bulletin
            </Link>
          )}
        </div>
      </section>

      {feed.error ? (
        <div role="alert" className="alert-danger mb-8">
          We couldn&apos;t load Nexium Bulletin. <button type="button" className="underline font-semibold" onClick={() => void feed.refresh()}>Try again</button>
        </div>
      ) : feed.loading && !feed.data ? (
        <div className="grid sm:grid-cols-2 gap-4 mb-8" aria-label="Loading announcements">
          {[0, 1].map((item) => <div key={item} className="card-base h-52 animate-pulse bg-surface" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="card-base p-6 sm:p-8 text-center mb-8">
          <h2 className="text-lg font-semibold">No announcements yet</h2>
          <p className="text-sm text-muted mt-2">New class updates will appear here after they are published.</p>
        </div>
      ) : (
        <>
          {urgent.length > 0 && (
            <section aria-labelledby="urgent-heading" className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[color:var(--nx-danger)]" />
                <h2 id="urgent-heading" className="text-xl font-semibold tracking-tight">Urgent updates</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {urgent.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
              </div>
            </section>
          )}

          {latest.length > 0 && (
            <section aria-labelledby="latest-heading" className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 id="latest-heading" className="text-xl font-semibold tracking-tight">Latest from the Bulletin</h2>
                <Link to="/student/news" className="text-sm text-accent font-medium min-h-11 inline-flex items-center">View all</Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {latest.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
              </div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-xl font-semibold tracking-tight mb-4">Quick actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="/student/news" className="card-interactive p-4 sm:p-5 min-h-24 sm:min-h-28 flex flex-col justify-between">
            <span className="font-semibold">Nexium Bulletin</span><span className="text-sm text-muted">Browse every class update →</span>
          </Link>
          <Link to="/student/tickets" className="card-interactive p-4 sm:p-5 min-h-24 sm:min-h-28 flex flex-col justify-between">
            <span className="font-semibold">My tickets</span><span className="text-sm text-muted">View confirmed collection tickets →</span>
          </Link>
          <Link to="/transparency" className="card-interactive p-4 sm:p-5 min-h-24 sm:min-h-28 flex flex-col justify-between">
            <span className="font-semibold">Class transparency</span><span className="text-sm text-muted">Review the class ledger →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
