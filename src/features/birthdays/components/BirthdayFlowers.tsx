import { useCallback, useEffect, useState } from 'react';
import FlowerShower from './FlowerShower';

export interface BirthdayCheck {
  isMyBirthday: boolean;
  greetingName: string;
}

function seenKey(sessionKey: string): string {
  return `nexium:flowers-seen:${sessionKey}:${new Date().toDateString()}`;
}

/**
 * Flowers on the user's birthday, every time they sign in or open the app that day.
 * `sessionKey` changes with each sign-in (part of the token), and the "already shown" mark
 * lives in sessionStorage, which a new app session starts empty, so closing the flowers
 * hides them only until the next sign-in or the next time the app is opened.
 */
export default function BirthdayFlowers({ load, sessionKey }: { load: () => Promise<BirthdayCheck>; sessionKey: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    try {
      if (sessionStorage.getItem(seenKey(sessionKey))) return;
    } catch {
      // No session storage: show them anyway.
    }
    load()
      .then((result) => { if (active && result.isMyBirthday) setName(result.greetingName); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [load, sessionKey]);

  const close = useCallback(() => {
    try { sessionStorage.setItem(seenKey(sessionKey), '1'); } catch { /* shown again next time: harmless */ }
    setName(null);
  }, [sessionKey]);

  return name ? <FlowerShower name={name} onDone={close} /> : null;
}
