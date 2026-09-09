import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import {
  carsNeedingTranslation,
  isLimitError,
  translateCar,
} from '@/lib/carTranslations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Сколько машин переводим за один запрос.
 *
 * Не весь парк сразу: сорок машин на пять языков — это минуты работы, а запрос
 * успел бы упереться в таймаут Nginx. Клиент вызывает маршрут по кругу и
 * показывает, сколько осталось.
 */
const BATCH = 3;

/**
 * POST /api/admin/cars/translations — перевести автопарк.
 *
 * Берёт машины, у которых перевода нет или он устарел, и обрабатывает
 * очередную порцию. В ответе — что сделано и сколько машин осталось.
 */
export async function POST() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const queue = await carsNeedingTranslation();
    if (queue.length === 0) {
      return NextResponse.json({ ok: true, processed: [], remaining: 0, limitReached: false });
    }

    const processed: { title: string; done: number; failed: string | null }[] = [];
    let limitReached = false;

    for (const car of queue.slice(0, BATCH)) {
      const result = await translateCar(car.id);
      const failure = result.failed[0]?.error ?? null;

      processed.push({ title: car.title, done: result.done.length, failed: failure });

      // Кончился дневной лимит — дальше идти бессмысленно, только жечь запросы.
      if (failure && isLimitError(failure)) {
        limitReached = true;
        break;
      }
    }

    await logAction({
      userId: session.user.id,
      action: 'CARS_TRANSLATE_BATCH',
      entity: 'Car',
      entityId: 'batch',
      meta: { cars: processed.length, limitReached },
    });

    // Пересчитываем очередь: сколько машин осталось после этой порции.
    const remaining = limitReached ? 0 : (await carsNeedingTranslation()).length;

    return NextResponse.json({ ok: true, processed, remaining, limitReached });
  } catch (error) {
    console.error('[admin/cars/translations:POST] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось перевести автопарк' }, { status: 500 });
  }
}
