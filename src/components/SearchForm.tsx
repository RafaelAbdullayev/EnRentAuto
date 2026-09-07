'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toDateInput } from '@/lib/format';

/** Поиск свободных авто по датам. Ведёт в каталог с параметрами from/to. */
export function SearchForm({
  defaultFrom,
  defaultTo,
  compact = false,
}: {
  defaultFrom?: string;
  defaultTo?: string;
  compact?: boolean;
}) {
  const t = useTranslations('search');
  const router = useRouter();

  const today = toDateInput(new Date());
  const tomorrow = toDateInput(new Date(Date.now() + 86_400_000));
  const inThreeDays = toDateInput(new Date(Date.now() + 3 * 86_400_000));

  const [from, setFrom] = useState(defaultFrom || tomorrow);
  const [to, setTo] = useState(defaultTo || inThreeDays);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(to) <= new Date(from)) {
      setError(t('error'));
      return;
    }
    setError(null);
    router.push({ pathname: '/cars', query: { from, to } });
  };

  return (
    <form
      onSubmit={submit}
      /*
       * На телефоне даты стоят в две колонки: поля короткие, а высота
       * первого экрана дорога — вертикальная раскладка уводила кнопку
       * «Найти» за нижний край.
       */
      className={
        compact
          ? 'grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-end'
          : 'surface grid grid-cols-2 gap-3 p-4 sm:flex sm:flex-row sm:items-end sm:gap-4 sm:p-6'
      }
    >
      <div className="flex-1">
        <label className="label" htmlFor="from">{t('from')}</label>
        <input
          id="from"
          type="date"
          className="field"
          min={today}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
        />
      </div>
      <div className="flex-1">
        <label className="label" htmlFor="to">{t('to')}</label>
        <input
          id="to"
          type="date"
          className="field"
          min={from || today}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary col-span-2 h-[46px] w-full sm:col-span-1 sm:w-auto">
        {t('submit')}
      </button>
      {error && <p className="error-text col-span-2">{error}</p>}
    </form>
  );
}
