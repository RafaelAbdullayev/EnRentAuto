# EnRentAuto — прокат автомобилей + админ-панель

Production-ready сервис посуточной аренды автомобилей: премиальный лендинг,
каталог с фильтром по датам, бронирование без регистрации и закрытая
админ-панель полного контроля (автопарк, заказы, аналитика, онлайн-посетители).

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | Next.js 15 (App Router, Server Components) |
| Язык | TypeScript (strict) |
| БД | PostgreSQL + Prisma ORM |
| Авторизация | NextAuth v5 (Auth.js), JWT-сессии, bcrypt |
| Стили | Tailwind CSS 3 (тёмная премиальная тема) |
| Локализация | next-intl (6 языков, включая RTL) |
| Графики | Recharts |
| Валидация | Zod (единые схемы для всех API) |
| Хранение фото | Локальная ФС (`data/uploads`) + защищённый роут отдачи |

---

## Структура проекта

```
enrentauto/
├── messages/                  # Словари: ru, en, az, ar, tr, zh (по 159 ключей)
├── prisma/
│   ├── schema.prisma          # Схема БД: User, Car, CarImage, Booking, VisitorSession, AuditLog, Settings
│   ├── migrations/            # SQL-миграции
│   └── seed.ts                # Супер-админ + демо-автопарк
├── data/uploads/              # Фотографии авто (вне репозитория)
├── src/
│   ├── middleware.ts          # Маршрутизация языков + cookie для счётчика онлайна
│   ├── i18n/
│   │   ├── routing.ts         # Список языков, RTL, теги Intl
│   │   ├── navigation.ts      # Локале-осведомлённые Link / useRouter / redirect
│   │   └── request.ts         # Загрузка словаря для запроса
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient
│   │   ├── auth.ts            # NextAuth: провайдер, колбэки, requireStaff()
│   │   ├── availability.ts    # Защита от двойного бронирования
│   │   ├── pricing.ts         # Расчёт суток, скидок и итоговой суммы
│   │   ├── stats.ts           # Аналитика дашборда
│   │   ├── upload.ts          # Сохранение/удаление фото, защита от path traversal
│   │   ├── validation.ts      # Zod-схемы
│   │   ├── constants.ts       # Справочники и подписи
│   │   ├── format.ts          # Деньги, даты, cn()
│   │   └── audit.ts           # Журнал действий администратора
│   ├── components/
│   │   ├── SiteHeader.tsx  SiteFooter.tsx  SearchForm.tsx  LanguageSwitcher.tsx
│   │   ├── CarCard.tsx  CarGallery.tsx  BookingForm.tsx  LoginForm.tsx
│   │   ├── PresenceTracker.tsx
│   │   └── admin/
│   │       ├── AdminShell.tsx        # Layout с сайдбаром
│   │       ├── StatCard.tsx
│   │       ├── DashboardCharts.tsx   # Recharts
│   │       ├── RevenueReport.tsx     # Отчёт по произвольному периоду
│   │       ├── CarForm.tsx           # Создание/редактирование авто
│   │       ├── ImageUploader.tsx     # Drag-and-drop загрузка фото
│   │       ├── CarRowActions.tsx
│   │       └── BookingActions.tsx    # Выдать / принять / отменить
│   └── app/
│       ├── globals.css
│       ├── uploads/[...path]/route.ts # Отдача загруженных фото
│       ├── [locale]/                 # Весь UI живёт внутри языкового сегмента
│       ├── [locale]/layout.tsx       # <html lang dir> + провайдер переводов
│       ├── [locale]/page.tsx         # Лендинг с поиском по датам
│       ├── [locale]/cars/page.tsx    # Каталог
│       ├── [locale]/cars/[id]/page.tsx # Карточка + форма бронирования
│       ├── [locale]/booking/success/page.tsx
│       ├── [locale]/login/page.tsx   # Вход для сотрудников
│       ├── [locale]/not-found.tsx  [locale]/error.tsx
│       ├── [locale]/admin/
│       │   ├── layout.tsx            # Защита раздела: нет прав → /login
│       │   ├── page.tsx              # Дашборд
│       │   ├── cars/page.tsx  cars/new/page.tsx  cars/[id]/page.tsx
│       │   ├── bookings/page.tsx
│       │   └── online/page.tsx       # (интерфейс админки — на русском)
│       └── api/
│           ├── auth/[...nextauth]/route.ts
│           ├── bookings/route.ts             POST — создать бронь
│           ├── cars/route.ts                 GET публично / POST админ
│           ├── cars/[id]/route.ts            GET / PATCH / DELETE
│           ├── cars/[id]/restore/route.ts    POST — вернуть из архива
│           ├── admin/bookings/[id]/route.ts  PATCH — смена статуса
│           ├── admin/stats/route.ts          GET — отчёт по периоду
│           ├── upload/route.ts               POST / DELETE — фото
│           └── presence/route.ts             POST — пинг онлайна
```

