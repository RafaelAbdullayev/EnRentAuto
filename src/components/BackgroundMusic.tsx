'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/format';

/** Выбор посетителя переживает переходы по страницам и новые визиты. */
const STORAGE_KEY = 'era_music';

/**
 * Где остановились: номер трека и секунда. Живёт только до закрытия вкладки
 * (sessionStorage): переходы по сайту звук и так не обрывают — это на случай
 * перезагрузки страницы и смены языка, когда каркас пересоздаётся.
 */
const POSITION_KEY = 'era_music_at';

type Position = { track: number; at: number };

function readPosition(): Position {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    if (!raw) return { track: 0, at: 0 };
    const parsed = JSON.parse(raw) as Partial<Position>;
    const track = Number(parsed.track);
    const at = Number(parsed.at);
    return {
      track: Number.isInteger(track) && track >= 0 ? track : 0,
      at: Number.isFinite(at) && at > 0 ? at : 0,
    };
  } catch {
    return { track: 0, at: 0 };
  }
}

function writePosition(position: Position): void {
  try {
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    /* приватное окно — переживём */
  }
}

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
 * Эквалайзер: три полоски, которые пляшут, пока музыка идёт.
 *
 * Разные длительности и задержки — чтобы полоски не двигались строем:
 * синхронные скачки выглядят механически, вразнобой — живо.
 */
function EqualizerIcon() {
  const bars = [
    { x: 4, delay: '0ms', duration: '900ms' },
    { x: 9.5, delay: '180ms', duration: '1150ms' },
    { x: 15, delay: '360ms', duration: '780ms' },
  ];

  return (
    <svg viewBox="0 0 22 22" aria-hidden="true" className="h-5 w-5">
      {bars.map((bar) => (
        <rect
          key={bar.x}
          className="eq-bar"
          x={bar.x}
          y={5}
          width={3}
          height={12}
          rx={1.5}
          fill="currentColor"
          style={{ animationDelay: bar.delay, animationDuration: bar.duration }}
        />
      ))}
    </svg>
  );
}

/** Стрелка с чертой — «следующая мелодия». */
function NextIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M6 5.5 15 12l-9 6.5V5.5Z" />
      <path d="M18.5 5.5v13" />
    </svg>
  );
}

/** Динамик с перечёркиванием — «звука нет». */
function MutedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z" />
      <path d="m16 9.5 4.5 5M20.5 9.5l-4.5 5" />
    </svg>
  );
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
 *
 * Компонент стоит в общем каркасе (`[locale]/layout.tsx`), а не в подвале:
 * каркас переходы по сайту переживает, и звук не обрывается. Когда он жил
 * в подвале, каждая страница создавала новый элемент, и мелодия начиналась
 * заново — да ещё и требовала повторного нажатия.
 */
