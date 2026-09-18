'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/format';
import { mapEmbedUrl, mapLink, yandexEmbedUrl } from '@/lib/contact';

type Provider = 'google' | 'yandex';

/**
 * Карта офиса в самом низу страницы, с переключателем Google / Yandex.
 *
 * Обе карты строятся по адресу из «Текстов сайта». Если вписать свою ссылку
 * («Поделиться → Встроить карту» у Google, «Конструктор карт» у Яндекса —
 * ключи `footer.mapEmbedUrl` и `footer.mapEmbedYandex`), возьмётся она: тогда
 * на карте будет точная метка организации, а не поиск по строке адреса.
 *
 * Карточка небольшая и прижата к началу строки (`me-auto` — значит в арабской
 * версии она сама уйдёт к правому краю). Карта во всю ширину экрана забирала
 * внимание у подвала, хотя нужна лишь чтобы разок посмотреть, где офис.
 *
 * Кадр грузится только при подходе к нему (`loading="lazy"`) и только для
 * выбранного сервиса: тянуть оба тяжёлых кадра сразу — впустую тратить трафик
 * посетителя. Адрес не задан — блока нет вовсе.
 */
export function FooterMap() {
  const t = useTranslations('footer');
  const [provider, setProvider] = useState<Provider>('google');

  const address = t('address').trim();
  const sources: Record<Provider, string> = {
    google: mapEmbedUrl(address, t('mapEmbedUrl')),
    yandex: yandexEmbedUrl(address, t('mapEmbedYandex')),
  };

  const available = (['google', 'yandex'] as Provider[]).filter((p) => sources[p]);
  if (available.length === 0) return null;

  const active = sources[provider] ? provider : available[0];

  // Ссылка «открыть в приложении» ведёт в тот же сервис, что показан.
  const openUrl =
    active === 'yandex'
      ? t('mapUrlAlt').trim() ||
        `https://yandex.com/maps/?text=${encodeURIComponent(address)}`
      : mapLink(address, t('mapUrl'));

  return (
    <section aria-label={address} className="border-t border-ink-800/80 py-8">
      <div className="container-page">
        <div className="me-auto w-full max-w-md">
          {/* Переключатель над картой: показываем, только если есть из чего
              выбирать — одна кнопка сама по себе ничего не переключает. */}
          {available.length > 1 && (
            <div className="mb-3 flex gap-1.5">
              {available.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProvider(item)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
                    active === item
                      ? 'bg-accent text-ink-950'
                      : 'border border-ink-600 text-zinc-400 hover:border-accent/40 hover:text-white',
                  )}
                >
                  {item === 'google' ? 'Google' : 'Yandex'}
                </button>
              ))}
            </div>
          )}

          {/* Тёмная подложка: пока кадр грузится (или если сервис недоступен),
              внизу страницы не вспыхивает белый прямоугольник. */}
          <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 sm:h-52">
            {/* key на провайдере: при переключении кадр пересоздаётся, а не
                подменяет адрес у уже загруженной карты. */}
            <iframe
              key={active}
              src={sources[active]}
              title={address}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>

          {/* Адрес и ссылка — под картой, а не поверх неё: на маленькой
              карточке надпись сверху закрывала бы половину видимого куска. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">{address}</span>
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm shrink-0"
            >
              {t('mapOpen')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
