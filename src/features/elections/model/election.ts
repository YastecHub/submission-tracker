import axios from 'axios';
import type { BallotChoice, ElectionStatus } from './types';

const LAGOS = 'Africa/Lagos';

/** "Fri 16 Oct, 9:00 am" in Lagos time, whatever the phone's timezone. */
export function formatLagos(iso: string | Date, withDay = true): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: LAGOS,
    ...(withDay ? { weekday: 'short', day: 'numeric', month: 'short' } : {}),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: LAGOS, hour: 'numeric', minute: '2-digit', hour12: true });
}

/** "2h 05m", "4m 09s" – for countdowns. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export const STATUS_LABEL: Record<ElectionStatus, string> = {
  draft: 'In setup',
  ready: 'Opens soon',
  open: 'Voting open',
  paused: 'Paused',
  closed: 'Voting closed',
  published: 'Results out',
};

export const STATUS_TONE: Record<ElectionStatus, string> = {
  draft: 'badge',
  ready: 'badge',
  open: 'badge-success',
  paused: 'badge-accent',
  closed: 'badge',
  published: 'badge-accent',
};

export function turnoutPercent(voted: number, eligible: number): number {
  return eligible ? Math.round((voted / eligible) * 100) : 0;
}

/** Same letters as the server checks: no I, L, O or U, so a receipt is easy to read back. */
const RECEIPT_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newReceiptCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => RECEIPT_ALPHABET[byte % 32]).join('');
}

export function formatReceipt(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---- Ballot kept on the device (so a refresh never loses picks or a submission) ----

export interface StoredBallot {
  choices: Record<string, BallotChoice>;
  /** Set when "Submit" was pressed: a retry re-sends the same ids, so it can't count twice. */
  submission?: { requestId: string; receiptCode: string; choices: BallotChoice[] };
  /** Set once the server confirmed the vote. */
  receipt?: { code: string; votedAt: string };
}

const key = (studentId: string, electionId: string) => `nexium:ballot:v1:${studentId}:${electionId}`;

export function loadBallot(studentId: string, electionId: string): StoredBallot {
  try {
    const raw = localStorage.getItem(key(studentId, electionId));
    if (raw) return JSON.parse(raw) as StoredBallot;
  } catch {
    // Private mode or corrupt data: start empty.
  }
  return { choices: {} };
}

export function saveBallot(studentId: string, electionId: string, ballot: StoredBallot): void {
  try {
    localStorage.setItem(key(studentId, electionId), JSON.stringify(ballot));
  } catch {
    // Not fatal: the ballot just won't survive a refresh.
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return error.code === 'ECONNABORTED' ? 'The connection timed out.' : 'You appear to be offline.';
    const message = (error.response.data as { error?: unknown } | undefined)?.error;
    if (typeof message === 'string') return message;
    if (error.response.status === 429) return 'Too many attempts. Wait a minute and try again.';
  }
  return fallback;
}

/** Has the network (not the server) failed? Then a retry is safe and expected. */
export function isNetworkFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
}

/** ISO time -> value for <input type="datetime-local"> (the device's local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function staffToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}
