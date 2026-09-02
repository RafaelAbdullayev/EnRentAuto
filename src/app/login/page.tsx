import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isStaff } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Вход в панель управления' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  // Уже авторизованного сотрудника сразу отправляем в админку.
  const session = await auth();
  if (session?.user && isStaff(session.user.role)) redirect(from || '/admin');

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-sm font-bold text-ink-950">
            ER
          </span>
          <span className="text-base font-semibold text-white">
            EnRent<span className="text-accent">Auto</span>
          </span>
        </Link>

        <div className="surface p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Панель управления</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Вход только для сотрудников автопроката.
          </p>

          <LoginForm callbackUrl={from || '/admin'} initialError={error} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link href="/" className="transition-colors hover:text-zinc-400">
            ← Вернуться на сайт
          </Link>
        </p>
      </div>
    </main>
  );
}
