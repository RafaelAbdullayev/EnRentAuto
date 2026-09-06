'use client';

import { useEffect, useRef } from 'react';
import { brandUrl } from '@/lib/brand.client';

/**
 * Видеофон первого экрана: без звука, по кругу, без элементов управления.
 *
 * Атрибутов autoPlay/muted/playsInline достаточно для автозапуска во всех
 * браузерах, но при системной настройке «уменьшить движение» ролик надо
 * остановить — это делается только из JS, поэтому компонент клиентский.
 */
export function HeroVideo({ mime }: { mime: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Браузер может отклонить автозапуск: экономия трафика, режим энергосбережения
    // на телефоне, строгие настройки. Тогда пробуем ещё раз при первом действии
    // посетителя — к этому моменту запуск уже разрешён.
    const retryEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
    const play = () => {
      // muted выставляем и свойством: без него автозапуск запрещён везде.
      video.muted = true;
      return video.play();
    };
    const retry = () => {
      void play().catch(() => undefined);
    };

    const apply = () => {
      if (media.matches) {
        video.pause();
        video.currentTime = 0; // остаётся статичный первый кадр
        return;
      }
      void play().catch(() => {
        retryEvents.forEach((event) =>
          window.addEventListener(event, retry, { once: true, passive: true }),
        );
      });
    };

    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
      retryEvents.forEach((event) => window.removeEventListener(event, retry));
    };
  }, []);

  return (
    <video
      ref={ref}
      className="hero-photo"
      autoPlay
      muted
      loop
      playsInline
      // Фон — главный элемент экрана, грузим сразу, не только метаданные.
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={brandUrl('hero')} type={mime} />
    </video>
  );
}
