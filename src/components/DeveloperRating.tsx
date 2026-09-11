'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/format';

export interface RatingSummaryView {
  count: number;
  average: number;
}

/**
 * Пять звёзд: посетитель ставит оценку работе разработчика.
 *
 * Голос привязан к анонимному cookie, поэтому оценку можно переставить —
 * звёзды показывают текущий выбор, а рядом держится средняя по всем.
 */
export function DeveloperRating({
  initialSummary,
  initialMine,
}: {
  initialSummary: RatingSummaryView;
  initialMine: number | null;
}) {
  const t = useTranslations('about');
  const [summary, setSummary] = useState(initialSummary);
  const [mine, setMine] = useState<number | null>(initialMine);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  async function vote(stars: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/developer/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось сохранить оценку');
        return;
      }
      setMine(data.mine ?? stars);
      if (data.summary) setSummary(data.summary);
      setThanks(true);
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
    }
  }

  // Пока курсор над звёздами — показываем то, что будет выбрано.
  const shown = hover || mine || 0;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-center sm:text-start">
        <p className="text-sm font-semibold text-white">{t('rateTitle')}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {thanks ? t('rateThanks') : t('rateHint')}
        </p>
        {error && <p className="mt-1 text-xs text-signal-cancel">{error}</p>}
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:items-end">
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={busy}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onClick={() => void vote(star)}
              aria-label={`${star}`}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-lg text-2xl leading-none transition-all duration-150',
                star <= shown ? 'text-accent' : 'text-ink-600 hover:text-accent/60',
                busy && 'opacity-60',
              )}
            >
              {star <= shown ? '★' : '☆'}
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          {summary.count > 0 ? (
            <>
              <span className="font-semibold text-white">
                {summary.average.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              </span>{' '}
              · {t('rateVotesCount', { count: summary.count })}
              {mine !== null && (
                <>
                  {' · '}
                  {t('rateYour')}: {mine}
                </>
              )}
            </>
          ) : (
            t('rateNone')
          )}
        </p>
      </div>
    </div>
  );
}
