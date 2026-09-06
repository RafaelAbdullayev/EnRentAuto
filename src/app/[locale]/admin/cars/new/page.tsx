import Link from 'next/link';
import type { Metadata } from 'next';
import { CarForm } from '@/components/admin/CarForm';

export const metadata: Metadata = { title: 'Новый автомобиль' };

export default function NewCarPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/cars" className="text-xs text-zinc-500 transition-colors hover:text-accent">
          ← Автопарк
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Новый автомобиль
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Заполните карточку — автомобиль сразу появится в каталоге со статусом «В строю».
        </p>
      </header>

      <CarForm />
    </div>
  );
}
