import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { loadDefaults, loadOverrides } from '@/lib/siteText';
import { ContentEditor, type LocaleContent } from '@/components/admin/ContentEditor';
import { BrandImageUploader } from '@/components/admin/BrandImageUploader';
import { findBrandImage } from '@/lib/brand';

export const metadata: Metadata = { title: 'Оформление и тексты сайта' };
export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  // Для каждого языка отдаём словарь по умолчанию и текущие правки.
  const entries = await Promise.all(
    routing.locales.map(async (locale): Promise<[string, LocaleContent]> => {
      const [defaults, overrides] = await Promise.all([
        loadDefaults(locale),
        loadOverrides(locale),
      ]);
      return [locale, { defaults, overrides }];
    }),
  );
  const content = Object.fromEntries(entries);
  const [logo, hero] = await Promise.all([findBrandImage('logo'), findBrandImage('hero')]);

  const totalEdits = entries.reduce((sum, [, c]) => sum + Object.keys(c.overrides).length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Оформление и тексты сайта</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Здесь правится всё, что видит посетитель: логотип и фотография первого экрана,
          телефон, адрес, режим работы, заголовки, описания преимуществ, подписи кнопок
          и полей формы — тексты задаются на каждом из шести языков.
          Пустое поле означает «использовать текст по умолчанию», он показан серым внутри поля.
          Изменения появляются на сайте сразу после сохранения, пересобирать проект не нужно.
        </p>
        {totalEdits > 0 && (
          <p className="mt-2 text-xs text-accent">
            Своих текстов сейчас задано: {totalEdits}
          </p>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <BrandImageUploader
          kind="logo"
          title="Логотип"
          description="Готовая картинка с надписью заменит текстовый знак в шапке сайта, в подвале, на странице входа и в админке. Лучше всего PNG с прозрачным фоном, высотой от 200 пикселей. Если логотип удалить, вернётся надпись «EnRentAuto»."
          hint="PNG, JPG, WEBP, AVIF · до 8 МБ"
          hasImage={logo !== null}
        />

        <BrandImageUploader
          kind="hero"
          title="Фон первого экрана"
          description="Фотография на весь первый экран главной страницы. Поверх ложится тёмный градиент, чтобы заголовок и форма поиска оставались читаемыми. Нужен горизонтальный снимок от 1920×1080; главный объект лучше держать справа — слева его закроет текст."
          hint="JPG или WEBP · от 1920×1080 · до 8 МБ"
          hasImage={hero !== null}
          previewClassName="h-24 w-44"
          previewFit="cover"
        />
      </div>

      <ContentEditor content={content} />
    </div>
  );
}
