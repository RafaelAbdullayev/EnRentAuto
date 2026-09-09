'use client';

import { useMemo, useState } from 'react';
import { LOCALE_LABELS, isRtl, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/format';

export interface TranslationRow {
  locale: string;
  description: string;
  features: string[];
  sourceHash: string;
  isAuto: boolean;
}

/**
 * Переводы описания автомобиля на языки сайта.
 *
 * Русский текст — из карточки выше, он базовый. Здесь показывается, что
 * увидит посетитель на остальных языках: перевод можно сделать машиной,
 * поправить руками и сохранить. Пустое поле означает «показывать русский».
 */
export function CarTranslations({
  carId,
  locales,
  sourceHash,
  baseFeatures,
  initial,
  provider,
}: {
  carId: string;
  locales: Locale[];
  /** Отпечаток русского текста: не совпал — перевод устарел. */
  sourceHash: string;
  baseFeatures: string[];
  initial: TranslationRow[];
  /** Название переводчика — показываем, чтобы было видно, кто переводил. */
  provider: string;
}) {
  const [rows, setRows] = useState<TranslationRow[]>(initial);
  const [active, setActive] = useState<Locale>(locales[0]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const row = useMemo(
    () => rows.find((r) => r.locale === active),
    [rows, active],
  );

  const description = row?.description ?? '';
  const features = row?.features ?? [];
  const outdated = Boolean(row && row.sourceHash !== sourceHash);

  function patch(locale: Locale, values: Partial<TranslationRow>) {
    setRows((prev) => {
      const found = prev.find((r) => r.locale === locale);
      if (!found) {
        return [
          ...prev,
          {
            locale,
            description: '',
            features: [],
            sourceHash: '',
            isAuto: false,
            ...values,
          },
        ];
      }
      return prev.map((r) => (r.locale === locale ? { ...r, ...values } : r));
    });
  }

  async function call(
    action: string,
    init: RequestInit,
    okMessage: string,
  ): Promise<void> {
    setPending(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/cars/${carId}/translations`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось выполнить действие');
        return;
      }
      if (Array.isArray(data.translations)) setRows(data.translations);
      const failed: { locale: string; error: string }[] = data.failed ?? [];
      if (failed.length > 0) {
        setError(
          `Не переведено: ${failed
            .map((f) => `${LOCALE_LABELS[f.locale as Locale].short} — ${f.error}`)
            .join('; ')}`,
        );
        return;
      }
      setNotice(okMessage);
    } catch {
      setError('Сеть недоступна');
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Описание на других языках</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Русский текст — основной, он выше. Здесь то, что увидят посетители на
            остальных языках: перевод делается сам при сохранении автомобиля.
            Пустое поле — покажем русский. Переводит {provider}.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            call('all', { method: 'POST', body: JSON.stringify({}) }, 'Переводы обновлены')
          }
          className="btn-ghost btn-sm"
        >
          {pending === 'all' ? 'Перевожу…' : 'Перевести все языки'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {locales.map((locale) => {
          const r = rows.find((x) => x.locale === locale);
          const filled = Boolean(r?.description.trim());
          const stale = Boolean(r && r.sourceHash !== sourceHash);
          return (
            <button
              key={locale}
              type="button"
              onClick={() => setActive(locale)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200',
                active === locale
                  ? 'bg-accent text-ink-950'
                  : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
              )}
            >
              {LOCALE_LABELS[locale].flag} {LOCALE_LABELS[locale].short}
              <span className="ml-1.5 opacity-70">
                {!filled ? '—' : stale ? '!' : '✓'}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-xs text-signal-cancel">{error}</p>}
      {notice && <p className="mt-4 text-xs text-signal-active">{notice}</p>}

      {outdated && (
        <p className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-xs text-zinc-300">
          Русский текст меняли после этого перевода — переведите заново или
          поправьте руками.
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor={`descr-${active}`}>
            Описание · {LOCALE_LABELS[active].native}
          </label>
          <textarea
            id={`descr-${active}`}
            rows={5}
            dir={isRtl(active) ? 'rtl' : 'ltr'}
            className="field"
            placeholder="Пусто — на этом языке покажем русский текст"
            value={description}
            onChange={(e) => patch(active, { description: e.target.value })}
          />
        </div>

        {baseFeatures.length > 0 && (
          <div>
            <span className="label">Опции · {LOCALE_LABELS[active].native}</span>
            <ul className="mt-1 space-y-2">
              {baseFeatures.map((base, i) => (
                <li key={base} className="grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:items-center">
                  <span className="text-xs text-zinc-500">{base}</span>
                  <input
                    className="field"
                    dir={isRtl(active) ? 'rtl' : 'ltr'}
                    placeholder={base}
                    value={features[i] ?? ''}
                    onChange={(e) => {
                      const next = baseFeatures.map((_, j) =>
                        j === i ? e.target.value : (features[j] ?? ''),
                      );
                      patch(active, { features: next });
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              call(
                `save-${active}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({
                    locale: active,
                    description,
                    features: baseFeatures.map((_, i) => features[i] ?? ''),
                  }),
                },
                `Перевод на ${LOCALE_LABELS[active].native} сохранён`,
              )
            }
            className="btn-primary btn-sm"
          >
            {pending === `save-${active}` ? 'Сохраняю…' : 'Сохранить'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              call(
                `one-${active}`,
                { method: 'POST', body: JSON.stringify({ locale: active }) },
                `Переведено на ${LOCALE_LABELS[active].native}`,
              )
            }
            className="btn-ghost btn-sm"
          >
            {pending === `one-${active}` ? 'Перевожу…' : 'Перевести этот язык заново'}
          </button>
        </div>
      </div>
    </section>
  );
}
