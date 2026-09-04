import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export const runtime = 'nodejs';

/** POST /api/cars/[id]/restore — вернуть авто из архива в строй. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }
  const { id } = await params;

  const car = await prisma.car.findUnique({ where: { id }, select: { id: true } });
  if (!car) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });

  await prisma.car.update({
    where: { id },
    data: { isArchived: false, archivedAt: null, status: 'AVAILABLE' },
  });
  await logAction({
    userId: session.user.id,
    action: 'CAR_RESTORE',
    entity: 'Car',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