export function BackgroundMusic({
  tracks,
  defaultVolume,
}: {
  tracks: { url: string; title: string }[];
  defaultVolume: number;
}) {
  const t = useTranslations('music');
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [on, setOn] = useState(false);
  const [volume, setVolume] = useState(defaultVolume);
  const [ready, setReady] = useState(false);
  const [track, setTrack] = useState(0);

  const many = tracks.length > 1;
  const current = tracks[Math.min(track, tracks.length - 1)];

  // Громкость применяем всегда: ползунок должен слышаться сразу.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
  }, [volume]);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, volume / 100));

    // Подхватываем с того места, где оборвалось. Длительность известна не
    // всегда (файл ещё не прочитан) — тогда просто начинаем сначала.
    const saved = readPosition();
    if (saved.at > 0 && saved.track === track && (!audio.duration || saved.at < audio.duration)) {
      try {
        audio.currentTime = saved.at;
      } catch {
        /* браузер не дал перемотать — не беда */
      }
    }

    void audio.play().catch(() => {
      // Браузер отказал — кнопка остаётся в положении «выключено»,
      // чтобы значок не врал о том, что играет.
      setOn(false);
    });
  }, [volume, track]);

  /**
   * Следующая мелодия по кругу. Секунду сбрасываем: новый трек начинается
   * сначала, а не с того места, где кончился предыдущий.
   */
  const playNext = useCallback(() => {
    setTrack((prev) => {
      const value = (prev + 1) % tracks.length;
      writePosition({ track: value, at: 0 });
      return value;
    });
  }, [tracks.length]);

  // Смена трека: когда <audio> получил новый адрес, запускаем его. Первый
  // запуск идёт из toggle или из восстановления — тут только продолжение.
  const started = useRef(false);
  useEffect(() => {
    if (!on || !started.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.volume = Math.min(1, Math.max(0, volume / 100));
    void audio.play().catch(() => undefined);
    // Громкость меняется ползунком отдельно — сюда её в зависимости не берём.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // Восстанавливаем прошлый выбор. Играть сразу нельзя — ждём первого
  // действия человека, иначе браузер просто откажет.
  useEffect(() => {
    const saved = readChoice();
    if (saved) setVolume(saved.volume);
    const where = readPosition();
    if (where.track < tracks.length) setTrack(where.track);
    setReady(true);
    if (!saved?.on) return;

    setOn(true);
    const wake = () => {
      started.current = true;
      start();
    };
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

  // Спрятанная вкладка не должна играть. Заодно это удобная точка, чтобы
  // запомнить позицию: перезагрузка часто идёт сразу после ухода со вкладки.
  useEffect(() => {
    const remember = () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 0) writePosition({ track, at: audio.currentTime });
    };

    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        remember();
        audio.pause();
      } else if (on) {
        void audio.play().catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', remember);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', remember);
      remember();
    };
  }, [on, track]);

  function toggle() {
    const nextOn = !on;
    setOn(nextOn);
    writeChoice({ on: nextOn, volume });
    if (nextOn) {
      started.current = true;
      start();
    } else {
      const audio = audioRef.current;
      if (audio) {
        writePosition({ track, at: audio.currentTime });
        audio.pause();
      }
    }
  }

  function changeVolume(value: number) {
    setVolume(value);
    writeChoice({ on, volume: value });
  }

  // До чтения памяти браузера кнопку не показываем: иначе она успела бы
  // мигнуть в положении «выключено» у того, кто музыку уже включал.
  if (!ready) return null;

  // В админке музыки нет: она мешает работать с заказами. Элемент при этом
  // пропадает, поэтому звук останавливается — так и задумано.
  if (pathname.startsWith('/admin')) return null;

  if (!current) return null;

  return (
    <div className="fixed bottom-5 start-5 z-40 flex items-center gap-2">
      {/*
        loop только для единственной мелодии: когда их несколько, конец трека
        должен передавать очередь следующему, а не крутить один по кругу.
      */}
      <audio
        ref={audioRef}
        src={current.url}
        loop={!many}
        preload="none"
        onEnded={many ? playNext : undefined}
        onError={many ? playNext : undefined}
      />

      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? t('off') : t('on')}
        aria-label={on ? t('off') : t('on')}
        className={cn(
          'grid h-12 w-12 place-items-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95',
          on
            ? 'bg-accent text-ink-950 shadow-[0_8px_24px_-8px_rgba(212,175,110,.8)]'
            : 'border border-ink-600 bg-ink-900/90 text-zinc-400 backdrop-blur hover:border-accent/40 hover:text-white',
        )}
      >
        {on ? <EqualizerIcon /> : <MutedIcon />}
      </button>

      {/* Ползунок и «дальше» появляются, только когда есть что регулировать. */}
      {on && (
        <div className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/90 px-3 py-2 shadow-lg backdrop-blur">
          <label className="flex items-center">
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

          {many && (
            <button
              type="button"
              onClick={playNext}
              title={t('next')}
              aria-label={t('next')}
              className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-ink-700 hover:text-white"
            >
              <NextIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
