'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/format';

const NAV = [
  { href: '/admin', label: 'Дашборд', icon: '◈', exact: true },
  { href: '/admin/cars', label: 'Автопарк', icon: '⬢' },
  { href: '/admin/bookings', label: 'Заказы', icon: '▤' },
  { href: '/admin/online', label: 'Онлайн', icon: '◉' },
];

/**
 * Каркас админки: адаптивный сайдбар + верхняя панель.
 * На мобильных сайдбар превращается в выдвижную панель.
 */
export function AdminShell({
  user,
  newBookings,
  onlineNow,
  children,
}: {
  user: { name?: string | null; email?: string | null; role?: string };
  newBookings: number;
  onlineNow: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-sm font-bold text-ink-950">
          ER
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">EnRentAuto</div>
          <div className="text-[11px] text-zinc-500">Панель управления</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
              isActive(item)
                ? 'bg-accent/12 text-white shadow-inset ring-1 ring-accent/25'
                : 'text-zinc-400 hover:bg-ink-800/70 hover:text-white',
            )}
          >
            <span
              className={cn(
                'text-base transition-colors',
                isActive(item) ? 'text-accent' : 'text-zinc-600 group-hover:text-accent',
              )}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.href === '/admin/bookings' && newBookings > 0 && (
              <span className="rounded-full bg-signal-new/20 px-2 py-0.5 text-[11px] font-medium text-signal-new">
                {newBookings}
              </span>
            )}
            {item.href === '/admin/online' && onlineNow > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-signal-active">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-active" />
                {onlineNow}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-ink-800/70 hover:text-white"
        >
          <span className="text-base text-zinc-600">↗</span> Открыть сайт
        </Link>
        <div className="mt-2 rounded-xl bg-ink-900/70 p-3">
          <div className="truncate text-sm text-zinc-200">{user.name ?? 'Сотрудник'}</div>
          <div className="truncate text-[11px] text-zinc-600">{user.email}</div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-ghost btn-sm mt-3 w-full"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Десктопный сайдбар */}
      <aside className="sticky top-0 hidden h-screen border-r border-ink-800 bg-ink-900/60 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Мобильный сайдбар */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-ink-800 bg-ink-900 lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-800 bg-ink-950/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Меню"
            onClick={() => setOpen(true)}
            className="btn-ghost btn-sm lg:hidden"
          >
            ☰
          </button>
          <div className="flex-1" />
          <span className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-active" />
            Онлайн: <b className="text-white">{onlineNow}</b>
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
