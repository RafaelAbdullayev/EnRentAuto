'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';
import { BRAND_ACCEPT } from '@/lib/brand.client';
import { MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN } from '@/lib/settings.client';

const ACCEPT = BRAND_ACCEPT.music;

/**
 * Фоновая музыка: загрузка мелодии, включатель и громкость по умолчанию.
 *
 * Громкость здесь — только стартовая. Посетитель крутит свою, и его выбор
 * запоминается у него в браузере, перебивая это значение.
 */
export function MusicUploader({
  tracks,
  maxTracks,
  enabled,
  volume,
}: {
  tracks: { id: string; url: string; title: string }[];
  maxTracks: number;
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

  const hasFile = tracks.length > 0;
  const full = tracks.length >= maxTracks;

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append('files', file);
      const res = await fetch('/api/admin/music/tracks', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось загрузить мелодии');
        return;
      }
      setNote(data.added === 1 ? 'Мелодия добавлена' : `Добавлено мелодий: ${data.added}`);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/music/tracks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError('Не удалось удалить мелодию');
        return;
      }
      setNote('Мелодия удалена');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
    }
  }

  /** Перестановка соседей: порядок задаёт очередь на сайте. */
  async function move(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= tracks.length) return;

    const order = tracks.map((track) => track.id);
    [order[index], order[next]] = [order[next], order[index]];

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/music/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) {
        setError('Не удалось сохранить порядок');
        return;
      }
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
        Тихие мелодии по кругу на страницах сайта: закончилась одна — начинается
        следующая. Кнопка появляется в левом нижнем углу: посетитель включает,
        выключает, убавляет звук и перескакивает на следующую мелодию сам.
      </p>

      {/* Это ограничение браузеров, а не недоделка — о нём лучше знать сразу. */}
      <p className="mt-3 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 text-xs leading-relaxed text-zinc-400">
        Музыка <b className="text-zinc-300">не начинает играть сама</b>: браузеры
        запрещают включать звук до первого действия человека, обойти это нельзя.
        Посетитель нажимает кнопку — и дальше его выбор запоминается: при следующих
        заходах музыка подхватится сама, как только он щёлкнет по странице.
      </p>

      <div className="mt-5 space-y-5">
        {/* ─── Плейлист ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between">
            <span className="label mb-0">
              Плейлист{tracks.length > 0 && ` — мелодий: ${tracks.length} из ${maxTracks}`}
            </span>
          </div>

          {tracks.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Пока ни одной мелодии не загружено</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {tracks.map((track, index) => (
                <li
                  key={track.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-700 text-xs text-zinc-300">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white" title={track.title}>
                    {track.title || 'Без названия'}
                  </span>

                  <audio src={track.url} controls preload="none" className="h-8 w-56 max-w-full" />

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label="Выше"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-ink-600 text-zinc-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={busy || index === tracks.length - 1}
                      aria-label="Ниже"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-ink-600 text-zinc-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(track.id)}
                      disabled={busy}
                      aria-label={`Удалить «${track.title}»`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-ink-600 text-zinc-500 transition-colors hover:border-signal-cancel/50 hover:text-signal-cancel disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              disabled={busy || full}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) void upload(files);
              }}
              className="field file:me-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-4 file:py-2 file:text-sm file:text-white disabled:opacity-40"
            />
            <p className="mt-1 text-xs text-zinc-600">
              {full
                ? `Плейлист заполнен: ${maxTracks} мелодий — предел. Удалите лишнее, чтобы добавить новое.`
                : `MP3, OGG, M4A, AAC · до 8 МБ каждая, всего до ${maxTracks} мелодий. Можно выбрать сразу несколько. Играют сверху вниз и дальше по кругу.`}
            </p>
          </div>
        </div>

        {/* ─── Включатель ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-700/70 pt-5">
          <div>
            <p className="text-sm font-medium text-white">
              {isOn ? 'Музыка подключена' : 'Музыка отключена'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isOn
                ? 'Кнопка видна посетителям.'
                : 'Кнопки на сайте нет, плейлист сохраняется.'}
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
            title={hasFile ? undefined : 'Сначала загрузите хотя бы одну мелодию'}
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
            Потолок — {MUSIC_VOLUME_MAX}%. Фоновая музыка должна быть едва слышна:
            громче человек просто закрывает вкладку. Рекомендую 10–20%.
          </p>
        </div>
      </div>

      {error && <p className="error-text mt-4">{error}</p>}
      {note && !error && <p className="mt-4 text-sm text-signal-active">{note}</p>}
    </section>
  );
}
