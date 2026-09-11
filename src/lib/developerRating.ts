import { prisma } from '@/lib/prisma';

/**
 * Оценка работы разработчика посетителями страницы «О сайте».
 *
 * Один голос на посетителя: ключ — анонимный cookie era_sid, тот же, по
 * которому считается «онлайн сейчас». Голос можно переставить: запись
 * обновляется, а не добавляется второй раз. Это не защита от упорной
 * накрутки (cookie чистится), а защита от случайных повторов — за большим
 * приглядывает IP, он сохраняется рядом с голосом.
 */

export interface RatingSummary {
  /** Сколько человек проголосовало. */
  count: number;
  /** Средняя оценка с одним знаком после запятой; 0 — голосов нет. */
  average: number;
  /** Сколько голосов на каждую оценку: [1★, 2★, 3★, 4★, 5★]. */
  buckets: number[];
}

export const EMPTY_SUMMARY: RatingSummary = { count: 0, average: 0, buckets: [0, 0, 0, 0, 0] };

export async function getRatingSummary(): Promise<RatingSummary> {
  try {
    const rows = await prisma.developerRating.groupBy({
      by: ['stars'],
      _count: { _all: true },
    });
    if (rows.length === 0) return EMPTY_SUMMARY;

    const buckets = [0, 0, 0, 0, 0];
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const index = Math.min(5, Math.max(1, row.stars)) - 1;
      buckets[index] += row._count._all;
      total += row._count._all;
      sum += row.stars * row._count._all;
    }

    return { count: total, average: Math.round((sum / total) * 10) / 10, buckets };
  } catch (error) {
    console.error('[rating] не удалось посчитать оценки:', error);
    return EMPTY_SUMMARY;
  }
}

/** Оценка этого посетителя, если он уже голосовал. */
export async function getMyRating(sid: string | undefined): Promise<number | null> {
  if (!sid) return null;
  try {
    const row = await prisma.developerRating.findUnique({
      where: { sid },
      select: { stars: true },
    });
    return row?.stars ?? null;
  } catch (error) {
    console.error('[rating] не удалось прочитать свой голос:', error);
    return null;
  }
}

/** Поставить или переставить оценку. */
export async function saveRating(sid: string, stars: number, ip: string): Promise<void> {
  const value = Math.min(5, Math.max(1, Math.round(stars)));
  await prisma.developerRating.upsert({
    where: { sid },
    update: { stars: value, ip },
    create: { sid, stars: value, ip },
  });
}
