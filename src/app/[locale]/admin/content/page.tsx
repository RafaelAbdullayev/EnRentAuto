import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { loadDefaults, loadOverrides } from '@/lib/siteText';
import { ContentEditor, type LocaleContent } from '@/components/admin/ContentEditor';
import { LogoUploader } from '@/components/admin/LogoUploader';
import { findLogo } from '@/lib/brand';

export const metadata: Metadata = { title: 'Логотип и тексты сайта' };
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
  const hasLogo = (await findLogo()) !== null;

  const totalEdits = entries.reduce((sum, [, c]) => sum + Object.keys(c.overrides).length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Логотип и тексты сайта</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Здесь правится всё, что видит посетитель: телефон, адрес, режим работы, заголовки,
          описания преимуществ, подписи кнопок и полей формы — на каждом из шести языков.
          Пустое поле означает «использовать текст по умолчанию», он показан серым внутри поля.
          Изменения появляются на сайте сразу после сохранения, пересобирать проект не нужно.
        </p>
        {totalEdits > 0 && (
          <p className="mt-2 text-xs text-accent">
            Своих текстов сейчас задано: {totalEdits}
          </p>
        )}
      </header>

      <LogoUploader hasLogo={hasLogo} />

      <ContentEditor content={content} />
    </div>
  );
}
