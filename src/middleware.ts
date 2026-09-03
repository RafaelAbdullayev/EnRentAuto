import { NextResponse, type NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { authConfig, isStaff } from '@/lib/auth.config';
import { VISITOR_COOKIE } from '@/lib/constants';

const intlMiddleware = createIntlMiddleware(routing);
// Конфигурация без провайдеров — пригодна для Edge Runtime.
const { auth } = NextAuth(authConfig);

/** Путь без языкового префикса: /az/admin/cars → /admin/cars */
function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length && (routing.locales as readonly string[]).includes(segments[0])) {
    return `/${segments.slice(1).join('/')}`;
  }
  return pathname;
}

/**
 * Middleware решает три задачи:
 *
 *  1. Защищает /admin ДО рендеринга. Раньше проверка стояла в серверном
 *     layout, но App Router рендерит страницу параллельно с layout и успевает
 *     отдать часть разметки в теле ответа-редиректа — вместе с данными
 *     заказов. Здесь запрос отсекается раньше, чем что-либо отрисуется.
 *  2. Маршрутизация языков (next-intl).
 *  3. Выдаёт анонимный идентификатор посетителя для модуля «Онлайн сейчас».
 */
export default auth((request) => {
  const path = stripLocale(request.nextUrl.pathname);

  if (path === '/admin' || path.startsWith('/admin/')) {
    const session = request.auth;
    if (!session?.user || !isStaff(session.user.role)) {
      const url = new URL('/login', request.nextUrl.origin);
      url.searchParams.set('from', path);
      if (session?.user) url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  const response = intlMiddleware(request as NextRequest) ?? NextResponse.next();

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
});

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
