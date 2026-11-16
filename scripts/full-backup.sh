#!/bin/bash
#
# Полная резервная копия EnRentAuto одним архивом.
#
# Кладёт в архив всё, из чего проект поднимается с нуля на чистом сервере:
# историю git, рабочие файлы, выгрузку базы, загруженные фотографии и музыку,
# .env, настройки Nginx и systemd, а также инструкцию по восстановлению.
#
# Запуск:  bash /opt/enrentauto/scripts/full-backup.sh
# Результат: /root/backups/full/enrentauto-full-<дата>.tar.gz
#
# ВНИМАНИЕ: внутри архива лежит .env с паролем базы и ключом сессий.
# Храните файл как пароль: не выкладывайте в облако без шифрования,
# не отправляйте в мессенджерах.
#
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/enrentauto}"
UPLOADS="${UPLOADS:-/var/lib/enrentauto/uploads}"
OUT_DIR="${OUT_DIR:-/root/backups/full}"
DATE=$(date +%Y%m%d_%H%M%S)
WORK="$(mktemp -d)"
STAGE="$WORK/enrentauto-$DATE"

log() { echo "  $1"; }
fail() { echo "ОШИБКА: $1" >&2; rm -rf "$WORK"; exit 1; }

trap 'rm -rf "$WORK"' EXIT

[ -d "$APP_DIR" ] || fail "нет каталога проекта $APP_DIR"
mkdir -p "$STAGE" "$OUT_DIR"

echo "═══ Собираю полную копию EnRentAuto ═══"

# ── 1. База ──────────────────────────────────────────────────────────────
# Адрес берём из .env точечно: подгружать файл целиком в оболочку нельзя,
# он перебьёт переменные текущего окружения.
DB_URL=$(grep -m1 '^DATABASE_URL=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d "\"'")
[ -n "$DB_URL" ] || fail "в $APP_DIR/.env нет DATABASE_URL"
# Prisma дописывает ?schema=public — pg_dump такого параметра не знает.
DB_URL="${DB_URL%%\?*}"

log "выгружаю базу…"
pg_dump "$DB_URL" | gzip > "$STAGE/database.sql.gz" || fail "pg_dump не отработал"
DB_SIZE=$(stat -c %s "$STAGE/database.sql.gz")
[ "$DB_SIZE" -gt 5000 ] || fail "выгрузка вышла размером $DB_SIZE байт — это не база"
log "база: $(du -h "$STAGE/database.sql.gz" | cut -f1)"

# ── 2. История git одним файлом ──────────────────────────────────────────
# Бандл восстанавливается как обычный репозиторий: git clone bundle.
if git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  log "упаковываю историю git…"
  git -C "$APP_DIR" bundle create "$STAGE/repo.bundle" --all >/dev/null 2>&1 \
    || log "ВНИМАНИЕ: историю git сохранить не удалось"
  git -C "$APP_DIR" rev-parse HEAD > "$STAGE/HEAD.txt" 2>/dev/null
  git -C "$APP_DIR" log -1 --pretty='%H %ad %s' >> "$STAGE/HEAD.txt" 2>/dev/null
fi

# ── 3. Рабочие файлы ─────────────────────────────────────────────────────
# node_modules и .next не кладём: первое ставится из package-lock.json,
# второе собирается. Вместе они весят больше всего остального архива.
log "упаковываю файлы проекта…"
tar czf "$STAGE/code.tar.gz" -C "$(dirname "$APP_DIR")" \
  --exclude="$(basename "$APP_DIR")/node_modules" \
  --exclude="$(basename "$APP_DIR")/.next" \
  --exclude="$(basename "$APP_DIR")/.git" \
  "$(basename "$APP_DIR")" 2>/dev/null

# ── 4. Загруженные файлы: фото машин, логотип, фон, музыка ───────────────
if [ -d "$UPLOADS" ]; then
  log "упаковываю загруженные файлы…"
  tar czf "$STAGE/uploads.tar.gz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")" 2>/dev/null
  log "загрузки: $(du -h "$STAGE/uploads.tar.gz" | cut -f1)"
else
  log "ВНИМАНИЕ: каталог загрузок $UPLOADS не найден"
fi

# ── 5. Настройки сервера ─────────────────────────────────────────────────
mkdir -p "$STAGE/server"
cp "$APP_DIR/.env" "$STAGE/server/env.txt" 2>/dev/null \
  || log "ВНИМАНИЕ: .env не найден — восстановить без него не выйдет"
