'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Периодически перезапрашивает данные серверного компонента.
 * Нужен на страницах, где важна свежесть: счётчик посетителей онлайн
 * иначе замирает на момент открытия страницы.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => {
      // Во вкладке в фоне не дёргаем сервер впустую.
      if (document.visibilityState !== 'visible') return;
      router.refresh();
      setUpdatedAt(new Date());
    };
    const timer = setInterval(tick, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return (
    <span className="flex items-center gap-2 text-xs text-zinc-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-active" />
      Обновляется каждые {seconds} с
      {updatedAt && (
        <span className="text-zinc-600">
          · последнее в{' '}
          {updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </span>
  );
}
