import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchForm } from '@/components/SearchForm';
import { CarCard } from '@/components/CarCard';
import { busyCarIds } from '@/lib/availability';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ from?: string; to?: string; q?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('fleetTitle') };
}

export default async function CarsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const { from, to, q } = await searchParams;

  // Парсим период: если он валиден — скрываем занятые авто.
  let range: { start: Date; end: Date } | null = null;
  if (from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
      range = { start, end };
    }
  }

  const excluded = range ? await busyCarIds(range.start, range.end) : [];

  const cars = await prisma.car.findMany({
    where: {
      isArchived: false,
      status: 'AVAILABLE',
      ...(excluded.length ? { id: { notIn: excluded } } : {}),
      ...(q
        ? {
            OR: [
              { brand: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { images: { orderBy: { position: 'asc' }, take: 1 } },
    orderBy: [{ discount: 'desc' }, { pricePerDay: 'asc' }],
  });

  const query: Record<string, string> = range ? { from: from!, to: to! } : {};

  return (
    <>
      <SiteHeader />

      <main className="pt-28 pb-20">
        <div className="container-page">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            {range
              ? t('hintDates', {
                  from: formatDate(range.start, locale),
                  to: formatDate(range.end, locale),
                  count: cars.length,
                })
              : t('hintNoDates')}
          </p>

          <div className="mt-8">
            <SearchForm defaultFrom={from} defaultTo={to} />
          </div>

          {cars.length === 0 ? (
            <div className="surface mt-10 p-14 text-center">
              <p className="text-lg text-white">{t('emptyTitle')}</p>
              <p className="mt-2 text-sm text-zinc-500">{t('emptyText')}</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} query={query} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
