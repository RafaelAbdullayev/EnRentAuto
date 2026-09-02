'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/format';

/**
 * Загрузчик фотографий: drag-and-drop + выбор файлов.
 * Файлы сразу уходят на /api/upload, компонент хранит массив публичных URL.
 * Порядок можно менять — первое фото становится главным.
 */
export function ImageUploader({
  value,
  onChange,
  max = 12,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (value.length + list.length > max) {
      setError(`Максимум ${max} фотографий на автомобиль`);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      list.forEach((f) => form.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Не удалось загрузить фото');
        return;
      }
      onChange([...value, ...data.urls]);
    } catch {
      setError('Сеть недоступна. Повторите загрузку.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
          dragging
            ? 'border-accent bg-accent/5'
            : 'border-ink-600 bg-ink-900/40 hover:border-accent/50 hover:bg-ink-800/40',
        )}
      >
        <span className="text-3xl text-zinc-600">{uploading ? '⏳' : '⇪'}</span>
        <p className="mt-3 text-sm text-zinc-300">
          {uploading ? 'Загружаем…' : 'Перетащите фото сюда или нажмите для выбора'}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          JPG, PNG, WEBP, AVIF · до 8 МБ · максимум {max} шт.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          hidden
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {value.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url, i) => (
            <li
              key={url}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-ink-600 bg-ink-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />

              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-ink-950">
                  Главное
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink-950/85 p-1.5 opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Левее"
                    onClick={() => move(i, -1)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-ink-700"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="Правее"
                    onClick={() => move(i, 1)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-ink-700"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="rounded-md px-2 py-1 text-xs text-signal-cancel hover:bg-signal-cancel/15"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
