import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { zodErrors } from '@/lib/validation';
import { LOGO_SCALE_MAX, LOGO_SCALE_MIN, saveLogoScale } from '@/lib/settings';

export const runtime = 'nodejs';

const schema = z.object({
  /** Размер логотипа в процентах от обычного. */
  scale: z.coerce.number().int().min(LOGO_SCALE_MIN).max(LOGO_SCALE_MAX),
});

/** PUT /api/admin/logo — размер логотипа в шапке, подвале и на входе. */
export async function PUT(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: `Размер задаётся числом от ${LOGO_SCALE_MIN} до ${LOGO_SCALE_MAX} процентов`,
          fields: zodErrors(parsed.error),
        },
        { status: 422 },
      );
    }

    const scale = await saveLogoScale(parsed.data.scale);

    await logAction({
      userId: session.user.id,
      action: 'LOGO_SCALE_CHANGED',
      entity: 'Settings',
      entityId: 'singleton',
      meta: { scale },
    });

    return NextResponse.json({ ok: true, scale });
  } catch (error) {
    console.error('[admin/logo:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить размер логотипа' }, { status: 500 });
  }
}
