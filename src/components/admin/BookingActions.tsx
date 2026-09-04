'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingStatus } from '@prisma/client';
import { formatMoney } from '@/lib/format';
import { currencySymbol } from '@/lib/currency';

type Action = 'confirm' | 'issue' | 'return' | 'cancel' | 'complete' | 'reopen';

/**
 * Кнопки управления заказом.
 * «Принять машину» открывает мини-форму доплат (штрафы, топливо),
 * переработка по времени считается сервером автоматически.
 */
export function BookingActions({
  bookingId,
  status,
  totalPrice,
}: {
  bookingId: string;
  status: BookingStatus;
  totalPrice: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnMode, setReturnMode] = useState(false);
  const [extraCharge, setExtraCharge] = useState(0);
  const [extraNote, setExtraNote] = useState('');
  const money = currencySymbol();

  async function run(action: Action, extra?: Record<string, unknown>) {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось выполнить действие');
        return;
      }
      setReturnMode(false);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-signal-cancel">{error}</p>}

      <div className="flex flex-wrap gap-1.5">
        {status === 'NEW' && (
          <button type="button" disabled={busy} onClick={() => run('confirm')} className="btn-ghost btn-sm">
            Подтвердить
          </button>
        )}

        {(status === 'NEW' || status === 'CONFIRMED') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run('issue')}
            className="btn-primary btn-sm"
          >
            Выдать машину
          </button>
        )}

        {status === 'ACTIVE' && !returnMode && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setReturnMode(true)}
            className="btn-primary btn-sm"
          >
            Принять машину
          </button>
        )}

        {(status === 'NEW' || status === 'CONFIRMED' || status === 'ACTIVE') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt('Причина отмены заказа:', 'Отменён клиентом');
              if (reason === null) return;
              void run('cancel', { cancelReason: reason });
            }}
            className="btn-danger btn-sm"
          >
            Отменить
          </button>
        )}

        {status === 'CANCELLED' && (
          <button type="button" disabled={busy} onClick={() => run('reopen')} className="btn-ghost btn-sm">
            Вернуть в работу
          </button>
        )}
      </div>

      {/* Форма приёма машины */}
      {returnMode && status === 'ACTIVE' && (
        <div className="rounded-xl border border-accent/30 bg-ink-900/70 p-3">
          <p className="text-xs text-zinc-400">
            Плановая сумма: <b className="text-white">{formatMoney(totalPrice)}</b>. Переработка
            по времени будет рассчитана автоматически.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`extra-${bookingId}`}>{`Доплата, ${money}`}</label>
              <input
                id={`extra-${bookingId}`}
                type="number"
                min={0}
                className="field"
                value={extraCharge}
                onChange={(e) => setExtraCharge(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor={`note-${bookingId}`}>Комментарий</label>
              <input
                id={`note-${bookingId}`}
                className="field"
                placeholder="Штраф ГИБДД, недолив топлива…"
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run('return', { extraCharge, extraNote })}
              className="btn-primary btn-sm"
            >
              {pending === 'return' ? 'Оформляем…' : 'Подтвердить приём'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setReturnMode(false)}
              className="btn-ghost btn-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
