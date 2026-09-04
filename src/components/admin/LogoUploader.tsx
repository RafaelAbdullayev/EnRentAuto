'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/format';
import { LOGO_URL } from '@/lib/brand.client';

/**
 * Загрузка логотипа сайта: drag-and-drop или выбор файла.
 * Картинка заменяет и значок, и надпись в шапке, подвале, на входе
 * и в админке — пересобирать проект не нужно.
 */
export function LogoUploader({ hasLogo }: { hasLogo: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [present, setPresent] = useState(hasLogo);
  // Метка времени в адресе: браузер не показывает старый логотип из кэша.
  const [version, setVersion] = useState(0);

  async function upload(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/logo', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось загрузить логотип');
        return;
      }
      setPresent(true);
      setVersion(Date.now());
      router.refresh();
    } catch {
      setError('Сеть недоступна. Повторите загрузку.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    if (!confirm('Удалить логотип и вернуть текстовую надпись EnRentAuto?')) return;

    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/logo', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Не удалось удалить логотип');
        return;
      }
      setPresent(false);
      setVersion(Date.now());
      router.refresh();
    } catch {
      setError('Сеть недоступна. Повторите попытку.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface p-6">
      <h2 className="text-sm font-semibold text-white">Логотип</h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Загрузите готовую картинку с надписью — она заменит текстовый знак в шапке сайта,
        в подвале, на странице входа и в админке. Лучше всего PNG с прозрачным фоном,
        высотой от 200 пикселей. Если логотип удалить, вернётся надпись «EnRentAuto».
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-24 w-56 shrink-0 place-items-center rounded-xl border border-ink-600 bg-ink-950 p-3">
          {present ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={version ? `${LOGO_URL}?v=${version}` : LOGO_URL}
              alt="Текущий логотип"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-600">Логотип не загружен</span>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200',
            dragging
              ? 'border-accent bg-accent/5'
              : 'border-ink-600 bg-ink-900/40 hover:border-accent/50 hover:bg-ink-800/40',
          )}
        >
          <span className="text-2xl text-zinc-600">{busy ? '⏳' : '⇪'}</span>
          <p className="mt-2 text-sm text-zinc-300">
            {busy ? 'Загружаем…' : 'Перетащите файл логотипа сюда или нажмите для выбора'}
          </p>
          <p className="mt-1 text-xs text-zinc-600">PNG, JPG, WEBP, AVIF · до 8 МБ</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            hidden
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {present && (
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          className="mt-4 rounded-lg border border-ink-600 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-signal-cancel/60 hover:text-signal-cancel disabled:opacity-50"
        >
          Удалить логотип
        </button>
      )}
    </section>
  );
}
