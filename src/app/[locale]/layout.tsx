import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { PresenceTracker } from '@/components/PresenceTracker';
import { routing, isRtl } from '@/i18n/routing';

/** Пререндерим все языки статически. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: { default: t('title'), template: '%s · EnRentAuto' },
    description: t('description'),
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
    // Альтернативные языковые версии — для поисковых систем.
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
      ),
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#050506',
  width: 'device-width',
  initialScale: 1,
  // Страница занимает весь экран, включая область «чёлки»;
  // отступы под неё расставлены в globals.css через env(safe-area-inset-*).
  viewportFit: 'cover',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Включает статический рендеринг для этой локали.
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          {children}
          {/* Пинг присутствия для модуля «Онлайн сейчас» */}
          <PresenceTracker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
