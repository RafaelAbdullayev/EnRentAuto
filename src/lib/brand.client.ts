/**
 * Картинки и видео оформления сайта, которые администратор загружает сам.
 * Вынесено отдельно от src/lib/brand.ts: тот работает с файловой системой
 * и не должен попадать в клиентский бандл.
 */
export const BRAND_KINDS = ['logo', 'hero'] as const;

export type BrandKind = (typeof BRAND_KINDS)[number];

export function isBrandKind(value: string): value is BrandKind {
  return (BRAND_KINDS as readonly string[]).includes(value);
}

/** Публичный адрес файла — один и тот же при любом расширении. */
export function brandUrl(kind: BrandKind): string {
  return `/brand/${kind}`;
}

/** Видео допустимо только для фона первого экрана. */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

/** Что можно выбрать в поле загрузки (атрибут accept). */
export const BRAND_ACCEPT: Record<BrandKind, string> = {
  logo: 'image/png,image/jpeg,image/webp,image/avif,image/gif',
  hero: 'image/png,image/jpeg,image/webp,image/avif,image/gif,video/mp4,video/webm',
};
