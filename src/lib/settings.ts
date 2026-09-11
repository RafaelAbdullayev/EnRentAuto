import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Настройки сайта в единственном экземпляре (строка «singleton»).
 * Строки может не быть — тогда работают значения по умолчанию.
 */
export const HERO_FITS = ['cover', 'contain'] as const;
export type HeroFit = (typeof HERO_FITS)[number];

export function isHeroFit(value: string): value is HeroFit {
  return (HERO_FITS as readonly string[]).includes(value);
}

/** media — загруженный фон, cars — слайдшоу из фотографий автопарка. */
export const HERO_MODES = ['media', 'cars'] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export function isHeroMode(value: string): value is HeroMode {
  return (HERO_MODES as readonly string[]).includes(value);
}

export type HeroSettings = { mode: HeroMode; fit: HeroFit };

/** Настройки фона первого экрана. */
export async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' },
      select: { heroMode: true, heroFit: true },
    });
    return {
      mode: settings && isHeroMode(settings.heroMode) ? settings.heroMode : 'media',
      fit: settings && isHeroFit(settings.heroFit) ? settings.heroFit : 'cover',
    };
  } catch (error) {
    console.error('[settings] не удалось прочитать настройки:', error);
    return { mode: 'media', fit: 'cover' };
  }
}

export async function saveHeroSettings(patch: Partial<HeroSettings>): Promise<void> {
  const data = {
    ...(patch.mode ? { heroMode: patch.mode } : {}),
    ...(patch.fit ? { heroFit: patch.fit } : {}),
  };
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });
}

// ─── Размер логотипа ───────────────────────────────────────────────────────

/** Пределы разумного: меньше — не разглядеть, больше — шапка разъезжается. */
export const LOGO_SCALE_MIN = 60;
export const LOGO_SCALE_MAX = 200;
export const LOGO_SCALE_DEFAULT = 100;

const LOGO_SCALE_TAG = 'logo-scale';

export function clampLogoScale(value: number): number {
  if (!Number.isFinite(value)) return LOGO_SCALE_DEFAULT;
  return Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, Math.round(value)));
}

/**
 * Размер логотипа в процентах.
 *
 * Значение читает каждая страница сайта, поэтому оно кэшируется: иначе к базе
 * ходили бы ради одного числа на каждом заходе. Кэш сбрасывается при
 * сохранении нового размера в админке.
 */
export const getLogoScale = unstable_cache(
  async (): Promise<number> => {
    try {
      const settings = await prisma.settings.findUnique({
        where: { id: 'singleton' },
        select: { logoScale: true },
      });
      return clampLogoScale(settings?.logoScale ?? LOGO_SCALE_DEFAULT);
    } catch (error) {
      console.error('[settings] не удалось прочитать размер логотипа:', error);
      return LOGO_SCALE_DEFAULT;
    }
  },
  [LOGO_SCALE_TAG],
  { tags: [LOGO_SCALE_TAG] },
);

export async function saveLogoScale(value: number): Promise<number> {
  const scale = clampLogoScale(value);
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { logoScale: scale },
    create: { id: 'singleton', logoScale: scale },
  });
  // Без сброса кэша сайт показывал бы прежний размер до перезапуска.
  revalidateTag(LOGO_SCALE_TAG);
  return scale;
}
