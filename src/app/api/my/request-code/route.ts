import { NextResponse, type NextRequest } from 'next/server';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, maskEmail, sendMail } from '@/lib/mail';
import { clientKey, phoneTail, tooManyAttempts } from '@/lib/myBookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(120),
});

/** Срок жизни кода: достаточно, чтобы дойти до почты, мало для перебора. */
const TTL_MS = 15 * 60 * 1000;

/**
 * POST /api/my/request-code — выслать код входа на e-mail.
 *
 * Нужен, когда клиент не помнит номер заказа. Проверяем, что пара
 * «телефон + e-mail» встречается в его бронях, и отправляем шестизначный
 * код на тот самый e-mail. Ответ всегда одинаковый: иначе форма
 * превратилась бы в способ проверять, есть ли у нас такой клиент.
 */
export async function POST(request: NextRequest) {
  if (tooManyAttempts(clientKey(request, 'request-code'), 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите через несколько минут.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: true, sent: false }, { status: 200 });
  }

  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'mail_disabled' }, { status: 503 });
  }

  const tail = phoneTail(parsed.data.phone);
  const email = parsed.data.email.toLowerCase();

  const booking =
    tail.length >= 7
      ? await prisma.booking.findFirst({
          where: { phoneDigits: { endsWith: tail }, email },
          select: { id: true },
        })
      : null;

  // Пары нет — отвечаем как при успехе, но ничего не отправляем.
  if (!booking) {
    return NextResponse.json({ ok: true, hint: maskEmail(email) });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

  // Прежние коды этого клиента гасим: действует только последний.
  await prisma.accessCode.deleteMany({ where: { phoneDigits: tail, usedAt: null } });
  await prisma.accessCode.create({
    data: {
      phoneDigits: tail,
      email,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });

  await sendMail({
    to: email,
    subject: `EnRentAuto — код входа ${code}`,
    text: [
      'Здравствуйте!',
      '',
      `Код для входа в раздел «Мои брони»: ${code}`,
      'Код действует 15 минут.',
      '',
      'Если вы не запрашивали код, просто удалите это письмо.',
    ].join('\n'),
  });

  return NextResponse.json({ ok: true, hint: maskEmail(email) });
}
