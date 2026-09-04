'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';
import { LOGO_URL } from '@/lib/brand.client';

const SIZES = {
  sm: { img: 'h-8', mark: 'h-8 w-8 text-xs', text: 'text-sm' },
  md: { img: 'h-10', mark: 'h-9 w-9 text-sm', text: 'text-[15px]' },
  lg: { img: 'h-12', mark: 'h-10 w-10 text-sm', text: 'text-base' },
} as const;

/**
 * Логотип сайта.
 *
 * Если администратор загрузил картинку (раздел «Тексты сайта» → «Логотип»),
 * показываем её целиком — вместе с надписью, она часть изображения.
 * Пока логотип не загружен или файл недоступен, остаётся текстовый знак,
 * поэтому шапка никогда не остаётся пустой.
 */
export function Logo({
  size = 'md',
  className,
  hover = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  /** Лёгкое увеличение при наведении — для кликабельной шапки. */
  hover?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const s = SIZES[size];

  // Разметка приходит с сервера, и картинка успевает не загрузиться до
  // гидрации — тогда onError уже некому поймать. Поэтому после монтирования
  // дополнительно проверяем результат загрузки вручную.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (!failed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        ref={ref}
        src={LOGO_URL}
        alt="EnRentAuto"
        onError={() => setFailed(true)}
        className={cn(
          'w-auto max-w-[200px] object-contain',
          s.img,
          hover && 'transition-transform duration-300 group-hover:scale-105',
          className,
        )}
      />
    );
  }

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep font-bold text-ink-950',
          s.mark,
          hover && 'transition-transform duration-300 group-hover:scale-105',
        )}
      >
        ER
      </span>
      <span className={cn('font-semibold tracking-tight text-white', s.text)}>
        EnRent<span className="text-accent">Auto</span>
      </span>
    </span>
  );
}
