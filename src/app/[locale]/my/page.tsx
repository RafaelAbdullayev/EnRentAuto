import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { MyBookings } from '@/components/MyBookings';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('myTitle') };
}

export default async function MyBookingsPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('my');

  return (
    <>
      <SiteHeader />

      <main className="pt-32 pb-20 sm:pt-36">
        <div className="container-page">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{t('subtitle')}</p>

          <div className="mt-8">
            <MyBookings />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
