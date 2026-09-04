'use client';

import { useState } from 'react';
import { cn } from '@/lib/format';
import { MediaThumb } from '@/components/CarMedia';
import { isVideoUrl, videoMimeFromUrl } from '@/lib/media';

/** Карусель фото и видео автомобиля с миниатюрами. */
export function CarGallery({ images, alt }: { images: { url: string }[]; alt: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="surface grid aspect-[16/10] place-items-center text-5xl text-ink-600">🚗</div>
    );
  }

  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="surface group relative aspect-[16/10] overflow-hidden">
        {isVideoUrl(images[index].url) ? (
          // Выбранный ролик играет сам: посетитель уже открыл карточку.
          <video
            key={images[index].url}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            controls
            aria-label={`${alt} — видео`}
          >
            <source src={images[index].url} type={videoMimeFromUrl(images[index].url)} />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={images[index].url}
            alt={`${alt} — фото ${index + 1}`}
            className="h-full w-full object-cover transition-opacity duration-300"
          />
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Предыдущий кадр"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 px-3 py-2 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-ink-950 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Следующий кадр"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 px-3 py-2 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-ink-950 group-hover:opacity-100"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs text-zinc-300 backdrop-blur">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
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
    </div>
  );
}
