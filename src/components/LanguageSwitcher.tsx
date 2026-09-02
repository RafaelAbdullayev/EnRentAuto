'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, LOCALE_LABELS, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/format';

/**
 * Переключатель языка. Сохраняет текущий маршрут и параметры,
 * меняя только языковой префикс; выбор запоминается в cookie NEXT_LOCALE.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // Закрываем выпадающий список по клику вне его.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const select = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => {
      // usePathname из next-intl отдаёт путь уже без языкового префикса,
      // поэтому достаточно повторить его с новой локалью, сохранив query.
      const query = searchParams.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { locale: next });
    });
  };

  const current = LOCALE_LABELS[locale];

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'btn-ghost btn-sm gap-1.5',
          pending && 'opacity-60',
          compact && 'px-2.5',
        )}
      >
        <span aria-hidden>{current.flag}</span>
        <span>{compact ? current.short : current.native}</span>
        <span className="text-[10px] text-zinc-500">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-ink-600 bg-ink-850/95 py-1 shadow-card backdrop-blur-xl"
        >
          {routing.locales.map((l) => {
            const item = LOCALE_LABELS[l];
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => select(l)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors duration-150',
                    l === locale
                      ? 'bg-accent/12 text-accent'
                      : 'text-zinc-300 hover:bg-ink-700/70 hover:text-white',
                  )}
                >
                  <span aria-hidden>{item.flag}</span>
                  <span className="flex-1 text-start">{item.native}</span>
                  {l === locale && <span className="text-xs">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
