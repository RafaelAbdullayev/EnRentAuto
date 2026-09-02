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
| Графики | Recharts |
| Валидация | Zod (единые схемы для всех API) |
| Хранение фото | Локальная ФС (`data/uploads`) + защищённый роут отдачи |

---

## Структура проекта

```
enrentauto/
├── prisma/
│   ├── schema.prisma          # Схема БД: User, Car, CarImage, Booking, VisitorSession, AuditLog, Settings
│   ├── migrations/            # SQL-миграции
│   └── seed.ts                # Супер-админ + демо-автопарк
├── data/uploads/              # Фотографии авто (вне репозитория)
├── src/
│   ├── middleware.ts          # Выдача анонимного cookie для счётчика онлайна
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
│   │   ├── SiteHeader.tsx  SiteFooter.tsx  SearchForm.tsx
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
│       ├── layout.tsx  globals.css  not-found.tsx  error.tsx
│       ├── page.tsx                  # Лендинг с поиском по датам
│       ├── cars/page.tsx             # Каталог
│       ├── cars/[id]/page.tsx        # Карточка + форма бронирования
│       ├── booking/success/page.tsx  # Подтверждение заявки
│       ├── login/page.tsx            # Вход для сотрудников
│       ├── uploads/[...path]/route.ts# Отдача загруженных фото
│       ├── admin/
│       │   ├── layout.tsx            # Защита раздела: нет прав → /login
│       │   ├── page.tsx              # Дашборд
│       │   ├── cars/page.tsx  cars/new/page.tsx  cars/[id]/page.tsx
│       │   ├── bookings/page.tsx
│       │   └── online/page.tsx
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

## Ключевая бизнес-логика

### Защита от двойного бронирования
`src/lib/availability.ts`. Интервалы пересекаются, если `startA < endB && endA > startB`.
Занимают машину только статусы **NEW / CONFIRMED / ACTIVE**; `COMPLETED` и `CANCELLED` — нет.
Проверка выполняется на сервере при создании брони (ответ **409** с понятным текстом) и
при возврате заказа из отмены. Каталог и `GET /api/cars?from=&to=` дополнительно скрывают
занятые авто, так что пользователь почти никогда не доходит до конфликта.

### Ценообразование
`src/lib/pricing.ts`. Цена фиксируется за сутки, неполные сутки округляются вверх, минимум — 1 сутки.
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
| Сбой рендеринга | `error.tsx` с кнопкой «Обновить» |
