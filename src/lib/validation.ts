import { z } from 'zod';

/** Схемы валидации входных данных. Используются во всех API-роутах. */

const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;

export const carInputSchema = z.object({
  brand: z.string().trim().min(1, 'Укажите марку').max(60),
  model: z.string().trim().min(1, 'Укажите модель').max(60),
  year: z.coerce
    .number()
    .int()
    .min(1980, 'Год не может быть раньше 1980')
    .max(new Date().getFullYear() + 1),
  bodyType: z.enum([
    'SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'COUPE', 'CABRIO', 'MINIVAN', 'PICKUP', 'WAGON',
  ]),
  transmission: z.enum(['AUTOMATIC', 'MANUAL', 'ROBOT', 'CVT']),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'GAS']).default('PETROL'),
  seats: z.coerce.number().int().min(2).max(9).default(5),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  plateNumber: z.string().trim().max(20).optional().or(z.literal('')),
  pricePerDay: z.coerce.number().int().min(1, 'Цена должна быть больше нуля').max(1_000_000),
  discount: z.coerce.number().int().min(0).max(90).default(0),
  deposit: z.coerce.number().int().min(0).max(10_000_000).default(0),
  mileageLimit: z.coerce.number().int().min(0).max(100_000).default(0),
  overMileageFee: z.coerce.number().int().min(0).max(100_000).default(0),
  description: z.string().trim().max(4000).default(''),
  features: z.array(z.string().trim().max(60)).max(30).default([]),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
  images: z.array(z.string().trim().max(400)).max(12).default([]),
});

export type CarInput = z.infer<typeof carInputSchema>;

export const bookingInputSchema = z
  .object({
    carId: z.string().min(1, 'Не выбран автомобиль'),
    customerName: z.string().trim().min(3, 'Укажите ФИО полностью').max(120),
    phone: z.string().trim().regex(phoneRegex, 'Некорректный телефон'),
    email: z.string().trim().email('Некорректный e-mail').max(120),
    documentInfo: z
      .string()
      .trim()
      .min(5, 'Укажите паспорт или водительское удостоверение')
      .max(200),
    comment: z.string().trim().max(1000).optional().or(z.literal('')),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .refine((v) => v.endAt.getTime() > v.startAt.getTime(), {
    message: 'Дата возврата должна быть позже даты начала',
    path: ['endAt'],
  })
  .refine((v) => v.startAt.getTime() > Date.now() - 60 * 60 * 1000, {
    message: 'Дата начала аренды не может быть в прошлом',
    path: ['startAt'],
  });

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** Смена статуса заказа администратором. */
export const bookingActionSchema = z.object({
  action: z.enum(['confirm', 'issue', 'return', 'cancel', 'complete', 'reopen']),
  extraCharge: z.coerce.number().int().min(0).max(10_000_000).optional(),
  extraNote: z.string().trim().max(500).optional(),
  cancelReason: z.string().trim().max(500).optional(),
});

/** Первичное форматирование ошибок zod для ответа API. */
export function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
