import { NextResponse, type NextRequest } from 'next/server';
import { VISITOR_COOKIE } from '@/lib/constants';

/**
 * Middleware выполняет ровно одну задачу — выдаёт анонимный идентификатор
 * посетителя (httpOnly-cookie). Он нужен модулю «Онлайн сейчас».
 *
 * Проверку прав администратора намеренно НЕ делаем здесь: bcrypt и Prisma
 * недоступны в Edge Runtime. Доступ к /admin проверяется в серверном
 * layout-компоненте (src/app/admin/layout.tsx) — это надёжнее.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(VISITOR_COOKIE)) {
    const sid = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 дней
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|uploads|favicon.ico).*)'],
};
