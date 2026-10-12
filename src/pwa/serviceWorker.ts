import api from '../api/axios';

/** Origin of the API (Heroku). The service worker caches student reads from it for offline use. */
export const API_ORIGIN = new URL(api.defaults.baseURL ?? 'http://localhost:3001', window.location.href).origin;

const SUPPORTED = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
// The service worker caches aggressively, so it is only used in production builds.
const ENABLED = SUPPORTED && !import.meta.env.DEV;

/** A new URL per build makes the browser install the new worker after every deploy. */
export function serviceWorkerUrl(): string {
  return `/sw.js?v=${encodeURIComponent(__BUILD_ID__)}&api=${encodeURIComponent(API_ORIGIN)}`;
}

export function apiUrl(path: string): string {
  return `${API_ORIGIN}${path}`;
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the service worker once and returns the registration (null in dev or unsupported browsers). */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!ENABLED) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register(serviceWorkerUrl()).catch(() => null);
  return registration;
}

/** Resolves to the active registration, or null when there is no service worker (dev, unsupported). */
export async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const registered = await registerServiceWorker();
  if (!registered) return null;
  return navigator.serviceWorker.ready;
}

export type ServiceWorkerMessage =
  | { type: 'queue-acknowledge'; url: string; token: string; announcementId: string }
  | { type: 'flush-queue' }
  | { type: 'clear-student-cache' };

export async function postToServiceWorker(message: ServiceWorkerMessage): Promise<boolean> {
  if (!ENABLED) return false;
  const active = navigator.serviceWorker.controller ?? (await getActiveServiceWorker())?.active;
  if (!active) return false;
  active.postMessage(message);
  return true;
}

/** Registers the worker, keeps it up to date and flushes queued offline actions when back online. */
export function startServiceWorker(): void {
  if (!ENABLED) return;
  window.addEventListener('load', async () => {
    const reg = await registerServiceWorker();
    if (!reg) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
    });
    setInterval(() => { void reg.update().catch(() => undefined); }, 30 * 60 * 1000);
    void postToServiceWorker({ type: 'flush-queue' });
  });
  window.addEventListener('online', () => { void postToServiceWorker({ type: 'flush-queue' }); });
}
