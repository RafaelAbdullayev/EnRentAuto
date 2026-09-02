import { prisma } from '@/lib/prisma';
import { BLOCKING_STATUSES } from '@/lib/constants';

/**
 * Защита от двойного бронирования.
 *
 * Интервалы [aStart, aEnd) и [bStart, bEnd) пересекаются ⟺
 *   aStart < bEnd && aEnd > bStart
 *
 * Учитываются только «блокирующие» статусы: NEW, CONFIRMED, ACTIVE.
 * COMPLETED и CANCELLED машину не занимают.
 */

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  conflicts: { id: string; code: string; startAt: Date; endAt: Date }[];
}

export async function checkCarAvailability(
  carId: string,
  startAt: Date,
  endAt: Date,
  options: { excludeBookingId?: string } = {},
): Promise<AvailabilityResult> {
  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { id: true, isArchived: true, status: true },
  });

  if (!car) return { available: false, reason: 'Автомобиль не найден', conflicts: [] };
  if (car.isArchived)
    return { available: false, reason: 'Автомобиль снят с публикации', conflicts: [] };
  if (car.status !== 'AVAILABLE')
    return {
      available: false,
      reason: 'Автомобиль временно недоступен (обслуживание)',
      conflicts: [],
    };

  const conflicts = await prisma.booking.findMany({
    where: {
      carId,
      status: { in: BLOCKING_STATUSES },
      ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, code: true, startAt: true, endAt: true },
    orderBy: { startAt: 'asc' },
  });

  return {
    available: conflicts.length === 0,
    reason: conflicts.length ? 'Автомобиль уже забронирован на выбранные даты' : undefined,
    conflicts,
  };
}

/**
 * Список ID автомобилей, занятых в интервале, — для фильтрации каталога.
 */
export async function busyCarIds(startAt: Date, endAt: Date): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: BLOCKING_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { carId: true },
    distinct: ['carId'],
  });
  return rows.map((r) => r.carId);
}

/** Генерация короткого читаемого номера заказа: ER-XXXXXX. */
export function generateBookingCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ER-${out}`;
}
