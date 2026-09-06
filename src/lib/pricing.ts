/**
 * Логика расчёта стоимости аренды.
 * Правила:
 *  • Тариф — за сутки. Неполные сутки округляются ВВЕРХ.
 *  • Минимум — 1 сутки.
 *  • Скидка (спецпредложение) применяется к цене за сутки и округляется вниз.
 */

export const MS_IN_DAY = 24 * 60 * 60 * 1000;

/** Цена за сутки с учётом скидки. */
export function effectivePricePerDay(pricePerDay: number, discount: number): number {
  const safeDiscount = Math.min(Math.max(discount ?? 0, 0), 90);
  return Math.floor((pricePerDay * (100 - safeDiscount)) / 100);
}

/** Количество расчётных суток между двумя датами (минимум 1). */
export function rentalDays(startAt: Date, endAt: Date): number {
  const diff = endAt.getTime() - startAt.getTime();
  if (Number.isNaN(diff) || diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / MS_IN_DAY));
}

export interface PriceBreakdown {
  days: number;
  basePricePerDay: number;
  pricePerDay: number;
  discount: number;
  saved: number;
  total: number;
}

export function calculatePrice(
  startAt: Date,
  endAt: Date,
  pricePerDay: number,
  discount = 0,
): PriceBreakdown {
  const days = rentalDays(startAt, endAt);
  const perDay = effectivePricePerDay(pricePerDay, discount);
  return {
    days,
    basePricePerDay: pricePerDay,
    pricePerDay: perDay,
    discount,
    saved: (pricePerDay - perDay) * days,
    total: perDay * days,
  };
}
