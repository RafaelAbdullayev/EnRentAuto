import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { formatDateTime, formatMoney } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('successTitle') };
}

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('success');
  const e = await getTranslations('enums');

  const { code } = await searchParams;

  const booking = code
    ? await prisma.booking.findUnique({
        where: { code },
        include: { car: { select: { brand: true, model: true, year: true } } },
      })
    : null;

  return (
    <>
      <SiteHeader />

      <main className="pt-32 pb-24">
        <div className="container-page max-w-2xl">
          <div className="surface p-8 text-center sm:p-12">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-signal-active/15 text-3xl text-signal-active">
              ✓
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">{t('title')}</h1>
            <p className="mt-3 text-zinc-400">{t('text')}</p>

            {booking ? (
              <dl className="mt-8 space-y-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-6 text-start text-sm">
                <Row
                  label={t('code')}
                  value={<span className="font-mono text-accent">{booking.code}</span>}
                />
                <Row
                  label={t('car')}
                  value={`${booking.car.brand} ${booking.car.model}, ${booking.car.year}`}
                />
                <Row label={t('start')} value={formatDateTime(booking.startAt, locale)} />
                <Row label={t('end')} value={formatDateTime(booking.endAt, locale)} />
                <Row label={t('term')} value={String(booking.days)} />
                <Row label={t('status')} value={e(`status.${booking.status}`)} />
                <div className="flex justify-between border-t border-ink-700 pt-3">
                  <dt className="text-zinc-400">{t('total')}</dt>
                  <dd className="text-lg font-semibold text-accent">
                    {formatMoney(booking.totalPrice, locale)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-zinc-500">{t('note')}</p>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cars" className="btn-ghost">{t('toCatalog')}</Link>
              <Link href="/" className="btn-primary">{t('toHome')}</Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-end text-zinc-200">{value}</dd>
    </div>
  );
}
