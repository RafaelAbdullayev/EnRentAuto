import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/admin/StatCard';
import { MediaThumb } from '@/components/CarMedia';
import { OrdersChart, RevenueChart } from '@/components/admin/DashboardCharts';
import { RevenueReport } from '@/components/admin/RevenueReport';
import { dashboardSummary, dailySeries, topCars } from '@/lib/stats';
import { formatMoney, formatNumber, formatDateTime } from '@/lib/format';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [summary, series, top, latest] = await Promise.all([
    dashboardSummary(),
    dailySeries(14),
    topCars(5),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { car: { select: { brand: true, model: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Дашборд</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Оперативная сводка по автопарку, заказам и выручке.
        </p>
      </header>

      {/* ─── Ключевые метрики ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Всего авто"
          value={formatNumber(summary.totalCars)}
          hint={`${summary.maintenanceCars} на обслуживании`}
          icon="⬢"
        />
        <StatCard
          label="Доступно сейчас"
          value={formatNumber(summary.availableNow)}
          hint="свободны в текущий момент"
          icon="✓"
        />
        <StatCard
          label="Активных аренд"
          value={formatNumber(summary.activeRentals)}
          hint={`${summary.newBookings} новых заявок`}
          icon="▶"
        />
        <StatCard
          label="Выручка за сегодня"
          value={formatMoney(summary.revenueToday)}
          hint={`${summary.ordersToday} заказ. за сутки`}
          icon="₼"
          accent
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Выручка за месяц"
          value={formatMoney(summary.revenueMonth)}
          hint={`${summary.ordersMonth} заказов`}
          icon="◈"
        />
        <StatCard
          label="Онлайн сейчас"
          value={formatNumber(summary.onlineNow)}
          hint={`${summary.todayVisitors} посетителей за сегодня`}
          icon="◉"
        />
        <StatCard label="Новые заявки" value={formatNumber(summary.newBookings)} hint="ждут подтверждения" icon="✱" />
        <StatCard
          label="Средний чек (мес.)"
          value={formatMoney(summary.ordersMonth ? Math.round(summary.revenueMonth / summary.ordersMonth) : 0)}
          hint="по неотменённым заказам"
          icon="≈"
        />
      </div>

      {/* ─── Графики ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">Динамика заказов</h2>
          <p className="mt-1 text-xs text-zinc-500">Последние 14 дней</p>
          <div className="mt-5">
            <OrdersChart data={series} />
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">Выручка по дням</h2>
          <p className="mt-1 text-xs text-zinc-500">Последние 14 дней</p>
          <div className="mt-5">
            <RevenueChart data={series} />
          </div>
        </section>
      </div>

      <RevenueReport />

      {/* ─── Топ-5 и последние заказы ────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">Топ-5 арендуемых авто</h2>
          {top.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">Пока нет данных по заказам.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {top.map((car, i) => (
                <li
                  key={car.id}
                  className="flex items-center gap-4 rounded-xl border border-ink-700 bg-ink-900/50 p-3 transition-colors hover:border-accent/30"
                >
                  <span className="w-5 shrink-0 text-center text-sm font-semibold text-zinc-600">
                    {i + 1}
                  </span>
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                    {car.cover ? (
                      <MediaThumb url={car.cover} />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg text-ink-600">🚗</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{car.title}</div>
                    <div className="text-xs text-zinc-500">{car.bookings} аренд</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-accent">
                    {formatMoney(car.revenue)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Последние заказы</h2>
            <Link href="/admin/bookings" className="text-xs text-accent hover:underline">
              Все заказы →
            </Link>
          </div>
          {latest.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">Заказов пока нет.</p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {latest.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900/50 p-3 transition-colors hover:border-accent/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">
                      {b.customerName}
                      <span className="ml-2 font-mono text-xs text-zinc-600">{b.code}</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {b.car.brand} {b.car.model} · {formatDateTime(b.createdAt)}
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${BOOKING_STATUS_STYLES[b.status]}`}>
                    {BOOKING_STATUS_LABELS[b.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
