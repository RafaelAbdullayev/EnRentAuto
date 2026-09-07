import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { routing, LOCALE_LABELS } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { CURRENCY } from '@/lib/currency';

export const metadata: Metadata = { title: 'О программе' };
export const dynamic = 'force-dynamic';

/** Версии берём из package.json, чтобы страница не расходилась с реальностью. */
async function readVersions() {
  try {
    const raw = await readFile(path.join(process.cwd(), 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as {
      version?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const clean = (name: string) => (deps[name] ?? '').replace(/^[\^~]/, '');
    return { version: pkg.version ?? '—', clean };
  } catch {
    return { version: '—', clean: () => '' };
  }
}

export default async function AdminAboutPage() {
  const { version, clean } = await readVersions();

  const [cars, bookings, texts, admins] = await Promise.all([
    prisma.car.count(),
    prisma.booking.count({ where: { isTest: false } }),
    prisma.siteText.count(),
    prisma.user.count(),
  ]);

  const stack: { group: string; items: { name: string; version?: string; note: string }[] }[] = [
    {
      group: 'Основа',
      items: [
        { name: 'Next.js', version: clean('next'), note: 'App Router, серверные компоненты' },
        { name: 'React', version: clean('react'), note: 'Интерфейс' },
        { name: 'TypeScript', version: clean('typescript'), note: 'Строгая типизация, strict mode' },
        { name: 'Node.js', version: process.version.replace(/^v/, ''), note: 'Среда выполнения' },
      ],
    },
    {
      group: 'Данные',
      items: [
        { name: 'PostgreSQL', note: 'База данных' },
        { name: 'Prisma ORM', version: clean('prisma'), note: 'Схема, миграции, запросы' },
        { name: 'Zod', version: clean('zod'), note: 'Проверка всех входящих данных' },
      ],
    },
    {
      group: 'Доступ и безопасность',
      items: [
        { name: 'NextAuth (Auth.js)', version: clean('next-auth'), note: 'Вход, сессии JWT' },
        { name: 'bcrypt', version: clean('bcryptjs'), note: 'Хеширование паролей, 12 раундов' },
        { name: 'Nginx + Let’s Encrypt', note: 'HTTPS, обратный прокси' },
      ],
    },
    {
      group: 'Интерфейс',
      items: [
        { name: 'Tailwind CSS', version: clean('tailwindcss'), note: 'Тёмная премиальная тема' },
        { name: 'next-intl', version: clean('next-intl'), note: 'Шесть языков, включая RTL' },
        { name: 'Recharts', version: clean('recharts'), note: 'Графики на дашборде' },
      ],
    },
  ];

  const features = [
    'Каталог с поиском по датам и защитой от двойного бронирования',
    'Бронирование без регистрации, история заказов по номеру телефона',
    'Фото и короткие видео в карточках автомобилей',
    'Управление автопарком, заказами и статусами выдачи/приёма',
    'Дашборд: выручка, динамика заказов, топ автомобилей',
    'Редактирование всех текстов и оформления сайта без программиста',
    'Учёт посетителей онлайн',
    'Связь через WhatsApp в один тап',
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">О программе</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          EnRentAuto — система проката автомобилей: публичный сайт и панель управления.
          Версия {version}. Ниже — на чём всё построено и что уже в базе.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Автомобилей в базе', value: formatNumber(cars, 'ru') },
          { label: 'Заказов всего', value: formatNumber(bookings, 'ru') },
          { label: 'Своих текстов', value: formatNumber(texts, 'ru') },
          { label: 'Учётных записей', value: formatNumber(admins, 'ru') },
        ].map((item) => (
          <div key={item.label} className="surface p-5">
            <div className="text-2xl font-semibold text-white">{item.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="surface p-6">
        <h2 className="text-base font-semibold text-white">Технологии</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {stack.map((block) => (
            <div key={block.group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {block.group}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {block.items.map((item) => (
                  <li key={item.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium text-zinc-200">{item.name}</span>
                    {item.version && (
                      <span className="font-mono text-xs text-accent">{item.version}</span>
                    )}
                    <span className="text-xs text-zinc-500">— {item.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">Что умеет</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-accent">▸</span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-6">
          <h2 className="text-base font-semibold text-white">Настройки</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Языки сайта</dt>
              <dd className="text-end text-zinc-200">
                {routing.locales.map((l) => LOCALE_LABELS[l].native).join(', ')}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Язык по умолчанию</dt>
              <dd className="text-zinc-200">{LOCALE_LABELS[routing.defaultLocale].native}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Валюта</dt>
              <dd className="text-zinc-200">{CURRENCY}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Режим</dt>
              <dd className="text-zinc-200">{process.env.NODE_ENV === 'production' ? 'Продакшен' : 'Разработка'}</dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-ink-700/70 pt-4 text-xs leading-relaxed text-zinc-600">
            Исходный код и инструкция по развёртыванию — в репозитории проекта, файл README.md.
            Резервное копирование базы и загруженных файлов настраивается отдельно.
          </p>
        </section>
      </div>
    </div>
  );
}
