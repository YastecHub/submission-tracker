import { useCallback, useEffect, useRef, useState } from 'react';

/** Component-owned server state. A stable loader identifies one resource/query. */
export function useRemoteData<T>(load: (signal: AbortSignal) => Promise<T>, pollMs = 0, enabled = true) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async (silent = false): Promise<boolean> => {
    if (!enabled) return false;
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    if (!silent) setState((previous) => ({ ...previous, loading: true, error: false }));
    try {
      const data = await load(request.signal);
      if (!request.signal.aborted) setState({ data, loading: false, error: false });
      return !request.signal.aborted;
    } catch {
      if (!request.signal.aborted) setState((previous) => ({ ...previous, loading: false, error: true }));
      return false;
    } finally {
      if (active.current === request) active.current = null;
    }
  }, [load, enabled]);

  useEffect(() => {
    if (!enabled) {
      active.current?.abort();
      setState({ data: null, loading: false, error: false });
      return;
    }
    setState({ data: null, loading: true, error: false });
    void refresh();
    const interval = pollMs ? setInterval(() => {
      if (document.visibilityState === 'visible' && !active.current) void refresh(true);
    }, pollMs) : undefined;
    return () => {
      active.current?.abort();
      if (interval) clearInterval(interval);
    };
  }, [refresh, pollMs, enabled]);

  return { ...state, refresh };
}
