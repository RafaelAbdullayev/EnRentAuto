'use client';

import { useEffect, useState } from 'react';
import { formatMoney, formatNumber, toDateInput, cn } from '@/lib/format';

type Period = 'today' | 'week' | 'month' | 'quarter' | 'custom';

const PRESETS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'custom', label: 'Период' },
];

/** Отчёт по выручке за выбранный период (пресеты + произвольный диапазон). */
export function RevenueReport() {
  const [period, setPeriod] = useState<Period>('month');
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [data, setData] = useState<{ revenue: number; orders: number; average: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url =
      period === 'custom'
        ? `/api/admin/stats?period=custom&from=${from}&to=${to}`
        : `/api/admin/stats?period=${period}`;

    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? 'Не удалось загрузить отчёт');
          setData(null);
          return;
        }
        setData(json);
      })
      .catch(() => !cancelled && setError('Сеть недоступна'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [period, from, to]);

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-white">Отчёт по выручке</h2>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                period === p.key
                  ? 'bg-accent text-ink-950'
                  : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="rep-from">С</label>
            <input id="rep-from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="rep-to">По</label>
            <input id="rep-to" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}

      {error && <p className="error-text mt-4">{error}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Выручка', value: data ? formatMoney(data.revenue) : '—', accent: true },
          { label: 'Заказов', value: data ? formatNumber(data.orders) : '—' },
          { label: 'Средний чек', value: data ? formatMoney(data.average) : '—' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-ink-700 bg-ink-900/60 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">{item.label}</div>
            <div
              className={cn(
                'mt-2 text-2xl font-semibold transition-opacity',
                item.accent ? 'text-accent' : 'text-white',
                loading && 'opacity-40',
              )}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
