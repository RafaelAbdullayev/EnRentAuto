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
│   ├── middleware.ts          # Защита /admin, языки, cookie счётчика онлайна
│   ├── i18n/
│   │   ├── routing.ts         # Список языков, RTL, теги Intl
│   │   ├── navigation.ts      # Локале-осведомлённые Link / useRouter / redirect
│   │   └── request.ts         # Загрузка словаря для запроса
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient
│   │   ├── auth.ts            # NextAuth: провайдер, requireStaff()
│   │   ├── auth.config.ts     # Конфигурация без провайдеров, для middleware
│   │   ├── login.ts           # Логин: e-mail или телефон, нормализация
│   │   ├── availability.ts    # Защита от двойного бронирования
│   │   ├── pricing.ts         # Расчёт суток, скидок и итоговой суммы
│   │   ├── stats.ts           # Аналитика дашборда
│   │   ├── upload.ts          # Сохранение/удаление фото, защита от path traversal
│   │   ├── brand.ts           # Логотип сайта: поиск, сохранение, удаление файла
│   │   ├── siteText.ts        # Словарь + правки администратора, разделы админки
│   │   ├── validation.ts      # Zod-схемы
│   │   ├── constants.ts       # Справочники и подписи
│   │   ├── format.ts          # Деньги, даты, cn()
│   │   └── audit.ts           # Журнал действий администратора
│   ├── components/
│   │   ├── SiteHeader.tsx  SiteFooter.tsx  SearchForm.tsx  LanguageSwitcher.tsx
│   │   ├── Logo.tsx                  # Загруженный логотип или текстовый знак
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
│   │       ├── ContentEditor.tsx     # Правка текстов по языкам и разделам
│   │       ├── LogoUploader.tsx      # Загрузка и удаление логотипа
│   │       └── BookingActions.tsx    # Выдать / принять / отменить
│   └── app/
│       ├── globals.css
│       ├── uploads/[...path]/route.ts # Отдача загруженных фото
│       ├── brand/logo/route.ts       # Отдача логотипа (ETag, без пересборки)
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
│       │   ├── content/page.tsx      # Логотип и редактор текстов сайта
│       │   └── online/page.tsx       # (интерфейс админки — на русском)
│       └── api/
│           ├── auth/[...nextauth]/route.ts
│           ├── bookings/route.ts             POST — создать бронь
│           ├── cars/route.ts                 GET публично / POST админ
│           ├── cars/[id]/route.ts            GET / PATCH / DELETE
│           ├── cars/[id]/restore/route.ts    POST — вернуть из архива
│           ├── admin/bookings/[id]/route.ts  PATCH — смена статуса
│           ├── admin/content/route.ts        PUT — сохранение текстов
│           ├── admin/logo/route.ts           POST / DELETE — логотип
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

# Логином может быть e-mail или телефон
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

### Как изменить текст на сайте

**Обычный способ — админка: «Тексты сайта» (`/admin/content`).** Там правится
всё, что видит посетитель: телефон, e-mail, адрес, режим работы, заголовки
главной, описания преимуществ, подписи кнопок и полей формы, справочники
кузовов и коробок, тексты ошибок — отдельно для каждого из шести языков.

Как это устроено:

* значения по умолчанию лежат в `messages/<код>.json` и остаются в коде;
* правки администратора пишутся в таблицу `SiteText` парами (язык, ключ) и
  накладываются поверх файла при каждом запросе;
* пустое поле в форме означает «использовать значение по умолчанию» — оно
  показано серым внутри поля, а кнопка «Сбросить к умолчанию» удаляет правку;
* публичные страницы рендерятся динамически, поэтому изменения видны сразу —
  ни пересборка, ни перезапуск сервиса не нужны;
* записать можно только ключ, который существует в интерфейсе: список ключей
  берётся из русского словаря и служит белым списком.

**Правка файлов** нужна, только когда меняется сам набор строк — например,
появился новый блок на странице. Тогда ключ добавляется во все шесть файлов
и проект пересобирается.

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

## Логотип

Логотип загружается из админки: **Логотип и тексты → Логотип** —
перетащите файл (PNG, JPG, WEBP, AVIF, до 8 МБ) в поле загрузки.
Картинка сразу заменяет текстовый знак «EnRentAuto» в шапке сайта,
в подвале, на странице входа и в сайдбаре админки. Надпись обычно
уже входит в изображение, поэтому отдельного текста рядом нет.

Рекомендации к файлу: PNG с прозрачным фоном, высота от 200 пикселей
(в шапке логотип показывается высотой 40 px, ширина подстраивается сама,
но не больше 200 px).

Как это устроено:

- файл лежит в `data/uploads/brand/logo.<ext>` — рядом с фотографиями машин,
  а не в `/public`: список `/public` Next.js составляет на старте, и файл,
  загруженный после `next start`, отдавался бы как 404;
- отдаётся роутом `GET /brand/logo` с ETag по времени изменения, поэтому
  после замены браузер подхватывает новый файл без пересборки и рестарта;
- если файла нет (или он не открылся), `src/components/Logo.tsx` показывает
  прежний текстовый знак — шапка не остаётся пустой;
- кнопка «Удалить логотип» возвращает текстовый вариант.

Загрузить файл можно и напрямую с сервера, без браузера:

```bash
# с локальной машины: положить файл на сервер
scp ~/Downloads/logo.png root@178.209.127.144:/opt/enrentauto/data/uploads/brand/logo.png

# на сервере: создать каталог, если его ещё нет, и выставить владельца
mkdir -p /opt/enrentauto/data/uploads/brand
chown -R www-data:www-data /opt/enrentauto/data/uploads
```

