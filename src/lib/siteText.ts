import { prisma } from '@/lib/prisma';
import { routing, type Locale } from '@/i18n/routing';
import ruMessages from '../../messages/ru.json';

/**
 * Редактируемые тексты сайта.
 *
 * Словари messages/<locale>.json — значения по умолчанию. Администратор может
 * переопределить любой ключ в админке; переопределения лежат в таблице
 * SiteText и накладываются поверх файла при каждом запросе.
 *
 * Ключи адресуются точечным путём: "footer.phone", "home.title1",
 * "enums.body.SEDAN".
 */

export type FlatMessages = Record<string, string>;
type NestedMessages = { [key: string]: string | NestedMessages };

/** { a: { b: 'x' } } → { 'a.b': 'x' } */
export function flatten(source: NestedMessages, prefix = ''): FlatMessages {
  const out: FlatMessages = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

/** { 'a.b': 'x' } → { a: { b: 'x' } } */
export function unflatten(flat: FlatMessages): NestedMessages {
  const out: NestedMessages = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
      node = node[part] as NestedMessages;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Полный перечень допустимых ключей — берём из русского словаря.
 * Служит белым списком: в БД нельзя записать ключ, которого нет в интерфейсе.
 */
export const ALL_KEYS: string[] = Object.keys(flatten(ruMessages as NestedMessages));
const KEY_SET = new Set(ALL_KEYS);

export function isKnownKey(key: string): boolean {
  return KEY_SET.has(key);
}

export function isKnownLocale(locale: string): locale is Locale {
  return (routing.locales as readonly string[]).includes(locale);
}

/** Значения по умолчанию для языка, в плоском виде. */
export async function loadDefaults(locale: string): Promise<FlatMessages> {
  const file = (await import(`../../messages/${locale}.json`)).default;
  return flatten(file as NestedMessages);
}

/** Переопределения из БД для языка. Ошибка БД не должна ронять сайт. */
export async function loadOverrides(locale: string): Promise<FlatMessages> {
  try {
    const rows = await prisma.siteText.findMany({
      where: { locale },
      select: { key: true, value: true },
    });
    const out: FlatMessages = {};
    // Ключи, удалённые из интерфейса, игнорируем — иначе словарь замусорится.
    for (const row of rows) if (isKnownKey(row.key)) out[row.key] = row.value;
    return out;
  } catch (error) {
    console.error('[siteText] не удалось прочитать переопределения:', error);
    return {};
  }
}

/** Итоговый словарь: файл + правки администратора. */
export async function loadMessages(locale: string): Promise<NestedMessages> {
  const [defaults, overrides] = await Promise.all([
    loadDefaults(locale),
    loadOverrides(locale),
  ]);
  return unflatten({ ...defaults, ...overrides });
}

/**
 * Разделы админки. Порядок задаёт порядок вкладок на странице
 * «Тексты сайта»; ключи группируются по первому сегменту пути.
 */
export const SECTIONS: { prefix: string; title: string; hint: string }[] = [
  { prefix: 'footer', title: 'Контакты и подвал', hint: 'Телефон, e-mail, адрес, режим работы' },
  { prefix: 'home', title: 'Главная страница', hint: 'Заголовки, преимущества, шаги, призыв к действию' },
  { prefix: 'nav', title: 'Меню и кнопки', hint: 'Пункты навигации и надписи на кнопках' },
  { prefix: 'catalog', title: 'Каталог', hint: 'Заголовки и подсказки страницы автопарка' },
  { prefix: 'car', title: 'Карточка автомобиля', hint: 'Подписи характеристик' },
  { prefix: 'booking', title: 'Форма бронирования', hint: 'Поля, подсказки, тексты ошибок' },
  { prefix: 'success', title: 'Подтверждение заявки', hint: 'Страница после успешной брони' },
  { prefix: 'search', title: 'Форма поиска по датам', hint: '' },
  { prefix: 'login', title: 'Вход для сотрудников', hint: '' },
  { prefix: 'enums', title: 'Справочники', hint: 'Типы кузова, коробки, топлива, статусы заказов' },
  { prefix: 'errors', title: 'Страницы ошибок', hint: '' },
  { prefix: 'meta', title: 'SEO: заголовки вкладок', hint: 'Видны в браузере и поисковой выдаче' },
];

/** Человеческие подписи для самых востребованных полей. */
export const KEY_LABELS: Record<string, string> = {
  'footer.phone': 'Телефон',
  'footer.email': 'E-mail',
  'footer.address': 'Адрес',
  'footer.mapUrl': 'Ссылка на карту (Google, Яндекс, 2ГИС) — открывается по клику на адрес',
  'footer.waText': 'Первое сообщение, которое подставится в WhatsApp',
  'footer.hours': 'Режим работы',
  'footer.about': 'Описание компании в подвале',
  'footer.serviceTitle': 'Заголовок колонки «Сервис»',
  'footer.contactsTitle': 'Заголовок колонки «Контакты»',
  'footer.staff': 'Ссылка «Вход для сотрудников»',
  'footer.rights': 'Копирайт ({year} подставляется автоматически)',
  'home.title1': 'Заголовок на главной, первая строка',
  'home.title2': 'Заголовок на главной, вторая строка',
  'home.subtitle': 'Подзаголовок на главной',
  'home.eyebrow': 'Надпись над заголовком',
};

/** Поля, которые удобнее править в многострочном поле. */
export function isLongField(key: string, value: string): boolean {
  return value.length > 70 || key.endsWith('about') || key.endsWith('subtitle');
}
