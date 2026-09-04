'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { calculatePrice } from '@/lib/pricing';
import { formatMoney, toDateTimeLocal, cn } from '@/lib/format';

interface Props {
  carId: string;
  pricePerDay: number;
  discount: number;
  deposit: number;
  defaultStart?: string;
  defaultEnd?: string;
}

const emptyForm = {
  customerName: '',
  phone: '',
  email: '',
  documentInfo: '',
  comment: '',
};

/**
 * Форма бронирования.
 * • живой расчёт стоимости;
 * • проверка занятости на сервере (409 → понятное уведомление);
 * • ошибки полей приходят с сервера и подсвечиваются.
 *
 * Сообщения об ошибках валидации сервер отдаёт по-русски; здесь показываем
 * переведённую сводку, а конкретные поля подсвечиваем по ключам ответа.
 */
export function BookingForm({
  carId,
  pricePerDay,
  discount,
  deposit,
  defaultStart,
  defaultEnd,
}: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const router = useRouter();

  const initialStart = defaultStart ?? toDateTimeLocal(new Date(Date.now() + 86_400_000));
  const initialEnd = defaultEnd ?? toDateTimeLocal(new Date(Date.now() + 3 * 86_400_000));

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [form, setForm] = useState(emptyForm);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const price = useMemo(
    () => calculatePrice(new Date(start), new Date(end), pricePerDay, discount),
    [start, end, pricePerDay, discount],
  );

  const set =
    (key: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setInvalid({});
    setAlert(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          ...form,
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
        }),
      });
      const data = await res.json();

      if (res.status === 201) {
        router.push({ pathname: '/booking/success', query: { code: data.booking.code } });
        return;
      }
      if (res.status === 409) {
        setAlert(t('errBusy'));
        return;
      }
      if (res.status === 422 && data.fields) {
        setInvalid(
          Object.fromEntries(Object.keys(data.fields).map((k) => [k, true])),
        );
        setAlert(t('errFields'));
        return;
      }
      setAlert(t('errGeneric'));
    } catch {
      setAlert(t('errNetwork'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface p-6 sm:p-7">
      <h2 className="text-lg font-semibold text-white">{t('title')}</h2>
      <p className="mt-1 text-sm text-zinc-500">{t('subtitle')}</p>

      {alert && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-signal-cancel/40 bg-signal-cancel/10 px-4 py-3 text-sm text-signal-cancel"
        >
          {alert}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="customerName">{t('name')}</label>
          <input
            id="customerName"
            className={cn('field', invalid.customerName && 'field-error')}
            placeholder={t('namePh')}
            value={form.customerName}
            onChange={set('customerName')}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="phone">{t('phone')}</label>
          <input
            id="phone"
            type="tel"
            dir="ltr"
            className={cn('field', invalid.phone && 'field-error')}
            placeholder={t('phonePh')}
            value={form.phone}
            onChange={set('phone')}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="email">{t('email')}</label>
          <input
            id="email"
            type="email"
            dir="ltr"
            className={cn('field', invalid.email && 'field-error')}
            placeholder={t('emailPh')}
            value={form.email}
            onChange={set('email')}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="documentInfo">{t('document')}</label>
          <input
            id="documentInfo"
            className={cn('field', invalid.documentInfo && 'field-error')}
            placeholder={t('documentPh')}
            value={form.documentInfo}
            onChange={set('documentInfo')}
            required
          />
          <p className="hint">{t('documentHint')}</p>
        </div>

        <div>
          <label className="label" htmlFor="startAt">{t('start')}</label>
          <input
            id="startAt"
            type="datetime-local"
            className={cn('field', invalid.startAt && 'field-error')}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="endAt">{t('end')}</label>
          <input
            id="endAt"
            type="datetime-local"
            className={cn('field', invalid.endAt && 'field-error')}
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="comment">{t('comment')}</label>
          <textarea
            id="comment"
            rows={3}
            className="field resize-none"
            placeholder={t('commentPh')}
            value={form.comment}
            onChange={set('comment')}
          />
        </div>
      </div>

      {/* ─── Расчёт стоимости ─────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <dt>{t('sumRate')}</dt>
            <dd className="text-zinc-200">
              {formatMoney(price.pricePerDay, locale)}
              {discount > 0 && (
                <span className="ms-2 text-xs text-zinc-600 line-through">
                  {formatMoney(pricePerDay, locale)}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between text-zinc-400">
            <dt>{t('sumTerm')}</dt>
            <dd className="text-zinc-200">{t('sumDays', { count: price.days })}</dd>
          </div>
          {price.saved > 0 && (
            <div className="flex justify-between text-accent">
              <dt>{t('sumSaving')}</dt>
              <dd>−{formatMoney(price.saved, locale)}</dd>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between text-zinc-400">
              <dt>{t('sumDeposit')}</dt>
              <dd className="text-zinc-200">{formatMoney(deposit, locale)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-ink-700 pt-3">
            <dt className="text-base text-white">{t('sumTotal')}</dt>
            <dd className="text-2xl font-semibold text-accent">
              {formatMoney(price.total, locale)}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="submit"
        disabled={pending || price.days === 0}
        className="btn-primary mt-6 w-full py-3 text-base"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
      <p className="hint text-center">{t('agree')}</p>
    </form>
  );
}
