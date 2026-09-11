'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';

/**
 * Перевод описаний всего автопарка одной кнопкой.
 *
 * Сервер обрабатывает машины небольшими порциями — иначе запрос на сорок
 * автомобилей упёрся бы в таймаут. Здесь идёт цикл: запрос → показать, сколько
 * осталось → следующий запрос, пока очередь не кончится.
 */
export function TranslateFleet({ pending }: { pending: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(pending);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setStatus('Перевожу…');

    try {
      // Ограничитель на случай, если очередь почему-то перестанет уменьшаться.
      for (let round = 0; round < 200; round++) {
        const res = await fetch('/api/admin/cars/translations', { method: 'POST' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error ?? 'Не удалось перевести');
          return;
        }

        const done: { title: string; done: number; failed: string | null }[] = data.processed ?? [];
        const last = done[done.length - 1];

        setLeft(data.remaining ?? 0);

        if (data.limitReached) {
          setStatus(null);
          setError(
            `${last?.failed ?? 'Лимит переводчика исчерпан'}. ` +
              'Остальные машины переведутся, когда лимит обновится — просто ' +
              'нажмите кнопку завтра.',
          );
          return;
        }

        if (data.remaining === 0) {
          setStatus('Готово: описания переведены на все языки сайта.');
          return;
        }

        setStatus(
          `${last ? `${last.title} — готово. ` : ''}Осталось машин: ${data.remaining}…`,
        );
      }
    } catch {
      setError('Сеть недоступна');
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-5',
        // Пока есть непереведённые машины, блок подсвечен фирменным цветом:
        // иначе его не замечают и описания так и остаются русскими.
        left > 0
          ? 'border-accent/45 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(212,175,110,0.08)]'
          : 'surface',
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            left > 0 ? 'text-base font-semibold text-white' : 'text-sm text-zinc-300',
          )}
        >
          {left > 0
            ? `Описания без перевода: ${left} ${plural(left)}`
            : 'Все описания переведены'}
        </p>
        {status && <p className="mt-1 text-xs text-signal-active">{status}</p>}
        {error && <p className="mt-1 text-xs text-signal-cancel">{error}</p>}
        {!status && !error && (
          <p className={cn('mt-1 text-xs', left > 0 ? 'text-zinc-400' : 'text-zinc-500')}>
            {left > 0
              ? 'Посетитель на другом языке видит русский текст, пока перевода нет. Нажмите — переведём все разом.'
              : 'Новые машины переводятся сами при сохранении.'}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={running || left === 0}
        onClick={run}
        // Кнопка нажимается редко, но она главная в этом блоке: на телефоне
        // во всю ширину, на большом экране — широкая, чтобы не теряться.
        className="btn-primary w-full px-8 py-3 text-sm sm:w-auto sm:min-w-[280px]"
      >
        {running ? 'Перевожу…' : 'Перевести весь автопарк'}
      </button>
    </div>
  );
}

function plural(n: number): string {
  const ten = n % 100;
  if (ten >= 11 && ten <= 14) return 'машин';
  switch (n % 10) {
    case 1:
      return 'машина';
    case 2:
    case 3:
    case 4:
      return 'машины';
    default:
      return 'машин';
  }
}
