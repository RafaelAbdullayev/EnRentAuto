'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';
import { isVideoUrl, videoMimeFromUrl } from '@/lib/media';

/** Сколько держится фотография перед сменой. */
const PHOTO_MS = 3800;

/** Предохранитель для ролика: длинный кадр не должен останавливать показ. */
const VIDEO_CAP_MS = 12000;

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
 * Обложка автомобиля в каталоге: фотографии и ролики сменяют друг друга.
 *
 * Ограничения, из-за которых код выглядит именно так:
 *
 *   • Смена идёт только пока карточка на экране (IntersectionObserver) и пока
 *     вкладка открыта. Иначе десяток карточек крутил бы таймеры и грузил файлы
 *     впустую — на телефоне это чужой трафик и чужая батарея.
 *   • Кадр грузится в тот момент, когда впервые показан, и дальше остаётся в
 *     разметке: так работает плавное перетекание, и повторный круг уже ничего
 *     не качает.
 *   • Ролик начинает играть, когда доходит очередь, и переключает кадр сам —
 *     по окончании. Предохранитель на 12 секунд спасает от длинного ролика и
 *     от браузера, который не прислал событие.
 *   • При включённом в системе «уменьшении движения» смена выключается: это
 *     просьба человека, а не пожелание.
 */
export function CarCover({ media, alt }: { media: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<number[]>([0]);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Задержка первого переключения у каждой карточки своя: иначе вся сетка
  // моргает разом, и это выглядит как сбой, а не как показ автопарка.
  const offset = useRef(Math.floor(Math.random() * 1200));

  const count = media.length;
  const many = count > 1;
  const current = media[index] ?? '';
  const currentIsVideo = isVideoUrl(current);

  const next = useCallback(() => {
    setIndex((prev) => {
      const value = (prev + 1) % count;
      setShown((list) => (list.includes(value) ? list : [...list, value]));
      return value;
    });
  }, [count]);

  // Просьбу системы «поменьше движения» уважаем: смену выключаем совсем.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    setReduced(query.matches);

    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Карточка вне экрана или спрятанная вкладка не крутят и не играют. Следим
  // даже при единственном ролике: он тоже не должен играть в пустоту.
  useEffect(() => {
    const node = boxRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    let onScreen = false;
    const sync = () => setVisible(onScreen && !document.hidden);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  // Фотография держится PHOTO_MS, ролик двигает очередь сам — по окончании.
  useEffect(() => {
    if (!visible || !many || reduced || currentIsVideo) return;

    const wait = PHOTO_MS + (index === 0 ? offset.current : 0);
    const timer = setTimeout(next, wait);
    return () => clearTimeout(timer);
  }, [visible, many, reduced, currentIsVideo, index, next]);

  // Ролик: запускаем, когда дошла очередь, и страхуем по времени.
  useEffect(() => {
    if (!currentIsVideo) return;

    const video = videoRef.current;
    if (!visible) {
      video?.pause();
      return;
    }

    video?.play().catch(() => undefined);
    if (!many || reduced) return;

    const guard = setTimeout(next, VIDEO_CAP_MS);
    return () => clearTimeout(guard);
  }, [visible, many, reduced, currentIsVideo, index, next]);

  if (count === 0) return null;

  const layerBase = 'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out';
  const rotating = many && !reduced;

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
    >
      {media.map((url, i) => {
        if (!shown.includes(i)) return null;
        const isActive = i === index;
        const layer = cn(layerBase, isActive ? 'opacity-100' : 'opacity-0');

        if (isVideoUrl(url)) {
          return (
            <video
              key={url}
              ref={isActive ? videoRef : undefined}
              className={layer}
              muted
              playsInline
              preload="metadata"
              // Сменить единственный ролик некому — пусть идёт по кругу.
              loop={!rotating}
              aria-label={alt}
              onEnded={rotating ? next : undefined}
              onError={rotating ? next : undefined}
            >
              <source src={url} type={videoMimeFromUrl(url)} />
            </video>
          );
        }

        // eslint-disable-next-line @next/next/no-img-element
        return <img key={url} src={url} alt={alt} loading="lazy" className={layer} />;
      })}

      {currentIsVideo && <PlayBadge className="bottom-3 start-3 z-10 h-7 w-7 text-[10px]" />}

      {many && (
        <div className="pointer-events-none absolute bottom-3 end-3 z-10 flex gap-1">
          {media.map((url, i) => (
            <span
              key={url}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                i === index ? 'w-4 bg-white shadow' : 'w-1 bg-white/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
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
