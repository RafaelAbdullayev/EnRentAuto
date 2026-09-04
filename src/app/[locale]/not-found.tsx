import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <main className="relative grid min-h-screen place-items-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="relative">
        <p className="eyebrow">{t('notFoundEyebrow')}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {t('notFoundTitle')}
        </h1>
        <p className="mt-3 text-zinc-500">{t('notFoundText')}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/cars" className="btn-ghost">
            {t('notFoundToCatalog')}
          </Link>
          <Link href="/" className="btn-primary">
            {t('notFoundToHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
