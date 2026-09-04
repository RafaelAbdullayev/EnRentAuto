import { NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { findBrandImage, isBrandKind, isVideoMime } from '@/lib/brand';

export const runtime = 'nodejs';
// Оформление меняется из админки в любой момент — кэшировать сборкой нельзя.
export const dynamic = 'force-dynamic';

/** Разбирает заголовок «Range: bytes=начало-конец». */
function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  // «bytes=-500» — последние 500 байт.
  let start = rawStart === '' ? size - Number(rawEnd) : Number(rawStart);
  let end = rawStart === '' || rawEnd === '' ? size - 1 : Number(rawEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end) return null;

  return { start, end };
}

/** GET /brand/logo | /brand/hero — отдача логотипа и фона (картинка или видео). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isBrandKind(kind)) return new NextResponse('Not found', { status: 404 });

  const asset = await findBrandImage(kind);
  if (!asset) return new NextResponse('Not found', { status: 404 });

  // ETag по времени изменения: браузер перезапрашивает файл после замены.
  const etag = `"${Math.round(asset.mtimeMs)}-${asset.size}"`;
  const base = {
    'Content-Type': asset.mime,
    ETag: etag,
    'Cache-Control': 'public, max-age=0, must-revalidate',
  };

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  // Видео отдаём потоком с поддержкой Range: без 206-ответов Safari
  // и iOS вообще отказываются проигрывать файл.
  if (isVideoMime(asset.mime)) {
    const rangeHeader = request.headers.get('range');
    const range = rangeHeader ? parseRange(rangeHeader, asset.size) : null;

    if (rangeHeader && !range) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${asset.size}` },
      });
    }

    const { start, end } = range ?? { start: 0, end: asset.size - 1 };
    const stream = Readable.toWeb(
      createReadStream(asset.filePath, { start, end }),
    ) as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      status: range ? 206 : 200,
      headers: {
        ...base,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${asset.size}` } : {}),
      },
    });
  }

  const file = await readFile(asset.filePath);
  return new NextResponse(new Uint8Array(file), {
    headers: { ...base, 'Content-Length': String(asset.size) },
  });
}
