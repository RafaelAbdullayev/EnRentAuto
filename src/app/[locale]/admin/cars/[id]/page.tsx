import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { CarForm } from '@/components/admin/CarForm';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Редактирование автомобиля' };
export const dynamic = 'force-dynamic';

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: 'asc' } },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 8,
      },
    },
  });
  if (!car) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/cars" className="text-xs text-zinc-500 transition-colors hover:text-accent">
            ← Автопарк
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {car.brand} {car.model}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {car.year} · добавлен {formatDateTime(car.createdAt)}
            {car.isArchived && ' · в архиве'}
          </p>
        </div>
        <Link href={`/cars/${car.id}`} target="_blank" className="btn-ghost">
          Открыть на сайте ↗
        </Link>
      </header>

      <CarForm
        carId={car.id}
        initial={{
          brand: car.brand,
          model: car.model,
          year: car.year,
          bodyType: car.bodyType,
          transmission: car.transmission,
          fuelType: car.fuelType,
          seats: car.seats,
          color: car.color ?? '',
          plateNumber: car.plateNumber ?? '',
          pricePerDay: car.pricePerDay,
          discount: car.discount,
          deposit: car.deposit,
          mileageLimit: car.mileageLimit,
          // В БД ставка лежит в гяпиках, в форме показываем манаты
          overMileageFee: car.overMileageFeeMinor / 100,
          description: car.description,
          features: car.features,
          status: car.status,
          images: car.images.map((i) => i.url),
        }}
      />

      {car.bookings.length > 0 && (
        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">История заказов</h2>
          <ul className="mt-4 divide-y divide-ink-800">
            {car.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm text-white">
                    {b.customerName}
                    <span className="ml-2 font-mono text-xs text-zinc-600">{b.code}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-300">
                    {formatMoney(b.finalPrice ?? b.totalPrice)}
                  </span>
                  <span className={`badge ${BOOKING_STATUS_STYLES[b.status]}`}>
                    {BOOKING_STATUS_LABELS[b.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
