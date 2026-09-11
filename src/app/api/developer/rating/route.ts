import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { VISITOR_COOKIE } from '@/lib/constants';
import { clientKey, tooManyAttempts } from '@/lib/myBookings';
import { getMyRating, getRatingSummary, saveRating } from '@/lib/developerRating';
import { getDeveloperProfile, isDeveloperPagePublic } from '@/lib/developer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ stars: z.coerce.number().int().min(1).max(5) });

/**
 * POST /api/developer/rating — оценка работы разработчика.
 *
 * Маршрут открытый, поэтому три ограничителя: голосовать можно, только пока
 * визитка показана; один голос на cookie посетителя; не больше десяти
 * обращений в минуту с одного адреса — от скриптов, которые будут долбить
 * маршрут по кругу.
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getDeveloperProfile();
    if (!isDeveloperPagePublic(profile)) {
      return NextResponse.json({ error: 'Оценка сейчас недоступна' }, { status: 404 });
    }

    const sid = request.cookies.get(VISITOR_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json(
        { error: 'Не удалось определить посетителя. Обновите страницу и попробуйте снова.' },
        { status: 409 },
      );
    }

    if (tooManyAttempts(clientKey(request, 'rating'), 10, 60_000)) {
      return NextResponse.json({ error: 'Слишком часто. Подождите минуту.' }, { status: 429 });
    }

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Оценка задаётся числом от 1 до 5' }, { status: 422 });
    }

    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '';

    await saveRating(sid, parsed.data.stars, ip);

    return NextResponse.json({
      ok: true,
      mine: await getMyRating(sid),
      summary: await getRatingSummary(),
    });
  } catch (error) {
    console.error('[developer/rating:POST] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить оценку' }, { status: 500 });
  }
}
