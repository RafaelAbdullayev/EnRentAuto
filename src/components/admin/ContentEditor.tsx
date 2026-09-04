'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_LABELS, routing, type Locale } from '@/i18n/routing';
import { SECTIONS, KEY_LABELS, isLongField } from '@/lib/siteText';
import { cn } from '@/lib/format';

export interface LocaleContent {
  defaults: Record<string, string>;
  overrides: Record<string, string>;
}

/**
 * Редактор текстов сайта.
 *
 * Пустое поле = текст по умолчанию из словаря. Значение показывается
 * как placeholder, поэтому видно, что именно будет на сайте.
 * Кнопка «Сбросить» удаляет переопределение из БД.
 */
export function ContentEditor({ content }: { content: Record<string, LocaleContent> }) {
  const router = useRouter();

  const [locale, setLocale] = useState<Locale>(routing.defaultLocale);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(
      Object.entries(content).map(([l, c]) => [l, { ...c.overrides }]),
    ),
  );
  const [openSection, setOpenSection] = useState<string>(SECTIONS[0].prefix);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const current = content[locale];
  // Стабильная ссылка: иначе useMemo ниже пересчитывался бы на каждый рендер.
  const draft = useMemo(() => drafts[locale] ?? {}, [drafts, locale]);

  /** Ключи, сгруппированные по разделам, с учётом поиска. */
  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SECTIONS.map((section) => {
      const keys = Object.keys(current.defaults)
        .filter((k) => k === section.prefix || k.startsWith(`${section.prefix}.`))
        .filter((k) => {
          if (!needle) return true;
          const value = draft[k] ?? current.defaults[k] ?? '';
          return (
            k.toLowerCase().includes(needle) ||
            value.toLowerCase().includes(needle) ||
            (KEY_LABELS[k] ?? '').toLowerCase().includes(needle)
          );
        })
        .sort();
      return { ...section, keys };
    }).filter((s) => s.keys.length > 0);
  }, [current.defaults, draft, query]);

  /** Сколько полей изменено относительно сохранённого состояния. */
  const changedKeys = useMemo(() => {
    const keys = new Set([...Object.keys(draft), ...Object.keys(current.overrides)]);
    return [...keys].filter((k) => (draft[k] ?? '') !== (current.overrides[k] ?? ''));
  }, [draft, current.overrides]);

  const setValue = (key: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [key]: value } }));

  const reset = (key: string) =>
    setDrafts((prev) => {
      const next = { ...prev[locale] };
      delete next[key];
      return { ...prev, [locale]: next };
    });

  async function save() {
    if (changedKeys.length === 0) return;
    setPending(true);
    setNotice(null);

    // Пустое поле означает «вернуть значение по умолчанию».
    const values: Record<string, string | null> = {};
    for (const key of changedKeys) {
      const value = draft[key];
      values[key] = value === undefined || value.trim() === '' ? null : value;
    }

    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, values }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNotice({ kind: 'error', text: data.error ?? 'Не удалось сохранить' });
        return;
      }
      setNotice({
        kind: 'ok',
        text: `Сохранено: ${data.saved}, сброшено к умолчанию: ${data.reset}. Сайт обновлён.`,
      });
      router.refresh();
    } catch {
      setNotice({ kind: 'error', text: 'Сеть недоступна. Повторите попытку.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ─── Языки ────────────────────────────────────────────────────── */}
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        {routing.locales.map((l) => {
          const item = LOCALE_LABELS[l];
          const edits = Object.keys(drafts[l] ?? {}).length;
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all duration-200',
                l === locale
                  ? 'bg-accent text-ink-950'
                  : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
              )}
            >
              <span aria-hidden>{item.flag}</span>
              {item.native}
              {edits > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    l === locale ? 'bg-ink-950/20' : 'bg-accent/15 text-accent',
                  )}
                >
                  {edits}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Поиск и сохранение ───────────────────────────────────────── */}
      <div className="surface sticky top-16 z-20 flex flex-wrap items-center gap-3 p-3">
        <input
          className="field flex-1 min-w-[220px]"
          placeholder="Поиск по тексту или названию поля…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-xs text-zinc-500">
          {changedKeys.length > 0 ? `Изменено полей: ${changedKeys.length}` : 'Изменений нет'}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending || changedKeys.length === 0}
          className="btn-primary"
        >
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>

      {notice && (
        <div
          role="alert"
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            notice.kind === 'ok'
              ? 'border-signal-active/40 bg-signal-active/10 text-signal-active'
              : 'border-signal-cancel/40 bg-signal-cancel/10 text-signal-cancel',
          )}
        >
          {notice.text}
        </div>
      )}

      {/* ─── Разделы ──────────────────────────────────────────────────── */}
      {grouped.map((section) => {
        const open = query.trim() !== '' || openSection === section.prefix;
        const sectionEdits = section.keys.filter(
          (k) => (draft[k] ?? '') !== (current.overrides[k] ?? ''),
        ).length;

        return (
          <section key={section.prefix} className="surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(open && !query ? '' : section.prefix)}
              className="flex w-full items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-ink-800/40"
            >
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">{section.title}</h2>
                {section.hint && <p className="mt-0.5 text-xs text-zinc-500">{section.hint}</p>}
              </div>
              {sectionEdits > 0 && (
                <span className="badge bg-accent/15 text-accent ring-accent/30">
                  {sectionEdits} изм.
                </span>
              )}
              <span className="text-xs text-zinc-600">{section.keys.length} полей</span>
              <span className="text-zinc-500">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
              <div className="space-y-4 border-t border-ink-700 p-5">
                {section.keys.map((key) => {
                  const fallback = current.defaults[key] ?? '';
                  const value = draft[key] ?? '';
                  const overridden = value.trim() !== '';
                  const long = isLongField(key, fallback);

                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          {KEY_LABELS[key] ?? key.split('.').slice(1).join('.')}
                        </span>
                        <code className="text-[10px] text-zinc-700">{key}</code>
                        {overridden && (
                          <button
                            type="button"
                            onClick={() => reset(key)}
                            className="ms-auto text-[11px] text-accent hover:underline"
                          >
                            Сбросить к умолчанию
                          </button>
                        )}
                      </div>

                      {long ? (
                        <textarea
                          rows={3}
                          className={cn('field resize-y', overridden && 'border-accent/40')}
                          placeholder={fallback}
                          value={value}
                          onChange={(e) => setValue(key, e.target.value)}
                        />
                      ) : (
                        <input
                          className={cn('field', overridden && 'border-accent/40')}
                          placeholder={fallback}
                          value={value}
                          onChange={(e) => setValue(key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {grouped.length === 0 && (
        <div className="surface p-12 text-center text-sm text-zinc-500">
          По запросу «{query}» ничего не найдено
        </div>
      )}
    </div>
  );
}
