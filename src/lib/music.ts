import { prisma } from '@/lib/prisma';
import { findBrandImage, brandUrl } from '@/lib/brand';
import { removeUploadedFile } from '@/lib/upload';

/**
 * Плейлист фоновой музыки.
 *
 * Треки лежат обычными загрузками (data/uploads) и отдаются роутом /uploads —
 * тем же, что фотографии машин, с поддержкой Range. Порядок хранится в базе.
 */

/**
 * Потолок на число треков. Больше — и посетитель качает мегабайты, которых
 * никогда не услышит: до пятого трека на сайте проката никто не досидит.
 */
export const MAX_TRACKS = 8;

export type Track = { id: string; url: string; title: string };

/**
 * Список треков по порядку.
 *
 * Если список пуст, а прежний единственный файл (/brand/music) на месте —
 * отдаём его: у того, кто уже загрузил мелодию до появления плейлиста,
 * музыка не должна пропасть после обновления.
 */
export async function getMusicTracks(): Promise<Track[]> {
  try {
    const rows = await prisma.musicTrack.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, url: true, title: true },
    });
    if (rows.length > 0) return rows;

    const legacy = await findBrandImage('music');
    return legacy ? [{ id: 'legacy', url: brandUrl('music'), title: 'Мелодия' }] : [];
  } catch (error) {
    console.error('[music] не удалось прочитать плейлист:', error);
    return [];
  }
}

/** Добавляет треки в конец списка. */
export async function addTracks(items: { url: string; title: string }[]): Promise<void> {
  const last = await prisma.musicTrack.aggregate({ _max: { position: true } });
  const start = (last._max.position ?? -1) + 1;
  await prisma.musicTrack.createMany({
    data: items.map((item, i) => ({ ...item, position: start + i })),
  });
}

/** Удаляет трек вместе с файлом: осиротевшие файлы копятся молча. */
export async function deleteTrack(id: string): Promise<void> {
  const track = await prisma.musicTrack.findUnique({ where: { id }, select: { url: true } });
  if (!track) return;
  await prisma.musicTrack.delete({ where: { id } });
  await removeUploadedFile(track.url);
}

/** Новый порядок. Неизвестные идентификаторы молча пропускаем. */
export async function reorderTracks(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, position) =>
      prisma.musicTrack.updateMany({ where: { id }, data: { position } }),
    ),
  );
}

/** Сколько треков уже загружено — чтобы не пустить сверх потолка. */
export async function countTracks(): Promise<number> {
  return prisma.musicTrack.count();
}
