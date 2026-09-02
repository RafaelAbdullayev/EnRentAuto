import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { carInputSchema, zodErrors } from '@/lib/validation';
import { busyCarIds } from '@/lib/availability';
import { logAction } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * GET /api/cars — публичный список авто.
 * Параметры: from, to (ISO/дата) — исключить занятые; q — поиск; body, transmission.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const from = sp.get('from');
    const to = sp.get('to');
    const q = sp.get('q')?.trim();

    let excluded: string[] = [];
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
        excluded = await busyCarIds(start, end);
      }
    }

    const cars = await prisma.car.findMany({
      where: {
        isArchived: false,
        status: 'AVAILABLE',
        ...(excluded.length ? { id: { notIn: excluded } } : {}),
        ...(q
          ? {
              OR: [
                { brand: { contains: q, mode: 'insensitive' as const } },
                { model: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
      orderBy: [{ discount: 'desc' }, { pricePerDay: 'asc' }],
    });

    return NextResponse.json({ ok: true, count: cars.length, cars });
  } catch (error) {
    console.error('[cars:GET] ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/cars — создание автомобиля. Только для сотрудников (ADMIN/MANAGER).
 */
export async function POST(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const json = await request.json().catch(() => null);
    const parsed = carInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте заполнение полей', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }
    const { images, plateNumber, color, ...data } = parsed.data;

    const car = await prisma.car.create({
      data: {
        ...data,
        color: color || null,
        plateNumber: plateNumber || null,
        images: {
          create: images.map((url, position) => ({ url, position })),
        },
      },
      select: { id: true, brand: true, model: true },
    });

    await logAction({
      userId: session.user.id,
      action: 'CAR_CREATE',
      entity: 'Car',
      entityId: car.id,
      meta: { title: `${car.brand} ${car.model}` },
    });

    return NextResponse.json({ ok: true, car }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Автомобиль с таким госномером уже существует', fields: { plateNumber: 'Номер занят' } },
        { status: 422 },
      );
    }
    console.error('[cars:POST] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось создать автомобиль' }, { status: 500 });
  }
}
