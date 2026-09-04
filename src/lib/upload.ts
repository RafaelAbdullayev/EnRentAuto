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

/** Разрешённые типы → расширение файла. */
export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
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

export const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);

export class UploadError extends Error {}

/** Сохраняет один файл и возвращает публичный путь вида /uploads/<имя>. */
export async function saveUploadedFile(file: File): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError('Пустой файл');
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError(
      `Файл «${file.name}» больше ${Math.round(MAX_BYTES / 1024 / 1024)} МБ`,
    );
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new UploadError(
      `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены JPG, PNG, WEBP, AVIF, GIF`,
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
  if (!EXT_TO_MIME[path.extname(base).toLowerCase()]) return null;
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
