import { prisma } from '@/lib/prisma';
import { ONLINE_WINDOW_MS, BLOCKING_STATUSES } from '@/lib/constants';

/**
 * Аналитика для дашборда.
 * Выручка считается по заказам, которые не отменены:
 *   finalPrice (если машина уже принята) либо плановая сумма + доплаты.
 */

export const REVENUE_STATUSES = ['CONFIRMED', 'ACTIVE', 'COMPLETED'] as const;

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysAgo(n: number): Date {
  return startOfDay(new Date(Date.now() - n * 86_400_000));
}

interface RevenueRow {
  totalPrice: number;
  extraCharge: number;
  finalPrice: number | null;
}

function sumRevenue(rows: RevenueRow[]): number {
  return rows.reduce(
    (acc, b) => acc + (b.finalPrice ?? b.totalPrice + b.extraCharge),
    0,
  );
}

/** Выручка и количество заказов за произвольный период (по дате создания). */
export async function revenueForRange(from: Date, to: Date) {
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: [...REVENUE_STATUSES] },
      createdAt: { gte: from, lte: to },
    },
    select: { totalPrice: true, extraCharge: true, finalPrice: true },
  });
  return { revenue: sumRevenue(rows), orders: rows.length };
}

/** Динамика заказов и выручки по дням за последние N дней. */
export async function dailySeries(days = 14) {
  const from = daysAgo(days - 1);
  const rows = await prisma.booking.findMany({
    where: { createdAt: { gte: from } },
    select: {
      createdAt: true,
      status: true,
      totalPrice: true,
      extraCharge: true,
      finalPrice: true,
    },
  });

  const buckets = new Map<string, { date: string; orders: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(d),
      orders: 0,
      revenue: 0,
    });
  }

  for (const b of rows) {
    const key = b.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if ((REVENUE_STATUSES as readonly string[]).includes(b.status)) {
      bucket.revenue += b.finalPrice ?? b.totalPrice + b.extraCharge;
    }
  }

  return Array.from(buckets.values());
}

/** Топ-5 самых арендуемых автомобилей. */
export async function topCars(limit = 5) {
  const grouped = await prisma.booking.groupBy({
    by: ['carId'],
    where: { status: { in: [...REVENUE_STATUSES] } },
    _count: { _all: true },
    _sum: { totalPrice: true, extraCharge: true },
    orderBy: { _count: { carId: 'desc' } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const cars = await prisma.car.findMany({
    where: { id: { in: grouped.map((g) => g.carId) } },
    select: {
      id: true,
      brand: true,
      model: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
  });
  const byId = new Map(cars.map((c) => [c.id, c]));

  return grouped.map((g) => {
    const car = byId.get(g.carId);
    return {
      id: g.carId,
      title: car ? `${car.brand} ${car.model}` : 'Удалённый автомобиль',
      cover: car?.images[0]?.url ?? null,
      bookings: g._count._all,
      revenue: (g._sum.totalPrice ?? 0) + (g._sum.extraCharge ?? 0),
    };
  });
}

/** Сводка верхних плиток дашборда. */
export async function dashboardSummary() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [
    totalCars,
    maintenanceCars,
    activeRentals,
    newBookings,
    busyNow,
    today,
    month,
    onlineNow,
    todayVisitors,
  ] = await Promise.all([
    prisma.car.count({ where: { isArchived: false } }),
    prisma.car.count({ where: { isArchived: false, status: 'MAINTENANCE' } }),
    prisma.booking.count({ where: { status: 'ACTIVE' } }),
    prisma.booking.count({ where: { status: 'NEW' } }),
    prisma.booking.findMany({
      where: { status: { in: BLOCKING_STATUSES }, startAt: { lte: now }, endAt: { gte: now } },
      select: { carId: true },
      distinct: ['carId'],
    }),
    revenueForRange(todayStart, endOfDay(now)),
    revenueForRange(monthStart, endOfDay(now)),
    prisma.visitorSession.count({ where: { lastSeen: { gte: onlineSince } } }),
    prisma.visitorSession.count({ where: { lastSeen: { gte: todayStart } } }),
  ]);

  return {
    totalCars,
    maintenanceCars,
    availableNow: Math.max(0, totalCars - maintenanceCars - busyNow.length),
    activeRentals,
    newBookings,
    revenueToday: today.revenue,
    ordersToday: today.orders,
    revenueMonth: month.revenue,
    ordersMonth: month.orders,
    onlineNow,
    todayVisitors,
  };
}
