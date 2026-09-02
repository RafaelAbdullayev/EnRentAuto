import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchForm } from '@/components/SearchForm';
import { CarCard } from '@/components/CarCard';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ADVANTAGES = [
  {
    title: 'Подача за 60 минут',
    text: 'Привезём автомобиль в любую точку города или в аэропорт. Без доплат в пределах МКАД.',
    icon: '⚡',
  },
  {
    title: 'Страховка включена',
    text: 'КАСКО и ОСАГО уже в цене. Вы не платите за риски — просто едете.',
    icon: '🛡',
  },
  {
    title: 'Прозрачный тариф',
    text: 'Цена за сутки фиксируется при бронировании. Никаких скрытых комиссий.',
    icon: '◆',
  },
  {
    title: 'Парк не старше 3 лет',
    text: 'Каждая машина проходит предрейсовую подготовку и детейлинг перед выдачей.',
    icon: '✦',
  },
];

const STEPS = [
  { n: '01', title: 'Выберите даты', text: 'Укажите период аренды — покажем только свободные автомобили.' },
  { n: '02', title: 'Оформите заявку', text: 'Заполните форму: ФИО, контакты и документы. Две минуты.' },
  { n: '03', title: 'Получите ключи', text: 'Менеджер подтвердит бронь и согласует место подачи.' },
];

export default async function HomePage() {
  const [cars, carCount, completedCount] = await Promise.all([
    prisma.car.findMany({
      where: { isArchived: false, status: 'AVAILABLE' },
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
      orderBy: [{ discount: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.car.count({ where: { isArchived: false } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
  ]);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

          <div className="container-page relative">
            <p className="eyebrow animate-fade-up">Премиальный автопрокат</p>
            <h1 className="mt-5 max-w-3xl animate-fade-up text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Автомобиль вашего уровня.
              <span className="block bg-gradient-to-r from-accent-soft via-accent to-accent-deep bg-clip-text text-transparent">
                Ровно на столько, сколько нужно.
              </span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-zinc-400 sm:text-lg">
              Посуточная аренда автомобилей бизнес- и премиум-класса. Собственный парк,
              полная страховка и подача в любую точку города.
            </p>

            <div className="mt-10 max-w-3xl animate-fade-up">
              <SearchForm />
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-ink-800 pt-8">
              {[
                { k: `${formatNumber(carCount)}+`, v: 'автомобилей в парке' },
                { k: `${formatNumber(completedCount)}+`, v: 'завершённых аренд' },
                { k: '24/7', v: 'поддержка и выдача' },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-semibold text-white sm:text-3xl">{s.k}</dt>
                  <dd className="mt-1 text-xs text-zinc-500 sm:text-sm">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Каталог ─────────────────────────────────────────────────── */}
        <section className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Автопарк</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Популярные автомобили
                </h2>
              </div>
              <Link href="/cars" className="btn-ghost">
                Весь автопарк →
              </Link>
            </div>

            {cars.length === 0 ? (
              <div className="surface mt-10 p-12 text-center text-zinc-500">
                Автопарк пока пуст. Добавьте автомобили в админ-панели.
              </div>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Преимущества ────────────────────────────────────────────── */}
        <section className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <p className="eyebrow">Почему EnRentAuto</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Сервис, в котором не приходится разбираться
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ADVANTAGES.map((item) => (
                <div key={item.title} className="surface surface-hover group p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-lg text-accent transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Как это работает ────────────────────────────────────────── */}
        <section id="how" className="border-t border-ink-800/70 py-20">
          <div className="container-page">
            <p className="eyebrow">Как это работает</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Три шага до поездки
            </h2>

            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="surface surface-hover relative p-7">
                  <span className="text-5xl font-semibold text-ink-700 transition-colors duration-300">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.text}</p>
                </li>
              ))}
            </ol>

            <div className="surface mt-12 flex flex-col items-center justify-between gap-6 border-accent/25 bg-gradient-to-r from-ink-850 to-ink-900 p-8 sm:flex-row sm:p-10">
              <div>
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Готовы выбрать автомобиль?
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Подберём модель под ваш маршрут и бюджет.
                </p>
              </div>
              <Link href="/cars" className="btn-primary shrink-0 px-7 py-3">
                Перейти в каталог
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
