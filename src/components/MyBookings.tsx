'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn, formatDate, formatMoney } from '@/lib/format';

type Booking = {
  code: string;
  status: 'NEW' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startAt: string;
  endAt: string;
  days: number;
  totalPrice: number;
  extraCharge: number;
  finalPrice: number | null;
  car: { id: string; brand: string; model: string; year: number };
};

const STATUS_STYLE: Record<Booking['status'], string> = {
  NEW: 'bg-signal-new/15 text-signal-new ring-signal-new/40',
  CONFIRMED: 'bg-signal-confirmed/15 text-signal-confirmed ring-signal-confirmed/40',
  ACTIVE: 'bg-signal-active/15 text-signal-active ring-signal-active/40',
  COMPLETED: 'bg-signal-done/15 text-signal-done ring-signal-done/40',
  CANCELLED: 'bg-signal-cancel/15 text-signal-cancel ring-signal-cancel/40',
};

/**
 * История броней клиента.
 *
 * Регистрации на сайте нет — бронь оформляется без аккаунта. Владение
 * подтверждается парой «телефон + код одного из заказов»: угадать их вместе
 * нельзя, а посетителю не нужен ещё один пароль.
 */
export function MyBookings() {
  const t = useTranslations('my');
  const e = useTranslations('enums');
  const locale = useLocale();

  const [form, setForm] = useState({ phone: '', code: '' });
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setError(null);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/my/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(res.status === 429 ? data.error : t('notFound'));
        return;
      }
      setBookings(data.bookings as Booking[]);
    } catch {
      setError(t('networkError'));
    } finally {
      setPending(false);
    }
  }

  if (bookings) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">{t('found', { count: bookings.length })}</p>
          <button
            type="button"
            onClick={() => {
              setBookings(null);
              setForm({ phone: '', code: '' });
            }}
            className="btn-ghost btn-sm"
          >
            {t('reset')}
          </button>
        </div>

        <ul className="space-y-4">
          {bookings.map((b) => (
            <li key={b.code} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">
                    {b.car.brand} <span className="text-zinc-400">{b.car.model}</span>
                    <span className="ms-2 text-sm text-zinc-600">{b.car.year}</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{b.code}</p>
                </div>
                <span className={cn('badge ring-1', STATUS_STYLE[b.status])}>
                  {e(`status.${b.status}`)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-ink-700/70 pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-600">{t('period')}</dt>
                  <dd className="mt-0.5 text-sm text-zinc-200">
                    {formatDate(b.startAt, locale)} — {formatDate(b.endAt, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-600">{t('days')}</dt>
                  <dd className="mt-0.5 text-sm text-zinc-200">{b.days}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-600">
                    {b.finalPrice === null ? t('price') : t('total')}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-white">
                    {formatMoney(b.finalPrice ?? b.totalPrice, locale)}
                  </dd>
                </div>
              </dl>

              {b.extraCharge > 0 && (
                <p className="mt-3 text-xs text-zinc-500">
                  {t('extra')}: {formatMoney(b.extraCharge, locale)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface max-w-lg space-y-4 p-6">
      <div>
        <label className="label" htmlFor="phone">{t('phone')}</label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="field"
          placeholder={t('phonePh')}
          value={form.phone}
          onChange={set('phone')}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="code">{t('code')}</label>
        <input
          id="code"
          type="text"
          dir="ltr"
          className="field font-mono uppercase"
          placeholder={t('codePh')}
          value={form.code}
          onChange={set('code')}
          required
        />
        <p className="hint">{t('hint')}</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
