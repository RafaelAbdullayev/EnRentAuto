import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth, isStaff } from '@/lib/auth';
import { redirect, Link } from '@/i18n/navigation';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('loginTitle') };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');

  const { from, error } = await searchParams;

  // Уже авторизованного сотрудника сразу отправляем в админку.
  const session = await auth();
  if (session?.user && isStaff(session.user.role)) {
    redirect({ href: (from || '/admin') as never, locale });
  }

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
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t('title')}</h1>
          <p className="mt-2 text-sm text-zinc-500">{t('subtitle')}</p>

          <LoginForm callbackUrl={from || '/admin'} initialError={error} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link href="/" className="transition-colors hover:text-zinc-400">
            {t('back')}
          </Link>
        </p>
      </div>
    </main>
  );
}