---

## Быстрый старт

### 1. Требования
Node.js 20+, PostgreSQL 14+.

### 2. Установка

```bash
git clone <repo> enrentauto && cd enrentauto
npm install
cp .env.example .env
```

### 3. Настройка `.env`

```bash
# Обязательно смените секрет и пароль администратора!
openssl rand -base64 32          # → вставить в AUTH_SECRET
```

```env
DATABASE_URL="postgresql://enrent:пароль@localhost:5432/enrentauto?schema=public"
AUTH_SECRET="<результат openssl rand -base64 32>"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="https://ваш-домен.ru"

ADMIN_EMAIL="admin@enrentauto.ru"
ADMIN_PASSWORD="СильныйПароль_2024!"
ADMIN_NAME="Супер-администратор"

# Необязательно: вынести фото за пределы каталога проекта
# UPLOAD_DIR="/var/www/enrentauto-uploads"
```

### 4. База данных и первый администратор

```bash
# Создать БД (если ещё не создана)
sudo -u postgres psql -c "CREATE USER enrent WITH PASSWORD 'пароль';"
sudo -u postgres psql -c "CREATE DATABASE enrentauto OWNER enrent;"

npx prisma migrate deploy     # применить миграции (в dev: npx prisma migrate dev)
npm run db:seed               # создать супер-админа + 6 демо-авто
```

Сид идемпотентен: повторный запуск обновит пароль администратора и не продублирует автопарк.

**Пароль администратора живёт в `.env` и попадает в БД только при запуске сида.**
Если изменить `ADMIN_PASSWORD` и не выполнить `npm run db:seed`, войти по новому
паролю не получится — в базе останется старый хеш.

Сид чистит значения из `.env` от лишних кавычек и пробелов и отказывается
работать с явно некорректным `ADMIN_EMAIL`, иначе опечатка создаёт учётную
запись, под которой невозможно войти. Если администраторов в базе больше
одного, сид напечатает список и напомнит, у кого именно обновил пароль.

Проверить, что пароль из `.env` совпадает с хешем в БД:

```bash
cd /opt/enrentauto
set -a; . ./.env; set +a
node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
(async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const u = await prisma.user.findUnique({ where: { email } });
  console.log("Пользователи:", await prisma.user.findMany({ select: { email: true, role: true } }));
  console.log(u ? (await bcrypt.compare(process.env.ADMIN_PASSWORD || "", u.passwordHash)
    ? "пароль совпадает" : "пароль НЕ совпадает — запустите npm run db:seed")
    : "пользователя с таким e-mail нет");
})().finally(() => prisma.$disconnect());
'
```

### 5. Запуск

```bash
npm run dev                   # разработка → http://localhost:3000
# или
npm run build && npm start    # production → http://localhost:3000
```

