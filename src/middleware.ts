import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { isStaff } from '@/lib/auth.config';
import { VISITOR_COOKIE } from '@/lib/constants';

const intlMiddleware = createIntlMiddleware(routing);

/** Путь без языкового префикса: /az/admin/cars → /admin/cars */
function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length && (routing.locales as readonly string[]).includes(segments[0])) {
    return `/${segments.slice(1).join('/')}`;
  }
  return pathname;
}

/**
 * Читает сессию прямо из JWT-cookie.
 *
 * Обёртку auth() из NextAuth здесь использовать нельзя: она подменяет объект
 * запроса, после чего next-intl строит АБСОЛЮТНЫЙ адрес переписывания, Next
 * считает его внешним и пытается проксировать запрос сам на себя — страницы
 * языка по умолчанию отдают 500.
 *
 * Имя cookie зависит от протокола, поэтому пробуем оба варианта: за Nginx
 * с сертификатом это «__Secure-…», при доступе по http — без префикса.
 */
async function readRole(request: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  for (const cookieName of ['authjs.session-token', '__Secure-authjs.session-token']) {
    if (!request.cookies.get(cookieName)) continue;
    try {
      const token = await getToken({
        req: request,
        secret,
        salt: cookieName,
        cookieName,
        secureCookie: cookieName.startsWith('__Secure-'),
      });
      if (token?.role) return token.role as string;
    } catch {
      // Повреждённая или чужая cookie — просто считаем, что сессии нет.
    }
  }
  return null;
}

/**
 * Middleware решает три задачи:
 *
 *  1. Защищает /admin ДО рендеринга. Проверка в серверном layout для этого
 *     не годится: App Router рендерит страницу параллельно с layout и успевает
 *     отдать часть разметки — вместе с данными заказов — в теле
 *     ответа-редиректа.
 *  2. Маршрутизация языков (next-intl).
 *  3. Выдаёт анонимный идентификатор посетителя для модуля «Онлайн сейчас».
 */
export default async function middleware(request: NextRequest) {
  const path = stripLocale(request.nextUrl.pathname);

  if (path === '/admin' || path.startsWith('/admin/')) {
    const role = await readRole(request);
    if (!isStaff(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('from', path);
      if (role) url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  const response = intlMiddleware(request) ?? NextResponse.next();

  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      // Флаг по фактическому протоколу запроса, а не по NODE_ENV: cookie с
      // Secure браузер отбрасывает на http-адресах, и учёт посетителей молча
      // перестаёт работать до перехода на HTTPS.
      secure: request.nextUrl.protocol === 'https:',
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
