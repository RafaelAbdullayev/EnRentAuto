import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { formatDateTime, formatMoney } from '@/lib/format';
import { BOOKING_STATUS_LABELS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Заявка принята' };
export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
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
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
              Заявка принята
            </h1>
            <p className="mt-3 text-zinc-400">
              Менеджер свяжется с вами в течение 15 минут для подтверждения брони.
            </p>

            {booking ? (
              <dl className="mt-8 space-y-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-6 text-left text-sm">
                <Row label="Номер заказа" value={<span className="font-mono text-accent">{booking.code}</span>} />
                <Row
                  label="Автомобиль"
                  value={`${booking.car.brand} ${booking.car.model}, ${booking.car.year}`}
                />
                <Row label="Начало аренды" value={formatDateTime(booking.startAt)} />
                <Row label="Возврат" value={formatDateTime(booking.endAt)} />
                <Row label="Срок" value={`${booking.days} сут.`} />
                <Row label="Статус" value={BOOKING_STATUS_LABELS[booking.status]} />
                <div className="flex justify-between border-t border-ink-700 pt-3">
                  <dt className="text-zinc-400">Итого</dt>
                  <dd className="text-lg font-semibold text-accent">
                    {formatMoney(booking.totalPrice)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-zinc-500">
                Сохраните номер заказа из письма — он понадобится при получении автомобиля.
              </p>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cars" className="btn-ghost">В каталог</Link>
              <Link href="/" className="btn-primary">На главную</Link>
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
      <dd className="text-right text-zinc-200">{value}</dd>
    </div>
  );
}
