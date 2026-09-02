'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
      setError('Дата возврата должна быть позже даты начала');
      return;
    }
    setError(null);
    router.push(`/cars?from=${from}&to=${to}`);
  };

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? 'flex flex-col gap-3 sm:flex-row sm:items-end'
          : 'surface flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6'
      }
    >
      <div className="flex-1">
        <label className="label" htmlFor="from">Дата начала</label>
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
        <label className="label" htmlFor="to">Дата возврата</label>
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
      <button type="submit" className="btn-primary h-[42px] sm:w-auto">
        Найти автомобиль
      </button>
      {error && <p className="error-text sm:absolute sm:-bottom-6">{error}</p>}
    </form>
  );
}