Вход в админку: **`/login`** → e-mail и пароль из `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Полезные команды

```bash
npm run typecheck      # проверка типов
npm run lint           # ESLint
npm run db:studio      # визуальный редактор БД
npm run db:migrate     # создать новую миграцию после правки schema.prisma
```

---

## Языки

Сайт доступен на шести языках: **русский** (по умолчанию), **английский**,
**азербайджанский**, **арабский**, **китайский** и **турецкий**.

| Язык | URL | Направление |
|---|---|---|
| Русский | `/`, `/cars` | LTR |
| English | `/en`, `/en/cars` | LTR |
| Azərbaycan | `/az/…` | LTR |
| Türkçe | `/tr/…` | LTR |
| العربية | `/ar/…` | **RTL** |
| 中文 | `/zh/…` | LTR |

Русский живёт на корне без префикса, поэтому уже проиндексированные ссылки
продолжают работать. Язык определяется по префиксу URL, затем по cookie
`NEXT_LOCALE`, затем по заголовку `Accept-Language`; выбор в переключателе
запоминается в cookie.

Арабская версия рендерится с `dir="rtl"`: в вёрстке используются логические
свойства Tailwind (`ms-`, `me-`, `start-`, `end-`, `text-start`), поэтому
зеркалирование происходит без отдельной таблицы стилей. Цены и даты
форматируются через `Intl` под каждую локаль — валюта одна для всех языков,
меняются только разделители и позиция символа.

### Как добавить или изменить перевод

Все строки лежат в `messages/<код>.json` — по 159 ключей в каждом файле,
структура одинаковая. Изменить текст на сайте — отредактировать значение
и пересобрать проект.

Проверка, что во всех языках одинаковый набор ключей:

```bash
node -e "
const fs=require('fs');
const keys=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v).map(s=>k+'.'+s):[k]).sort();
const base=keys(JSON.parse(fs.readFileSync('messages/ru.json','utf8')));
['en','az','tr','ar','zh'].forEach(l=>{
  const k=keys(JSON.parse(fs.readFileSync('messages/'+l+'.json','utf8')));
  console.log(l, k.length, JSON.stringify(k)===JSON.stringify(base)?'OK':'РАСХОЖДЕНИЕ');
});"
```

Новый язык добавляется в трёх местах: `messages/<код>.json`, список `locales`
в `src/i18n/routing.ts` и подпись в `LOCALE_LABELS` там же. Для языка с письмом
справа налево код дописывается в `RTL_LOCALES`.

**Админ-панель `/admin` остаётся на русском** — ею пользуются сотрудники
проката. Переводить её сейчас нет смысла: это удвоило бы объём словарей.
При необходимости она локализуется тем же механизмом.

---

## Валюта

Расчёты ведутся в **азербайджанских манатах (AZN, ₼)**. Суммы хранятся в БД
целым числом манатов (`Int`) — без копеек и без чисел с плавающей точкой,
поэтому округление при расчёте аренды всегда предсказуемо.

Символ `₼` подставляется во всех шести языках (`currencyDisplay: 'narrowSymbol'`),
меняются только позиция символа и разделители разрядов:

| Язык | 594 маната |
|---|---|
| ru | `594 ₼` |
| en | `₼594` |
| az | `594 ₼` |
| tr | `₼594` |
| ar | `‏594 ₼` |
| zh | `₼594` |

Валюта задаётся одной переменной окружения и меняется без правки кода:

```env
NEXT_PUBLIC_CURRENCY="AZN"    # любой код ISO-4217: TRY, AED, USD…
```

**Смена кода валюты не пересчитывает суммы в базе.** Числа остаются прежними,
меняется только символ рядом с ними — новые цены нужно проставить вручную
в админке либо пересчитать SQL-запросом.

Пересчёт по курсу (пример: рубли → манаты по курсу 1 ₼ = 55 ₽; подставьте
актуальный курс, бэкап обязателен):

```bash
sudo -u postgres pg_dump enrentauto | gzip > /var/backups/enrentauto-before-currency.sql.gz

sudo -u postgres psql enrentauto <<'SQL'
BEGIN;
UPDATE "Car" SET
  "pricePerDay"    = GREATEST(1, ROUND("pricePerDay"    / 55.0)),
  deposit          = ROUND(deposit          / 55.0),
  "overMileageFee" = ROUND("overMileageFee" / 55.0);
COMMIT;
SQL
```

Суммы в уже созданных заказах намеренно остаются как есть — это финансовая
история, менять её задним числом нельзя.

### Дробные ставки

Суточные тарифы, залоги и суммы заказов — целые манаты. Единственная дробная
величина — **стоимость километра сверх лимита**: она хранится в минорных
единицах (гяпиках) в поле `Car.overMileageFeeMinor`, то есть `30` = `0,30 ₼/км`.
В админке значение вводится в манатах с шагом 0,01, перевод в гяпики делает
zod-схема, обратный перевод — форма редактирования.

Такой подход держит все денежные поля целочисленными: float в расчётах
аренды не появляется нигде.

## Ключевая бизнес-логика

### Защита от двойного бронирования
`src/lib/availability.ts`. Интервалы пересекаются, если `startA < endB && endA > startB`.
Занимают машину только статусы **NEW / CONFIRMED / ACTIVE**; `COMPLETED` и `CANCELLED` — нет.
Проверка выполняется на сервере при создании брони (ответ **409** с понятным текстом) и
при возврате заказа из отмены. Каталог и `GET /api/cars?from=&to=` дополнительно скрывают
занятые авто, так что пользователь почти никогда не доходит до конфликта.

### Ценообразование
`src/lib/pricing.ts`. Цена задаётся в манатах за сутки, неполные сутки округляются вверх, минимум — 1 сутки.
Скидка (спецпредложение) задаётся на конкретную машину в админке (0–90 %) и применяется к суточному тарифу.
Тариф и скидка **копируются в заказ** при создании — последующее изменение цены авто не меняет уже оформленные брони.

### Жизненный цикл заказа

```
NEW ──confirm──▶ CONFIRMED ──issue──▶ ACTIVE ──return──▶ COMPLETED
 │                   │                   │
 └────────── cancel ─┴───────────────────┘ ──▶ CANCELLED ──reopen──▶ NEW
