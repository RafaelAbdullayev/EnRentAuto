import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { phoneDigits } from '@/lib/contact';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  phone: z.string().trim().min(6).max(30),
  code: z.string().trim().min(4).max(30),
});

/**
 * Простая защита от перебора кодов: не больше 10 попыток за 10 минут
 * с одного адреса. Счётчик в памяти процесса — этого достаточно, пока
 * приложение живёт одним экземпляром; при масштабировании переносится в БД.
 */
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || entry.until < now) {
    attempts.set(ip, { count: 1, until: now + WINDOW_MS });
    // Заодно подчищаем протухшие записи, чтобы карта не росла бесконечно.
    if (attempts.size > 5000) {
      for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

/**
 * POST /api/my/bookings — история броней клиента.
 *
 * Регистрации у нас нет: бронь оформляется без аккаунта. Поэтому владение
 * подтверждается парой «номер телефона + код одного из заказов» — угадать
 * их вместе нельзя, а клиенту не нужен ещё один пароль. Убедившись в паре,
 * показываем все заказы на этот номер.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите через несколько минут.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Один и тот же номер клиент вводит по-разному: «+994 70 111 22 33»,
  // «070 111 22 33», «0701112233». Сравниваем по последним девяти цифрам —
  // этого достаточно, чтобы отличить абонента, и код страны уже не мешает.
  const digits = phoneDigits(parsed.data.phone);
  const tail = digits.slice(-9);
  const code = parsed.data.code.toUpperCase().replace(/\s+/g, '');

  if (tail.length < 7) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const booking = await prisma.booking.findUnique({
    where: { code },
    select: { phoneDigits: true },
  });

  // Один и тот же ответ и на неизвестный код, и на чужой номер:
  // иначе по коду можно было бы проверять, существует ли заказ.
  if (!booking || !booking.phoneDigits || !booking.phoneDigits.endsWith(tail)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
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

  return NextResponse.json({ ok: true, bookings });
}
