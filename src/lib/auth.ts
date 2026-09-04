import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authConfig, isStaff } from '@/lib/auth.config';
import { normalizeLogin } from '@/lib/login';

/**
 * Auth.js — полная конфигурация с провайдером, который ходит в БД.
 * Работает в Node.js (нужны Prisma и bcrypt). Проверка сессии в middleware
 * использует src/lib/auth.config.ts, где провайдеров нет.
 *
 * Логином служит e-mail ИЛИ номер телефона — оба хранятся в User.email
 * в каноническом виде (см. src/lib/login.ts).
 */

const credentialsSchema = z.object({
  login: z.string().min(3).max(120),
  password: z.string().min(6).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        login: { label: 'E-mail или телефон', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const login = normalizeLogin(parsed.data.login);
        const user = await prisma.user.findUnique({ where: { email: login } });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        // Отметка о входе — видно в админке «последний вход».
        await prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});

export { isStaff };

/**
 * Требует сотрудника. Возвращает сессию либо null.
 * Использовать в API-роутах; страницы защищены в middleware.
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) return null;
  return session;
}
