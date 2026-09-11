import { createHash } from 'node:crypto';
import type { DeveloperProfile } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { routing, type Locale } from '@/i18n/routing';
import { translateTexts } from '@/lib/translate';

/**
 * Визитка разработчика для страницы «О сайте».
 *
 * Всё заполняется в админке («Разработчик»). Тексты пишутся по-русски, а на
 * остальные языки переводятся машиной при сохранении — так же, как описания
 * автомобилей. Переводы лежат в одном поле JSON: полей мало, отдельная
 * таблица тут была бы лишней.
 */

/**
 * Поля, которые имеет смысл переводить. Остальное — имена, ссылки и цифры:
 * их переводить нечего.
 */
type TextField = 'role' | 'tagline' | 'about' | 'priceNote';

export type DeveloperTexts = Record<TextField, string> & { services: string[] };

export const EMPTY_PROFILE = {
  isPublished: false,
  name: '',
  role: '',
  tagline: '',
  about: '',
  city: '',
  years: 0,
  projects: 0,
  phone: '',
  whatsapp: '',
  telegram: '',
  email: '',
  website: '',
  github: '',
  linkedin: '',
  instagram: '',
  skills: [] as string[],
  services: [] as string[],
  priceNote: '',
};

export type DeveloperInput = typeof EMPTY_PROFILE;

/** Профиль как он лежит в базе; строки нет — отдаём пустой. */
export async function getDeveloperProfile(): Promise<DeveloperProfile | null> {
  try {
    return await prisma.developerProfile.findUnique({ where: { id: 'singleton' } });
  } catch (error) {
    console.error('[developer] не удалось прочитать профиль:', error);
    return null;
  }
}

/** Отпечаток русских текстов — по нему видно, что переводы устарели. */
export function developerSourceHash(p: {
  role: string;
  tagline: string;
  about: string;
  priceNote: string;
  services: string[];
}): string {
  return createHash('sha1')
    .update(JSON.stringify([p.role, p.tagline, p.about, p.priceNote, p.services]))
    .digest('hex');
}

/**
 * Тексты на языке страницы: перевод, если он есть, иначе русский оригинал.
 * Поля берутся поштучно — перевод может быть заполнен наполовину.
 */
export function pickDeveloperTexts(
  profile: DeveloperProfile,
  locale: string,
): DeveloperTexts {
  const base: DeveloperTexts = {
    role: profile.role,
    tagline: profile.tagline,
    about: profile.about,
    priceNote: profile.priceNote,
    services: profile.services,
  };
  if (locale === routing.defaultLocale) return base;

  const all = (profile.translations ?? {}) as Record<string, Partial<DeveloperTexts>>;
  const tr = all[locale];
  if (!tr) return base;

  return {
    role: tr.role?.trim() || base.role,
    tagline: tr.tagline?.trim() || base.tagline,
    about: tr.about?.trim() || base.about,
    priceNote: tr.priceNote?.trim() || base.priceNote,
    services:
      Array.isArray(tr.services) && tr.services.length === base.services.length
        ? tr.services.map((s, i) => (s.trim() ? s : base.services[i]))
        : base.services,
  };
}

/**
 * Переводит тексты визитки на остальные языки сайта и сохраняет их.
 * Языки идут одновременно; ошибка на одном не мешает другим — непереведённый
 * язык просто покажет русский текст.
 */
export async function translateDeveloperProfile(): Promise<void> {
  const profile = await getDeveloperProfile();
  if (!profile) return;

  const hash = developerSourceHash(profile);
  if (hash === profile.sourceHash) return;

  const source = [profile.role, profile.tagline, profile.about, profile.priceNote, ...profile.services];
  if (source.every((t) => !t.trim())) {
    await prisma.developerProfile.update({
      where: { id: 'singleton' },
      data: { translations: {}, sourceHash: hash },
    });
    return;
  }

  const targets = routing.locales.filter((l) => l !== routing.defaultLocale) as Locale[];
  const result: Record<string, DeveloperTexts> = {};

  await Promise.all(
    targets.map(async (locale) => {
      try {
        const [role, tagline, about, priceNote, ...services] = await translateTexts(source, locale);
        result[locale] = { role, tagline, about, priceNote, services };
      } catch (error) {
        console.error(`[developer] перевод на ${locale} не удался:`, error);
      }
    }),
  );

  await prisma.developerProfile.update({
    where: { id: 'singleton' },
    data: { translations: result, sourceHash: hash },
  });
}

/**
 * Открыта ли страница «О сайте» — от этого зависит пункт в шапке.
 *
 * Намеренно без кэша: это выборка одной строки по первичному ключу, дешевле
 * миллисекунды. Кэш здесь уже подводил — значение переживало и перезапуск, и
 * правку прямо в базе, а сайт продолжал показывать старое состояние.
 */
export async function isDeveloperPageOpen(): Promise<boolean> {
  try {
    const profile = await prisma.developerProfile.findUnique({
      where: { id: 'singleton' },
      select: { isPublished: true, name: true },
    });
    return Boolean(profile?.isPublished && profile.name.trim());
  } catch (error) {
    console.error('[developer] не удалось прочитать флаг публикации:', error);
    return false;
  }
}

/** Сохранение из админки. Переводы обновляются отдельно, после ответа. */
export async function saveDeveloperProfile(input: DeveloperInput): Promise<DeveloperProfile> {
  const profile = await prisma.developerProfile.upsert({
    where: { id: 'singleton' },
    update: input,
    create: { id: 'singleton', ...input },
  });
  return profile;
}

/** Есть ли что показывать: опубликовано и заполнено имя. */
export function isDeveloperPagePublic(profile: DeveloperProfile | null): boolean {
  return Boolean(profile?.isPublished && profile.name.trim());
}
