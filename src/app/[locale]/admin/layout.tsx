import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { auth, isStaff } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { ONLINE_WINDOW_MS } from '@/lib/constants';

export const metadata: Metadata = { title: { default: 'Админ-панель', template: '%s · Админка' } };
export const dynamic = 'force-dynamic';

/**
 * Единая точка защиты раздела /admin.
 * Неавторизованный пользователь → /login, авторизованный без прав → /login с ошибкой.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect('/login?from=/admin');
  if (!isStaff(session.user.role)) redirect('/login?from=/admin&error=forbidden');

  const [newBookings, onlineNow] = await Promise.all([
    prisma.booking.count({ where: { status: 'NEW' } }),
    prisma.visitorSession.count({
      where: { lastSeen: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } },
    }),
  ]);

  return (
    <SessionProvider session={session}>
      <AdminShell user={session.user} newBookings={newBookings} onlineNow={onlineNow}>
        {children}
      </AdminShell>
    </SessionProvider>
  );
}
