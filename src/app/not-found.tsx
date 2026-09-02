import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="relative">
        <p className="eyebrow">Ошибка 404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Страница не найдена
        </h1>
        <p className="mt-3 text-zinc-500">
          Возможно, автомобиль снят с публикации или ссылка устарела.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/cars" className="btn-ghost">В каталог</Link>
          <Link href="/" className="btn-primary">На главную</Link>
        </div>
      </div>
    </main>
  );
}
