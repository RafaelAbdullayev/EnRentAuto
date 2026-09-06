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

  // Шаги входа: номер заказа → либо запрос кода на почту → ввод кода.
  const [step, setStep] = useState<'code' | 'email' | 'otp'>('code');
  const [form, setForm] = useState({ phone: '', code: '', email: '', otp: '' });
  const [sentTo, setSentTo] = useState('');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setError(null);
  };

  /** Показать брони: по номеру заказа или по коду из письма. */
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body =
        step === 'otp'
          ? { phone: form.phone, otp: form.otp }
          : { phone: form.phone, code: form.code };

      const res = await fetch('/api/my/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  /** Выслать код на e-mail, указанный при бронировании. */
  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/my/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, email: form.email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) {
        setError(t('mailDisabled'));
        return;
      }
      if (!res.ok) {
        setError(res.status === 429 ? data.error : t('notFound'));
        return;
      }

      // Ответ одинаковый и когда пара найдена, и когда нет: иначе форма
      // превратилась бы в способ проверять, есть ли у нас такой клиент.
      setSentTo(data.hint ?? form.email);
      setStep('otp');
    } catch {
      setError(t('networkError'));
    } finally {
      setPending(false);
    }
  }

  const reset = () => {
    setBookings(null);
    setStep('code');
    setForm({ phone: '', code: '', email: '', otp: '' });
    setError(null);
  };

  if (bookings) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">{t('found', { count: bookings.length })}</p>
          <button type="button" onClick={reset} className="btn-ghost btn-sm">
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

  const phoneField = (
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
  );

  // ─── Шаг 2: код из письма ────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <form onSubmit={submit} className="surface max-w-lg space-y-4 p-6">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-sm font-medium text-accent">{t('sentTitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {t('sentText', { email: sentTo })}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="otp">{t('otp')}</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            className="field text-center font-mono text-lg tracking-[0.4em]"
            placeholder={t('otpPh')}
            value={form.otp}
            onChange={set('otp')}
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? t('submitting') : t('otpSubmit')}
        </button>

        <div className="flex justify-between gap-3 text-xs">
          <button type="button" onClick={() => setStep('email')} className="text-zinc-500 hover:text-accent">
            {t('resend')}
          </button>
          <button type="button" onClick={reset} className="text-zinc-500 hover:text-accent">
            {t('back')}
          </button>
        </div>
      </form>
    );
  }

  // ─── Шаг 1б: клиент не помнит номер заказа ───────────────────────────
  if (step === 'email') {
    return (
      <form onSubmit={requestCode} className="surface max-w-lg space-y-4 p-6">
        {phoneField}

        <div>
          <label className="label" htmlFor="email">{t('email')}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            className="field"
            placeholder={t('emailPh')}
            value={form.email}
            onChange={set('email')}
            required
          />
          <p className="hint">{t('emailHint')}</p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? t('sending') : t('sendCode')}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep('code');
            setError(null);
          }}
          className="w-full text-center text-xs text-zinc-500 hover:text-accent"
        >
          {t('byCode')}
        </button>
      </form>
    );
  }

  // ─── Шаг 1а: вход по номеру заказа ───────────────────────────────────
  return (
    <form onSubmit={submit} className="surface max-w-lg space-y-4 p-6">
      {phoneField}

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

      {/* Код заказа теряют постоянно — второй способ входа на видном месте. */}
      <button
        type="button"
        onClick={() => {
          setStep('email');
          setError(null);
        }}
        className="w-full text-center text-xs text-zinc-500 underline-offset-4 hover:text-accent hover:underline"
      >
        {t('forgot')}
      </button>
    </form>
  );
}
