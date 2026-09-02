'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/** Обработчик ошибок рендеринга внутри языкового сегмента. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('[app] необработанная ошибка:', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">{t('errorEyebrow')}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          {t('errorTitle')}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          {t('errorText')}
          {error.digest && (
            <span className="ml-1 font-mono text-xs text-zinc-700">#{error.digest}</span>
          )}
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-8">
          {t('retry')}
        </button>
      </div>
    </main>
  );
}
