'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/format';
import { brandUrl } from '@/lib/brand.client';

/** Выбор посетителя переживает переходы по страницам и новые визиты. */
const STORAGE_KEY = 'era_music';

type Choice = { on: boolean; volume: number };

function readChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Choice>;
    if (typeof parsed.on !== 'boolean') return null;
    const volume = Number(parsed.volume);
    return { on: parsed.on, volume: Number.isFinite(volume) ? volume : 15 };
  } catch {
    // Приватное окно или запрещённые данные сайта — молча работаем без памяти.
    return null;
  }
}

function writeChoice(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* см. выше */
  }
}

/**
 * Фоновая музыка сайта.
 *
 * Главное ограничение: **браузер не даёт запустить звук сам по себе**. Chrome,
 * Safari и Firefox блокируют воспроизведение до первого действия человека —
 * обойти это нельзя. Поэтому музыка по умолчанию молчит, а кнопка её включает.
 *
 * Если посетитель уже включал музыку, его выбор запомнен, и она подхватится
 * при первом же щелчке или нажатии клавиши на странице: к этому моменту
 * действие человека есть, и запрет снят.
 *
 * Файл не скачивается, пока музыку не включили (`preload="none"`): тянуть
 * несколько мегабайт тому, кто слушать не собирается, — впустую тратить его
 * трафик. В спрятанной вкладке воспроизведение останавливается.
 */
export function BackgroundMusic({ defaultVolume }: { defaultVolume: number }) {
  const t = useTranslations('music');
  const audioRef = useRef<HTMLAudioElement>(null);

  const [on, setOn] = useState(false);
  const [volume, setVolume] = useState(defaultVolume);
  const [ready, setReady] = useState(false);

  // Громкость применяем всегда: ползунок должен слышаться сразу.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
  }, [volume]);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, volume / 100));
    void audio.play().catch(() => {
      // Браузер отказал — кнопка остаётся в положении «выключено»,
      // чтобы значок не врал о том, что играет.
      setOn(false);
    });
  }, [volume]);

  // Восстанавливаем прошлый выбор. Играть сразу нельзя — ждём первого
  // действия человека, иначе браузер просто откажет.
  useEffect(() => {
    const saved = readChoice();
    if (saved) setVolume(saved.volume);
    setReady(true);
    if (!saved?.on) return;

    setOn(true);
    const wake = () => start();
    const options = { once: true, passive: true } as const;
    document.addEventListener('pointerdown', wake, options);
    document.addEventListener('keydown', wake, options);
    return () => {
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('keydown', wake);
    };
    // Только при первом появлении: дальше состоянием правит кнопка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Спрятанная вкладка не должна играть.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (on) void audio.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [on]);

  function toggle() {
    const nextOn = !on;
    setOn(nextOn);
    writeChoice({ on: nextOn, volume });
    if (nextOn) start();
    else audioRef.current?.pause();
  }

  function changeVolume(value: number) {
    setVolume(value);
    writeChoice({ on, volume: value });
  }

  // До чтения памяти браузера кнопку не показываем: иначе она успела бы
  // мигнуть в положении «выключено» у того, кто музыку уже включал.
  if (!ready) return null;

  return (
    <div className="fixed bottom-5 start-5 z-40 flex items-center gap-2">
      <audio ref={audioRef} src={brandUrl('music')} loop preload="none" />

      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? t('off') : t('on')}
        aria-label={on ? t('off') : t('on')}
        className={cn(
          'grid h-12 w-12 place-items-center rounded-full text-lg shadow-lg transition-all duration-300 hover:scale-105',
          on
            ? 'bg-accent text-ink-950'
            : 'border border-ink-600 bg-ink-900/90 text-zinc-400 backdrop-blur hover:text-white',
        )}
      >
        <span aria-hidden="true">{on ? '♪' : '🔇'}</span>
      </button>

      {/* Ползунок появляется только когда есть что регулировать. */}
      {on && (
        <label className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/90 px-3 py-2 shadow-lg backdrop-blur">
          <span className="sr-only">{t('volume')}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label={t('volume')}
            className="h-1 w-24 cursor-pointer accent-accent"
          />
        </label>
      )}
    </div>
  );
}
