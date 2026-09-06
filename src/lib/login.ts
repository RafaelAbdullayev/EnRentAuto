/**
 * Логин администратора — e-mail или номер телефона.
 *
 * Оба варианта хранятся в одном поле User.email, поэтому перед поиском
 * и записью приводятся к каноническому виду: телефон — к «+» и цифрам,
 * e-mail — к нижнему регистру. Иначе «+994 70 500 97 97» и
 * «+994705009797» считались бы разными пользователями.
 */

const EMAIL_RE = /^[^\s@"']+@[^\s@"']+\.[^\s@"']{2,}$/;
/** Телефон: необязательный «+», затем 8–15 цифр, между ними допустимы разделители. */
const PHONE_RE = /^\+?[\d\s()-]{8,25}$/;

export function looksLikePhone(raw: string): boolean {
  const value = raw.trim();
  if (value.includes('@')) return false;
  if (!PHONE_RE.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

/** Приводит логин к виду, в котором он лежит в БД. */
export function normalizeLogin(raw: string): string {
  const value = raw.trim().replace(/^['"]+/, '').replace(/['"]+$/, '').trim();
  if (looksLikePhone(value)) return `+${value.replace(/\D/g, '')}`;
  return value.toLowerCase();
}

/** Годится ли строка как логин: корректный e-mail либо телефон. */
export function isValidLogin(raw: string): boolean {
  // Кавычки снимаем так же, как в normalizeLogin: значение может прийти
  // из .env, где их легко оставить по недосмотру.
  const value = raw.trim().replace(/^['"]+/, '').replace(/['"]+$/, '').trim();
  return looksLikePhone(value) || EMAIL_RE.test(value.toLowerCase());
}
