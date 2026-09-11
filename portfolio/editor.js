/* ═══════════════════════════════════════════════════════════════════════════
   editor.js — ВИЗУАЛЬНЫЙ РЕДАКТОР САЙТА (открывается по адресу ?edit=1)
   ───────────────────────────────────────────────────────────────────────────
   Что умеет:
     • править любой текст, ссылку и число из content.js в боковой панели;
     • добавлять / удалять / двигать проекты, услуги, этапы, контакты;
     • мгновенный предпросмотр (черновик хранится в localStorage браузера);
     • «Скачать content.js» — готовый файл, который кладётся в проект вместо
       текущего; после этого правки становятся постоянными для всех.

   Важно: файл подключается ТОЛЬКО при ?edit=1, поэтому на обычных посетителей
   он не влияет — ни байта лишнего кода не грузится.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const DRAFT_KEY = 'portfolio:draft';
  const BASE = window.SITE || {};

  /* Глубокая копия: правим черновик, не трогая исходный объект из content.js */
  const clone = (v) => JSON.parse(JSON.stringify(v));

  let draft = (() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...clone(BASE), ...JSON.parse(saved) };
    } catch { /* битый черновик — начинаем с исходника */ }
    return clone(BASE);
  })();

  /* Человеческие подписи полей вместо технических ключей */
  const LABELS = {
    hero: 'Главный экран', about: 'Обо мне', projects: 'Проекты', services: 'Услуги',
    process: 'Процесс', contact: 'Контакты', footer: 'Футер', theme: 'Цвета',
    badge: 'Плашка статуса', firstName: 'Имя', lastName: 'Фамилия', subtitle: 'Подзаголовок',
    description: 'Описание', primaryCta: 'Главная кнопка', secondaryCta: 'Вторая кнопка',
    label: 'Текст', href: 'Ссылка', title: 'Заголовок', avatar: 'Фото (путь к файлу)',
    initials: 'Инициалы', bio: 'Биография', stats: 'Статистика', value: 'Число',
    suffix: 'Приписка', stack: 'Стек', group: 'Группа', items: 'Элементы', lead: 'Подводка',
    filters: 'Фильтры', id: 'ID', tag: 'Метка', categories: 'Категории (id фильтров)',
    preview: 'Встроенное превью (car / saas / bot)', image: 'Своя картинка (путь)',
    link: 'Кнопка', icon: 'Иконка (эмодзи)', text: 'Текст', num: 'Номер', steps: 'Этапы',
    replyNote: 'Заметка о скорости ответа', formMode: 'Куда уходит форма', formEndpoint: 'URL приёма формы',
    channels: 'Каналы связи', whatsappNumber: 'Номер WhatsApp', telegramUser: 'Telegram-логин',
    email: 'Email', copy: 'Копирайт', links: 'Быстрые ссылки', social: 'Соцсети',
    type: 'Тип иконки', accent: 'Акцент', electric: 'Градиент', emerald: 'Успех', subtitle_: 'Подпись',
  };
  const labelFor = (key) => LABELS[key] || key;

  /* Длинные тексты редактируем в textarea, а не в однострочном input */
  const isLong = (key, value) => typeof value === 'string' && (value.length > 70 || ['description', 'text', 'lead', 'title'].includes(key));

  /* ── Разметка панели ─────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .ed-toggle{position:fixed;right:20px;bottom:80px;z-index:90;padding:12px 18px;border-radius:14px;
      background:linear-gradient(100deg,#0066ff,#00d4ff);color:#03131c;border:none;font-weight:700;
      font-family:'Space Grotesk',sans-serif;cursor:pointer;box-shadow:0 14px 40px -12px rgba(0,164,255,.8)}
    .ed{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);z-index:95;display:flex;flex-direction:column;
      background:#0b0c10;border-left:1px solid rgba(255,255,255,.12);transform:translateX(100%);
      transition:transform .4s cubic-bezier(.22,1,.36,1);font-family:'Inter',system-ui,sans-serif}
    .ed.is-open{transform:none}
    .ed__top{display:flex;gap:8px;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1)}
    .ed__top b{font-family:'Space Grotesk',sans-serif;font-size:15px;margin-right:auto}
    .ed__body{overflow:auto;padding:12px 16px 28px;flex:1;scrollbar-width:thin}
    .ed__bottom{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.1)}
    .ed-btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);
      color:#f4f6f8;font-size:13.5px;cursor:pointer;font-family:inherit}
    .ed-btn:hover{border-color:rgba(0,212,255,.5)}
    .ed-btn--primary{background:linear-gradient(100deg,#0066ff,#00d4ff);color:#03131c;border-color:transparent;font-weight:700}
    .ed-btn--danger:hover{border-color:#ff5470;color:#ff8095}
    .ed details{border:1px solid rgba(255,255,255,.1);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,.02)}
    .ed details[open]{border-color:rgba(0,212,255,.28)}
    .ed summary{cursor:pointer;padding:11px 14px;font-family:'Space Grotesk',sans-serif;font-size:14px;color:#dbe3ee}
    .ed details>div{padding:0 14px 14px}
    .ed label{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:#7b8494;margin:12px 0 5px}
    .ed input,.ed textarea{width:100%;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.12);color:#f4f6f8;font:14px/1.5 'Inter',sans-serif}
    .ed input:focus,.ed textarea:focus{outline:none;border-color:rgba(0,212,255,.6)}
    .ed textarea{resize:vertical;min-height:78px}
    .ed .ed-row{display:flex;gap:6px;align-items:center;margin-top:10px}
    .ed .ed-mini{padding:5px 9px;font-size:12px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
      background:transparent;color:#9aa4b3;cursor:pointer}
    .ed .ed-mini:hover{color:#fff;border-color:rgba(0,212,255,.5)}
    .ed-hint{font-size:12px;color:#6d7686;line-height:1.5;margin:2px 0 10px}
    .ed-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99;padding:11px 20px;border-radius:12px;
      background:rgba(0,255,163,.12);border:1px solid rgba(0,255,163,.4);color:#00ffa3;font-size:14px;
      opacity:0;transition:opacity .3s}
    .ed-toast.is-shown{opacity:1}
    @media(max-width:520px){.ed{width:100%}}
  `;
  document.head.append(style);

  const panel = document.createElement('aside');
  panel.className = 'ed';
  panel.innerHTML = `
    <div class="ed__top">
      <b>Редактор сайта</b>
      <button class="ed-btn" id="edReset" title="Вернуть содержимое из content.js">Сброс</button>
      <button class="ed-btn" id="edClose" aria-label="Закрыть редактор">✕</button>
    </div>
    <div class="ed__body" id="edBody"></div>
    <div class="ed__bottom">
      <button class="ed-btn" id="edPreview">Применить</button>
      <button class="ed-btn ed-btn--primary" id="edDownload">Скачать content.js</button>
    </div>`;
  document.body.append(panel);

  const toggle = document.createElement('button');
  toggle.className = 'ed-toggle';
  toggle.textContent = '✎ Редактировать';
  document.body.append(toggle);

  const toast = document.createElement('div');
  toast.className = 'ed-toast';
  document.body.append(toast);
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-shown');
    clearTimeout(say._t);
    say._t = setTimeout(() => toast.classList.remove('is-shown'), 2600);
  };

  /* ── Рекурсивный рендер формы по структуре объекта ───────────────────── */
  const body = panel.querySelector('#edBody');

  /* path — массив ключей до значения, напр. ['projects','items',0,'title'] */
  const getAt = (path) => path.reduce((acc, k) => acc?.[k], draft);
  const setAt = (path, value) => {
    const parent = path.slice(0, -1).reduce((acc, k) => acc[k], draft);
    parent[path.at(-1)] = value;
  };

  function renderField(key, value, path) {
    const wrap = document.createElement('div');

    if (Array.isArray(value)) return renderArray(key, value, path);

    if (value && typeof value === 'object') {
      const det = document.createElement('details');
      det.innerHTML = `<summary>${labelFor(key)}</summary>`;
      const inner = document.createElement('div');
      Object.entries(value).forEach(([k, v]) => inner.append(renderField(k, v, [...path, k])));
      det.append(inner);
      return det;
    }

    const id = `ed-${path.join('-')}`;
    const label = document.createElement('label');
    label.textContent = labelFor(key);
    label.htmlFor = id;

    const input = document.createElement(isLong(key, value) ? 'textarea' : 'input');
    input.id = id;
    input.value = value ?? '';
    if (typeof value === 'number') input.type = 'number';
    input.addEventListener('input', () => {
      setAt(path, typeof value === 'number' ? Number(input.value) : input.value);
    });

    wrap.append(label, input);
    return wrap;
  }

  function renderArray(key, arr, path) {
    const det = document.createElement('details');
    det.innerHTML = `<summary>${labelFor(key)} · ${arr.length}</summary>`;
    const inner = document.createElement('div');

    const isPrimitive = arr.every((v) => typeof v !== 'object' || v === null);

    if (isPrimitive) {
      /* Массив строк редактируем одной textarea: по строке на элемент */
      const label = document.createElement('label');
      label.textContent = 'По одному пункту на строку';
      const ta = document.createElement('textarea');
      ta.value = arr.join('\n');
      ta.rows = Math.min(arr.length + 1, 10);
      ta.addEventListener('input', () => setAt(path, ta.value.split('\n').filter((s) => s.trim() !== '')));
      inner.append(label, ta);
    } else {
      arr.forEach((item, i) => {
        const card = document.createElement('details');
        const name = item.title || item.label || item.group || item.num || `№${i + 1}`;
        card.innerHTML = `<summary>${i + 1}. ${String(name).slice(0, 40)}</summary>`;
        const box = document.createElement('div');
        Object.entries(item).forEach(([k, v]) => box.append(renderField(k, v, [...path, i, k])));

        const row = document.createElement('div');
        row.className = 'ed-row';
        const mk = (text, fn) => {
          const b = document.createElement('button');
          b.className = 'ed-mini'; b.type = 'button'; b.textContent = text;
          b.addEventListener('click', fn);
          return b;
        };
        row.append(
          mk('↑', () => { if (i > 0) { const a = getAt(path); [a[i - 1], a[i]] = [a[i], a[i - 1]]; rerenderForm(); } }),
          mk('↓', () => { const a = getAt(path); if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; rerenderForm(); } }),
          mk('Дублировать', () => { const a = getAt(path); a.splice(i + 1, 0, clone(a[i])); rerenderForm(); }),
          mk('Удалить', () => {
            if (!confirm(`Удалить «${name}»? Действие затронет только черновик.`)) return;
            getAt(path).splice(i, 1); rerenderForm();
          }),
        );
        box.append(row);
        card.append(box);
        inner.append(card);
      });

      const add = document.createElement('button');
      add.className = 'ed-btn'; add.type = 'button'; add.style.marginTop = '12px';
      add.textContent = '+ Добавить';
      add.addEventListener('click', () => {
        const a = getAt(path);
        /* Новый элемент — копия последнего с очищенными значениями: структура сохраняется */
        const template = a.at(-1) ? clone(a.at(-1)) : {};
        const blank = (obj) => {
          Object.entries(obj).forEach(([k, v]) => {
            if (Array.isArray(v)) obj[k] = [];
            else if (v && typeof v === 'object') blank(v);
            else if (typeof v === 'string') obj[k] = '';
            else if (typeof v === 'number') obj[k] = 0;
          });
          return obj;
        };
        a.push(blank(template));
        rerenderForm();
      });
      inner.append(add);
    }

    det.append(inner);
    return det;
  }

  function rerenderForm() {
    body.replaceChildren();
    const hint = document.createElement('p');
    hint.className = 'ed-hint';
    hint.textContent = 'Правки сохраняются в браузере. Чтобы они стали постоянными — нажмите «Скачать content.js» и замените файл в проекте.';
    body.append(hint);
    Object.entries(draft).forEach(([k, v]) => body.append(renderField(k, v, [k])));
  }
  rerenderForm();

  /* ── Кнопки панели ───────────────────────────────────────────────────── */
  const open = (state) => panel.classList.toggle('is-open', state);
  toggle.addEventListener('click', () => open(!panel.classList.contains('is-open')));
  panel.querySelector('#edClose').addEventListener('click', () => open(false));

  panel.querySelector('#edPreview').addEventListener('click', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    location.reload();          // перерисовываем страницу с новым черновиком
  });

  panel.querySelector('#edReset').addEventListener('click', () => {
    if (!confirm('Сбросить все несохранённые правки и вернуть содержимое из content.js?')) return;
    localStorage.removeItem(DRAFT_KEY);
    location.reload();
  });

  panel.querySelector('#edDownload').addEventListener('click', () => {
    const file =
      '/* content.js — сгенерировано визуальным редактором (?edit=1).\n' +
      '   Можно продолжать править вручную: это обычный JS-объект. */\n\n' +
      'const SITE = ' + JSON.stringify(draft, null, 2) + ';\n\n' +
      'window.SITE = SITE;\n';

    const blob = new Blob([file], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'content.js';
    a.click();
    URL.revokeObjectURL(url);
    say('Файл скачан — замените им content.js в проекте');
  });

  say('Режим редактирования включён');
})();
