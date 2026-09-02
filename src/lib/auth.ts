import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * NextAuth v5 (Auth.js). Стратегия — JWT, чтобы не держать таблицу сессий
 * и не ходить в БД на каждый запрос админки.
 *
 * Роль пользователя кладётся в токен и пробрасывается в session.user.role,
 * по ней работает вся авторизация раздела /admin.
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

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Отметка о входе — видно в админке «последний вход».
        await prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
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
});

/** true, если у сессии есть доступ в админку. */
export function isStaff(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/**
 * Требует администратора. Возвращает сессию либо null.
 * Использовать в API-роутах; в серверных компонентах — requireAdminPage().
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) return null;
  return session;
}
