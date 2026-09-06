import { defineRouting } from 'next-intl/routing';

/**
 * Языки сайта. Русский — язык по умолчанию и живёт на «/» без префикса,
 * остальные получают префикс: /en, /az, /tr, /ar, /zh.
 * Так уже проиндексированные русские ссылки остаются рабочими.
 */
export const routing = defineRouting({
  locales: ['ru', 'en', 'az', 'tr', 'ar', 'zh'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

/** Подписи для переключателя языков — всегда на самом языке. */
export const LOCALE_LABELS: Record<Locale, { native: string; short: string; flag: string }> = {
  ru: { native: 'Русский', short: 'RU', flag: '🇷🇺' },
  en: { native: 'English', short: 'EN', flag: '🇬🇧' },
  az: { native: 'Azərbaycan', short: 'AZ', flag: '🇦🇿' },
  tr: { native: 'Türkçe', short: 'TR', flag: '🇹🇷' },
  ar: { native: 'العربية', short: 'AR', flag: '🇸🇦' },
  zh: { native: '中文', short: 'ZH', flag: '🇨🇳' },
};

/** Языки с письмом справа налево. */
export const RTL_LOCALES: Locale[] = ['ar'];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}

/** Локаль → BCP-47 тег для Intl.NumberFormat / DateTimeFormat. */
export const INTL_LOCALE: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-GB',
  az: 'az-AZ',
  tr: 'tr-TR',
  ar: 'ar-AE',
  zh: 'zh-CN',
};
