'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageUploader } from '@/components/admin/ImageUploader';
import {
  BODY_TYPE_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  CAR_STATUS_LABELS,
} from '@/lib/constants';
import { effectivePricePerDay } from '@/lib/pricing';
import { currencySymbol } from '@/lib/currency';
import { formatMoney, cn } from '@/lib/format';

export interface CarFormValues {
  brand: string;
  model: string;
  year: number;
  bodyType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  color: string;
  plateNumber: string;
  pricePerDay: number;
  discount: number;
  deposit: number;
  mileageLimit: number;
  overMileageFee: number;
  description: string;
  features: string[];
  status: string;
  images: string[];
}

export const emptyCar: CarFormValues = {
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  bodyType: 'SEDAN',
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  seats: 5,
  color: '',
  plateNumber: '',
  pricePerDay: 150,
  discount: 0,
  deposit: 0,
  mileageLimit: 0,
  overMileageFee: 0,
  description: '',
  features: [],
  status: 'AVAILABLE',
  images: [],
};

/**
 * Универсальная форма автомобиля: создание (POST /api/cars)
 * и редактирование (PATCH /api/cars/[id]).
 */
export function CarForm({
  initial,
  carId,
}: {
  initial?: Partial<CarFormValues>;
  carId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CarFormValues>({ ...emptyCar, ...initial });
  const [featureDraft, setFeatureDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const money = currencySymbol();

  const set = <K extends keyof CarFormValues>(key: K, v: CarFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const addFeature = () => {
    const f = featureDraft.trim();
    if (!f || values.features.includes(f) || values.features.length >= 30) return;
    set('features', [...values.features, f]);
    setFeatureDraft('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    setAlert(null);

    try {
      const res = await fetch(carId ? `/api/cars/${carId}` : '/api/cars', {
        method: carId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (res.ok) {
        router.push('/admin/cars');
        router.refresh();
        return;
      }
      if (res.status === 401) {
        router.push('/login?from=/admin/cars');
        return;
      }
      if (data.fields) setErrors(data.fields);
      setAlert(data.error ?? 'Не удалось сохранить автомобиль');
    } catch {
      setAlert('Сеть недоступна. Повторите попытку.');
    } finally {
      setPending(false);
    }
  }

  const finalPrice = effectivePricePerDay(values.pricePerDay, values.discount);

  return (
    <form onSubmit={submit} className="space-y-6">
      {alert && (
        <div
          role="alert"
          className="rounded-xl border border-signal-cancel/40 bg-signal-cancel/10 px-4 py-3 text-sm text-signal-cancel"
        >
          {alert}
        </div>
      )}

      {/* ─── Основное ────────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Основная информация</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Марка" error={errors.brand}>
            <input
              className={cn('field', errors.brand && 'field-error')}
              placeholder="Mercedes-Benz"
              value={values.brand}
              onChange={(e) => set('brand', e.target.value)}
              required
            />
          </Field>

          <Field label="Модель" error={errors.model}>
            <input
              className={cn('field', errors.model && 'field-error')}
              placeholder="E-Class 220d"
              value={values.model}
              onChange={(e) => set('model', e.target.value)}
              required
            />
          </Field>

          <Field label="Год выпуска" error={errors.year}>
            <input
              type="number"
              className={cn('field', errors.year && 'field-error')}
              min={1980}
              max={new Date().getFullYear() + 1}
              value={values.year}
              onChange={(e) => set('year', Number(e.target.value))}
              required
            />
          </Field>

          <Field label="Тип кузова">
            <select
              className="field"
              value={values.bodyType}
              onChange={(e) => set('bodyType', e.target.value)}
            >
              {Object.entries(BODY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Трансмиссия">
            <select
              className="field"
              value={values.transmission}
              onChange={(e) => set('transmission', e.target.value)}
            >
              {Object.entries(TRANSMISSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Топливо">
            <select
              className="field"
              value={values.fuelType}
              onChange={(e) => set('fuelType', e.target.value)}
            >
              {Object.entries(FUEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Количество мест">
            <input
              type="number"
              className="field"
              min={2}
              max={9}
              value={values.seats}
              onChange={(e) => set('seats', Number(e.target.value))}
            />
          </Field>

          <Field label="Цвет">
            <input
              className="field"
              placeholder="Обсидиановый чёрный"
              value={values.color}
              onChange={(e) => set('color', e.target.value)}
            />
          </Field>

          <Field label="Госномер" error={errors.plateNumber}>
            <input
              className={cn('field', errors.plateNumber && 'field-error')}
              placeholder="А123ВС777"
              value={values.plateNumber}
              onChange={(e) => set('plateNumber', e.target.value.toUpperCase())}
            />
          </Field>
        </div>
      </section>

      {/* ─── Тариф ───────────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Тариф и условия</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={`Цена за сутки, ${money}`} error={errors.pricePerDay}>
            <input
              type="number"
              className={cn('field', errors.pricePerDay && 'field-error')}
              min={1}
              value={values.pricePerDay}
              onChange={(e) => set('pricePerDay', Number(e.target.value))}
              required
            />
          </Field>

          <Field label="Скидка, %" error={errors.discount} hint="Спецпредложение: 0–90%">
            <input
              type="number"
              className={cn('field', errors.discount && 'field-error')}
              min={0}
              max={90}
              value={values.discount}
              onChange={(e) => set('discount', Number(e.target.value))}
            />
          </Field>

          <Field label={`Залог, ${money}`}>
            <input
              type="number"
              className="field"
              min={0}
              value={values.deposit}
              onChange={(e) => set('deposit', Number(e.target.value))}
            />
          </Field>

          <Field label="Лимит пробега, км/сут." hint="0 — без ограничений">
            <input
              type="number"
              className="field"
              min={0}
              value={values.mileageLimit}
              onChange={(e) => set('mileageLimit', Number(e.target.value))}
            />
          </Field>

          <Field label={`Стоимость км сверх лимита, ${money}`}>
            <input
              type="number"
              className="field"
              min={0}
              value={values.overMileageFee}
              onChange={(e) => set('overMileageFee', Number(e.target.value))}
            />
          </Field>

          <Field label="Статус">
            <select
              className="field"
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {Object.entries(CAR_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm">
          <span className="text-zinc-400">Итоговая цена для клиента:</span>
          <strong className="text-accent">{formatMoney(finalPrice)}</strong>
          {values.discount > 0 && (
            <span className="text-zinc-600 line-through">{formatMoney(values.pricePerDay)}</span>
          )}
          <span className="text-zinc-500">за сутки</span>
        </div>
      </section>

      {/* ─── Описание и комплектация ─────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Описание и комплектация</h2>

        <div className="mt-5">
          <label className="label" htmlFor="description">Описание</label>
          <textarea
            id="description"
            rows={5}
            className="field resize-y"
            placeholder="Представительский седан с пневмоподвеской, панорамной крышей и полным приводом 4MATIC…"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className="mt-5">
          <label className="label" htmlFor="feature">Опции</label>
          <div className="flex gap-2">
            <input
              id="feature"
              className="field"
              placeholder="Климат-контроль, камера 360°, Apple CarPlay…"
              value={featureDraft}
              onChange={(e) => setFeatureDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />
            <button type="button" onClick={addFeature} className="btn-ghost shrink-0">
              Добавить
            </button>
          </div>

          {values.features.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {values.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800/70 py-1.5 pl-3 pr-2 text-xs text-zinc-300"
                >
                  {f}
                  <button
                    type="button"
                    aria-label={`Удалить ${f}`}
                    onClick={() => set('features', values.features.filter((x) => x !== f))}
                    className="text-zinc-600 transition-colors hover:text-signal-cancel"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Фото ────────────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Фотографии</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Первое фото используется как обложка в каталоге. Порядок можно менять стрелками.
        </p>
        <div className="mt-5">
          <ImageUploader value={values.images} onChange={(urls) => set('images', urls)} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary px-7 py-3">
          {pending ? 'Сохраняем…' : carId ? 'Сохранить изменения' : 'Добавить автомобиль'}
        </button>
        <Link href="/admin/cars" className="btn-ghost">Отмена</Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
