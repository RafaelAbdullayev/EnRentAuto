import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export const runtime = 'nodejs';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z
      .string()
      .min(10, 'Минимум 10 символов')
      .max(200, 'Слишком длинный пароль')
      .refine((v) => /[a-zA-Zа-яА-Я]/.test(v) && /\d/.test(v), {
        message: 'Пароль должен содержать буквы и хотя бы одну цифру',
      }),
    repeatPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.repeatPassword, {
    path: ['repeatPassword'],
    message: 'Пароли не совпадают',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'Новый пароль совпадает с текущим',
  });

/** POST /api/admin/password — смена собственного пароля сотрудника. */
export async function POST(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Ошибки по полям — форма подсветит нужное.
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json({ error: 'Проверьте поля', fields }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Учётная запись недоступна' }, { status: 403 });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: 'Неверный текущий пароль', fields: { currentPassword: 'Неверный пароль' } },
      { status: 422 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });

  // Сам пароль в журнал, разумеется, не попадает — только факт смены.
  await logAction({
    userId: user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: user.id,
  });

  return NextResponse.json({ ok: true });
}
