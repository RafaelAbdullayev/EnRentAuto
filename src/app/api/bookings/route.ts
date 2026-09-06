import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bookingInputSchema, zodErrors } from '@/lib/validation';
import { checkCarAvailability, generateBookingCode } from '@/lib/availability';
import { calculatePrice } from '@/lib/pricing';
import { logAction } from '@/lib/audit';
import { phoneDigits } from '@/lib/contact';
import { sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * POST /api/bookings — создание брони (публичный роут, регистрация не нужна).
 *
 * Коды ответов:
 *  201 — бронь создана
 *  422 — ошибки валидации полей (fields)
 *  409 — автомобиль занят на выбранные даты
 *  404 — автомобиль не найден
 *  500 — внутренняя ошибка
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    }

    const parsed = bookingInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте заполнение полей', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }
    const input = parsed.data;

    const car = await prisma.car.findUnique({
      where: { id: input.carId },
      select: { id: true, brand: true, model: true, pricePerDay: true, discount: true },
    });
    if (!car) {
      return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });
    }

    // ─── Защита от двойного бронирования ───────────────────────────────
    const availability = await checkCarAvailability(car.id, input.startAt, input.endAt);
    if (!availability.available) {
      return NextResponse.json(
        {
          error: availability.reason ?? 'Автомобиль недоступен на выбранные даты',
          conflicts: availability.conflicts.map((c) => ({
            startAt: c.startAt,
            endAt: c.endAt,
          })),
        },
        { status: 409 },
      );
    }

    const price = calculatePrice(input.startAt, input.endAt, car.pricePerDay, car.discount);

    // Уникальный код с защитой от коллизии.
    let code = generateBookingCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.booking.findUnique({ where: { code }, select: { id: true } });
      if (!exists) break;
      code = generateBookingCode();
    }

    const booking = await prisma.booking.create({
      data: {
        code,
        carId: car.id,
        customerName: input.customerName,
        phone: input.phone,
        // Только цифры — по ним клиент находит свои брони в «Мои брони».
        phoneDigits: phoneDigits(input.phone),
        email: input.email.toLowerCase(),
        documentInfo: input.documentInfo,
        comment: input.comment || null,
        startAt: input.startAt,
        endAt: input.endAt,
        days: price.days,
        pricePerDay: price.pricePerDay,
        discount: car.discount,
        totalPrice: price.total,
        status: 'NEW',
      },
      select: { id: true, code: true, totalPrice: true, days: true, status: true },
    });

    // Письмо с номером заказа: без него клиент потом не найдёт свою бронь.
    // Отправка не блокирует ответ и не может уронить бронирование.
    void sendMail({
      to: input.email,
      subject: `EnRentAuto — заявка ${booking.code}`,
      text: [
        `Здравствуйте, ${input.customerName}!`,
        '',
        `Ваша заявка принята. Номер заказа: ${booking.code}`,
        `Автомобиль: ${car.brand} ${car.model}`,
        `Период: ${input.startAt.toLocaleString('ru-RU')} — ${input.endAt.toLocaleString('ru-RU')}`,
        `Суток: ${price.days}`,
        `Сумма: ${price.total}`,
        '',
        'Сохраните номер заказа — по нему вы найдёте бронь в разделе «Мои брони».',
        'Менеджер свяжется с вами для подтверждения.',
      ].join('\n'),
    });

    await logAction({
      action: 'BOOKING_CREATE',
      entity: 'Booking',
      entityId: booking.id,
      meta: { code: booking.code, car: `${car.brand} ${car.model}`, total: booking.totalPrice },
    });

    return NextResponse.json({ ok: true, booking }, { status: 201 });
  } catch (error) {
    console.error('[bookings:POST] ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
