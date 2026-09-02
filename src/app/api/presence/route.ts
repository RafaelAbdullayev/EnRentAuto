import { NextResponse, type NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { VISITOR_COOKIE } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Достаём реальный IP за Nginx / прокси. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? '';
}

/**
 * POST /api/presence — «пинг» присутствия посетителя.
 * Апсертит VisitorSession по анонимному sid из httpOnly-cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get(VISITOR_COOKIE)?.value;
    // Без cookie (например, бот) — молча игнорируем.
    if (!sid) return NextResponse.json({ ok: true, tracked: false });

    const body = (await request.json().catch(() => ({}))) as {
      path?: string;
      referrer?: string | null;
    };

    const h = await headers();
    const data = {
      ip: await clientIp(),
      userAgent: (h.get('user-agent') ?? '').slice(0, 400),
      lastPath: (body.path ?? '/').slice(0, 300),
      referrer: body.referrer ? body.referrer.slice(0, 300) : null,
      lastSeen: new Date(),
    };

    await prisma.visitorSession.upsert({
      where: { sid },
      create: { sid, ...data, pageViews: 1 },
      update: { ...data, pageViews: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    console.error('[presence] ошибка:', error);
    // Счётчик не должен ломать сайт.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
