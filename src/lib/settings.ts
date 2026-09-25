import { prisma } from '@/lib/prisma';
import { clampMusicVolume, MUSIC_VOLUME_DEFAULT } from '@/lib/settings.client';

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

export function clampLogoScale(value: number): number {
  if (!Number.isFinite(value)) return LOGO_SCALE_DEFAULT;
  return Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, Math.round(value)));
}

/**
 * Размер логотипа в процентах.
 *
 * Без кэша: одна строка по первичному ключу стоит дешевле миллисекунды, зато
 * значение всегда свежее — в том числе после правки прямо в базе.
 */
export async function getLogoScale(): Promise<number> {
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
}

export async function saveLogoScale(value: number): Promise<number> {
  const scale = clampLogoScale(value);
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { logoScale: scale },
    create: { id: 'singleton', logoScale: scale },
  });
  return scale;
}

// ─── Фоновая музыка ────────────────────────────────────────────────────────

export {
  MUSIC_VOLUME_MIN,
  MUSIC_VOLUME_MAX,
  MUSIC_VOLUME_DEFAULT,
  clampMusicVolume,
} from '@/lib/settings.client';

export type MusicSettings = { enabled: boolean; volume: number };

/**
 * Настройки музыки. Намеренно без кэша: выборка одной строки по первичному
 * ключу дешевле миллисекунды, а кэш здесь уже подводил — значение переживало
 * и перезапуск, и правку прямо в базе.
 */
export async function getMusicSettings(): Promise<MusicSettings> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' },
      select: { musicEnabled: true, musicVolume: true },
    });
    return {
      enabled: settings?.musicEnabled ?? false,
      volume: clampMusicVolume(settings?.musicVolume ?? MUSIC_VOLUME_DEFAULT),
    };
  } catch (error) {
    console.error('[settings] не удалось прочитать настройки музыки:', error);
    return { enabled: false, volume: MUSIC_VOLUME_DEFAULT };
  }
}

export async function saveMusicSettings(patch: Partial<MusicSettings>): Promise<MusicSettings> {
  const data = {
    ...(patch.enabled === undefined ? {} : { musicEnabled: patch.enabled }),
    ...(patch.volume === undefined ? {} : { musicVolume: clampMusicVolume(patch.volume) }),
  };
  const saved = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
    select: { musicEnabled: true, musicVolume: true },
  });
  return { enabled: saved.musicEnabled, volume: clampMusicVolume(saved.musicVolume) };
}
