import createNextIntlPlugin from 'next-intl/plugin';

// Плагин подключает src/i18n/request.ts как источник словарей.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Фото хранятся локально и отдаются роутом /uploads/[...path] — внешние домены не нужны.
  images: { remotePatterns: [] },
  experimental: {
    // Разрешаем server actions большого размера (загрузка фото).
    serverActions: { bodySizeLimit: '12mb' },
  },
};

export default withNextIntl(nextConfig);
