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

/**
 * Ссылка на карту для адреса.
 *
 * Если администратор указал свою ссылку (Google Maps, Yandex Карты, 2ГИС —
 * любая), берём её. Иначе собираем поиск по тексту адреса: на телефоне такая
 * ссылка открывает приложение карт, на компьютере — сайт.
 */
export function mapLink(address: string, customUrl?: string): string {
  const url = (customUrl ?? '').trim();
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * Название картографического сервиса по адресу ссылки — для подписи
 * второй кнопки рядом с адресом. Разбираем host, а не заводим отдельный
 * ключ перевода: названия сервисов на всех языках пишутся одинаково.
 */
export function mapServiceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('yandex')) return 'Yandex';
    if (host.includes('google')) return 'Google';
    if (host.includes('2gis')) return '2GIS';
    if (host.includes('apple')) return 'Apple Maps';
    if (host.includes('waze')) return 'Waze';
    if (host.includes('openstreetmap') || host.includes('osm.org')) return 'OpenStreetMap';
    return host;
  } catch {
    return '';
  }
}

/** Ссылка годится, только если это настоящий http(s)-адрес. */
export function isHttpUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith('https://') || v.startsWith('http://');
}
