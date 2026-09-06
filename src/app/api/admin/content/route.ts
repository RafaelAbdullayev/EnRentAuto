import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { isKnownKey, isKnownLocale } from '@/lib/siteText';

export const runtime = 'nodejs';

const bodySchema = z.object({
  locale: z.string().min(2).max(5),
  /**
   * Ключ → новое значение. null означает «вернуть текст по умолчанию»,
   * то есть удалить переопределение из БД.
   */
  values: z.record(z.string(), z.string().max(4000).nullable()),
});

/**
 * PUT /api/admin/content — сохранение правок текстов сайта.
 *
 * Ключи проверяются по белому списку из русского словаря: записать в БД
 * ключ, которого нет в интерфейсе, нельзя. Изменения видны сразу —
 * публичные страницы рендерятся динамически.
 */
export async function PUT(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 422 });
    }
    const { locale, values } = parsed.data;

    if (!isKnownLocale(locale)) {
      return NextResponse.json({ error: `Неизвестный язык: ${locale}` }, { status: 422 });
    }

    const unknown = Object.keys(values).filter((k) => !isKnownKey(k));
    if (unknown.length) {
      return NextResponse.json(
        { error: `Неизвестные ключи: ${unknown.slice(0, 5).join(', ')}` },
        { status: 422 },
      );
    }

    const toDelete = Object.entries(values)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    const toUpsert = Object.entries(values).filter(([, v]) => v !== null) as [string, string][];

    await prisma.$transaction([
      ...(toDelete.length
        ? [prisma.siteText.deleteMany({ where: { locale, key: { in: toDelete } } })]
        : []),
      ...toUpsert.map(([key, value]) =>
        prisma.siteText.upsert({
          where: { locale_key: { locale, key } },
          create: { locale, key, value },
          update: { value },
        }),
      ),
    ]);

    await logAction({
      userId: session.user.id,
      action: 'CONTENT_UPDATE',
      entity: 'SiteText',
      entityId: locale,
      meta: { changed: toUpsert.length, reset: toDelete.length },
    });

    return NextResponse.json({
      ok: true,
      saved: toUpsert.length,
      reset: toDelete.length,
    });
  } catch (error) {
    console.error('[admin/content:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить тексты' }, { status: 500 });
  }
}
