import { INTL_LOCALE, type Locale } from '@/i18n/routing';

/**
 * Форматирование денег, дат и чисел с учётом языка интерфейса.
 * Валюта одна для всех языков — рубль; меняется только запись числа,
 * разделители и позиция символа валюты.
 */

function intlTag(locale?: string): string {
  if (!locale) return 'ru-RU';
  return INTL_LOCALE[locale as Locale] ?? locale;
}

export function formatMoney(value: number, locale?: string): string {
  return new Intl.NumberFormat(intlTag(locale), {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(intlTag(locale)).format(value);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale?: string,
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined, locale?: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/** Значение для <input type="datetime-local"> (локальное время без TZ-сдвига). */
export function toDateTimeLocal(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Значение для <input type="date">. */
export function toDateInput(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
