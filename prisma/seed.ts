/**
 * Сид-скрипт: создаёт супер-администратора и демонстрационный автопарк.
 * Все суммы — в манатах (AZN), целым числом.
 * Запуск: npm run db:seed
 *
 * Логин и пароль администратора берутся из .env:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 * Скрипт идемпотентен — повторный запуск не плодит дубликаты.
 */
import { PrismaClient, type BodyType, type FuelType, type Transmission } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_CARS: {
  brand: string;
  model: string;
  year: number;
  bodyType: BodyType;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  color: string;
  plateNumber: string;
  pricePerDay: number;
  discount: number;
  deposit: number;
  mileageLimit: number;
  overMileageFee: number;
  description: string;
  features: string[];
}[] = [
  {
    brand: 'Mercedes-Benz',
    model: 'E 220 d',
    year: 2023,
    bodyType: 'SEDAN',
    transmission: 'AUTOMATIC',
    fuelType: 'DIESEL',
    seats: 5,
    color: 'Обсидиановый чёрный',
    plateNumber: 'А001АА777',
    pricePerDay: 220,
    discount: 10,
    deposit: 1500,
    mileageLimit: 300,
    overMileageFee: 1,
    description:
      'Представительский седан бизнес-класса. Пневмоподвеска AIRMATIC, массаж передних сидений, аудиосистема Burmester.',
    features: ['Климат-контроль 4 зоны', 'Массаж сидений', 'Камера 360°', 'Apple CarPlay', 'Панорамная крыша'],
  },
  {
    brand: 'BMW',
    model: 'X5 xDrive40i',
    year: 2024,
    bodyType: 'SUV',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    seats: 5,
    color: 'Минеральный белый',
    plateNumber: 'В002ВВ777',
    pricePerDay: 280,
    discount: 0,
    deposit: 2000,
    mileageLimit: 300,
    overMileageFee: 2,
    description:
      'Полноразмерный кроссовер с рядной «шестёркой» 3.0 и полным приводом xDrive. Адаптивная подвеска, Laserlight.',
    features: ['Полный привод xDrive', 'Адаптивная подвеска', 'Проекция на лобовое', 'Harman/Kardon'],
  },
  {
    brand: 'Audi',
    model: 'A6 45 TFSI quattro',
    year: 2023,
    bodyType: 'SEDAN',
    transmission: 'ROBOT',
    fuelType: 'PETROL',
    seats: 5,
    color: 'Серый дайтона',
    plateNumber: 'С003СС777',
    pricePerDay: 200,
    discount: 15,
    deposit: 1500,
    mileageLimit: 250,
    overMileageFee: 1,
    description: 'Технологичный седан с виртуальной приборной панелью и матричной оптикой Matrix LED.',
    features: ['Virtual Cockpit', 'Matrix LED', 'Bang & Olufsen', 'Подогрев всех сидений'],
  },
  {
    brand: 'Toyota',
    model: 'Camry 2.5',
    year: 2023,
    bodyType: 'SEDAN',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    seats: 5,
    color: 'Белый перламутр',
    plateNumber: 'Е004ЕЕ777',
    pricePerDay: 90,
    discount: 0,
    deposit: 600,
    mileageLimit: 400,
    overMileageFee: 1,
    description: 'Надёжный бизнес-седан для города и трассы. Экономичный расход, просторный салон.',
    features: ['Климат-контроль', 'Камера заднего вида', 'Круиз-контроль', 'Android Auto'],
  },
  {
    brand: 'Volkswagen',
    model: 'Multivan 2.0 TDI',
    year: 2022,
    bodyType: 'MINIVAN',
    transmission: 'AUTOMATIC',
    fuelType: 'DIESEL',
    seats: 7,
    color: 'Тёмно-синий',
    plateNumber: 'К005КК777',
    pricePerDay: 160,
    discount: 5,
    deposit: 1200,
    mileageLimit: 350,
    overMileageFee: 1,
    description: 'Минивэн для больших компаний и трансферов. Семь полноценных мест, трансформируемый салон.',
    features: ['7 мест', 'Двухзонный климат', 'Раздельные кресла', 'Парктроники'],
  },
  {
    brand: 'Tesla',
    model: 'Model 3 Long Range',
    year: 2024,
    bodyType: 'SEDAN',
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    seats: 5,
    color: 'Чёрный',
    plateNumber: 'М006ММ777',
    pricePerDay: 180,
    discount: 20,
    deposit: 1800,
    mileageLimit: 0,
    overMileageFee: 0,
    description: 'Электромобиль с запасом хода 600 км. Автопилот, доступ к сети зарядных станций.',
    features: ['Автопилот', 'Запас хода 600 км', 'Стеклянная крыша', 'Премиум-аудио'],
  },
];

async function main() {
  // ─── 1. Супер-администратор ─────────────────────────────────────────
  const email = (process.env.ADMIN_EMAIL ?? 'admin@enrentauto.ru').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe_Str0ng!';
  const name = process.env.ADMIN_NAME ?? 'Супер-администратор';

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD должен содержать минимум 8 символов');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', name, isActive: true },
    create: { email, passwordHash, role: 'ADMIN', name, isActive: true },
  });
  console.log(`✔ Администратор готов: ${admin.email}`);

  // ─── 2. Настройки площадки ──────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  // ─── 3. Демо-автопарк (только если парк пуст) ───────────────────────
  const existing = await prisma.car.count();
  if (existing > 0) {
    console.log(`✔ В базе уже ${existing} авто — демо-данные пропущены`);
    return;
  }

  for (const car of DEMO_CARS) {
    await prisma.car.create({ data: car });
  }
  console.log(`✔ Добавлено ${DEMO_CARS.length} демонстрационных автомобилей`);
  console.log('  Фотографии загрузите через админку: /admin/cars');
}

main()
  .catch((error) => {
    console.error('✖ Ошибка сида:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