cp /etc/systemd/system/enrentauto.service "$STAGE/server/" 2>/dev/null
cp /etc/nginx/sites-available/enrentauto "$STAGE/server/nginx-enrentauto.conf" 2>/dev/null
crontab -l > "$STAGE/server/crontab.txt" 2>/dev/null
node --version > "$STAGE/server/versions.txt" 2>/dev/null
psql "$DB_URL" -c 'SELECT version();' -tA >> "$STAGE/server/versions.txt" 2>/dev/null

# ── 6. Инструкция ────────────────────────────────────────────────────────
cat > "$STAGE/ВОССТАНОВЛЕНИЕ.txt" <<'GUIDE'
КАК ПОДНЯТЬ ENRENTAUTO ИЗ ЭТОГО АРХИВА
======================================

В архиве:
  repo.bundle        история git — весь код со всеми коммитами
  code.tar.gz        файлы проекта как они лежали на сервере
  database.sql.gz    выгрузка базы PostgreSQL
  uploads.tar.gz     фотографии машин, логотип, фон, музыка
  server/env.txt     файл .env (ПАРОЛИ! храните как пароль)
  server/*.service   юнит systemd
  server/nginx-*.conf настройки Nginx
  HEAD.txt           на каком коммите была копия

ПОРЯДОК ВОССТАНОВЛЕНИЯ НА ЧИСТОМ СЕРВЕРЕ (Ubuntu)

1. Поставить Node.js 20+, PostgreSQL, Nginx:
   apt update && apt install -y nodejs npm postgresql nginx

2. Распаковать архив и положить код:
   tar xzf enrentauto-full-*.tar.gz
   cd enrentauto-*
   tar xzf code.tar.gz -C /opt/
   # или из истории git:  git clone repo.bundle /opt/enrentauto

3. Вернуть загруженные файлы:
   mkdir -p /var/lib
   tar xzf uploads.tar.gz -C /var/lib/
   chown -R www-data:www-data /var/lib/enrentauto

4. Создать базу и залить выгрузку:
   sudo -u postgres createuser enrentauto -P      # пароль возьмите из env.txt
   sudo -u postgres createdb enrentauto -O enrentauto
   gunzip -c database.sql.gz | psql "postgresql://enrentauto:ПАРОЛЬ@127.0.0.1:5432/enrentauto"

5. Положить .env и собрать:
   cp server/env.txt /opt/enrentauto/.env
   chmod 600 /opt/enrentauto/.env
   cd /opt/enrentauto && npm ci && npx prisma generate && npm run build

6. Поднять сервис и веб-сервер:
   cp server/enrentauto.service /etc/systemd/system/
   cp server/nginx-enrentauto.conf /etc/nginx/sites-available/enrentauto
   ln -sf /etc/nginx/sites-available/enrentauto /etc/nginx/sites-enabled/
   systemctl daemon-reload && systemctl enable --now enrentauto
   nginx -t && systemctl reload nginx

7. Если сменился домен или адрес — поправить в .env (NEXTAUTH_URL)
   и в настройках Nginx, затем заново выпустить сертификат:
   certbot --nginx -d ВАШ-ДОМЕН

ПРОВЕРКА
   systemctl is-active enrentauto
   curl -I http://127.0.0.1:3000

Подробности по каждому шагу — в README.md внутри code.tar.gz,
раздел «Деплой на VPS».
GUIDE

# ── 7. Один архив ────────────────────────────────────────────────────────
ARCHIVE="$OUT_DIR/enrentauto-full-$DATE.tar.gz"
log "склеиваю архив…"
tar czf "$ARCHIVE" -C "$WORK" "enrentauto-$DATE" || fail "не удалось собрать архив"

# Старые полные копии не копим: они тяжёлые, а диск не резиновый.
ls -1t "$OUT_DIR"/enrentauto-full-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

echo
echo "═══ Готово ═══"
echo "Архив:  $ARCHIVE"
echo "Размер: $(du -h "$ARCHIVE" | cut -f1)"
echo
IP=$(hostname -I | awk '{print $1}')
echo "Забрать на свой компьютер (выполнять У СЕБЯ, не на сервере):"
echo "  Windows:    scp root@$IP:$ARCHIVE %USERPROFILE%\\Downloads\\"
echo "  Mac/Linux:  scp root@$IP:$ARCHIVE ~/Downloads/"
echo
echo "ВНИМАНИЕ: внутри .env с паролем базы и ключом сессий."
echo "Храните архив как пароль."
