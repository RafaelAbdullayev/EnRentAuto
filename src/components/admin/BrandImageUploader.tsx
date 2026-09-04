'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';
import { BRAND_ACCEPT, brandUrl, isVideoMime, type BrandKind } from '@/lib/brand.client';

/**
 * Загрузка оформления: логотипа и фона первого экрана.
 * Фоном может быть фотография, GIF или видео. Файл сразу уходит
 * на /api/admin/brand/<вид> и появляется на сайте — пересобирать не нужно.
 */
export function BrandImageUploader({
  kind,
  title,
  description,
  hint,
  hasImage,
  mime,
  previewClassName = 'h-24 w-56',
  previewFit = 'contain',
}: {
  kind: BrandKind;
  title: string;
  description: string;
  hint: string;
  hasImage: boolean;
  /** Тип уже загруженного файла — нужен, чтобы показать видео, а не картинку. */
  mime?: string;
  /** Размер окошка предпросмотра. */
  previewClassName?: string;
  /** Логотип вписываем целиком, фон — кадрируем, как на сайте. */
  previewFit?: 'contain' | 'cover';
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [present, setPresent] = useState(hasImage);
  // Тип текущего файла: обновляем сразу после загрузки, до router.refresh().
  const [currentMime, setCurrentMime] = useState(mime ?? '');
  // Метка времени в адресе: браузер не показывает старую картинку из кэша.
  const [version, setVersion] = useState(0);

  const url = brandUrl(kind);

  async function send(
    request: () => Promise<Response>,
    nextPresent: boolean,
    nextMime = '',
  ) {
    setError(null);
    setBusy(true);
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось сохранить изменения');
        return;
      }
      setPresent(nextPresent);
      setCurrentMime(nextMime);
      setVersion(Date.now());
      router.refresh();
    } catch {
      setError('Сеть недоступна. Повторите попытку.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function upload(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    await send(
      () => fetch(`/api/admin/brand/${kind}`, { method: 'POST', body: form }),
      true,
      file.type,
    );
  }

  async function remove() {
    if (!confirm(`Удалить: ${title.toLowerCase()}?`)) return;
    await send(() => fetch(`/api/admin/brand/${kind}`, { method: 'DELETE' }), false);
  }

  return (
    <section className="surface p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">{description}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            'grid shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-600 bg-ink-950',
            previewFit === 'contain' && 'p-3',
            previewClassName,
          )}
        >
          {present ? (
            isVideoMime(currentMime) ? (
              <video
                src={version ? `${url}?v=${version}` : url}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={version ? `${url}?v=${version}` : url}
                alt={`Текущее оформление: ${title}`}
                className={cn(
                  previewFit === 'cover'
                    ? 'h-full w-full object-cover'
                    : 'max-h-full max-w-full object-contain',
                )}
              />
            )
          ) : (
            <span className="px-3 text-center text-xs text-zinc-600">Не загружено</span>
          )}
        </div>

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
            'flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200',
            dragging
              ? 'border-accent bg-accent/5'
              : 'border-ink-600 bg-ink-900/40 hover:border-accent/50 hover:bg-ink-800/40',
          )}
        >
          <span className="text-2xl text-zinc-600">{busy ? '⏳' : '⇪'}</span>
          <p className="mt-2 text-sm text-zinc-300">
            {busy ? 'Загружаем…' : 'Перетащите файл сюда или нажмите для выбора'}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept={BRAND_ACCEPT[kind]}
            hidden
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {present && (
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          className="mt-4 rounded-lg border border-ink-600 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-signal-cancel/60 hover:text-signal-cancel disabled:opacity-50"
        >
          Удалить
        </button>
      )}
    </section>
  );
}
