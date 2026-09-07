import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { bookingActionSchema, zodErrors } from '@/lib/validation';
import { checkCarAvailability } from '@/lib/availability';
import { BLOCKING_STATUSES } from '@/lib/constants';
import { rentalDays } from '@/lib/pricing';
import { logAction } from '@/lib/audit';
import type { BookingStatus } from '@prisma/client';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Допустимые переходы статусов — защита от «кривых» состояний. */
const TRANSITIONS: Record<string, BookingStatus[]> = {
  confirm: ['NEW'],
  issue: ['NEW', 'CONFIRMED'],
  return: ['ACTIVE'],
  complete: ['ACTIVE', 'CONFIRMED'],
  cancel: ['NEW', 'CONFIRMED', 'ACTIVE'],
  reopen: ['CANCELLED'],
};

/** Пометка «тестовый» не зависит от статуса заказа. */
const FLAG_ACTIONS = new Set(['test', 'untest']);

const ACTION_LABELS: Record<string, string> = {
  confirm: 'подтвердить',
  issue: 'выдать машину',
  return: 'принять машину',
  complete: 'завершить',
  cancel: 'отменить',
  reopen: 'вернуть в работу',
  test: 'пометить тестовым',
  untest: 'вернуть в отчёты',
};

/**
 * PATCH /api/admin/bookings/[id] — управление заказом.
 * body: { action, extraCharge?, extraNote?, cancelReason? }
 *
 * «Принять машину» дополнительно считает переработку:
 * если фактический возврат позже плановой даты, каждые начатые сутки
 * добавляются к сумме по тарифу заказа.
 *
 * Отдельно стоят действия test / untest: они не меняют статус, а помечают
 * заказ проверочным. Такой заказ выпадает из выручки, графиков и занятости
 * автомобиля — так убирают суммы, накопившиеся при тестировании сайта.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await request.json().catch(() => null);
    const parsed = bookingActionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }
    const { action, extraCharge = 0, extraNote, cancelReason } = parsed.data;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });

    // ─── Пометка «тестовый» / снятие пометки ─────────────────────────────
    if (FLAG_ACTIONS.has(action)) {
      const isTest = action === 'test';

      // Тестовый заказ дат не занимает. Возвращая его в работу, убеждаемся,
      // что за это время машину не забронировали на те же дни.
      if (!isTest && (BLOCKING_STATUSES as readonly string[]).includes(booking.status)) {
        const availability = await checkCarAvailability(
          booking.carId,
          booking.startAt,
          booking.endAt,
          { excludeBookingId: booking.id },
        );
        if (!availability.available) {
          return NextResponse.json(
            {
              error:
                'Нельзя вернуть в отчёты: даты уже заняты другим заказом. ' +
                'Сначала отмените заказ или измените даты.',
            },
            { status: 409 },
          );
        }
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { isTest },
        include: { car: { select: { brand: true, model: true } } },
      });

      await logAction({
        userId: session.user.id,
        action: isTest ? 'BOOKING_MARK_TEST' : 'BOOKING_UNMARK_TEST',
        entity: 'Booking',
        entityId: id,
        meta: { code: booking.code, amount: booking.finalPrice ?? booking.totalPrice },
      });

      return NextResponse.json({ ok: true, booking: updated, summary: { isTest } });
    }

    if (!TRANSITIONS[action].includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Нельзя ${ACTION_LABELS[action]}: заказ в статусе «${booking.status}»`,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    let data: Record<string, unknown> = {};
    let summary: Record<string, unknown> = {};

    switch (action) {
      case 'confirm':
        data = { status: 'CONFIRMED' };
        break;

      case 'issue':
        data = { status: 'ACTIVE', issuedAt: now };
        break;

      case 'return': {
        // Переработка: сутки сверх плановой даты возврата.
        const overdueDays =
          now > booking.endAt ? rentalDays(booking.endAt, now) : 0;
        const overdueCharge = overdueDays * booking.pricePerDay;
        const totalExtra = overdueCharge + extraCharge;

        data = {
          status: 'COMPLETED',
          returnedAt: now,
          extraCharge: totalExtra,
          extraNote:
            [
              overdueDays > 0 ? `Переработка ${overdueDays} сут.` : null,
              extraNote || null,
            ]
              .filter(Boolean)
              .join('; ') || null,
          finalPrice: booking.totalPrice + totalExtra,
        };
        summary = { overdueDays, overdueCharge, manualExtra: extraCharge };
        break;
      }

      case 'complete':
        data = {
          status: 'COMPLETED',
          returnedAt: booking.returnedAt ?? now,
          finalPrice: booking.finalPrice ?? booking.totalPrice + booking.extraCharge,
        };
        break;

      case 'cancel':
        data = {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelReason: cancelReason || 'Отменён администратором',
        };
        break;

      case 'reopen': {
        // Возврат из отмены возможен, только если даты снова свободны.
        const availability = await checkCarAvailability(
          booking.carId,
          booking.startAt,
          booking.endAt,
          { excludeBookingId: booking.id },
        );
        if (!availability.available) {
          return NextResponse.json(
            { error: availability.reason ?? 'Даты уже заняты другим заказом' },
            { status: 409 },
          );
        }
        data = { status: 'NEW', cancelledAt: null, cancelReason: null };
        break;
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data,
      include: { car: { select: { brand: true, model: true } } },
    });

    await logAction({
      userId: session.user.id,
      action: `BOOKING_${action.toUpperCase()}`,
      entity: 'Booking',
      entityId: id,
      meta: { code: booking.code, ...summary },
    });

    return NextResponse.json({ ok: true, booking: updated, summary });
  } catch (error) {
    console.error('[admin/bookings:PATCH] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось обновить заказ' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/bookings/[id] — удалить заказ насовсем.
 *
 * Доступно только для заказов с пометкой «тестовый»: реальную бронь удалить
 * нельзя ни случайно, ни намеренно — это история компании. Чтобы стереть
 * запись, её сначала помечают тестовой (PATCH action=test).
 */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, code: true, isTest: true, totalPrice: true, finalPrice: true },
    });
    if (!booking) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });

    if (!booking.isTest) {
      return NextResponse.json(
        { error: 'Удалить можно только заказ, помеченный тестовым' },
        { status: 409 },
      );
    }

    await prisma.booking.delete({ where: { id } });

    await logAction({
      userId: session.user.id,
      action: 'BOOKING_DELETE',
      entity: 'Booking',
      entityId: id,
      meta: { code: booking.code, amount: booking.finalPrice ?? booking.totalPrice },
    });

    return NextResponse.json({ ok: true, deleted: booking.code });
  } catch (error) {
    console.error('[admin/bookings:DELETE] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось удалить заказ' }, { status: 500 });
  }
}