Перезапуск сервиса при этом не нужен — файл читается с диска на каждый запрос.
Одновременно хранится только один логотип: при загрузке из админки прежний
файл удаляется, в том числе с другим расширением.

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
# Без флага -H: Next слушает 0.0.0.0 и строит адреса по заголовку Host.
# Порт закрывается от интернета правилом файрвола (см. ниже), а не привязкой —
# любая привязка через -H ломает маршрутизацию языков, см. «Частые проблемы».
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

### Обновление кода на сервере

```bash
cd /opt/enrentauto

# Бэкап БД перед миграциями
sudo -u postgres pg_dump enrentauto | gzip > /var/backups/enrentauto-$(date +%F-%H%M).sql.gz

git pull
npm ci --include=dev
npx prisma generate            # обязательно до сборки, если менялась схема
npx prisma migrate deploy
npm run build
chown -R www-data:www-data /opt/enrentauto
systemctl restart enrentauto
```

Порядок важен: `prisma generate` до `npm run build`, иначе сборка упадёт на
полях, которых ещё нет в сгенерированном клиенте.

Что смотреть в выводе, чтобы убедиться, что обновление реально произошло:

* `git pull` → `Updating <старый>..<новый>`, а не `Already up to date` при
  наличии новых коммитов;
* `migrate deploy` → `Applying migration …` при новых миграциях;
* `npm run build` → список маршрутов должен соответствовать текущей версии
  (например, после добавления языков они выглядят как `/[locale]/…`).

### Частые проблемы при обновлении

**`fatal: detected dubious ownership in repository`**

`chown -R www-data:www-data` меняет владельца в том числе у `.git`, после чего
git, запущенный от root, отказывается работать с репозиторием. Разовое
исправление:

```bash
git config --global --add safe.directory /opt/enrentauto
```

Опасность в том, что `git pull` при этом завершается с ошибкой, а следующие
команды в той же вставке отрабатывают на старом коде — сборка проходит успешно,
но собирает прежнюю версию. Всегда проверяйте вывод `git pull` отдельно.

**Бесконечный редирект на `/` (307, «Maximum redirects followed»)**

Возникает, когда сервер запущен с привязкой к адресу: `next start -H 127.0.0.1`.
Next считает своим origin `127.0.0.1`, а next-intl строит адрес переписывания
на `localhost`; origin не совпадает, внутренний rewrite превращается во внешний
редирект, middleware отрабатывает повторно уже на `/ru`, откуда `as-needed`
уводит обратно на `/` — цикл. Языки с префиксом при этом работают, ломается
только язык по умолчанию.

Замена на `-H localhost` цикл убирает, но приносит другую проблему: на Ubuntu
`localhost` резолвится в `::1`, и сервис слушает только IPv6-loopback — тогда
`127.0.0.1:3000` недоступен, а на него смотрят и Nginx, и SSH-туннель.

Рабочее решение — не привязывать адрес вообще, а закрыть порт файрволом:

```bash
sed -i 's|^ExecStart=.*|ExecStart=/usr/bin/npm run start|' \
  /etc/systemd/system/enrentauto.service
systemctl daemon-reload && systemctl restart enrentauto
```

Проверка привязки (`0BB8` — это 3000 в шестнадцатеричном виде):

```bash
awk 'NR>1 && $4=="0A"' /proc/net/tcp  | grep -i ':0BB8' && echo 'слушает IPv4'
awk 'NR>1 && $4=="0A"' /proc/net/tcp6 | grep -i ':0BB8' && echo 'слушает IPv6'
```

**`psql: error: invalid URI query parameter: "schema"`**

`DATABASE_URL` содержит `?schema=public` — это параметр Prisma, libpq его не
понимает. Отрежьте query-строку:

```bash
set -a; . /opt/enrentauto/.env; set +a
psql "${DATABASE_URL%%\?*}" -c 'SELECT count(*) FROM "Car";'
```

**Вход в админку перестал работать после правки `.env`**

Пароль попадает в БД только через сид. Изменили `ADMIN_PASSWORD` — выполните
`npm run db:seed`, иначе в базе останется старый хеш. Проверка соответствия —
командой из раздела «База данных и первый администратор».

**Смена валюты не изменила цены**

`NEXT_PUBLIC_CURRENCY` меняет только символ рядом с числом. Значения в БД
остаются прежними — их нужно обновить в админке или SQL-запросом из раздела
«Валюта». Кроме того, `NEXT_PUBLIC_*` попадает в клиентский бандл на этапе
сборки, поэтому переменную нужно задать **до** `npm run build`.

### Закрытие порта приложения от интернета

Next слушает `0.0.0.0:3000`, поэтому доступ снаружи нужно закрыть отдельно.
Правило точечное — трогает только порт 3000 и не мешает Nginx и SSH:

```bash
iptables -I INPUT -p tcp --dport 3000 ! -i lo -j DROP
apt install -y iptables-persistent && netfilter-persistent save
```

Проверка: `curl http://<внешний-IP>:3000` не отвечает, а
`curl http://127.0.0.1:3000` с самого сервера — отвечает.

Если предпочитаете `ufw`, обязательно сначала разрешите SSH, иначе потеряете
доступ к серверу:

```bash
ufw allow 22/tcp && ufw deny 3000/tcp && ufw enable
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
