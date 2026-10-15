import { useEffect, useState } from 'react';

/**
 * Ticking clock corrected to the server's time, so a wrong phone clock can't make the
 * countdown lie. `serverTime` is the time the server reported when the data was fetched.
 */
export function useNow(serverTime?: string, intervalMs = 1000): number {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (serverTime) setOffset(new Date(serverTime).getTime() - Date.now());
  }, [serverTime]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now + offset;
}
