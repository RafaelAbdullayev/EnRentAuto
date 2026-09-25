import { getMusicSettings } from '@/lib/settings';
import { getMusicTracks } from '@/lib/music';
import { BackgroundMusic } from '@/components/BackgroundMusic';

/**
 * Читает настройки музыки и, если есть что играть, ставит проигрыватель.
 *
 * Отдельный серверный компонент, потому что каркас страницы не должен знать
 * про базу. Флаг и плейлист проверяются порознь: музыку можно временно
 * выключить, не удаляя мелодии.
 */
export async function BackgroundMusicMount() {
  const [music, tracks] = await Promise.all([getMusicSettings(), getMusicTracks()]);
  if (!music.enabled || tracks.length === 0) return null;

  return (
    <BackgroundMusic
      tracks={tracks.map(({ url, title }) => ({ url, title }))}
      defaultVolume={music.volume}
    />
  );
}
