import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { LOCALE_LABELS, type Locale } from '@/i18n/routing';

/**
 * Машинный перевод текстов автомобиля.
 *
 * Работает через одного из двух поставщиков — что настроено в .env, то и
 * используется:
 *   ANTHROPIC_API_KEY        — перевод моделью Claude (лучше держит стиль
 *                              объявления и азербайджанский язык);
 *   GOOGLE_TRANSLATE_API_KEY — Google Cloud Translation v2.
 *
 * Ключа нет — перевод недоступен, и в админке об этом написано. Переводы
 * всегда можно вписать руками, поэтому сайт работает и без ключа.
 */

export type TranslateProvider = 'anthropic' | 'google';

/** Модель для перевода. Меняется через .env, если понадобится дешевле. */
const CLAUDE_MODEL = process.env.TRANSLATE_MODEL || 'claude-opus-5';

/** Куда ходить за переводом Google. Вынесено в .env ради тестов и прокси. */
const GOOGLE_URL =
  process.env.GOOGLE_TRANSLATE_URL || 'https://translation.googleapis.com/language/translate/v2';

/** Какой поставщик настроен. Anthropic — приоритетнее: качество выше. */
export function translateProvider(): TranslateProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return 'google';
  return null;
}

export function isTranslateConfigured(): boolean {
  return translateProvider() !== null;
}

/** Название языка по-английски — так модели и API понимают цель однозначно. */
const TARGET_NAMES: Record<Locale, string> = {
  ru: 'Russian',
  en: 'English',
  az: 'Azerbaijani',
  tr: 'Turkish',
  ar: 'Arabic',
  zh: 'Simplified Chinese',
};

/**
 * Переводит набор строк с русского на указанный язык.
 * Порядок и количество строк сохраняются: пустые строки не отправляются
 * никуда и возвращаются пустыми.
 */
export async function translateTexts(texts: string[], target: Locale): Promise<string[]> {
  const provider = translateProvider();
  if (!provider) throw new Error('Машинный перевод не настроен');
  if (target === 'ru') return texts;

  // Отправляем только непустые строки, потом раскладываем ответ по местам.
  const indexes: number[] = [];
  const payload: string[] = [];
  texts.forEach((text, i) => {
    if (text.trim()) {
      indexes.push(i);
      payload.push(text);
    }
  });
  if (payload.length === 0) return texts.map(() => '');

  const translated =
    provider === 'anthropic'
      ? await translateWithClaude(payload, target)
      : await translateWithGoogle(payload, target);

  if (translated.length !== payload.length) {
    throw new Error(
      `Переводчик вернул ${translated.length} строк вместо ${payload.length}`,
    );
  }

  const out = texts.map(() => '');
  indexes.forEach((originalIndex, i) => {
    out[originalIndex] = translated[i].trim();
  });
  return out;
}

// ─── Claude ────────────────────────────────────────────────────────────────

/** Ответ модели: переводы в том же порядке, что и присланные строки. */
const TRANSLATION_SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'string' } } },
  required: ['items'],
  additionalProperties: false,
} as const;

async function translateWithClaude(texts: string[], target: Locale): Promise<string[]> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system:
      'Ты переводишь тексты для сайта проката автомобилей в Азербайджане. ' +
      'Переводи с русского на указанный язык живым языком объявления, а не дословно. ' +
      'Марки, модели, числа, единицы измерения и названия опций сохраняй точными. ' +
      'Ничего не добавляй и не выбрасывай: сколько строк прислали — столько верни, в том же порядке.',
    messages: [
      {
        role: 'user',
        content:
          `Целевой язык: ${TARGET_NAMES[target]} (${LOCALE_LABELS[target].native}).\n\n` +
          `Строки для перевода:\n${JSON.stringify(texts, null, 2)}`,
      },
    ],
    output_config: { format: jsonSchemaOutputFormat(TRANSLATION_SCHEMA) },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Модель отказалась переводить этот текст');
  }
  if (!response.parsed_output) {
    throw new Error('Не удалось разобрать ответ переводчика');
  }
  return response.parsed_output.items;
}

// ─── Google Cloud Translation v2 ───────────────────────────────────────────

interface GoogleResponse {
  data?: { translations?: { translatedText?: string }[] };
  error?: { message?: string };
}

async function translateWithGoogle(texts: string[], target: Locale): Promise<string[]> {
  const response = await fetch(`${GOOGLE_URL}?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: 'ru', target, format: 'text' }),
  });

  const json = (await response.json().catch(() => null)) as GoogleResponse | null;
  if (!response.ok || !json?.data?.translations) {
    throw new Error(json?.error?.message ?? `Google ответил ${response.status}`);
  }

  // Google отдаёт текст с HTML-мнемониками даже в режиме format=text.
  return json.data.translations.map((t) => decodeEntities(t.translatedText ?? ''));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