```

* **Выдать машину** — фиксирует `issuedAt`.
* **Принять машину** — фиксирует `returnedAt`, автоматически считает переработку
  (каждые начатые сутки сверх плановой даты по тарифу заказа), прибавляет ручные доплаты
  (штрафы, недолив топлива) и записывает `finalPrice`.
* Недопустимые переходы отклоняются с кодом **409**.

### Онлайн-посетители
`middleware.ts` выдаёт анонимный httpOnly-cookie `era_sid`. Клиентский `PresenceTracker`
пингует `POST /api/presence` при заходе и раз в минуту, пока вкладка активна.
Онлайн = активность за последние 5 минут (`ONLINE_WINDOW_MS`). Персональные данные не собираются:
только IP, User-Agent и последняя страница.

### Безопасность
* Раздел `/admin` защищён в серверном `layout.tsx`: нет сессии → редирект на `/login?from=…`,
  роль не ADMIN/MANAGER → `/login?...&error=forbidden`.
* Все админские API вызывают `requireStaff()` и отвечают **401** без сессии.
* Пароли — bcrypt (12 раундов), сессия — JWT на 12 часов.
* Загрузка файлов: белый список MIME, лимит размера, случайные имена, защита от path traversal;
  при частичной ошибке загруженные файлы откатываются.
* Все входные данные валидируются Zod, ошибки возвращаются пополю (**422**).
* Действия администратора пишутся в `AuditLog`.

---

## Деплой на VPS (Ubuntu + Nginx + systemd)

```bash
# 1. Код и сборка
cd /var/www/enrentauto
npm ci
npx prisma migrate deploy
npm run build
npm run db:seed          # только при первом развёртывании
```

**systemd** — `/etc/systemd/system/enrentauto.service`:

```ini
[Unit]
Description=EnRentAuto (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/enrentauto
EnvironmentFile=/var/www/enrentauto/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now enrentauto
sudo systemctl status enrentauto
sudo journalctl -u enrentauto -f     # логи
```

**Nginx** — `/etc/nginx/sites-available/enrentauto`:

```nginx
server {
    listen 443 ssl http2;
    server_name ваш-домен.ru;

    ssl_certificate     /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш-домен.ru/privkey.pem;

    client_max_body_size 12m;          # загрузка фото

    # Фото отдаём напрямую, минуя Node.js
    location /uploads/ {
        alias /var/www/enrentauto/data/uploads/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /_next/static/ {
        alias /var/www/enrentauto/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;   # нужно для счётчика онлайна
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}

server {
    listen 80;
    server_name ваш-домен.ru;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/enrentauto /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Резервное копирование

```bash
# БД
pg_dump -U enrent enrentauto | gzip > /var/backups/enrentauto-$(date +%F).sql.gz
# Фотографии
tar czf /var/backups/uploads-$(date +%F).tar.gz -C /var/www/enrentauto data/uploads
```

---

## Обработка ошибок (что видит пользователь)

| Ситуация | Поведение |
|---|---|
| Админ не залогинен | Редирект на `/login?from=<страница>`, после входа — возврат обратно |
| Нет прав (роль USER) | Редирект на `/login?error=forbidden` |
| Машина занята на выбранные даты | **409** + уведомление в форме брони с предложением сменить даты |
| Ошибки в полях формы | **422**, подсветка конкретных полей и текст ошибки под каждым |
| Недопустимый переход статуса заказа | **409** + текст «Нельзя выдать машину: заказ в статусе …» |
| Удаление авто с активной арендой | **409**, вместо удаления предлагается архив |
| Неверный формат/размер фото | **422** с описанием ограничения, частичная загрузка откатывается |
| Авто не найдено / архивировано | Страница 404 в фирменном оформлении |
| Сбой рендеринга | `error.tsx` с кнопкой «Обновить» (на языке страницы) |
| Неизвестный языковой префикс | Редирект на язык по умолчанию |
