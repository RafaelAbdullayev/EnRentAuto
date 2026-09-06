import type { BodyType, BookingStatus, CarStatus, FuelType, Transmission } from '@prisma/client';

/** Человекочитаемые подписи справочников — используются и во фронте, и в админке. */

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  SEDAN: 'Седан',
  HATCHBACK: 'Хэтчбек',
  SUV: 'Внедорожник',
  CROSSOVER: 'Кроссовер',
  COUPE: 'Купе',
  CABRIO: 'Кабриолет',
  MINIVAN: 'Минивэн',
  PICKUP: 'Пикап',
  WAGON: 'Универсал',
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  AUTOMATIC: 'Автомат',
  MANUAL: 'Механика',
  ROBOT: 'Робот',
  CVT: 'Вариатор',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: 'Бензин',
  DIESEL: 'Дизель',
  HYBRID: 'Гибрид',
  ELECTRIC: 'Электро',
  GAS: 'Газ',
};

export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
  AVAILABLE: 'В строю',
  MAINTENANCE: 'На обслуживании',
  RETIRED: 'Выведена из парка',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  ACTIVE: 'Активен',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

/** Цвета статусов заказа (Tailwind-классы для бейджей). */
export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  NEW: 'bg-signal-new/15 text-signal-new ring-signal-new/30',
  CONFIRMED: 'bg-signal-confirmed/15 text-signal-confirmed ring-signal-confirmed/30',
  ACTIVE: 'bg-signal-active/15 text-signal-active ring-signal-active/30',
  COMPLETED: 'bg-signal-done/15 text-signal-done ring-signal-done/30',
  CANCELLED: 'bg-signal-cancel/15 text-signal-cancel ring-signal-cancel/30',
};

/** Заказы, которые «занимают» машину в календаре. */
export const BLOCKING_STATUSES: BookingStatus[] = ['NEW', 'CONFIRMED', 'ACTIVE'];

/** Посетитель считается «онлайн», если пинг был не позднее N миллисекунд назад. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Имя cookie с анонимным идентификатором посетителя. */
export const VISITOR_COOKIE = 'era_sid';
