import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { isHeroFit, isHeroMode, saveHeroSettings } from '@/lib/settings';
import { logAction } from '@/lib/audit';

export const runtime = 'nodejs';

/** PUT /api/admin/hero — что показывать фоном первого экрана и как. */
export async function PUT(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mode?: string; fit?: string }
    | null;

  const mode = body?.mode;
  const fit = body?.fit;

  if ((mode && !isHeroMode(mode)) || (fit && !isHeroFit(fit)) || (!mode && !fit)) {
    return NextResponse.json({ error: 'Недопустимое значение' }, { status: 422 });
  }

  await saveHeroSettings({
    ...(isHeroMode(mode ?? '') ? { mode: mode as 'media' | 'cars' } : {}),
    ...(isHeroFit(fit ?? '') ? { fit: fit as 'cover' | 'contain' } : {}),
  });

  await logAction({
    userId: session.user.id,
    action: 'HERO_SETTINGS_CHANGED',
    entity: 'Settings',
    entityId: 'singleton',
    meta: { mode, fit },
  });

  return NextResponse.json({ ok: true });
}
