'use client';

import { useEffect } from 'react';

/** Глобальный обработчик ошибок рендеринга. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] необработанная ошибка:', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">Что-то пошло не так</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Не удалось загрузить страницу
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Мы уже знаем о проблеме. Попробуйте обновить страницу.
          {error.digest && <span className="ml-1 font-mono text-xs text-zinc-700">#{error.digest}</span>}
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-8">
          Обновить
        </button>
      </div>
    </main>
  );
}
