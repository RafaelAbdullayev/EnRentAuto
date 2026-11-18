#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Обновление сайта на сервере: забрать свежий код из git и выложить в nginx.
# Запускать НА СЕРВЕРЕ:  sudo bash /opt/portfolio-src/portfolio/deploy/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail   # падаем на первой же ошибке, не выкладывая половину сайта

REPO_DIR="${REPO_DIR:-/opt/portfolio-src}"          # где лежит клон репозитория
BRANCH="${BRANCH:-claude/keen-turing-zjtomf}"       # ветка с сайтом
WEB_DIR="${WEB_DIR:-/var/www/portfolio}"            # что отдаёт nginx

echo "→ Обновляю репозиторий в $REPO_DIR (ветка $BRANCH)"
git -C "$REPO_DIR" fetch origin "$BRANCH"
git -C "$REPO_DIR" checkout "$BRANCH"
git -C "$REPO_DIR" reset --hard "origin/$BRANCH"

# Выкладываем во временную папку и меняем местами атомарно:
# посетитель никогда не увидит полуобновлённый сайт.
TMP_DIR="$(mktemp -d /var/www/.portfolio-new.XXXXXX)"
echo "→ Копирую файлы"
cp -a "$REPO_DIR/portfolio/." "$TMP_DIR/"
rm -rf "$TMP_DIR/deploy"          # серверные конфиги наружу не отдаём

chown -R www-data:www-data "$TMP_DIR"
chmod -R a+rX "$TMP_DIR"

OLD_DIR="${WEB_DIR}.old"
rm -rf "$OLD_DIR"
[ -d "$WEB_DIR" ] && mv "$WEB_DIR" "$OLD_DIR"
mv "$TMP_DIR" "$WEB_DIR"
rm -rf "$OLD_DIR"

echo "→ Проверяю конфиг nginx"
nginx -t

echo "→ Перечитываю конфиг без разрыва соединений"
systemctl reload nginx

echo "✅ Готово. Версия: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
