import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { routing, type Locale } from '@/i18n/routing';
import { translateTexts, isTranslateConfigured } from '@/lib/translate';

/**
 * Переводы карточки автомобиля.
 *
 * Русский текст — базовый, он лежит в самой таблице Car. Для остальных
 * языков переводы хранятся в CarTranslation: их делает машина при сохранении
 * автомобиля, а администратор может поправить руками.
 *
 * У каждого перевода запоминается отпечаток русского текста (`sourceHash`).
 * Отпечаток разошёлся с текущим — значит описание правили после перевода,
 * и перевод считается устаревшим.
 */

/** Языки, на которые переводим (все, кроме базового русского). */
export const TRANSLATABLE_LOCALES = routing.locales.filter(
  (l) => l !== routing.defaultLocale,
) as Locale[];

export interface CarText {
  description: string;
  features: string[];
}

/** Отпечаток исходного текста: описание + опции. */
export function carSourceHash(source: CarText): string {
  return createHash('sha1')
    .update(JSON.stringify([source.description, source.features]))
    .digest('hex');
}

/**
 * Что показать посетителю: перевод, если он есть, иначе русский оригинал.
 * Описание и опции берутся независимо друг от друга — перевод может быть
 * заполнен наполовину.
 */
export function pickCarText(
  base: CarText,
  translation: { description: string; features: string[] } | null | undefined,
): CarText {
  return {
    description: translation?.description?.trim() ? translation.description : base.description,
    features:
      translation?.features && translation.features.length === base.features.length
        ? translation.features.map((f, i) => (f.trim() ? f : base.features[i]))
        : base.features,
  };
}

export interface TranslateCarResult {
  done: Locale[];
  failed: { locale: Locale; error: string }[];
  skipped: Locale[];
}

/**
 * Переводит автомобиль на нужные языки и сохраняет результат.
 *
 * @param options.locales   какие языки обновить (по умолчанию все);
 * @param options.force     переводить заново даже свежие переводы;
 * @param options.overwriteManual  перезаписывать переводы, правленные руками.
 *
 * Языки переводятся по очереди: ошибка на одном не мешает остальным.
 */
export async function translateCar(
  carId: string,
  options: { locales?: Locale[]; force?: boolean; overwriteManual?: boolean } = {},
): Promise<TranslateCarResult> {
  const result: TranslateCarResult = { done: [], failed: [], skipped: [] };
  if (!isTranslateConfigured()) return result;

  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { description: true, features: true, translations: true },
  });
  if (!car) return result;

  const source: CarText = { description: car.description, features: car.features };
  const hash = carSourceHash(source);

  // Переводить нечего — но старые переводы тогда лишние, они относятся
  // к тексту, которого больше нет.
  if (!source.description.trim() && source.features.length === 0) {
    await prisma.carTranslation.deleteMany({ where: { carId } });
    return result;
  }

  const locales = options.locales ?? TRANSLATABLE_LOCALES;

  for (const locale of locales) {
    const existing = car.translations.find((t) => t.locale === locale);

    // Свежий перевод не трогаем, ручной — только по прямой просьбе.
    if (!options.force && existing && existing.sourceHash === hash) {
      result.skipped.push(locale);
      continue;
    }
    if (existing && !existing.isAuto && !options.overwriteManual) {
      result.skipped.push(locale);
      continue;
    }

    try {
      const texts = await translateTexts([source.description, ...source.features], locale);
      const [description, ...features] = texts;

      await prisma.carTranslation.upsert({
        where: { carId_locale: { carId, locale } },
        update: { description, features, sourceHash: hash, isAuto: true },
        create: { carId, locale, description, features, sourceHash: hash, isAuto: true },
      });
      result.done.push(locale);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[translate] ${carId} → ${locale}:`, message);
      result.failed.push({ locale, error: message });
    }
  }

  return result;
}
