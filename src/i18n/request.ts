import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { loadMessages } from '@/lib/siteText';

/**
 * Загрузка словаря для текущего запроса.
 *
 * Значения по умолчанию берутся из messages/<locale>.json, поверх них
 * накладываются правки администратора из таблицы SiteText. Публичные
 * страницы рендерятся динамически, поэтому изменения видны сразу после
 * сохранения — пересборка не нужна.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return { locale, messages: await loadMessages(locale) };
});
