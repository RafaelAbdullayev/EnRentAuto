import { NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

/**
 * Отдача файла с диска: ETag, 304 и поддержка Range для видео.
 * Общий код для /uploads/<файл> и /brand/<вид>.
 */
export type ServedFile = {
  filePath: string;
  mime: string;
  size: number;
  mtimeMs: number;
};

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

export function serveFile(
  request: Request,
  file: ServedFile,
  /**
   * Заголовок кэширования. Имя загруженного файла уникально и не
   * переиспользуется — такие файлы кэшируются навсегда; логотип и фон
   * лежат по постоянному адресу, их надо перепроверять.
   */
  cacheControl: string,
): Promise<NextResponse> | NextResponse {
  const etag = `"${Math.round(file.mtimeMs)}-${file.size}"`;
  const headers = { 'Content-Type': file.mime, ETag: etag, 'Cache-Control': cacheControl };

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  // Видео отдаём потоком с поддержкой Range: без 206-ответов Safari
  // и iOS вообще отказываются проигрывать файл.
  if (file.mime.startsWith('video/')) {
    const rangeHeader = request.headers.get('range');
    const range = rangeHeader ? parseRange(rangeHeader, file.size) : null;

    if (rangeHeader && !range) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${file.size}` },
      });
    }

    const { start, end } = range ?? { start: 0, end: file.size - 1 };
    const stream = Readable.toWeb(
      createReadStream(file.filePath, { start, end }),
    ) as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      status: range ? 206 : 200,
      headers: {
        ...headers,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${file.size}` } : {}),
      },
    });
  }

  return readFile(file.filePath).then(
    (data) =>
      new NextResponse(new Uint8Array(data), {
        headers: { ...headers, 'Content-Length': String(file.size) },
      }),
  );
}
