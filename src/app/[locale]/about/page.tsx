import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Link } from '@/i18n/navigation';
import { brandUrl } from '@/lib/brand.client';
import { findBrandImage } from '@/lib/brand';
import {
  getDeveloperProfile,
  isDeveloperPagePublic,
  pickDeveloperTexts,
} from '@/lib/developer';
import { isHttpUrl, telLink, whatsappLink } from '@/lib/contact';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev' });
  return { title: t('metaTitle') };
}

/**
 * «О сайте» — визитка разработчика.
 *
 * Страница целиком собирается из того, что заполнено в админке: пустые поля
 * просто не выводятся, поэтому и короткая визитка, и подробная выглядят
 * законченно. Пока страница не включена — её нет (404), как и пункта в меню.
 */
export default async function AboutSitePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [profile, photo, t] = await Promise.all([
    getDeveloperProfile(),
    findBrandImage('developer'),
    getTranslations('dev'),
  ]);

  if (!isDeveloperPagePublic(profile) || !profile) notFound();

  const texts = pickDeveloperTexts(profile, locale);

  const stats = [
    profile.years > 0 && { value: `${formatNumber(profile.years, locale)}+`, label: t('years') },
    profile.projects > 0 && {
      value: `${formatNumber(profile.projects, locale)}+`,
      label: t('projects'),
    },
    profile.city.trim() && { value: profile.city, label: t('city') },
  ].filter(Boolean) as { value: string; label: string }[];

  const telegramUrl = profile.telegram.trim()
    ? isHttpUrl(profile.telegram)
      ? profile.telegram
      : `https://t.me/${profile.telegram.replace(/^@/, '')}`
    : '';

  const actions = [
    profile.whatsapp.trim() && {
      href: whatsappLink(profile.whatsapp),
      label: t('write'),
      primary: true,
      external: true,
    },
    telegramUrl && { href: telegramUrl, label: t('telegram'), external: true },
    profile.email.trim() && { href: `mailto:${profile.email}`, label: t('mail') },
    profile.phone.trim() && { href: telLink(profile.phone), label: t('call') },
  ].filter(Boolean) as { href: string; label: string; primary?: boolean; external?: boolean }[];

  const links = [
    isHttpUrl(profile.website) && { href: profile.website, label: t('site') },
    isHttpUrl(profile.github) && { href: profile.github, label: 'GitHub' },
    isHttpUrl(profile.linkedin) && { href: profile.linkedin, label: 'LinkedIn' },
    isHttpUrl(profile.instagram) && { href: profile.instagram, label: 'Instagram' },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <>
      <SiteHeader />

      <main className="pt-32 pb-20 sm:pt-36">
        {/* ─── Визитка ──────────────────────────────────────────────── */}
        <section className="container-page">
          <div className="surface relative overflow-hidden p-7 sm:p-10">
            {/* Мягкое золотое свечение в углу — тот же приём, что и на главной */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

            <div className="relative flex flex-col items-center gap-7 text-center sm:flex-row sm:items-start sm:gap-9 sm:text-start">
              <div className="shrink-0">
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={brandUrl('developer')}
                    alt={profile.name}
                    className="h-32 w-32 rounded-full object-cover ring-2 ring-accent/30 sm:h-40 sm:w-40"
                  />
                ) : (
                  <span className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-accent-soft to-accent-deep text-5xl font-bold text-ink-950 sm:h-40 sm:w-40">
                    {profile.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="eyebrow">{t('eyebrow')}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  {profile.name}
                </h1>
                {texts.role && (
                  <p className="mt-2 text-lg text-accent sm:text-xl">{texts.role}</p>
                )}
                {texts.tagline && (
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                    {texts.tagline}
                  </p>
                )}

                {actions.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:justify-start">
                    {actions.map((action) => (
                      <a
                        key={action.href}
                        href={action.href}
                        {...(action.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className={action.primary ? 'btn-primary px-6' : 'btn-ghost'}
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* На телефоне плитки идут в ряд: столбиком они занимали бы
                пол-экрана и отодвигали рассказ о себе за сгиб. */}
            {stats.length > 0 && (
              <dl className="relative mt-9 grid grid-cols-3 gap-3 border-t border-ink-700/70 pt-7 sm:gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center sm:text-start">
                    <dt className="text-lg font-semibold text-white sm:text-3xl">{stat.value}</dt>
                    <dd className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500 sm:text-xs">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {/* ─── О себе и услуги ──────────────────────────────────────── */}
        {(texts.about || texts.services.length > 0) && (
          <section className="container-page mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {texts.about && (
              <div className="surface p-7">
                <h2 className="text-base font-semibold text-white">{t('aboutTitle')}</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                  {texts.about}
                </p>
              </div>
            )}

            {texts.services.length > 0 && (
              <div className="surface p-7">
                <h2 className="text-base font-semibold text-white">{t('servicesTitle')}</h2>
                <ul className="mt-4 space-y-3">
                  {texts.services.map((service) => (
                    <li key={service} className="flex gap-3 text-sm text-zinc-300">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {service}
                    </li>
                  ))}
                </ul>
                {texts.priceNote && (
                  <p className="mt-5 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-xs text-zinc-300">
                    {texts.priceNote}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ─── Технологии ───────────────────────────────────────────── */}
        {profile.skills.length > 0 && (
          <section className="container-page mt-6">
            <div className="surface p-7">
              <h2 className="text-base font-semibold text-white">{t('skillsTitle')}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-lg border border-ink-600 bg-ink-900/60 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:border-accent/40 hover:text-white"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-medium text-white">{t('stackTitle')}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{t('stackText')}</p>
            </div>
          </section>
        )}

        {/* ─── Ссылки и призыв написать ─────────────────────────────── */}
        <section className="container-page mt-6">
          <div className="surface relative overflow-hidden p-7 text-center sm:p-10">
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <h2 className="relative text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t('ctaTitle')}
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm text-zinc-400">{t('ctaText')}</p>

            {actions.length > 0 && (
              <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
                {actions.map((action) => (
                  <a
                    key={`cta-${action.href}`}
                    href={action.href}
                    {...(action.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className={action.primary ? 'btn-primary px-7 py-3' : 'btn-ghost'}
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            )}

            {links.length > 0 && (
              <div className="relative mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-ink-700/70 pt-6 text-xs text-zinc-500">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="container-page mt-8 text-center">
          <Link href="/" className="link-row text-sm text-zinc-500 hover:text-accent">
            ← EnRentAuto
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
