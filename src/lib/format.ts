import { INTL_LOCALE, type Locale } from '@/i18n/routing';
import { CURRENCY } from '@/lib/currency';

/**
 * Форматирование денег, дат и чисел с учётом языка интерфейса.
 * Валюта одна для всех языков (по умолчанию манат); от языка зависят только
 * разделители разрядов и позиция символа валюты.
 */

function intlTag(locale?: string): string {
  if (!locale) return 'ru-RU';
  return INTL_LOCALE[locale as Locale] ?? locale;
}

export function formatMoney(value: number, locale?: string): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
    // narrowSymbol даёт «₼» вместо «AZN» во всех языках, а не только в az.
    currencyDisplay: 'narrowSymbol',
  };
  try {
    return new Intl.NumberFormat(intlTag(locale), options).format(value);
  } catch {
    // Старые среды без поддержки narrowSymbol — откатываемся на код валюты.
    return new Intl.NumberFormat(intlTag(locale), {
      ...options,
      currencyDisplay: 'symbol',
    }).format(value);
  }
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
