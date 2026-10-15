import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from '../../../pwa/serviceWorker';
import type { LiveUpdate } from '../model/types';

type Listener = {
  onUpdate?: (update: LiveUpdate) => void;
  onVoted?: (event: { electionId: string; votedAt: string }) => void;
  onRemoved?: (event: { electionId: string }) => void;
  onConnection?: (connected: boolean) => void;
};

/**
 * One live connection per tab, shared by every component that wants election updates.
 * It carries only status and turnout numbers. If it can't connect (or drops), callers
 * keep working by polling.
 */
let socket: Socket | null = null;
let socketToken: string | null = null;
const listeners = new Set<Listener>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function connect(token: string): Socket {
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  const next = io(API_ORIGIN, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 15_000,
  });
  next.on('connect', () => listeners.forEach((listener) => listener.onConnection?.(true)));
  next.on('disconnect', () => listeners.forEach((listener) => listener.onConnection?.(false)));
  next.on('connect_error', () => listeners.forEach((listener) => listener.onConnection?.(false)));
  next.on('election:update', (update: LiveUpdate) => listeners.forEach((listener) => listener.onUpdate?.(update)));
  next.on('election:voted', (event: { electionId: string; votedAt: string }) => listeners.forEach((listener) => listener.onVoted?.(event)));
  next.on('election:removed', (event: { electionId: string }) => listeners.forEach((listener) => listener.onRemoved?.(event)));
  socket = next;
  return next;
}

export function useElectionLive(token: string | null, listener: Omit<Listener, 'onConnection'>): boolean {
  const [connected, setConnected] = useState(() => !!socket?.connected && socketToken === token);
  const latest = useRef(listener);
  latest.current = listener;

  useEffect(() => {
    if (!token) return undefined;
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    const entry: Listener = {
      onUpdate: (update) => latest.current.onUpdate?.(update),
      onVoted: (event) => latest.current.onVoted?.(event),
      onRemoved: (event) => latest.current.onRemoved?.(event),
      onConnection: setConnected,
    };
    listeners.add(entry);
    const active = connect(token);
    setConnected(active.connected);
    return () => {
      listeners.delete(entry);
      if (listeners.size === 0) {
        // Keep the connection briefly so moving between pages doesn't reconnect.
        idleTimer = setTimeout(() => { socket?.disconnect(); socket = null; socketToken = null; }, 30_000);
      }
    };
  }, [token]);

  return connected;
}
