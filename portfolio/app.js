/* ═══════════════════════════════════════════════════════════════════════════
   app.js — рендер контента из content.js + интерактив
   Никаких зависимостей. Всё разбито на маленькие init-функции,
   чтобы падение одной не ломало страницу целиком (см. safe()).
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* Черновик из визуального редактора (?edit=1) имеет приоритет над content.js.
     Так правки видны сразу, до того как файл перезаписан на диске. */
  const SITE = (() => {
    const base = window.SITE || {};
    try {
      const draft = localStorage.getItem('portfolio:draft');
      if (draft) return { ...base, ...JSON.parse(draft) };
    } catch (e) { console.warn('[portfolio] черновик повреждён, использую content.js', e); }
    return base;
  })();
  window.SITE_ACTIVE = SITE;
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Ошибка в одном блоке не должна ронять весь сайт */
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error(`[portfolio] ${name}:`, e); } };

  /* XSS-защита: весь пользовательский текст из content.js вставляем как текст,
     а не как HTML. Единственное исключение — наши собственные <template> с SVG. */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (v !== '' && v != null) node.setAttribute(k, v);
    }
    children.flat().forEach((c) => c && node.append(c));
    return node;
  };
  /* Перенос строки \n в конфиге → <br> в заголовке */
  const multiline = (text) => esc(text).replace(/\n/g, '<br>');

  /* ── Тема из конфига ─────────────────────────────────────────────────── */
  safe('theme', () => {
    const t = SITE.theme || {};
    const root = document.documentElement.style;
    if (t.accent)   root.setProperty('--neon', t.accent);
    if (t.electric) root.setProperty('--electric', t.electric);
    if (t.emerald)  root.setProperty('--emerald', t.emerald);
  });

  /* ── HERO ────────────────────────────────────────────────────────────── */
  safe('hero', () => {
    const h = SITE.hero; if (!h) return;
    const badge = $('.badge');
    if (badge) {
      if (!h.badge) badge.hidden = true;
      else badge.lastChild.textContent = h.badge;
    }
    const title = $('.hero h1 .grad-text');
    if (title) title.innerHTML = `${esc(h.firstName)}<br>${esc(h.lastName)}`;
    document.title = `${h.firstName} ${h.lastName} — ${h.subtitle}`;

    const sub = $('.hero__sub');
    if (sub) sub.innerHTML = esc(h.subtitle).replace(/(Frontend|Backend)/g, '<b>$1</b>');
    const desc = $('.hero__desc'); if (desc) desc.textContent = h.description;

    const [primary, secondary] = $$('.hero__actions a');
    if (primary && h.primaryCta)   { primary.textContent = h.primaryCta.label;   primary.href = h.primaryCta.href; }
    if (secondary && h.secondaryCta) { secondary.textContent = h.secondaryCta.label; secondary.href = h.secondaryCta.href; }

    const logo = $('.logo');
    if (logo) logo.append(document.createTextNode(''));
  });

  /* ── ОБО МНЕ ─────────────────────────────────────────────────────────── */
  safe('about', () => {
    const a = SITE.about; if (!a) return;

    const title = $('#about .h2');
    if (title && a.title) title.innerHTML = multiline(a.title);

    const img = $('.avatar__inner img');
    if (img && a.avatar) { img.src = a.avatar; img.alt = `${SITE.hero?.firstName || ''} ${SITE.hero?.lastName || ''}`.trim(); }

    /* Био: первый .lead в колонке — шаблон, остальные клонируем */
    const bioHost = $('#about .about > div:last-child');
    if (bioHost && Array.isArray(a.bio)) {
      $$('.lead', bioHost).forEach((p) => p.remove());
      const stackRoot = $('.stack', bioHost);
      a.bio.forEach((text, i) => {
        const p = el('p', { class: 'lead', text });
        if (i === 0) p.style.marginTop = '0';
        bioHost.insertBefore(p, stackRoot);
      });
    }

    const statsHost = $('.stats');
    if (statsHost && Array.isArray(a.stats)) {
      statsHost.replaceChildren(...a.stats.map((s) => el('div', { class: 'stat' },
        el('b', { 'data-count': s.value, 'data-suffix': s.suffix || '', text: '0' }),
        el('span', { text: s.label }),
      )));
    }

    const stackHost = $('.stack');
    if (stackHost && Array.isArray(a.stack)) {
      stackHost.replaceChildren(...a.stack.map((row) => el('div', { class: 'stack__row' },
        el('h4', { text: row.group }),
        el('div', { class: 'chips' }, row.items.map((i) => el('span', { class: 'chip', text: i }))),
      )));
    }
  });

  /* ── ПОРТФОЛИО: фильтры + карточки ───────────────────────────────────── */
  safe('projects', () => {
    const p = SITE.projects; if (!p) return;
    const grid = $('#projectsGrid');
    const filtersHost = $('.filters');
    const empty = $('#emptyState');
    const leadEl = $('#projects .lead');
    if (leadEl && p.lead) leadEl.textContent = p.lead;

    /* Карточка проекта */
    const renderCard = (item, idx) => {
      const thumb = el('div', { class: 'thumb' }, el('span', { class: 'thumb__tag', text: item.tag || '' }));
      if (item.image) {
        thumb.append(el('img', { src: item.image, alt: `Превью проекта ${item.title}`, loading: 'lazy', decoding: 'async' }));
      } else {
        const tpl = document.getElementById(`preview-${item.preview || 'car'}`);
        if (tpl) thumb.append(tpl.content.cloneNode(true));
      }

      const link = item.link?.href
        ? el('a', {
            class: 'btn btn--sm btn--wide project__link',
            href: item.link.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            'data-magnetic': '',
            text: item.link.label || 'Открыть',
          })
        : null;
      if (link) link.insertAdjacentHTML('beforeend',
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>');

      return el('article', {
        class: 'card project reveal',
        'data-cat': (item.categories || []).join(' '),
        'data-delay': String((idx % 3) + 1),
      }, thumb, el('div', { class: 'project__body' },
        el('h3', { text: item.title }),
        el('p', { text: item.description }),
        el('div', { class: 'tags' }, (item.stack || []).map((t) => el('span', { class: 'tag', text: t }))),
        link,
      ));
    };

    if (grid && Array.isArray(p.items)) grid.replaceChildren(...p.items.map(renderCard));

    if (filtersHost && Array.isArray(p.filters)) {
      filtersHost.replaceChildren(...p.filters.map((f, i) => el('button', {
        class: 'filter', 'data-filter': f.id, 'aria-pressed': String(i === 0), text: f.label,
      })));
    }

    /* Переключение фильтра. Скрываем через [hidden] — сетка не «прыгает». */
    const apply = (cat) => {
      let shown = 0;
      $$('.project', grid).forEach((card) => {
        const match = cat === 'all' || (card.dataset.cat || '').split(' ').includes(cat);
        card.hidden = !match;
        if (match) { shown++; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
      });
      if (empty) empty.hidden = shown > 0;
    };

    filtersHost?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter'); if (!btn) return;
      $$('.filter', filtersHost).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      apply(btn.dataset.filter);
      observeReveals();
    });
  });

  /* ── УСЛУГИ ──────────────────────────────────────────────────────────── */
  safe('services', () => {
    const host = $('#servicesGrid'); const s = SITE.services;
    if (!host || !s?.items) return;
    const lead = $('#services .lead'); if (lead && s.lead) lead.textContent = s.lead;
    host.replaceChildren(...s.items.map((item, i) => el('article', {
      class: 'card service reveal', 'data-delay': String((i % 3) + 1),
    },
      el('div', { class: 'service__icon', 'aria-hidden': 'true', text: item.icon }),
      el('h3', { text: item.title }),
      el('p', { text: item.text }),
    )));
  });

  /* ── ПРОЦЕСС ─────────────────────────────────────────────────────────── */
  safe('process', () => {
    const host = $('#timeline'); const p = SITE.process;
    if (!host || !p?.steps) return;
    const lead = $('#process .lead'); if (lead && p.lead) lead.textContent = p.lead;
    host.replaceChildren(...p.steps.map((step, i) => el('div', {
      class: 'step reveal', 'data-delay': String((i % 3) + 1),
    },
      el('div', { class: 'step__num', text: step.num }),
      el('div', { class: 'step__body' }, el('h3', { text: step.title }), el('p', { text: step.text })),
    )));
  });

  /* ── КОНТАКТЫ: каналы, футер, соцсети ────────────────────────────────── */
  const ICONS = {
    github:   '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19.9 5a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.6 12.6 0 0 0-6.6 0C6.9 1.1 5.8 1.4 5.8 1.4A4.9 4.9 0 0 0 5.7 5a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
    telegram: '<path d="m22 3-9.5 18-2.5-7.5L3 11z"/>',
    whatsapp: '<path d="M3 21l1.9-5A8.5 8.5 0 1 1 8 19.1z"/><path d="M8.5 9.5c.3 2.5 3.5 5.7 6 6l1.2-1.6 2 1-.4 1.8c-3.6.9-8.9-4.4-8-8l1.8-.4z"/>',
    link:     '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  };
  const svgIcon = (type) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[type] || ICONS.link}</svg>`;

  safe('contact', () => {
    const c = SITE.contact; if (!c) return;
    const lead = $('#contact .lead'); if (lead && c.lead) lead.textContent = c.lead;
    const note = $('.reply-note'); if (note && c.replyNote) note.textContent = c.replyNote;

    const host = $('#channels');
    if (host && Array.isArray(c.channels)) {
      host.replaceChildren(...c.channels.map((ch) => {
        const a = el('a', {
          class: 'channel', href: ch.href, target: '_blank', rel: 'noopener noreferrer',
          'aria-label': `${ch.title}: ${ch.subtitle}`,
        },
          el('div', { class: 'channel__ico', 'aria-hidden': 'true', text: ch.icon }),
          el('div', {}, el('b', { text: ch.title }), el('span', { text: ch.subtitle })),
        );
        a.insertAdjacentHTML('beforeend',
          '<span class="channel__arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>');
        return a;
      }));
    }
  });

  safe('footer', () => {
    const f = SITE.footer; if (!f) return;
    const copy = $('.copy'); if (copy && f.copy) copy.textContent = f.copy;

    const links = $('.footer__links');
    if (links && Array.isArray(f.links)) {
      links.replaceChildren(...f.links.map((l) => el('a', { href: l.href, text: l.label })));
    }
    const social = $('#footerSocial');
    if (social && Array.isArray(f.social)) {
      social.replaceChildren(...f.social.map((s) => {
        const a = el('a', {
          class: 'social', href: s.href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': s.label,
        });
        a.innerHTML = svgIcon(s.type);
        return a;
      }));
    }
  });

  /* ═════════════ ИНТЕРАКТИВ ═════════════ */

  /* ── Появление при скролле (Intersection Observer) ───────────────────── */
  let revealObserver;
  function observeReveals() {
    if (REDUCED) { $$('.reveal').forEach((n) => n.classList.add('is-visible')); return; }
    revealObserver ||= new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);   // одноразово: экономим кадры
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('.reveal:not(.is-visible)').forEach((n) => revealObserver.observe(n));
    $$('.step').forEach((n) => revealObserver.observe(n));
  }
  safe('reveal', observeReveals);

  /* ── Счётчики статистики ─────────────────────────────────────────────── */
  safe('counters', () => {
    const counters = $$('[data-count]');
    if (!counters.length) return;
    if (REDUCED) { counters.forEach((n) => n.textContent = n.dataset.count + (n.dataset.suffix || '')); return; }

    const run = (node) => {
      const target = Number(node.dataset.count) || 0;
      const suffix = node.dataset.suffix || '';
      const DURATION = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3);           // easeOutCubic
        node.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach((n) => io.observe(n));
  });

  /* ── Прогресс скролла + «наверх» + фон шапки ─────────────────────────── */
  safe('scroll-ui', () => {
    const progress = $('#progress');
    const nav = $('#nav');
    const toTop = $('#toTop');
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      nav?.classList.toggle('is-stuck', y > 20);
      toTop?.classList.toggle('is-shown', y > innerHeight * 0.6);
      ticking = false;
    };
    /* rAF-троттлинг: обработчик скролла не должен считать layout каждый тик */
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
  });

  /* ── Активный пункт меню ─────────────────────────────────────────────── */
  safe('nav-spy', () => {
    const links = $$('.nav__links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        map.get(e.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  });

  /* ── Бургер-меню ─────────────────────────────────────────────────────── */
  safe('burger', () => {
    const burger = $('#burger'); const drawer = $('#drawer');
    if (!burger || !drawer) return;
    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    matchMedia('(min-width:900px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  });

  /* ── Подсветка карточек и кнопок за курсором ─────────────────────────── */
  safe('spotlight', () => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    document.addEventListener('pointermove', (e) => {
      const target = e.target.closest('.card, .btn');
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${e.clientX - r.left}px`);
      target.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  });

  /* ── Магнитные кнопки ────────────────────────────────────────────────── */
  safe('magnetic', () => {
    if (REDUCED || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const STRENGTH = 0.28;
    document.addEventListener('pointermove', (e) => {
      const btn = e.target.closest('[data-magnetic]');
      $$('[data-magnetic]').forEach((b) => { if (b !== btn) b.style.transform = ''; });
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
      const dy = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
      btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => $$('[data-magnetic]').forEach((b) => b.style.transform = ''));
  });

  /* ── Кастомный курсор (только desktop с мышью) ───────────────────────── */
  safe('cursor', () => {
    if (REDUCED || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const ring = $('.cursor'); const dot = $('.cursor-dot');
    if (!ring || !dot) return;
    document.body.classList.add('has-cursor');

    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate3d(${x - 2.5}px, ${y - 2.5}px, 0)`;
      ring.classList.toggle('is-hover', !!e.target.closest('a, button, input, textarea, .card'));
    }, { passive: true });

    /* Кольцо догоняет курсор с задержкой — эффект «инерции» */
    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      const size = ring.classList.contains('is-hover') ? 26 : 16;
      ring.style.transform = `translate3d(${rx - size}px, ${ry - size}px, 0)`;
      requestAnimationFrame(loop);
    })();
  });

  /* ── Параллакс hero-заголовка ────────────────────────────────────────── */
  safe('parallax', () => {
    if (REDUCED) return;
    const hero = $('.hero .wrap'); if (!hero) return;
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, innerHeight);
        hero.style.transform = `translate3d(0, ${y * 0.16}px, 0)`;
        hero.style.opacity = String(Math.max(1 - y / (innerHeight * 0.9), 0));
        ticking = false;
      });
    }, { passive: true });
  });

  /* ── Плавный скролл по якорям (для браузеров без scroll-behavior) ────── */
  safe('anchors', () => {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id ? `#${id}` : location.pathname);
    });
  });

  /* ── Форма: валидация + отправка без бэкенда ─────────────────────────── */
  safe('form', () => {
    const form = $('#contactForm'); if (!form) return;
    const status = $('#formStatus');
    const c = SITE.contact || {};

    const RULES = {
      name:    { min: 2,  msg: 'Укажите имя (минимум 2 символа)' },
      contact: { min: 3,  msg: 'Оставьте email или @username — иначе не смогу ответить' },
      message: { min: 10, msg: 'Опишите задачу чуть подробнее (минимум 10 символов)' },
    };

    const setError = (input, msg) => {
      const field = input.closest('.field');
      field.dataset.invalid = String(!!msg);
      $('.error', field).textContent = msg || '';
      input.setAttribute('aria-invalid', String(!!msg));
    };

    /* Ошибка гаснет сразу, как только пользователь начал исправлять */
    form.addEventListener('input', (e) => {
      if (e.target.matches('input, textarea')) setError(e.target, '');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      let firstInvalid = null;

      for (const [key, rule] of Object.entries(RULES)) {
        const input = form.elements[key];
        const value = String(data[key] || '').trim();
        const bad = value.length < rule.min;
        setError(input, bad ? rule.msg : '');
        if (bad && !firstInvalid) firstInvalid = input;
      }
      if (firstInvalid) { firstInvalid.focus(); status.textContent = ''; return; }

      const text =
        `Новая заявка с сайта\n\n` +
        `Имя: ${data.name}\n` +
        `Контакт: ${data.contact}\n\n` +
        `Сообщение:\n${data.message}`;

      const mode = c.formMode || 'whatsapp';
      status.textContent = 'Открываю мессенджер…';

      try {
        if (mode === 'endpoint' && c.formEndpoint) {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 10000);   // таймаут: не ждём вечно
          const res = await fetch(c.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          status.textContent = '✅ Сообщение отправлено. Отвечу в ближайшее время.';
          form.reset();
          return;
        }

        if (mode === 'mailto' && c.email) {
          location.href = `mailto:${c.email}?subject=${encodeURIComponent('Заявка с сайта')}&body=${encodeURIComponent(text)}`;
        } else if (mode === 'telegram' && c.telegramUser) {
          try { await navigator.clipboard.writeText(text); } catch { /* буфер недоступен — не критично */ }
          open(`https://t.me/${c.telegramUser}`, '_blank', 'noopener');
        } else {
          open(`https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        }
        status.textContent = '✅ Готово! Осталось нажать «Отправить» в мессенджере.';
        form.reset();
      } catch (err) {
        console.error('[portfolio] form:', err);
        status.style.color = '#ff8095';
        status.textContent = 'Не удалось отправить. Напишите напрямую в Telegram или WhatsApp ниже.';
      }
    });
  });

  /* ── Режим редактирования: ?edit=1 подгружает editor.js ──────────────── */
  safe('editor-bootstrap', () => {
    if (!new URLSearchParams(location.search).has('edit')) return;
    const s = document.createElement('script');
    s.src = 'editor.js';
    s.defer = true;
    document.body.append(s);
  });
})();
