/**
 * Настройки, нужные и на сервере, и в браузере. Вынесено отдельно от
 * src/lib/settings.ts: тот обращается к базе и не должен попадать в
 * клиентский бандл.
 */

/**
 * Пределы громкости фоновой музыки, проценты.
 *
 * Потолок намеренно низкий: фоновая мелодия на сайте проката — украшение,
 * а не концерт. Громче трети человек просто закрывает вкладку.
 */
export const MUSIC_VOLUME_MIN = 1;
export const MUSIC_VOLUME_MAX = 60;
export const MUSIC_VOLUME_DEFAULT = 15;

export function clampMusicVolume(value: number): number {
  if (!Number.isFinite(value)) return MUSIC_VOLUME_DEFAULT;
  return Math.min(MUSIC_VOLUME_MAX, Math.max(MUSIC_VOLUME_MIN, Math.round(value)));
}
