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

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  async function handleEnableNotifications(): Promise<void> {
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

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow">
      <Link to="/dashboard" className="text-lg font-bold tracking-tight">
        SubmitIt
      </Link>
      {user && (
        <div className="flex items-center gap-3">
          <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-sm font-medium">{user.name}</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${user.role === 'acr' ? 'bg-purple-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                {user.role === 'acr' ? 'Asst. CR' : 'Class Rep'}
              </span>
            </div>
          </Link>
          <button
            onClick={handleEnableNotifications}
            title="Enable push notifications"
            className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="hidden sm:inline">Notifications</span>
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
