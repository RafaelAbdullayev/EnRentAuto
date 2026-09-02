import Link from 'next/link';

export function SiteFooter() {
  const phone = process.env.NEXT_PUBLIC_SITE_PHONE ?? '+7 (999) 000-00-00';
  return (
    <footer id="contacts" className="border-t border-ink-800 bg-ink-950">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-sm font-bold text-ink-950">
              ER
            </span>
            <span className="text-[15px] font-semibold text-white">
              EnRent<span className="text-accent">Auto</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
            Премиальный автопрокат. Собственный парк, полная страховка, подача автомобиля по
            городу за 60 минут.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Сервис</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
            <li><Link href="/cars" className="transition-colors hover:text-accent">Автопарк</Link></li>
            <li><Link href="/#how" className="transition-colors hover:text-accent">Как арендовать</Link></li>
            <li><Link href="/login" className="transition-colors hover:text-accent">Вход для сотрудников</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Контакты</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
            <li>
              <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="transition-colors hover:text-accent">
                {phone}
              </a>
            </li>
            <li>Москва, Пресненская наб., 12</li>
            <li>Круглосуточно, 7 дней в неделю</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800/80">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-zinc-600 sm:flex-row">
          <span>© {new Date().getFullYear()} EnRentAuto. Все права защищены.</span>
          <Link href="/login" className="transition-colors hover:text-zinc-400">
            Вход для сотрудников
          </Link>
        </div>
      </div>
    </footer>
  );
}
