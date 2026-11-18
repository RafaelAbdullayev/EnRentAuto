# Деплой портфолио на VPS Timeweb

Сайт статический — ни Node, ни PHP, ни базы на сервере не нужно. Всё, что требуется: nginx, который отдаёт папку с файлами, и бесплатный SSL-сертификат.

Ориентировочное время: **15–20 минут**.

---

## 0. Что нужно заранее

| | |
|---|---|
| Сервер | Минимальный тариф Timeweb Cloud, **Ubuntu 24.04** |
| Домен | Свой, либо бесплатный техдомен вида `xxx.tw1.su` из панели Timeweb |
| Доступ | IP сервера, пользователь `root` и пароль (придут на почту после создания) |

DNS домена должен указывать на IP сервера: запись **A**, имя `@`, значение — IP. Для `www` — вторая запись A с тем же IP. Изменения расходятся от 10 минут до пары часов; проверить можно командой `dig +short ваш-домен`.

---

## 1. Подключение к серверу

```bash
ssh root@IP_СЕРВЕРА
```

Обновляем систему и ставим nginx:

```bash
apt update && apt upgrade -y
apt install -y nginx git
```

Проверка: откройте в браузере `http://IP_СЕРВЕРА` — должна появиться заглушка «Welcome to nginx».

---

## 2. Забираем код

```bash
git clone https://github.com/RafaelAbdullayev/EnRentAuto.git /opt/portfolio-src
cd /opt/portfolio-src
git checkout claude/keen-turing-zjtomf
```

> **Если репозиторий приватный**, обычный `git clone` попросит пароль и не пройдёт — GitHub больше не принимает пароль от аккаунта. Два варианта:
>
> **Deploy key (рекомендую).** На сервере: `ssh-keygen -t ed25519 -C "portfolio-deploy" -f ~/.ssh/id_ed25519 -N ""`, затем `cat ~/.ssh/id_ed25519.pub` и добавить вывод в GitHub → репозиторий → Settings → Deploy keys → Add deploy key (галочку «Allow write access» НЕ ставить). После этого клонировать по SSH: `git clone git@github.com:RafaelAbdullayev/EnRentAuto.git /opt/portfolio-src`.
>
> **Без git вообще.** Скопировать папку с ноутбука: `rsync -avz --delete ./portfolio/ root@IP_СЕРВЕРА:/var/www/portfolio/` — тогда шаги с репозиторием и `deploy.sh` не нужны.

---

## 3. Выкладываем файлы

```bash
mkdir -p /var/www/portfolio
cp -a /opt/portfolio-src/portfolio/. /var/www/portfolio/
rm -rf /var/www/portfolio/deploy          # серверные конфиги наружу не отдаём
chown -R www-data:www-data /var/www/portfolio
chmod -R a+rX /var/www/portfolio
```

---

## 4. Настраиваем nginx

```bash
cp /opt/portfolio-src/portfolio/deploy/nginx.conf /etc/nginx/sites-available/portfolio
nano /etc/nginx/sites-available/portfolio
```

В файле замените **`example.com`** на свой домен — он встречается в строке `server_name`. Сохранить: `Ctrl+O`, `Enter`, выйти: `Ctrl+X`.

Включаем сайт и выключаем дефолтную заглушку:

```bash
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

`nginx -t` обязателен: он ловит опечатки до перезапуска. Если написал `syntax is ok` и `test is successful` — всё в порядке.

Проверка: `http://ваш-домен` уже показывает сайт.

---

## 5. SSL-сертификат (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ваш-домен -d www.ваш-домен
```

Certbot спросит email (для уведомлений об истечении) и предложит включить редирект с HTTP на HTTPS — **выбирайте «2» (Redirect)**. Он сам допишет в конфиг блок `listen 443 ssl` и настроит автопродление.

Проверить автопродление:

```bash
certbot renew --dry-run
```

Сертификат бесплатный, живёт 90 дней и продлевается автоматически.

---

## 6. Файрвол

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

⚠️ Строку `ufw allow OpenSSH` **не пропускайте** — иначе закроете себе SSH и потеряете доступ к серверу.

---

## Обновление сайта после правок

Внесли изменения, закоммитили и запушили в GitHub — на сервере достаточно одной команды:

```bash
sudo bash /opt/portfolio-src/portfolio/deploy/deploy.sh
```

Скрипт подтянет свежую версию, выложит её во временную папку и подменит боевую атомарно — посетители не увидят полуобновлённый сайт. В конце он сам проверит конфиг и перечитает nginx.

Если клонировали не в `/opt/portfolio-src` или используете другую ветку:

```bash
REPO_DIR=/путь/к/клону BRANCH=main sudo -E bash .../deploy.sh
```

---

## Если что-то пошло не так

| Симптом | Причина и что делать |
|---|---|
| `502` или `403 Forbidden` | Права на файлы. Повторить `chown -R www-data:www-data /var/www/portfolio` |
| Видна заглушка nginx | Не удалён дефолтный сайт: `rm -f /etc/nginx/sites-enabled/default && systemctl reload nginx` |
| Домен не открывается | DNS ещё не разошёлся. Проверить: `dig +short ваш-домен` — должен вернуть IP сервера |
| Certbot: `Timeout during connect` | Порт 80 закрыт файрволом либо DNS указывает не на этот сервер |
| Старая версия после деплоя | Кэш браузера. Обновить с `Ctrl+Shift+R`. HTML и `content.js` отдаются без кэша |
| Что в логах | `tail -f /var/log/nginx/portfolio.error.log` |

---

## После запуска

Не забудьте про SEO-теги: в `index.html` вверху замените `https://rafael.dev/` на реальный домен (`canonical`, `og:url`, `og:image`) и положите `assets/og-image.png` размером 1200×630 — именно эта картинка появится, когда вы отправите ссылку в Telegram или WhatsApp.
