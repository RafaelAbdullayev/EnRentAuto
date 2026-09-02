'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/cars', label: 'Автопарк' },
  { href: '/#how', label: 'Как это работает' },
  { href: '/#contacts', label: 'Контакты' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-ink-700/70 bg-ink-950/80 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-sm font-bold text-ink-950 transition-transform duration-300 group-hover:scale-105">
            ER
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            EnRent<span className="text-accent">Auto</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm text-zinc-400 transition-colors duration-200 hover:bg-ink-800/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cars" className="btn-primary btn-sm hidden sm:inline-flex">
            Забронировать
          </Link>
          <button
            type="button"
            aria-label="Меню"
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost btn-sm md:hidden"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-700 bg-ink-950/95 backdrop-blur-xl md:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-ink-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
