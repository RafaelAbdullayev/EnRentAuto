import { findBrandImage } from '@/lib/brand';
import { getMusicSettings } from '@/lib/settings';
import { BackgroundMusic } from '@/components/BackgroundMusic';

/**
 * Читает настройки музыки и, если есть что играть, ставит проигрыватель.
 *
 * Отдельный серверный компонент, потому что подвал — обычный, не асинхронный:
 * переписывать его целиком ради одного обращения к базе было бы лишним.
 * Флаг и файл проверяются порознь: мелодию можно временно выключить, не удаляя.
 */
export async function BackgroundMusicMount() {
  const [music, file] = await Promise.all([getMusicSettings(), findBrandImage('music')]);
  if (!music.enabled || !file) return null;
  return <BackgroundMusic defaultVolume={music.volume} />;
}
