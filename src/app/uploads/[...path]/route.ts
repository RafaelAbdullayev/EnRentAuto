import { NextResponse } from 'next/server';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { ALL_EXT_TO_MIME, resolveUploadPath } from '@/lib/upload';
import { serveFile } from '@/lib/serveFile';

export const runtime = 'nodejs';
// Отдаём с диска: файл может появиться уже после старта сервера.
export const dynamic = 'force-dynamic';

/**
 * GET /uploads/<файл> — отдача загруженных фотографий и видео автомобилей.
 *
 * В продакшене этот путь имеет смысл перехватить Nginx-ом
 * (location /uploads/ { alias /var/www/enrentauto/data/uploads/; }),
 * тогда статика пойдёт мимо Node.js. Роут — надёжный fallback,
 * он поддерживает Range-запросы, без которых не играет видео в Safari.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Вложенных папок в хранилище нет — принимаем только «/uploads/<файл>».
  if (segments.length !== 1) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = resolveUploadPath(segments[0]);
  if (!filePath) return new NextResponse('Not found', { status: 404 });

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse('Not found', { status: 404 });

    const mime = ALL_EXT_TO_MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

    // Имя файла уникально и не переиспользуется — кэшируем навсегда.
    return serveFile(
      request,
      { filePath, mime, size: info.size, mtimeMs: info.mtimeMs },
      'public, max-age=31536000, immutable',
    );
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
