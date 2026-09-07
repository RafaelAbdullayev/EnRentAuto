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

/** Как показывать фон первого экрана. */
export async function getHeroFit(): Promise<HeroFit> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' },
      select: { heroFit: true },
    });
    return settings && isHeroFit(settings.heroFit) ? settings.heroFit : 'cover';
  } catch (error) {
    console.error('[settings] не удалось прочитать настройки:', error);
    return 'cover';
  }
}

export async function setHeroFit(fit: HeroFit): Promise<void> {
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { heroFit: fit },
    create: { id: 'singleton', heroFit: fit },
  });
}
