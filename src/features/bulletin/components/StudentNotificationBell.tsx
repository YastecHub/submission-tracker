import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import {
  deleteStudentPushSubscription,
  getStudentPushConfig,
  getStudentPushSubscriptionStatus,
  saveStudentPushSubscription,
} from '../api/bulletin';
import { getActiveServiceWorker } from '../../../pwa/serviceWorker';

type PushState = 'loading' | 'unsupported' | 'unconfigured' | 'disabled' | 'enabled' | 'denied';

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const decoded = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function keysMatch(keyBuffer: ArrayBuffer | null | undefined, expectedKeyBase64: string): boolean {
  if (!keyBuffer) return false;
  try {
    const expectedBytes = urlBase64ToUint8Array(expectedKeyBase64);
    const actualBytes = new Uint8Array(keyBuffer);
    if (actualBytes.length !== expectedBytes.length) return false;
    for (let i = 0; i < actualBytes.length; i++) {
      if (actualBytes[i] !== expectedBytes[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function supportsPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export default function StudentNotificationBell({ unreadCount, token }: { unreadCount: number; token: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<PushState>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (detailsRef.current?.open && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supportsPush()) {
        if (active) setState('unsupported');
        return;
      }
      try {
        const config = await getStudentPushConfig(token);
        if (!active) return;
        setPublicKey(config.publicKey);
        if (!config.configured || !config.publicKey) {
          setState('unconfigured');
          return;
        }
        if (Notification.permission === 'denied') {
          setState('denied');
          return;
        }
        const registration = await getActiveServiceWorker();
        if (!registration) {
          if (active) setState('unsupported');
          return;
        }
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          if (active) setState('disabled');
          return;
        }
        if (!keysMatch(subscription.options?.applicationServerKey, config.publicKey)) {
          await subscription.unsubscribe().catch(() => {});
          if (active) setState('disabled');
          return;
        }
        const status = await getStudentPushSubscriptionStatus(subscription.endpoint, token);
        if (active) setState(status.subscribed ? 'enabled' : 'disabled');
      } catch {
        if (active) setState('disabled');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  async function enable() {
    if (!publicKey || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        toast('Notifications remain off. You can change this in your browser settings.', 'info');
        return;
      }
      const registration = await getActiveServiceWorker();
      if (!registration) throw new Error('Service worker unavailable');
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !keysMatch(subscription.options?.applicationServerKey, publicKey)) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await saveStudentPushSubscription(subscription.toJSON(), token);
      setState('enabled');
      toast('Bulletin notifications enabled.', 'success');
    } catch {
      toast('Notifications could not be enabled right now.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    try {
      const registration = await getActiveServiceWorker();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deleteStudentPushSubscription(subscription.endpoint, token).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
      setState('disabled');
      toast('Bulletin notifications disabled on this device.', 'success');
    } catch {
      toast('Notifications could not be changed right now.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const closeDropdown = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details ref={detailsRef} className="relative shrink-0 group">
      <summary
        className="list-none min-h-11 min-w-11 flex items-center justify-center rounded-lg cursor-pointer hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none [&::-webkit-details-marker]:hidden"
        aria-label={unreadCount > 0 ? `${unreadCount} unread announcements` : 'Bulletin notifications'}
        aria-haspopup="dialog"
      >
        <span className="relative">
          <svg className="w-5 h-5 text-muted group-hover:text-default transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h11zm0 0v1a3 3 0 11-6 0v-1h6z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 rounded-full bg-[color:var(--nx-accent)] text-black text-[10px] font-bold flex items-center justify-center shadow-sm">
              {Math.min(unreadCount, 99)}
            </span>
          )}
        </span>
      </summary>
      <div
        role="dialog"
        aria-label="Bulletin notifications"
        className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] card-base p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-1"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Bulletin notifications</p>
          {unreadCount > 0 && (
            <span className="badge badge-accent text-xs">
              {unreadCount} new
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-1">
          {unreadCount > 0
            ? `${unreadCount} unread announcement${unreadCount === 1 ? '' : 's'}.`
            : 'You are all caught up.'}
        </p>
        <Link
          to="/student/news"
          onClick={closeDropdown}
          className="btn-secondary w-full mt-3 text-center !py-2 text-xs"
        >
          Open Bulletin
        </Link>
        <div className="divider my-3" />
        {state === 'enabled' && (
          <button
            type="button"
            className="btn-ghost w-full text-xs text-danger hover:bg-danger-soft"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? 'Updating…' : 'Disable push notifications'}
          </button>
        )}
        {state === 'disabled' && (
          <button
            type="button"
            className="btn-primary w-full text-xs !py-2"
            disabled={busy}
            onClick={() => void enable()}
          >
            {busy ? 'Enabling…' : 'Enable push notifications'}
          </button>
        )}
        {state === 'loading' && <p className="text-xs text-dim">Checking this device…</p>}
        {state === 'denied' && (
          <p className="text-xs text-dim">Notifications are blocked in this browser’s site settings.</p>
        )}
        {state === 'unsupported' && (
          <div className="text-xs text-muted space-y-1.5 p-2.5 rounded bg-surface-2 border border-nx text-left">
            <p className="font-semibold text-default flex items-center gap-1.5">
              <span>📱</span> iPhone / iPad Setup
            </p>
            <p className="leading-relaxed">
              On iOS, Apple requires NEXIUM to be added to your home screen before notifications can be turned on:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-dim">
              <li>Tap <strong>Share</strong> (📤) at the bottom of Safari</li>
              <li>Select <strong>&ldquo;Add to Home Screen&rdquo;</strong> (➕)</li>
              <li>Open NEXIUM from your home screen and turn notifications on here</li>
            </ol>
          </div>
        )}
        {state === 'unconfigured' && (
          <p className="text-xs text-dim">Push notifications are not available yet.</p>
        )}
      </div>
    </details>
  );
}
