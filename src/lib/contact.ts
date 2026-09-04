/**
 * Ссылки на телефон и WhatsApp из номера, записанного в любом виде:
 * «+994 70 500 97 97», «(070) 500-97-97» и т.д.
 */

/** Только цифры: именно так номер нужен WhatsApp (без плюса и пробелов). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** tel:+994705009797 */
export function telLink(phone: string): string {
  const digits = phoneDigits(phone);
  return `tel:+${digits}`;
}

/**
 * https://wa.me/994705009797?text=…
 * Открывает приложение WhatsApp на телефоне и WhatsApp Web на компьютере.
 */
export function whatsappLink(phone: string, text?: string): string {
  const digits = phoneDigits(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}
