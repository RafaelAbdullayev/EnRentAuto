import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PresenceTracker } from '@/components/PresenceTracker';

export const metadata: Metadata = {
  title: {
    default: 'EnRentAuto — премиальный прокат автомобилей',
    template: '%s · EnRentAuto',
  },
  description:
    'Аренда премиальных автомобилей посуточно. Прозрачные тарифы, подача за 60 минут, страховка включена.',
  openGraph: {
    title: 'EnRentAuto — премиальный прокат автомобилей',
    description: 'Аренда премиальных автомобилей посуточно.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#050506',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {children}
        {/* Пинг присутствия для модуля «Онлайн сейчас» */}
        <PresenceTracker />
      </body>
    </html>
  );
}
