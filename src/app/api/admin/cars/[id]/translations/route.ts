import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { zodErrors } from '@/lib/validation';
import { logAction } from '@/lib/audit';
import { routing, type Locale } from '@/i18n/routing';
import {
  TRANSLATABLE_LOCALES,
  carSourceHash,
  translateCar,
} from '@/lib/carTranslations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const localeSchema = z
  .enum(routing.locales as unknown as [Locale, ...Locale[]])
  .refine((l) => l !== routing.defaultLocale, {
    message: 'Русский — базовый язык, для него перевод не хранится',
  });

const translateSchema = z.object({
  /** Один язык или все сразу, если не указан. */
  locale: localeSchema.optional(),
});

const saveSchema = z.object({
  locale: localeSchema,
  description: z.string().trim().max(4000),
  features: z.array(z.string().trim().max(120)).max(30),
});

/**
 * POST /api/admin/cars/[id]/translations — перевести машиной.
 * body: { locale? } — без locale переводятся все языки сразу.
 *
 * Переводы, правленные руками, перезаписываются только при точечном запросе
 * одного языка: администратор в этом случае нажал кнопку осознанно.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = translateSchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }

    const car = await prisma.car.findUnique({ where: { id }, select: { id: true } });
    if (!car) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });

    const single = parsed.data.locale;
    const result = await translateCar(id, {
      locales: single ? [single] : undefined,
      force: Boolean(single),
      overwriteManual: Boolean(single),
    });

    await logAction({
      userId: session.user.id,
      action: 'CAR_TRANSLATE',
      entity: 'Car',
      entityId: id,
      meta: { done: result.done, failed: result.failed.map((f) => f.locale) },
    });

    return NextResponse.json({ ok: true, ...result, translations: await load(id) });
  } catch (error) {
    console.error('[admin/translations:POST] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось перевести описание' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cars/[id]/translations — сохранить перевод, правленный руками.
 * body: { locale, description, features[] }
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await request.json().catch(() => null);
    const parsed = saveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте заполнение полей', fields: zodErrors(parsed.error) },
        { status: 422 },
      );
    }
    const { locale, description, features } = parsed.data;

    const car = await prisma.car.findUnique({
      where: { id },
      select: { description: true, features: true },
    });
    if (!car) return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });

    const hash = carSourceHash({ description: car.description, features: car.features });

    await prisma.carTranslation.upsert({
      where: { carId_locale: { carId: id, locale } },
      update: { description, features, sourceHash: hash, isAuto: false },
      create: { carId: id, locale, description, features, sourceHash: hash, isAuto: false },
    });

    await logAction({
      userId: session.user.id,
      action: 'CAR_TRANSLATION_EDIT',
      entity: 'Car',
      entityId: id,
      meta: { locale },
    });

    return NextResponse.json({ ok: true, translations: await load(id) });
  } catch (error) {
    console.error('[admin/translations:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить перевод' }, { status: 500 });
  }
}

/** Текущее состояние переводов — чтобы клиент обновил форму одним ответом. */
async function load(carId: string) {
  const rows = await prisma.carTranslation.findMany({
    where: { carId, locale: { in: TRANSLATABLE_LOCALES } },
    select: { locale: true, description: true, features: true, sourceHash: true, isAuto: true },
  });
  return rows;
}
