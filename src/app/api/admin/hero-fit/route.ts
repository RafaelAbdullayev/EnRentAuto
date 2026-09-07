import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { isHeroFit, setHeroFit } from '@/lib/settings';
import { logAction } from '@/lib/audit';

export const runtime = 'nodejs';

/** PUT /api/admin/hero-fit — как показывать фон первого экрана. */
export async function PUT(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { fit?: string } | null;
  if (!body?.fit || !isHeroFit(body.fit)) {
    return NextResponse.json({ error: 'Недопустимое значение' }, { status: 422 });
  }

  await setHeroFit(body.fit);
  await logAction({
    userId: session.user.id,
    action: 'HERO_FIT_CHANGED',
    entity: 'Settings',
    entityId: 'singleton',
    meta: { fit: body.fit },
  });

  return NextResponse.json({ ok: true });
}
