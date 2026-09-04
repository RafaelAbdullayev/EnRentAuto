import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALLOWED_MIME, EXT_TO_MIME, MAX_BYTES, UPLOAD_DIR, UploadError } from '@/lib/upload';

/**
 * Логотип сайта.
 *
 * Файл лежит рядом с фотографиями (data/uploads/brand/logo.<ext>), а не в /public:
 * Next.js составляет список /public на старте, поэтому загруженный после
 * `next start` файл отдавался бы как 404. Отдача идёт роутом /brand/logo,
 * так что заменить логотип можно из админки без пересборки проекта.
 */
export const BRAND_DIR = path.join(UPLOAD_DIR, 'brand');

// Публичный адрес логотипа один и тот же при любом расширении файла.
export { LOGO_URL } from '@/lib/brand.client';

/** Имя файла всегда «logo.<ext>»: одновременно хранится только один логотип. */
const BASENAME = 'logo';

export type LogoFile = {
  filePath: string;
  mime: string;
  size: number;
  mtimeMs: number;
};

/** Находит загруженный логотип. null — логотип не загружен. */
export async function findLogo(): Promise<LogoFile | null> {
  let entries: string[];
  try {
    entries = await readdir(BRAND_DIR);
  } catch {
    return null;
  }

  for (const name of entries) {
    const ext = path.extname(name).toLowerCase();
    if (path.basename(name, ext) !== BASENAME) continue;
    const mime = EXT_TO_MIME[ext];
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

/** Сохраняет новый логотип, удаляя предыдущий (в том числе с другим расширением). */
export async function saveLogo(file: File): Promise<void> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError('Пустой файл');
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError(`Файл больше ${Math.round(MAX_BYTES / 1024 / 1024)} МБ`);
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new UploadError(
      `Недопустимый формат: ${file.type || 'неизвестно'}. Разрешены PNG, JPG, WEBP, AVIF, GIF`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(BRAND_DIR, { recursive: true });
  await removeLogo();
  await writeFile(path.join(BRAND_DIR, `${BASENAME}${ext}`), buffer);
}

/** Удаляет логотип — сайт возвращается к текстовому знаку «EnRentAuto». */
export async function removeLogo(): Promise<void> {
  const existing = await findLogo();
  if (existing) await unlink(existing.filePath).catch(() => undefined);
}
