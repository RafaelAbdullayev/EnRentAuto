import { NextResponse } from 'next/server';
import { findBrandImage, isBrandKind } from '@/lib/brand';
import { serveFile } from '@/lib/serveFile';

export const runtime = 'nodejs';
// Оформление меняется из админки в любой момент — кэшировать сборкой нельзя.
export const dynamic = 'force-dynamic';

/** GET /brand/logo | /brand/hero — отдача логотипа и фона (картинка или видео). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isBrandKind(kind)) return new NextResponse('Not found', { status: 404 });

  const asset = await findBrandImage(kind);
  if (!asset) return new NextResponse('Not found', { status: 404 });

  // Адрес постоянный, поэтому браузер обязан перепроверять файл по ETag.
  return serveFile(request, asset, 'public, max-age=0, must-revalidate');
}
