import type { NextAuthConfig, DefaultSession } from 'next-auth';

/**
 * Базовая конфигурация Auth.js БЕЗ провайдеров.
 *
 * Пригодна для Edge Runtime: здесь нет ни Prisma, ни bcrypt, поэтому её
 * можно подключить в middleware и проверять сессию до рендеринга страниц.
 * Провайдер с обращением к БД добавляется в src/lib/auth.ts (Node.js).
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'MANAGER' | 'USER';
    } & DefaultSession['user'];
  }
  interface User {
    role?: 'ADMIN' | 'MANAGER' | 'USER';
  }
}

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: { signIn: '/login', error: '/login' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? 'USER') as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as 'ADMIN' | 'MANAGER' | 'USER') ?? 'USER';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

/** true, если у роли есть доступ в админку. */
export function isStaff(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}
