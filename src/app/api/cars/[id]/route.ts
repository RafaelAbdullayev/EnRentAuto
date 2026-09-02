import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { carInputSchema, zodErrors } from '@/lib/validation';
import { removeUploadedFile } from '@/lib/upload';
import { logAction } from '@/lib/audit';
import { BLOCKING_STATUSES } from '@/lib/constants';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/cars/[id] — карточка авто со всеми фото. */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const car = await prisma.car.findUnique({
    where: { id },
    include: { images: { orderBy: { position: 'asc' } } },
  });
  if (!car) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });
  return NextResponse.json({ ok: true, car });
}

/**
 * PATCH /api/cars/[id] — редактирование.
 * Массив images полностью заменяет старый набор: файлы, которых больше нет
 * в списке, удаляются с диска, чтобы /public/uploads не разрастался.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.car.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });

    const json = await request.json().catch(() => null);
    const parsed = carInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте заполнение полей', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }
    const { images, plateNumber, color, ...data } = parsed.data;

    const car = await prisma.$transaction(async (tx) => {
      await tx.carImage.deleteMany({ where: { carId: id } });
      return tx.car.update({
        where: { id },
        data: {
          ...data,
          color: color || null,
          plateNumber: plateNumber || null,
          images: { create: images.map((url, position) => ({ url, position })) },
        },
        select: { id: true, brand: true, model: true },
      });
    });

    // Физически удаляем осиротевшие файлы.
    const orphans = existing.images.filter((img) => !images.includes(img.url));
    await Promise.all(orphans.map((img) => removeUploadedFile(img.url)));

    await logAction({
      userId: session.user.id,
      action: 'CAR_UPDATE',
      entity: 'Car',
      entityId: car.id,
      meta: { removedImages: orphans.length },
    });

    return NextResponse.json({ ok: true, car });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Госномер занят другим автомобилем', fields: { plateNumber: 'Номер занят' } },
        { status: 422 },
      );
    }
    console.error('[cars:PATCH] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить изменения' }, { status: 500 });
  }
}

/**
 * DELETE /api/cars/[id]
 *  • по умолчанию — мягкое удаление (архив), история заказов сохраняется;
 *  • ?hard=1 — полное удаление, разрешено только если нет ни одного заказа.
 * Архивировать авто с активной арендой нельзя.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;
  const hard = request.nextUrl.searchParams.get('hard') === '1';

  try {
    const car = await prisma.car.findUnique({
      where: { id },
      include: { images: true, _count: { select: { bookings: true } } },
    });
    if (!car) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });

    const active = await prisma.booking.count({
      where: { carId: id, status: { in: BLOCKING_STATUSES } },
    });
    if (active > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить: по автомобилю есть ${active} незавершённых заказов` },
        { status: 409 },
      );
    }

    if (hard) {
      if (car._count.bookings > 0) {
        return NextResponse.json(
          {
            error:
              'Полное удаление недоступно: по автомобилю есть история заказов. Используйте архивирование.',
          },
          { status: 409 },
        );
      }
      await prisma.car.delete({ where: { id } });
      await Promise.all(car.images.map((img) => removeUploadedFile(img.url)));
      await logAction({
        userId: session.user.id,
        action: 'CAR_DELETE_HARD',
        entity: 'Car',
        entityId: id,
      });
      return NextResponse.json({ ok: true, mode: 'hard' });
    }

    await prisma.car.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date(), status: 'RETIRED' },
    });
    await logAction({
      userId: session.user.id,
      action: 'CAR_ARCHIVE',
      entity: 'Car',
      entityId: id,
    });
    return NextResponse.json({ ok: true, mode: 'archive' });
  } catch (error) {
    console.error('[cars:DELETE] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось удалить автомобиль' }, { status: 500 });
  }
}
