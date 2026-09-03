import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { VISITOR_COOKIE } from '@/lib/constants';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Middleware решает две задачи:
 *  1. Маршрутизация языков (next-intl): определяет локаль по префиксу URL,
 *     cookie NEXT_LOCALE или заголовку Accept-Language.
 *  2. Выдаёт анонимный идентификатор посетителя для модуля «Онлайн сейчас».
 *
 * Проверку прав администратора здесь НЕ делаем: bcrypt и Prisma недоступны
 * в Edge Runtime. Доступ к /admin проверяется в серверном layout-компоненте.
 */
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request) ?? NextResponse.next();

  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
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
  matcher: [
    // Корень указан отдельно: на нём строится язык по умолчанию, и если
    // catch-all его не поймает, next-intl уйдёт в цикл редиректов.
    '/',
    // Всё остальное, кроме API, отдачи фотографий, служебных путей Next
    // и файлов с расширением.
    '/((?!api|uploads|_next|_vercel|.*\\..*).*)',
  ],
};
