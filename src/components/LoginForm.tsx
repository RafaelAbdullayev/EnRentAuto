'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/format';

/** Форма входа. Ошибки NextAuth преобразуются в понятный текст. */
export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  const t = useTranslations('login');
  const router = useRouter();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? t('failed') : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    // Логином может быть e-mail или телефон — нормализацию делает сервер.
    const res = await signIn('credentials', {
      login: login.trim(),
      password,
      redirect: false,
    });

    setPending(false);

    if (!res || res.error) {
      setError(t('invalid'));
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-signal-cancel/40 bg-signal-cancel/10 px-4 py-3 text-sm text-signal-cancel"
        >
          {error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="login">{t('email')}</label>
        <input
          id="login"
          type="text"
          autoComplete="username"
          dir="ltr"
          className={cn('field', error && 'field-error')}
          placeholder="+994 70 000 00 00"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">{t('password')}</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className={cn('field', error && 'field-error')}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full py-3">
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
