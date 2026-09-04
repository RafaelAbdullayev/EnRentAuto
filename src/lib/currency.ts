/**
 * Валюта площадки — азербайджанский манат (AZN, ₼).
 *
 * Суммы во всей системе хранятся ЦЕЛЫМ числом манатов (Int), без копеек —
 * так исключены ошибки округления при расчёте аренды.
 *
 * Валюту можно сменить через переменную окружения, не трогая код:
 *   NEXT_PUBLIC_CURRENCY="TRY"
 * Код должен быть валидным ISO-4217; символ Intl подставит сам.
 */
// || вместо ??: пустая строка в переменной окружения тоже должна уводить
// на значение по умолчанию, иначе Intl бросит «Invalid currency code».
export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || 'AZN').toUpperCase();

/**
 * Сколько минорных единиц в одной основной: 1 ₼ = 100 гяпиков.
 * В минорных единицах хранятся только дробные ставки (цена километра
 * сверх лимита); суточные тарифы, залоги и суммы заказов — целые манаты.
 */
export const MINOR_UNITS = 100;

/** 0.3 → 30 */
export function toMinor(major: number): number {
  return Math.round(major * MINOR_UNITS);
}

/** 30 → 0.3 */
export function toMajor(minor: number): number {
  return minor / MINOR_UNITS;
}

/**
 * Символ валюты для подписей в админке («Цена за сутки, ₼»).
 * Берём его у Intl, чтобы он всегда соответствовал коду валюты.
 */
export function currencySymbol(locale = 'az-AZ'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CURRENCY,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? CURRENCY;
  } catch {
    return CURRENCY;
  }
}
