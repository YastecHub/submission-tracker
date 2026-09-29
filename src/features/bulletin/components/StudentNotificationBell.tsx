import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import {
  deleteStudentPushSubscription,
  getStudentPushConfig,
  getStudentPushSubscriptionStatus,
  saveStudentPushSubscription,
} from '../api/bulletin';

type PushState = 'loading' | 'unsupported' | 'unconfigured' | 'disabled' | 'enabled' | 'denied';

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const decoded = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function supportsPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export default function StudentNotificationBell({ unreadCount, token }: { unreadCount: number; token: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<PushState>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supportsPush()) { setState('unsupported'); return; }
      try {
        const config = await getStudentPushConfig(token);
        if (!active) return;
        setPublicKey(config.publicKey);
        if (!config.configured || !config.publicKey) { setState('unconfigured'); return; }
        if (Notification.permission === 'denied') { setState('denied'); return; }
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) { if (active) setState('disabled'); return; }
        const status = await getStudentPushSubscriptionStatus(subscription.endpoint, token);
        if (active) setState(status.subscribed ? 'enabled' : 'disabled');
      } catch {
        if (active) setState('disabled');
      }
    }
    void load();
    return () => { active = false; };
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
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await deleteStudentPushSubscription(subscription.endpoint, token);
      setState('disabled');
      toast('Bulletin notifications disabled on this device.', 'success');
    } catch {
      toast('Notifications could not be changed right now.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="relative shrink-0 group">
      <summary className="list-none min-h-11 min-w-11 flex items-center justify-center rounded-lg cursor-pointer hover:bg-surface-2 transition-colors [&::-webkit-details-marker]:hidden" aria-label={unreadCount > 0 ? `${unreadCount} unread announcements` : 'Bulletin notifications'}>
        <span className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h11zm0 0v1a3 3 0 11-6 0v-1h6z" /></svg>
          {unreadCount > 0 && <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 rounded-full bg-[color:var(--nx-accent)] text-black text-[10px] font-bold flex items-center justify-center">{Math.min(unreadCount, 99)}</span>}
        </span>
      </summary>
      <div className="absolute right-0 mt-2 w-72 card-base p-4 shadow-xl">
        <p className="font-semibold">Bulletin notifications</p>
        <p className="text-sm text-muted mt-1">{unreadCount > 0 ? `${unreadCount} unread announcement${unreadCount === 1 ? '' : 's'}.` : 'You are all caught up.'}</p>
        <Link to="/student/news" className="btn-secondary w-full mt-3">Open Bulletin</Link>
        <div className="divider my-3" />
        {state === 'enabled' && <button type="button" className="btn-ghost w-full" disabled={busy} onClick={() => void disable()}>{busy ? 'Updating…' : 'Disable push notifications'}</button>}
        {state === 'disabled' && <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void enable()}>{busy ? 'Enabling…' : 'Enable push notifications'}</button>}
        {state === 'loading' && <p className="text-sm text-dim">Checking this device…</p>}
        {state === 'denied' && <p className="text-sm text-dim">Notifications are blocked in this browser’s settings.</p>}
        {state === 'unsupported' && <p className="text-sm text-dim">This browser does not support push notifications.</p>}
        {state === 'unconfigured' && <p className="text-sm text-dim">Push notifications are not available yet.</p>}
      </div>
    </details>
  );
}
