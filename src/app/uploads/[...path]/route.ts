import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { EXT_TO_MIME, resolveUploadPath } from '@/lib/upload';

export const runtime = 'nodejs';
// Отдаём с диска: файл может появиться уже после старта сервера.
export const dynamic = 'force-dynamic';

/**
 * GET /uploads/<файл> — отдача загруженных фотографий.
 *
 * В продакшене этот путь имеет смысл перехватить Nginx-ом
 * (location /uploads/ { alias /var/www/enrentauto/data/uploads/; }),
 * тогда статика пойдёт мимо Node.js. Роут — надёжный fallback.
 */
export async function GET(
  _request: Request,
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

    const file = await readFile(filePath);
    const mime = EXT_TO_MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(info.size),
        // Имя файла уникально и не переиспользуется — кэшируем навсегда.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
