import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { findLogo } from '@/lib/brand';

export const runtime = 'nodejs';
// Логотип можно заменить из админки в любой момент — кэшировать сборкой нельзя.
export const dynamic = 'force-dynamic';

/** GET /brand/logo — отдача загруженного логотипа. 404, если он не загружен. */
export async function GET(request: Request) {
  const logo = await findLogo();
  if (!logo) return new NextResponse('Not found', { status: 404 });

  // ETag по времени изменения: браузер перезапрашивает файл после замены.
  const etag = `"${Math.round(logo.mtimeMs)}-${logo.size}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const file = await readFile(logo.filePath);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': logo.mime,
      'Content-Length': String(logo.size),
      ETag: etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
