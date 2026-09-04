import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/Logo';
import { whatsappLink } from '@/lib/contact';

/** Логотип WhatsApp. Инлайн-SVG: без сторонних запросов и лишних файлов. */
function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-[#25D366]"
    >
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.19h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.13 8.13 0 0 1-1.25-4.32c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.41a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19Z" />
    </svg>
  );
}

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
          <ul className="mt-3 text-sm text-zinc-500">
            <li>
              <Link href="/cars" className="link-row">
                {nav('fleet')}
              </Link>
            </li>
            <li>
              <Link href="/#how" className="link-row">
                {nav('how')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t('contactsTitle')}
          </h3>
          <ul className="mt-3 text-sm text-zinc-500">
            <li>
              {/* Номер ведёт прямо в WhatsApp: там переписка с клиентом
                  начинается в один тап и на телефоне, и на компьютере. */}
              <a
                href={whatsappLink(phone, t('waText'))}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                aria-label={`WhatsApp ${phone}`}
                className="link-row gap-2"
              >
                <WhatsAppIcon />
                {phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} dir="ltr" className="link-row">
                {email}
              </a>
            </li>
            <li className="py-1.5">{t('address')}</li>
            <li className="py-1.5">{t('hours')}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800/80">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-zinc-600 sm:flex-row">
          <span>{t('rights', { year: new Date().getFullYear() })}</span>
          <Link href="/login" className="link-row hover:text-zinc-400">
            {t('staff')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
