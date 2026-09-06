'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Отправляет «пинг» на /api/presence при заходе и каждые 60 секунд,
 * пока вкладка активна. Сервер обновляет VisitorSession.lastSeen.
 * Регистрации не требует — идентификация по httpOnly-cookie era_sid.
 */
export function PresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => undefined);
    };

    ping();
    const timer = setInterval(() => {
      if (!cancelled) ping();
    }, 60_000);

    document.addEventListener('visibilitychange', ping);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [pathname]);

  return null;
}
