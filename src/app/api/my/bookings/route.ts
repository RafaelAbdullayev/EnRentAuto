import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { bookingsForPhone, clientKey, phoneTail, tooManyAttempts } from '@/lib/myBookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  phone: z.string().trim().min(6).max(30),
  /** Номер заказа, если клиент его записал. */
  code: z.string().trim().min(4).max(30).optional(),
  /** Либо код из письма, если номер заказа забыт. */
  otp: z.string().trim().min(4).max(10).optional(),
});

const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 });

/**
 * POST /api/my/bookings — история броней клиента.
 *
 * Регистрации у нас нет: бронь оформляется без аккаунта. Владение
 * подтверждается одним из двух способов:
 *
 *  1. номер заказа — его клиент получил при бронировании;
 *  2. код из письма — на случай, когда номер заказа не записали.
 *
 * Убедившись, показываем все заказы на этот номер телефона.
 */
export async function POST(request: NextRequest) {
  if (tooManyAttempts(clientKey(request, 'my-bookings'), 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите через несколько минут.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return notFound();

  const tail = phoneTail(parsed.data.phone);
  if (tail.length < 7) return notFound();

  // ─── Вход по номеру заказа ──────────────────────────────────────────
  if (parsed.data.code) {
    const code = parsed.data.code.toUpperCase().replace(/\s+/g, '');
    const booking = await prisma.booking.findUnique({
      where: { code },
      select: { phoneDigits: true },
    });

    // Один и тот же ответ и на неизвестный номер заказа, и на чужой телефон:
    // иначе по коду можно было бы проверять, существует ли заказ.
    if (!booking || !booking.phoneDigits || !booking.phoneDigits.endsWith(tail)) {
      return notFound();
    }

    return NextResponse.json({ ok: true, bookings: await bookingsForPhone(tail) });
  }

  // ─── Вход по коду из письма ─────────────────────────────────────────
  if (parsed.data.otp) {
    const record = await prisma.accessCode.findFirst({
      where: { phoneDigits: tail, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return notFound();

    // Пять неверных попыток — код сгорает, чтобы шестизначное число
    // нельзя было подобрать за время его жизни.
    if (record.attempts >= 5) {
      await prisma.accessCode.delete({ where: { id: record.id } });
      return notFound();
    }

    const ok = await bcrypt.compare(parsed.data.otp.trim(), record.codeHash);
    if (!ok) {
      await prisma.accessCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return notFound();
    }

    await prisma.accessCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ ok: true, bookings: await bookingsForPhone(tail) });
  }

  return notFound();
}
