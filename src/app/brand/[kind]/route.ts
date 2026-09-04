import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { findBrandImage, isBrandKind } from '@/lib/brand';

export const runtime = 'nodejs';
// Оформление меняется из админки в любой момент — кэшировать сборкой нельзя.
export const dynamic = 'force-dynamic';

/** GET /brand/logo | /brand/hero — отдача картинок оформления. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isBrandKind(kind)) return new NextResponse('Not found', { status: 404 });

  const image = await findBrandImage(kind);
  if (!image) return new NextResponse('Not found', { status: 404 });

  // ETag по времени изменения: браузер перезапрашивает файл после замены.
  const etag = `"${Math.round(image.mtimeMs)}-${image.size}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const file = await readFile(image.filePath);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': image.mime,
      'Content-Length': String(image.size),
      ETag: etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
