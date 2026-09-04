import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALLOWED_MIME, EXT_TO_MIME, MAX_BYTES, UPLOAD_DIR, UploadError } from '@/lib/upload';
import type { BrandKind } from '@/lib/brand.client';

/**
 * Оформление сайта: логотип и фотография для первого экрана.
 *
 * Файлы лежат рядом с фотографиями машин (data/uploads/brand/<вид>.<ext>),
 * а не в /public: Next.js составляет список /public на старте, поэтому
 * загруженный после `next start` файл отдавался бы как 404. Отдача идёт
 * роутом /brand/<вид>, так что оформление меняется из админки без пересборки.
 */
export const BRAND_DIR = path.join(UPLOAD_DIR, 'brand');

export { BRAND_KINDS, isBrandKind, brandUrl } from '@/lib/brand.client';
export type { BrandKind } from '@/lib/brand.client';

export type BrandFile = {
  filePath: string;
  mime: string;
  size: number;
  mtimeMs: number;
};

/** Находит загруженную картинку. null — она не загружена. */
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

/** Сохраняет картинку, удаляя предыдущую (в том числе с другим расширением). */
export async function saveBrandImage(kind: BrandKind, file: File): Promise<void> {
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
  await removeBrandImage(kind);
  await writeFile(path.join(BRAND_DIR, `${kind}${ext}`), buffer);
}

/** Удаляет картинку — сайт возвращается к оформлению по умолчанию. */
export async function removeBrandImage(kind: BrandKind): Promise<void> {
  const existing = await findBrandImage(kind);
  if (existing) await unlink(existing.filePath).catch(() => undefined);
}
