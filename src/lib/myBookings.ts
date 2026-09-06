import { prisma } from '@/lib/prisma';
import { phoneDigits } from '@/lib/contact';

/**
 * Общая часть для страницы «Мои брони».
 *
 * Номер телефона сравниваем по последним девяти цифрам: один и тот же
 * человек пишет его то как «+994 70 111 22 33», то как «070 111 22 33».
 */
export const PHONE_TAIL = 9;

export function phoneTail(phone: string): string {
  return phoneDigits(phone).slice(-PHONE_TAIL);
}

/** Список броней клиента — в том виде, в каком его показывает страница. */
export async function bookingsForPhone(tail: string) {
  return prisma.booking.findMany({
    where: { phoneDigits: { endsWith: tail } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      code: true,
      status: true,
      startAt: true,
      endAt: true,
      days: true,
      totalPrice: true,
      extraCharge: true,
      finalPrice: true,
      createdAt: true,
      car: { select: { id: true, brand: true, model: true, year: true } },
    },
  });
}

/**
 * Простая защита от перебора: не больше `max` попыток за окно с одного
 * адреса. Счётчик в памяти процесса — этого достаточно, пока приложение
 * живёт одним экземпляром; при масштабировании переносится в БД.
 */
const attempts = new Map<string, { count: number; until: number }>();

export function tooManyAttempts(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + windowMs });
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > max;
}

/** Адрес обратившегося — за Nginx и Cloudflare реальный IP приходит в заголовке. */
export function clientKey(request: Request, suffix: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `${suffix}:${ip}`;
}
