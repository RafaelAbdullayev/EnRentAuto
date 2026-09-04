import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/Logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  // Контакты редактируются в админке («Тексты сайта» → «Контакты и подвал»).
  const phone = t('phone');
  const email = t('email');

  return (
    <footer id="contacts" className="border-t border-ink-800 bg-ink-950">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size="md" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">{t('about')}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t('serviceTitle')}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
            <li>
              <Link href="/cars" className="transition-colors hover:text-accent">
                {nav('fleet')}
              </Link>
            </li>
            <li>
              <Link href="/#how" className="transition-colors hover:text-accent">
                {nav('how')}
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition-colors hover:text-accent">
                {t('staff')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t('contactsTitle')}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
            <li>
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                dir="ltr"
                className="transition-colors hover:text-accent"
              >
                {phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} dir="ltr" className="transition-colors hover:text-accent">
                {email}
              </a>
            </li>
            <li>{t('address')}</li>
            <li>{t('hours')}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800/80">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-zinc-600 sm:flex-row">
          <span>{t('rights', { year: new Date().getFullYear() })}</span>
          <Link href="/login" className="transition-colors hover:text-zinc-400">
            {t('staff')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
