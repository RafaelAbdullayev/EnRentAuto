/**
 * Картинки оформления сайта, которые администратор загружает сам.
 * Вынесено отдельно от src/lib/brand.ts: тот работает с файловой системой
 * и не должен попадать в клиентский бандл.
 */
export const BRAND_KINDS = ['logo', 'hero'] as const;

export type BrandKind = (typeof BRAND_KINDS)[number];

export function isBrandKind(value: string): value is BrandKind {
  return (BRAND_KINDS as readonly string[]).includes(value);
}

/** Публичный адрес картинки — один и тот же при любом расширении файла. */
export function brandUrl(kind: BrandKind): string {
  return `/brand/${kind}`;
}
