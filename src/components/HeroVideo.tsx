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
    const apply = () => {
      if (media.matches) {
        video.pause();
        video.currentTime = 0; // остаётся статичный первый кадр
      } else {
        void video.play().catch(() => undefined);
      }
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return (
    <video
      ref={ref}
      className="hero-photo"
      autoPlay
      muted
      loop
      playsInline
      // Первый кадр нужен сразу, остальное подгрузится по ходу.
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={brandUrl('hero')} type={mime} />
    </video>
  );
}
