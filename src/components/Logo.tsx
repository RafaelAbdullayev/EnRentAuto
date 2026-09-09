'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/format';
import { brandUrl } from '@/lib/brand.client';

/**
 * Размеры логотипа. Первое значение — телефон, второе — экран пошире:
 * на телефоне знак должен читаться, но не съедать половину шапки.
 */
const SIZES = {
  sm: {
    img: 'h-9 max-w-[150px]',
    mark: 'h-9 w-9 text-xs',
    text: 'text-[15px]',
    tag: 'text-[8px] tracking-[0.28em]',
    nameWrap: 'flex',
  },
  md: {
    img: 'h-[52px] max-w-[170px] sm:h-16 sm:max-w-[260px]',
    mark: 'h-[52px] w-[52px] text-sm sm:h-16 sm:w-16 sm:text-base',
    text: 'text-[18px] sm:text-[22px]',
    tag: 'text-[9px] tracking-[0.3em] sm:text-[10px] sm:tracking-[0.34em]',
    // На совсем узких экранах (до 360 px) название прячем: знак крупный и
    // читается сам, а иначе он налезал бы на переключатель языка.
    nameWrap: 'hidden min-[360px]:flex',
  },
  lg: {
    img: 'h-20 max-w-[260px] sm:h-24 sm:max-w-[340px]',
    mark: 'h-20 w-20 text-lg sm:h-24 sm:w-24 sm:text-2xl',
    text: 'text-2xl sm:text-3xl',
    tag: 'text-[10px] tracking-[0.34em] sm:text-xs sm:tracking-[0.38em]',
    nameWrap: 'flex',
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
  const t = useTranslations('nav');
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
    <span className={cn('flex items-center gap-2.5 sm:gap-3.5', className)}>
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
        <span className={cn('flex-col justify-center gap-1', s.nameWrap)}>
          <span
            className={cn(
              'whitespace-nowrap font-semibold leading-none tracking-tight text-white',
              s.text,
            )}
          >
            EnRent<span className="text-accent">Auto</span>
          </span>
          {/* Подпись под названием: «RENT A CAR». Меняется в админке,
              раздел «Тексты сайта» → ключ nav.tagline, для каждого языка свой. */}
          <span
            className={cn(
              'whitespace-nowrap font-medium uppercase leading-none text-accent/70',
              s.tag,
            )}
          >
            {t('tagline')}
          </span>
        </span>
      )}
    </span>
  );
}
