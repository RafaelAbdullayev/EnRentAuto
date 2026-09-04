import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { PasswordForm } from '@/components/admin/PasswordForm';
import { formatDateTime } from '@/lib/format';
import { looksLikePhone } from '@/lib/login';

export const metadata: Metadata = { title: 'Профиль' };
export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  // Доступ уже проверен в middleware; здесь сессия нужна ради id.
  const session = await requireStaff();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  const lastChange = user
    ? await prisma.auditLog.findFirst({
        where: { userId: user.id, action: 'PASSWORD_CHANGED' },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Профиль</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Учётная запись, под которой вы вошли, и смена пароля.
        </p>
      </header>

      {user && (
        <section className="surface p-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="label">Логин</dt>
              <dd className="text-sm text-zinc-200" dir="ltr">
                {user.email}
                <span className="ms-2 text-xs text-zinc-600">
                  {looksLikePhone(user.email) ? 'телефон' : 'e-mail'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="label">Роль</dt>
              <dd className="text-sm text-zinc-200">
                {user.role === 'ADMIN' ? 'Администратор' : 'Менеджер'}
              </dd>
            </div>
            <div>
              <dt className="label">Пароль менялся</dt>
              <dd className="text-sm text-zinc-200">
                {lastChange ? formatDateTime(lastChange.createdAt, 'ru') : 'ни разу'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Смена пароля</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          После сохранения вас перебросит на страницу входа — войдите с новым паролем.
          Пароль, который вы кому-то пересылали, считайте скомпрометированным и меняйте.
        </p>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
