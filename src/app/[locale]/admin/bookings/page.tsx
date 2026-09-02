import Link from 'next/link';
import type { Metadata } from 'next';
import type { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BookingActions } from '@/components/admin/BookingActions';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/lib/constants';
import { formatDateTime, formatMoney, cn } from '@/lib/format';

export const metadata: Metadata = { title: 'Заказы' };
export const dynamic = 'force-dynamic';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'NEW', label: 'Новые' },
  { key: 'CONFIRMED', label: 'Подтверждённые' },
  { key: 'ACTIVE', label: 'Активные' },
  { key: 'COMPLETED', label: 'Завершённые' },
  { key: 'CANCELLED', label: 'Отменённые' },
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = 'all', q } = await searchParams;

  const where: Prisma.BookingWhereInput = {
    ...(status !== 'all' ? { status: status as BookingStatus } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [bookings, counts] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        car: {
          select: {
            brand: true,
            model: true,
            year: true,
            plateNumber: true,
            images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((a, c) => a + c._count._all, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Заказы</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Лента бронирований: подтверждение, выдача и приём автомобилей.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const n = tab.key === 'all' ? total : (countByStatus[tab.key] ?? 0);
            return (
              <Link
                key={tab.key}
                href={`/admin/bookings?status=${tab.key}`}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200',
                  status === tab.key
                    ? 'bg-accent text-ink-950'
                    : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
                )}
              >
                {tab.label} <span className="opacity-60">{n}</span>
              </Link>
            );
          })}
        </div>

        <form className="ml-auto flex gap-2" action="/admin/bookings">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Номер, ФИО, телефон, e-mail"
            className="field w-60"
          />
          <button type="submit" className="btn-ghost">Найти</button>
        </form>
      </div>

      {bookings.length === 0 ? (
        <div className="surface p-14 text-center text-zinc-500">Заказов не найдено</div>
      ) : (
        <ul className="space-y-4">
          {bookings.map((b) => (
            <li key={b.id} className="surface surface-hover p-5">
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                {/* Клиент */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-600">{b.code}</span>
                    <span className={`badge ${BOOKING_STATUS_STYLES[b.status]}`}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-white">{b.customerName}</h3>
                  <dl className="mt-2 space-y-1 text-xs text-zinc-500">
                    <div>
                      <a href={`tel:${b.phone}`} className="transition-colors hover:text-accent">{b.phone}</a>
                      {' · '}
                      <a href={`mailto:${b.email}`} className="transition-colors hover:text-accent">{b.email}</a>
                    </div>
                    <div>Документ: {b.documentInfo}</div>
                    {b.comment && <div className="text-zinc-400">Комментарий: {b.comment}</div>}
                    <div>Создан: {formatDateTime(b.createdAt)}</div>
                  </dl>
                </div>

                {/* Автомобиль */}
                <div className="flex items-start gap-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                    {b.car.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.car.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg text-ink-600">🚗</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {b.car.brand} {b.car.model}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {b.car.year}
                      {b.car.plateNumber ? ` · ${b.car.plateNumber}` : ''}
                    </div>
                  </div>
                </div>

                {/* Даты и деньги */}
                <div className="text-xs">
                  <Row label="Начало (план)" value={formatDateTime(b.startAt)} />
                  <Row label="Возврат (план)" value={formatDateTime(b.endAt)} />
                  {b.issuedAt && (
                    <Row label="Выдана" value={formatDateTime(b.issuedAt)} accent />
                  )}
                  {b.returnedAt && (
                    <Row label="Принята" value={formatDateTime(b.returnedAt)} accent />
                  )}
                  <div className="mt-2 flex items-baseline justify-between border-t border-ink-700 pt-2">
                    <span className="text-zinc-500">
                      {b.days} сут. × {formatMoney(b.pricePerDay)}
                    </span>
                    <span className="text-sm font-semibold text-accent">
                      {formatMoney(b.finalPrice ?? b.totalPrice)}
                    </span>
                  </div>
                  {b.extraCharge > 0 && (
                    <div className="mt-1 text-signal-cancel">
                      Доплата: {formatMoney(b.extraCharge)}
                      {b.extraNote ? ` — ${b.extraNote}` : ''}
                    </div>
                  )}
                  {b.cancelReason && (
                    <div className="mt-1 text-zinc-500">Причина отмены: {b.cancelReason}</div>
                  )}
                </div>

                {/* Действия */}
                <div className="lg:w-64">
                  <BookingActions bookingId={b.id} status={b.status} totalPrice={b.totalPrice} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-zinc-600">{label}</span>
      <span className={accent ? 'text-signal-active' : 'text-zinc-300'}>{value}</span>
    </div>
  );
}
