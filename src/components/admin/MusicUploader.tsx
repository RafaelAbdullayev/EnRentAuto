'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';
import { BRAND_ACCEPT, brandUrl } from '@/lib/brand.client';
import { MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN } from '@/lib/settings.client';

/**
 * Фоновая музыка: загрузка мелодии, включатель и громкость по умолчанию.
 *
 * Громкость здесь — только стартовая. Посетитель крутит свою, и его выбор
 * запоминается у него в браузере, перебивая это значение.
 */
export function MusicUploader({
  hasFile,
  enabled,
  volume,
}: {
  hasFile: boolean;
  enabled: boolean;
  volume: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isOn, setIsOn] = useState(enabled);
  const [level, setLevel] = useState(volume);

  // Адрес постоянный, поэтому после замены файла браузер отдал бы старый.
  const [stamp, setStamp] = useState(0);
  const src = `${brandUrl('music')}${stamp ? `?v=${stamp}` : ''}`;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/brand/music', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось загрузить мелодию');
        return;
      }
      setStamp(Date.now());
      setNote('Мелодия загружена');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/brand/music', { method: 'DELETE' });
      if (!res.ok) {
        setError('Не удалось удалить мелодию');
        return;
      }
      setNote('Мелодия удалена — на сайте музыки больше нет');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(patch: { enabled?: boolean; volume?: number }) {
    setError(null);
    try {
      const res = await fetch('/api/admin/music', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Не удалось сохранить настройки');
        return;
      }
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    }
  }

  return (
    <section
      className={cn(
        'rounded-2xl border p-6',
        hasFile && isOn ? 'border-accent/45 bg-accent/[0.07]' : 'surface',
      )}
    >
      <h2 className="text-base font-semibold text-white">Фоновая музыка</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Тихая мелодия по кругу на страницах сайта. Кнопка со значком ноты появляется
        в левом нижнем углу: посетитель включает, выключает и убавляет звук сам.
      </p>

      {/* Это ограничение браузеров, а не недоделка — о нём лучше знать сразу. */}
      <p className="mt-3 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 text-xs leading-relaxed text-zinc-400">
        Музыка <b className="text-zinc-300">не начинает играть сама</b>: браузеры
        запрещают включать звук до первого действия человека, обойти это нельзя.
        Посетитель нажимает кнопку — и дальше его выбор запоминается: при следующих
        заходах музыка подхватится сама, как только он щёлкнет по странице.
      </p>

      <div className="mt-5 space-y-5">
        {/* ─── Файл ──────────────────────────────────────────────────── */}
        <div>
          <span className="label">Мелодия</span>
          {hasFile ? (
            <audio src={src} controls preload="none" className="mt-1 w-full" />
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Пока не загружена</p>
          )}

          <div className="mt-3 flex flex-wrap gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={BRAND_ACCEPT.music}
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
              className="field file:me-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-4 file:py-2 file:text-sm file:text-white"
            />
            {hasFile && (
              <button type="button" onClick={remove} disabled={busy} className="btn-ghost btn-sm">
                Удалить
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            MP3, OGG, M4A, AAC · до 8 МБ. Спокойная петля на 1–3 минуты подойдёт лучше
            всего: длинный трек посетитель всё равно не дослушает, а трафик потратит.
          </p>
        </div>

        {/* ─── Включатель ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-700/70 pt-5">
          <div>
            <p className="text-sm font-medium text-white">
              {isOn ? 'Музыка подключена' : 'Музыка отключена'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isOn
                ? 'Кнопка со значком ноты видна посетителям.'
                : 'Кнопки на сайте нет, файл сохраняется.'}
            </p>
          </div>
          <button
            type="button"
            disabled={!hasFile}
            onClick={() => {
              const value = !isOn;
              setIsOn(value);
              void saveSettings({ enabled: value });
            }}
            className={isOn ? 'btn-ghost btn-sm' : 'btn-primary btn-sm px-6'}
            title={hasFile ? undefined : 'Сначала загрузите мелодию'}
          >
            {isOn ? 'Отключить' : 'Включить на сайте'}
          </button>
        </div>

        {/* ─── Стартовая громкость ───────────────────────────────────── */}
        <div className="border-t border-ink-700/70 pt-5">
          <div className="flex items-center justify-between">
            <span className="label mb-0">Громкость при первом включении</span>
            <span className="text-sm text-accent">{level}%</span>
          </div>
          <input
            type="range"
            min={MUSIC_VOLUME_MIN}
            max={MUSIC_VOLUME_MAX}
            step={1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            onPointerUp={() => void saveSettings({ volume: level })}
            onKeyUp={() => void saveSettings({ volume: level })}
            className="mt-3 h-1 w-full cursor-pointer accent-accent"
          />
          <p className="mt-2 text-xs text-zinc-600">
            Потолок — {MUSIC_VOLUME_MAX}%. Фоновая мелодия должна быть едва слышна:
            громче человек просто закрывает вкладку. Рекомендую 10–20%.
          </p>
        </div>
      </div>

      {error && <p className="error-text mt-4">{error}</p>}
      {note && !error && <p className="mt-4 text-sm text-signal-active">{note}</p>}
    </section>
  );
}
