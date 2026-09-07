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
