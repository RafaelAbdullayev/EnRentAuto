'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';

export interface DeveloperValues {
  isPublished: boolean;
  name: string;
  role: string;
  tagline: string;
  about: string;
  city: string;
  years: number;
  projects: number;
  phone: string;
  whatsapp: string;
  telegram: string;
  email: string;
  website: string;
  github: string;
  linkedin: string;
  instagram: string;
  skills: string[];
  services: string[];
  priceNote: string;
}

/**
 * Визитка разработчика: всё, что попадёт на страницу «О сайте».
 *
 * Тексты пишутся по-русски и после сохранения переводятся машиной на
 * остальные языки сайта — отдельно ничего заполнять не нужно.
 */
export function DeveloperForm({ initial }: { initial: DeveloperValues }) {
  const router = useRouter();
  const [values, setValues] = useState<DeveloperValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof DeveloperValues>(key: K, value: DeveloperValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/developer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось сохранить');
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ─── Показывать или нет ──────────────────────────────────────── */}
      <section
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-5',
          values.isPublished ? 'border-accent/45 bg-accent/[0.07]' : 'surface',
        )}
      >
        <div>
          <p className="text-base font-semibold text-white">
            {values.isPublished ? 'Страница «О сайте» открыта' : 'Страница «О сайте» скрыта'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {values.isPublished
              ? 'Пункт «О сайте» виден в шапке сайта всем посетителям.'
              : 'Пока выключено, пункта в шапке нет, а страница отвечает «не найдено».'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => set('isPublished', !values.isPublished)}
          className={values.isPublished ? 'btn-ghost btn-sm' : 'btn-primary btn-sm px-6'}
        >
          {values.isPublished ? 'Скрыть страницу' : 'Показать на сайте'}
        </button>
      </section>

      {/* ─── Кто вы ──────────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Кто вы</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Пишите по-русски: на остальные языки переведём сами после сохранения.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Имя или название студии" hint="Без имени страница не показывается">
            <input
              className="field"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Рафаэль Абдуллаев"
            />
          </Field>

          <Field label="Чем занимаетесь">
            <input
              className="field"
              value={values.role}
              onChange={(e) => set('role', e.target.value)}
              placeholder="Full-stack разработчик"
            />
          </Field>

          <Field label="Короткая строка под именем" full>
            <input
              className="field"
              value={values.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="Делаю сайты и системы учёта для бизнеса в Азербайджане"
            />
          </Field>

          <Field label="О себе" hint="Несколько абзацев: опыт, подход, чем полезны" full>
            <textarea
              rows={6}
              className="field"
              value={values.about}
              onChange={(e) => set('about', e.target.value)}
              placeholder="Разрабатываю сайты и внутренние системы с 2016 года…"
            />
          </Field>

          <Field label="Город">
            <input
              className="field"
              value={values.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Баку"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Лет опыта">
              <input
                type="number"
                min={0}
                max={60}
                className="field"
                value={values.years}
                onChange={(e) => set('years', Number(e.target.value))}
              />
            </Field>
            <Field label="Проектов сделано">
              <input
                type="number"
                min={0}
                max={10000}
                className="field"
                value={values.projects}
                onChange={(e) => set('projects', Number(e.target.value))}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ─── Связь ───────────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Как с вами связаться</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Пустые поля на странице не показываются — заполняйте только нужное.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Телефон">
            <input
              className="field"
              dir="ltr"
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+994 50 123 45 67"
            />
          </Field>
          <Field label="WhatsApp" hint="Номер; если тот же — впишите ещё раз">
            <input
              className="field"
              dir="ltr"
              value={values.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="+994 50 123 45 67"
            />
          </Field>
          <Field label="Telegram" hint="Ник без «собаки» или полная ссылка">
            <input
              className="field"
              dir="ltr"
              value={values.telegram}
              onChange={(e) => set('telegram', e.target.value)}
              placeholder="rafael_dev"
            />
          </Field>
          <Field label="E-mail">
            <input
              className="field"
              dir="ltr"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="me@example.com"
            />
          </Field>
          <Field label="Сайт или портфолио">
            <input
              className="field"
              dir="ltr"
              value={values.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://example.com"
            />
          </Field>
          <Field label="GitHub">
            <input
              className="field"
              dir="ltr"
              value={values.github}
              onChange={(e) => set('github', e.target.value)}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field label="LinkedIn">
            <input
              className="field"
              dir="ltr"
              value={values.linkedin}
              onChange={(e) => set('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field label="Instagram">
            <input
              className="field"
              dir="ltr"
              value={values.instagram}
              onChange={(e) => set('instagram', e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
        </div>
      </section>

      {/* ─── Что умеете ──────────────────────────────────────────────── */}
      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Услуги и технологии</h2>

        <div className="mt-5 space-y-5">
          <TagList
            label="Услуги"
            hint="По одной в строке: «Сайты под ключ», «Системы учёта», «Telegram-боты»"
            items={values.services}
            onChange={(items) => set('services', items)}
            placeholder="Сайты под ключ"
          />

          <TagList
            label="Технологии"
            hint="Показываются плитками: Next.js, TypeScript, PostgreSQL…"
            items={values.skills}
            onChange={(items) => set('skills', items)}
            placeholder="Next.js"
          />

          <Field label="Приписка о цене или условиях" hint="Необязательно" full>
            <input
              className="field"
              value={values.priceNote}
              onChange={(e) => set('priceNote', e.target.value)}
              placeholder="Сайт под ключ — от 2 500 ₼, срок 3–4 недели"
            />
          </Field>
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}
      {saved && (
        <p className="text-sm text-signal-active">
          Сохранено. Переводы на другие языки появятся через несколько секунд.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-primary px-8 py-3">
          {busy ? 'Сохраняю…' : 'Сохранить'}
        </button>
        <a href="/about" target="_blank" rel="noopener noreferrer" className="btn-ghost">
          Открыть страницу ↗
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

/**
 * Список строк с добавлением и удалением.
 * Значения хранятся массивом, поэтому пустые строки сюда не попадают —
 * их отсекаем при добавлении.
 */
function TagList({
  label,
  hint,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (!value || items.includes(value) || items.length >= 40) return;
    onChange([...items, value]);
    setDraft('');
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input
          className="field"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="btn-ghost shrink-0">
          Добавить
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-600">{hint}</p>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-1.5 text-xs text-zinc-300"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== item))}
                className="text-zinc-600 transition-colors hover:text-signal-cancel"
                aria-label={`Убрать «${item}»`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
