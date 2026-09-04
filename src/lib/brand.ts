import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALLOWED_MIME, EXT_TO_MIME, MAX_BYTES, UPLOAD_DIR, UploadError } from '@/lib/upload';
import { isVideoMime, type BrandKind } from '@/lib/brand.client';

/**
 * Оформление сайта: логотип и фон первого экрана (фотография или видео).
 *
 * Файлы лежат рядом с фотографиями машин (data/uploads/brand/<вид>.<ext>),
 * а не в /public: Next.js составляет список /public на старте, поэтому
 * загруженный после `next start` файл отдавался бы как 404. Отдача идёт
 * роутом /brand/<вид>, так что оформление меняется из админки без пересборки.
 */
export const BRAND_DIR = path.join(UPLOAD_DIR, 'brand');

export { BRAND_KINDS, isBrandKind, brandUrl, isVideoMime, BRAND_ACCEPT } from '@/lib/brand.client';
export type { BrandKind } from '@/lib/brand.client';

/**
 * Видео допустимо только для фона: это «живой фон» первого экрана.
 * MP4 (H.264) понимают все браузеры, WebM — запасной вариант поменьше.
 */
const VIDEO_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const VIDEO_EXT_TO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** Видео тяжелее картинок, поэтому у него свой лимит. */
export const MAX_VIDEO_BYTES = Number(
  process.env.BRAND_VIDEO_MAX_BYTES ?? 40 * 1024 * 1024,
);

/** Что разрешено загружать для каждого вида. */
function allowedMime(kind: BrandKind): Record<string, string> {
  return kind === 'hero' ? { ...ALLOWED_MIME, ...VIDEO_MIME } : ALLOWED_MIME;
}

/** Обратное соответствие «расширение → тип» для отдачи файла. */
const BRAND_EXT_TO_MIME: Record<string, string> = { ...EXT_TO_MIME, ...VIDEO_EXT_TO_MIME };

export type BrandFile = {
  filePath: string;
  mime: string;
  size: number;
  mtimeMs: number;
};

/** Находит загруженный файл оформления. null — он не загружен. */
export async function findBrandImage(kind: BrandKind): Promise<BrandFile | null> {
  let entries: string[];
  try {
    entries = await readdir(BRAND_DIR);
  } catch {
    return null;
  }

  for (const name of entries) {
    const ext = path.extname(name).toLowerCase();
    if (path.basename(name, ext) !== kind) continue;
    const mime = BRAND_EXT_TO_MIME[ext];
    if (!mime) continue;

    const filePath = path.join(BRAND_DIR, name);
    try {
      const info = await stat(filePath);
      if (!info.isFile()) continue;
      return { filePath, mime, size: info.size, mtimeMs: info.mtimeMs };
    } catch {
      continue;
    }
  }
  return null;
}

/** Сохраняет файл, удаляя предыдущий (в том числе с другим расширением). */
export async function saveBrandImage(kind: BrandKind, file: File): Promise<void> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError('Пустой файл');
  }

  const ext = allowedMime(kind)[file.type];
  if (!ext) {
    throw new UploadError(
      kind === 'hero'
        ? `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены JPG, PNG, WEBP, AVIF, GIF и видео MP4, WEBM`
        : `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены PNG, JPG, WEBP, AVIF, GIF`,
    );
  }

  const limit = isVideoMime(file.type) ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size > limit) {
    throw new UploadError(
      `Файл больше ${Math.round(limit / 1024 / 1024)} МБ` +
        (isVideoMime(file.type) ? '. Сожмите ролик или сократите его до 10–15 секунд' : ''),
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(BRAND_DIR, { recursive: true });
  await removeBrandImage(kind);
  await writeFile(path.join(BRAND_DIR, `${kind}${ext}`), buffer);
}

/** Удаляет файл — сайт возвращается к оформлению по умолчанию. */
export async function removeBrandImage(kind: BrandKind): Promise<void> {
  const existing = await findBrandImage(kind);
  if (existing) await unlink(existing.filePath).catch(() => undefined);
}
