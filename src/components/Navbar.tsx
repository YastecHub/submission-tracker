import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout(): void {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  async function handleEnableNotifications(): Promise<void> {
    setMenuOpen(false);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast('Push notifications are not supported in this browser', 'error');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      toast('Push notifications are not configured', 'error');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('Notification permission denied', 'error');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      await api.post('/api/auth/push-subscription', { subscription });
      toast('Notifications enabled!', 'success');
    } catch (err) {
      console.error('Push setup failed:', err);
      toast('Failed to enable notifications', 'error');
    }
  }

  const roleLabel =
    user?.role === 'acr' ? 'Asst. CR' : user?.role === 'dev' ? 'Developer' : 'Class Rep';

  const roleLongLabel =
    user?.role === 'acr'
      ? 'Assistant Class Rep'
      : user?.role === 'dev'
      ? 'Developer'
      : 'Class Representative';

  return (
    <nav className="bg-surface border-b border-nx px-4 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="text-base font-semibold tracking-tight flex items-center gap-2">
        <img src="/icon.svg" alt="" className="w-7 h-7 rounded-md" />
        NEXIUM
      </Link>

      {user && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-surface-2 border border-nx flex items-center justify-center font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted">{roleLabel}</span>
            </div>
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 card-base z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-nx">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
                <span className="badge badge-accent mt-2">{roleLongLabel}</span>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Edit profile & password
                </Link>

                <button
                  onClick={handleEnableNotifications}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Enable notifications
                </button>

                <div className="border-t border-nx mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-danger hover:bg-surface-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
