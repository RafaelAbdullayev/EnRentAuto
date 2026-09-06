'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Действия над авто в таблице: архивировать, восстановить, удалить полностью. */
export function CarRowActions({
  carId,
  isArchived,
  hasBookings,
  title,
}: {
  carId: string;
  isArchived: boolean;
  hasBookings: boolean;
  title: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, method: 'DELETE' | 'POST', confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Операция не выполнена');
        return;
      }
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <span className="mr-auto text-xs text-signal-cancel">{error}</span>}

      <Link href={`/admin/cars/${carId}`} className="btn-ghost btn-sm">
        Изменить
      </Link>

      {isArchived ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(`/api/cars/${carId}/restore`, 'POST')}
          className="btn-ghost btn-sm"
        >
          Восстановить
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              `/api/cars/${carId}`,
              'DELETE',
              `Отправить «${title}» в архив? Автомобиль исчезнет из каталога, история заказов сохранится.`,
            )
          }
          className="btn-ghost btn-sm"
        >
          В архив
        </button>
      )}

      {!hasBookings && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              `/api/cars/${carId}?hard=1`,
              'DELETE',
              `Удалить «${title}» безвозвратно вместе с фотографиями? Действие необратимо.`,
            )
          }
          className="btn-danger btn-sm"
        >
          Удалить
        </button>
      )}
    </div>
  );
}
