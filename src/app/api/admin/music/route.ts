import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { zodErrors } from '@/lib/validation';
import { MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN, saveMusicSettings } from '@/lib/settings';

export const runtime = 'nodejs';

const schema = z.object({
  enabled: z.boolean().optional(),
  volume: z.coerce.number().int().min(MUSIC_VOLUME_MIN).max(MUSIC_VOLUME_MAX).optional(),
});

/** PUT /api/admin/music — включатель фоновой музыки и громкость по умолчанию. */
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
          error: `Громкость задаётся числом от ${MUSIC_VOLUME_MIN} до ${MUSIC_VOLUME_MAX} процентов`,
          fields: zodErrors(parsed.error),
        },
        { status: 422 },
      );
    }

    const music = await saveMusicSettings(parsed.data);

    await logAction({
      userId: session.user.id,
      action: 'MUSIC_SETTINGS_CHANGED',
      entity: 'Settings',
      entityId: 'singleton',
      meta: music,
    });

    return NextResponse.json({ ok: true, music });
  } catch (error) {
    console.error('[admin/music:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить настройки музыки' }, { status: 500 });
  }
}
