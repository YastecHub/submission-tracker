import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../../context/StudentAuthContext';
import { getBulletinUnreadCount } from '../api/bulletin';

const navItems = [
  { to: '/student', label: 'Home', end: true },
  { to: '/student/news', label: 'Bulletin', end: false },
  { to: '/student/tickets', label: 'Tickets', end: false },
  { to: '/transparency', label: 'Transparency', end: false },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `min-h-11 inline-flex items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-[color:var(--nx-accent-soft)] text-accent' : 'text-muted hover:text-[color:var(--nx-text)] hover:bg-surface-2'
  }`;
}

export default function StudentShell({ children }: { children?: ReactNode }) {
  const { student, token, logout } = useStudentAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const firstName = student?.fullName.trim().split(/\s+/)[0] || 'Student';

  const loadUnread = useCallback(() => {
    if (!token) return;
    const controller = new AbortController();
    getBulletinUnreadCount(token, controller.signal).then(setUnreadCount).catch(() => {});
    return () => controller.abort();
  }, [token]);

  useEffect(() => loadUnread(), [loadUnread]);
  useEffect(() => {
    const refresh = () => { loadUnread(); };
    window.addEventListener('bulletin:read', refresh);
    return () => window.removeEventListener('bulletin:read', refresh);
  }, [loadUnread]);

  function signOut() {
    logout();
    navigate('/student/login');
  }

  return (
    <div className="page-base pb-24 md:pb-0">
      <header className="sticky top-0 z-40 bg-[color:rgba(9,9,11,0.94)] backdrop-blur border-b border-nx">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2 lg:gap-4">
          <Link to="/student" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
            <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg" />
            <span className="hidden lg:inline">NEXIUM</span>
          </Link>

          <nav aria-label="Student navigation" className="hidden md:flex flex-1 items-center justify-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
                {item.to === '/student/news' && unreadCount > 0 && (
                  <span className="ml-2 badge badge-accent" aria-label={`${unreadCount} unread`}>{unreadCount}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <details className="relative shrink-0 group">
            <summary className="list-none min-h-11 flex items-center gap-2 rounded-lg px-2 sm:px-3 cursor-pointer text-right hover:bg-surface-2 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate max-w-28">{firstName}</span>
                <span className="block text-xs text-dim">{student?.matricNumber}</span>
              </span>
              <svg className="w-4 h-4 text-dim transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-64 card-base p-3 shadow-xl">
              <p className="text-sm font-semibold truncate">{student?.fullName}</p>
              <p className="text-xs text-muted mt-1">{student?.matricNumber}</p>
              <p className="text-xs text-dim mt-1 truncate">{student?.email}</p>
              <div className="divider my-3" />
              <button type="button" onClick={signOut} className="btn-ghost text-danger w-full justify-start">Sign out</button>
            </div>
          </details>
        </div>
      </header>

      {children ?? <Outlet />}

      <nav
        aria-label="Student mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[color:rgba(24,24,27,0.97)] backdrop-blur border-t border-nx px-2 py-2 grid grid-cols-4"
      >
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${navClass({ isActive })} !px-1 flex-col gap-0.5`}>
            <span>{item.label}</span>
            {item.to === '/student/news' && unreadCount > 0 && <span className="text-[10px] text-accent">{unreadCount} new</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
