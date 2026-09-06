import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CarGallery } from '@/components/CarGallery';
import { BookingForm } from '@/components/BookingForm';
import { BLOCKING_STATUSES } from '@/lib/constants';
import { formatMoney, formatMoneyMinor, formatDate, toDateTimeLocal } from '@/lib/format';
import { effectivePricePerDay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string; locale: string }>;
type SearchParams = Promise<{ from?: string; to?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const car = await prisma.car.findUnique({
    where: { id },
    select: { brand: true, model: true, year: true },
  });
  if (!car) {
    const e = await getTranslations({ locale, namespace: 'car' });
    return { title: e('notFound') };
  }
  return { title: t('carTitle', { brand: car.brand, model: car.model, year: car.year }) };
}

export default async function CarPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('car');
  const e = await getTranslations('enums');
  const nav = await getTranslations('nav');

  const { from, to } = await searchParams;

  const car = await prisma.car.findFirst({
    where: { id, isArchived: false },
    include: { images: { orderBy: { position: 'asc' } } },
  });
  if (!car) notFound();

  // Ближайшие занятые периоды — показываем клиенту заранее.
  const busy = await prisma.booking.findMany({
    where: { carId: car.id, status: { in: BLOCKING_STATUSES }, endAt: { gte: new Date() } },
    select: { startAt: true, endAt: true },
    orderBy: { startAt: 'asc' },
    take: 5,
  });

  const price = effectivePricePerDay(car.pricePerDay, car.discount);

  const specs = [
    { label: t('year'), value: String(car.year) },
    { label: t('body'), value: e(`body.${car.bodyType}`) },
    { label: t('gearbox'), value: e(`transmission.${car.transmission}`) },
    { label: t('fuel'), value: e(`fuel.${car.fuelType}`) },
    { label: t('seatsLabel'), value: String(car.seats) },
    ...(car.color ? [{ label: t('color'), value: car.color }] : []),
    ...(car.mileageLimit
      ? [{ label: t('mileageLimit'), value: t('mileageValue', { km: car.mileageLimit }) }]
      : [{ label: t('mileage'), value: t('mileageUnlimited') }]),
    // Ставку за перепробег показываем только когда лимит вообще есть
    ...(car.mileageLimit && car.overMileageFeeMinor
      ? [
          {
            label: t('overMileage'),
            value: t('overMileageValue', {
              fee: formatMoneyMinor(car.overMileageFeeMinor, locale),
            }),
          },
        ]
      : []),
    ...(car.deposit ? [{ label: t('deposit'), value: formatMoney(car.deposit, locale) }] : []),
  ];

  return (
    <>
      <SiteHeader />

      <main className="pt-28 pb-20">
        <div className="container-page">
          <nav className="flex flex-wrap items-center text-sm text-zinc-600">
            <Link href="/" className="link-row">{nav('home')}</Link>
            <span className="mx-2">/</span>
            <Link href="/cars" className="link-row">{nav('fleet')}</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-400">{car.brand} {car.model}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
            {/* ─── Левая колонка: фото и характеристики ────────────── */}
            <div>
              <CarGallery images={car.images} alt={`${car.brand} ${car.model}`} />

              <div className="mt-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {car.brand} <span className="text-zinc-400">{car.model}</span>
                  </h1>
                  <div className="text-end">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-accent">
                        {formatMoney(price, locale)}
                      </span>
                      {car.discount > 0 && (
                        <span className="text-sm text-zinc-600 line-through">
                          {formatMoney(car.pricePerDay, locale)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{t('perDay')}</span>
                  </div>
                </div>

                {car.description && (
                  <p className="mt-5 whitespace-pre-line leading-relaxed text-zinc-400">
                    {car.description}
                  </p>
                )}

                <dl className="surface mt-8 grid grid-cols-2 gap-x-8 gap-y-4 p-6 sm:grid-cols-3">
                  {specs.map((s) => (
                    <div key={s.label}>
                      <dt className="text-xs uppercase tracking-wider text-zinc-600">{s.label}</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-200">{s.value}</dd>
                    </div>
                  ))}
                </dl>

                {car.features.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                      {t('featuresTitle')}
                    </h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {car.features.map((f) => (
                        <li
                          key={f}
                          className="rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-accent/40"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {busy.length > 0 && (
                  <div className="surface mt-6 border-signal-new/25 p-5">
                    <h2 className="text-sm font-semibold text-white">{t('busyTitle')}</h2>
                    <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                      {busy.map((b, i) => (
                        <li key={i}>
                          {formatDate(b.startAt, locale)} — {formatDate(b.endAt, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Правая колонка: форма брони ──────────────────────── */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <BookingForm
                carId={car.id}
                pricePerDay={car.pricePerDay}
                discount={car.discount}
                deposit={car.deposit}
                defaultStart={from ? toDateTimeLocal(new Date(`${from}T10:00:00`)) : undefined}
                defaultEnd={to ? toDateTimeLocal(new Date(`${to}T10:00:00`)) : undefined}
              />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
