import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import {
  deleteStudentPushSubscription,
  getStudentPushConfig,
  getStudentPushSubscriptionStatus,
  saveStudentPushSubscription,
  sendStudentTestPush,
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

/** iPhone/iPad only allow notifications for apps added to the Home Screen. */
function isIosBrowserTab(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}

function supportsPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export default function StudentNotificationBell({ unreadCount, token }: { unreadCount: number; token: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<PushState>('loading');
  const iosTab = isIosBrowserTab();
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
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      await saveStudentPushSubscription(subscription.toJSON(), token);
      setState('enabled');
      try {
        await sendStudentTestPush(subscription.endpoint, token);
        toast('Notifications are on. We just sent a test notification to this device.', 'success');
      } catch (error) {
        toast(`Notifications are on, but the test didn't arrive: ${apiError(error, 'please try "Send a test notification".')}`, 'info');
      }
    } catch {
      toast('Notifications could not be turned on right now.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (busy) return;
    setBusy(true);
    try {
      const registration = await getActiveServiceWorker();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setState('disabled');
        toast('Notifications are off on this device. Turn them on first.', 'info');
        return;
      }
      await sendStudentTestPush(subscription.endpoint, token);
      toast('Test sent. It should appear on this device in a few seconds.', 'success');
    } catch (error) {
      toast(apiError(error, 'The test notification could not be sent right now.'), 'error');
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
      if (subscription) await deleteStudentPushSubscription(subscription.endpoint, token);
      setState('disabled');
      toast('Notifications turned off on this device.', 'success');
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
        aria-label={unreadCount > 0 ? `${unreadCount} unread announcements` : 'Notifications'}
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
        aria-label="Notifications"
        className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] card-base p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-1"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Notifications</p>
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
          <>
            <p className="text-xs text-emerald-400 mb-2">On for this device: Bulletin posts and election updates (voting open, reminders, results).</p>
            <button
              type="button"
              className="btn-secondary w-full text-xs !py-2 mb-1"
              disabled={busy}
              onClick={() => void sendTest()}
            >
              {busy ? 'Sending…' : 'Send a test notification'}
            </button>
          </>
        )}
        {state === 'enabled' && (
          <button
            type="button"
            className="btn-ghost w-full text-xs text-danger hover:bg-danger-soft"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? 'Updating…' : 'Turn off notifications'}
          </button>
        )}
        {state === 'disabled' && (
          <p className="text-xs text-muted mb-2">Get a ping on this phone for Bulletin posts and election updates, like any other app.</p>
        )}
        {state === 'disabled' && (
          <button
            type="button"
            className="btn-primary w-full text-xs !py-2"
            disabled={busy}
            onClick={() => void enable()}
          >
            {busy ? 'Turning on…' : 'Turn on notifications'}
          </button>
        )}
        {state === 'loading' && <p className="text-xs text-dim">Checking this device…</p>}
        {state === 'denied' && (
          <p className="text-xs text-dim">Notifications are blocked for NEXIUM. Allow them in your browser&apos;s site settings (tap the lock or ⓘ next to the address), then come back.</p>
        )}
        {state === 'unsupported' && (
          <p className="text-xs text-dim">
            {iosTab
              ? 'On iPhone: tap Share, then "Add to Home Screen". Open NEXIUM from the Home Screen icon and turn notifications on here.'
              : "This browser can't show notifications. Try Chrome on Android, or add NEXIUM to your Home Screen on iPhone."}
          </p>
        )}
        {state === 'unconfigured' && (
          <p className="text-xs text-dim">Notifications aren&apos;t switched on for NEXIUM yet.</p>
        )}
      </div>
    </details>
  );
}
