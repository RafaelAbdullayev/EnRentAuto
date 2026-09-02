import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchForm } from '@/components/SearchForm';
import { CarCard } from '@/components/CarCard';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const [cars, carCount, completedCount] = await Promise.all([
    prisma.car.findMany({
      where: { isArchived: false, status: 'AVAILABLE' },
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
      orderBy: [{ discount: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.car.count({ where: { isArchived: false } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
  ]);

  const advantages = [
    { title: t('advFastT'), text: t('advFastD'), icon: '⚡' },
    { title: t('advInsT'), text: t('advInsD'), icon: '🛡' },
    { title: t('advPriceT'), text: t('advPriceD'), icon: '◆' },
    { title: t('advFleetT'), text: t('advFleetD'), icon: '✦' },
  ];

  const steps = [
    { n: '01', title: t('step1T'), text: t('step1D') },
    { n: '02', title: t('step2T'), text: t('step2D') },
    { n: '03', title: t('step3T'), text: t('step3D') },
  ];

  return (
    <>
      <SiteHeader />

      <main>
        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

          <div className="container-page relative">
            <p className="eyebrow animate-fade-up">{t('eyebrow')}</p>
            <h1 className="mt-5 max-w-3xl animate-fade-up text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t('title1')}
              <span className="block bg-gradient-to-r from-accent-soft via-accent to-accent-deep bg-clip-text text-transparent">
                {t('title2')}
              </span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-zinc-400 sm:text-lg">
              {t('subtitle')}
            </p>

            <div className="mt-10 max-w-3xl animate-fade-up">
              <SearchForm />
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-ink-800 pt-8">
              {[
                { k: `${formatNumber(carCount, locale)}+`, v: t('statCars') },
                { k: `${formatNumber(completedCount, locale)}+`, v: t('statRentals') },
                { k: '24/7', v: t('statSupport') },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-semibold text-white sm:text-3xl">{s.k}</dt>
                  <dd className="mt-1 text-xs text-zinc-500 sm:text-sm">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Каталог ─────────────────────────────────────────────────── */}
        <section className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{t('popularEyebrow')}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {t('popularTitle')}
                </h2>
              </div>
              <Link href="/cars" className="btn-ghost">
                {t('popularAll')}
              </Link>
            </div>

            {cars.length === 0 ? (
              <div className="surface mt-10 p-12 text-center text-zinc-500">
                {t('popularEmpty')}
              </div>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Преимущества ────────────────────────────────────────────── */}
        <section className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <p className="eyebrow">{t('whyEyebrow')}</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t('whyTitle')}
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {advantages.map((item) => (
                <div key={item.title} className="surface surface-hover group p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-lg text-accent transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Как это работает ────────────────────────────────────────── */}
        <section id="how" className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <p className="eyebrow">{t('howEyebrow')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t('howTitle')}
            </h2>

            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.n} className="surface surface-hover relative p-7">
                  <span className="text-5xl font-semibold text-ink-700">{step.n}</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.text}</p>
                </li>
              ))}
            </ol>

            <div className="surface mt-12 flex flex-col items-center justify-between gap-6 border-accent/25 bg-gradient-to-r from-ink-850 to-ink-900 p-8 sm:flex-row sm:p-10">
              <div>
                <h3 className="text-xl font-semibold text-white sm:text-2xl">{t('ctaTitle')}</h3>
                <p className="mt-2 text-sm text-zinc-400">{t('ctaText')}</p>
              </div>
              <Link href="/cars" className="btn-primary shrink-0 px-7 py-3">
                {t('ctaButton')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
