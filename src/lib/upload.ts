import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/**
 * Локальное хранилище фотографий.
 *
 * ВАЖНО: файлы намеренно лежат НЕ в /public.
 * Next.js составляет список файлов /public на старте сервера, поэтому всё,
 * что загружено после запуска `next start`, отдавалось бы как 404.
 * Каталог по умолчанию — <проект>/data/uploads, отдача идёт через
 * route-handler /uploads/[...path]. Путь можно переопределить UPLOAD_DIR
 * (удобно, чтобы фото пережили пересборку/деплой).
 */

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()
    ? path.resolve(process.env.UPLOAD_DIR.trim())
    : path.join(process.cwd(), 'data', 'uploads');

export const PUBLIC_PREFIX = '/uploads';

/** Разрешённые типы картинок → расширение файла. */
export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

/**
 * Видео: короткие ролики автомобилей и «живой фон» первого экрана.
 * MP4 (H.264) понимают все браузеры, WEBM — вариант поменьше.
 */
export const VIDEO_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

/** Обратное соответствие для отдачи файла. */
export const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

export const VIDEO_EXT_TO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** Всё, что вообще может лежать в хранилище. */
export const ALL_EXT_TO_MIME: Record<string, string> = {
  ...EXT_TO_MIME,
  ...VIDEO_EXT_TO_MIME,
};

export const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);

/** Видео тяжелее картинок, поэтому у него свой лимит. */
export const MAX_VIDEO_BYTES = Number(
  // BRAND_VIDEO_MAX_BYTES — прежнее имя, когда видео было только у фона.
  process.env.VIDEO_MAX_BYTES ?? process.env.BRAND_VIDEO_MAX_BYTES ?? 40 * 1024 * 1024,
);

export class UploadError extends Error {}

/**
 * Сохраняет один файл и возвращает публичный путь вида /uploads/<имя>.
 * `allowVideo` включает приём коротких роликов (карточки автомобилей).
 */
export async function saveUploadedFile(
  file: File,
  { allowVideo = false }: { allowVideo?: boolean } = {},
): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError('Пустой файл');
  }

  const allowed = allowVideo ? { ...ALLOWED_MIME, ...VIDEO_MIME } : ALLOWED_MIME;
  const ext = allowed[file.type];
  if (!ext) {
    throw new UploadError(
      allowVideo
        ? `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены JPG, PNG, WEBP, AVIF, GIF и видео MP4, WEBM`
        : `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены JPG, PNG, WEBP, AVIF, GIF`,
    );
  }

  const isVideo = file.type in VIDEO_MIME;
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size > limit) {
    throw new UploadError(
      `Файл «${file.name}» больше ${Math.round(limit / 1024 / 1024)} МБ` +
        (isVideo ? '. Сожмите ролик или сократите его до 10–15 секунд' : ''),
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buffer);

  return `${PUBLIC_PREFIX}/${name}`;
}

/**
 * Безопасно превращает публичный путь в путь на диске.
 * Защита от path traversal: берём только basename и проверяем префикс.
 */
export function resolveUploadPath(publicPathOrName: string): string | null {
  const base = path.basename(publicPathOrName);
  if (!base || base.startsWith('.')) return null;
  if (!ALL_EXT_TO_MIME[path.extname(base).toLowerCase()]) return null;
  const target = path.join(UPLOAD_DIR, base);
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return null;
  return target;
}

/** Удаляет файл по публичному пути. */
export async function removeUploadedFile(publicPath: string): Promise<void> {
  if (!publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return;
  const target = resolveUploadPath(publicPath);
  if (!target) return;
  await unlink(target).catch(() => undefined);
}
