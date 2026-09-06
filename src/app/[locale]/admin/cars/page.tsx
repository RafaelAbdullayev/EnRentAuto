import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { CarRowActions } from '@/components/admin/CarRowActions';
import { MediaThumb } from '@/components/CarMedia';
import { BODY_TYPE_LABELS, TRANSMISSION_LABELS, CAR_STATUS_LABELS } from '@/lib/constants';
import { formatMoney, cn } from '@/lib/format';
import { effectivePricePerDay } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Автопарк' };
export const dynamic = 'force-dynamic';

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { view = 'active', q } = await searchParams;
  const showArchived = view === 'archived';

  const cars = await prisma.car.findMany({
    where: {
      isArchived: showArchived,
      ...(q
        ? {
            OR: [
              { brand: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
              { plateNumber: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const [activeCount, archivedCount] = await Promise.all([
    prisma.car.count({ where: { isArchived: false } }),
    prisma.car.count({ where: { isArchived: true } }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Автопарк</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cars.length} {showArchived ? 'в архиве' : 'в каталоге'}
          </p>
        </div>
        <Link href="/admin/cars/new" className="btn-primary">
          + Добавить автомобиль
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {[
            { key: 'active', label: `В строю (${activeCount})` },
            { key: 'archived', label: `Архив (${archivedCount})` },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/cars?view=${tab.key}`}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200',
                view === tab.key
                  ? 'bg-accent text-ink-950'
                  : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <form className="ml-auto flex gap-2" action="/admin/cars">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск: марка, модель, номер"
            className="field w-56"
          />
          <button type="submit" className="btn-ghost">Найти</button>
        </form>
      </div>

      {cars.length === 0 ? (
        <div className="surface p-14 text-center">
          <p className="text-lg text-white">
            {showArchived ? 'Архив пуст' : 'В автопарке пока нет машин'}
          </p>
          {!showArchived && (
            <Link href="/admin/cars/new" className="btn-primary mt-6">
              Добавить первый автомобиль
            </Link>
          )}
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-medium">Автомобиль</th>
                  <th className="px-5 py-3 font-medium">Характеристики</th>
                  <th className="px-5 py-3 font-medium">Тариф</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium">Аренд</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {cars.map((car) => {
                  const price = effectivePricePerDay(car.pricePerDay, car.discount);
                  return (
                    <tr key={car.id} className="transition-colors hover:bg-ink-800/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                            {car.images[0] ? (
                              <MediaThumb url={car.images[0].url} />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-lg text-ink-600">🚗</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {car.brand} {car.model}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {car.year}
                              {car.plateNumber ? ` · ${car.plateNumber}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400">
                        {BODY_TYPE_LABELS[car.bodyType]} · {TRANSMISSION_LABELS[car.transmission]} ·{' '}
                        {car.seats} мест
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white">{formatMoney(price)}</div>
                        {car.discount > 0 && (
                          <div className="text-xs text-accent">скидка −{car.discount}%</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'badge',
                            car.status === 'AVAILABLE'
                              ? 'bg-signal-active/15 text-signal-active ring-signal-active/30'
                              : car.status === 'MAINTENANCE'
                                ? 'bg-signal-new/15 text-signal-new ring-signal-new/30'
                                : 'bg-signal-done/15 text-signal-done ring-signal-done/30',
                          )}
                        >
                          {CAR_STATUS_LABELS[car.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">{car._count.bookings}</td>
                      <td className="px-5 py-3.5">
                        <CarRowActions
                          carId={car.id}
                          isArchived={car.isArchived}
                          hasBookings={car._count.bookings > 0}
                          title={`${car.brand} ${car.model}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
