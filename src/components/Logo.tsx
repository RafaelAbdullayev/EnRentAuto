'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';
import { brandUrl } from '@/lib/brand.client';

/**
 * Размеры логотипа. Первое значение — телефон, второе — экран пошире:
 * на телефоне знак должен читаться, но не съедать половину шапки.
 */
const SIZES = {
  sm: { img: 'h-9 max-w-[150px]', mark: 'h-9 w-9 text-xs', text: 'text-[15px]' },
  md: {
    img: 'h-11 max-w-[160px] sm:h-14 sm:max-w-[230px]',
    mark: 'h-11 w-11 text-sm sm:h-14 sm:w-14 sm:text-base',
    text: 'text-[17px] sm:text-xl',
  },
  lg: {
    img: 'h-16 max-w-[240px] sm:h-20 sm:max-w-[300px]',
    mark: 'h-16 w-16 text-lg sm:h-20 sm:w-20 sm:text-xl',
    text: 'text-xl sm:text-2xl',
  },
} as const;

/**
 * Логотип сайта: загруженная картинка плюс название рядом.
 *
 * Картинка администратора (раздел «Оформление» → «Логотип») обычно эмблема,
 * и надпись внутри неё в шапке не читается. Поэтому рядом ставится название
 * текстом — так бренд виден и на телефоне, и на большом экране.
 * Картинки нет или файл недоступен — остаётся фирменный знак «ER» с тем же
 * названием, поэтому шапка никогда не выглядит пустой.
 */
export function Logo({
  size = 'md',
  className,
  hover = false,
  withName = true,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  /** Лёгкое увеличение при наведении — для кликабельной шапки. */
  hover?: boolean;
  /** Показывать название рядом со знаком. */
  withName?: boolean;
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

  return (
    <span className={cn('flex items-center gap-2.5 sm:gap-3', className)}>
      {failed ? (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-soft to-accent-deep font-bold text-ink-950',
            s.mark,
            hover && 'transition-transform duration-300 group-hover:scale-105',
          )}
        >
          ER
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={ref}
          src={brandUrl('logo')}
          alt="EnRentAuto"
          onError={() => setFailed(true)}
          className={cn(
            // Тень отделяет тёмную эмблему от тёмной шапки.
            'w-auto shrink-0 object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]',
            s.img,
            hover && 'transition-transform duration-300 group-hover:scale-105',
          )}
        />
      )}

      {withName && (
        <span
          className={cn(
            'whitespace-nowrap font-semibold leading-none tracking-tight text-white',
            s.text,
          )}
        >
          EnRent<span className="text-accent">Auto</span>
        </span>
      )}
    </span>
  );
}
