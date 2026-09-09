import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { LOCALE_LABELS, type Locale } from '@/i18n/routing';

/**
 * Машинный перевод текстов автомобиля.
 *
 * Поставщик выбирается по тому, что настроено в .env:
 *   ANTHROPIC_API_KEY        — Claude: лучше всех держит стиль объявления
 *                              и азербайджанский язык, платный;
 *   GOOGLE_TRANSLATE_API_KEY — Google Cloud Translation v2, 500 тыс. знаков
 *                              в месяц бесплатно, нужен аккаунт с картой;
 *   ничего не настроено      — MyMemory: бесплатно и без регистрации, но с
 *                              дневным лимитом и качеством попроще.
 *
 * То есть перевод работает всегда, «из коробки». Ключ нужен только тем, кому
 * важнее качество или объём. Любой перевод можно поправить руками.
 */

export type TranslateProvider = 'anthropic' | 'google' | 'mymemory';

/** Модель для перевода. Меняется через .env, если понадобится дешевле. */
const CLAUDE_MODEL = process.env.TRANSLATE_MODEL || 'claude-opus-5';

/** Куда ходить за переводом Google. Вынесено в .env ради тестов и прокси. */
const GOOGLE_URL =
  process.env.GOOGLE_TRANSLATE_URL || 'https://translation.googleapis.com/language/translate/v2';

/**
 * Какой поставщик используется. Платные идут первыми: если ключ есть, значит
 * его поставили осознанно. Без ключей остаётся бесплатный MyMemory.
 */
export function translateProvider(): TranslateProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return 'google';
  return 'mymemory';
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
      : provider === 'google'
        ? await translateWithGoogle(payload, target)
        : await translateWithMyMemory(payload, target);

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

// ─── MyMemory: бесплатно и без регистрации ─────────────────────────────────

/**
 * Запасной поставщик, который работает без всякой настройки.
 *
 * Ограничения сервиса, из-за которых код выглядит именно так:
 *   • одна строка за запрос, не длиннее ~500 знаков — длинное описание
 *     режем по предложениям и склеиваем обратно;
 *   • дневной лимит знаков с одного адреса: 5 тыс. анонимно и 50 тыс., если
 *     указать почту в MYMEMORY_EMAIL;
 *   • при исчерпании лимита сервис отвечает предупреждением в тексте перевода,
 *     а не кодом ошибки, — это ловится отдельно, чтобы не записать в базу
 *     английское ругательство вместо описания.
 */

const MYMEMORY_URL = process.env.MYMEMORY_URL || 'https://api.mymemory.translated.net/get';
const CHUNK_LIMIT = 450;

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
  responseDetails?: string;
}

async function translateWithMyMemory(texts: string[], target: Locale): Promise<string[]> {
  const out: string[] = [];
  for (const text of texts) {
    const parts: string[] = [];
    for (const chunk of splitForTranslation(text)) {
      parts.push(await myMemoryOne(chunk, target));
    }
    out.push(parts.join(' '));
  }
  return out;
}

async function myMemoryOne(text: string, target: Locale): Promise<string> {
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `ru|${target}`);
  if (process.env.MYMEMORY_EMAIL) url.searchParams.set('de', process.env.MYMEMORY_EMAIL);

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const json = (await response.json().catch(() => null)) as MyMemoryResponse | null;
  const translated = json?.responseData?.translatedText ?? '';

  const status = Number(json?.responseStatus ?? response.status);
  if (!response.ok || status !== 200) {
    throw new Error(myMemoryError(json?.responseDetails ?? `сервис ответил ${status}`));
  }
  // Лимит исчерпан — предупреждение приходит вместо перевода, кодом 200.
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE/i.test(translated)) {
    throw new Error(myMemoryError(translated));
  }
  return decodeEntities(translated);
}

function myMemoryError(details: string): string {
  if (/USED ALL AVAILABLE FREE TRANSLATIONS|LIMIT/i.test(details)) {
    return process.env.MYMEMORY_EMAIL
      ? 'Дневной лимит бесплатного переводчика исчерпан — продолжите завтра ' +
          'или подключите свой ключ (см. README)'
      : 'Дневной лимит бесплатного переводчика исчерпан. Укажите MYMEMORY_EMAIL ' +
          'в .env — лимит вырастет в десять раз';
  }
  return `Бесплатный переводчик: ${details}`;
}

/**
 * Режет текст на куски не длиннее лимита, по границам предложений.
 * Предложение длиннее лимита дробится по словам — иначе сервис его отбросит.
 */
export function splitForTranslation(text: string, limit = CHUNK_LIMIT): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed ? [trimmed] : [];

  const sentences = trimmed.match(/[^.!?\n]+[.!?]*\s*/g) ?? [trimmed];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    for (const piece of splitByWords(sentence.trim(), limit)) {
      if (!current) {
        current = piece;
      } else if (current.length + 1 + piece.length <= limit) {
        current += ` ${piece}`;
      } else {
        chunks.push(current);
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitByWords(text: string, limit: number): string[] {
  if (text.length <= limit) return text ? [text] : [];
  const parts: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (!current) current = word.slice(0, limit);
    else if (current.length + 1 + word.length <= limit) current += ` ${word}`;
    else {
      parts.push(current);
      current = word.slice(0, limit);
    }
  }
  if (current) parts.push(current);
  return parts;
}
