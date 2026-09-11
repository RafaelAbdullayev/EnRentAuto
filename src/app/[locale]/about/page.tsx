import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Link } from '@/i18n/navigation';
import { prisma } from '@/lib/prisma';
import { brandUrl } from '@/lib/brand.client';
import { findBrandImage } from '@/lib/brand';
import {
  getDeveloperProfile,
  isDeveloperPagePublic,
  pickDeveloperTexts,
} from '@/lib/developer';
import { DeveloperRating } from '@/components/DeveloperRating';
import { getMyRating, getRatingSummary } from '@/lib/developerRating';
import { VISITOR_COOKIE } from '@/lib/constants';
import { isHttpUrl, telLink, whatsappLink } from '@/lib/contact';
import { formatNumber } from '@/lib/format';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('metaTitle') };
}

/** Версии берём из package.json, чтобы страница не расходилась с реальностью. */
async function readVersions() {
  try {
    const raw = await readFile(path.join(process.cwd(), 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return (name: string) => (deps[name] ?? '').replace(/^[\^~]/, '');
  } catch {
    return () => '';
  }
}

/**
 * «О сайте» — публичная страница о самом проекте.
 *
 * Четыре раздела: о проекте, возможности, технологии и визитка разработчика.
 * Сверху — полоса быстрых переходов по разделам. Визитка показывается, только
 * если она заполнена и включена в админке; остальные разделы есть всегда,
 * поэтому пункт в шапке никогда не ведёт в пустоту.
 */
export default async function AboutSitePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sid = (await cookies()).get(VISITOR_COOKIE)?.value;

  const [t, dev, profile, photo, version, carCount, summary, myRating] = await Promise.all([
    getTranslations('about'),
    getTranslations('dev'),
    getDeveloperProfile(),
    findBrandImage('developer'),
    readVersions(),
    prisma.car.count({ where: { isArchived: false } }),
    getRatingSummary(),
    getMyRating(sid),
  ]);

  const showDev = isDeveloperPagePublic(profile) && profile !== null;
  const texts = profile ? pickDeveloperTexts(profile, locale) : null;

  const sections = [
    { id: 'project', label: t('navProject') },
    { id: 'features', label: t('navFeatures') },
    { id: 'tech', label: t('navTech') },
    ...(showDev ? [{ id: 'developer', label: t('navDev') }] : []),
  ];

  const projectStats = [
    { value: `${formatNumber(carCount, locale)}+`, label: t('statCars') },
    { value: formatNumber(routing.locales.length, locale), label: t('statLangs') },
    { value: '24/7', label: t('statSupport') },
  ];

  const features = ([1, 2, 3, 4, 5, 6] as const).map((n) => ({
    title: t(`f${n}t`),
    text: t(`f${n}d`),
  }));

  // Что за чем стоит — то же, что в админке «О программе», но для посетителя
  // и с версиями из package.json: видно, что сайт написан, а не собран.
  const stack = [
    {
      group: t('techCore'),
      items: [
        { name: 'TypeScript', version: version('typescript') },
        { name: 'React', version: version('react') },
        { name: 'Next.js', version: version('next') },
        { name: 'Node.js', version: process.version.replace(/^v/, '') },
      ],
    },
    {
      group: t('techData'),
      items: [
        { name: 'PostgreSQL', version: '' },
        { name: 'Prisma ORM', version: version('prisma') },
        { name: 'Zod', version: version('zod') },
      ],
    },
    {
      group: t('techUi'),
      items: [
        { name: 'Tailwind CSS', version: version('tailwindcss') },
        { name: 'next-intl', version: version('next-intl') },
        { name: 'Recharts', version: version('recharts') },
      ],
    },
    {
      group: t('techServer'),
      items: [
        { name: 'Nginx', version: '' },
        { name: 'NextAuth', version: version('next-auth') },
        { name: 'Let’s Encrypt', version: '' },
      ],
    },
  ];

  // ─── Данные визитки ───────────────────────────────────────────────────
  const telegramUrl =
    profile && profile.telegram.trim()
      ? isHttpUrl(profile.telegram)
        ? profile.telegram
        : `https://t.me/${profile.telegram.replace(/^@/, '')}`
      : '';

  const actions = profile
    ? ([
        profile.whatsapp.trim() && {
          href: whatsappLink(profile.whatsapp),
          label: dev('write'),
          primary: true,
          external: true,
        },
        telegramUrl && { href: telegramUrl, label: dev('telegram'), external: true },
        profile.email.trim() && { href: `mailto:${profile.email}`, label: dev('mail') },
        profile.phone.trim() && { href: telLink(profile.phone), label: dev('call') },
      ].filter(Boolean) as {
        href: string;
        label: string;
        primary?: boolean;
        external?: boolean;
      }[])
    : [];

  const links = profile
    ? ([
        isHttpUrl(profile.website) && { href: profile.website, label: dev('site') },
        isHttpUrl(profile.github) && { href: profile.github, label: 'GitHub' },
        isHttpUrl(profile.linkedin) && { href: profile.linkedin, label: 'LinkedIn' },
        isHttpUrl(profile.instagram) && { href: profile.instagram, label: 'Instagram' },
      ].filter(Boolean) as { href: string; label: string }[])
    : [];

  const devStats = profile
    ? ([
        profile.years > 0 && {
          value: `${formatNumber(profile.years, locale)}+`,
          label: dev('years'),
        },
        profile.projects > 0 && {
          value: `${formatNumber(profile.projects, locale)}+`,
          label: dev('projects'),
        },
        profile.city.trim() && { value: profile.city, label: dev('city') },
      ].filter(Boolean) as { value: string; label: string }[])
    : [];

  return (
    <>
      <SiteHeader />

      <main className="pt-32 pb-20 sm:pt-36">
        {/* ─── Шапка страницы и переходы по разделам ────────────────── */}
        <section className="container-page">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t('lead')}
          </p>

          {/* Обычные якоря: работают без JavaScript и переживают перезагрузку */}
          <nav className="mt-7 flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-accent/50 hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </section>

        {/* ─── О проекте ────────────────────────────────────────────── */}
        <section id="project" className="container-page mt-10 scroll-mt-32">
          <div className="surface relative overflow-hidden p-7 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <h2 className="relative text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t('projectTitle')}
            </h2>
            <div className="relative mt-5 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              <p>{t('projectP1')}</p>
              <p>{t('projectP2')}</p>
            </div>

            <dl className="relative mt-8 grid grid-cols-3 gap-3 border-t border-ink-700/70 pt-7 sm:gap-4">
              {projectStats.map((stat) => (
                <div key={stat.label} className="text-center sm:text-start">
                  <dt className="text-lg font-semibold text-white sm:text-3xl">{stat.value}</dt>
                  <dd className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500 sm:text-xs">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Возможности ──────────────────────────────────────────── */}
        <section id="features" className="container-page mt-6 scroll-mt-32">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t('featuresTitle')}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div key={feature.title} className="surface surface-hover group p-6">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-sm font-semibold text-accent transition-transform duration-300 group-hover:scale-110">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Технологии ───────────────────────────────────────────── */}
        <section id="tech" className="container-page mt-6 scroll-mt-32">
          <div className="surface p-7 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t('techTitle')}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t('techText')}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {stack.map((block) => (
                <div key={block.group}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {block.group}
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {block.items.map((item) => (
                      <li
                        key={item.name}
                        className="flex items-baseline gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-3.5 py-2 text-xs text-zinc-300"
                      >
                        {item.name}
                        {item.version && (
                          <span className="font-mono text-[10px] text-accent">{item.version}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-8 border-t border-ink-700/70 pt-6 text-sm text-zinc-500">
              {t('techNote')}
            </p>
          </div>
        </section>

        {/* ─── Разработчик ──────────────────────────────────────────── */}
        {showDev && profile && texts && (
          <section id="developer" className="container-page mt-6 scroll-mt-32">
            <div className="surface relative overflow-hidden p-7 sm:p-10">
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

              <h2 className="relative text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {t('devTitle')}
              </h2>

              <div className="relative mt-7 flex flex-col items-center gap-7 text-center sm:flex-row sm:items-start sm:gap-9 sm:text-start">
                <div className="shrink-0">
                  {photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={brandUrl('developer')}
                      alt={profile.name}
                      className="h-28 w-28 rounded-full object-cover ring-2 ring-accent/30 sm:h-36 sm:w-36"
                    />
                  ) : (
                    <span className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-accent-soft to-accent-deep text-4xl font-bold text-ink-950 sm:h-36 sm:w-36">
                      {profile.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold text-white sm:text-3xl">{profile.name}</p>
                  {texts.role && <p className="mt-1.5 text-lg text-accent">{texts.role}</p>}
                  {texts.tagline && (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
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

              {devStats.length > 0 && (
                <dl className="relative mt-8 grid grid-cols-3 gap-3 border-t border-ink-700/70 pt-7 sm:gap-4">
                  {devStats.map((stat) => (
                    <div key={stat.label} className="text-center sm:text-start">
                      <dt className="text-lg font-semibold text-white sm:text-2xl">{stat.value}</dt>
                      <dd className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500 sm:text-xs">
                        {stat.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {(texts.about || texts.services.length > 0) && (
                <div className="relative mt-8 grid gap-6 border-t border-ink-700/70 pt-7 lg:grid-cols-[1.3fr_1fr]">
                  {texts.about && (
                    <div>
                      <h3 className="text-sm font-semibold text-white">{dev('aboutTitle')}</h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                        {texts.about}
                      </p>
                    </div>
                  )}

                  {texts.services.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white">{dev('servicesTitle')}</h3>
                      <ul className="mt-3 space-y-2.5">
                        {texts.services.map((service) => (
                          <li key={service} className="flex gap-3 text-sm text-zinc-300">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {service}
                          </li>
                        ))}
                      </ul>
                      {texts.priceNote && (
                        <p className="mt-4 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-xs text-zinc-300">
                          {texts.priceNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {profile.skills.length > 0 && (
                <div className="relative mt-7">
                  <h3 className="text-sm font-semibold text-white">{dev('skillsTitle')}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-lg border border-ink-600 bg-ink-900/60 px-3.5 py-2 text-xs text-zinc-300"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Оценка работы: голос привязан к анонимному cookie, поэтому
                  его можно переставить, а накрутка одним человеком не проходит. */}
              <div className="relative mt-7 rounded-xl border border-ink-700 bg-ink-900/50 px-5 py-4">
                <DeveloperRating
                  initialSummary={{ count: summary.count, average: summary.average }}
                  initialMine={myRating}
                />
              </div>

              {links.length > 0 && (
                <div className="relative mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-700/70 pt-6 text-xs text-zinc-500">
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
        )}

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
