import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { effectivePricePerDay } from '@/lib/pricing';
import { formatMoney } from '@/lib/format';
import type { BodyType, FuelType, Transmission } from '@prisma/client';

export interface CarCardData {
  id: string;
  brand: string;
  model: string;
  year: number;
  bodyType: BodyType;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  pricePerDay: number;
  discount: number;
  images: { url: string }[];
}

/** Карточка автомобиля в каталоге. Ссылка ведёт на страницу бронирования. */
export function CarCard({
  car,
  query = {},
}: {
  car: CarCardData;
  query?: Record<string, string>;
}) {
  // Параметры периода прокидываем в карточку авто, чтобы форма брони
  // открылась уже с выбранными датами.
  const search = new URLSearchParams(query).toString();
  const href = `/cars/${car.id}${search ? `?${search}` : ''}`;

  const t = useTranslations('car');
  const e = useTranslations('enums');
  const nav = useTranslations('nav');
  const locale = useLocale();

  const price = effectivePricePerDay(car.pricePerDay, car.discount);
  const cover = car.images[0]?.url;

  return (
    <article className="surface surface-hover group relative overflow-hidden">
      <Link href={href} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-ink-800">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={`${car.brand} ${car.model}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl text-ink-600">🚗</div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />

          {car.discount > 0 && (
            <span className="absolute start-3 top-3 badge bg-accent text-ink-950 ring-accent/50">
              −{car.discount}%
            </span>
          )}
          <span className="absolute end-3 top-3 badge bg-ink-950/70 text-zinc-300 ring-ink-600 backdrop-blur">
            {car.year}
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-semibold tracking-tight text-white">
            {car.brand} <span className="text-zinc-400">{car.model}</span>
          </h3>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
            <li>{e(`body.${car.bodyType}`)}</li>
            <li>{e(`transmission.${car.transmission}`)}</li>
            <li>{e(`fuel.${car.fuelType}`)}</li>
            <li>{t('seats', { count: car.seats })}</li>
          </ul>

          <div className="mt-5 flex items-end justify-between border-t border-ink-700/70 pt-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-white">
                  {formatMoney(price, locale)}
                </span>
                {car.discount > 0 && (
                  <span className="text-sm text-zinc-600 line-through">
                    {formatMoney(car.pricePerDay, locale)}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500">{t('perDay')}</span>
            </div>
            <span className="btn-primary btn-sm pointer-events-none">
              {nav('book')}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
