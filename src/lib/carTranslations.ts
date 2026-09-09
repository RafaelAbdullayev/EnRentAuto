import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { routing, type Locale } from '@/i18n/routing';
import { translateTexts } from '@/lib/translate';

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
 * Языки переводятся одновременно, а строки внутри языка — по очереди:
 * бесплатный переводчик принимает по одной строке за запрос, и десяток опций
 * подряд на пять языков занял бы минуту. Ошибка на одном языке не мешает
 * остальным — каждый сохраняется сам по себе.
 */
export async function translateCar(
  carId: string,
  options: { locales?: Locale[]; force?: boolean; overwriteManual?: boolean } = {},
): Promise<TranslateCarResult> {
  const result: TranslateCarResult = { done: [], failed: [], skipped: [] };

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

  const pending: Locale[] = [];
  for (const locale of locales) {
    const existing = car.translations.find((t) => t.locale === locale);

    // Свежий перевод не трогаем, ручной — только по прямой просьбе.
    if (!options.force && existing && existing.sourceHash === hash) {
      result.skipped.push(locale);
    } else if (existing && !existing.isAuto && !options.overwriteManual) {
      result.skipped.push(locale);
    } else {
      pending.push(locale);
    }
  }

  if (pending.length === 0) return result;

  const started = Date.now();
  console.info(`[translate] ${carId}: перевожу на ${pending.join(', ')}`);

  await Promise.all(
    pending.map(async (locale) => {
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
        console.error(`[translate] ${carId} → ${locale}: ${message}`);
        result.failed.push({ locale, error: message });
      }
    }),
  );

  console.info(
    `[translate] ${carId}: готово за ${Math.round((Date.now() - started) / 1000)} с — ` +
      `переведено ${result.done.join(', ') || '—'}` +
      (result.failed.length ? `, не удалось ${result.failed.map((f) => f.locale).join(', ')}` : ''),
  );

  return result;
}

/**
 * Автомобили, у которых перевода нет или он устарел.
 * Отпечаток текста считается в коде, поэтому проверяем не запросом, а в памяти:
 * машин в парке десятки, это дешевле, чем усложнять схему.
 */
export async function carsNeedingTranslation(): Promise<
  { id: string; title: string }[]
> {
  const cars = await prisma.car.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      brand: true,
      model: true,
      description: true,
      features: true,
      translations: { select: { locale: true, sourceHash: true, isAuto: true } },
    },
  });

  return cars
    .filter((car) => {
      // Пустую карточку переводить нечего.
      if (!car.description.trim() && car.features.length === 0) return false;

      const hash = carSourceHash({ description: car.description, features: car.features });
      return TRANSLATABLE_LOCALES.some((locale) => {
        const row = car.translations.find((t) => t.locale === locale);
        if (!row) return true;
        // Ручные переводы не трогаем, даже если исходник менялся.
        return row.isAuto && row.sourceHash !== hash;
      });
    })
    .map((car) => ({ id: car.id, title: `${car.brand} ${car.model}` }));
}

/** Ошибка про исчерпанный дневной лимит бесплатного переводчика. */
export function isLimitError(message: string): boolean {
  return /лимит/i.test(message);
}
