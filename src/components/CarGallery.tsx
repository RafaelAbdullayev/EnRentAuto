'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';
import { MediaThumb } from '@/components/CarMedia';
import { isVideoUrl, videoMimeFromUrl } from '@/lib/media';

/** Кадр галереи: фотография или ролик — в общей разметке. */
function Frame({
  url,
  alt,
  className,
  autoPlay,
}: {
  url: string;
  alt: string;
  className: string;
  autoPlay: boolean;
}) {
  if (isVideoUrl(url)) {
    return (
      <video
        key={url}
        className={className}
        autoPlay={autoPlay}
        muted
        loop
        playsInline
        controls
        aria-label={alt}
      >
        <source src={url} type={videoMimeFromUrl(url)} />
      </video>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

/**
 * Карусель фото и видео автомобиля.
 *
 * Клик по кадру открывает просмотр во весь экран: посетитель выбирает
 * машину по внешнему виду, и разглядеть её в колонке шириной в половину
 * страницы невозможно. В полноэкранном режиме работают стрелки клавиатуры
 * и Esc, миниатюры остаются под кадром.
 */
export function CarGallery({ images, alt }: { images: { url: string }[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // Начало касания — для листания свайпом на телефоне. Именно ref, а не
  // состояние: между touchstart и touchend перерисовка не нужна.
  const touchX = useRef<number | null>(null);

  const total = images.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total],
  );

  // Клавиатура в полноэкранном режиме + запрет прокрутки страницы под ним.
  useEffect(() => {
    if (!fullscreen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen, go]);

  if (total === 0) {
    return (
      <div className="surface grid aspect-[16/10] place-items-center text-5xl text-ink-600">🚗</div>
    );
  }

  const current = images[index].url;

  return (
    <div className="space-y-3">
      <div className="surface group relative aspect-[16/10] overflow-hidden">
        {/* По фотографии кликают, чтобы рассмотреть машину, — открываем
            её во весь экран. У ролика клик отдан его собственным
            элементам управления, для него есть кнопка в углу. */}
        {isVideoUrl(current) ? (
          <Frame
            url={current}
            alt={`${alt} — ${index + 1} из ${total}`}
            className="h-full w-full object-cover"
            autoPlay
          />
        ) : (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Открыть фото на весь экран"
            className="block h-full w-full cursor-zoom-in"
          >
            <Frame
              url={current}
              alt={`${alt} — ${index + 1} из ${total}`}
              className="h-full w-full object-cover"
              autoPlay
            />
          </button>
        )}

        {/* Кнопка «на весь экран» лежит поверх кадра, но не мешает
            элементам управления видео — они ниже и правее. */}
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Открыть на весь экран"
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink-950/70 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-ink-950 focus-visible:opacity-100 group-hover:opacity-100"
        >
          ⤢
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Предыдущий кадр"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 px-3 py-2 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-ink-950 focus-visible:opacity-100 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Следующий кадр"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 px-3 py-2 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-ink-950 focus-visible:opacity-100 group-hover:opacity-100"
            >
              ›
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs text-zinc-300 backdrop-blur">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                i === index
                  ? 'border-accent opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-90',
              )}
            >
              <MediaThumb url={img.url} />
            </button>
          ))}
        </div>
      )}

      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setFullscreen(false)}
          onTouchStart={(event) => {
            touchX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchX.current;
            touchX.current = null;
            if (start === null) return;
            const delta = event.changedTouches[0].clientX - start;
            // Короткие касания — это тапы, листаем только с заметного свайпа.
            if (Math.abs(delta) > 60) go(delta < 0 ? 1 : -1);
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-ink-950/95 p-4 backdrop-blur-sm sm:p-8"
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Закрыть"
            autoFocus
            className="absolute end-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-ink-800/80 text-xl text-white transition-colors duration-200 hover:bg-ink-700"
          >
            ✕
          </button>

          {/* Клик по самому кадру не должен закрывать просмотр. */}
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-6xl items-center justify-center"
          >
            <Frame
              url={current}
              alt={`${alt} — ${index + 1} из ${total}`}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
              autoPlay
            />
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Предыдущий кадр"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink-800/80 px-4 py-3 text-2xl text-white transition-colors duration-200 hover:bg-ink-700 sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Следующий кадр"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink-800/80 px-4 py-3 text-2xl text-white transition-colors duration-200 hover:bg-ink-700 sm:right-6"
              >
                ›
              </button>

              <div
                onClick={(event) => event.stopPropagation()}
                className="flex max-w-full gap-2 overflow-x-auto pb-1"
              >
                {images.map((img, i) => (
                  <button
                    key={img.url + i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      'relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                      i === index
                        ? 'border-accent opacity-100'
                        : 'border-transparent opacity-40 hover:opacity-80',
                    )}
                  >
                    <MediaThumb url={img.url} />
                  </button>
                ))}
              </div>
            </>
          )}

          <span className="text-xs text-zinc-500">
            {index + 1} / {total}
          </span>
        </div>
      )}
    </div>
  );
}
