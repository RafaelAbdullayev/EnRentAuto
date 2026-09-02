'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
 */
export function BookingForm({
  carId,
  pricePerDay,
  discount,
  deposit,
  defaultStart,
  defaultEnd,
}: Props) {
  const router = useRouter();

  const initialStart =
    defaultStart ?? toDateTimeLocal(new Date(Date.now() + 86_400_000));
  const initialEnd =
    defaultEnd ?? toDateTimeLocal(new Date(Date.now() + 3 * 86_400_000));

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const price = useMemo(
    () => calculatePrice(new Date(start), new Date(end), pricePerDay, discount),
    [start, end, pricePerDay, discount],
  );

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
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
        router.push(`/booking/success?code=${data.booking.code}`);
        return;
      }
      if (res.status === 409) {
        // Машина занята — самая частая пользовательская ошибка.
        setAlert({
          type: 'error',
          text:
            data.error ??
            'Этот автомобиль уже забронирован на выбранные даты. Измените период или выберите другое авто.',
        });
        return;
      }
      if (res.status === 422 && data.fields) {
        setErrors(data.fields);
        setAlert({ type: 'error', text: 'Проверьте правильность заполнения полей.' });
        return;
      }
      setAlert({ type: 'error', text: data.error ?? 'Не удалось создать бронирование.' });
    } catch {
      setAlert({ type: 'error', text: 'Сеть недоступна. Повторите попытку.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface p-6 sm:p-7">
      <h2 className="text-lg font-semibold text-white">Оформление аренды</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Заполните данные — менеджер подтвердит бронь в течение 15 минут.
      </p>

      {alert && (
        <div
          role="alert"
          className={cn(
            'mt-5 rounded-xl border px-4 py-3 text-sm',
            alert.type === 'error'
              ? 'border-signal-cancel/40 bg-signal-cancel/10 text-signal-cancel'
              : 'border-accent/40 bg-accent/10 text-accent-soft',
          )}
        >
          {alert.text}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="customerName">ФИО</label>
          <input
            id="customerName"
            className={cn('field', errors.customerName && 'field-error')}
            placeholder="Иванов Иван Иванович"
            value={form.customerName}
            onChange={set('customerName')}
            required
          />
          {errors.customerName && <p className="error-text">{errors.customerName}</p>}
        </div>

        <div>
          <label className="label" htmlFor="phone">Телефон</label>
          <input
            id="phone"
            type="tel"
            className={cn('field', errors.phone && 'field-error')}
            placeholder="+7 999 123-45-67"
            value={form.phone}
            onChange={set('phone')}
            required
          />
          {errors.phone && <p className="error-text">{errors.phone}</p>}
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className={cn('field', errors.email && 'field-error')}
            placeholder="ivanov@mail.ru"
            value={form.email}
            onChange={set('email')}
            required
          />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="documentInfo">
            Паспорт / водительское удостоверение
          </label>
          <input
            id="documentInfo"
            className={cn('field', errors.documentInfo && 'field-error')}
            placeholder="4510 123456, выдан 12.05.2015 · ВУ 77 12 345678"
            value={form.documentInfo}
            onChange={set('documentInfo')}
            required
          />
          {errors.documentInfo && <p className="error-text">{errors.documentInfo}</p>}
          <p className="hint">Данные нужны для договора аренды и передаются в зашифрованном виде.</p>
        </div>

        <div>
          <label className="label" htmlFor="startAt">Начало аренды</label>
          <input
            id="startAt"
            type="datetime-local"
            className={cn('field', errors.startAt && 'field-error')}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          {errors.startAt && <p className="error-text">{errors.startAt}</p>}
        </div>

        <div>
          <label className="label" htmlFor="endAt">Окончание аренды</label>
          <input
            id="endAt"
            type="datetime-local"
            className={cn('field', errors.endAt && 'field-error')}
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
          {errors.endAt && <p className="error-text">{errors.endAt}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="comment">Комментарий (необязательно)</label>
          <textarea
            id="comment"
            rows={3}
            className="field resize-none"
            placeholder="Нужно детское кресло, подача к аэропорту Внуково…"
            value={form.comment}
            onChange={set('comment')}
          />
        </div>
      </div>

      {/* ─── Расчёт стоимости ─────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <dt>Тариф за сутки</dt>
            <dd className="text-zinc-200">
              {formatMoney(price.pricePerDay)}
              {discount > 0 && (
                <span className="ml-2 text-xs text-zinc-600 line-through">
                  {formatMoney(pricePerDay)}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between text-zinc-400">
            <dt>Срок аренды</dt>
            <dd className="text-zinc-200">{price.days} сут.</dd>
          </div>
          {price.saved > 0 && (
            <div className="flex justify-between text-accent">
              <dt>Ваша выгода</dt>
              <dd>−{formatMoney(price.saved)}</dd>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between text-zinc-400">
              <dt>Залог (возвращается)</dt>
              <dd className="text-zinc-200">{formatMoney(deposit)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-ink-700 pt-3">
            <dt className="text-base text-white">Итого к оплате</dt>
            <dd className="text-2xl font-semibold text-accent">{formatMoney(price.total)}</dd>
          </div>
        </dl>
      </div>

      <button
        type="submit"
        disabled={pending || price.days === 0}
        className="btn-primary mt-6 w-full py-3 text-base"
      >
        {pending ? 'Отправляем…' : 'Забронировать автомобиль'}
      </button>
      <p className="hint text-center">
        Нажимая кнопку, вы соглашаетесь с условиями аренды и обработкой персональных данных.
      </p>
    </form>
  );
}
