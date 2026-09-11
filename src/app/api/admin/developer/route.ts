import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { zodErrors } from '@/lib/validation';
import { saveDeveloperProfile, translateDeveloperProfile } from '@/lib/developer';

export const runtime = 'nodejs';

const line = (max = 200) => z.string().trim().max(max);

const schema = z.object({
  isPublished: z.boolean(),
  name: line(120),
  role: line(120),
  tagline: line(200),
  about: z.string().trim().max(4000),
  city: line(120),
  years: z.coerce.number().int().min(0).max(60),
  projects: z.coerce.number().int().min(0).max(10_000),
  phone: line(40),
  whatsapp: line(40),
  telegram: line(120),
  email: line(160),
  website: line(300),
  github: line(300),
  linkedin: line(300),
  instagram: line(300),
  skills: z.array(line(60)).max(40),
  services: z.array(line(120)).max(20),
  priceNote: line(300),
});

/**
 * PUT /api/admin/developer — визитка разработчика для страницы «О сайте».
 *
 * Перевод текстов на остальные языки запускается после ответа (`after`),
 * чтобы сохранение оставалось мгновенным.
 */
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
        { error: 'Проверьте заполнение полей', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }

    const profile = await saveDeveloperProfile(parsed.data);

    await logAction({
      userId: session.user.id,
      action: 'DEVELOPER_PROFILE_SAVED',
      entity: 'DeveloperProfile',
      entityId: 'singleton',
      meta: { published: profile.isPublished },
    });

    after(async () => {
      try {
        await translateDeveloperProfile();
      } catch (error) {
        console.error('[developer] фоновый перевод визитки не удался:', error);
      }
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error('[admin/developer:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить данные' }, { status: 500 });
  }
}
