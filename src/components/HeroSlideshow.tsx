'use client';

import { useEffect, useState } from 'react';

export type HeroSlide = { url: string; title: string };

/** Сколько один кадр держится на экране и сколько длится растворение. */
const SLIDE_MS = 6000;
const FADE_MS = 1200;

/**
 * Слайдшоу из фотографий автопарка на первом экране.
 *
 * Все кадры лежат друг на друге, видимым делается один — переход идёт
 * прозрачностью, а не подменой src: подмена дала бы мигание на время
 * загрузки. Соседний кадр браузер успевает подгрузить заранее.
 */
export function HeroSlideshow({ slides, fit }: { slides: HeroSlide[]; fit: 'cover' | 'contain' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;

    // Уважаем системную настройку «уменьшить движение»: показываем один кадр.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      // Пока вкладка в фоне, кадры не листаем — это лишняя работа и трафик.
      if (document.hidden) return;
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <>
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.url}
          src={slide.url}
          alt=""
          aria-hidden="true"
          // Первый кадр нужен сразу, остальные — по мере возможности.
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`hero-photo hero-slide${fit === 'contain' ? ' hero-photo-contain' : ''}`}
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}

      {/* Подпись к текущему кадру: посетитель сразу видит, что это ваши машины. */}
      <div className="pointer-events-none absolute bottom-4 end-4 z-10 flex items-center gap-2">
        <span className="rounded-full bg-ink-950/70 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
          {slides[index].title}
        </span>
        {slides.length > 1 && (
          <span className="flex gap-1.5">
            {slides.map((slide, i) => (
              <span
                key={slide.url}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                  i === index ? 'bg-accent' : 'bg-zinc-600'
                }`}
              />
            ))}
          </span>
        )}
      </div>
    </>
  );
}
