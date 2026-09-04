'use client';

import { useRef } from 'react';
import { cn } from '@/lib/format';
import { isVideoUrl, videoMimeFromUrl } from '@/lib/media';

/** Значок «это видео» в углу превью. */
function PlayBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute grid place-items-center rounded-full bg-ink-950/70 text-white backdrop-blur',
        className,
      )}
    >
      ▶
    </span>
  );
}

/**
 * Обложка автомобиля в каталоге.
 *
 * Ролик не играет сам по себе: на странице каталога их может быть много,
 * и одновременная загрузка съела бы трафик посетителя. Видео запускается
 * при наведении и останавливается, когда курсор уходит; на телефоне,
 * где наведения нет, остаётся первый кадр со значком «видео».
 */
export function CarCover({ url, alt }: { url: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const shared =
    'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]';

  if (!isVideoUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} loading="lazy" className={shared} />;
  }

  return (
    <>
      <video
        ref={ref}
        className={shared}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        onMouseEnter={() => void ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => ref.current?.pause()}
      >
        <source src={url} type={videoMimeFromUrl(url)} />
      </video>
      <PlayBadge className="bottom-3 start-3 h-7 w-7 text-[10px]" />
    </>
  );
}

/**
 * Маленькое превью: миниатюра галереи, строка заказа, список автопарка.
 * Видео показывается первым кадром — без автозапуска.
 */
export function MediaThumb({
  url,
  alt = '',
  className = 'h-full w-full object-cover',
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  if (!isVideoUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} />;
  }

  return (
    <>
      <video className={className} muted playsInline preload="metadata" aria-label={alt}>
        <source src={url} type={videoMimeFromUrl(url)} />
      </video>
      <PlayBadge className="bottom-1 end-1 h-5 w-5 text-[8px]" />
    </>
  );
}
