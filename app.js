(() => {
  'use strict';

  // ======================== STATE ========================
  const tg = window.Telegram?.WebApp || null;
  const initData = tg?.initData || '';

  const GAME_TITLES = {
    crash: 'Краш',
    cases: 'Кейсы',
    craft: 'Крафт',
    wheel: 'Колесо Удачи',
    mines: 'Мины',
    plinko: 'Плинко',
    pvp: 'PvP Колесо',
    upgrader: 'Апгрейдер',
    auction: 'Загадочный аукцион',
    singularity: 'Сингулярность',
    safe: 'Взлом Сейфа',
    slots: 'Слоты'
  };

  // Clean monochrome white Telegram-style SVG icon set (ZERO emojis in UI!)
  const TG_ICONS = {
    gavel: '<path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
    gamepad: '<path d="M6 12h4m-2-2v4m7-1h.01M18 11h.01M6.5 6h11a4.5 4.5 0 0 1 4.4 5.4l-.8 3.8A3 3 0 0 1 18.2 18a2.7 2.7 0 0 1-2.1-1l-1.4-1.7a1 1 0 0 0-.8-.3h-3.8a1 1 0 0 0-.8.3L7.9 17a2.7 2.7 0 0 1-2.1 1 3 3 0 0 1-2.9-2.8l-.8-3.8A4.5 4.5 0 0 1 6.5 6Z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v5a6 6 0 1 1-12 0V4Zm6 11v5m-4 0h8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    award: '<circle cx="12" cy="8" r="5.5"/><path d="M8.5 13 7 21l5-2.6L17 21l-1.5-8"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'volume-on': '<path d="M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/>',
    'volume-off': '<path d="M11 5 6 9H2v6h4l5 4V5Zm11 4-6 6m0-6 6 6"/>',
    flame: '<path d="M12 2c.7 3.5-2.5 5.2-2.5 8.2a2.5 2.5 0 0 0 5 0c0-1.2-.5-2.2-1.2-3 2.7 1.3 4.7 4 4.7 7.1A6 6 0 0 1 6 14.3C6 9.8 9.2 6.8 12 2Z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/>',
    sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    skip: '<path d="m5 5 9 7-9 7V5Zm13 0v14"/>',
    hammer: '<path d="m15 12-8.5 8.5a2.1 2.1 0 1 1-3-3L12 9m5.6-3.2 2.6 2.6a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4l2.1-2.1a1 1 0 0 1 1.4 0l2 2Z"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v6.8m0 4.4V21M3 12h6.8m4.4 0H21M5.6 5.6l4.8 4.8m3.2 3.2 4.8 4.8m0-12.8-4.8 4.8m-3.2 3.2-4.8 4.8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6m-3 3 4 4m-1 1 2-2M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6m3 3-4 4"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Zm-2.5 9 2 2 3.5-4"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7Zm4.3 11a2 2 0 0 0 3.4 0"/>',
    megaphone: '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2Zm13-4.5a6.5 6.5 0 0 1 0 11"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9l4-6Zm-4 6h20M12 21 8 9l4-6 4 6-4 12Z"/>',
    bomb: '<circle cx="11" cy="13" r="7"/><path d="M16 8l2.5-2.5M19 3v2m2 2h-2m-1.5 1.5L19 10"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09ZM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><circle cx="15" cy="9" r="1.5"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1"/><circle cx="14" cy="8.5" r="1"/><circle cx="16" cy="13" r="1"/><circle cx="9.5" cy="14.5" r="1"/>',
    coins: '<circle cx="9" cy="10" r="6"/><path d="M15.4 10.6a6 6 0 1 1-4.8 4.8"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8m0 0h-5m5 0v5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4m0-4h.01"/>',
    'arrow-left': '<path d="M19 12H5m6 6-6-6 6-6"/>',
    'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    ticket: '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2 2 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2 2 0 0 0 0-3V9Z"/><path d="M13 7v10" stroke-dasharray="2 2.5"/>',
    'more-vertical': '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<polygon points="6 4 20 12 6 20 6 4"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15.4-6.3L21 8m0-5v5h-5M21 12a9 9 0 0 1-15.4 6.3L3 16m0 5v-5h5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };

  function tgIcon(name, size = 16) {
    const body = TG_ICONS[name] || TG_ICONS.sparkle;
    return `<span class="tg-ico" style="width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg></span>`;
  }

  function hydrateTelegramIcons(root = document) {
    root.querySelectorAll('.tg-ico[data-ico]').forEach((el) => {
      const name = el.dataset.ico;
      const sz = Number(el.dataset.size) || 16;
      el.style.width = `${sz}px`;
      el.style.height = `${sz}px`;
      const body = TG_ICONS[name] || TG_ICONS.sparkle;
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    });
  }

  // Startup Preloader & Game Transition Loader
  let preloaderCurrentPct = 8;
  function setPreloader(pct) {
    preloaderCurrentPct = Math.max(preloaderCurrentPct, Math.min(100, Math.round(pct)));
    const fill = $('preloader-fill');
    const pctEl = $('preloader-pct');
    if (fill) fill.style.width = `${preloaderCurrentPct}%`;
    if (pctEl) pctEl.textContent = `${preloaderCurrentPct}%`;
  }

  function hidePreloader() {
    window.__ZG_BOOT_DONE__ = true;
    const el = $('app-preloader');
    if (!el || el.classList.contains('done')) return;
    el.classList.add('done');
    setTimeout(() => { el.style.display = 'none'; }, 420);
  }

  // Silent background asset cache (never blocks UI, gradually preloads in background)
  const warmedUrls = new Set();
  const warmedJson = new Map();
  let bgWarmupStarted = false;

  async function bgFetchJson(url) {
    if (!url) return null;
    if (warmedJson.has(url)) return warmedJson.get(url);
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const data = await r.json();
      warmedJson.set(url, data);
      return data;
    } catch {
      return null;
    }
  }

  async function bgPreloadImages(urls, opts = {}) {
    const batchSize = opts.batchSize || 3;
    const delayMs = opts.delayMs !== undefined ? opts.delayMs : 70;
    const queue = [...new Set((urls || []).filter((u) => u && !warmedUrls.has(u)))];
    for (let i = 0; i < queue.length; i += batchSize) {
      const chunk = queue.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (u) => {
        const ok = await preloadImageAsset(u, 3500);
        if (ok) warmedUrls.add(u);
      }));
      if (i + batchSize < queue.length && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  function startBackgroundWarmup() {
    if (bgWarmupStarted) return;
    bgWarmupStarted = true;
    setTimeout(async () => {
      try {
        const hubUrls = [];
        document.querySelectorAll('.hub-card-art').forEach((el) => {
          const src = el.getAttribute('src');
          if (src) hubUrls.push(src);
        });
        hubUrls.push('/blackhole.png', '/asteroid_1.png', '/asteroid_2.png', '/asteroid_3.png', '/hub_auction.png', '/hub_safe.png', '/hub_slots.png');
        await bgPreloadImages(hubUrls, { batchSize: 3, delayMs: 90 });

        // Warm core game JSONs silently
        await bgFetchJson('/blackhole.json');
        await new Promise((r) => setTimeout(r, 120));
        await bgFetchJson('rocket.json');
        await bgFetchJson('explosion.json');

        // Gradually warm cases, wheel segments and user inventory images
        const extraUrls = [];
        (state.cases || []).forEach((c) => { if (c?.image) extraUrls.push(c.image); });
        (state.wheelSegments || []).forEach((seg) => { if (seg?.image) extraUrls.push(seg.image); });
        (state.user?.inventory || []).slice(0, 18).forEach((g) => { if (g?.image) extraUrls.push(g.image); });
        await bgPreloadImages(extraUrls, { batchSize: 3, delayMs: 120 });
      } catch {}
    }, 900);
  }

  // Retina HiDPI Canvas helper (eliminates ALL blurry / pixelated rings & wheels on 2x/3x phones!)
  function setupHiDpiCanvas(canvas, cssW, cssH) {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 2, 2), 3);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  // Universal Thematic Ambient Backgrounds (smooth, slow, transparent, strictly behind cards on ALL screens & games!)
  const AMBIENT_THEMES = {
    hub: {
      count: 30,
      kind: 'star',
      dir: 'up',
      colors: ['rgba(56, 189, 248, ', 'rgba(129, 140, 248, ', 'rgba(253, 224, 71, '],
      orbs: [
        { rx: 0.18, ry: 0.18, r: 165, color: 'rgba(56, 189, 248, 0.14)', spx: 0.00042, spy: 0.00031, ph: 0.4 },
        { rx: 0.82, ry: 0.46, r: 170, color: 'rgba(99, 102, 241, 0.14)', spx: 0.00035, spy: 0.00044, ph: 2.3 },
        { rx: 0.35, ry: 0.82, r: 155, color: 'rgba(168, 85, 247, 0.12)', spx: 0.00048, spy: 0.00028, ph: 4.5 }
      ]
    },
    profile: {
      count: 26,
      kind: 'star',
      dir: 'up',
      colors: ['rgba(250, 204, 21, ', 'rgba(56, 189, 248, ', 'rgba(192, 132, 252, '],
      orbs: [
        { rx: 0.22, ry: 0.16, r: 150, color: 'rgba(56, 189, 248, 0.13)', spx: 0.00045, spy: 0.00032, ph: 0 },
        { rx: 0.78, ry: 0.34, r: 145, color: 'rgba(250, 204, 21, 0.10)', spx: 0.00038, spy: 0.00048, ph: 2.1 },
        { rx: 0.50, ry: 0.72, r: 165, color: 'rgba(168, 85, 247, 0.11)', spx: 0.00031, spy: 0.00036, ph: 4.2 }
      ]
    },
    top: {
      count: 22,
      kind: 'crown',
      dir: 'up',
      colors: ['rgba(250, 204, 21, ', 'rgba(251, 191, 36, ', 'rgba(56, 189, 248, '],
      orbs: [
        { rx: 0.25, ry: 0.20, r: 160, color: 'rgba(250, 204, 21, 0.12)', spx: 0.00038, spy: 0.00030, ph: 0.5 },
        { rx: 0.78, ry: 0.62, r: 165, color: 'rgba(245, 158, 11, 0.10)', spx: 0.00032, spy: 0.00042, ph: 2.7 }
      ]
    },
    crash: {
      count: 16,
      kind: 'rocket',
      dir: 'rocket',
      colors: ['rgba(56, 189, 248, ', 'rgba(147, 197, 253, ', 'rgba(251, 146, 60, '],
      orbs: [
        { rx: 0.22, ry: 0.25, r: 175, color: 'rgba(56, 189, 248, 0.13)', spx: 0.00035, spy: 0.00032, ph: 0.2 },
        { rx: 0.76, ry: 0.65, r: 165, color: 'rgba(249, 115, 22, 0.10)', spx: 0.00030, spy: 0.00040, ph: 3.1 }
      ]
    },
    cases: {
      count: 20,
      kind: 'gift',
      dir: 'up',
      colors: ['rgba(250, 204, 21, ', 'rgba(244, 114, 182, ', 'rgba(56, 189, 248, '],
      orbs: [
        { rx: 0.20, ry: 0.22, r: 170, color: 'rgba(250, 204, 21, 0.11)', spx: 0.00036, spy: 0.00030, ph: 1.0 },
        { rx: 0.80, ry: 0.58, r: 165, color: 'rgba(236, 72, 153, 0.10)', spx: 0.00033, spy: 0.00038, ph: 3.4 }
      ]
    },
    craft: {
      count: 22,
      kind: 'crystal',
      dir: 'up',
      colors: ['rgba(192, 132, 252, ', 'rgba(56, 189, 248, ', 'rgba(244, 114, 182, '],
      orbs: [
        { rx: 0.25, ry: 0.24, r: 170, color: 'rgba(168, 85, 247, 0.14)', spx: 0.00034, spy: 0.00034, ph: 0.8 },
        { rx: 0.75, ry: 0.66, r: 165, color: 'rgba(56, 189, 248, 0.12)', spx: 0.00039, spy: 0.00029, ph: 2.9 }
      ]
    },
    wheel: {
      count: 24,
      kind: 'ringstar',
      dir: 'up',
      colors: ['rgba(250, 204, 21, ', 'rgba(129, 140, 248, ', 'rgba(52, 211, 153, '],
      orbs: [
        { rx: 0.50, ry: 0.30, r: 185, color: 'rgba(250, 204, 21, 0.11)', spx: 0.00035, spy: 0.00035, ph: 0.6 },
        { rx: 0.25, ry: 0.72, r: 160, color: 'rgba(99, 102, 241, 0.12)', spx: 0.00040, spy: 0.00031, ph: 2.4 }
      ]
    },
    mines: {
      count: 22,
      kind: 'gem',
      dir: 'up',
      colors: ['rgba(56, 189, 248, ', 'rgba(52, 211, 153, ', 'rgba(147, 197, 253, '],
      orbs: [
        { rx: 0.24, ry: 0.28, r: 165, color: 'rgba(14, 165, 233, 0.13)', spx: 0.00033, spy: 0.00036, ph: 1.2 },
        { rx: 0.76, ry: 0.68, r: 165, color: 'rgba(16, 185, 129, 0.11)', spx: 0.00038, spy: 0.00032, ph: 3.9 }
      ]
    },
    plinko: {
      count: 26,
      kind: 'ball',
      dir: 'down',
      colors: ['rgba(56, 189, 248, ', 'rgba(250, 204, 21, ', 'rgba(168, 85, 247, '],
      orbs: [
        { rx: 0.30, ry: 0.22, r: 165, color: 'rgba(56, 189, 248, 0.12)', spx: 0.00035, spy: 0.00033, ph: 0.3 },
        { rx: 0.72, ry: 0.64, r: 165, color: 'rgba(168, 85, 247, 0.11)', spx: 0.00031, spy: 0.00039, ph: 2.6 }
      ]
    },
    pvp: {
      count: 20,
      kind: 'shield',
      dir: 'up',
      colors: ['rgba(251, 146, 60, ', 'rgba(56, 189, 248, ', 'rgba(250, 204, 21, '],
      orbs: [
        { rx: 0.24, ry: 0.26, r: 165, color: 'rgba(249, 115, 22, 0.11)', spx: 0.00036, spy: 0.00031, ph: 0.9 },
        { rx: 0.76, ry: 0.66, r: 165, color: 'rgba(56, 189, 248, 0.12)', spx: 0.00033, spy: 0.00038, ph: 3.5 }
      ]
    },
    upgrader: {
      count: 20,
      kind: 'chevron',
      dir: 'up',
      colors: ['rgba(52, 211, 153, ', 'rgba(56, 189, 248, ', 'rgba(110, 231, 183, '],
      orbs: [
        { rx: 0.28, ry: 0.24, r: 190, color: 'rgba(16, 185, 129, 0.16)', spx: 0.00035, spy: 0.00033, ph: 1.4 },
        { rx: 0.74, ry: 0.68, r: 185, color: 'rgba(56, 189, 248, 0.15)', spx: 0.00039, spy: 0.00028, ph: 3.7 }
      ]
    },
    auction: {
      count: 16,
      kind: 'star',
      dir: 'up',
      colors: ['rgba(251, 191, 36, ', 'rgba(245, 158, 11, ', 'rgba(253, 230, 138, '],
      orbs: [
        { rx: 0.24, ry: 0.24, r: 175, color: 'rgba(245, 158, 11, 0.14)', spx: 0.00032, spy: 0.00030, ph: 0.7 },
        { rx: 0.78, ry: 0.70, r: 175, color: 'rgba(234, 88, 12, 0.11)', spx: 0.00034, spy: 0.00036, ph: 2.9 }
      ]
    },
    singularity: {
      count: 22,
      kind: 'star',
      dir: 'up',
      colors: ['rgba(148, 163, 184, ', 'rgba(129, 140, 248, ', 'rgba(226, 232, 240, '],
      orbs: [
        { rx: 0.50, ry: 0.34, r: 210, color: 'rgba(79, 70, 229, 0.12)', spx: 0.00022, spy: 0.00024, ph: 0.4 },
        { rx: 0.25, ry: 0.78, r: 170, color: 'rgba(56, 189, 248, 0.09)', spx: 0.00028, spy: 0.00031, ph: 2.2 }
      ]
    },
    safe: {
      count: 16,
      kind: 'shield',
      dir: 'up',
      colors: ['rgba(56, 189, 248, ', 'rgba(148, 163, 184, ', 'rgba(34, 211, 238, '],
      orbs: [
        { rx: 0.30, ry: 0.26, r: 180, color: 'rgba(56, 189, 248, 0.13)', spx: 0.00033, spy: 0.00030, ph: 1.1 },
        { rx: 0.72, ry: 0.68, r: 170, color: 'rgba(34, 197, 94, 0.10)', spx: 0.00035, spy: 0.00034, ph: 3.1 }
      ]
    },
    slots: {
      count: 18,
      kind: 'star',
      dir: 'up',
      colors: ['rgba(251, 191, 36, ', 'rgba(248, 113, 113, ', 'rgba(192, 132, 252, '],
      orbs: [
        { rx: 0.26, ry: 0.22, r: 180, color: 'rgba(245, 158, 11, 0.14)', spx: 0.00036, spy: 0.00032, ph: 0.5 },
        { rx: 0.76, ry: 0.68, r: 180, color: 'rgba(168, 85, 247, 0.13)', spx: 0.00031, spy: 0.00038, ph: 2.7 }
      ]
    }
  };

  const ambientControllers = {};
  function initAmbientCanvas(canvasId, initialTheme = 'hub') {
    const canvas = $(canvasId);
    if (!canvas || ambientControllers[canvasId]) return;
    const ctx = canvas.getContext('2d');
    let cfg = AMBIENT_THEMES[initialTheme] || AMBIENT_THEMES.hub;
    let w = 0;
    let h = 0;
    let items = [];

    function resize() {
      // DPR 1 on full-screen ambient background saves 75% GPU fill-rate on mobile WebViews!
      w = window.innerWidth || 380;
      h = window.innerHeight || 720;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    window.addEventListener('resize', resize);

    function spawn(randomY = true) {
      const cw = w || 380;
      const ch = h || 720;
      const isDown = cfg.dir === 'down';
      const isRocket = cfg.dir === 'rocket';
      const y = randomY ? Math.random() * ch : (isDown ? -26 : ch + 30);
      const x = isRocket && !randomY ? (Math.random() * (cw + 80) - 60) : Math.random() * cw;
      return {
        x,
        y,
        r: isRocket ? (12 + Math.random() * 12) : (8.5 + Math.random() * 12),
        vy: isDown
          ? (0.30 + Math.random() * 0.44)
          : isRocket
            ? -(0.36 + Math.random() * 0.46)
            : -(0.22 + Math.random() * 0.38),
        vx: isRocket
          ? (0.12 + Math.random() * 0.16)
          : (Math.random() - 0.5) * 0.22,
        rot: isRocket ? (Math.atan2(0.14, 0.40) * 0.85) : (Math.random() * Math.PI * 2),
        vrot: isRocket ? 0 : (cfg.kind === 'chevron' ? 0 : (Math.random() - 0.5) * 0.008),
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.015 + Math.random() * 0.018,
        alphaBase: isRocket ? (0.18 + Math.random() * 0.16) : (0.16 + Math.random() * 0.18),
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
        points: Math.random() < 0.55 ? 5 : 4
      };
    }

    function rebuildParticles() {
      items = [];
      for (let i = 0; i < cfg.count; i++) items.push(spawn(true));
    }

    function setTheme(themeKey) {
      const nextCfg = AMBIENT_THEMES[themeKey] || AMBIENT_THEMES.hub;
      if (nextCfg === cfg && items.length) {
        resize();
        return;
      }
      cfg = nextCfg;
      resize();
      rebuildParticles();
    }

    function drawItem(s, alpha) {
      const col = `${s.color}${alpha.toFixed(3)})`;
      const strokeCol = `${s.color}${Math.min(0.45, alpha * 1.45).toFixed(3)})`;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = col;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.3;
      const r = s.r;

      if (cfg.kind === 'rocket') {
        // Sleek translucent vector rocket smoothly ascending + gentle tail glow
        const tailGrad = ctx.createLinearGradient(0, r * 0.7, 0, r * 2.5);
        tailGrad.addColorStop(0, `${s.color}${(alpha * 0.95).toFixed(3)})`);
        tailGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(-r * 0.24, r * 0.75);
        ctx.lineTo(0, r * 2.45);
        ctx.lineTo(r * 0.24, r * 0.75);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = col;
        // Rocket body
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.15);
        ctx.quadraticCurveTo(r * 0.52, -r * 0.3, r * 0.36, r * 0.75);
        ctx.lineTo(-r * 0.36, r * 0.75);
        ctx.quadraticCurveTo(-r * 0.52, -r * 0.3, 0, -r * 1.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Side fins
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.25);
        ctx.lineTo(-r * 0.72, r * 0.85);
        ctx.lineTo(-r * 0.30, r * 0.72);
        ctx.moveTo(r * 0.35, r * 0.25);
        ctx.lineTo(r * 0.72, r * 0.85);
        ctx.lineTo(r * 0.30, r * 0.72);
        ctx.fill();

        // Porthole window
        ctx.beginPath();
        ctx.arc(0, -r * 0.15, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 1.3).toFixed(3)})`;
        ctx.fill();
      } else if (cfg.kind === 'gift') {
        // Translucent gift box with ribbon & bow
        const s2 = r * 0.82;
        ctx.beginPath();
        ctx.roundRect(-s2, -s2 * 0.75, s2 * 2, s2 * 1.65, 3);
        ctx.fill();
        ctx.stroke();
        // Vertical & horizontal ribbon
        ctx.beginPath();
        ctx.moveTo(0, -s2 * 0.75);
        ctx.lineTo(0, s2 * 0.9);
        ctx.moveTo(-s2, -s2 * 0.15);
        ctx.lineTo(s2, -s2 * 0.15);
        ctx.stroke();
        // Bow loops
        ctx.beginPath();
        ctx.ellipse(-s2 * 0.34, -s2 * 0.98, s2 * 0.34, s2 * 0.22, -0.35, 0, Math.PI * 2);
        ctx.ellipse(s2 * 0.34, -s2 * 0.98, s2 * 0.34, s2 * 0.22, 0.35, 0, Math.PI * 2);
        ctx.stroke();
      } else if (cfg.kind === 'crystal') {
        // Faceted hexagonal crystal
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.15);
        ctx.lineTo(r * 0.72, -r * 0.35);
        ctx.lineTo(r * 0.72, r * 0.35);
        ctx.lineTo(0, r * 1.15);
        ctx.lineTo(-r * 0.72, r * 0.35);
        ctx.lineTo(-r * 0.72, -r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.15);
        ctx.lineTo(0, r * 1.15);
        ctx.moveTo(-r * 0.72, -r * 0.35);
        ctx.lineTo(r * 0.72, r * 0.35);
        ctx.stroke();
      } else if (cfg.kind === 'gem') {
        // Diamond gem
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, -r * 0.75);
        ctx.lineTo(r * 0.55, -r * 0.75);
        ctx.lineTo(r * 0.95, -r * 0.15);
        ctx.lineTo(0, r * 1.05);
        ctx.lineTo(-r * 0.95, -r * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.95, -r * 0.15);
        ctx.lineTo(r * 0.95, -r * 0.15);
        ctx.stroke();
      } else if (cfg.kind === 'ball') {
        // Soft glowing Plinko ball
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(alpha * 1.2).toFixed(3)})`;
        ctx.fill();
      } else if (cfg.kind === 'chevron') {
        // Double upward upgrade chevron
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-r * 0.72, r * 0.18);
        ctx.lineTo(0, -r * 0.55);
        ctx.lineTo(r * 0.72, r * 0.18);
        ctx.moveTo(-r * 0.52, r * 0.72);
        ctx.lineTo(0, r * 0.14);
        ctx.lineTo(r * 0.52, r * 0.72);
        ctx.stroke();
      } else if (cfg.kind === 'shield') {
        // PvP Shield
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.78, -r * 0.55);
        ctx.lineTo(r * 0.65, r * 0.28);
        ctx.quadraticCurveTo(0, r * 1.08, 0, r * 1.08);
        ctx.quadraticCurveTo(0, r * 1.08, -r * 0.65, r * 0.28);
        ctx.lineTo(-r * 0.78, -r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (cfg.kind === 'chip') {
        // Casino Red/Black chip
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
        ctx.stroke();
      } else if (cfg.kind === 'crown') {
        // Leaderboard Crown
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, r * 0.55);
        ctx.lineTo(-r * 0.95, -r * 0.35);
        ctx.lineTo(-r * 0.38, r * 0.08);
        ctx.lineTo(0, -r * 0.75);
        ctx.lineTo(r * 0.38, r * 0.08);
        ctx.lineTo(r * 0.95, -r * 0.35);
        ctx.lineTo(r * 0.85, r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Star (and optional subtle halo ring for 'ringstar')
        if (cfg.kind === 'ringstar') {
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        const pts = s.points || 5;
        const total = pts * 2;
        const inner = pts === 5 ? r * 0.44 : r * 0.32;
        for (let i = 0; i < total; i++) {
          const a = (i * Math.PI) / pts - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    resize();
    rebuildParticles();

    let frameTick = 0;
    let lastDrawTs = 0;
    let scrollPauseUntil = 0;
    const onScrollPause = () => { scrollPauseUntil = performance.now() + 260; };
    window.addEventListener('scroll', onScrollPause, { passive: true, capture: true });
    document.addEventListener('touchmove', onScrollPause, { passive: true });

    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      // Pause ambient background redraws during active touch scrolling for 60FPS scroll smoothness!
      if (now < scrollPauseUntil) return;
      // Smooth dynamic background across ALL games at ~20 FPS (50ms) for zero frame drops!
      if (now - lastDrawTs < 50) return;
      const stepScale = Math.min(2.6, Math.max(1.0, (now - lastDrawTs) / 16.67));
      lastDrawTs = now;

      frameTick++;
      if (frameTick % 60 === 0) {
        const nw = window.innerWidth || 380;
        const nh = window.innerHeight || 720;
        if (Math.abs(nw - w) > 8 || Math.abs(nh - h) > 20) resize();
      }
      ctx.clearRect(0, 0, w, h);

      // Soft slowly drifting glow orbs
      for (const o of (cfg.orbs || [])) {
        const ox = w * o.rx + Math.sin(now * o.spx + o.ph) * 42;
        const oy = h * o.ry + Math.cos(now * o.spy + o.ph) * 36;
        const grad = ctx.createRadialGradient(ox, oy, 8, ox, oy, o.r);
        grad.addColorStop(0, o.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const isDown = cfg.dir === 'down';
      for (const s of items) {
        s.x += s.vx * stepScale;
        s.y += s.vy * stepScale;
        s.rot += s.vrot * stepScale;
        s.phase += s.twinkle * stepScale;
        if (!isDown && s.y < -36) Object.assign(s, spawn(false));
        if (isDown && s.y > h + 36) Object.assign(s, spawn(false));
        if (s.x < -44) s.x = w + 32;
        if (s.x > w + 44) s.x = -32;
        const a = s.alphaBase * (0.62 + 0.38 * Math.sin(s.phase));
        drawItem(s, a);
      }
    }
    ambientControllers[canvasId] = { resize, setTheme };
    requestAnimationFrame(tick);
  }

  // Avatar Frame Helpers (works EVERYWHERE: DOM + PvP Canvas!)
  function getFrameDef(frameId) {
    if (!frameId) return null;
    const list = state.levelConfig?.frames || [];
    return list.find((f) => f.id === frameId) || null;
  }

  function getFrameUrl(frameId) {
    const def = getFrameDef(frameId);
    if (def) return def.image;
    if (/^frame_lv\d+$/.test(String(frameId || ''))) return `${frameId}.png?v=ua16`;
    return '';
  }

  function preloadFrameImage(frameId, onLoad) {
    const url = getFrameUrl(frameId);
    if (!url) return null;
    if (state.frameImages[frameId]) return state.frameImages[frameId];
    const img = new Image();
    img.onload = () => { if (onLoad) onLoad(); };
    img.src = url;
    state.frameImages[frameId] = img;
    return img;
  }

  function renderAvatarHtml(photoUrl, firstName, frameId = '', opts = {}) {
    const size = opts.size || 32;
    const extraCls = opts.className || '';
    const pvpColor = opts.pvpColor || '';
    const fontSize = Math.max(10, Math.round(size * 0.42));
    const frameUrl = getFrameUrl(frameId);
    const inner = photoUrl
      ? `<img class="ava-inner-img" src="${esc(photoUrl)}" alt="" loading="lazy" />`
      : `<span class="ava-inner-fb" style="font-size:${fontSize}px">${esc((firstName || 'P')[0].toUpperCase())}</span>`;
    const frameTag = frameUrl ? `<img class="avatar-frame-overlay" src="${esc(frameUrl)}" alt="" />` : '';
    const pvpRing = pvpColor ? `<span class="ava-pvp-ring" style="--pvp-col:${esc(pvpColor)}"></span>` : '';
    return `<span class="ava-box ${extraCls}" style="width:${size}px;height:${size}px">${inner}${frameTag}${pvpRing}</span>`;
  }

  const state = {
    user: null,
    levelConfig: { tiers: [], frames: [] },
    frameImages: {},
    socket: null,
    cases: [],
    caseFilter: 'all',
    activeCase: null,
    promoLimitType: 'uses',
    adminPromos: { active: [], history: [] },
    adminPromoEditTarget: null,
    activeGame: null,
    wheelSegments: [],
    wheelTiers: [],
    wheelTier: 'low',
    plinkoMultipliers: [5.0, 2.0, 1.1, 0.5, 0.3, 0.5, 1.1, 2.0, 5.0],
    catalog: [],
    basicGifts: [],
    craftedCatalog: [],
    invFilter: 'all',
    currentGift: null,
    upgradeTargetGift: null,
    upgrading: false,
    upgradeSkipFn: null,
    upgradeDoneGift: null,

    // Crash (Rocket + Explosion + NFT bets + live evolution!)
    crash: {
      phase: 'waiting',
      multiplier: 1.0,
      startedAt: 0,
      waitEndsAt: 0,
      bets: [],
      history: []
    },
    crashNftTiers: [],
    crashBetMode: 'stars', // 'stars' | 'gift'
    crashSelectedGiftUid: null,
    rocketLottie: null,
    explosionLottie: null,
    giftLottie: null,

    // Wheel
    wheelCost: 10,
    wheelSpinning: false,
    wheelAngle: 0,
    wheelImages: {},

    // Telegram Star Lottie (star.json + cached frame-0 PNG so stars are NEVER black!)
    starAnimData: null,
    starFrame0Url: '',
    starLottieInstances: [],

    // Mines
    mines: { active: false, bet: 25, minesCount: 3, revealed: [], multiplier: 1.0 },

    // Plinko & Safe
    plinkoDropping: false,
    plinkoRecentBets: [],
    safeRecentBets: [],
    lastCrashRewardRoundId: 0,

    // PvP (Stars + NFT Gifts!)
    pvp: { phase: 'waiting', endsAt: 0, players: [], totalPot: 0, angle: 0, spinning: false },
    pvpSelectedGiftUids: [],
    pvpImages: {},
    stakePickerMode: 'crash', // 'crash' | 'pvp'

    // Live Feeds (contextual per game)
    liveFeeds: { cases: [], craft: [], crash: [], wheel: [], upgrader: [], slots: [], auction: [], safe: [], singularity: [] },

    // Provably Fair
    pfCrash: { roundId: 1, serverSeedHash: '', history: [] },
    pfActiveTab: 'user',

    // Market Pricing (MRKT TON + 0.3 TON fee)
    marketPricing: { starsPerTon: 180, commissionTon: 0.3, tonUsd: 2.70 },

    // Upgrader (stars OR 1+ gifts OR combo!)
    upg: {
      mode: 'gifts',
      multiplier: 2,
      chance: 50,
      spinning: false,
      pointerAngle: 0,
      extraStars: 0,
      sourceGifts: [],
      targetItem: null,
      fastMode: false,
      presetTargets: {}
    },
    upgPickerMode: 'source',
    upgXFilter: 'all',
    upgPickerLimit: 24,
    crashSelectedGiftUids: [],

    // Red/Black
    rb: { phase: 'betting', endsAt: 0, bets: [], history: [], spinning: false },

    // Craft
    craftSlots: [null, null, null, null],
    craftPickerSlot: 0,
    crafting: false,
    craftResultShown: false,
    craftModelsCache: {},
    activeCraftCollection: null,

    // Confirm modal
    confirmCallback: null,

    // Cases (Multi-spin x1/x2/x3/x5 + Turbo + Skip)
    caseOpening: false,
    caseCount: 1,
    caseTurbo: false,
    caseSkipFn: null,

    // Admin
    adminSelectedUser: null,
    adminBroadcastImageDataUrl: ''
  };

  // ======================== REALISTIC NATURAL WEB AUDIO ENGINE ========================
  // Grounded physical audio: continuous soft rocket jet whoosh + muffled deep boom, tactile wood/glass/felt game sounds (zero synthetic AI beeps!)
  const SoundFX = (() => {
    let ctx = null;
    let pinkNoiseBuf = null;
    let whiteNoiseBuf = null;
    let muted = false;
    let lastClickAt = 0;
    let rocketEng = null;
    try { muted = localStorage.getItem('zg_sound_muted') === '1'; } catch {}

    function getCtx() {
      if (muted) return null;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function unlock() {
      if (muted) return;
      const c = getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    }

    // Soft pink/brown-tinted noise (sounds like real air/thrust/thud, never harsh digital static!)
    function getPinkNoiseBuf(c) {
      if (pinkNoiseBuf && pinkNoiseBuf.sampleRate === c.sampleRate) return pinkNoiseBuf;
      const len = Math.floor(c.sampleRate * 2.5);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const out = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.085;
        b6 = w * 0.115926;
      }
      pinkNoiseBuf = buf;
      return buf;
    }

    function getWhiteNoiseBuf(c) {
      if (whiteNoiseBuf && whiteNoiseBuf.sampleRate === c.sampleRate) return whiteNoiseBuf;
      const len = Math.floor(c.sampleRate * 1.2);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      whiteNoiseBuf = buf;
      return buf;
    }

    function playNoise({ dur = 0.08, delay = 0, vol = 0.12, filterType = 'bandpass', freqStart = 1200, freqEnd = null, q = 1.2, attack = 0.003, pink = true }) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime + delay;
      const src = c.createBufferSource();
      src.buffer = pink ? getPinkNoiseBuf(c) : getWhiteNoiseBuf(c);
      const filt = c.createBiquadFilter();
      filt.type = filterType;
      filt.Q.setValueAtTime(q, now);
      filt.frequency.setValueAtTime(Math.max(40, freqStart), now);
      if (freqEnd) filt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + dur);

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      src.connect(filt);
      filt.connect(gain);
      gain.connect(c.destination);
      src.start(now, Math.random() * 0.5);
      src.stop(now + dur + 0.03);
    }

    function tone(freq, dur, type = 'sine', vol = 0.06, delay = 0, endFreq = null, attack = 0.005, lpHz = 2400) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime + delay;
      const osc = c.createOscillator();
      const lp = c.createBiquadFilter();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), now + dur);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(lpHz, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }

    function stopRocketEngine(fadeSec = 0.14) {
      if (!rocketEng) return;
      const eng = rocketEng;
      rocketEng = null;
      try {
        const c = eng.ctx;
        const now = c.currentTime;
        eng.master.gain.cancelScheduledValues(now);
        eng.master.gain.setValueAtTime(Math.max(0.0001, eng.master.gain.value), now);
        eng.master.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
        setTimeout(() => {
          try { eng.noiseSrc.stop(); } catch {}
          try { eng.subOsc.stop(); } catch {}
        }, Math.ceil((fadeSec + 0.06) * 1000));
      } catch {}
    }

    function startRocketEngine() {
      if (muted || rocketEng) return;
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const noiseSrc = c.createBufferSource();
      noiseSrc.buffer = getPinkNoiseBuf(c);
      noiseSrc.loop = true;

      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(290, now);
      bp.Q.setValueAtTime(0.75, now);

      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(720, now);

      const subOsc = c.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(56, now);
      const subGain = c.createGain();
      subGain.gain.setValueAtTime(0.038, now);

      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.11, now + 0.28);

      noiseSrc.connect(bp);
      bp.connect(lp);
      lp.connect(master);
      subOsc.connect(subGain);
      subGain.connect(master);
      master.connect(c.destination);

      noiseSrc.start(now);
      subOsc.start(now);
      rocketEng = { ctx: c, noiseSrc, subOsc, bp, lp, master };
    }

    function updateRocketEngine(mult) {
      if (!rocketEng || muted) return;
      const c = rocketEng.ctx;
      const now = c.currentTime;
      const m = Math.max(1, Math.min(25, Number(mult) || 1));
      const norm = Math.log(m) / Math.log(25);
      rocketEng.bp.frequency.setTargetAtTime(280 + norm * 460, now, 0.12);
      rocketEng.lp.frequency.setTargetAtTime(680 + norm * 880, now, 0.12);
      rocketEng.subOsc.frequency.setTargetAtTime(54 + norm * 34, now, 0.12);
      rocketEng.master.gain.setTargetAtTime(0.105 + norm * 0.045, now, 0.15);
    }

    function playWinChime(big = false) {
      // Warm acoustic marimba / kalimba triad (natural decay, zero harsh synth)
      playNoise({ dur: 0.022, delay: 0, vol: big ? 0.07 : 0.05, filterType: 'bandpass', freqStart: 950, freqEnd: 420, q: 1.4, attack: 0.002 });
      const notes = big ? [392.0, 493.88, 587.33, 783.99] : [440.0, 554.37, 659.25];
      notes.forEach((f, idx) => tone(f, big ? 0.32 : 0.22, 'sine', big ? 0.068 : 0.052, idx * 0.065, f * 0.996, 0.008, 1800));
    }

    document.addEventListener('pointerdown', (e) => {
      unlock();
      const t = e.target?.closest?.('button, .hub-card, .nav-item, .chip, .mult-pill, .slots-mode-btn, .upg-mfilter, .mine-cell, .zg-cselect-btn, .zg-cselect-opt');
      if (t && !t.disabled && !t.closest('#sound-toggle-btn')) {
        const nowMs = performance.now();
        if (nowMs - lastClickAt > 48) {
          lastClickAt = nowMs;
          playNoise({ dur: 0.013, vol: 0.055, filterType: 'bandpass', freqStart: 1200, freqEnd: 520, q: 1.5, attack: 0.001 });
          tone(280, 0.018, 'sine', 0.026, 0, 150, 0.001, 900);
        }
      }
    }, { passive: true, capture: true });

    return {
      isMuted: () => muted,
      unlock,
      startRocketEngine,
      updateRocketEngine,
      stopRocketEngine,
      toggle() {
        muted = !muted;
        try { localStorage.setItem('zg_sound_muted', muted ? '1' : '0'); } catch {}
        if (muted) stopRocketEngine(0.06);
        else { unlock(); this.click(); }
        return muted;
      },
      // Soft matte UI tap
      click() {
        const nowMs = performance.now();
        if (nowMs - lastClickAt < 35) return;
        lastClickAt = nowMs;
        playNoise({ dur: 0.014, vol: 0.06, filterType: 'bandpass', freqStart: 1250, freqEnd: 540, q: 1.5, attack: 0.001 });
        tone(290, 0.018, 'sine', 0.028, 0, 155, 0.001, 950);
      },
      // Tactile wooden peg tick (Wheel / Cases / Upgrader)
      tick() {
        playNoise({ dur: 0.014, vol: 0.095, filterType: 'bandpass', freqStart: 1550, freqEnd: 650, q: 1.9, attack: 0.001 });
        tone(420, 0.016, 'triangle', 0.04, 0, 190, 0.001, 1300);
      },
      // Soft mechanical reel stop thump (Slots / Safe)
      reelStop() {
        tone(140, 0.055, 'sine', 0.085, 0, 62, 0.002, 500);
        playNoise({ dur: 0.024, vol: 0.08, filterType: 'lowpass', freqStart: 780, freqEnd: 260, q: 1.0, attack: 0.001 });
      },
      coin() { playWinChime(false); },
      bigWin() { playWinChime(true); },
      // Muted warm loss thud (never irritating)
      lose() {
        tone(195, 0.14, 'sine', 0.065, 0, 135, 0.006, 700);
        tone(135, 0.24, 'sine', 0.07, 0.1, 78, 0.008, 520);
        playNoise({ dur: 0.18, delay: 0.01, vol: 0.065, filterType: 'lowpass', freqStart: 320, freqEnd: 95, q: 0.8, attack: 0.005 });
      },
      // Crisp pleasant cashout lock
      cashout() {
        playNoise({ dur: 0.018, vol: 0.055, filterType: 'bandpass', freqStart: 1400, freqEnd: 600, q: 1.4, attack: 0.001 });
        tone(523.25, 0.09, 'sine', 0.055, 0, 659.25, 0.004, 1800);
        tone(783.99, 0.16, 'sine', 0.055, 0.06, 783.99, 0.005, 1900);
      },
      // Soft crystal tap (Mines gem / Plinko peg)
      glass() {
        tone(880, 0.075, 'sine', 0.042, 0, 1020, 0.002, 2200);
        playNoise({ dur: 0.014, vol: 0.032, filterType: 'bandpass', freqStart: 2600, freqEnd: 1400, q: 1.5, attack: 0.001 });
      },
      // Rocket ignition whoosh + start continuous soft jet thrust
      rocket() {
        playNoise({ dur: 0.45, delay: 0, vol: 0.11, filterType: 'lowpass', freqStart: 220, freqEnd: 620, q: 0.9, attack: 0.06 });
        tone(68, 0.36, 'sine', 0.055, 0, 110, 0.04, 300);
        startRocketEngine();
      },
      // Deep muffled distant crash boom (low-pass filtered punch, zero harshness!)
      boom() {
        stopRocketEngine(0.05);
        tone(110, 0.42, 'sine', 0.16, 0, 26, 0.004, 240);
        tone(66, 0.48, 'triangle', 0.09, 0.015, 22, 0.006, 180);
        playNoise({ dur: 0.56, delay: 0.004, vol: 0.22, filterType: 'lowpass', freqStart: 420, freqEnd: 68, q: 0.7, attack: 0.005 });
      }
    };
  })();

  // ======================== CUSTOM STYLED DROPDOWN ENGINE (REPLACES ALL NATIVE <select>) ========================
  const customSelectRegistry = new WeakMap();
  let activeSelectPortal = null;

  function closeActiveSelectPortal() {
    if (!activeSelectPortal) return;
    try { activeSelectPortal.portal.remove(); } catch {}
    activeSelectPortal.wrap?.classList.remove('is-open');
    activeSelectPortal = null;
  }

  function syncCustomSelect(selectEl) {
    if (!selectEl) return;
    const rec = customSelectRegistry.get(selectEl);
    if (!rec) return;
    const selOpt = selectEl.options[selectEl.selectedIndex];
    rec.labelEl.textContent = selOpt ? selOpt.textContent : 'Выбрать...';
    rec.btn.disabled = Boolean(selectEl.disabled);
  }

  function enhanceSelect(selectEl) {
    if (!selectEl || customSelectRegistry.has(selectEl)) return;
    selectEl.classList.add('zg-native-hidden');
    const wrap = document.createElement('div');
    wrap.className = 'zg-cselect';
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zg-cselect-btn';
    const labelEl = document.createElement('span');
    labelEl.className = 'zg-cselect-label';
    const chev = document.createElement('span');
    chev.className = 'zg-cselect-chev';
    chev.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    btn.appendChild(labelEl);
    btn.appendChild(chev);
    wrap.appendChild(btn);

    customSelectRegistry.set(selectEl, { wrap, btn, labelEl });
    syncCustomSelect(selectEl);

    selectEl.addEventListener('change', () => syncCustomSelect(selectEl));
    const mo = new MutationObserver(() => syncCustomSelect(selectEl));
    mo.observe(selectEl, { childList: true, subtree: true, attributes: true });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeSelectPortal && activeSelectPortal.selectEl === selectEl) {
        closeActiveSelectPortal();
        return;
      }
      closeActiveSelectPortal();
      const opts = Array.from(selectEl.options);
      if (!opts.length) return;

      const portal = document.createElement('div');
      portal.className = 'zg-cselect-portal';
      const rect = btn.getBoundingClientRect();
      const width = Math.max(150, Math.min(window.innerWidth - 20, rect.width));
      let left = Math.min(Math.max(10, rect.left), window.innerWidth - width - 10);
      portal.style.width = `${width}px`;
      portal.style.left = `${left}px`;

      let searchInp = null;
      if (opts.length > 9) {
        searchInp = document.createElement('input');
        searchInp.type = 'text';
        searchInp.className = 'zg-cselect-search';
        searchInp.placeholder = 'Поиск...';
        portal.appendChild(searchInp);
      }

      const list = document.createElement('div');
      list.className = 'zg-cselect-list';
      portal.appendChild(list);

      const renderOpts = (q = '') => {
        const needle = q.trim().toLowerCase();
        list.innerHTML = '';
        let shown = 0;
        for (const opt of opts) {
          if (needle && !opt.textContent.toLowerCase().includes(needle)) continue;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `zg-cselect-opt${opt.value === selectEl.value ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`;
          b.innerHTML = `<span>${esc(opt.textContent)}</span>${opt.value === selectEl.value ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}`;
          b.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (opt.disabled) return;
            selectEl.value = opt.value;
            syncCustomSelect(selectEl);
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            closeActiveSelectPortal();
          });
          list.appendChild(b);
          shown++;
        }
        if (!shown) {
          list.innerHTML = '<div class="empty-inline" style="padding:12px 6px;font-size:12px">Ничего не найдено</div>';
        }
      };
      renderOpts('');
      if (searchInp) {
        searchInp.addEventListener('input', () => renderOpts(searchInp.value));
        searchInp.addEventListener('click', (ev) => ev.stopPropagation());
      }

      document.body.appendChild(portal);
      const pRect = portal.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      if (spaceBelow < pRect.height && spaceAbove > spaceBelow) {
        portal.style.top = `${Math.max(10, rect.top - pRect.height - 6)}px`;
      } else {
        portal.style.top = `${Math.min(window.innerHeight - pRect.height - 10, rect.bottom + 6)}px`;
      }

      wrap.classList.add('is-open');
      activeSelectPortal = { selectEl, wrap, portal };
      if (searchInp) setTimeout(() => searchInp.focus(), 20);
    });
  }

  function initCustomSelects(root = document) {
    root.querySelectorAll('select').forEach((sel) => enhanceSelect(sel));
  }

  document.addEventListener('click', (e) => {
    if (activeSelectPortal && !activeSelectPortal.portal.contains(e.target) && !activeSelectPortal.wrap.contains(e.target)) {
      closeActiveSelectPortal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeActiveSelectPortal();
  });
  window.addEventListener('resize', () => closeActiveSelectPortal());

  function sortGiftList(items, sortMode = 'newest') {
    const arr = items.slice();
    if (sortMode === 'price_desc') {
      arr.sort((a, b) => (Number(b.value || b.price || 0) - Number(a.value || a.price || 0)));
    } else if (sortMode === 'price_asc') {
      arr.sort((a, b) => (Number(a.value || a.price || 0) - Number(b.value || b.price || 0)));
    } else if (sortMode === 'alpha') {
      arr.sort((a, b) => String(giftDisplayName(a) || a.name || '').localeCompare(String(giftDisplayName(b) || b.name || ''), 'ru'));
    }
    return arr;
  }

  function filterInventoryByType(items, typeFilter = 'all') {
    if (typeFilter === 'upgraded') return items.filter((g) => Boolean(g.upgraded || g.crafted));
    if (typeFilter === 'regular') return items.filter((g) => !g.upgraded && !g.crafted);
    if (typeFilter === 'crafted') return items.filter((g) => Boolean(g.crafted));
    return items;
  }

  const CRAFT_CHANCES = { 0: 0, 1: 6, 2: 19, 3: 44, 4: 74 };

  // Telegram Star icon: uses REAL frame 0 from star.json (zero duplicate SVG gradient IDs -> NEVER black!)
  function starFallbackSvg(size = 15) {
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none"><path d="M32 5.2c1.9 0 3.6 1.1 4.4 2.8l6.2 12.6c.4.8 1.2 1.4 2.1 1.5l13.9 2c3.9.6 5.5 5.4 2.6 8.2l-10 9.8c-.7.6-1 1.6-.8 2.5l2.4 13.8c.7 3.9-3.4 6.9-7 5l-12.4-6.5c-.8-.4-1.8-.4-2.6 0l-12.4 6.5c-3.5 1.9-7.7-1.1-7-5l2.4-13.8c.2-.9-.1-1.9-.8-2.5l-10-9.8c-2.8-2.8-1.3-7.6 2.6-8.2l13.9-2c.9-.1 1.7-.7 2.1-1.5l6.2-12.6C28.4 6.3 30.1 5.2 32 5.2z" fill="#FFBE2E" stroke="#FFE885" stroke-width="2.2"/><path d="M29.8 16.5L26 24.4c-.5 1-1.5 1.7-2.6 1.9l-7.5 1.1c3.8 1.6 10.6 3.5 15.8 1.5 5.1-2 7.5-7.4 8.5-10.9l-2.3-4.6c-1.4-2.5-6.7-1.8-8.1 3.1z" fill="#FFF8C9" opacity="0.5"/></svg>`;
  }

  function starIconHtml(size = 15, extraClass = '') {
    const inner = state.starFrame0Url
      ? `<img class="tg-star-img" src="${state.starFrame0Url}" width="${size}" height="${size}" alt="" />`
      : starFallbackSvg(size);
    return `<span class="tg-star-ico ${extraClass}" data-star-size="${size}" style="width:${size}px;height:${size}px" aria-hidden="true">${inner}</span>`;
  }

  function captureStarFirstFrame() {
    if (!state.starAnimData || !window.lottie || state.starFrame0Url) return;
    try {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:128px;height:128px;pointer-events:none;opacity:0;';
      document.body.appendChild(host);
      const anim = lottie.loadAnimation({
        container: host,
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        animationData: JSON.parse(JSON.stringify(state.starAnimData)),
        rendererSettings: { clearCanvas: true, dpr: 2 }
      });
      anim.goToAndStop(0, true);
      const cv = host.querySelector('canvas');
      if (cv && cv.width > 0 && cv.height > 0) {
        // Auto-trim transparent padding around the star inside 512x512 Lottie frame so icon size is crisp & exact!
        const ctx2d = cv.getContext('2d');
        const imgData = ctx2d.getImageData(0, 0, cv.width, cv.height);
        const px = imgData.data;
        let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
        for (let y = 0; y < cv.height; y++) {
          for (let x = 0; x < cv.width; x++) {
            if (px[(y * cv.width + x) * 4 + 3] > 12) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX > minX && maxY > minY) {
          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          const side = Math.max(bw, bh);
          const pad = Math.round(side * 0.06);
          const out = document.createElement('canvas');
          out.width = 96;
          out.height = 96;
          const octx = out.getContext('2d');
          const scale = (out.width - pad * 2) / side;
          const dw = bw * scale;
          const dh = bh * scale;
          const dx = (out.width - dw) / 2;
          const dy = (out.height - dh) / 2;
          octx.drawImage(cv, minX, minY, bw, bh, dx, dy, dw, dh);
          state.starFrame0Url = out.toDataURL('image/png');
        } else {
          state.starFrame0Url = cv.toDataURL('image/png');
        }
      }
      anim.destroy();
      host.remove();
    } catch {
      // Fallback solid golden SVG remains active (never black)
    }

    // Populate or upgrade every .tg-star-ico across the DOM with exact size
    document.querySelectorAll('.tg-star-ico').forEach((el) => {
      const sz = Number(el.dataset.starSize) || 15;
      el.style.width = `${sz}px`;
      el.style.height = `${sz}px`;
      el.innerHTML = state.starFrame0Url
        ? `<img class="tg-star-img" src="${state.starFrame0Url}" width="${sz}" height="${sz}" alt="" />`
        : starFallbackSvg(sz);
    });
  }

  function mountStarLottie(el) {
    if (!el || !window.lottie || !state.starAnimData || el.dataset.starMounted) return;
    el.dataset.starMounted = '1';
    const sz = Number(el.dataset.starSize) || 18;
    el.style.width = `${sz}px`;
    el.style.height = `${sz}px`;
    el.innerHTML = '';
    try {
      const anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(state.starAnimData))
      });
      state.starLottieInstances.push(anim);
    } catch {
      el.innerHTML = starIconHtml(sz);
    }
  }

  async function initStarLottie(retryCount = 0) {
    if (!state.starAnimData) {
      try {
        const r = await fetch('star.json');
        if (r.ok) state.starAnimData = await r.json();
      } catch {}
    }
    if (!window.lottie && retryCount < 15) {
      document.querySelectorAll('[data-star-lottie]').forEach((el) => {
        if (!el.innerHTML) el.innerHTML = starIconHtml(Number(el.dataset.starSize) || 18);
      });
      setTimeout(() => initStarLottie(retryCount + 1), 350);
      return;
    }
    captureStarFirstFrame();
    document.querySelectorAll('[data-star-lottie]').forEach((el) => {
      if (state.starAnimData && window.lottie) mountStarLottie(el);
      else el.innerHTML = starIconHtml(Number(el.dataset.starSize) || 18);
    });
  }

  function drawTelegramStarOnCanvas(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    const spikes = 5;
    const outerR = radius;
    const innerR = radius * 0.48;
    const grad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
    grad.addColorStop(0, '#fff3a1');
    grad.addColorStop(0.5, '#ffbe2e');
    grad.addColorStop(1, '#e57a00');

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#ffe994';
    ctx.stroke();
    ctx.restore();
  }

  // ======================== HELPERS ========================
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function haptic(type = 'light') {
    try {
      if (!tg?.HapticFeedback) return;
      if (['success', 'warning', 'error'].includes(type)) {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch {}
  }

  function showToast(message, type = 'info') {
    const box = $('toast-container');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? tgIcon('check', 15) : type === 'error' ? tgIcon('x', 15) : type === 'gold' ? starIconHtml(16) : tgIcon('info', 15);
    el.innerHTML = `<span>${icon}</span><span>${esc(message).replace(/⭐/g, starIconHtml(14))}</span>`;
    box.appendChild(el);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      el.style.transition = 'all 0.16s ease';
      setTimeout(() => el.remove(), 170);
    };
    el.addEventListener('click', dismiss);
    const timer = setTimeout(dismiss, 3200);
  }

  async function api(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const finalUrl = method === 'GET'
      ? `${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : url;

    const currentInitData = window.Telegram?.WebApp?.initData || initData || '';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), opts.timeout || 15000) : null;

    try {
      const res = await fetch(finalUrl, {
        method,
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Telegram-Init-Data': currentInitData
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
      return data;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function isAnyGameAnimating() {
    return Boolean(
      state.wheelSpinning ||
      state.caseOpening ||
      state.plinkoDropping ||
      state.upg?.spinning ||
      state.upgrading ||
      state.crafting ||
      state.slotsSpinning ||
      state.safeCracking ||
      state.pvp?.spinning
    );
  }

  // Publish deferred server reward & live-feed strictly when client animation ends!
  async function flushFeedToken(token) {
    if (!token) return null;
    try {
      return await api('/api/feed/flush', { method: 'POST', body: { token } });
    } catch {
      return null;
    }
  }

  async function flushAndApplyUser(token, fallbackUser = null) {
    const flushed = await flushFeedToken(token);
    if (flushed?.user) {
      applyServerUser(flushed.user, { force: true });
      return flushed.user;
    }
    if (fallbackUser) {
      applyServerUser(fallbackUser, { force: true });
      return fallbackUser;
    }
    return null;
  }

  // Monotonic user-state applier: NEVER lets a stale cached/delayed /api/me or socket packet overwrite newer gifts/balance!
  function applyServerUser(u, { force = false, render = true } = {}) {
    if (!u || typeof u !== 'object') return false;
    const cur = state.user;
    if (!force && cur && String(cur.telegramId) === String(u.telegramId)) {
      const sameBoot = cur.serverBootId && u.serverBootId && cur.serverBootId === u.serverBootId;
      const curRev = Number(cur.rev || 0);
      const nextRev = Number(u.rev || 0);
      if (sameBoot && curRev > 0 && nextRev > 0 && nextRev < curRev) {
        return false;
      }
    }
    state.user = u;
    if (render) renderUser();
    if (Array.isArray(u.pendingAuctionPayouts) && u.pendingAuctionPayouts.length) {
      maybeShowNextAuctionSellerPayout(u.pendingAuctionPayouts[0]);
    }
    return true;
  }

  function showAuthDenied(msg = 'Ошибка авторизации') {
    hidePreloader();
    $('app').classList.add('hidden');
    $('auth-gate').classList.remove('hidden');
    $('auth-gate-text').textContent = msg;
  }

  function getTopOpenModalId() {
    const modals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
    return modals.length ? modals[modals.length - 1].id : null;
  }

  function syncTelegramBackButton() {
    if (!tg?.BackButton) return;
    const hasModal = Boolean(getTopOpenModalId());
    const hasGame = Boolean(state.activeGame);
    const hasP2pLot = state.tab === 'p2p-auction' && Boolean(state.p2pAuctionActiveLotId);
    if (hasModal || hasGame || hasP2pLot) {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
  }

  function handleTelegramBack() {
    const openModalId = getTopOpenModalId();
    if (openModalId) {
      if (openModalId === 'modal-upgrade' && state.upgrading) return;
      haptic('light');
      closeModal(openModalId);
      return;
    }
    if (state.tab === 'p2p-auction' && state.p2pAuctionActiveLotId) {
      haptic('light');
      closeP2pAuctionLotDetail();
      return;
    }
    if (state.activeGame === 'cases' && state.activeCase) {
      if (state.caseOpening) return;
      haptic('light');
      closeCaseDetail();
      return;
    }
    if (state.activeGame) {
      if (state.caseOpening || state.wheelSpinning || state.plinkoDropping || state.upg?.spinning || state.crafting) return;
      haptic('light');
      backToGamesHub();
      return;
    }
    syncTelegramBackButton();
  }

  function openModal(id) {
    $(id)?.classList.remove('hidden');
    syncTelegramBackButton();
  }

  // ======================== UNIVERSAL NFT TGS/LOTTIE PLAYER ========================
  const activeGiftLotties = new Map();

  function getGiftLottieUrl(g) {
    if (!g) return '';
    if (g.lottie && typeof g.lottie === 'string') return g.lottie;
    const img = String(g.image || '');
    if (img.includes('cdn.changes.tg/gifts/models/') && img.includes('/png/') && img.endsWith('.png')) {
      return img.replace('/png/', '/lottie/').replace(/\.png$/i, '.json');
    }
    if (img.includes('cdn.changes.tg/gifts/originals/') && img.endsWith('.png')) {
      return img.replace(/\.png$/i, '.json');
    }
    if (g.upgraded && g.collectionName && g.model?.name) {
      return `https://cdn.changes.tg/gifts/models/${encodeURIComponent(g.collectionName)}/lottie/${encodeURIComponent(g.model.name)}.json`;
    }
    return '';
  }

  function destroyGiftLottie(key) {
    const inst = activeGiftLotties.get(key);
    if (inst) {
      try { inst.destroy(); } catch {}
      activeGiftLotties.delete(key);
    }
  }

  function mountGiftLottie(key, containerEl, imgEl, gift, retryCount = 0) {
    destroyGiftLottie(key);
    if (!containerEl) return;
    containerEl.innerHTML = '';
    containerEl.classList.add('hidden');
    if (imgEl) imgEl.classList.remove('hidden');

    const url = getGiftLottieUrl(gift);
    if (!url) return;
    if (!window.lottie) {
      if (retryCount < 12) {
        setTimeout(() => mountGiftLottie(key, containerEl, imgEl, gift, retryCount + 1), 350);
      }
      return;
    }

    try {
      const anim = lottie.loadAnimation({
        container: containerEl,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: url
      });
      activeGiftLotties.set(key, anim);
      anim.addEventListener('DOMLoaded', () => {
        if (activeGiftLotties.get(key) !== anim) return;
        containerEl.classList.remove('hidden');
        if (imgEl) imgEl.classList.add('hidden');
      });
      anim.addEventListener('data_failed', () => {
        destroyGiftLottie(key);
        containerEl.classList.add('hidden');
        if (imgEl) imgEl.classList.remove('hidden');
      });
    } catch {
      containerEl.classList.add('hidden');
      if (imgEl) imgEl.classList.remove('hidden');
    }
  }

  function closeModal(id) {
    $(id)?.classList.add('hidden');
    if (id === 'modal-gift') {
      destroyGiftLottie('modal-gift');
      if (state.giftLottie) {
        state.giftLottie.destroy();
        state.giftLottie = null;
      }
      $('tg-gift-lottie')?.classList.add('hidden');
      $('tg-gift-img')?.classList.remove('hidden');
    }
    if (id === 'modal-upgrade') {
      destroyGiftLottie('modal-upgrade');
      $('upg-pinned-winner-lottie')?.classList.add('hidden');
      $('upg-pinned-winner-img')?.classList.remove('hidden');
    }
    syncTelegramBackButton();
  }

  function formatStars(n) {
    return Number(n || 0).toLocaleString('ru-RU');
  }

  // Instant balance deduction helper (called immediately on bet/start, before animations!)
  function updateDisplayedBalance(newBalance) {
    if (state.user && Number.isFinite(Number(newBalance))) {
      state.user.balance = Math.max(0, Math.floor(Number(newBalance)));
    }
    const val = formatStars(state.user?.balance || 0);
    $('header-balance').textContent = val;
    $('profile-balance').textContent = val;
  }

  function giftDisplayName(g) {
    if (g.crafted) return g.craftedRuName || g.craftedName || g.collectionName;
    return g.collectionName;
  }

  function giftBgStyle(g) {
    if (!g || (!g.upgraded && !g.crafted)) {
      return 'linear-gradient(160deg, #243343 0%, #17212b 100%)';
    }
    const c = g.backdrop?.center || g.backdropCenter || '#2b4a6f';
    const e = g.backdrop?.edge || g.backdropEdge || '#17212b';
    return `radial-gradient(circle at 50% 40%, ${c} 0%, ${e} 100%)`;
  }

  function isBasicNonUpgradable(g) {
    return g.upgradable === false || Boolean(g.basicSlug);
  }

  function preloadImageAsset(url, timeoutMs = 4200) {
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      const img = new Image();
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
    });
  }

  async function preloadCriticalAssets() {
    const urls = new Set();
    if (state.user?.photoUrl) urls.add(state.user.photoUrl);
    if (state.user?.avatarFrame) {
      const f = (state.levelConfig?.frames || []).find((x) => x.id === state.user.avatarFrame);
      if (f?.image) urls.add(f.image);
    }
    // Preload hub art + first 6 profile inventory items so Profile is 100% ready immediately
    document.querySelectorAll('.hub-card-art').forEach((el) => {
      const src = el.getAttribute('src');
      if (src) urls.add(src);
    });
    (state.user?.inventory || []).slice(0, 6).forEach((g) => {
      if (g?.image) urls.add(g.image);
    });

    const tasks = [...urls].map((u) => () => preloadImageAsset(u, 4200));
    if (document.fonts?.ready) {
      tasks.push(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]));
    }

    if (!tasks.length) {
      setPreloader(96);
      return;
    }

    let completed = 0;
    const total = tasks.length;
    setPreloader(56);

    await Promise.all(
      tasks.map((run) =>
        run().finally(() => {
          completed += 1;
          setPreloader(56 + Math.round((completed / total) * 40));
        })
      )
    );
  }

  function installOverscrollCollapseGuard() {
    const scroller = $('app');
    if (!scroller) return;
    let startY = 0;
    scroller.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) startY = e.touches[0].clientY;
    }, { passive: true });
    scroller.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - startY;
      // Only block pull-down gesture when already at the very top so scrolling up/down works freely
      // while Telegram Mini App never collapses on overscroll!
      if (scroller.scrollTop <= 0 && dy > 0 && e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  // ======================== BOOT & STRICT AUTH ========================
  async function boot() {
    window.__ZG_BOOT_STARTED__ = true;
    setPreloader(15);
    try { hydrateTelegramIcons(); } catch {}

    // Wait briefly if Telegram WebView injects initData slightly after script start
    let effectiveInitData = initData || window.Telegram?.WebApp?.initData || '';
    if (!effectiveInitData) {
      await new Promise((r) => setTimeout(r, 250));
      effectiveInitData = window.Telegram?.WebApp?.initData || '';
    }
    if (!effectiveInitData) {
      showAuthDenied('Ошибка авторизации');
      return;
    }

    try {
      if (tg) {
        try { tg.ready(); } catch {}
        try { tg.expand(); } catch {}
        try {
          if (typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
          }
        } catch {}
        try { tg.setHeaderColor?.('#17212b'); } catch {}
        try { tg.setBackgroundColor?.('#17212b'); } catch {}
        try {
          if (tg.BackButton) {
            tg.BackButton.hide();
            tg.BackButton.onClick(handleTelegramBack);
          }
        } catch {}
      }

      setPreloader(32);
      const me = await api('/api/me');
      setPreloader(52);

      applyServerUser(me.user, { force: true, render: false });
      if (me.appConfig) applyAppConfig(me.appConfig);
      if (me.levelConfig) state.levelConfig = me.levelConfig;
      state.cases = me.cases || [];
      state.wheelTiers = Array.isArray(me.wheelTiers) ? me.wheelTiers : [];
      const initTier = state.wheelTiers.find((t) => t.id === state.wheelTier) || state.wheelTiers[0];
      state.wheelTier = initTier ? initTier.id : 'low';
      state.wheelCost = initTier ? Number(initTier.cost) : (Number(me.wheelCost) || 10);
      state.wheelSegments = initTier ? initTier.segments : (me.wheelSegments || []);
      state.plinkoMultipliers = me.plinkoMultipliers || state.plinkoMultipliers;
      state.plinkoRecentBets = me.plinkoRecentBets || [];
      state.safeRecentBets = me.safeRecentBets || [];
      if (me.liveFeeds) state.liveFeeds = { ...state.liveFeeds, ...me.liveFeeds };
      if (Array.isArray(me.crashNftTiers)) state.crashNftTiers = me.crashNftTiers;
      if (me.marketPricing) state.marketPricing = me.marketPricing;
      if (me.pfCrash) state.pfCrash = me.pfCrash;

      $('auth-gate')?.classList.add('hidden');
      $('app')?.classList.remove('hidden');

      try { initUI(); } catch (e) { console.error('[initUI]', e); }
      try { installOverscrollCollapseGuard(); } catch {}
      try { initStarLottie(); } catch {}
      // Force full profile render BEFORE dismissing startup preloader so profile & avatar are 100% ready!
      try { renderUser({ forceProfile: true }); } catch {}
      try { initAmbientCanvas('global-bg-canvas', 'hub'); } catch {}
      try { waitAndConnectSocket(); } catch (e) { console.error('[socket]', e); }

      if (state.user?.isAdmin) {
        $('nav-admin-btn')?.classList.remove('hidden');
      }

      // Hard cap preloading wait to max 4.2s so slow images NEVER hang the splash screen
      await Promise.race([
        preloadCriticalAssets().catch(() => {}),
        new Promise((r) => setTimeout(r, 4200))
      ]);
      try { renderUser({ forceProfile: true }); } catch {}
      try { syncTelegramBackButton(); } catch {}

      setPreloader(100);
      setTimeout(() => hidePreloader(), 160);
      startBackgroundWarmup();
    } catch (err) {
      console.error('[boot]', err);
      showAuthDenied(err?.message && !String(err.message).includes('null') ? err.message : 'Ошибка авторизации');
    }
  }

  // ======================== SOCKET.IO ========================
  function waitAndConnectSocket(attempt = 0) {
    if (state.socket) return;
    if (typeof io === 'function') {
      connectSocket();
      return;
    }
    if (attempt < 20) {
      setTimeout(() => waitAndConnectSocket(attempt + 1), 250);
    }
  }

  function connectSocket() {
    const currentInitData = window.Telegram?.WebApp?.initData || initData || '';
    const socket = io({ auth: { initData: currentInitData } });
    state.socket = socket;

    socket.on('connect_error', (err) => {
      const m = String(err?.message || '');
      if (m.includes('авторизации') || m.includes('заблокирован')) {
        showAuthDenied(m);
      }
    });
    socket.on('force_logout', () => {
      socket.disconnect();
      showAuthDenied('Ошибка авторизации');
    });

    socket.on('user_update', (u) => {
      // Do not clobber mid-animation local balance deduction during spin/roll/craft/plinko/pvp
      if (isAnyGameAnimating()) return;
      applyServerUser(u);
    });

    socket.on('app:config', (cfg) => {
      applyAppConfig(cfg);
    });

    socket.on('admin:withdraw_update', () => {
      if (state.user?.isAdmin && state.tab === 'admin') {
        loadAdminWithdraws($('adm-wd-search-input')?.value || '');
      }
    });

    socket.on('auction:won', (payload) => {
      if (!payload?.gift) return;
      SoundFX.bigWin();
      haptic('success');
      openRoundRewardModal({
        title: 'Победа в Загадочном аукционе!',
        subtitle: `Вы выиграли «${payload.prizeName || payload.gift.collectionName}» за ${formatStars(payload.paidAmount || 0)} звёзд`,
        gifts: [payload.gift],
        stars: 0,
        totalValue: Number(payload.gift.value || 0)
      });
    });

    socket.on('p2p_auction:state', (payload) => {
      state.p2pAuction = payload;
      if (state.tab === 'p2p-auction') renderP2pAuctionUI();
    });

    socket.on('p2p_auction:won', (payload) => {
      if (!payload?.gift) return;
      SoundFX.bigWin();
      haptic('success');
      openRoundRewardModal({
        title: 'Вы выиграли лот на аукционе!',
        subtitle: `Подарок «${payload.giftName || payload.gift.collectionName}» (с аукциона) добавлен в профиль`,
        gifts: [payload.gift],
        stars: 0,
        totalValue: Number(payload.gift.value || payload.paidAmount || 0)
      });
    });

    socket.on('p2p_auction:seller_paid', (notice) => {
      if (!notice) return;
      maybeShowNextAuctionSellerPayout(notice);
    });

    socket.on('admin:toast', (payload) => {
      if (!payload?.text) return;
      showToast(String(payload.text), payload.type || 'gold');
      SoundFX.coin();
      haptic('medium');
    });

    socket.on('admin:crash_forecast', (data) => {
      if (state.user?.isAdmin) renderAdminCrashForecast(data);
    });

    socket.on('admin:game_round', (payload) => {
      if (!state.user?.isAdmin || !payload?.game) return;
      onAdminGameRoundEvent(payload);
    });

    socket.on('admin:live_radar', (item) => {
      if (!state.user?.isAdmin || !item) return;
      onAdminLiveRadarEvent(item);
    });

    // CRASH (strictly lazy: when Crash is NOT open, only update JS state — zero DOM or Lottie work!)
    let lastCrashBetsTickDraw = 0;
    socket.on('crash:state', (payload) => {
      const prevPhase = state.crash.phase;
      state.crash.phase = payload.phase;
      state.crash.multiplier = payload.multiplier;
      state.crash.bets = payload.bets || [];
      state.crash.history = payload.history || [];
      state.crash.waitEndsAt = Date.now() + (payload.waitMs || 0);
      if (payload.serverSeedHash) {
        state.pfCrash.roundId = payload.roundId || state.pfCrash.roundId;
        state.pfCrash.serverSeedHash = payload.serverSeedHash;
      }
      if (payload.phase === 'running') {
        state.crash.startedAt = Date.now() - Math.log(Math.max(1, payload.multiplier)) / 0.145 * 1000;
      }
      if (!isCrashVisible()) return;
      updatePfStrips();
      if (payload.phase === 'running') {
        setCrashVisual('running');
        if (prevPhase !== 'running') SoundFX.rocket();
      } else if (payload.phase === 'waiting') {
        setCrashVisual('waiting');
      } else {
        setCrashVisual('crashed');
      }
      renderCrashHistory();
      renderCrashBets();
      updateCrashButton();
    });

    socket.on('crash:tick', (payload) => {
      const wasRunning = state.crash.phase === 'running';
      if (!wasRunning) {
        state.crash.phase = 'running';
        state.crash.startedAt = Date.now() - (payload.elapsedMs || 0);
      }
      state.crash.multiplier = payload.multiplier;
      if (state.user?.isAdmin && state.tab === 'admin') {
        updateAdminCrashLiveTick(payload.multiplier);
      }
      // If player is in Cases, Mines, Hub, Profile, etc. — do ZERO DOM updates on 60ms crash ticks!
      if (!isCrashVisible()) {
        SoundFX.stopRocketEngine(0.08);
        return;
      }

      if (!wasRunning) {
        setCrashVisual('running');
        SoundFX.rocket();
      } else {
        SoundFX.startRocketEngine();
      }
      SoundFX.updateRocketEngine(payload.multiplier);
      $('crash-multiplier').textContent = `${payload.multiplier.toFixed(2)}x`;
      updateCrashButton();
      // Throttle live bets list DOM updates during flight to ~5/sec (instead of 17 full innerHTML rebuilds/sec!)
      const nowTs = performance.now();
      if (state.crash.bets.length && nowTs - lastCrashBetsTickDraw >= 200) {
        lastCrashBetsTickDraw = nowTs;
        renderCrashBets();
      }
    });

    socket.on('crash:bets', (bets) => {
      state.crash.bets = bets || [];
      if (!isCrashVisible()) return;
      renderCrashBets();
      updateCrashButton();
    });

    socket.on('crash:auto_cashed', (info) => {
      if (!info) return;
      if (isCrashVisible()) {
        SoundFX.cashout();
        haptic('success');
        showToast(`Авто-вывод @ x${Number(info.cashoutAt || 1).toFixed(2)} (${formatStars(info.payout)})! Зачислено`, 'success');
      }
    });

    socket.on('crash:round_reward', (reward) => {
      if (!reward) return;
      if (isCrashVisible()) {
        SoundFX.bigWin();
        haptic('success');
      }
      openCrashRewardModal(reward);
    });

    socket.on('crash:boom', (payload) => {
      state.crash.phase = 'crashed';
      state.crash.multiplier = payload.crashPoint;
      state.crash.bets = payload.bets || [];
      state.crash.history = payload.history || [];
      if (state.user?.isAdmin && state.tab === 'admin') {
        const statusEl = $('adm-crash-cur-status');
        const boomBtn = $('adm-crash-boom-btn');
        if (statusEl) statusEl.textContent = `Взорвалась на ${Number(payload.crashPoint || 1).toFixed(2)}x • Ставок: ${(payload.bets || []).length}`;
        if (boomBtn) boomBtn.disabled = true;
      }
      if (payload.serverSeed) {
        state.pfCrash.history.unshift({
          roundId: payload.roundId || state.pfCrash.roundId,
          crashPoint: payload.crashPoint,
          serverSeed: payload.serverSeed,
          serverSeedHash: payload.serverSeedHash || state.pfCrash.serverSeedHash,
          createdAt: Date.now()
        });
        if (state.pfCrash.history.length > 25) state.pfCrash.history.pop();
      }
      if (!isCrashVisible()) {
        SoundFX.stopRocketEngine(0.06);
        return;
      }
      setCrashVisual('crashed');
      renderCrashHistory();
      renderCrashBets();
      updateCrashButton();
      haptic('error');
      SoundFX.boom();
    });

    socket.on('withdraw:resolved', (info) => {
      if (!info) return;
      if (info.approved) {
        showToast(`Подарок «${info.giftName || ''}» был выведен к вам в профиль!`, 'success');
        SoundFX.coin();
      } else {
        showToast('Подарок не был выведен, попробуйте позже', 'error');
      }
      refreshUserSilently();
    });

    socket.on('admin:withdraw_update', () => {
      if (state.user?.isAdmin && state.tab === 'admin') {
        loadAdminWithdraws();
      }
    });

    socket.on('admin:audit_log', () => {
      if (state.user?.isAdmin && state.tab === 'admin') {
        loadAdminAudit();
      }
    });

    socket.on('admin:deposits_update', () => {
      if (state.user?.isAdmin && state.tab === 'admin') {
        loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
      }
    });

    // LIVE CONTEXTUAL DROP FEEDS (render ONLY the feed of the currently active game!)
    socket.on('feed:update', ({ channel, item }) => {
      if (!channel || !item || !state.liveFeeds[channel]) return;
      state.liveFeeds[channel].unshift(item);
      if (state.liveFeeds[channel].length > 25) state.liveFeeds[channel].pop();
      if (state.activeGame === channel) {
        renderLiveFeed(channel);
        if (channel === 'cases' && state.activeCase) renderSingleCaseFeed();
      }
    });

    // PVP WHEEL (render ONLY when PvP screen is open!)
    socket.on('pvp:state', (payload) => {
      state.pvp.phase = payload.phase;
      state.pvp.endsAt = Date.now() + (payload.timeLeftMs || 0);
      state.pvp.players = payload.players || [];
      state.pvp.totalPot = payload.totalPot || 0;
      state.pvp.lastWinner = payload.lastWinner || state.pvp.lastWinner || null;
      if (!isPvpVisible()) return;
      syncPvpHeaderDom();
      drawPvpWheel();
      renderPvpPlayers();
    });

    socket.on('pvp:spin', (payload) => {
      state.pvp.phase = 'spinning';
      state.pvp.players = payload.players || [];
      state.pvp.totalPot = payload.totalPot || 0;
      state.pvp.pendingSettledWinner = null;
      if (!isPvpVisible()) {
        // Still block early balance flashes while PvP spins in background
        state.pvp.spinning = true;
        setTimeout(() => {
          state.pvp.spinning = false;
          if (state.pvp.pendingSettledWinner) {
            const w = state.pvp.pendingSettledWinner;
            state.pvp.pendingSettledWinner = null;
            revealPvpWinner(w);
          }
        }, (payload.spinDurationMs || 4800) + 50);
        return;
      }
      animatePvpSpin(payload.stopAngle, payload.spinDurationMs || 4800);
    });

    socket.on('pvp:settled', (payload) => {
      const winner = payload?.winner || null;
      if (!winner) return;
      state.pvp.lastWinner = winner;
      if (state.pvp.spinning) {
        // Wheel still finishing final frames — wait until exact stop!
        state.pvp.pendingSettledWinner = winner;
      } else {
        revealPvpWinner(winner);
      }
    });

    // PLINKO RECENT BETS (render ONLY when Plinko screen is open!)
    socket.on('user:sync', (u) => {
      if (isAnyGameAnimating()) return;
      applyServerUser(u);
    });

    socket.on('auction:state', (payload) => {
      state.auction = payload;
      if (state.activeGame === 'auction') renderAuctionState();
    });

    socket.on('singularity:state', (payload) => {
      const prevSuckedAt = state.singularity?.lastSucked?.at || 0;
      state.singularity = payload;
      if (payload?.lastSucked?.at && payload.lastSucked.at !== prevSuckedAt && state.activeGame === 'singularity') {
        triggerSingularitySuckAnim(payload.lastSucked);
      }
      if (state.activeGame === 'singularity') renderSingularityState();
    });

    socket.on('singularity:reward', (reward) => {
      if (!reward) return;
      SoundFX.bigWin();
      haptic('success');
      const gifts = Array.isArray(reward.gifts) ? reward.gifts : [];
      const stars = Number(reward.starsPayout || 0);
      openRoundRewardModal({
        title: `Победа в Сингулярности!`,
        subtitle: `Вы забрали банк (комиссия 5%): ${formatStars(reward.payout)} звёзд`,
        gifts,
        stars,
        totalValue: Number(reward.payout || 0)
      });
    });

    socket.on('plinko:history', (list) => {
      state.plinkoRecentBets = Array.isArray(list) ? list : [];
      if (isPlinkoVisible()) renderPlinkoBets();
    });

    socket.on('plinko:bet', (entry) => {
      if (!entry) return;
      state.plinkoRecentBets.unshift(entry);
      if (state.plinkoRecentBets.length > 30) state.plinkoRecentBets.pop();
      if (isPlinkoVisible()) renderPlinkoBets();
    });

    socket.on('safe:history', (list) => {
      state.safeRecentBets = Array.isArray(list) ? list : [];
      if (state.activeGame === 'safe') renderSafeBets();
    });

    socket.on('safe:bet', (entry) => {
      if (!entry) return;
      state.safeRecentBets.unshift(entry);
      if (state.safeRecentBets.length > 30) state.safeRecentBets.pop();
      if (state.activeGame === 'safe') renderSafeBets();
    });
  }

  function isPvpVisible() {
    return state.activeGame === 'pvp' && $('game-pvp')?.classList.contains('active') && $('tab-games')?.classList.contains('active');
  }

  function isPlinkoVisible() {
    return state.activeGame === 'plinko' && $('game-plinko')?.classList.contains('active') && $('tab-games')?.classList.contains('active');
  }

  function isProfileVisible() {
    return Boolean($('tab-profile')?.classList.contains('active'));
  }

  function syncPvpHeaderDom() {
    const potEl = $('pvp-pot-badge');
    if (potEl) potEl.innerHTML = `Банк: ${formatStars(state.pvp.totalPot)} ${starIconHtml(14)}`;
    if (state.pvp.lastWinner) {
      const b = $('pvp-last-winner');
      if (b) {
        b.innerHTML = `${tgIcon('trophy', 14)} Победитель: ${esc(state.pvp.lastWinner.firstName)} (+${formatStars(state.pvp.lastWinner.winAmount)} ${starIconHtml(12)} • ${state.pvp.lastWinner.chance}%)`;
        b.classList.remove('hidden');
      }
    }
  }

  // ======================== LOTTIE INITIALIZATION (SILENT LAZY LOAD FOR CRASH) ========================
  function initLotties(retryCount = 0) {
    if (state.rocketLottie) return;
    if (!window.lottie) {
      if (state.activeGame === 'crash' && retryCount < 15) {
        setTimeout(() => initLotties(retryCount + 1), 350);
      }
      return;
    }

    const rocketData = warmedJson.get('rocket.json');
    const explosionData = warmedJson.get('explosion.json');

    // Looped Rocket ONLY in Crash center over graph during flight!
    const rocketCfg = {
      container: $('crash-rocket'),
      renderer: 'svg',
      loop: true,
      autoplay: false
    };
    if (rocketData) rocketCfg.animationData = JSON.parse(JSON.stringify(rocketData));
    else rocketCfg.path = 'rocket.json';
    state.rocketLottie = lottie.loadAnimation(rocketCfg);

    // One-shot Explosion in Crash center on crash!
    const explosionCfg = {
      container: $('crash-explosion'),
      renderer: 'svg',
      loop: false,
      autoplay: false
    };
    if (explosionData) explosionCfg.animationData = JSON.parse(JSON.stringify(explosionData));
    else explosionCfg.path = 'explosion.json';
    state.explosionLottie = lottie.loadAnimation(explosionCfg);

    if (state.activeGame === 'crash') {
      try { setCrashVisual(state.crash.phase); } catch {}
    }
  }

  function pauseCrashLotties() {
    try { state.rocketLottie?.pause(); } catch {}
    try { state.explosionLottie?.pause(); } catch {}
  }

  function updateBackButtonLabel() {
    syncTelegramBackButton();
  }

  const lazyInited = {
    crash: false,
    cases: false,
    craft: false,
    wheel: false,
    mines: false,
    plinko: false,
    upgrader: false,
    admin: false
  };

  // ======================== GAME ASSET CLEANUP & SILENT BACKGROUND PRELOADER ========================
  function cleanupInactiveGames(keepGameId) {
    if (keepGameId !== 'crash') {
      SoundFX.stopRocketEngine(0.08);
      pauseCrashLotties();
      if (state.rocketLottie) {
        try { state.rocketLottie.destroy(); } catch {}
        state.rocketLottie = null;
      }
      if (state.explosionLottie) {
        try { state.explosionLottie.destroy(); } catch {}
        state.explosionLottie = null;
      }
      if ($('crash-rocket')) $('crash-rocket').innerHTML = '';
      if ($('crash-explosion')) $('crash-explosion').innerHTML = '';
      lazyInited.crash = false;
    }
    if (keepGameId !== 'singularity') {
      try { stopSingularityRuntime(); } catch {}
    }
    if (keepGameId !== 'auction') {
      try { destroyGiftLottie('auction-prize'); } catch {}
      try { stopAuctionTimerLoop(); } catch {}
    }
    if (keepGameId !== 'cases' && !state.caseOpening) {
      const strip = $('case-roulette-window');
      if (strip) strip.innerHTML = '';
    }
    if (keepGameId !== 'safe') {
      try { stopSafeSparks(); } catch {}
    }
  }

  // Runs completely silently in background without blocking UI or showing any overlay.
  // Gradually loads any assets/state that haven't finished loading yet for ALL 12 games.
  async function preloadGameAssets(gameId, seq) {
    try {
      const urls = [];
      if (gameId === 'singularity') {
        urls.push('/blackhole.png', '/asteroid_1.png', '/asteroid_2.png', '/asteroid_3.png');
        void bgPreloadImages(urls, { batchSize: 4, delayMs: 40 });
        await bgFetchJson('/blackhole.json');
        if (seq !== gameTransitionSeq || state.activeGame !== 'singularity') return;
        if (!singRuntime.bhLottie) mountSingularityBlackHole();
        try {
          const s = await api('/api/games/singularity/state');
          if (seq !== gameTransitionSeq || state.activeGame !== 'singularity') return;
          state.singularity = s;
          renderSingularityState();
          const playerUrls = [];
          for (const p of (s.players || [])) {
            if (p.photoUrl) playerUrls.push(p.photoUrl);
            if (p.gift?.image) playerUrls.push(p.gift.image);
          }
          void bgPreloadImages(playerUrls, { batchSize: 4, delayMs: 50 });
        } catch {}
        return;
      }

      if (gameId === 'auction') {
        urls.push('/hub_auction.png');
        void bgPreloadImages(urls, { batchSize: 2, delayMs: 40 });
        try {
          const a = await api('/api/games/auction/state');
          if (seq !== gameTransitionSeq || state.activeGame !== 'auction') return;
          state.auction = a;
          renderAuctionState();
          const extra = [];
          if (a?.prize?.image) extra.push(a.prize.image);
          (a?.participants || []).forEach((p) => { if (p.photoUrl) extra.push(p.photoUrl); });
          void bgPreloadImages(extra, { batchSize: 4, delayMs: 50 });
        } catch {}
        return;
      }

      if (gameId === 'safe') {
        void bgPreloadImages(['/hub_safe.png'], { batchSize: 2, delayMs: 40 });
        return;
      }

      if (gameId === 'slots') {
        void bgPreloadImages(['/hub_slots.png'], { batchSize: 2, delayMs: 40 });
        return;
      }

      if (gameId === 'crash') {
        await Promise.all([bgFetchJson('rocket.json'), bgFetchJson('explosion.json')]);
        if (seq === gameTransitionSeq && state.activeGame === 'crash' && !state.rocketLottie) {
          initLotties();
        }
        return;
      }

      if (gameId === 'cases') {
        (state.cases || []).forEach((c) => {
          if (c?.image) urls.push(c.image);
        });
        void bgPreloadImages(urls, { batchSize: 4, delayMs: 60 });
        return;
      }

      if (gameId === 'wheel') {
        (state.wheelSegments || []).forEach((seg) => {
          if (seg?.image) urls.push(seg.image);
        });
        await bgPreloadImages(urls, { batchSize: 4, delayMs: 50 });
        if (seq === gameTransitionSeq && state.activeGame === 'wheel') {
          try { drawWheel(); } catch {}
        }
        return;
      }

      if (gameId === 'upgrader') {
        await ensureCatalogLoaded();
        if (seq !== gameTransitionSeq || state.activeGame !== 'upgrader') return;
        try { updateUpgraderInfo(); } catch {}
        try { drawUpgraderWheel(); } catch {}
        const invUrls = (state.user?.inventory || []).slice(0, 12).map((g) => g?.image).filter(Boolean);
        void bgPreloadImages(invUrls, { batchSize: 4, delayMs: 60 });
        return;
      }

      if (gameId === 'craft') {
        await ensureCatalogLoaded();
        const invUrls = (state.user?.inventory || []).slice(0, 12).map((g) => g?.image).filter(Boolean);
        void bgPreloadImages(invUrls, { batchSize: 4, delayMs: 60 });
        return;
      }

      if (gameId === 'pvp') {
        const pvpUrls = [];
        for (const p of (state.pvp?.players || [])) {
          if (p.photoUrl) pvpUrls.push(p.photoUrl);
          (p.gifts || []).forEach((g) => { if (g?.image) pvpUrls.push(g.image); });
        }
        void bgPreloadImages(pvpUrls, { batchSize: 4, delayMs: 50 });
        return;
      }

      if (gameId === null) {
        document.querySelectorAll('.hub-card-art').forEach((el) => {
          const src = el.getAttribute('src');
          if (src) urls.push(src);
        });
        void bgPreloadImages(urls, { batchSize: 4, delayMs: 60 });
      }
    } catch {}
  }

  let gameTransitionSeq = 0;

  // ======================== GAMES HUB & NAVIGATION ========================
  function openGame(gameId) {
    const seq = ++gameTransitionSeq;

    try { cleanupInactiveGames(gameId); } catch (e) { console.error('[cleanup]', e); }

    state.activeGame = gameId;
    switchTab('games', false);
    $('games-hub')?.classList.add('hidden');
    $('game-shell')?.classList.remove('hidden');
    if ($('active-game-title')) $('active-game-title').textContent = GAME_TITLES[gameId] || 'Игра';
    updateBackButtonLabel();

    document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    $(`game-${gameId}`)?.classList.add('active');

    requestAnimationFrame(() => ambientControllers['global-bg-canvas']?.setTheme(gameId));

    try {
      if (gameId === 'crash') {
        if (!lazyInited.crash) {
          lazyInited.crash = true;
          initLotties();
        }
        renderLiveFeed('crash');
        renderCrashHistory();
        renderCrashBets();
        renderCrashGiftPreview();
        setCrashVisual(state.crash.phase);
        if ($('crash-multiplier')) $('crash-multiplier').textContent = `${Number(state.crash.multiplier || 1).toFixed(2)}x`;
        updateCrashButton();
        updatePfStrips();
      } else if (gameId === 'cases') {
        lazyInited.cases = true;
        closeCaseDetail();
        renderCasesList();
        renderLiveFeed('cases');
      } else if (gameId === 'craft') {
        if (!lazyInited.craft) {
          lazyInited.craft = true;
          renderCraftedShowcase([], 0);
        }
        if (!state.crafting) resetCraftHeroToIdle();
        renderCraftSlots();
        renderLiveFeed('craft');
      } else if (gameId === 'wheel') {
        if (!lazyInited.wheel) {
          lazyInited.wheel = true;
          preloadWheelImages();
          initWheelCanvas();
          const wheelBtn = $('wheel-spin-btn');
          if (wheelBtn) wheelBtn.innerHTML = `Крутить за ${formatStars(state.wheelCost)} ${starIconHtml(16)}`;
        }
        renderLiveFeed('wheel');
        drawWheel();
      } else if (gameId === 'mines') {
        if (!lazyInited.mines) {
          lazyInited.mines = true;
          initMinesGrid();
          loadMinesState();
        }
        syncMinesUI();
      } else if (gameId === 'pvp') {
        syncPvpHeaderDom();
        renderPvpSelectedGifts();
        drawPvpWheel();
        renderPvpPlayers();
      } else if (gameId === 'upgrader') {
        if (!lazyInited.upgrader) {
          lazyInited.upgrader = true;
          initUpgraderCanvas();
        }
        updateUpgraderInfo();
        drawUpgraderWheel();
      } else if (gameId === 'plinko') {
        if (!lazyInited.plinko) {
          lazyInited.plinko = true;
          initPlinkoBoard();
        }
        drawPlinkoStatic();
        renderPlinkoBets();
      } else if (gameId === 'auction') {
        renderAuctionState();
        startAuctionTimerLoop();
      } else if (gameId === 'singularity') {
        startSingularityRuntime();
        renderSingularityState();
      } else if (gameId === 'safe') {
        renderSafeDials();
        renderSafeBets();
      } else if (gameId === 'slots') {
        renderLiveFeed('slots');
        initSlotsTgsShell();
        requestAnimationFrame(() => renderSlotsGrid(slotsState.lastGrid));
      }
    } catch (e) {
      console.error(`[openGame:${gameId}]`, e);
    }

    const appEl = $('app');
    if (appEl) appEl.scrollTop = 0;

    // Kick off silent background preloading/refreshing without showing any loader
    void preloadGameAssets(gameId, seq);
  }

  function backToGamesHub() {
    const seq = ++gameTransitionSeq;
    try { cleanupInactiveGames(null); } catch {}
    state.activeGame = null;
    $('game-shell')?.classList.add('hidden');
    $('games-hub')?.classList.remove('hidden');
    document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    ambientControllers['global-bg-canvas']?.setTheme('hub');
    syncTelegramBackButton();
    const appEl = $('app');
    if (appEl) appEl.scrollTop = 0;
    void preloadGameAssets(null, seq);
  }

  function switchTab(tab, resetHub = true) {
    state.tab = tab;
    if (tab !== 'games' && state.activeGame) {
      cleanupInactiveGames(null);
      state.activeGame = null;
      $('game-shell').classList.add('hidden');
      $('games-hub').classList.remove('hidden');
      document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    }
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'games' && resetHub) {
      backToGamesHub(false);
    }
    if (tab === 'p2p-auction') {
      state.p2pAuctionActiveLotId = null;
      loadP2pAuctionState();
      startP2pAuctionTicker();
      ambientControllers['global-bg-canvas']?.setTheme('auction');
    } else {
      state.p2pAuctionActiveLotId = null;
      stopP2pAuctionTicker();
    }
    if (tab === 'top') {
      loadLeaderboard();
      ambientControllers['global-bg-canvas']?.setTheme('top');
    }
    if (tab === 'admin' && state.user?.isAdmin) {
      if (!lazyInited.admin) {
        lazyInited.admin = true;
        loadCatalogForAdmin();
      }
      loadAdminWithdraws();
      loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
      loadAdminStats();
      loadAdminCrashForecast();
      loadAdminGamesInfo();
      loadAdminControls();
      loadAdminRecentUsers();
      loadAdminPromos();
      loadAdminBans();
      loadAdminAudit();
      startAdminAutoSync();
      ambientControllers['global-bg-canvas']?.setTheme('hub');
    } else {
      stopAdminAutoSync();
    }
    if (tab === 'profile') {
      renderUser({ forceProfile: true });
      ambientControllers['global-bg-canvas']?.setTheme('profile');
      if (!isAnyGameAnimating()) refreshUserSilently();
    }
    syncTelegramBackButton();
  }

  // ======================== GLOBAL UI BINDINGS ========================
  function initUI() {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        switchTab(btn.dataset.tab, true);
      });
    });

    // Hub cards -> open game
    document.querySelectorAll('[data-open-game]').forEach((card) => {
      card.addEventListener('click', () => {
        haptic('light');
        openGame(card.dataset.openGame);
      });
    });

    // Keyboard Escape fallback for desktop preview alongside native Telegram BackButton
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') handleTelegramBack();
    });

    // Cases multi-spin controls, filter mini-tabs, turbo & unified Open/Skip button
    document.querySelectorAll('[data-case-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.caseFilter || 'all';
        if (state.caseFilter === next) return;
        state.caseFilter = next;
        document.querySelectorAll('[data-case-filter]').forEach((b) => {
          b.classList.toggle('active', b.dataset.caseFilter === next);
        });
        SoundFX.click();
        haptic('light');
        renderCasesList();
      });
    });

    $('case-open-btn').addEventListener('click', () => {
      if (state.caseOpening && typeof state.caseSkipFn === 'function') {
        SoundFX.click();
        state.caseSkipFn();
        return;
      }
      if (!state.activeCase) return;
      if (state.activeCase.isPromo) {
        openPromoCodeModal();
        return;
      }
      if (state.activeCase.isCashback) {
        const have = Math.max(0, Math.floor(Number(state.user?.cashbackCases || 0)));
        if (have < 1) {
          haptic('error');
          showToast('У вас нет Кэшбэк-кейса! Повышайте уровень (2, 6, 9 и др.), чтобы получить его бесплатно.', 'error');
          return;
        }
      }
      openCase(state.activeCase);
    });

    $('promo-code-submit-btn')?.addEventListener('click', handlePromoCodeSubmit);
    $('promo-code-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePromoCodeSubmit();
      }
    });
    $('promo-code-input')?.addEventListener('input', (e) => {
      e.target.classList.remove('is-error');
    });
    document.querySelectorAll('[data-case-count]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.caseOpening) return;
        const cnt = Number(btn.dataset.caseCount) || 1;
        state.caseCount = cnt;
        document.querySelectorAll('[data-case-count]').forEach((b) => b.classList.toggle('active', Number(b.dataset.caseCount) === cnt));
        SoundFX.click();
        if (state.activeCase) {
          renderCaseIdleStrips(state.activeCase);
          updateCaseOpenButtonLabel();
        }
      });
    });
    $('case-turbo-btn').addEventListener('click', () => {
      state.caseTurbo = !state.caseTurbo;
      $('case-turbo-btn').classList.toggle('active', state.caseTurbo);
      SoundFX.click();
      haptic('light');
    });

    // Sound Toggle button (Mute / Unmute — crisp white Telegram vector icon!)
    const soundBtn = $('sound-toggle-btn');
    if (soundBtn) {
      const syncSoundIcon = () => {
        const m = SoundFX.isMuted();
        soundBtn.innerHTML = tgIcon(m ? 'volume-off' : 'volume-on', 17);
        soundBtn.classList.toggle('muted', m);
      };
      syncSoundIcon();
      soundBtn.addEventListener('click', () => {
        SoundFX.toggle();
        syncSoundIcon();
        showToast(SoundFX.isMuted() ? 'Звуки выключены' : 'Звуки включены', 'info');
      });
    }

    // Profile Level Card -> opens Levels & Avatar Frames modal
    $('profile-level-btn')?.addEventListener('click', () => {
      SoundFX.click();
      haptic('light');
      openLevelsModal();
    });

    // Wheel of Fortune 4-Tier Selector (Low / Medium / High / VIP)
    document.querySelectorAll('[data-wheel-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.wheelSpinning) return;
        SoundFX.click();
        haptic('light');
        selectWheelTier(btn.dataset.wheelTier);
      });
    });

    // Admin Collapsible Accordions (ALL collapsed by default!)
    document.querySelectorAll('[data-acc-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const acc = btn.closest('.adm-acc');
        if (!acc) return;
        const willOpen = !acc.classList.contains('open');
        acc.classList.toggle('open', willOpen);
        SoundFX.click();
        haptic('light');
        if (willOpen) {
          const key = btn.dataset.accToggle;
          if (key === 'withdraws') loadAdminWithdraws();
          if (key === 'stars-refund') loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
          if (key === 'crash-ctl') loadAdminCrashForecast();
          if (key === 'games-info' || key === 'live-radar') loadAdminGamesInfo();
          if (key === 'whales') loadAdminWhales();
          if (key === 'stats') loadAdminStats();
          if (key === 'users') {
            loadAdminRecentUsers();
            populateAdminFrameSelect();
          }
          if (key === 'promos') loadAdminPromos();
          if (key === 'bans-audit') {
            loadAdminBans();
            loadAdminAudit();
          }
          if (key === 'online-rain' || key === 'games-ctl' || key === 'economy' || key === 'system') loadAdminControls();
        }
      });
    });

    // Provably Fair modal buttons & tabs
    document.querySelectorAll('[data-open-pf]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundFX.click();
        openProvablyFairModal(btn.dataset.openPf || 'user');
      });
    });
    document.querySelectorAll('[data-pf-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        state.pfActiveTab = tabBtn.dataset.pfTab || 'user';
        document.querySelectorAll('[data-pf-tab]').forEach((b) => b.classList.toggle('active', b === tabBtn));
        renderProvablyFairModalBody();
      });
    });

    // Extended Admin controls (stats refresh + bot broadcast)
    $('admin-refresh-stats')?.addEventListener('click', () => {
      SoundFX.click();
      loadAdminStats();
    });
    $('admin-bc-img-mode')?.addEventListener('change', (e) => {
      const mode = e.target.value;
      $('admin-bc-upload-wrap')?.classList.toggle('hidden', mode !== 'upload');
    });
    $('admin-bc-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        state.adminBroadcastImageDataUrl = '';
        $('admin-bc-preview')?.classList.add('hidden');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        state.adminBroadcastImageDataUrl = String(reader.result || '');
        const img = $('admin-bc-preview');
        if (img) {
          img.src = state.adminBroadcastImageDataUrl;
          img.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    });
    $('admin-bc-send')?.addEventListener('click', handleAdminBroadcast);
    initExtendedAdminUI();

    // Quick chips
    document.querySelectorAll('.quick-chips').forEach((group) => {
      const target = $(group.dataset.target);
      group.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          if (!target) return;
          if (chip.dataset.val) target.value = chip.dataset.val;
          else if (chip.dataset.mult) target.value = Math.min(50000, Math.max(5, Math.floor(Number(target.value || 10) * Number(chip.dataset.mult))));
          else if (chip.dataset.max) target.value = Math.min(50000, Math.max(5, state.user?.balance || 5));
        });
      });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay.id !== 'modal-upgrade') {
          closeModal(overlay.id);
        }
      });
    });

    $('craft-reset-btn').addEventListener('click', () => {
      resetCraftHeroToIdle();
      renderCraftSlots();
    });

    $('confirm-cancel-btn').addEventListener('click', () => {
      state.confirmCallback = null;
      closeModal('modal-confirm');
    });
    $('confirm-ok-btn').addEventListener('click', async () => {
      const cb = state.confirmCallback;
      state.confirmCallback = null;
      closeModal('modal-confirm');
      if (cb) await cb();
    });

    // Profile buttons (click own avatar -> open own full stats sheet!)
    $('profile-avatar-btn').addEventListener('click', () => {
      if (state.user?.telegramId) {
        haptic('light');
        openPlayerStatsModal(state.user.telegramId);
      }
    });
    $('btn-topup-quick').addEventListener('click', () => openModal('modal-topup'));
    $('btn-open-topup').addEventListener('click', () => openModal('modal-topup'));
    $('btn-open-history').addEventListener('click', () => { renderHistory(); openModal('modal-history'); });
    $('btn-open-catalog').addEventListener('click', openCatalogModal);

    const syncTopupCta = () => {
      const val = Math.max(10, Math.floor(Number($('topup-custom-input')?.value) || 0));
      const payBtn = $('topup-pay-btn');
      if (payBtn) payBtn.textContent = `Оплатить ${formatStars(val)} ⭐`;
      document.querySelectorAll('.topup-preset').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.stars) === val);
      });
      const bonusNote = $('topup-bonus-note');
      const bonusPct = Number(state.appConfig?.depositBonusPct || 0);
      if (bonusNote) {
        if (bonusPct > 0) {
          bonusNote.classList.remove('hidden');
          bonusNote.textContent = `Акция: +${bonusPct}% к пополнению (вы получите ${formatStars(Math.floor(val * (100 + bonusPct) / 100))} ⭐)`;
        } else {
          bonusNote.classList.add('hidden');
        }
      }
    };
    document.querySelectorAll('.topup-preset').forEach((b) => {
      b.addEventListener('click', () => {
        $('topup-custom-input').value = b.dataset.stars;
        syncTopupCta();
        haptic('light');
      });
    });
    $('topup-custom-input')?.addEventListener('input', syncTopupCta);
    $('topup-pay-btn').addEventListener('click', handleTopupPay);
    $('btn-topup-quick')?.addEventListener('click', syncTopupCta);
    syncTopupCta();

    // Plinko 3-Risk tabs
    document.querySelectorAll('.plinko-risk-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.plinkoDropping) return;
        const risk = btn.dataset.plinkoRisk || 'medium';
        setPlinkoRisk(risk);
        haptic('light');
      });
    });

    // P2P NFT Auction controls
    $('p2p-auc-create-btn')?.addEventListener('click', openP2pCreateModal);
    $('p2p-detail-bid-btn')?.addEventListener('click', handleP2pAuctionBid);
    $('p2p-detail-cancel-btn')?.addEventListener('click', () => {
      if (state.p2pAuctionActiveLotId) cancelP2pAuctionLot({ lotId: state.p2pAuctionActiveLotId });
    });
    $('p2p-seller-payout-ok')?.addEventListener('click', acknowledgeAuctionSellerPayout);

    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.invFilter = btn.dataset.filter;
        renderInventory();
      });
    });

    $('catalog-search').addEventListener('input', (e) => renderCatalogGrid(e.target.value));
    $('catalog-type-select')?.addEventListener('change', () => renderCatalogGrid($('catalog-search')?.value || ''));
    $('catalog-sort-select')?.addEventListener('change', () => renderCatalogGrid($('catalog-search')?.value || ''));
    $('inv-sort-select')?.addEventListener('change', () => renderInventory());
    $('upg-pick-type')?.addEventListener('change', () => renderUpgraderPickerGrid($('upg-picker-search')?.value || ''));
    $('upg-pick-sort')?.addEventListener('change', () => renderUpgraderPickerGrid($('upg-picker-search')?.value || ''));
    initCustomSelects(document);
    // Ultra-responsive Crash button (fires immediately on pointerdown, zero missed taps on mobile!)
    let lastCrashTapTs = 0;
    const triggerCrashAction = (ev) => {
      const now = Date.now();
      if (now - lastCrashTapTs < 260) return;
      if ($('crash-action-btn').disabled) return;
      lastCrashTapTs = now;
      if (ev && ev.type === 'pointerdown') ev.preventDefault();
      handleCrashAction();
    };
    $('crash-action-btn').addEventListener('pointerdown', triggerCrashAction);
    $('crash-action-btn').addEventListener('click', triggerCrashAction);

    // Crash Stars vs Gift bet mode switcher
    document.querySelectorAll('[data-crash-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.crashMode;
        state.crashBetMode = mode;
        document.querySelectorAll('[data-crash-mode]').forEach((b) => b.classList.toggle('active', b.dataset.crashMode === mode));
        $('crash-stars-controls').classList.toggle('hidden', mode !== 'stars');
        $('crash-gift-controls').classList.toggle('hidden', mode !== 'gift');
        renderCrashGiftPreview();
        haptic('light');
      });
    });
    $('crash-gift-pick-btn').addEventListener('click', () => openStakePicker('crash'));

    // Crash auto-cashout toggle & input (default 2, min 1.1, max 100, locked while user has active bet!)
    const autoInp = $('crash-auto-input');
    const autoTgl = $('crash-auto-toggle');
    if (autoInp) {
      autoInp.addEventListener('blur', () => sanitizeCrashAutoInput());
      autoInp.addEventListener('change', () => sanitizeCrashAutoInput());
    }
    if (autoTgl) {
      autoTgl.addEventListener('change', () => {
        if (getMyCrashBet()) {
          autoTgl.checked = !autoTgl.checked;
          return;
        }
        if (autoTgl.checked) sanitizeCrashAutoInput();
        SoundFX.click();
        haptic('light');
      });
    }

    $('wheel-spin-btn').addEventListener('click', handleWheelSpin);
    $('mines-action-btn').addEventListener('click', () => {
      if (state.mines.active) handleMinesCashout();
      else handleMinesStart();
    });
    $('plinko-drop-btn').addEventListener('click', handlePlinkoDrop);
    $('pvp-join-btn').addEventListener('click', handlePvpJoin);
    $('pvp-pick-gifts-btn').addEventListener('click', () => openStakePicker('pvp'));

    // Upgrader Combo (Multi-NFT + Optional Extra Stars inside Picker + Quick Multiplier Auto-Target + Fast Mode)
    try { state.upg.fastMode = localStorage.getItem('zg_upg_fast') === '1'; } catch {}
    const fastBtn = $('upg-fast-toggle');
    if (fastBtn) {
      fastBtn.classList.toggle('active', Boolean(state.upg.fastMode));
      fastBtn.setAttribute('aria-pressed', state.upg.fastMode ? 'true' : 'false');
      fastBtn.addEventListener('click', () => {
        state.upg.fastMode = !state.upg.fastMode;
        try { localStorage.setItem('zg_upg_fast', state.upg.fastMode ? '1' : '0'); } catch {}
        fastBtn.classList.toggle('active', state.upg.fastMode);
        fastBtn.setAttribute('aria-pressed', state.upg.fastMode ? 'true' : 'false');
        haptic('light');
        showToast(state.upg.fastMode ? 'Быстрый режим включён (1 сек)' : 'Обычный режим включён', 'info');
      });
    }

    $('upg-pick-source').addEventListener('click', () => openUpgraderPicker('source'));
    $('upg-pick-target').addEventListener('click', () => openUpgraderPicker('target'));
    $('upg-clear-source')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.upg.spinning) return;
      state.upg.sourceGifts = [];
      state.upg.extraStars = 0;
      const inp = $('upg-extra-stars-input');
      if (inp) inp.value = '0';
      updateUpgraderInfo();
      drawUpgraderWheel();
      haptic('light');
    });
    const syncUpgStarsInput = () => {
      const inp = $('upg-extra-stars-input');
      if (!inp) return;
      const clamped = clampUpgExtraStars(inp.value);
      if (String(clamped) !== String(inp.value)) inp.value = String(clamped);
      state.upg.extraStars = clamped;
      updateUpgraderPickerApplyLabel();
      updateUpgraderInfo();
      drawUpgraderWheel();
    };
    $('upg-extra-stars-input')?.addEventListener('input', syncUpgStarsInput);
    $('upg-extra-stars-input')?.addEventListener('change', syncUpgStarsInput);
    $('upg-extra-stars-input')?.addEventListener('blur', syncUpgStarsInput);
    document.querySelectorAll('[data-upg-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.upg.spinning) return;
        const raw = btn.dataset.upgAdd;
        const inp = $('upg-extra-stars-input');
        if (!inp) return;
        const maxBal = Math.max(0, Math.floor(Number(state.user?.balance) || 0));
        let nextVal = 0;
        if (raw === 'max') nextVal = maxBal;
        else {
          const add = Number(raw);
          nextVal = add === 0 ? 0 : clampUpgExtraStars(clampUpgExtraStars(inp.value) + add);
        }
        inp.value = String(nextVal);
        state.upg.extraStars = nextVal;
        updateUpgraderPickerApplyLabel();
        updateUpgraderInfo();
        drawUpgraderWheel();
        haptic('light');
      });
    });
    $('upg-picker-stars-apply')?.addEventListener('click', () => {
      syncUpgStarsInput();
      validateUpgraderTargetStillValid();
      closeModal('modal-upg-picker');
      updateUpgraderInfo();
      drawUpgraderWheel();
      haptic('light');
    });
    document.querySelectorAll('[data-upg-x]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (state.upg.spinning) return;
        document.querySelectorAll('[data-upg-x]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const baseX = Number(btn.dataset.upgX) || 2;
        state.upg.multiplier = baseX;
        await autoPickUpgraderTarget(baseX);
        haptic('light');
      });
    });
    $('upg-picker-search').addEventListener('input', (e) => {
      state.upgPickerLimit = 24;
      renderUpgraderPickerGrid(e.target.value);
    });
    document.querySelectorAll('#upg-mult-filters .upg-mfilter').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#upg-mult-filters .upg-mfilter').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.upgXFilter = btn.dataset.xfilter;
        state.upgPickerLimit = 24;
        $('upg-picker-scroll').scrollTop = 0;
        renderUpgraderPickerGrid($('upg-picker-search').value || '');
        haptic('light');
      });
    });
    $('upg-picker-more').addEventListener('click', () => {
      state.upgPickerLimit += 24;
      renderUpgraderPickerGrid($('upg-picker-search').value || '');
    });
    $('upg-play-btn').addEventListener('click', handleUpgraderPlay);

    // 4 New Games bindings
    initNewGamesUI();

    document.querySelectorAll('.craft-slot').forEach((slotBtn) => {
      slotBtn.addEventListener('click', () => {
        if (state.crafting) return;
        const idx = Number(slotBtn.dataset.slot);
        if (state.craftSlots[idx]) {
          state.craftSlots[idx] = null;
          renderCraftSlots();
        } else {
          state.craftPickerSlot = idx;
          openCraftPicker();
        }
      });
    });
    $('craft-submit-btn').addEventListener('click', handleCraftSubmit);
    $('upgrade-confirm-btn').addEventListener('click', handleUpgradeConfirm);

    // Admin
    $('admin-search-btn').addEventListener('click', handleAdminSearch);
    $('admin-refresh-users').addEventListener('click', loadAdminRecentUsers);
    $('admin-bal-add').addEventListener('click', () => handleAdminBalance(1));
    $('admin-bal-sub').addEventListener('click', () => handleAdminBalance(-1));
    $('admin-give-regular').addEventListener('click', () => handleAdminGiveGift(false));
    $('admin-give-upgraded').addEventListener('click', () => handleAdminGiveGift(true));
    $('admin-ban-toggle').addEventListener('click', handleAdminBanToggle);

    // Admin Promo Codes listeners
    $('admin-promo-gen')?.addEventListener('click', () => {
      const inp = $('admin-promo-code');
      if (inp) inp.value = generateRandomPromoCode();
      SoundFX.click();
      haptic('light');
    });
    document.querySelectorAll('[data-promo-limit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.promoLimit || 'uses';
        state.promoLimitType = mode;
        document.querySelectorAll('[data-promo-limit]').forEach((b) => {
          b.classList.toggle('active', b.dataset.promoLimit === mode);
        });
        $('admin-promo-uses-wrap')?.classList.toggle('hidden', mode !== 'uses' && mode !== 'both');
        $('admin-promo-time-wrap')?.classList.toggle('hidden', mode !== 'time' && mode !== 'both');
        SoundFX.click();
      });
    });
    $('admin-promo-create-btn')?.addEventListener('click', handleAdminCreatePromo);
    $('admin-promos-refresh')?.addEventListener('click', () => {
      SoundFX.click();
      loadAdminPromos();
    });
    $('admin-promo-edit-save')?.addEventListener('click', handleAdminPromoEditSave);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.promo-dots-wrap')) {
        document.querySelectorAll('.promo-dropdown:not(.hidden)').forEach((el) => el.classList.add('hidden'));
      }
    });

    requestAnimationFrame(masterFrameLoop);
  }

  // ======================== RENDER USER, PROFILE & INVENTORY (LAZY: ONLY UPDATE ACTIVE VIEW!) ========================
  function renderUser(opts = {}) {
    const u = state.user;
    if (!u) return;

    // Always update topbar balance & bottom-nav avatar immediately (tiny O(1) DOM updates)
    $('header-balance').textContent = formatStars(u.balance);

    const initial = (u.firstName || 'U').charAt(0).toUpperCase();
    if (u.photoUrl) {
      if ($('nav-profile-avatar').src !== u.photoUrl) $('nav-profile-avatar').src = u.photoUrl;
      $('nav-profile-avatar').classList.remove('hidden');
      $('nav-profile-avatar-fallback').classList.add('hidden');
    } else {
      $('nav-profile-avatar').classList.add('hidden');
      $('nav-profile-avatar-fallback').classList.remove('hidden');
      $('nav-profile-avatar-fallback').textContent = initial;
    }

    const frameUrl = getFrameUrl(u.avatarFrame);
    const navFrameEl = $('nav-profile-avatar-frame');
    if (frameUrl) {
      if (navFrameEl) { navFrameEl.src = frameUrl; navFrameEl.classList.remove('hidden'); }
    } else {
      navFrameEl?.classList.add('hidden');
    }

    // Keep craftSlots references in sync in memory
    const invIds = new Set((u.inventory || []).map((g) => g.uid));
    state.craftSlots = state.craftSlots.map((g) => (g && invIds.has(g.uid) ? u.inventory.find((x) => x.uid === g.uid) : null));

    // Keep Cashback Case counter & open button fresh whenever balance/level/cases update
    if (state.activeCase?.isCashback) {
      const cbCount = Math.max(0, Math.floor(Number(u.cashbackCases || 0)));
      const dp = $('case-detail-price');
      if (dp) dp.innerHTML = `${tgIcon('gift', 13)} В наличии: ${cbCount} шт.`;
      if (!state.caseOpening) updateCaseOpenButtonLabel();
    }
    if (state.activeTab === 'games' && state.activeGame === 'cases' && !state.activeCase && state.cases.length) {
      renderCasesList();
    }

    // Heavy DOM updates ONLY for the screen currently visible to the user!
    if (opts.forceProfile || isProfileVisible()) {
      $('profile-balance').textContent = formatStars(u.balance);
      $('profile-name').textContent = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Игрок';
      const metaEl = $('profile-meta');
      if (u.isAdmin) {
        metaEl?.classList.remove('hidden');
        $('profile-username').textContent = u.username ? `@${u.username}` : 'Без username';
        $('profile-id').textContent = `ID: ${u.telegramId}`;
      } else {
        metaEl?.classList.add('hidden');
      }
      $('inv-count').textContent = u.inventory?.length || 0;

      if (u.photoUrl) {
        if ($('profile-avatar').src !== u.photoUrl) $('profile-avatar').src = u.photoUrl;
        $('profile-avatar').classList.remove('hidden');
        $('profile-avatar-fallback').classList.add('hidden');
      } else {
        $('profile-avatar').classList.add('hidden');
        $('profile-avatar-fallback').classList.remove('hidden');
        $('profile-avatar-fallback').textContent = initial;
      }
      const profFrameEl = $('profile-avatar-frame');
      const profWrap = profFrameEl?.parentElement;
      if (frameUrl) {
        if (profFrameEl) { profFrameEl.src = frameUrl; profFrameEl.classList.remove('hidden'); }
        profWrap?.classList.add('framed');
      } else {
        profFrameEl?.classList.add('hidden');
        profWrap?.classList.remove('framed');
      }
      renderProfileLevelWidget(u);
      renderInventory();
    }

    if (state.activeGame === 'craft' && !state.crafting && !state.craftResultShown) {
      renderCraftSlots();
    } else if (state.activeGame === 'upgrader') {
      updateUpgraderInfo();
    } else if (state.activeGame === 'crash') {
      renderCrashGiftPreview();
    } else if (state.activeGame === 'pvp') {
      renderPvpSelectedGifts();
    }
  }

  function computeLevelProgressPct(lv) {
    if (!lv) return 0;
    if (!lv.nextLevel || !lv.nextMin) return 100;
    const w = Math.max(0, Number(lv.totalWagered || 0));
    const nm = Math.max(1, Number(lv.nextMin || 1));
    return Math.min(100, Math.max(0, Number(((w / nm) * 100).toFixed(2))));
  }

  function renderProfileLevelWidget(u) {
    const lv = u?.levelInfo;
    if (!lv) return;
    const lbl = $('profile-level-label');
    const nums = $('profile-level-nums');
    const fill = $('profile-level-bar-fill');

    const pct = computeLevelProgressPct(lv);
    if (lbl) lbl.textContent = `Уровень ${lv.level}`;
    if (nums) {
      nums.innerHTML = lv.nextLevel
        ? `${formatStars(lv.totalWagered)} / ${formatStars(lv.nextMin)} ${starIconHtml(11)}`
        : `MAX • ${formatStars(lv.totalWagered)} ${starIconHtml(11)}`;
    }
    if (fill) {
      fill.style.setProperty('width', `${pct}%`, 'important');
      fill.style.minWidth = pct > 0 ? '4px' : '0px';
    }
  }

  function openLevelsModal() {
    if (!state.user) return;
    renderLevelsModalBody();
    openModal('modal-levels');
  }

  function renderLevelsModalBody() {
    const u = state.user;
    if (!u || !u.levelInfo) return;
    const lv = u.levelInfo;
    const frames = state.levelConfig?.frames || [];

    const hero = $('levels-hero-box');
    if (hero) {
      const maxLv = lv.maxLevel || 20;
      const cbCount = Math.max(0, Math.floor(Number(u.cashbackCases || 0)));
      let nextLine = '';
      if (!lv.nextLevel) {
        nextLine = `Максимальный ${maxLv} уровень — все 12 рамок и награды открыты!`;
      } else if (lv.nextRewardTitle) {
        nextLine = `До Ур.${lv.nextLevel}: ${formatStars(lv.remaining)} ${starIconHtml(11)} • Награда: ${esc(lv.nextRewardTitle)}`;
      } else {
        const nextFr = lv.nextFrameLevel ? ` • Рамка на Ур.${lv.nextFrameLevel}` : '';
        const nextCb = lv.nextCashbackLevel ? ` • Кэшбэк-кейс на Ур.${lv.nextCashbackLevel}` : '';
        nextLine = `До Ур.${lv.nextLevel}: ${formatStars(lv.remaining)} ${starIconHtml(11)}${nextFr}${nextCb}`;
      }

      hero.innerHTML = `
        <div class="levels-hero-row">
          <div class="levels-hero-lv">Уровень ${lv.level} <span style="font-size:12px;color:var(--tg-hint);font-weight:600">из ${maxLv}</span></div>
          <div class="levels-hero-pct">${lv.percent}%</div>
        </div>
        <div class="profile-level-bar-track" style="height:6px">
          <div class="profile-level-bar-fill" style="width:${lv.percent}%"></div>
        </div>
        <div class="levels-hero-next">${nextLine}</div>
        <div class="levels-cashback-note">
          🎁 Бесплатный Кэшбэк-кейс за уровни: <b>2, 6, 9, 11, 13, 15, 17, 19, 20</b> • У вас сейчас: <b>${cbCount} шт.</b>
        </div>
      `;
    }

    const grid = $('levels-frames-grid');
    if (grid) {
      grid.innerHTML = frames.map((f) => {
        const unlocked = lv.level >= f.level;
        const equipped = u.avatarFrame === f.id;
        const avaPreview = renderAvatarHtml(u.photoUrl, u.firstName, f.id, { size: 68 });
        let btnHtml = '';
        if (!unlocked) {
          btnHtml = `<button type="button" class="frame-nft-btn locked" disabled>${tgIcon('lock', 12)} Ур.${f.level}</button>`;
        } else if (equipped) {
          btnHtml = `<button type="button" class="frame-nft-btn unequip" data-equip-frame="">Снять</button>`;
        } else {
          btnHtml = `<button type="button" class="frame-nft-btn equip" data-equip-frame="${esc(f.id)}">Надеть</button>`;
        }
        return `
          <div class="frame-nft-card ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}">
            <span class="frame-nft-lv-pill">Ур.${f.level}</span>
            <div class="frame-nft-preview">${avaPreview}</div>
            <div class="frame-nft-name">${esc(f.name)}</div>
            ${btnHtml}
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-equip-frame]').forEach((btn) => {
        btn.addEventListener('click', () => {
          equipAvatarFrame(btn.dataset.equipFrame || '');
        });
      });
    }
  }

  async function equipAvatarFrame(frameId) {
    try {
      const res = await api('/api/profile/frame', {
        method: 'POST',
        body: { frameId }
      });
      applyServerUser(res.user, { force: true });
      renderLevelsModalBody();
      haptic('success');
      SoundFX.click();
      showToast(frameId ? 'Рамка надета и отображается везде!' : 'Рамка снята', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Renders NFT symbol pattern directly behind artwork on profile, picker & preview cards!
  function buildCardSymbolPattern(g) {
    const symImg = g?.symbol?.image || g?.symbolImage || '';
    if (!g || !(g.upgraded || g.crafted) || !symImg) return '';
    const pts = [
      [10, 12, -16], [76, 10, 14],
      [6, 46, 12],   [80, 44, -14],
      [16, 76, -10], [72, 74, 16]
    ];
    const imgs = pts
      .map(([x, y, rot]) => `<img class="gift-card-sym" src="${esc(symImg)}" style="left:${x}%;top:${y}%;transform:rotate(${rot}deg)" alt="" loading="lazy" onerror="this.remove()" />`)
      .join('');
    return `<div class="gift-card-pattern">${imgs}</div>`;
  }

  function openGiftConfirmModal(g, mode, onConfirm) {
    const label = g.mintNumber ? `${giftDisplayName(g)} #${g.mintNumber}` : giftDisplayName(g);
    $('confirm-art-wrap').style.background = giftBgStyle(g);
    $('confirm-gift-img').src = g.image;

    const okBtn = $('confirm-ok-btn');
    if (mode === 'sell') {
      $('confirm-title').textContent = 'Продать подарок?';
      $('confirm-desc').textContent = `«${label}» будет продан за ${formatStars(g.value)} звёзд. Это действие нельзя отменить.`;
      okBtn.className = 'tg-btn tg-btn-gold';
      okBtn.innerHTML = `Продать (${formatStars(g.value)} ${starIconHtml(14)})`;
    } else {
      $('confirm-title').textContent = 'Вывести подарок?';
      $('confirm-desc').textContent = `«${label}» будет списан из инвентаря и отправлен на вывод в ваш профиль.`;
      okBtn.className = 'tg-btn tg-btn-primary';
      okBtn.textContent = 'Вывести';
    }

    state.confirmCallback = onConfirm;
    openModal('modal-confirm');
  }

  function isNonUpgradedCollectible(g) {
    if (!g) return false;
    return !g.upgraded && !g.crafted && !isBasicNonUpgradable(g);
  }

  function renderInventory() {
    const grid = $('inventory-grid');
    const raw = (state.user?.inventory || []).filter((g) => {
      if (state.invFilter === 'upgraded') return Boolean(g.upgraded || g.crafted);
      if (state.invFilter === 'regular') return !g.upgraded && !g.crafted;
      if (state.invFilter === 'crafted') return Boolean(g.crafted);
      return true;
    });

    const sortMode = $('inv-sort-select')?.value || 'newest';
    const activeItems = sortGiftList(raw.filter((g) => !g.withdrawPending && !g.inAuction), sortMode);
    const lockedItems = raw.filter((g) => Boolean(g.withdrawPending || g.inAuction));
    const items = [...activeItems, ...lockedItems];

    if (!items.length) {
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подарков пока нет. Откройте кейс или загляните в магазин!</div>`;
      return;
    }

    grid.innerHTML = '';
    for (const g of items) {
      const isPending = Boolean(g.withdrawPending);
      const isAuction = Boolean(g.inAuction);
      const canWithdraw = !isNonUpgradedCollectible(g);
      const card = document.createElement('div');
      card.className = `gift-card${isPending ? ' is-withdraw-pending' : ''}${isAuction ? ' is-in-auction' : ''}`;
      card.style.background = giftBgStyle(g);

      const ribbonText = g.crafted
        ? `${g.craftTier} #${g.mintNumber}`
        : g.upgraded
          ? `#${g.mintNumber}`
          : isBasicNonUpgradable(g)
            ? 'Подарок'
            : 'Обычный';

      const ribbonClass = g.crafted
        ? `gift-card-ribbon tier-${g.craftTier}`
        : g.upgraded ? 'gift-card-ribbon' : 'gift-card-ribbon regular';

      if (isPending) {
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="gift-wd-badge">Ожидает вывод</span>
          <div class="gift-wd-overlay"><div class="gift-wd-spinner"></div></div>
          <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">${starIconHtml(13)} ${formatStars(g.value)}</div>
        `;
      } else if (isAuction) {
        const qPos = Number(g.auctionQueuePos || 0);
        const aucLabel = qPos > 0 ? `В аукционе (очередь #${qPos})` : 'Подарок в аукционе';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="${ribbonClass}">${esc(ribbonText)}</span>
          <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">${starIconHtml(13)} ${formatStars(g.value)}</div>
          <div class="inv-auction-badge">${esc(aucLabel)}</div>
        `;
      } else {
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="${ribbonClass}">${esc(ribbonText)}</span>
          <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">${starIconHtml(13)} ${formatStars(g.value)}</div>
          <div class="gift-card-actions-mini">
            <button type="button" class="mini-btn sell" data-act="sell">Продать</button>
            ${canWithdraw ? '<button type="button" class="mini-btn withdraw" data-act="withdraw">Вывести</button>' : ''}
          </div>
        `;
      }

      card.addEventListener('click', (e) => {
        if (!isPending && !isAuction) {
          const actBtn = e.target.closest('[data-act]');
          if (actBtn) {
            e.stopPropagation();
            if (actBtn.dataset.act === 'sell') {
              openGiftConfirmModal(g, 'sell', () => sellGift(g.uid));
            } else if (actBtn.dataset.act === 'withdraw' && canWithdraw) {
              openGiftConfirmModal(g, 'withdraw', () => withdrawGift(g.uid));
            }
            return;
          }
        }
        openTelegramGiftModal(g);
      });

      grid.appendChild(card);
    }
  }

  // ======================== FULL-SCREEN TELEGRAM GIFT VIEWER ========================
  function openTelegramGiftModal(g) {
    state.currentGift = g;
    const hero = $('tg-gift-hero');
    hero.style.background = giftBgStyle(g);

    const patLayer = $('tg-gift-pattern-layer');
    patLayer.innerHTML = '';
    if ((g.upgraded || g.crafted) && g.symbol?.image) {
      const coords = [
        [10, 14, -14], [26, 8, 12], [74, 10, -10], [88, 22, 18],
        [8, 44, 15], [22, 34, -8], [78, 36, 10], [90, 52, -16],
        [12, 74, -12], [28, 66, 16], [72, 68, -14], [86, 80, 12],
        [44, 12, 8], [56, 84, -10]
      ];
      for (const [x, y, rot] of coords) {
        const img = document.createElement('img');
        img.src = g.symbol.image;
        img.className = 'tg-pattern-icon';
        img.style.left = `${x}%`;
        img.style.top = `${y}%`;
        img.style.transform = `rotate(${rot}deg)`;
        img.onerror = () => img.remove();
        patLayer.appendChild(img);
      }
    }

    const tierRibbon = $('tg-gift-tier-ribbon');
    if (g.crafted && g.craftTier) {
      tierRibbon.innerHTML = `${tgIcon('hammer', 12)} ${esc(g.craftTier)} Craft`;
      tierRibbon.className = `tg-gift-tier-ribbon tier-${g.craftTier}`;
    } else {
      tierRibbon.className = 'tg-gift-tier-ribbon hidden';
    }

    $('tg-gift-img').src = g.image;
    $('tg-gift-img').classList.remove('hidden');
    $('tg-gift-lottie').classList.add('hidden');
    if (state.giftLottie) {
      state.giftLottie.destroy();
      state.giftLottie = null;
    }
    // Automatically play the real Telegram Lottie/TGS animation for every NFT gift on open/win!
    mountGiftLottie('modal-gift', $('tg-gift-lottie'), $('tg-gift-img'), g);

    $('tg-gift-art-wrap').onclick = () => {
      const anim = activeGiftLotties.get('modal-gift');
      if (!anim) return;
      haptic('light');
      anim.goToAndPlay(0, true);
    };

    $('tg-gift-title').textContent = giftDisplayName(g);
    $('tg-gift-subtitle').textContent = g.crafted
      ? `Скрафченный коллекционный #${g.mintNumber}`
      : g.upgraded
        ? `Коллекционный подарок #${g.mintNumber}`
        : isBasicNonUpgradable(g)
          ? 'Обычный подарок'
          : 'Подарок • можно улучшить за 25 звёзд';

    const ownerName = [state.user.firstName, state.user.lastName].filter(Boolean).join(' ');
    const rows = [
      { k: 'Владелец', v: esc(ownerName) },
      { k: 'Коллекция', v: esc(g.collectionName) }
    ];

    if (g.upgraded || g.crafted) {
      rows.push({
        k: 'Модель',
        v: `${esc(g.model?.name || 'Unique')} <span class="rarity-pill">${g.model?.rarity || 1}%</span>`
      });
      const bgTonTag = Number(g.backdrop?.floorTon) >= 2
        ? ` <span class="ton-market-badge">${g.backdrop.floorTon} TON</span>`
        : '';
      rows.push({
        k: 'Фон',
        v: `<span class="trait-dot" style="background:${esc(g.backdrop?.center || '#2ea6ff')}"></span>${esc(g.backdrop?.name || 'Classic')} <span class="rarity-pill">${g.backdrop?.rarity || 1.5}%</span>${bgTonTag}`
      });
      if (g.symbol?.name) {
        rows.push({
          k: 'Узор',
          v: `${esc(g.symbol.name)} <span class="rarity-pill">${g.symbol.rarity || 0.5}%</span>`
        });
      }
    } else {
      rows.push({
        k: 'Тип',
        v: isBasicNonUpgradable(g)
          ? '<span class="rarity-pill">Обычный подарок</span>'
          : '<span class="rarity-pill">Доступно улучшение</span>'
      });
    }

    const tonApprox = g.marketTon
      ? Number(g.marketTon).toFixed(2)
      : (Math.max(0.5, (g.value || 25) / Math.max(1, state.marketPricing?.starsPerTon || 100))).toFixed(2);
    rows.push({
      k: 'Цена (MRKT)',
      v: `<span style="color:var(--gold)">${starIconHtml(13)} ${formatStars(g.value)}</span> <span class="ton-market-badge">~${tonApprox} TON</span>`
    });

    $('tg-traits-table').innerHTML = rows
      .map((r) => `<div class="trait-row"><span class="trait-key">${r.k}</span><span class="trait-val">${r.v}</span></div>`)
      .join('');

    const actions = $('tg-gift-actions');
    actions.innerHTML = '';

    if (g.withdrawPending) {
      $('tg-gift-subtitle').textContent = 'Ожидает вывод • заявка отправлена администратору';
      const cancelWdBtn = document.createElement('button');
      cancelWdBtn.className = 'tg-btn tg-btn-danger tg-btn-lg';
      cancelWdBtn.textContent = 'Отменить вывод';
      cancelWdBtn.onclick = async () => {
        cancelWdBtn.disabled = true;
        await cancelWithdrawGift(g.uid);
        closeModal('modal-gift');
      };
      actions.appendChild(cancelWdBtn);
      openModal('modal-gift');
      return;
    }

    if (g.inAuction) {
      const qPos = Number(g.auctionQueuePos || 0);
      $('tg-gift-subtitle').textContent = qPos > 0
        ? `Подарок в аукционе (в очереди #${qPos})`
        : 'Подарок в аукционе • ожидает первой ставки';
      const cancelAucBtn = document.createElement('button');
      cancelAucBtn.className = 'tg-btn tg-btn-danger tg-btn-lg';
      cancelAucBtn.textContent = 'Снять подарок с аукциона';
      cancelAucBtn.onclick = async () => {
        cancelAucBtn.disabled = true;
        await cancelP2pAuctionLot({ uid: g.uid });
        closeModal('modal-gift');
      };
      actions.appendChild(cancelAucBtn);
      openModal('modal-gift');
      return;
    }

    if (!g.upgraded && !isBasicNonUpgradable(g)) {
      const upgBtn = document.createElement('button');
      upgBtn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      upgBtn.innerHTML = `${tgIcon('sparkle', 15)} Улучшить за 25 ${starIconHtml(15)}`;
      upgBtn.onclick = () => {
        closeModal('modal-gift');
        openUpgradeModal(g);
      };
      actions.appendChild(upgBtn);
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'tg-gift-actions-row';

    const sellBtn = document.createElement('button');
    sellBtn.className = 'tg-btn tg-btn-gold';
    sellBtn.innerHTML = `Продать (${formatStars(g.value)} ${starIconHtml(13)})`;
    sellBtn.onclick = () => {
      openGiftConfirmModal(g, 'sell', async () => {
        await sellGift(g.uid);
        closeModal('modal-gift');
      });
    };

    rowDiv.appendChild(sellBtn);
    if (!isNonUpgradedCollectible(g)) {
      const wdBtn = document.createElement('button');
      wdBtn.className = 'tg-btn tg-btn-secondary';
      wdBtn.innerHTML = 'Вывести';
      wdBtn.onclick = () => {
        openGiftConfirmModal(g, 'withdraw', async () => {
          await withdrawGift(g.uid);
          closeModal('modal-gift');
        });
      };
      rowDiv.appendChild(wdBtn);
    } else {
      rowDiv.classList.add('single-action');
    }
    actions.appendChild(rowDiv);

    openModal('modal-gift');
  }

  async function refreshUserSilently() {
    try {
      const me = await api('/api/me');
      if (me?.user) {
        if (!isAnyGameAnimating()) applyServerUser(me.user);
      }
    } catch {}
  }

  async function sellGift(uid) {
    try {
      const res = await api('/api/gifts/sell', { method: 'POST', body: { uid } });
      state.user = res.user;
      renderUser();
      haptic('success');
      showToast(`Продано за +${formatStars(res.soldFor)} звёзд`, 'gold');
    } catch (e) {
      showToast(e.message, 'error');
      refreshUserSilently();
    }
  }

  async function withdrawGift(uid) {
    try {
      const res = await api('/api/gifts/withdraw', { method: 'POST', body: { uid } });
      state.user = res.user;
      renderUser();
      haptic('success');
      showToast(res.message || 'Заявка на вывод отправлена! Ожидайте подтверждения.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      refreshUserSilently();
    }
  }

  async function cancelWithdrawGift(uid) {
    try {
      const res = await api('/api/gifts/withdraw/cancel', { method: 'POST', body: { uid } });
      state.user = res.user;
      renderUser();
      haptic('light');
      showToast(res.message || 'Вывод отменён, подарок возвращён', 'info');
    } catch (e) {
      showToast(e.message, 'error');
      refreshUserSilently();
    }
  }

  // ======================== SMOOTH TELEGRAM UPGRADE (GRADIENT CROSSFADE + LEFT->RIGHT REEL + TOP->BOTTOM TRAIT SCROLL) ========================
  function setSlotInstant(slotId, html) {
    const box = $(slotId);
    if (!box) return;
    box.innerHTML = `<span class="trait-scroll-item trait-scroll-active">${html}</span>`;
  }

  function scrollSlotDown(slotId, html) {
    const box = $(slotId);
    if (!box) return;
    const prev = box.querySelector('.trait-scroll-active');
    const next = document.createElement('span');
    next.className = 'trait-scroll-item trait-scroll-enter';
    next.innerHTML = html;
    box.appendChild(next);

    // Force layout then smoothly slide top -> bottom!
    void next.offsetHeight;
    if (prev) {
      prev.classList.remove('trait-scroll-active');
      prev.classList.add('trait-scroll-exit');
      setTimeout(() => prev.remove(), 260);
    }
    next.classList.remove('trait-scroll-enter');
    next.classList.add('trait-scroll-active');
  }

  function renderUpgradePattern(symbolImg) {
    const layer = $('upg-pattern-layer');
    if (!layer) return;
    if (!symbolImg) {
      layer.innerHTML = '';
      return;
    }
    const coords = [
      [10, 14, -14], [26, 8, 12], [74, 10, -10], [88, 22, 18],
      [8, 46, 15], [22, 34, -8], [78, 36, 10], [90, 52, -16],
      [12, 76, -12], [30, 68, 16], [70, 68, -14], [86, 80, 12]
    ];
    layer.innerHTML = coords
      .map(([x, y, rot]) => `<img class="tg-pattern-icon" src="${esc(symbolImg)}" style="left:${x}%;top:${y}%;transform:rotate(${rot}deg)" alt="" onerror="this.remove()" />`)
      .join('');
  }

  function openUpgradeModal(g) {
    state.upgradeTargetGift = g;
    state.upgradeSkipFn = null;
    state.upgradeDoneGift = null;

    $('upg-bg-a').style.background = 'radial-gradient(circle at 50% 45%, #2b4463 0%, #17212b 78%)';
    $('upg-bg-a').style.opacity = '1';
    $('upg-bg-b').style.opacity = '0';
    renderUpgradePattern('');

    // Put single centered item in reel before spinning
    const strip = $('upg-reel-strip');
    const pinned = $('upg-pinned-winner');
    pinned.classList.add('hidden');
    strip.classList.add('idle');
    strip.style.transition = 'none';
    strip.style.opacity = '1';
    strip.style.transform = 'translate3d(0, 0, 0)';
    strip.innerHTML = `<div class="upg-reel-item"><img src="${esc(g.image)}" alt="" /></div>`;

    const ownerName = [state.user?.firstName, state.user?.lastName].filter(Boolean).join(' ') || 'Вы';
    $('upg-owner-name').textContent = ownerName;
    $('upg-mint-caption').classList.add('hidden');
    $('upgrade-collection-caption').textContent = g.collectionName;

    setSlotInstant('upg-slot-model', '<span style="color:var(--muted)">Случайная</span>');
    setSlotInstant('upg-slot-symbol', '<span style="color:var(--muted)">Случайный</span>');
    setSlotInstant('upg-slot-backdrop', '<span style="color:var(--muted)">Случайный</span>');
    setSlotInstant('upg-slot-mint', '<span style="color:var(--muted)">Новый #</span>');

    $('upgrade-confirm-btn').disabled = false;
    $('upgrade-confirm-btn').className = 'tg-btn tg-btn-primary tg-btn-lg';
    $('upgrade-confirm-btn').innerHTML = `${tgIcon('sparkle', 15)} Улучшить за 25 ${starIconHtml(15)}`;
    $('upg-modal-close').disabled = false;
    openModal('modal-upgrade');
  }

  async function handleUpgradeConfirm() {
    // 1. If animation is currently running, button acts as "Пропустить" (Skip -> instant finish!)
    if (state.upgrading && state.upgradeSkipFn) {
      state.upgradeSkipFn();
      return;
    }

    // 2. If animation finished, button acts as "ОК" (closes upgrade & shows full NFT modal)
    if (state.upgradeDoneGift) {
      const finished = state.upgradeDoneGift;
      state.upgradeDoneGift = null;
      closeModal('modal-upgrade');
      openTelegramGiftModal(finished);
      return;
    }

    const g = state.upgradeTargetGift;
    if (!g || state.upgrading) return;
    state.upgrading = true;
    $('upgrade-confirm-btn').disabled = true;
    $('upg-modal-close').disabled = true;

    try {
      const res = await api('/api/gifts/upgrade', { method: 'POST', body: { uid: g.uid } });
      // Deduct balance IMMEDIATELY when upgrade starts!
      updateDisplayedBalance(res.balanceAfterBet);
      haptic('medium');

      // Switch button to "Пропустить" while animation rolls (exact match to GiftUpdate.mp4!)
      $('upgrade-confirm-btn').disabled = false;
      $('upgrade-confirm-btn').textContent = 'Пропустить';

      await playSmoothTelegramUpgradeAnimation(
        res.gift,
        res.previewModels || [],
        res.previewBackdrops || [],
        res.previewSymbols || []
      );

      state.upgrading = false;
      state.upgradeSkipFn = null;
      state.upgradeDoneGift = res.gift;
      state.user = res.user;
      renderUser();

      $('upg-modal-close').disabled = false;
      $('upgrade-confirm-btn').disabled = false;
      $('upgrade-confirm-btn').textContent = 'ОК';
      showToast(`Улучшено! ${res.gift.collectionName} #${res.gift.mintNumber} (${res.gift.model.name})`, 'success');
    } catch (e) {
      state.upgrading = false;
      state.upgradeSkipFn = null;
      showToast(e.message, 'error');
      $('upgrade-confirm-btn').disabled = false;
      $('upgrade-confirm-btn').innerHTML = `${tgIcon('sparkle', 15)} Улучшить за 25 ${starIconHtml(15)}`;
      $('upg-modal-close').disabled = false;
      refreshUserSilently();
    }
  }

  function playSmoothTelegramUpgradeAnimation(finalGift, previewModels, previewBackdrops, previewSymbols) {
    return new Promise((resolve) => {
      const viewport = $('upg-reel-viewport');
      const strip = $('upg-reel-strip');
      strip.classList.remove('idle');
      const bgA = $('upg-bg-a');
      const bgB = $('upg-bg-b');
      const canvas = $('upgrade-fx-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.clientWidth || 360;
      canvas.height = 230;

      // Dense zero-gap reel driven by a single rAF clock so reel & Model text stay 100% locked in sync!
      // Added extra models (22 total) for a fuller, longer roll; winner is index 0 (last entering from left).
      const itemW = 136;
      const winW = viewport.clientWidth || 360;
      const reelCount = 22;
      const pinned = $('upg-pinned-winner');
      const pinnedImg = $('upg-pinned-winner-img');
      pinned.classList.add('hidden');
      pinnedImg.src = finalGift.image;

      const nonWinnerPool = (previewModels || []).filter((m) => m && m.name !== finalGift.model.name);
      const sourcePool = nonWinnerPool.length ? nonWinnerPool : (previewModels || []);

      const reelModels = [
        { name: finalGift.model.name, rarity: finalGift.model.rarity, image: finalGift.image, isWinner: true }
      ];
      for (let i = 1; i < reelCount; i++) {
        const pm = sourcePool[(i - 1) % Math.max(1, sourcePool.length)] || {
          name: finalGift.model.name,
          rarity: finalGift.model.rarity || 1,
          image: finalGift.image
        };
        reelModels.push({ ...pm, isWinner: false });
      }
      reelModels.forEach((m) => { const im = new Image(); im.src = m.image; });

      strip.style.transition = 'none';
      strip.style.opacity = '1';
      strip.innerHTML = reelModels
        .map((m, idx) => `<div class="upg-reel-item${idx === 0 ? ' is-winner' : ''}"><img src="${esc(m.image)}" alt="" /></div>`)
        .join('');

      const startIdx = reelCount - 2;
      const startCenter = startIdx * itemW + itemW / 2;
      const targetCenter = itemW / 2;
      const startX = Math.round(winW / 2 - startCenter);
      const targetX = Math.round(winW / 2 - targetCenter);
      // Slide departing gifts completely beyond the right edge of the viewport before hiding!
      const exitRightX = Math.round(targetX + winW + itemW * 2.4);

      strip.style.transform = `translate3d(${startX}px, 0, 0)`;
      void strip.offsetWidth;

      let useA = false;
      const timers = [];
      let rafId = null;
      let finished = false;
      let winnerPinned = false;
      let winnerNameShown = false;
      let lastModelIdx = -1;
      let lastModelTickAt = 0;

      function revealWinnerModelName() {
        if (winnerNameShown) return;
        winnerNameShown = true;
        scrollSlotDown('upg-slot-model', `${esc(finalGift.model.name)} <span class="rarity-pill">${finalGift.model.rarity || 1}%</span>`);
        $('upgrade-collection-caption').textContent = finalGift.model.name;
      }

      function applyBackdrop(bg) {
        const gradCss = `radial-gradient(circle at 50% 45%, ${bg.center} 0%, ${bg.edge} 100%)`;
        if (useA) {
          bgA.style.background = gradCss;
          bgA.style.opacity = '1';
          bgB.style.opacity = '0';
        } else {
          bgB.style.background = gradCss;
          bgB.style.opacity = '1';
          bgA.style.opacity = '0';
        }
        useA = !useA;
      }

      // Pin winner dead-center, show winning model name IMMEDIATELY, & slide neighbors completely off-screen at full opacity!
      function pinWinnerAndClearRight(fast = false) {
        if (winnerPinned) return;
        winnerPinned = true;
        strip.style.transition = 'none';
        strip.style.opacity = '1';
        strip.style.visibility = 'visible';
        strip.style.transform = `translate3d(${targetX}px, 0, 0)`;
        void strip.offsetWidth;

        pinned.classList.remove('hidden');
        mountGiftLottie('modal-upgrade', $('upg-pinned-winner-lottie'), pinnedImg, finalGift);
        strip.firstElementChild?.classList.add('winner-picked');
        // Immediately lock in winning model name as soon as the model pins!
        revealWinnerModelName();

        const durMs = fast ? 260 : 720;
        requestAnimationFrame(() => {
          strip.style.transition = `transform ${durMs}ms cubic-bezier(0.22, 0.72, 0.32, 1)`;
          strip.style.transform = `translate3d(${exitRightX}px, 0, 0)`;
        });
        timers.push(setTimeout(() => {
          strip.style.opacity = '0';
          strip.style.visibility = 'hidden';
        }, durMs + 30));
      }

      function finishNow(skipped = false) {
        if (finished) return;
        finished = true;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        timers.forEach(clearTimeout);

        pinWinnerAndClearRight(skipped);

        applyBackdrop(finalGift.backdrop);
        renderUpgradePattern(finalGift.symbol?.image || '');

        revealWinnerModelName();
        scrollSlotDown('upg-slot-backdrop', `<span class="trait-dot" style="background:${esc(finalGift.backdrop.center)}"></span>${esc(finalGift.backdrop.name)} <span class="rarity-pill">${finalGift.backdrop.rarity || 1.5}%</span>`);
        if (finalGift.symbol?.name) {
          scrollSlotDown('upg-slot-symbol', `${esc(finalGift.symbol.name)} <span class="rarity-pill">${finalGift.symbol.rarity || 0.5}%</span>`);
        }
        scrollSlotDown('upg-slot-mint', `<b style="color:var(--gold)">#${finalGift.mintNumber}</b>`);

        $('upg-mint-caption').textContent = `#${finalGift.mintNumber}`;
        $('upg-mint-caption').classList.remove('hidden');

        haptic('success');
        playUpgradeConfettiCanvas(canvas, ctx);
        resolve();
      }

      state.upgradeSkipFn = () => finishNow(true);

      // 1) Backdrop locks early (~1.65s, well before reel finishes)
      const bgTicks = [160, 420, 710, 1020, 1340, 1650];
      bgTicks.forEach((ms, idx) => {
        timers.push(setTimeout(() => {
          if (finished) return;
          const isLock = idx === bgTicks.length - 1;
          const bg = isLock ? finalGift.backdrop : (previewBackdrops[idx % Math.max(1, previewBackdrops.length)] || finalGift.backdrop);
          applyBackdrop(bg);
          scrollSlotDown('upg-slot-backdrop', `<span class="trait-dot" style="background:${esc(bg.center)}"></span>${esc(bg.name)} <span class="rarity-pill">${bg.rarity || 1.5}%</span>`);
        }, ms));
      });

      // 2) Symbol/Pattern locks second (~2.35s, before reel finishes)
      const symTicks = [220, 560, 940, 1360, 1840, 2350];
      symTicks.forEach((ms, idx) => {
        timers.push(setTimeout(() => {
          if (finished) return;
          const isLock = idx === symTicks.length - 1;
          const sym = isLock ? finalGift.symbol : (previewSymbols[idx % Math.max(1, previewSymbols.length)] || finalGift.symbol);
          if (sym?.name) {
            renderUpgradePattern(sym.image || '');
            scrollSlotDown('upg-slot-symbol', `${esc(sym.name)} <span class="rarity-pill">${sym.rarity || 0.5}%</span>`);
          }
        }, ms));
      });

      // 3) Single rAF reel loop (3.45s): moves reel smoothly & updates Model text STRICTLY from the model currently at center!
      const rollDuration = 3450;
      const totalDist = targetX - startX;
      let startTime = null;

      function tickReel(now) {
        if (finished) return;
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / rollDuration);

        // Smooth deceleration that keeps moving visibly right until the winner lands dead-center
        const ease = 1 - Math.pow(1 - t, 1.85);
        const curX = startX + totalDist * ease;
        strip.style.transform = `translate3d(${curX.toFixed(2)}px, 0, 0)`;

        // Determine exact model currently passing dead-center
        const centerIdx = Math.max(0, Math.min(reelCount - 1, Math.round((winW / 2 - curX - itemW / 2) / itemW)));
        if (centerIdx === 0 && !winnerNameShown) {
          lastModelIdx = 0;
          revealWinnerModelName();
          haptic('medium');
        } else if (centerIdx > 0 && centerIdx !== lastModelIdx && (now - lastModelTickAt >= 145 || centerIdx <= 3)) {
          lastModelIdx = centerIdx;
          lastModelTickAt = now;
          const mdl = reelModels[centerIdx];
          if (mdl) {
            scrollSlotDown('upg-slot-model', `${esc(mdl.name)} <span class="rarity-pill">${mdl.rarity || 1}%</span>`);
            haptic('light');
          }
        }

        if (t >= 1) {
          // Winner reached dead-center -> pin immediately, lock final Model text, slide right neighbors out!
          finishNow(false);
          return;
        }
        rafId = requestAnimationFrame(tickReel);
      }

      rafId = requestAnimationFrame(tickReel);
    });
  }

  function playUpgradeConfettiCanvas(canvas, ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const colors = ['#2ea6ff', '#f59e0b', '#22c55e', '#ec4899', '#a855f7', '#fde047', '#ffffff'];
    const parts = [];
    for (let i = 0; i < 65; i++) {
      parts.push({
        x: Math.random() * w,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 3.4,
        vy: 2.2 + Math.random() * 4.2,
        w: 4 + Math.random() * 5,
        h: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        life: 1,
        col: colors[i % colors.length]
      });
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rot += p.vrot;
        if (p.y > h * 0.72) p.life -= 0.035;
        if (p.life > 0 && p.y < h + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  // ======================== REAL GIFT CRAFTING (1.5x .. 3.0x OF TOTAL SUM + 3D GLASS CUBE) ========================
  let craftPreviewReqSeq = 0;

  function renderCraftedShowcase(pool = null, totalSum = 0) {
    const box = $('crafted-showcase');
    if (!box) return;
    const list = Array.isArray(pool) ? pool : [];
    const headTitle = box.closest('.tg-card')?.querySelector('.card-title');
    if (headTitle) {
      headTitle.textContent = totalSum > 0
        ? `Возможные призы (от x1.5 до x3 от ${formatStars(totalSum)})`
        : 'Возможные подарки крафта (x1.5 – x3)';
    }
    box.innerHTML = '';

    if (!list.length) {
      box.innerHTML = '<div class="promo-empty-msg" style="grid-column:1/-1">Выберите от 1 до 4 подарков сверху — появятся доступные подарки дороже (от x1.5 до x3 от суммы)</div>';
      return;
    }

    for (const c of list) {
      const card = document.createElement('div');
      card.className = 'crafted-mini-card';
      card.style.background = `radial-gradient(circle at 50% 35%, ${c.center || '#1e3a5f'} 0%, ${c.edge || '#0f1d2e'} 100%)`;
      const multCls = c.actualMult >= 2.7 ? 'is-legendary' : (c.actualMult >= 2.0 ? 'is-rare' : '');
      card.innerHTML = `
        <img src="${esc(c.image)}" alt="${esc(c.collectionName)}" loading="lazy" />
        <div class="crafted-mini-name">${esc(c.collectionName)}</div>
        <div class="crafted-mini-price">${starIconHtml(12)} ${formatStars(c.price)}</div>
        <span class="crafted-mini-mult ${multCls}">x${Number(c.actualMult || 1.5).toFixed(2)}</span>
        <div class="crafted-mini-chance">Шанс: ${c.chance}%</div>
      `;
      box.appendChild(card);
    }
  }

  async function loadCraftRewardPreview(totalSum) {
    const reqId = ++craftPreviewReqSeq;
    if (!totalSum || totalSum <= 0) {
      renderCraftedShowcase([], 0);
      return;
    }
    try {
      const res = await api('/api/craft/preview', {
        method: 'POST',
        body: { totalValue: totalSum }
      });
      if (reqId !== craftPreviewReqSeq) return;
      renderCraftedShowcase(res.pool || [], totalSum);
    } catch {}
  }

  const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));

  function clearCraftCubeFaces() {
    const cube = $('craft-cube');
    if (cube) cube.classList.remove('cube-loss', 'cube-win');
    const ids = ['cube-face-front', 'cube-face-back', 'cube-face-right', 'cube-face-left', 'cube-face-top', 'cube-face-bottom'];
    ids.forEach((fid) => {
      const el = $(fid);
      if (!el) return;
      el.className = `cube-face ${fid.replace('cube-', '')}`;
      el.style.background = '';
      el.innerHTML = '';
    });
  }

  function resetCraftHeroToIdle() {
    state.craftResultShown = false;
    const hero = $('craft-hero');
    const cube = $('craft-cube');
    hero.className = 'craft-hero';
    $('craft-anim-rays').classList.add('hidden');
    $('craft-lost-row').classList.add('hidden');
    $('craft-lost-row').innerHTML = '';
    $('craft-reset-btn').classList.add('hidden');
    $('craft-submit-btn').classList.remove('hidden');
    $('craft-warning').classList.remove('hidden');
    $('craft-chance-value').classList.remove('hidden');
    $('craft-status-title').classList.add('hidden');
    $('craft-status-sub').textContent = 'Шанс успеха';

    const slotsWrap = $('craft-slots');
    slotsWrap.classList.remove('slots-collapsed');
    slotsWrap.querySelectorAll('.craft-slot').forEach((s) => s.classList.remove('slot-vanished'));

    clearCraftCubeFaces();
    cube.style.transition = 'none';
    cube.style.transform = '';
    cube.classList.add('idle-spin');
  }

  function renderCraftSlots() {
    const filled = state.craftSlots.filter(Boolean);
    const count = filled.length;
    const chance = CRAFT_CHANCES[count] || 0;
    const totalSum = filled.reduce((acc, g) => acc + (Number(g.value) || 0), 0);

    loadCraftRewardPreview(totalSum);

    $('craft-collection-pill').innerHTML = totalSum > 0
      ? `Сумма: ${formatStars(totalSum)} ${starIconHtml(12)}`
      : 'Выберите подарки';
    $('craft-chance-value').textContent = `${chance}%`;

    const submitBtn = $('craft-submit-btn');
    submitBtn.disabled = count === 0 || state.crafting;
    submitBtn.innerHTML = `${tgIcon('hammer', 15)} Изготовить • ${chance}%`;

    const pctAdds = ['+8%', '+16%', '+28%', '+33%'];
    document.querySelectorAll('.craft-slot').forEach((slotBtn, idx) => {
      const g = state.craftSlots[idx];
      if (g) {
        slotBtn.classList.add('filled');
        slotBtn.style.background = giftBgStyle(g);
        slotBtn.innerHTML = `
          <span class="slot-remove">${tgIcon('x', 11)}</span>
          <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
          <span class="slot-label">${formatStars(g.value)}</span>
        `;
      } else {
        slotBtn.classList.remove('filled');
        slotBtn.style.background = '';
        slotBtn.innerHTML = `
          <span class="slot-plus">+</span>
          <span class="slot-pct">${pctAdds[idx]}</span>
        `;
      }
    });

    const attrBox = $('craft-attr-preview');
    if (count >= 1 && !state.crafting && !state.craftResultShown) {
      attrBox.innerHTML = `
        <span class="attr-pill">${starIconHtml(12)} Сумма: ${formatStars(totalSum)}</span>
        <span class="attr-pill">${tgIcon('trend', 12)} Призы: x1.5 – x3.0</span>
      `;
      attrBox.classList.remove('hidden');
    } else {
      attrBox.classList.add('hidden');
    }
  }

  function openCraftPicker() {
    const filled = state.craftSlots.filter(Boolean);
    const usedUids = new Set(filled.map((g) => g.uid));

    const renderCraftGrid = () => {
      const typeF = $('craft-pick-type')?.value || 'all';
      const sortM = $('craft-pick-sort')?.value || 'price_desc';
      const base = (state.user?.inventory || []).filter((g) => !usedUids.has(g.uid) && !g.withdrawPending && !g.inAuction);
      const eligible = sortGiftList(filterInventoryByType(base, typeF), sortM);

      $('craft-picker-hint').textContent = 'Выберите любой подарок — при успехе выпадет более дорогой (от x1.5 до x3 от общей суммы)';

      const grid = $('craft-picker-grid');
      if (!eligible.length) {
        grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 8px">Нет подходящих подарков для крафта.</div>`;
      } else {
        grid.innerHTML = '';
        for (const g of eligible) {
          const card = document.createElement('div');
          card.className = 'gift-card';
          card.style.background = giftBgStyle(g);
          const ribbonText = g.crafted ? `${g.craftTier} #${g.mintNumber}` : g.upgraded ? `#${g.mintNumber}` : 'Обычный';
          const ribbonClass = g.crafted ? `gift-card-ribbon tier-${g.craftTier}` : g.upgraded ? 'gift-card-ribbon' : 'gift-card-ribbon regular';
          card.innerHTML = `
            ${buildCardSymbolPattern(g)}
            <span class="${ribbonClass}">${esc(ribbonText)}</span>
            <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
            <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
            <div class="gift-card-val">${starIconHtml(11)} ${formatStars(g.value)}</div>
          `;
          card.onclick = () => {
            state.craftSlots[state.craftPickerSlot] = g;
            closeModal('modal-craft-picker');
            renderCraftSlots();
            haptic('light');
          };
          grid.appendChild(card);
        }
      }
    };
    if ($('craft-pick-type')) $('craft-pick-type').onchange = renderCraftGrid;
    if ($('craft-pick-sort')) $('craft-pick-sort').onchange = renderCraftGrid;
    renderCraftGrid();
    openModal('modal-craft-picker');
  }

  // White broken-gift SVG icon (matches Screenshot 14!)
  function brokenGiftSvg(count) {
    return `
      <div class="broken-gift-icon">
        <svg width="46" height="46" viewBox="0 0 64 64" fill="none">
          <path d="M18 22C14 22 12 19 12 16C12 12.5 15 10 18.5 10C22.5 10 26.5 14 29 19H21L18 22Z" fill="#ffffff"/>
          <path d="M46 22C50 22 52 19 52 16C52 12.5 49 10 45.5 10C41.5 10 37.5 14 35 19H43L46 22Z" fill="#ffffff"/>
          <path d="M10 24H29L25 34L30 41L26 54H13C11.3 54 10 52.7 10 51V24Z" fill="#ffffff"/>
          <path d="M35 24H54V51C54 52.7 52.7 54 51 54H33L37 41L32 34L35 24Z" fill="#ffffff"/>
        </svg>
        <span class="broken-gift-count">-${count}</span>
        <span class="broken-gift-label">Неудача</span>
      </div>
    `;
  }

  // Smooth GPU fly-clone from slot button directly onto the 3D cube center!
  function flyGiftFromSlotToCube(slotEl, imageSrc, durationMs) {
    return new Promise((resolve) => {
      const fromRect = slotEl.getBoundingClientRect();
      const toRect = $('craft-cube-stage').getBoundingClientRect();

      const ghost = document.createElement('img');
      ghost.src = imageSrc;
      ghost.className = 'craft-fly-ghost';
      const size = Math.min(64, fromRect.width || 56);
      ghost.style.width = `${size}px`;
      ghost.style.height = `${size}px`;
      ghost.style.left = `${fromRect.left + (fromRect.width - size) / 2}px`;
      ghost.style.top = `${fromRect.top + (fromRect.height - size) / 2}px`;
      ghost.style.transform = 'translate3d(0, 0, 0) scale(1)';
      ghost.style.opacity = '1';
      document.body.appendChild(ghost);

      const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
      const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

      // Vanish the slot right as its NFT launches into the cube!
      slotEl.classList.add('slot-vanished');

      void ghost.offsetWidth;
      requestAnimationFrame(() => {
        ghost.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 0.85, 0.3, 1), opacity ${Math.round(durationMs * 0.35)}ms ease ${Math.round(durationMs * 0.72)}ms`;
        ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.25)`;
        ghost.style.opacity = '0';
      });

      setTimeout(() => {
        ghost.remove();
        resolve();
      }, durationMs + 30);
    });
  }

  async function handleCraftSubmit() {
    // Preserve exact slot index + gift pairs for flying animation!
    const entries = state.craftSlots
      .map((gift, slotIdx) => (gift ? { gift, slotIdx } : null))
      .filter(Boolean);
    if (!entries.length || state.crafting) return;

    state.crafting = true;
    $('craft-submit-btn').disabled = true;

    try {
      const res = await api('/api/gifts/craft', {
        method: 'POST',
        body: { uids: entries.map((e) => e.gift.uid) }
      });

      SoundFX.glass();
      await playInline3DCraftAnimation(entries, res);

      state.craftSlots = [null, null, null, null];
      await flushAndApplyUser(res.feedToken, res.user);
      state.crafting = false;

      if (res.success && res.resultGift) {
        SoundFX.bigWin();
        // Brief emerald celebration, then open full NFT viewer and restore slots cleanly!
        setTimeout(() => {
          resetCraftHeroToIdle();
          renderCraftSlots();
          openTelegramGiftModal(res.resultGift);
        }, 1350);
      } else {
        SoundFX.lose();
      }
    } catch (e) {
      state.crafting = false;
      resetCraftHeroToIdle();
      await refreshUserSilently();
      renderCraftSlots();
      showToast(e.message, 'error');
    }
  }

  async function playInline3DCraftAnimation(entries, res) {
    const hero = $('craft-hero');
    const cube = $('craft-cube');
    const rays = $('craft-anim-rays');
    const slotsWrap = $('craft-slots');
    const lostRow = $('craft-lost-row');
    const titleEl = $('craft-status-title');
    const subEl = $('craft-status-sub');
    const chanceVal = $('craft-chance-value');

    state.craftResultShown = true;
    hero.className = 'craft-hero';
    rays.classList.add('hidden');
    lostRow.classList.add('hidden');
    lostRow.innerHTML = '';
    $('craft-attr-preview').classList.add('hidden');
    $('craft-submit-btn').classList.add('hidden');
    $('craft-warning').classList.add('hidden');

    // Stop idle spin & prepare all 6 cube faces for RANDOM unoccupied selection!
    // landRx / landRy are the exact flat front-facing cube angles for landing on each face.
    clearCraftCubeFaces();
    cube.classList.remove('idle-spin');
    void cube.offsetWidth;

    const availableFaces = [
      { id: 'cube-face-front',  rx: -10, ry: 0,    landRx: 0,   landRy: 0 },
      { id: 'cube-face-right',  rx: -10, ry: -90,  landRx: 0,   landRy: -90 },
      { id: 'cube-face-back',   rx: -10, ry: -180, landRx: 0,   landRy: -180 },
      { id: 'cube-face-left',   rx: -10, ry: 90,   landRx: 0,   landRy: 90 },
      { id: 'cube-face-top',    rx: -90, ry: 0,    landRx: -90, landRy: 0 },
      { id: 'cube-face-bottom', rx: 90,  ry: 0,    landRx: 90,  landRy: 0 }
    ];
    const occupiedFaces = [];
    const slotBtns = Array.from(document.querySelectorAll('.craft-slot'));

    // Phase 1: Slightly calmer, smooth turns to RANDOM unoccupied faces while NFTs land on them!
    // Unoccupied faces stay COMPLETELY EMPTY (empty face = loss!).
    subEl.textContent = 'Загрузка NFT в куб...';
    for (let k = 0; k < entries.length; k++) {
      const { gift, slotIdx } = entries[k];
      const slotEl = slotBtns[slotIdx];

      // Pick a RANDOM face that has NOT been occupied yet
      const pickIdx = Math.floor(Math.random() * availableFaces.length);
      const targetFace = availableFaces.splice(pickIdx, 1)[0];
      occupiedFaces.push(targetFace);

      // Slightly slower, smooth placement cadence
      const rotMs = 210 + k * 28;
      const flyMs = 225 + k * 30;

      cube.style.transition = `transform ${rotMs}ms cubic-bezier(0.22, 0.86, 0.32, 1)`;
      cube.style.transform = `rotateX(${targetFace.rx}deg) rotateY(${targetFace.ry}deg)`;
      await waitMs(Math.max(95, rotMs - 75));

      // Fly NFT from slot -> random unoccupied cube face (slot vanishes on launch)
      await flyGiftFromSlotToCube(slotEl, gift.image, flyMs);

      // Attach NFT artwork onto this face inside a front-facing wrapper (backface-visibility: hidden -> NEVER visible through empty back faces!)
      const fEl = $(targetFace.id);
      fEl.classList.add('face-filled');
      fEl.innerHTML = `<div class="cube-face-art"><img src="${esc(gift.image)}" alt="" /></div>`;
      haptic('light');
      await waitMs(75 + k * 18);
    }

    // Hide any remaining empty slots smoothly while the roll plays
    slotBtns.forEach((s) => s.classList.add('slot-vanished'));
    await waitMs(90);
    slotsWrap.classList.add('slots-collapsed');

    // DO NOT fill empty faces! Empty faces remain transparent glass — landing on one means LOSS!
    const landingFace = (res.success && res.resultGift)
      ? occupiedFaces[Math.floor(Math.random() * occupiedFaces.length)]
      : availableFaces[Math.floor(Math.random() * availableFaces.length)];

    // Phase 2: One smooth 60FPS GPU 3D roll landing flat on landingFace!
    // Zero early spoilers: fail/success overlay fades in smoothly via opacity ONLY as the face is about to land!
    subEl.textContent = `Вероятность успеха ${res.chance}%`;
    haptic('medium');

    const finalX = 720 + landingFace.landRx;
    const finalY = -1080 + landingFace.landRy;
    requestAnimationFrame(() => {
      cube.style.transition = 'transform 2.30s cubic-bezier(0.14, 0.88, 0.22, 1)';
      cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg) scale(1.06)`;
    });

    // Smooth opacity fade-in right as the landing face settles into view (~1720ms of 2300ms)
    setTimeout(() => {
      const faceEl = $(landingFace.id);
      if (!faceEl) return;
      const overlay = document.createElement('div');
      if (res.success && res.resultGift) {
        cube.classList.add('cube-win');
        faceEl.classList.add('success-face');
        overlay.className = 'cube-reveal-overlay success-reveal';
        overlay.style.background = giftBgStyle(res.resultGift);
        overlay.innerHTML = `<img src="${esc(res.resultGift.image)}" alt="" />`;
        faceEl.appendChild(overlay);
        void overlay.offsetWidth;
        requestAnimationFrame(() => overlay.classList.add('is-visible'));
      } else {
        // On loss: DO NOT flash a single face red — put ONLY icon + text on the face,
        // remove all NFTs from every cube face, and smoothly tint the entire cube red!
        overlay.className = 'cube-reveal-overlay fail-reveal';
        overlay.innerHTML = brokenGiftSvg(res.burnedCount);
        faceEl.appendChild(overlay);
        void overlay.offsetWidth;
        requestAnimationFrame(() => {
          overlay.classList.add('is-visible');
          cube.classList.add('cube-loss');
        });
        setTimeout(() => {
          const allFaceIds = ['cube-face-front', 'cube-face-back', 'cube-face-right', 'cube-face-left', 'cube-face-top', 'cube-face-bottom'];
          allFaceIds.forEach((fid) => {
            const f = $(fid);
            if (!f) return;
            f.classList.remove('face-filled');
            f.querySelectorAll('.cube-face-art, :scope > img').forEach((el) => el.remove());
          });
        }, 460);
      }
    }, 1720);

    await waitMs(2360);

    // Phase 3: Show inline result right here!
    chanceVal.classList.add('hidden');
    titleEl.classList.remove('hidden');

    if (res.success && res.resultGift) {
      hero.className = 'craft-hero state-success';
      rays.classList.remove('hidden');
      titleEl.innerHTML = `${tgIcon('hammer', 16)} Изготовление`;
      subEl.textContent = `${giftDisplayName(res.resultGift)} #${res.resultGift.mintNumber}`;
      haptic('success');
      showToast(`Успешный крафт: ${giftDisplayName(res.resultGift)} #${res.resultGift.mintNumber}!`, 'gold');
    } else {
      hero.className = 'craft-hero state-fail';
      titleEl.textContent = 'Неудачная попытка';
      const n = res.burnedCount;
      const word = n === 1 ? 'подарок утрачен' : 'подарка утрачены';
      subEl.textContent = `Попытка изготовления не удалась. ${n} ${word}.`;

      const burned = res.burnedGifts || entries.map((e) => e.gift);
      lostRow.innerHTML = burned.map((bg) => `
        <div class="craft-lost-card">
          <span class="craft-lost-ribbon">#${bg.mintNumber}</span>
          <img src="${esc(bg.image)}" alt="" />
        </div>
      `).join('');
      lostRow.classList.remove('hidden');
      $('craft-reset-btn').classList.remove('hidden');
      haptic('error');
      showToast(`Крафт не удался — утрачено ${n} шт.`, 'error');
    }
  }

  // ======================== GAME 1: CRASH ENGINE (ROCKET IN CENTER -> EXPLOSION) ========================
  function setCrashVisual(phase) {
    const stage = $('crash-stage');
    const multEl = $('crash-multiplier');
    const pill = $('crash-status-pill');
    const rocketEl = $('crash-rocket');
    const boomEl = $('crash-explosion');

    stage.classList.remove('crashed');
    multEl.classList.remove('flying', 'crashed');
    rocketEl.classList.remove('flying');

    if (phase === 'waiting') {
      pill.textContent = 'Приём ставок...';
      multEl.textContent = '1.00x';
      rocketEl.classList.remove('hidden');
      boomEl.classList.add('hidden');
      if (state.rocketLottie && typeof state.rocketLottie.goToAndStop === 'function') state.rocketLottie.goToAndStop(0, true);
      if (state.explosionLottie && typeof state.explosionLottie.stop === 'function') state.explosionLottie.stop();
    } else if (phase === 'running') {
      pill.innerHTML = `В полёте ${tgIcon('rocket', 13)}`;
      multEl.classList.add('flying');
      rocketEl.classList.remove('hidden');
      rocketEl.classList.add('flying');
      boomEl.classList.add('hidden');
      if (state.rocketLottie && typeof state.rocketLottie.play === 'function') state.rocketLottie.play();
    } else if (phase === 'crashed') {
      pill.innerHTML = `КРАШ ${tgIcon('flame', 13)}`;
      multEl.textContent = `${state.crash.multiplier.toFixed(2)}x`;
      multEl.classList.add('crashed');
      stage.classList.add('crashed');
      rocketEl.classList.add('hidden');
      if (state.rocketLottie && typeof state.rocketLottie.stop === 'function') state.rocketLottie.stop();
      boomEl.classList.remove('hidden');
      if (state.explosionLottie && typeof state.explosionLottie.goToAndPlay === 'function') state.explosionLottie.goToAndPlay(0, true);
    }
  }

  function drawCrashGraph() {
    const canvas = $('crash-canvas');
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (state.crash.phase === 'waiting') {
      const left = Math.max(0, (state.crash.waitEndsAt - Date.now()) / 1000);
      $('crash-status-pill').textContent = `Старт через ${left.toFixed(1)}с`;
      return;
    }

    // Dynamic zoom-out camera: keeps moving smoothly past 10x, 25x, 50x, 100x without ever freezing!
    const isCrashed = state.crash.phase === 'crashed';
    const rawElapsed = isCrashed
      ? Math.log(Math.max(1.01, state.crash.multiplier)) / 0.145
      : Math.max(0.05, (Date.now() - state.crash.startedAt) / 1000);
    const liveMult = isCrashed
      ? Math.max(1, state.crash.multiplier)
      : Math.max(state.crash.multiplier, Math.pow(Math.E, 0.145 * rawElapsed));

    // Smoothly expanding viewport bounds (zooms out continuously as time & multiplier grow!)
    const maxT = Math.max(6.5, rawElapsed * 1.18);
    const maxM = Math.max(2.2, liveMult * 1.18);

    const padL = 16;
    const padR = 44;
    const padT = 22;
    const padB = 20;
    const plotW = Math.max(40, w - padL - padR);
    const plotH = Math.max(40, h - padT - padB);
    const baseY = h - padB;

    const mapX = (t) => padL + (t / maxT) * plotW;
    const mapY = (m) => baseY - ((m - 1) / Math.max(0.5, maxM - 1)) * plotH;

    // Choose clean horizontal multiplier grid step that zooms out smoothly (0.5x, 1x, 2x, 5x, 10x, 20x...)
    const spanM = maxM - 1;
    const rawStep = spanM / 4;
    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50];
    const stepM = niceSteps.find((s) => s >= rawStep) || Math.ceil(rawStep / 10) * 10;

    ctx.save();
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let mTick = 1 + stepM; mTick < maxM; mTick += stepM) {
      const y = mapY(mTick);
      if (y < padT - 4 || y > baseY - 6) continue;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR + 4, y);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.58)';
      const lbl = mTick >= 10 ? `${Math.round(mTick)}x` : `${Number(mTick.toFixed(1))}x`;
      ctx.fillText(lbl, w - 6, y);
    }

    // Dynamic zooming vertical time lines (so motion is unmistakably visible even at high X!)
    const rawTStep = maxT / 5;
    const niceT = [1, 2, 5, 10, 15, 20, 30];
    const stepT = niceT.find((s) => s >= rawTStep) || Math.ceil(rawTStep / 10) * 10;
    for (let tTick = stepT; tTick < maxT; tTick += stepT) {
      const x = mapX(tTick);
      if (x < padL + 8 || x > w - padR) continue;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, baseY);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    const strokeCol = isCrashed ? '#ef4444' : '#22c55e';
    const fillTop = isCrashed ? 'rgba(239, 68, 68, 0.28)' : 'rgba(34, 197, 94, 0.26)';
    const fillBot = 'rgba(0, 0, 0, 0)';

    // Sample the true exponential curve m(t) = exp(0.145 * t) across 48 smooth steps
    const steps = 48;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = (rawElapsed * i) / steps;
      const m = i === steps ? liveMult : Math.pow(Math.E, 0.145 * t);
      pts.push({ x: mapX(t), y: mapY(m) });
    }
    const endPt = pts[pts.length - 1];

    const grad = ctx.createLinearGradient(0, endPt.y, 0, baseY);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBot);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, baseY);
    for (const pt of pts) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(endPt.x, baseY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = strokeCol;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle pulsing tip dot so motion feels alive at any multiplier
    const pulse = isCrashed ? 0 : Math.sin(Date.now() * 0.012) * 1.2;
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 5.5 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function renderCrashHistory() {
    $('crash-history').innerHTML = state.crash.history
      .map((v) => {
        const cls = v < 1.8 ? 'low' : v >= 5 ? 'high' : 'mid';
        return `<span class="crash-hist-pill ${cls}">${Number(v).toFixed(2)}x</span>`;
      })
      .join('');
  }

  function findLiveCrashNft(targetStars, minStrictPrice = 0) {
    const tiers = state.crashNftTiers || [];
    let best = null;
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.price <= targetStars && t.price > minStrictPrice) {
        best = t;
      } else if (t.price > targetStars) {
        break;
      }
    }
    return best;
  }

  function renderCrashGiftPreview() {
    const el = $('crash-gift-preview');
    if (!el) return;
    const inv = state.user?.inventory || [];
    const byUid = new Map(inv.map((item) => [item.uid, item]));
    const picked = (state.crashSelectedGiftUids || []).map((uid) => byUid.get(uid)).filter(Boolean);
    state.crashSelectedGiftUids = picked.map((g) => g.uid);
    if (!picked.length) {
      el.classList.remove('picked');
      el.innerHTML = 'Выбрать подарки из инвентаря';
      return;
    }
    el.classList.add('picked');
    if (picked.length === 1) {
      const g = picked[0];
      const bg = giftBgStyle(g);
      const numTxt = (g.upgraded || g.crafted) && g.mintNumber ? ` #${g.mintNumber}` : '';
      const symBg = (g.upgraded || g.crafted) && g.symbol?.image
        ? `<img class="crash-gift-preview-sym" src="${esc(g.symbol.image)}" alt="" onerror="this.remove()" />`
        : '';
      el.innerHTML = `
        <div class="crash-gift-preview-thumb" style="background:${bg}">
          ${symBg}
          <img class="crash-gift-preview-img" src="${esc(g.image)}" alt="" />
        </div>
        <div class="crash-gift-preview-info">
          <div class="crash-gift-preview-name">${esc(giftDisplayName(g))}${numTxt}${g.model?.name ? ` • ${esc(g.model.name)}` : ''}</div>
          <div class="crash-gift-preview-val">${formatStars(g.value)} ${starIconHtml(11)}</div>
        </div>
      `;
      return;
    }

    const totalVal = picked.reduce((s, g) => s + Math.max(5, Math.floor(Number(g.value || 0))), 0);
    const mergedNft = findLiveCrashNft(totalVal, 0);
    const thumbsHtml = picked.slice(0, 4).map((g) => `
      <div class="crash-multi-thumb" style="background:${giftBgStyle(g)};position:relative;overflow:hidden">${buildCardSymbolPattern(g)}<img src="${esc(g.image)}" alt="" style="position:relative;z-index:2" /></div>
    `).join('');
    const mergedHint = mergedNft ? ` • в «${esc(mergedNft.name)}»` : '';
    el.innerHTML = `
      <div class="crash-multi-thumbs">${thumbsHtml}</div>
      <div class="crash-gift-preview-info">
        <div class="crash-gift-preview-name">${picked.length} NFT${mergedHint}</div>
        <div class="crash-gift-preview-val">${formatStars(totalVal)} ${starIconHtml(11)}</div>
      </div>
    `;
  }

  function renderPvpSelectedGifts() {
    const box = $('pvp-selected-gifts');
    if (!box) return;
    const inv = state.user?.inventory || [];
    const valid = (state.pvpSelectedGiftUids || [])
      .map((uid) => inv.find((g) => g.uid === uid))
      .filter(Boolean);
    state.pvpSelectedGiftUids = valid.map((g) => g.uid);
    if (!valid.length) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    box.classList.remove('hidden');
    box.innerHTML = valid.map((g) => `
      <span class="pvp-sel-chip">
        <img src="${esc(g.image)}" alt="" />
        <span>${esc(giftDisplayName(g))} (${formatStars(g.value)})</span>
        <button type="button" data-pvp-rm-uid="${esc(g.uid)}" aria-label="Удалить">${tgIcon('x', 12)}</button>
      </span>
    `).join('');
    box.querySelectorAll('[data-pvp-rm-uid]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.pvpRmUid;
        state.pvpSelectedGiftUids = state.pvpSelectedGiftUids.filter((id) => id !== uid);
        renderPvpSelectedGifts();
      });
    });
  }

  function openStakePicker(mode) {
    state.stakePickerMode = mode;
    const grid = $('stake-picker-grid');
    const title = $('stake-picker-title');
    const doneBtn = $('stake-picker-done-btn');
    if (!grid) return;

    if (title) title.textContent = mode === 'pvp' ? 'Выберите подарки в PvP' : 'Выберите подарки в Ракету';
    if (doneBtn) doneBtn.classList.toggle('hidden', mode !== 'pvp' && mode !== 'crash');

    const renderGrid = () => {
      const typeF = $('stake-pick-type')?.value || 'all';
      const sortM = $('stake-pick-sort')?.value || 'price_desc';
      const base = (state.user?.inventory || []).filter((g) => !g.withdrawPending && !g.inAuction);
      const inv = sortGiftList(filterInventoryByType(base, typeF), sortM);

      if (!inv.length) {
        grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подходящих подарков нет</div>';
        return;
      }

      grid.innerHTML = inv.map((g) => {
        const isSel = mode === 'pvp'
          ? state.pvpSelectedGiftUids.includes(g.uid)
          : (state.crashSelectedGiftUids || []).includes(g.uid);
        const ribbonText = g.crafted
          ? `${g.craftTier} #${g.mintNumber}`
          : g.upgraded
            ? `#${g.mintNumber}`
            : isBasicNonUpgradable(g)
              ? 'Подарок'
              : 'Обычный';
        const ribbonClass = g.crafted
          ? `gift-card-ribbon tier-${g.craftTier}`
          : g.upgraded ? 'gift-card-ribbon' : 'gift-card-ribbon regular';
        return `
          <div class="gift-card stake-pick-card ${isSel ? 'selected' : ''}" data-stake-uid="${esc(g.uid)}" style="background:${giftBgStyle(g)}">
            ${buildCardSymbolPattern(g)}
            <span class="${ribbonClass}">${esc(ribbonText)}</span>
            <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" loading="lazy" />
            <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
            <div class="gift-card-val">${starIconHtml(12)} ${formatStars(g.value)}</div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-stake-uid]').forEach((card) => {
        card.addEventListener('click', () => {
          const uid = card.dataset.stakeUid;
          haptic('light');
          if (mode === 'crash') {
            if (state.crashSelectedGiftUids.includes(uid)) {
              state.crashSelectedGiftUids = state.crashSelectedGiftUids.filter((id) => id !== uid);
            } else {
              state.crashSelectedGiftUids.push(uid);
            }
            renderCrashGiftPreview();
            renderGrid();
          } else {
            if (state.pvpSelectedGiftUids.includes(uid)) {
              state.pvpSelectedGiftUids = state.pvpSelectedGiftUids.filter((id) => id !== uid);
            } else {
              state.pvpSelectedGiftUids.push(uid);
            }
            renderPvpSelectedGifts();
            renderGrid();
          }
        });
      });
    };

    if ($('stake-pick-type')) $('stake-pick-type').onchange = renderGrid;
    if ($('stake-pick-sort')) $('stake-pick-sort').onchange = renderGrid;
    renderGrid();
    openModal('modal-stake-picker');
  }

  function openRoundRewardModal({ title, subtitle, gifts = [], stars = 0, totalValue = 0 }) {
    const modal = $('modal-multi-drop');
    const titleEl = $('multi-drop-title');
    const subEl = $('multi-drop-sub');
    const summaryEl = $('multi-drop-summary');
    const gridEl = $('multi-drop-grid');
    const okBtn = $('multi-drop-ok-btn');
    if (!modal || !gridEl) return;

    if (titleEl) titleEl.textContent = title || 'Вы выиграли!';
    if (subEl) subEl.textContent = subtitle || 'Призы зачислены на ваш аккаунт';
    if (okBtn) okBtn.textContent = 'ОК';

    const items = [];
    for (const g of (gifts || [])) {
      if (g) items.push({ kind: 'gift', gift: g });
    }
    if (stars > 0) {
      items.push({ kind: 'stars', amount: stars });
    }
    const calcTotal = totalValue || (gifts.reduce((s, g) => s + Number(g?.value || 0), 0) + Number(stars || 0));

    if (summaryEl) {
      const parts = [];
      if (gifts.length > 0) parts.push(`Подарков: ${gifts.length}`);
      if (stars > 0) parts.push(`Звёзд: +${formatStars(stars)}`);
      summaryEl.innerHTML = `
        <span>${parts.join(' • ') || 'Приз'}</span>
        <span class="multi-drop-summary-val">Итого: ${formatStars(calcTotal)} ${starIconHtml(14)}</span>
      `;
    }

    gridEl.innerHTML = items.map((it, idx) => {
      if (it.kind === 'gift') {
        const g = it.gift;
        const mintNum = g.mintNumber || g.num || 0;
        const mintHtml = (g.upgraded || g.crafted) && mintNum ? `<span class="gift-card-ribbon">#${mintNum}</span>` : '';
        return `
          <div class="case-drop-card clickable-drop" data-reward-gift-idx="${idx}" style="background:${giftBgStyle(g)}">
            ${buildCardSymbolPattern(g)}
            ${mintHtml}
            <span class="case-drop-tap-pill">Открыть</span>
            <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" />
            <div class="case-drop-name">${esc(giftDisplayName(g))}</div>
            <div class="case-drop-price">${starIconHtml(12)} ${formatStars(g.value)}</div>
          </div>
        `;
      }
      return `
        <div class="case-drop-card is-stars-drop" style="background:radial-gradient(circle at 50% 40%, #69470d, #261705)">
          <div class="case-drop-star-wrap">${starIconHtml(42)}</div>
          <div class="case-drop-name">+${formatStars(it.amount)}</div>
          <div class="case-drop-price">${starIconHtml(12)} Звёзды</div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('[data-reward-gift-idx]').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.rewardGiftIdx);
        const item = items[idx];
        if (!item?.gift) return;
        const fresh = (state.user?.inventory || []).find((x) => x.uid === item.gift.uid) || item.gift;
        closeModal('modal-multi-drop');
        openTelegramGiftModal(fresh);
      });
    });

    openModal('modal-multi-drop');
  }

  function openCrashRewardModal(reward) {
    if (!reward) return;
    if (reward.roundId && state.lastCrashRewardRoundId === reward.roundId) return;
    if (reward.roundId) state.lastCrashRewardRoundId = reward.roundId;
    const gifts = reward.rewardGift ? [reward.rewardGift] : [];
    const stars = Number(reward.rewardStars || 0);
    const multTxt = Number(reward.cashoutAt || 1).toFixed(2);
    const subtitle = reward.returnedOriginal
      ? `Ракета @ x${multTxt} • Ваш NFT возвращён + бонус звёздами`
      : `Ракета @ x${multTxt} • Ваш выигрыш зачислен`;
    openRoundRewardModal({
      title: `Вы выиграли ${formatStars(reward.payoutValue)}!`,
      subtitle,
      gifts,
      stars,
      totalValue: reward.payoutValue
    });
  }

  function renderCrashBets() {
    const list = $('crash-players-list');
    const bets = state.crash.bets || [];
    $('crash-players-count').textContent = bets.length;
    if (!bets.length) {
      list.innerHTML = '<div class="empty-inline">Ожидание ставок игроков...</div>';
      return;
    }

    const myId = state.user?.telegramId;
    const isRunning = state.crash.phase === 'running';
    const isCrashed = state.crash.phase === 'crashed';
    const curMult = isRunning ? Math.max(1.0, state.crash.multiplier) : 1.0;

    // Sort:
    // 1. ME is ALWAYS pinned at the very top (position #0, even after cashing out!).
    // 2. Active players stay above cashed-out players (cashed-out drop to the bottom).
    // 3. Within each group: chronological order by bet time (placedAt ASC — first bettor is at the top!).
    const sorted = [...bets].sort((a, b) => {
      const aMe = a.telegramId === myId;
      const bMe = b.telegramId === myId;
      if (aMe !== bMe) return aMe ? -1 : 1;
      if (a.cashedOut !== b.cashedOut) return a.cashedOut ? 1 : -1;
      return (a.placedAt || 0) - (b.placedAt || 0);
    });

    list.innerHTML = sorted.map((b) => {
      const isMe = b.telegramId === myId;
      const ava = renderAvatarHtml(b.photoUrl, b.firstName, b.avatarFrame, { size: 32, className: 'player-ava-box' });
      const rowStateCls = b.cashedOut ? 'state-cashed' : (isCrashed ? 'state-crashed' : '');
      let cashoutBadge = '';
      if (b.cashedOut) {
        cashoutBadge = `<span class="crash-cashout-badge">x${Number(b.cashoutAt || 1).toFixed(2)}</span>`;
      } else if (Number(b.autoCashout) >= 1.1) {
        cashoutBadge = `<span class="crash-cashout-badge auto">x${Number(b.autoCashout).toFixed(2)}</span>`;
      }

      // Compute LIVE payout & LIVE NFT evolution!
      let displayVal = b.bet;
      let displayNft = null;

      if (b.cashedOut) {
        displayVal = b.payout;
        displayNft = b.rewardGiftPreview || (b.betMode === 'gift' ? b.giftPreview : null);
      } else if (isRunning) {
        displayVal = Math.floor(b.bet * curMult);
        if (b.betMode === 'gift' && b.giftPreview) {
          const better = findLiveCrashNft(displayVal, b.bet);
          displayNft = better
            ? { name: better.name, image: better.image, upgraded: false }
            : b.giftPreview;
        } else {
          const reached = findLiveCrashNft(displayVal, 0);
          if (reached) displayNft = { name: reached.name, image: reached.image, upgraded: false };
        }
      } else {
        // waiting or crashed (lost): immediately show NFT if bet already matches an NFT!
        displayVal = b.bet;
        if (b.giftPreview) {
          displayNft = b.giftPreview;
        } else {
          const instant = findLiveCrashNft(b.bet, 0);
          if (instant) displayNft = { name: instant.name, image: instant.image, upgraded: false };
        }
      }

      let rightHtml = '';
      if (displayNft && displayNft.image) {
        const nftBg = displayNft.upgraded && displayNft.backdropCenter
          ? `radial-gradient(circle at 50% 40%, ${displayNft.backdropCenter}, ${displayNft.backdropEdge || '#0f172a'})`
          : 'rgba(255,255,255,0.06)';
        rightHtml = `
          <div class="crash-stake-right">
            <div class="stake-nft-box">
              <img class="stake-nft-thumb" src="${esc(displayNft.image)}" alt="${esc(displayNft.name || '')}" style="background:${nftBg}" />
              <span class="stake-nft-stars">${formatStars(displayVal)} ${starIconHtml(11)}</span>
            </div>
          </div>
        `;
      } else {
        rightHtml = `
          <div class="crash-stake-right">
            <span class="stake-stars-live">${formatStars(displayVal)} ${starIconHtml(13)}</span>
          </div>
        `;
      }

      const subLine = b.betMode === 'gift' && b.giftPreview
        ? `${esc(b.giftPreview.name)}${b.giftPreview.model ? ` • ${esc(b.giftPreview.model)}` : ''}`
        : `Ставка: ${formatStars(b.bet)}`;

      return `
        <div class="crash-player-row ${isMe ? 'is-me' : ''} ${rowStateCls}">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="crash-player-name-row">
                <div class="player-name">${esc(b.firstName)}</div>
                ${cashoutBadge}
              </div>
              <div class="player-bet">${subLine}</div>
            </div>
          </div>
          ${rightHtml}
        </div>
      `;
    }).join('');
  }

  function getMyCrashBet() {
    return state.crash.bets.find((b) => b.telegramId === state.user?.telegramId) || null;
  }

  function sanitizeCrashAutoInput() {
    const inp = $('crash-auto-input');
    if (!inp) return 2;
    const raw = String(inp.value ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
    let num = parseFloat(raw);
    if (!Number.isFinite(num) || num < 1.1) num = 1.1;
    if (num > 100) num = 100;
    num = Number(num.toFixed(2));
    inp.value = String(num);
    return num;
  }

  function getEffectiveCrashAutoCashout() {
    const tgl = $('crash-auto-toggle');
    if (!tgl || !tgl.checked) return 0;
    return sanitizeCrashAutoInput();
  }

  function syncCrashAutoLock() {
    const bar = $('crash-auto-bar');
    const tgl = $('crash-auto-toggle');
    const inp = $('crash-auto-input');
    if (!bar || !tgl || !inp) return;
    // Locked (opacity 0.5, non-interactive) whenever player HAS a bet in the current round (both waiting & running/crashed).
    // Unlocked ONLY when player is NOT participating in the round!
    const locked = Boolean(getMyCrashBet());
    bar.classList.toggle('locked', locked);
    if (tgl.disabled !== locked) tgl.disabled = locked;
    if (inp.disabled !== locked) {
      inp.disabled = locked;
      if (locked && document.activeElement === inp) inp.blur();
    }
  }

  let lastCrashBtnMode = '';
  function updateCrashButton() {
    const btn = $('crash-action-btn');
    const lbl = $('crash-action-label');
    if (!btn || !lbl) return;
    const myBet = getMyCrashBet();
    syncCrashAutoLock();

    let nextMode = '';
    let nextDisabled = false;
    let nextText = '';

    if (state.crash.phase === 'waiting') {
      if (myBet) {
        nextMode = 'tg-btn-secondary';
        nextDisabled = true;
        nextText = `Ставка принята (${formatStars(myBet.bet)})`;
      } else {
        nextMode = 'tg-btn-primary';
        nextDisabled = false;
        nextText = state.crashBetMode === 'gift' ? 'Поставить подарок' : 'Сделать ставку';
      }
    } else if (state.crash.phase === 'running') {
      if (myBet && !myBet.cashedOut) {
        const liveWin = Math.floor(myBet.bet * state.crash.multiplier);
        nextMode = 'tg-btn-success';
        nextDisabled = false;
        nextText = `Забрать ${formatStars(liveWin)}`;
      } else if (myBet && myBet.cashedOut) {
        nextMode = 'tg-btn-secondary';
        nextDisabled = true;
        nextText = `Забрано x${myBet.cashoutAt.toFixed(2)} • ${formatStars(myBet.payout)}`;
      } else {
        nextMode = 'tg-btn-secondary';
        nextDisabled = true;
        nextText = 'Раунд идёт...';
      }
    } else {
      nextMode = 'tg-btn-danger';
      nextDisabled = true;
      nextText = `Краш на ${state.crash.multiplier.toFixed(2)}x`;
    }

    // Update classes/disabled ONLY when mode changes so pointer events NEVER drop!
    if (lastCrashBtnMode !== nextMode) {
      btn.className = `tg-btn tg-btn-lg ${nextMode}`;
      lastCrashBtnMode = nextMode;
    }
    if (btn.disabled !== nextDisabled) btn.disabled = nextDisabled;
    if (lbl.textContent !== nextText) lbl.textContent = nextText;
  }

  function handleCrashAction() {
    if (!state.socket) return;
    const myBet = getMyCrashBet();

    if (state.crash.phase === 'running' && myBet && !myBet.cashedOut) {
      state.socket.emit('crash:cashout', {}, (res) => {
        if (res?.error) showToast(res.error, 'error');
        else if (res?.ok) {
          if (res.user) applyServerUser(res.user, { force: true });
          SoundFX.cashout();
          haptic('success');
          showToast(`Забрано x${res.cashoutAt.toFixed(2)} (${formatStars(res.payout)})! Зачислено`, 'success');
          openCrashRewardModal({
            roundId: state.pfCrash?.roundId || Date.now(),
            cashoutAt: res.cashoutAt,
            payoutValue: res.payout,
            rewardGift: res.rewardGift || null,
            rewardStars: res.rewardStars || 0,
            returnedOriginal: Boolean(res.returnedOriginal)
          });
        }
      });
      return;
    }

    if (state.crash.phase === 'waiting' && !myBet) {
      const autoCashout = getEffectiveCrashAutoCashout();
      if (state.crashBetMode === 'gift') {
        const uids = [...(state.crashSelectedGiftUids || [])];
        if (!uids.length) {
          openStakePicker('crash');
          return;
        }
        state.socket.emit('crash:bet', { mode: 'gift', giftUids: uids, autoCashout }, (res) => {
          if (res?.error) showToast(res.error, 'error');
          else {
            SoundFX.click();
            haptic('medium');
            state.crashSelectedGiftUids = [];
            renderCrashGiftPreview();
            const label = uids.length > 1 ? `${uids.length} NFT объединены и поставлены` : 'Подарок поставлен';
            showToast(autoCashout >= 1.1 ? `${label} (авто x${autoCashout})!` : `${label} в Ракету!`, 'info');
          }
        });
      } else {
        const bet = Math.floor(Number($('crash-bet-input').value));
        state.socket.emit('crash:bet', { mode: 'stars', bet, autoCashout }, (res) => {
          if (res?.error) showToast(res.error, 'error');
          else {
            SoundFX.click();
            haptic('medium');
            showToast(autoCashout >= 1.1 ? `Ставка ${formatStars(bet)} звёзд (авто x${autoCashout}) принята!` : `Ставка ${formatStars(bet)} звёзд принята!`, 'info');
          }
        });
      }
    }
  }

  // ======================== GAME 2: CASES (CLEAN REDESIGN + CASHBACK CASE!) ========================
  function getCaseTierClass(item) {
    if (item.isStars || item.type === 'stars') return 'tier-stars';
    const p = Number(item.price || 0);
    if (p >= 14000) return 'tier-legend';
    if (p >= 3000) return 'tier-epic';
    if (p >= 900) return 'tier-rare';
    return 'tier-common';
  }

  function renderCaseTileHtml(item) {
    const tierCls = getCaseTierClass(item);
    if (item.isStars || item.type === 'stars') {
      const amt = item.amount || item.price || 0;
      return `
        <div class="case-item-tile is-stars-tile ${tierCls}">
          <div class="case-star-icon-wrap">${starIconHtml(42)}</div>
          <span class="case-star-val">+${formatStars(amt)}</span>
        </div>
      `;
    }
    return `
      <div class="case-item-tile ${tierCls}">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" />
        <span>${esc(item.name)}</span>
      </div>
    `;
  }

  function renderCasesList() {
    const grid = $('cases-grid');
    grid.innerHTML = '';
    const filtered = state.caseFilter === 'free'
      ? state.cases.filter((c) => c.isPromo || c.isCashback)
      : state.cases;

    if (!filtered.length) {
      grid.innerHTML = '<div class="promo-empty-msg" style="grid-column:1/-1">В этой категории пока нет кейсов</div>';
      return;
    }

    const cbCount = Math.max(0, Math.floor(Number(state.user?.cashbackCases || 0)));

    for (const c of filtered) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'case-mini-card';
      btn.style.borderColor = `${c.accent}55`;
      let priceHtml = '';
      if (c.isPromo) {
        priceHtml = `<div class="case-mini-price is-promo">${tgIcon('ticket', 13)} Промокод</div>`;
      } else if (c.isCashback) {
        priceHtml = cbCount > 0
          ? `<div class="case-mini-price is-cashback">${tgIcon('gift', 13)} Бесплатно${cbCount >= 2 ? ` (x${cbCount})` : ''}</div>`
          : `<div class="case-mini-price is-cashback-empty">${tgIcon('award', 13)} За уровень</div>`;
      } else {
        priceHtml = `<div class="case-mini-price">${starIconHtml(14)} ${formatStars(c.price)}</div>`;
      }
      btn.innerHTML = `
        <div class="case-cover-wrap">
          <img src="${esc(c.cover)}" alt="${esc(c.name)}" loading="lazy" />
        </div>
        <div class="case-mini-name">${esc(c.name)}</div>
        ${priceHtml}
      `;
      btn.onclick = () => openCaseDetail(c);
      grid.appendChild(btn);
    }
  }

  function updateCaseOpenButtonLabel() {
    const c = state.activeCase;
    const btn = $('case-open-btn');
    if (!c || !btn) return;
    if (c.isPromo) {
      btn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      btn.style.background = c.accent || '';
      btn.innerHTML = `${tgIcon('ticket', 16)} Открыть по промокоду`;
      return;
    }
    if (c.isCashback) {
      const cbCount = Math.max(0, Math.floor(Number(state.user?.cashbackCases || 0)));
      if (cbCount <= 0) {
        btn.className = 'tg-btn tg-btn-gray-locked tg-btn-lg';
        btn.style.background = '';
        btn.innerHTML = `${tgIcon('lock', 15)} Открыть бесплатно`;
      } else {
        btn.className = 'tg-btn tg-btn-primary tg-btn-lg';
        btn.style.background = c.accent || '';
        const multSuffix = cbCount >= 2 ? ` (x${cbCount})` : '';
        btn.innerHTML = `${tgIcon('gift', 16)} Открыть бесплатно${multSuffix}`;
      }
      return;
    }
    btn.className = 'tg-btn tg-btn-primary tg-btn-lg';
    btn.style.background = c.accent || '';
    const total = c.price * (state.caseCount || 1);
    const multTag = state.caseCount > 1 ? `x${state.caseCount} ` : '';
    btn.innerHTML = `Открыть ${multTag}за ${formatStars(total)} ${starIconHtml(16)}`;
  }

  function renderCaseIdleStrips(c) {
    const stack = $('case-strips-stack');
    if (!stack || !c) return;
    const cnt = (c.isPromo || c.isCashback) ? 1 : (state.caseCount || 1);
    stack.classList.toggle('multi', cnt > 1);
    const previewItems = [...c.items, ...c.items];
    const tilesHtml = previewItems.map(renderCaseTileHtml).join('');
    let html = '';
    for (let i = 0; i < cnt; i++) {
      html += `
        <div class="case-roulette-window" data-strip-win="${i}">
          <div class="case-pointer"></div>
          <div class="case-strip" data-strip-idx="${i}" style="transition:none;transform:translateX(0px)">${tilesHtml}</div>
        </div>
      `;
    }
    stack.innerHTML = html;
  }

  function setCaseButtonMode(mode) {
    const btn = $('case-open-btn');
    const c = state.activeCase;
    if (!btn) return;
    if (mode === 'loading') {
      btn.disabled = true;
      btn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      btn.style.background = c?.accent || '';
      btn.textContent = 'Открытие...';
    } else if (mode === 'skip') {
      btn.disabled = false;
      btn.className = 'tg-btn tg-btn-gold tg-btn-lg';
      btn.style.background = '';
      btn.innerHTML = `${tgIcon('skip', 15)} Пропустить`;
    } else {
      btn.disabled = false;
      updateCaseOpenButtonLabel();
    }
  }

  function openCaseDetail(c) {
    state.activeCase = c;
    if (c.isPromo || c.isCashback) {
      state.caseCount = 1;
      document.querySelectorAll('[data-case-count]').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.caseCount) === 1);
      });
    }
    $('case-count-row')?.classList.toggle('hidden', Boolean(c.isPromo || c.isCashback));
    $('cases-list-view').classList.add('hidden');
    $('case-detail-view').classList.remove('hidden');
    $('case-detail-title').textContent = c.name;
    const cbCount = Math.max(0, Math.floor(Number(state.user?.cashbackCases || 0)));
    $('case-detail-price').innerHTML = c.isPromo
      ? `${tgIcon('ticket', 13)} Промокод`
      : c.isCashback
        ? `${tgIcon('gift', 13)} В наличии: ${cbCount} шт.`
        : `${formatStars(c.price)} ${starIconHtml(14)}`;
    updateBackButtonLabel();
    setCaseButtonMode('open');

    renderCaseIdleStrips(c);
    renderSingleCaseFeed();
    updatePfStrips();

    // Clean, minimal, non-AI-ish drops grid below roulette
    const dropsGrid = $('case-drops-grid');
    dropsGrid.innerHTML = c.items.map((it) => {
      const tierCls = getCaseTierClass(it);
      if (it.type === 'stars') {
        return `
          <div class="case-drop-card is-stars-drop ${tierCls}">
            <span class="case-drop-chance">${it.chance}%</span>
            <div class="case-drop-media">
              <div class="case-drop-star-wrap">${starIconHtml(34)}</div>
            </div>
            <div class="case-drop-name">+${formatStars(it.amount)}</div>
            <div class="case-drop-price">${starIconHtml(11)} Звёзды</div>
          </div>
        `;
      }
      return `
        <div class="case-drop-card ${tierCls}">
          <span class="case-drop-chance">${it.chance}%</span>
          <div class="case-drop-media">
            <img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy" />
          </div>
          <div class="case-drop-name">${esc(it.name)}</div>
          <div class="case-drop-price">${starIconHtml(11)} ${formatStars(it.price)}</div>
        </div>
      `;
    }).join('');
  }

  function closeCaseDetail() {
    state.activeCase = null;
    $('case-detail-view').classList.add('hidden');
    $('cases-list-view').classList.remove('hidden');
    updateBackButtonLabel();
    renderLiveFeed('cases');
  }

  function openMultiDropSheet(caseDef, rolls) {
    const modal = $('modal-multi-drop');
    const titleEl = $('multi-drop-title');
    const subEl = $('multi-drop-sub');
    const summaryEl = $('multi-drop-summary');
    const gridEl = $('multi-drop-grid');
    const okBtn = $('multi-drop-ok-btn');
    if (!modal || !gridEl) return;
    if (okBtn) okBtn.textContent = 'Забрать всё';

    const giftsCount = rolls.filter((r) => r.wonGift).length;
    const totalStars = rolls.reduce((s, r) => s + (r.wonStars || 0), 0);
    const totalValue = rolls.reduce((s, r) => s + (r.wonGift ? Number(r.wonGift.value || 0) : Number(r.wonStars || 0)), 0);

    if (titleEl) titleEl.textContent = `Выпало призов: ${rolls.length} шт.`;
    if (subEl) {
      subEl.textContent = giftsCount > 0
        ? `Кейс «${caseDef.name}» • Нажмите на подарок, чтобы открыть`
        : `Кейс «${caseDef.name}» • Все звёзды уже на балансе`;
    }
    if (summaryEl) {
      const parts = [];
      if (giftsCount > 0) parts.push(`Подарков: ${giftsCount}`);
      if (totalStars > 0) parts.push(`Звёзд: +${formatStars(totalStars)}`);
      summaryEl.innerHTML = `
        <span>${parts.join(' • ') || `Кейсов: ${rolls.length}`}</span>
        <span class="multi-drop-summary-val">Итого: ${formatStars(totalValue)} ${starIconHtml(14)}</span>
      `;
    }

    gridEl.innerHTML = rolls.map((r, idx) => {
      const card = r.card || {};
      const cCenter = card.center || r.wonGift?.backdrop?.center || '#1e3a5f';
      const cEdge = card.edge || r.wonGift?.backdrop?.edge || '#0f172a';
      if (r.wonGift) {
        const g = r.wonGift;
        return `
          <div class="case-drop-card clickable-drop" data-multi-drop-idx="${idx}" style="background:radial-gradient(circle at 50% 40%, ${cCenter}, ${cEdge})">
            <span class="case-drop-tap-pill">Открыть</span>
            ${card.chance ? `<span class="case-drop-chance">${card.chance}%</span>` : ''}
            <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
            <div class="case-drop-name">${esc(g.collectionName)}</div>
            <div class="case-drop-val">${formatStars(g.value)} ${starIconHtml(12)}</div>
          </div>
        `;
      }
      const amt = r.wonStars || card.amount || 0;
      return `
        <div class="case-drop-card is-stars-drop" style="background:radial-gradient(circle at 50% 40%, ${cCenter}, ${cEdge})">
          ${card.chance ? `<span class="case-drop-chance">${card.chance}%</span>` : ''}
          <div class="case-drop-star-wrap">${starIconHtml(36)}</div>
          <div class="case-drop-name">+${formatStars(amt)}</div>
          <div class="case-drop-val">На баланс</div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('[data-multi-drop-idx]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.multiDropIdx);
        const roll = rolls[idx];
        if (!roll || !roll.wonGift) return;
        const latestGift = (state.user?.inventory || []).find((g) => g.uid === roll.wonGift.uid);
        if (!latestGift) {
          showToast('Этот подарок уже продан или использован', 'info');
          return;
        }
        haptic('light');
        openTelegramGiftModal(latestGift);
      });
    });

    modal.classList.remove('hidden');
  }

  function openPromoCodeModal() {
    const modal = $('modal-promo-code');
    const inp = $('promo-code-input');
    const sheet = $('promo-code-sheet');
    if (!modal || !inp) return;
    inp.value = '';
    inp.classList.remove('is-error');
    sheet?.classList.remove('shake');
    const btn = $('promo-code-submit-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Открыть кейс';
    }
    openModal('modal-promo-code');
    haptic('light');
    setTimeout(() => inp.focus(), 60);
  }

  function shakePromoSheet() {
    const sheet = $('promo-code-sheet');
    const inp = $('promo-code-input');
    if (inp) inp.classList.add('is-error');
    if (sheet) {
      sheet.classList.remove('shake');
      void sheet.offsetWidth;
      sheet.classList.add('shake');
    }
    haptic('error');
  }

  async function handlePromoCodeSubmit() {
    if (!state.activeCase || !state.activeCase.isPromo || state.caseOpening) return;
    const inp = $('promo-code-input');
    const code = String(inp?.value || '').trim().toUpperCase();
    if (!code) {
      shakePromoSheet();
      showToast('Введите промокод', 'error');
      return;
    }
    const btn = $('promo-code-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Проверка...';
    }
    const ok = await openCase(state.activeCase, code);
    if (!ok) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Открыть кейс';
      }
      shakePromoSheet();
    }
  }

  async function openCase(caseDef, promoCode = '') {
    if (state.caseOpening) return false;
    const count = (caseDef.isPromo || caseDef.isCashback) ? 1 : (state.caseCount || 1);
    state.caseOpening = true;
    state.caseSkipFn = null;
    setCaseButtonMode('loading');

    let tickTimer = null;
    let finishTimer = null;

    try {
      const payload = { caseId: caseDef.id, count };
      if (caseDef.isPromo) payload.promoCode = promoCode;
      const res = await api('/api/games/case/open', {
        method: 'POST',
        body: payload
      });
      if (caseDef.isPromo) {
        closeModal('modal-promo-code');
      }
      // Instant balance deduction BEFORE spin!
      updateDisplayedBalance(res.balanceAfterBet);

      const rolls = Array.isArray(res.rolls) && res.rolls.length
        ? res.rolls
        : [{ strip: res.strip, winnerIndex: res.winnerIndex, wonGift: res.wonGift, wonStars: res.wonStars }];

      const stack = $('case-strips-stack');
      stack.classList.toggle('multi', rolls.length > 1);
      stack.innerHTML = rolls.map((r, i) => `
        <div class="case-roulette-window" data-strip-win="${i}">
          <div class="case-pointer"></div>
          <div class="case-strip" data-strip-idx="${i}" style="transition:none;transform:translateX(0px)">${r.strip.map(renderCaseTileHtml).join('')}</div>
        </div>
      `).join('');

      // Force layout so offsetLeft / offsetWidth are 100% exact for BOTH x1 and x2..x5!
      void stack.offsetWidth;

      const durSec = state.caseTurbo ? 1.05 : 4.3;
      const durMs = state.caseTurbo ? 1150 : 4500;

      const targets = [];
      stack.querySelectorAll('.case-strip').forEach((stripEl, idx) => {
        const winEl = stripEl.parentElement;
        const winW = winEl?.clientWidth || 340;
        const r = rolls[idx];
        const winTile = stripEl.children[r.winnerIndex] || null;
        const tileCenter = winTile
          ? (winTile.offsetLeft + winTile.offsetWidth / 2)
          : (r.winnerIndex * (rolls.length > 1 ? 90 : 96) + (rolls.length > 1 ? 51 : 54));
        const jitter = (Math.random() - 0.5) * (rolls.length > 1 ? 14 : 24);
        const offset = -(tileCenter - winW / 2 + jitter);
        targets.push({ stripEl, winTile, offset });
      });

      haptic('medium');

      // Real pointer-crossing click tracker: plays SoundFX.tick() EXACTLY when each new item passes under the arrow!
      const primaryTarget = targets[0];
      const primaryWin = primaryTarget?.stripEl?.parentElement;
      const primaryStrip = primaryTarget?.stripEl;
      // Pre-measure strip geometry ONCE before animation (zero layout reflow inside rAF!)
      const ptrCenterX = primaryWin ? primaryWin.clientWidth / 2 : 160;
      const firstTile = primaryStrip?.children?.[0];
      const secondTile = primaryStrip?.children?.[1];
      const tileStep = (firstTile && secondTile)
        ? Math.max(40, secondTile.offsetLeft - firstTile.offsetLeft)
        : (rolls.length > 1 ? 90 : 96);
      const totalTiles = primaryStrip?.children?.length || 0;

      let lastCrossedIdx = -1;
      let lastTickSoundTs = 0;
      let lastCheckTs = 0;
      let tickRafId = 0;

      const trackPointerTicks = (nowTs) => {
        if (finished || !primaryStrip) return;
        tickRafId = requestAnimationFrame(trackPointerTicks);
        if (nowTs - lastCheckTs < 34) return;
        lastCheckTs = nowTs;
        const mat = getComputedStyle(primaryStrip).transform;
        let tx = 0;
        if (mat && mat !== 'none') {
          const parts = mat.match(/matrix(?:3d)?\(([^)]+)\)/);
          if (parts) {
            const nums = parts[1].split(',');
            tx = parseFloat(nums.length > 6 ? nums[12] : nums[4]) || 0;
          }
        }
        const relX = ptrCenterX - tx;
        const idx = Math.floor(relX / tileStep);
        if (idx !== lastCrossedIdx && idx >= 0 && idx < totalTiles) {
          lastCrossedIdx = idx;
          if (nowTs - lastTickSoundTs >= 34) {
            lastTickSoundTs = nowTs;
            SoundFX.tick();
          }
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          for (const t of targets) {
            t.stripEl.style.transition = `transform ${durSec}s cubic-bezier(0.1, 0.86, 0.14, 1)`;
            t.stripEl.style.transform = `translate3d(${t.offset}px, 0, 0)`;
          }
          tickRafId = requestAnimationFrame(trackPointerTicks);
        });
      });

      let finished = false;
      const finishSpin = (skipped = false) => {
        if (finished) return;
        finished = true;
        if (tickRafId) { cancelAnimationFrame(tickRafId); tickRafId = 0; }
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
        state.caseSkipFn = null;

        for (const t of targets) {
          if (skipped) {
            t.stripEl.style.transition = 'transform 0.16s ease-out';
            t.stripEl.style.transform = `translate3d(${t.offset}px, 0, 0)`;
          }
          t.winTile?.classList.add('winner-glow');
        }

        // Credit reward & flush live feed ONLY after spin finishes or is skipped!
        flushAndApplyUser(res.feedToken, res.user).finally(() => {
          updatePfStrips();
          state.caseOpening = false;
          setCaseButtonMode('open');
        });

        const wonGifts = rolls.filter((r) => r.wonGift).map((r) => r.wonGift);
        const totalStars = rolls.reduce((s, r) => s + (r.wonStars || 0), 0);

        if (rolls.length > 1) {
          // Multi-case drop: DO NOT open single gift modal! Show compact slide-up sheet with ALL drops.
          haptic(wonGifts.length > 0 ? 'success' : 'light');
          if (wonGifts.length > 0) SoundFX.bigWin();
          else if (totalStars >= caseDef.price * rolls.length) SoundFX.coin();
          else SoundFX.click();
          openMultiDropSheet(caseDef, rolls);
        } else if (wonGifts.length === 1) {
          haptic('success');
          SoundFX.bigWin();
          showToast(`Выпал подарок: ${wonGifts[0].collectionName} (${formatStars(wonGifts[0].value)})!`, 'gold');
          openTelegramGiftModal(wonGifts[0]);
        } else {
          haptic(totalStars >= caseDef.price ? 'success' : 'light');
          if (totalStars >= caseDef.price) SoundFX.coin();
          else SoundFX.click();
          showToast(`Из кейса выпало +${formatStars(totalStars)} звёзд!`, 'gold');
        }
      };

      state.caseSkipFn = () => finishSpin(true);
      setCaseButtonMode('skip');
      finishTimer = setTimeout(() => finishSpin(false), durMs);
      return true;
    } catch (e) {
      if (tickTimer) clearInterval(tickTimer);
      if (finishTimer) clearTimeout(finishTimer);
      state.caseSkipFn = null;
      state.caseOpening = false;
      setCaseButtonMode('open');
      showToast(e.message, 'error');
      return false;
    }
  }

  // ======================== GAME 3: LUCKY WHEEL (10 STARS, IMAGES ONLY + CHILL FLAME JACKPOT) ========================
  function selectWheelTier(tierId) {
    const tier = (state.wheelTiers || []).find((t) => t.id === tierId);
    if (!tier) return;
    state.wheelTier = tier.id;
    state.wheelCost = Number(tier.cost) || 10;
    state.wheelSegments = tier.segments || [];
    state.wheelAngle = 0;

    document.querySelectorAll('[data-wheel-tier]').forEach((b) => {
      b.classList.toggle('active', b.dataset.wheelTier === tier.id);
    });
    const wheelBtn = $('wheel-spin-btn');
    if (wheelBtn) {
      wheelBtn.innerHTML = `Крутить за ${formatStars(state.wheelCost)} ${starIconHtml(16)}`;
    }
    preloadWheelImages();
    drawWheel();
  }

  function preloadWheelImages() {
    const allSegs = [
      ...state.wheelSegments,
      ...((state.wheelTiers || []).flatMap((t) => t.segments || []))
    ];
    for (const seg of allSegs) {
      if (!seg.image || state.wheelImages[seg.id]) continue;
      const img = new Image();
      img.onload = () => drawWheel();
      img.src = seg.image;
      state.wheelImages[seg.id] = img;
    }
  }

  function initWheelCanvas() {
    preloadWheelImages();
    drawWheel();
  }

  function drawWheel() {
    const canvas = $('wheel-canvas');
    if (!canvas || !state.wheelSegments.length) return;
    const w = 310;
    const h = 310;
    const ctx = setupHiDpiCanvas(canvas, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = cx - 8;
    const n = state.wheelSegments.length;
    const arc = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.wheelAngle);

    for (let i = 0; i < n; i++) {
      const seg = state.wheelSegments[i];
      const start = i * arc - Math.PI / 2;
      const end = start + arc;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();

      if (seg.jackpot || (seg.type === 'collection' && i === n - 1)) {
        const g = ctx.createRadialGradient(0, 0, 20, 0, 0, r);
        g.addColorStop(0, '#c2410c');
        g.addColorStop(1, '#f97316');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = seg.color;
      }
      ctx.fill();
      ctx.strokeStyle = '#17212b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + arc / 2);

      if (seg.type === 'stars') {
        const dist = r - 44;
        ctx.translate(dist, 0);
        ctx.rotate(Math.PI / 2);
        drawTelegramStarOnCanvas(ctx, 0, -14, 13);
        ctx.fillStyle = '#ffe58f';
        const fontSz = String(seg.amount).length >= 3 ? 15 : 18;
        ctx.font = `800 ${fontSz}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(seg.amount), 0, 11);
      } else {
        const img = state.wheelImages[seg.id];
        const dist = r - 44;
        const imgSz = seg.jackpot ? 46 : 42;
        ctx.translate(dist, 0);
        ctx.rotate(Math.PI / 2);
        if (seg.jackpot || seg.type === 'collection') {
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fillStyle = seg.jackpot ? 'rgba(255, 237, 150, 0.24)' : 'rgba(255, 255, 255, 0.1)';
          ctx.fill();
        }
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -imgSz / 2, -imgSz / 2, imgSz, imgSz);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Center hub with crisp Telegram Star
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#17212b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawTelegramStarOnCanvas(ctx, 0, 0, 13);
    ctx.restore();
  }

  async function handleWheelSpin() {
    if (state.wheelSpinning) return;
    state.wheelSpinning = true;
    $('wheel-spin-btn').disabled = true;

    try {
      const res = await api('/api/games/wheel', { method: 'POST', body: { tier: state.wheelTier } });
      // Deduct wheel cost IMMEDIATELY before wheel spins!
      updateDisplayedBalance(res.balanceAfterBet);

      const n = state.wheelSegments.length;
      const arc = (Math.PI * 2) / n;
      const targetMod = -(res.segmentIndex * arc + arc / 2);
      const startAngle = state.wheelAngle;
      const currentMod = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const desiredMod = ((targetMod % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let delta = desiredMod - currentMod;
      if (delta < 0) delta += Math.PI * 2;
      const totalDelta = Math.PI * 2 * 6 + delta;

      const t0 = performance.now();
      const dur = 4200;
      let lastWheelSeg = -1;

      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        state.wheelAngle = startAngle + totalDelta * eased;
        const curSeg = Math.floor(state.wheelAngle / arc);
        if (curSeg !== lastWheelSeg) {
          lastWheelSeg = curSeg;
          SoundFX.tick();
        }
        drawWheel();
        if (p < 1) requestAnimationFrame(step);
        else {
          flushAndApplyUser(res.feedToken, res.user).finally(() => {
            state.wheelSpinning = false;
            $('wheel-spin-btn').disabled = false;
          });
          haptic('success');
          if (res.wonGift) {
            SoundFX.bigWin();
            showToast(`Выпал подарок: ${res.wonGift.collectionName} (${formatStars(res.wonGift.value)})!`, 'gold');
            openTelegramGiftModal(res.wonGift);
          } else {
            if (res.wonStars >= (res.cost || state.wheelCost)) SoundFX.coin();
            else SoundFX.lose();
            showToast(`Выигрыш в Колесе: +${res.wonStars} звёзд!`, 'gold');
          }
        }
      }
      requestAnimationFrame(step);
    } catch (e) {
      state.wheelSpinning = false;
      $('wheel-spin-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 4: MINES (5x5) ========================
  let minesCellNodes = [];
  const MINES_GEM_HTML = tgIcon('gem', 22);
  const MINES_BOMB_HTML = tgIcon('bomb', 22);

  function initMinesGrid() {
    const grid = $('mines-grid');
    grid.innerHTML = '';
    minesCellNodes = [];
    for (let i = 0; i < 25; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mine-cell';
      btn.dataset.cell = String(i);
      btn.addEventListener('click', () => handleMinesClick(i));
      grid.appendChild(btn);
      minesCellNodes.push(btn);
    }
  }

  function updateMinesActionBar() {
    $('mines-mult-badge').textContent = `x${Number(state.mines.multiplier || 1).toFixed(2)}`;
    const actBtn = $('mines-action-btn');
    if (!actBtn) return;
    if (state.mines.active) {
      const payout = Math.floor(state.mines.bet * state.mines.multiplier);
      actBtn.className = 'tg-btn tg-btn-gold tg-btn-lg';
      actBtn.disabled = state.mines.revealed.length === 0;
      actBtn.textContent = state.mines.revealed.length
        ? `Забрать +${formatStars(payout)} звёзд (x${state.mines.multiplier.toFixed(2)})`
        : 'Откройте клетку';
    } else {
      actBtn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      actBtn.disabled = false;
      actBtn.textContent = 'Начать игру';
    }
  }

  async function loadMinesState() {
    try {
      const res = await api('/api/games/mines/state');
      if (res.active) {
        state.mines = { active: true, bet: res.bet, minesCount: res.minesCount, revealed: res.revealed, multiplier: res.multiplier };
        syncMinesUI();
      }
    } catch {}
  }

  function syncMinesUI(allMines = null, boomCell = -1) {
    const revealedSet = new Set(state.mines.revealed || []);
    const minesSet = new Set(allMines || []);
    const nodes = minesCellNodes.length === 25 ? minesCellNodes : Array.from(document.querySelectorAll('.mine-cell'));

    for (let i = 0; i < nodes.length; i++) {
      const btn = nodes[i];
      if (revealedSet.has(i)) {
        if (!btn.classList.contains('safe')) {
          btn.className = 'mine-cell safe';
          btn.innerHTML = MINES_GEM_HTML;
        }
        btn.disabled = true;
      } else if (minesSet.has(i)) {
        const cls = (i !== boomCell && boomCell !== -1) ? 'mine-cell bomb dim' : 'mine-cell bomb';
        if (btn.className !== cls) {
          btn.className = cls;
          btn.innerHTML = MINES_BOMB_HTML;
        }
        btn.disabled = true;
      } else {
        if (btn.className !== 'mine-cell') {
          btn.className = 'mine-cell';
          btn.textContent = '';
        }
        btn.disabled = !state.mines.active;
      }
    }
    updateMinesActionBar();
  }

  let minesBusy = false;
  async function handleMinesStart() {
    if (minesBusy) return;
    minesBusy = true;
    const actBtn = $('mines-action-btn');
    if (actBtn) actBtn.disabled = true;
    try {
      const bet = Math.floor(Number($('mines-bet-input').value));
      const minesCount = Number($('mines-count-select').value) || 3;
      const res = await api('/api/games/mines/start', { method: 'POST', body: { bet, minesCount } });
      state.user = res.user;
      updateDisplayedBalance(res.user.balance);
      state.mines = { active: true, bet: res.bet, minesCount: res.minesCount, revealed: [], multiplier: 1.0 };
      syncMinesUI();
      haptic('medium');
    } catch (e) {
      syncMinesUI();
      showToast(e.message, 'error');
    } finally {
      minesBusy = false;
    }
  }

  async function handleMinesClick(cell) {
    if (!state.mines.active || minesBusy) return;
    if ((state.mines.revealed || []).includes(cell)) return;
    minesBusy = true;
    const cellBtn = minesCellNodes[cell] || document.querySelector(`.mine-cell[data-cell="${cell}"]`);
    if (cellBtn) {
      cellBtn.disabled = true;
      cellBtn.style.opacity = '0.76';
    }
    try {
      const res = await api('/api/games/mines/reveal', { method: 'POST', body: { cell } });
      if (cellBtn) cellBtn.style.opacity = '';
      if (res.hitMine) {
        state.mines.active = false;
        state.mines.revealed = res.revealed || [];
        syncMinesUI(res.mines, cell);
        state.user = res.user;
        updateDisplayedBalance(res.user.balance);
        haptic('error');
        showToast('Бум! Вы попали на мину', 'error');
      } else if (res.autoCashout) {
        state.mines.active = false;
        state.mines.revealed = res.revealed;
        state.mines.multiplier = res.multiplier;
        syncMinesUI(res.mines);
        state.user = res.user;
        updateDisplayedBalance(res.user.balance);
        haptic('success');
        showToast(`Все алмазы открыты! +${formatStars(res.winAmount)} звёзд`, 'gold');
      } else {
        state.mines.revealed = res.revealed;
        state.mines.multiplier = res.multiplier;
        // Fast O(1) single-cell DOM update — ZERO grid thrashing on tap!
        if (cellBtn) {
          cellBtn.className = 'mine-cell safe';
          cellBtn.innerHTML = MINES_GEM_HTML;
          cellBtn.disabled = true;
        }
        updateMinesActionBar();
        haptic('light');
      }
    } catch (e) {
      if (cellBtn) { cellBtn.style.opacity = ''; cellBtn.disabled = false; }
      showToast(e.message, 'error');
    } finally {
      minesBusy = false;
    }
  }

  async function handleMinesCashout() {
    if (minesBusy || !state.mines.active) return;
    minesBusy = true;
    try {
      const res = await api('/api/games/mines/cashout', { method: 'POST' });
      state.mines.active = false;
      syncMinesUI(res.mines);
      state.user = res.user;
      updateDisplayedBalance(res.user.balance);
      haptic('success');
      showToast(`Мины: забрали +${formatStars(res.winAmount)} звёзд (x${res.multiplier})!`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      minesBusy = false;
    }
  }

  // ======================== GAME 5: PLINKO (3 RISK MODES + STRICT POST-LANDING PAYOUT!) ========================
  const PLINKO_RISK_TABLES = {
    low:    [4.2, 2.2, 1.4, 0.9, 0.5, 0.9, 1.4, 2.2, 4.2],
    medium: [4.0, 1.8, 1.0, 0.4, 0.2, 0.4, 1.0, 1.8, 4.0],
    high:   [25.0, 6.0, 1.8, 0.3, 0.1, 0.3, 1.8, 6.0, 25.0]
  };
  state.plinkoRisk = 'medium';

  function setPlinkoRisk(risk) {
    const r = PLINKO_RISK_TABLES[risk] ? risk : 'medium';
    state.plinkoRisk = r;
    state.plinkoMultipliers = PLINKO_RISK_TABLES[r];
    document.querySelectorAll('.plinko-risk-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.plinkoRisk === r);
    });
    initPlinkoBoard();
  }

  function initPlinkoBoard() {
    const mults = PLINKO_RISK_TABLES[state.plinkoRisk] || state.plinkoMultipliers;
    state.plinkoMultipliers = mults;
    $('plinko-buckets').innerHTML = mults.map((m, i) => {
      const cls = m >= 2 ? 'high' : m >= 1 ? 'mid' : 'low';
      return `<div class="plinko-bucket ${cls}" id="plinko-b-${i}">x${m}</div>`;
    }).join('');
    drawPlinkoStatic();
    renderPlinkoBets();
  }

  function renderPlinkoBets() {
    const list = $('plinko-bets-list');
    const cnt = $('plinko-bets-count');
    if (!list) return;
    const bets = state.plinkoRecentBets || [];
    if (cnt) cnt.textContent = bets.length;
    if (!bets.length) {
      list.innerHTML = '<div class="empty-inline">Пока нет завершённых бросков...</div>';
      return;
    }
    list.innerHTML = bets.map((b) => {
      const ava = renderAvatarHtml(b.photoUrl, b.firstName, b.avatarFrame, { size: 30, className: 'player-ava-box' });
      const betVal = Number(b.bet || 0);
      const payoutVal = Number(b.payout || 0);
      const diff = payoutVal - betVal;
      const isWin = diff >= 0;
      const cls = isWin ? 'win' : 'lose';
      const diffTxt = isWin ? `+${formatStars(payoutVal)}` : `-${formatStars(Math.max(0, betVal - payoutVal))}`;
      return `
        <div class="player-row">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(b.firstName)}</div>
              <div class="player-bet">Ставка: ${formatStars(betVal)} ${starIconHtml(11)}</div>
            </div>
          </div>
          <span class="player-status ${cls}">x${b.multiplier} • ${diffTxt} ${starIconHtml(11)}</span>
        </div>
      `;
    }).join('');
  }

  function getPlinkoPegCoords() {
    const pegs = [];
    const rows = 8;
    const w = 340;
    const topY = 34;
    const rowGap = 31;
    const colGap = 34;
    for (let r = 0; r < rows; r++) {
      const count = r + 3;
      const startX = w / 2 - ((count - 1) * colGap) / 2;
      for (let c = 0; c < count; c++) {
        pegs.push({ x: startX + c * colGap, y: topY + r * rowGap, r });
      }
    }
    return pegs;
  }

  function drawPlinkoStatic(ball = null) {
    const canvas = $('plinko-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of getPlinkoPegCoords()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#8b9bab';
      ctx.fill();
    }

    if (ball) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  async function handlePlinkoDrop() {
    if (state.plinkoDropping) return;
    state.plinkoDropping = true;
    $('plinko-drop-btn').disabled = true;

    try {
      const bet = Math.floor(Number($('plinko-bet-input').value));
      const risk = state.plinkoRisk || 'medium';
      const res = await api('/api/games/plinko/drop', { method: 'POST', body: { bet, risk } });
      // Instant balance deduction BEFORE ball falls! Payout & final balance appear ONLY after ball lands!
      updateDisplayedBalance(res.balanceAfterBet);

      const colGap = 34;
      const rowGap = 31;
      const topY = 34;
      const waypoints = [{ x: 170, y: 12 }];
      let x = 170;
      for (let r = 0; r < res.pathDirs.length; r++) {
        const dir = res.pathDirs[r] === 1 ? 1 : -1;
        x += dir * (colGap / 2);
        waypoints.push({ x, y: topY + r * rowGap + 14 });
      }
      waypoints.push({ x: (res.bucketIndex + 0.5) * (340 / 9), y: 288 });

      let seg = 0;
      let segT = 0;
      let lastTs = performance.now();

      function animateBall(now) {
        const a = waypoints[seg];
        const b = waypoints[seg + 1];
        if (!b) {
          drawPlinkoStatic();
          const bEl = $(`plinko-b-${res.bucketIndex}`);
          bEl?.classList.add('hit');
          setTimeout(() => bEl?.classList.remove('hit'), 700);
          flushAndApplyUser(res.feedToken, res.user).finally(() => {
            state.plinkoDropping = false;
            $('plinko-drop-btn').disabled = false;
          });
          haptic(res.multiplier >= 1 ? 'success' : 'light');
          showToast(`Плинко x${res.multiplier}: ${formatStars(res.payout)} звёзд`, res.multiplier >= 1 ? 'gold' : 'info');
          return;
        }

        // Frame-rate independent smooth gravity (~4.5 segments/sec, comfortable on 60Hz & 120Hz displays!)
        const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
        lastTs = now;
        segT += dt * 4.5;
        const t = Math.min(1, segT);
        const bx = a.x + (b.x - a.x) * t;
        const by = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 10;
        drawPlinkoStatic({ x: bx, y: by });

        if (segT >= 1) {
          seg++;
          segT = 0;
          SoundFX.tick();
          haptic('light');
        }
        requestAnimationFrame(animateBall);
      }

      requestAnimationFrame(animateBall);
    } catch (e) {
      state.plinkoDropping = false;
      $('plinko-drop-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 6: PVP WHEEL (AVATARS IN SLICE CENTER + COLORED BORDER CARDS!) ========================
  function preloadPvpAvatars() {
    for (const p of state.pvp.players) {
      if (p.avatarFrame) preloadFrameImage(p.avatarFrame, () => drawPvpWheel());
      if (!p.photoUrl) continue;
      const key = String(p.telegramId);
      if (state.pvpImages[key] && state.pvpImages[key].src === p.photoUrl) continue;
      const img = new Image();
      // Do NOT set crossOrigin='anonymous' because Telegram CDN userpic URLs lack CORS headers!
      img.onload = () => drawPvpWheel();
      img.src = p.photoUrl;
      state.pvpImages[key] = img;
    }
  }

  function drawPvpWheel() {
    preloadPvpAvatars();
    const canvas = $('pvp-canvas');
    if (!canvas) return;
    const w = 290;
    const h = 290;
    const ctx = setupHiDpiCanvas(canvas, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = cx - 8;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.pvp.angle);

    if (!state.pvp.players.length || state.pvp.totalPot <= 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#232e3c';
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,166,255,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#8b9bab';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Банк пуст', 0, 5);
    } else {
      let start = -Math.PI / 2;
      for (const p of state.pvp.players) {
        const frac = p.bet / state.pvp.totalPot;
        const slice = frac * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, start, start + slice);
        ctx.closePath();
        ctx.fillStyle = p.color || '#2ea6ff';
        ctx.fill();
        ctx.strokeStyle = '#17212b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw circular player avatar centered inside THIS player's own slice (never wheel center!),
        // scaling avatar radius proportionally smaller for narrow slices!
        const mid = start + slice / 2;
        const dist = frac >= 0.45 ? r * 0.56 : frac >= 0.16 ? r * 0.64 : r * 0.72;
        const ax = Math.cos(mid) * dist;
        const ay = Math.sin(mid) * dist;

        // Half chord width of the slice at radius `dist`
        const halfWidth = slice >= Math.PI ? (r * 0.34) : Math.sin(slice / 2) * dist;
        const maxRadial = Math.min(dist - 28, r - dist - 6);
        const avaR = Math.max(7, Math.min(24, halfWidth - 3, maxRadial));

        if (avaR >= 7 && frac >= 0.025) {
          ctx.save();
          ctx.translate(ax, ay);
          // Keep avatar upright relative to screen even as wheel rotates!
          ctx.rotate(-state.pvp.angle);

          ctx.beginPath();
          ctx.arc(0, 0, avaR, 0, Math.PI * 2);
          ctx.closePath();
          ctx.save();
          ctx.clip();

          const img = state.pvpImages[String(p.telegramId)];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -avaR, -avaR, avaR * 2, avaR * 2);
          } else {
            ctx.fillStyle = '#17212b';
            ctx.fillRect(-avaR, -avaR, avaR * 2, avaR * 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(9, Math.round(avaR * 0.95))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((p.firstName || 'P')[0].toUpperCase(), 0, 1);
          }
          ctx.restore();

          // Draw player's equipped avatar frame OVER the avatar!
          if (p.avatarFrame) {
            const fImg = state.frameImages[p.avatarFrame];
            if (fImg && fImg.complete && fImg.naturalWidth > 0) {
              const fR = avaR * 1.40;
              ctx.drawImage(fImg, -fR, -fR, fR * 2, fR * 2);
            }
          }

          // Crisp player-color outline strictly ON TOP of the avatar frame (as requested for PvP!)
          ctx.beginPath();
          ctx.arc(0, 0, avaR + (p.avatarFrame ? 2 : 0), 0, Math.PI * 2);
          ctx.strokeStyle = p.color || '#ffffff';
          ctx.lineWidth = avaR >= 14 ? 2.6 : 1.6;
          ctx.stroke();

          ctx.restore();
        }

        start += slice;
      }
    }

    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#17212b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function renderPvpPlayers() {
    const list = $('pvp-players-list');
    if (!state.pvp.players.length) {
      list.innerHTML = '<div class="empty-inline">Пока никто не вошёл в раунд</div>';
      return;
    }
    list.innerHTML = state.pvp.players.map((p) => {
      const pct = state.pvp.totalPot ? ((p.bet / state.pvp.totalPot) * 100).toFixed(1) : '0';
      const col = p.color || '#2ea6ff';
      const avaHtml = renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 34, pvpColor: col });
      const gifts = Array.isArray(p.gifts) ? p.gifts : [];
      const starsBet = Number(p.starsBet || 0);

      let betHtml = '';
      if (gifts.length > 0) {
        const giftsTotalVal = gifts.reduce((s, g) => s + Number(g?.value || 0), 0);
        const topGift = gifts[0];
        const nftBg = topGift?.upgraded && topGift?.backdropCenter
          ? `radial-gradient(circle at 50% 40%, ${topGift.backdropCenter}, ${topGift.backdropEdge || '#0f172a'})`
          : 'rgba(255,255,255,0.06)';
        const countTag = gifts.length > 1 ? `<span class="pvp-gift-count-tag">×${gifts.length}</span>` : '';
        const plusStarsHtml = starsBet > 0
          ? `<span class="pvp-plus-stars">+ ${formatStars(starsBet)} ${starIconHtml(12)}</span>`
          : '';
        betHtml = `
          <div class="pvp-bet-visual">
            <div class="pvp-gift-stack">
              <img class="stake-nft-thumb" src="${esc(topGift.image)}" alt="${esc(topGift.name || '')}" style="background:${nftBg}" />
              ${countTag}
              <span class="stake-nft-stars">${formatStars(giftsTotalVal)} ${starIconHtml(11)}</span>
            </div>
            ${plusStarsHtml}
          </div>
        `;
      } else {
        betHtml = `<div class="pvp-player-bet">${formatStars(p.bet)} ${starIconHtml(14)}</div>`;
      }

      return `
        <div class="pvp-player-row" style="--pvp-color:${esc(col)}">
          <div class="pvp-player-left">
            ${avaHtml}
            <div class="pvp-player-info">
              <div class="pvp-player-name">${esc(p.firstName)}</div>
              <div class="pvp-player-chance">Шанс ${pct}%</div>
            </div>
          </div>
          ${betHtml}
        </div>
      `;
    }).join('');
  }

  function revealPvpWinner(winner) {
    if (!winner) return;
    haptic('success');
    refreshUserSilently();
    const b = $('pvp-last-winner');
    if (b) {
      b.innerHTML = `${tgIcon('trophy', 14)} Победитель: ${esc(winner.firstName)} (+${formatStars(winner.winAmount)} ${starIconHtml(12)} • ${winner.chance}%)`;
      b.classList.remove('hidden');
    }
    const iWon = String(winner.telegramId) === String(state.user?.telegramId);
    if (iWon) {
      SoundFX.bigWin();
      openRoundRewardModal({
        title: 'Победа в PvP Колесе!',
        subtitle: `Шанс ${winner.chance}% • Весь банк ваш`,
        gifts: Array.isArray(winner.wonGifts) ? winner.wonGifts : [],
        stars: Number(winner.wonStars || 0),
        totalValue: winner.winAmount
      });
    } else if (isPvpVisible()) {
      SoundFX.lose();
      showToast(`PvP Колесо: победил ${winner.firstName} (+${formatStars(winner.winAmount)} звёзд)!`, 'gold');
    }
  }

  function animatePvpSpin(stopAngleDeg, spinDurationMs = 4800) {
    state.pvp.spinning = true;
    $('pvp-timer-pill').textContent = 'Крутим колесо...';
    const startAngle = state.pvp.angle;
    const targetRad = -(stopAngleDeg * Math.PI) / 180;
    const curMod = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const desMod = ((targetRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = desMod - curMod;
    if (delta < 0) delta += Math.PI * 2;
    const total = Math.PI * 2 * 6 + delta;

    const t0 = performance.now();
    const dur = Math.max(3000, Number(spinDurationMs) || 4800);
    let lastSectorTick = -1;
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      state.pvp.angle = startAngle + total * eased;
      // Subtle physical peg tick every ~30deg when PvP screen is active
      const segIdx = Math.floor(state.pvp.angle / (Math.PI / 6));
      if (segIdx !== lastSectorTick) {
        lastSectorTick = segIdx;
        if ($('game-pvp')?.classList.contains('active')) SoundFX.tick();
      }
      drawPvpWheel();
      if (p < 1) requestAnimationFrame(step);
      else {
        state.pvp.spinning = false;
        if (state.pvp.pendingSettledWinner) {
          const w = state.pvp.pendingSettledWinner;
          state.pvp.pendingSettledWinner = null;
          revealPvpWinner(w);
        }
      }
    }
    requestAnimationFrame(step);
  }

  function handlePvpJoin() {
    if (!state.socket) return;
    const rawBet = Math.floor(Number($('pvp-bet-input').value || 0));
    const bet = Number.isFinite(rawBet) && rawBet > 0 ? rawBet : 0;
    const giftUids = [...(state.pvpSelectedGiftUids || [])];
    if (bet === 0 && giftUids.length === 0) {
      showToast('Введите сумму звёзд или выберите подарки', 'error');
      return;
    }
    state.socket.emit('pvp:join', { bet, giftUids }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else {
        SoundFX.click();
        haptic('medium');
        state.pvpSelectedGiftUids = [];
        renderPvpSelectedGifts();
        showToast(`Вы вошли в PvP банк на ${formatStars(res.totalAdded || bet)} звёзд!`, 'info');
      }
    });
  }

  // ======================== GAME 7: UPGRADER (STARS + GIFTS BY PRICE!) ========================
  async function ensureCatalogLoaded() {
    if (state.catalog.length && state.basicGifts.length) return;
    const res = await api('/api/catalog');
    state.basicGifts = res.basicGifts || [];
    state.catalog = (res.collections || []).slice().sort((a, b) => a.price - b.price);
  }

  function initUpgraderCanvas() {
    ensureCatalogLoaded().then(() => {
      refreshUpgraderPresetButtons();
      updateUpgraderInfo();
      drawUpgraderWheel();
    }).catch(() => {});
    updateUpgraderInfo();
    drawUpgraderWheel();
  }

  function clampUpgExtraStars(raw) {
    const maxBal = Math.max(0, Math.floor(Number(state.user?.balance) || 0));
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > maxBal) return maxBal;
    return n;
  }

  function getUpgExtraStars() {
    const inp = $('upg-extra-stars-input');
    const clamped = clampUpgExtraStars(inp ? inp.value : state.upg.extraStars);
    state.upg.extraStars = clamped;
    if (inp && String(clamped) !== String(inp.value) && document.activeElement !== inp) {
      inp.value = String(clamped);
    }
    return clamped;
  }

  function syncOwnedUpgraderGifts() {
    const inv = state.user?.inventory || [];
    const byUid = new Map(inv.map((g) => [g.uid, g]));
    state.upg.sourceGifts = (state.upg.sourceGifts || [])
      .map((g) => byUid.get(g.uid))
      .filter((g) => g && !g.withdrawPending && !g.inAuction);
    return state.upg.sourceGifts;
  }

  function getUpgTotalStake() {
    const gifts = syncOwnedUpgraderGifts();
    const giftVal = gifts.reduce((sum, g) => sum + Math.max(15, Math.round(g.value || 15)), 0);
    return giftVal + getUpgExtraStars();
  }

  function validateUpgraderTargetStillValid() {
    const tgt = state.upg.targetItem;
    if (!tgt) return;
    const total = getUpgTotalStake();
    if (total > 0 && tgt.price <= total) {
      state.upg.targetItem = null;
      return;
    }
    if (total >= 10) {
      const ch = (total / tgt.price) * 90;
      if (ch < 0.5 || ch > 85) {
        state.upg.targetItem = null;
      }
    }
  }

  function updateUpgraderPickerApplyLabel() {
    const btn = $('upg-picker-stars-apply');
    if (!btn) return;
    const gifts = syncOwnedUpgraderGifts();
    const stars = getUpgExtraStars();
    const total = getUpgTotalStake();
    if (gifts.length && stars > 0) {
      btn.textContent = `Применить (${gifts.length} NFT + ${formatStars(stars)} зв. = ${formatStars(total)})`;
    } else if (gifts.length) {
      btn.textContent = `Применить (${gifts.length} NFT • ${formatStars(total)} зв.)`;
    } else if (stars > 0) {
      btn.textContent = `Применить (${formatStars(stars)} зв.)`;
    } else {
      btn.textContent = 'Применить ставку';
    }
  }

  function getUpgraderCatalogPool(totalStake) {
    return [
      ...state.basicGifts.map((b) => ({ type: 'basic', key: b.slug, name: b.name, price: Math.round(b.price), image: b.image })),
      ...state.catalog.map((c) => ({ type: 'collection', key: c.name, name: c.name, price: Math.round(c.price), image: c.image }))
    ].filter((it) => {
      if (it.price <= totalStake) return false;
      const ch = (totalStake / it.price) * 90;
      return ch >= 0.5 && ch <= 85;
    });
  }

  function refreshUpgraderPresetButtons() {
    const pills = Array.from(document.querySelectorAll('[data-upg-x]'));
    if (!pills.length) return;
    const gifts = syncOwnedUpgraderGifts();
    const totalStake = getUpgTotalStake();
    const hasGifts = gifts.length > 0;
    state.upg.presetTargets = {};

    if (!hasGifts || totalStake < 10) {
      pills.forEach((btn) => {
        const baseX = Number(btn.dataset.upgX) || 2;
        btn.textContent = `x${baseX}`;
        btn.disabled = false;
        btn.style.opacity = '';
      });
      return;
    }

    // Gift(s) staked: replace button labels with real multipliers from catalog items!
    const pool = getUpgraderCatalogPool(totalStake);
    const usedKeys = new Set();

    pills.forEach((btn) => {
      const baseX = Number(btn.dataset.upgX) || 2;
      const desired = totalStake * baseX;
      let candidates = pool.filter((it) => !usedKeys.has(`${it.type}:${it.key}`));
      if (!candidates.length) candidates = pool;
      if (!candidates.length) {
        btn.textContent = `x${baseX}`;
        return;
      }
      candidates.sort((a, b) => Math.abs(a.price - desired) - Math.abs(b.price - desired));
      const picked = candidates[0];
      usedKeys.add(`${picked.type}:${picked.key}`);
      state.upg.presetTargets[String(baseX)] = picked;
      const realX = picked.price / totalStake;
      const label = realX >= 10 ? `x${Math.round(realX)}` : `x${Number(realX.toFixed(1))}`;
      btn.textContent = label;
    });
  }

  async function autoPickUpgraderTarget(baseMult) {
    const totalStake = getUpgTotalStake();
    if (totalStake < 10) {
      showToast('Выберите подарок или введите сумму звёзд от 10', 'info');
      return;
    }
    try {
      await ensureCatalogLoaded();
    } catch {}

    const gifts = syncOwnedUpgraderGifts();
    const hasGifts = gifts.length > 0;
    const pool = getUpgraderCatalogPool(totalStake);

    if (!hasGifts) {
      // Stars-only bet: target exact totalStake * baseMult!
      // Pick a gift ONLY if one closely matches (within ±5%), otherwise target pure STARS!
      const exactStars = Math.max(totalStake + 2, Math.round(totalStake * baseMult));
      const exactGift = pool
        .slice()
        .sort((a, b) => Math.abs(a.price - exactStars) - Math.abs(b.price - exactStars))
        .find((it) => Math.abs(it.price - exactStars) / exactStars <= 0.05);

      if (exactGift) {
        state.upg.targetItem = exactGift;
      } else {
        state.upg.targetItem = {
          type: 'stars',
          key: String(exactStars),
          name: 'Звёзды',
          price: exactStars,
          image: ''
        };
      }
      updateUpgraderInfo();
      drawUpgraderWheel();
      return;
    }

    refreshUpgraderPresetButtons();
    const mapped = state.upg.presetTargets?.[String(baseMult)];
    if (mapped) {
      state.upg.targetItem = mapped;
      updateUpgraderInfo();
      drawUpgraderWheel();
      return;
    }
    if (!pool.length) {
      showToast('Нет подходящих целевых подарков для этой суммы', 'info');
      return;
    }
    const desired = totalStake * baseMult;
    pool.sort((a, b) => Math.abs(a.price - desired) - Math.abs(b.price - desired));
    state.upg.targetItem = pool[0];
    updateUpgraderInfo();
    drawUpgraderWheel();
  }

  function renderUpgraderGiftSlots() {
    const gifts = syncOwnedUpgraderGifts();
    const extraStars = getUpgExtraStars();
    const srcBtn = $('upg-pick-source');
    const srcBody = $('upg-source-body');
    const clearBtn = $('upg-clear-source');
    const tgtBtn = $('upg-pick-target');
    const tgtBody = $('upg-target-body');
    const totalStake = getUpgTotalStake();

    if (gifts.length > 1) {
      srcBtn.classList.add('filled');
      srcBtn.style.background = 'linear-gradient(160deg, #1b2838 0%, #111923 100%)';
      clearBtn?.classList.remove('hidden');
      const colsCls = gifts.length > 4 ? ' cols-3' : '';
      const maxThumbs = gifts.length > 4 ? 6 : 4;
      const shown = gifts.slice(0, maxThumbs);
      const rest = gifts.length - shown.length;
      const tilesHtml = shown.map((g, idx) => {
        if (rest > 0 && idx === shown.length - 1) {
          return `<div class="upg-slot-multi-tile upg-slot-multi-more">+${rest + 1}</div>`;
        }
        return `<div class="upg-slot-multi-tile" style="background:${giftBgStyle(g)};position:relative;overflow:hidden">${buildCardSymbolPattern(g)}<img src="${esc(g.image)}" alt="" style="position:relative;z-index:2" /></div>`;
      }).join('');
      const starsPart = extraStars > 0 ? `<span class="upg-slot-plus-ico">${tgIcon('plus', 10)}</span>${starIconHtml(11)}` : '';
      srcBody.innerHTML = `
        <div class="upg-slot-multi-wrap">
          <div class="upg-slot-multi-grid${colsCls}">${tilesHtml}</div>
          <div class="upg-slot-multi-meta">${starsPart}<span>${formatStars(totalStake)}</span>${starIconHtml(11)}</div>
        </div>
      `;
    } else if (gifts.length === 1 && extraStars > 0) {
      const g = gifts[0];
      srcBtn.classList.add('filled');
      srcBtn.style.background = giftBgStyle(g);
      clearBtn?.classList.remove('hidden');
      const numTag = (g.upgraded || g.crafted) && g.mintNumber ? `<span class="slot-mint-tag">#${g.mintNumber}</span>` : '';
      srcBody.innerHTML = `
        ${buildCardSymbolPattern(g)}
        ${numTag}
        <div class="upg-slot-combo" style="position:relative;z-index:2">
          <img class="upg-slot-combo-img" src="${esc(g.image)}" alt="" />
          <div class="upg-slot-combo-row">
            <span class="upg-slot-plus-ico">${tgIcon('plus', 11)}</span>
            ${starIconHtml(12)}
            <span>${formatStars(extraStars)}</span>
          </div>
          <span class="upg-slot-price">${formatStars(g.value + extraStars)}</span>
        </div>
      `;
    } else if (gifts.length === 1) {
      const g = gifts[0];
      srcBtn.classList.add('filled');
      srcBtn.style.background = giftBgStyle(g);
      clearBtn?.classList.remove('hidden');
      const numTag = (g.upgraded || g.crafted) && g.mintNumber ? `<span class="slot-mint-tag">#${g.mintNumber}</span>` : '';
      srcBody.innerHTML = `
        ${buildCardSymbolPattern(g)}
        ${numTag}
        <img src="${esc(g.image)}" alt="" style="position:relative;z-index:2" />
        <span class="upg-slot-hint" style="color:#fff;font-weight:700;position:relative;z-index:2">${esc(giftDisplayName(g))}</span>
        <span class="upg-slot-price" style="position:relative;z-index:2">${formatStars(g.value)}</span>
      `;
    } else if (extraStars > 0) {
      srcBtn.classList.add('filled');
      srcBtn.style.background = 'linear-gradient(160deg, #2a2414 0%, #17212b 100%)';
      clearBtn?.classList.remove('hidden');
      srcBody.innerHTML = `
        <div class="upg-slot-stars-only">
          <div class="upg-slot-stars-ico">${starIconHtml(28)}</div>
          <span class="upg-slot-stars-sum">${formatStars(extraStars)}</span>
        </div>
      `;
    } else {
      srcBtn.classList.remove('filled');
      srcBtn.style.background = '';
      clearBtn?.classList.add('hidden');
      srcBody.innerHTML = `<span class="upg-slot-plus">${tgIcon('plus', 20)}</span><span class="upg-slot-hint">Выбрать ставку</span>`;
    }

    if (state.upg.targetItem) {
      const t = state.upg.targetItem;
      tgtBtn.classList.add('filled');
      if (t.type === 'stars') {
        tgtBtn.style.background = 'linear-gradient(160deg, #2a2414 0%, #17212b 100%)';
        tgtBody.innerHTML = `
          <div class="upg-slot-stars-only">
            <div class="upg-slot-stars-ico">${starIconHtml(28)}</div>
            <span class="upg-slot-stars-sum">${formatStars(t.price)}</span>
            <span class="upg-slot-hint" style="color:#fde68a;font-weight:700">Звёзды</span>
          </div>
        `;
      } else {
        tgtBtn.style.background = 'linear-gradient(160deg, #25364a 0%, #17212b 100%)';
        tgtBody.innerHTML = `
          <img src="${esc(t.image)}" alt="" />
          <span class="upg-slot-hint" style="color:#fff;font-weight:700">${esc(t.name)}</span>
          <span class="upg-slot-price">${formatStars(t.price)}</span>
        `;
      }
    } else {
      tgtBtn.classList.remove('filled');
      tgtBtn.style.background = '';
      tgtBody.innerHTML = `<span class="upg-slot-plus">${tgIcon('gift', 22)}</span><span class="upg-slot-hint">Выбрать цель</span>`;
    }
  }

  function updateUpgraderInfo() {
    state.upg.mode = 'gifts';
    validateUpgraderTargetStillValid();
    renderUpgraderGiftSlots();
    refreshUpgraderPresetButtons();

    const totalStake = getUpgTotalStake();
    const balPill = $('upg-picker-bal-pill');
    if (balPill) balPill.innerHTML = `Баланс: ${formatStars(Math.floor(state.user?.balance || 0))} ${starIconHtml(11)}`;

    const tgt = state.upg.targetItem;
    const hintEl = $('upg-gift-ratio-hint');

    if (totalStake >= 10 && tgt && tgt.price > totalStake) {
      const rawChance = (totalStake / tgt.price) * 90;
      const chance = Number(rawChance.toFixed(2));
      const mult = Number((tgt.price / totalStake).toFixed(2));
      const valid = chance >= 0.5 && chance <= 85;
      state.upg.chance = valid ? chance : 0;

      $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
      $('upg-mult-display').textContent = `x${mult}`;
      $('upg-payout-display').innerHTML = `${formatStars(tgt.price)} ${starIconHtml(14)}`;
      hintEl.innerHTML = valid
        ? `${formatStars(totalStake)} ${starIconHtml(12)} ${tgIcon('chevron-right', 11)} ${formatStars(tgt.price)} ${starIconHtml(12)} • шанс ${chance}%`
        : 'Шанс должен быть от 0.5% до 85% — выберите другую цель или измените ставку';
      $('upg-play-btn').disabled = !valid || state.upg.spinning;
      $('upg-play-btn').textContent = valid ? `Запустить апгрейд (${chance}%)` : 'Шанс вне диапазона (0.5%–85%)';
    } else {
      state.upg.chance = 0;
      $('upg-chance-badge').textContent = 'Шанс: —';
      $('upg-mult-display').innerHTML = tgIcon('gift', 24);
      $('upg-payout-display').textContent = totalStake >= 10 ? 'Выберите цель' : 'Выберите ставку';
      hintEl.textContent = 'Нажмите на левый слот, чтобы поставить звёзды, подарок или всё вместе, затем выберите цель или икс';
      $('upg-play-btn').disabled = true;
      $('upg-play-btn').textContent = 'Запустить апгрейд';
    }
  }

  async function openUpgraderPicker(mode) {
    if (state.upg.spinning) return;
    const totalStake = getUpgTotalStake();
    if (mode === 'target' && totalStake < 10) {
      showToast('Сначала выберите подарок или введите сумму звёзд от 10', 'info');
      return;
    }

    state.upgPickerMode = mode;
    state.upgPickerLimit = 24;
    state.upgXFilter = 'all';
    document.querySelectorAll('#upg-mult-filters .upg-mfilter').forEach((b) => {
      b.classList.toggle('active', b.dataset.xfilter === 'all');
    });

    $('upg-picker-search').value = '';
    $('upg-picker-search').classList.toggle('hidden', mode !== 'target');
    $('upg-mult-filters').classList.toggle('hidden', mode !== 'target');
    $('upg-picker-stars-box')?.classList.toggle('hidden', mode !== 'source');
    $('upg-picker-scroll').scrollTop = 0;

    if (mode === 'source') {
      $('upg-picker-title').textContent = 'Ваша ставка';
      const inp = $('upg-extra-stars-input');
      if (inp) {
        inp.max = String(Math.max(0, Math.floor(state.user?.balance || 0)));
        inp.value = String(getUpgExtraStars());
      }
      const balPill = $('upg-picker-bal-pill');
      if (balPill) balPill.innerHTML = `Баланс: ${formatStars(Math.floor(state.user?.balance || 0))} ${starIconHtml(11)}`;
      $('upg-picker-sub').textContent = 'Можно выбрать сразу несколько NFT и/или добавить звёзды';
      updateUpgraderPickerApplyLabel();
    } else {
      $('upg-picker-title').textContent = 'Выберите целевой подарок';
      $('upg-picker-sub').textContent = `Подарки дороже ${formatStars(totalStake)} (шанс от 0.5% до 85%)`;
      $('upg-picker-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Загрузка...</div>';
      $('upg-picker-more').classList.add('hidden');
      openModal('modal-upg-picker');
      try {
        await ensureCatalogLoaded();
      } catch (e) {
        showToast(e.message, 'error');
        return;
      }
    }

    renderUpgraderPickerGrid('');
    openModal('modal-upg-picker');
  }

  function matchesUpgXFilter(ratio, filter) {
    if (filter === 'all') return true;
    const x = Number(filter);
    if (x === 2)  return ratio >= 2.0 && ratio < 3.0;
    if (x === 3)  return ratio >= 3.0 && ratio < 5.0;
    if (x === 5)  return ratio >= 5.0 && ratio < 10.0;
    if (x === 10) return ratio >= 10.0 && ratio < 30.0;
    if (x === 30) return ratio >= 30.0;
    return true;
  }

  function renderUpgraderPickerGrid(query = '') {
    const grid = $('upg-picker-grid');
    const moreBtn = $('upg-picker-more');
    grid.innerHTML = '';
    moreBtn.classList.add('hidden');

    const typeF = $('upg-pick-type')?.value || 'all';
    const sortM = $('upg-pick-sort')?.value || 'price_asc';

    if (state.upgPickerMode === 'source') {
      const qSrc = query.trim().toLowerCase();
      let items = (state.user?.inventory || []).filter((g) => !g.withdrawPending && !g.inAuction);
      items = filterInventoryByType(items, typeF);
      if (qSrc) items = items.filter((g) => giftDisplayName(g).toLowerCase().includes(qSrc));
      items = sortGiftList(items, sortM);
      if (!items.length) {
        grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подходящих подарков нет</div>';
        return;
      }
      const selectedUids = new Set((state.upg.sourceGifts || []).map((x) => x.uid));
      for (const g of items) {
        const isSel = selectedUids.has(g.uid);
        const card = document.createElement('div');
        card.className = `upg-pick-card${isSel ? ' selected' : ''}`;
        card.style.background = giftBgStyle(g);
        const tag = g.crafted ? `Крафт #${g.mintNumber}` : g.upgraded ? `#${g.mintNumber}` : 'Обычный';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          ${isSel ? `<span class="upg-pick-check">${tgIcon('check', 12)}</span>` : ''}
          <span class="upg-pick-badge">${esc(tag)}</span>
          <img class="upg-pick-img" src="${esc(g.image)}" alt="" loading="lazy" />
          <div class="upg-pick-name">${esc(giftDisplayName(g))}</div>
          <div class="upg-pick-price">${formatStars(g.value)}</div>
        `;
        card.onclick = () => {
          const cur = syncOwnedUpgraderGifts();
          const existsIdx = cur.findIndex((x) => x.uid === g.uid);
          if (existsIdx >= 0) cur.splice(existsIdx, 1);
          else cur.push(g);
          state.upg.sourceGifts = cur;
          validateUpgraderTargetStillValid();
          updateUpgraderPickerApplyLabel();
          updateUpgraderInfo();
          drawUpgraderWheel();
          renderUpgraderPickerGrid(query);
          haptic('light');
        };
        grid.appendChild(card);
      }
      updateUpgraderPickerApplyLabel();
      return;
    }

    // Target mode: STRICTLY un-upgraded gifts more expensive than sourceGift (0.5% <= chance <= 85%),
    // filtered by All / x2 / x3 / x5 / x10 / x30, sorted ascending by price, lazy-rendered in chunks of 24!
    const srcVal = Math.max(10, getUpgTotalStake());
    const q = query.trim().toLowerCase();
    const xf = state.upgXFilter || 'all';

    const pool = [
      ...(typeF === 'upgraded' ? [] : state.basicGifts.map((b) => ({ type: 'basic', key: b.slug, name: b.name, price: b.price, image: b.image }))),
      ...(typeF === 'regular' ? [] : state.catalog.map((c) => ({ type: 'collection', key: c.name, name: c.name, price: Math.round(c.price), image: c.image })))
    ].filter((it) => {
      if (it.price <= srcVal) return false;
      const ch = (srcVal / it.price) * 90;
      if (ch < 0.5 || ch > 85) return false;
      const ratio = it.price / srcVal;
      if (!matchesUpgXFilter(ratio, xf)) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortM === 'price_desc') pool.sort((a, b) => b.price - a.price);
    else if (sortM === 'alpha') pool.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    else pool.sort((a, b) => a.price - b.price);

    if (!pool.length) {
      const msg = xf === 'all'
        ? 'Нет доступных подарков дороже вашего'
        : `Нет подарков в категории x${xf} для цены ${formatStars(srcVal)} звёзд`;
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">${msg}</div>`;
      return;
    }

    const slice = pool.slice(0, state.upgPickerLimit);
    const frag = document.createDocumentFragment();
    for (const item of slice) {
      const ch = Number(((srcVal / item.price) * 90).toFixed(1));
      const mult = Number((item.price / srcVal).toFixed(2));
      const card = document.createElement('div');
      card.className = 'upg-pick-card';
      card.innerHTML = `
        <span class="upg-pick-mult">x${mult}</span>
        <span class="upg-pick-badge">${ch}%</span>
        <img class="upg-pick-img" src="${esc(item.image)}" alt="" loading="lazy" />
        <div class="upg-pick-name">${esc(item.name)}</div>
        <div class="upg-pick-price">${formatStars(item.price)}</div>
      `;
      card.onclick = () => {
        state.upg.targetItem = item;
        document.querySelectorAll('[data-upg-x]').forEach((b) => b.classList.remove('active'));
        closeModal('modal-upg-picker');
        updateUpgraderInfo();
        drawUpgraderWheel();
        haptic('light');
      };
      frag.appendChild(card);
    }
    grid.appendChild(frag);

    const remaining = pool.length - slice.length;
    if (remaining > 0) {
      moreBtn.textContent = `Показать ещё (осталось ${remaining})`;
      moreBtn.classList.remove('hidden');
    }
  }

  function drawUpgraderWheel() {
    const canvas = $('upgrader-canvas');
    if (!canvas) return;
    const w = 280;
    const h = 280;
    const ctx = setupHiDpiCanvas(canvas, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = 104;

    // MUST match server exact winChance: 90 / multiplier for stars mode, or server spinChance while spinning!
    const chance = (state.upg.spinning && Number.isFinite(state.upg.spinChance))
      ? state.upg.spinChance
      : Math.max(0, Math.min(78, state.upg.chance || 0));

    // Green winning zone is ALWAYS centered at the BOTTOM of the ring (Math.PI / 2 = 6 o'clock)!
    const winRad = (chance / 100) * Math.PI * 2;
    const startRad = Math.PI / 2 - winRad / 2;

    ctx.clearRect(0, 0, w, h);

    // Subtle outer gauge ring with 60 precision ticks
    ctx.beginPath();
    ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const r1 = r + (major ? 14 : 16);
      const r2 = r + 21;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.strokeStyle = major ? 'rgba(226, 232, 240, 0.34)' : 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = major ? 1.8 : 1;
      ctx.stroke();
    }

    // Dark recessed base track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#182433';
    ctx.lineWidth = 24;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Inner subtle hairline rim
    ctx.beginPath();
    ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Glowing emerald winning arc centered at the BOTTOM
    if (winRad > 0) {
      const greenGrad = ctx.createLinearGradient(cx - r, cy + r * 0.4, cx + r, cy + r);
      greenGrad.addColorStop(0, '#10b981');
      greenGrad.addColorStop(0.5, '#22c55e');
      greenGrad.addColorStop(1, '#4ade80');

      // Soft outer halo behind green arc
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, startRad, startRad + winRad);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.24)';
      ctx.lineWidth = 30;
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.restore();

      // Main vivid green arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, startRad, startRad + winRad);
      ctx.strokeStyle = greenGrad;
      ctx.lineWidth = 22;
      ctx.lineCap = 'butt';
      ctx.stroke();

      // Crisp boundary markers at start & end of winning zone
      for (const edgeA of [startRad, startRad + winRad]) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(edgeA) * (r - 12), cy + Math.sin(edgeA) * (r - 12));
        ctx.lineTo(cx + Math.cos(edgeA) * (r + 12), cy + Math.sin(edgeA) * (r + 12));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Precision pointer synced 1:1 with server stopAngle (0..winDeg = inside bottom green zone!)
    const ptrRad = startRad + (state.upg.pointerAngle * Math.PI) / 180;
    const tipX = cx + Math.cos(ptrRad) * (r - 14);
    const tipY = cy + Math.sin(ptrRad) * (r - 14);
    const baseR = r + 24;
    const perp = ptrRad + Math.PI / 2;
    const halfBase = 8;
    const bx = cx + Math.cos(ptrRad) * baseR;
    const by = cy + Math.sin(ptrRad) * baseR;

    // Pointer triangle pointing inward to the track
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(bx + Math.cos(perp) * halfBase, by + Math.sin(perp) * halfBase);
    ctx.lineTo(bx - Math.cos(perp) * halfBase, by - Math.sin(perp) * halfBase);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Luminous white dot at pointer tail
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function runUpgraderSpinAnim(stopAngle, onDone) {
    const startDeg = ((state.upg.pointerAngle % 360) + 360) % 360;
    const isFast = Boolean(state.upg.fastMode);
    const turns = isFast ? 2 : 5;
    const dur = isFast ? 950 : 4500;
    const totalDelta = 360 * turns + ((stopAngle - startDeg + 360) % 360);
    const t0 = performance.now();
    let lastTickIdx = Math.floor(startDeg / 18);

    // Smooth, gradual deceleration (no sudden wall-brake at the end!)
    function smoothEaseOut(p) {
      if (isFast) return 1 - Math.pow(1 - p, 2.5);
      // Gentle ease-in during first 6% then silky cubic-like long glide to stop
      return 1 - Math.pow(1 - p, 2.75);
    }

    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = smoothEaseOut(p);
      const curDeg = startDeg + totalDelta * eased;
      state.upg.pointerAngle = curDeg;

      const tickIdx = Math.floor(curDeg / 18);
      if (tickIdx !== lastTickIdx) {
        lastTickIdx = tickIdx;
        if (!isFast || tickIdx % 2 === 0) SoundFX.tick();
      }

      drawUpgraderWheel();
      if (p < 1) requestAnimationFrame(step);
      else {
        state.upg.pointerAngle = stopAngle;
        drawUpgraderWheel();
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  async function handleUpgraderPlay() {
    if (state.upg.spinning) return;

    const gifts = syncOwnedUpgraderGifts();
    const extraStars = getUpgExtraStars();
    const totalStake = getUpgTotalStake();
    const tgt = state.upg.targetItem;

    if (totalStake < 10 || !tgt) {
      showToast('Выберите ставку и цель', 'error');
      return;
    }

    state.upg.spinning = true;
    $('upg-play-btn').disabled = true;

    try {
      const res = await api('/api/games/upgrader/play-gift', {
        method: 'POST',
        body: {
          sourceUids: gifts.map((g) => g.uid),
          extraStars,
          targetType: tgt.type,
          targetKey: tgt.key,
          targetStars: tgt.type === 'stars' ? tgt.price : undefined
        }
      });

      if (extraStars > 0 && state.user) {
        updateDisplayedBalance(Math.max(0, (state.user.balance || 0) - extraStars));
      }
      if (state.user && Array.isArray(res.inventoryAfterBet)) {
        state.user.inventory = res.inventoryAfterBet;
        $('inv-count').textContent = state.user.inventory.length;
      }
      haptic('medium');

      state.upg.spinChance = Number(res.winChance);
      runUpgraderSpinAnim(res.stopAngle, async () => {
        state.upg.spinChance = null;
        // Spent NFTs are removed, while targetItem is PRESERVED for repeat plays (unless new stake >= target price)!
        state.upg.sourceGifts = [];
        await flushAndApplyUser(res.feedToken, res.user);
        state.upg.spinning = false;

        // Clamp star stake to new balance if stars were used
        if (extraStars > 0) {
          const clampedNext = clampUpgExtraStars(extraStars);
          state.upg.extraStars = clampedNext;
          const inp = $('upg-extra-stars-input');
          if (inp) inp.value = String(clampedNext);
        }

        validateUpgraderTargetStillValid();
        updatePfStrips();
        updateUpgraderInfo();
        drawUpgraderWheel();
        if (res.won && res.wonGift) {
          haptic('success');
          SoundFX.bigWin();
          showToast(`Апгрейд успешен! Получен «${res.wonGift.collectionName}» (${formatStars(res.wonGift.value)})`, 'gold');
          openTelegramGiftModal(res.wonGift);
        } else if (res.won && res.wonStars > 0) {
          haptic('success');
          SoundFX.bigWin();
          showToast(`Апгрейд успешен! Выиграно +${formatStars(res.wonStars)} звёзд`, 'gold');
        } else {
          haptic('error');
          SoundFX.lose();
          showToast('Не повезло — ставка сгорела в апгрейдере', 'error');
        }
      });
    } catch (e) {
      state.upg.spinning = false;
      updateUpgraderInfo();
      showToast(e.message, 'error');
    }
  }

  // ======================== TOP 10 LEADERBOARD & PLAYER PROFILE STATS SHEET ========================
  async function loadLeaderboard() {
    const list = $('leaderboard-list');
    try {
      const res = await api('/api/leaderboard');
      $('top-my-wagered').textContent = formatStars(res.myTotalWagered || 0);
      $('top-my-rank').textContent = `#${res.myRank || '—'}`;

      const top = res.leaderboard || [];
      if (!top.length) {
        list.innerHTML = '<div class="empty-inline">Пока нет игроков со ставками</div>';
        return;
      }

      list.innerHTML = '';
      for (const p of top) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `lb-row${p.rank <= 3 ? ` rank-${p.rank}` : ''}`;
        const ava = renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 34, className: 'player-ava-box' });
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Player';
        const lvBadge = p.level ? `<span style="font-size:10px;color:#38bdf8;font-weight:800;margin-left:5px">Ур.${p.level}</span>` : '';
        const rankIcon = p.rank <= 3 ? tgIcon('trophy', 15) : `#${p.rank}`;
        btn.innerHTML = `
          <div class="lb-left">
            <span class="lb-rank">${rankIcon}</span>
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(fullName)}${lvBadge}</div>
              <div class="player-bet">${p.username ? `@${esc(p.username)}` : `ID: ${esc(p.telegramId)}`}</div>
            </div>
          </div>
          <div class="lb-right">
            <div class="lb-wager">${starIconHtml(12)} ${formatStars(p.totalWagered)}</div>
            <div class="lb-games">${p.totalGames} игр</div>
          </div>
        `;
        btn.onclick = () => {
          haptic('light');
          openPlayerStatsModal(p.telegramId);
        };
        list.appendChild(btn);
      }
    } catch (e) {
      list.innerHTML = `<div class="empty-inline">${esc(e.message)}</div>`;
    }
  }

  const GAME_STAT_META = [
    { key: 'crash',    icon: 'rocket',  title: 'Краш (Ракета)',    showMult: true },
    { key: 'cases',    icon: 'gift',    title: 'Кейсы',            showMult: false },
    { key: 'wheel',    icon: 'wheel',   title: 'Колесо Удачи',     showMult: false },
    { key: 'mines',    icon: 'gem',     title: 'Мины 5×5',         showMult: true },
    { key: 'plinko',   icon: 'target',  title: 'Плинко',           showMult: true },
    { key: 'pvp',      icon: 'swords',  title: 'PvP Колесо',       showMult: false },
    { key: 'upgrader', icon: 'zap',     title: 'Апгрейдер',        showMult: true }
  ];

  async function openPlayerStatsModal(telegramId) {
    const body = $('player-stats-scroll');
    body.innerHTML = '<div class="empty-inline" style="padding:24px 0">Загрузка статистики игрока...</div>';
    openModal('modal-player-stats');

    try {
      const res = await api(`/api/player/${encodeURIComponent(telegramId)}`);
      const p = res.player;
      const st = p.stats || {};
      const games = st.games || {};
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Игрок';
      const joined = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

      const avaHtml = renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 58 });
      const lv = p.levelInfo || { level: p.level || 1, totalWagered: st.totalWagered || 0, nextLevel: 2, nextMin: 1000, percent: 0 };
      const isSelf = String(p.telegramId) === String(state.user?.telegramId);

      const gameCardsHtml = GAME_STAT_META.map((gm) => {
        const g = games[gm.key] || { wagered: 0, won: 0, lost: 0, maxWin: 0, maxMult: 0, plays: 0 };
        const multRow = gm.showMult
          ? `<div class="game-stat-cell"><span>Макс. X</span><b class="gold">${g.maxMult ? `x${g.maxMult}` : '—'}</b></div>`
          : '';
        return `
          <div class="game-stat-card">
            <div class="game-stat-head">
              <span class="game-stat-title">${gm.icon ? tgIcon(gm.icon, 14) + ' ' : ''}${gm.title}</span>
              <span class="game-stat-plays">Игр: ${formatStars(g.plays)}</span>
            </div>
            <div class="game-stat-grid">
              <div class="game-stat-cell"><span>Ставок</span><b>${formatStars(g.wagered)} ${starIconHtml(11)}</b></div>
              <div class="game-stat-cell"><span>Выиграно</span><b class="pos">+${formatStars(g.won)} ${starIconHtml(11)}</b></div>
              <div class="game-stat-cell"><span>Проиграно</span><b class="neg">-${formatStars(g.lost)} ${starIconHtml(11)}</b></div>
              <div class="game-stat-cell"><span>Макс. выигрыш</span><b class="gold">${formatStars(g.maxWin)} ${starIconHtml(11)}</b></div>
              ${multRow}
            </div>
          </div>
        `;
      }).join('');

      const canSeePrivate = Boolean(p.isViewerAdmin || state.user?.isAdmin);
      const privateMetaRow = canSeePrivate && (p.username || p.telegramId)
        ? `<div class="pstats-meta">${p.username ? `@${esc(p.username)} • ` : ''}ID: ${esc(p.telegramId)}</div>`
        : '';

      body.innerHTML = `
        <div class="pstats-hero">
          ${avaHtml}
          <div style="min-width:0">
            <div class="pstats-name">${esc(fullName)}</div>
            ${privateMetaRow}
            <div class="pstats-meta">В ZetGifts с ${joined} • Подарков: ${p.giftsCount} (${formatStars(p.inventoryValue)} ${starIconHtml(11)})</div>
          </div>
        </div>

        <div class="profile-level-card ${isSelf ? '' : 'readonly'}" ${isSelf ? 'id="pstats-level-open-btn"' : ''}>
          <div class="profile-level-top">
            <span class="profile-level-badge">${tgIcon('award', 13)} Уровень ${lv.level}</span>
            <span class="profile-level-nums">${lv.nextLevel ? `${formatStars(lv.totalWagered)} / ${formatStars(lv.nextMin)}` : `MAX • ${formatStars(lv.totalWagered)}`} ${starIconHtml(11)}</span>
          </div>
          <div class="profile-level-bar-track">
            <div class="profile-level-bar-fill" style="width:${computeLevelProgressPct(lv)}%"></div>
          </div>
        </div>

        <div class="pstats-summary-grid">
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Общий объём ставок</div>
            <div class="pstats-kpi-val gold">${starIconHtml(13)} ${formatStars(st.totalWagered || 0)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Макс. выигрыш</div>
            <div class="pstats-kpi-val green">${starIconHtml(13)} ${formatStars(st.biggestWin || 0)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Всего выиграно</div>
            <div class="pstats-kpi-val green">+${formatStars(st.totalWon || 0)} ${starIconHtml(12)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Всего проиграно</div>
            <div class="pstats-kpi-val red">-${formatStars(st.totalLost || 0)} ${starIconHtml(12)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Сыграно раундов</div>
            <div class="pstats-kpi-val">${formatStars(st.totalGames || 0)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Улучшено / Крафт</div>
            <div class="pstats-kpi-val">${st.giftsUpgraded || 0} / ${st.giftsCrafted || 0}</div>
          </div>
        </div>

        <div class="pstats-section-title">Статистика по играм</div>
        ${gameCardsHtml}
        ${isSelf ? `
          <div class="pstats-pf-footer">
            <button type="button" id="pstats-open-pf-btn" class="tg-btn tg-btn-secondary tg-btn-lg">
              ${tgIcon('shield', 16)} Проверка честности (Provably Fair)
            </button>
          </div>
        ` : ''}
      `;
      $('pstats-level-open-btn')?.addEventListener('click', () => {
        SoundFX.click();
        closeModal('modal-player-stats');
        openLevelsModal();
      });
      $('pstats-open-pf-btn')?.addEventListener('click', () => {
        SoundFX.click();
        closeModal('modal-player-stats');
        openProvablyFairModal('user');
      });
    } catch (e) {
      body.innerHTML = `<div class="empty-inline" style="padding:24px 0">${esc(e.message)}</div>`;
    }
  }

  // ======================== GIFT SHOP (11 BASIC + 124 REAL COLLECTIONS WITH REAL PRICES) ========================
  async function openCatalogModal() {
    openModal('modal-catalog');
    if (!state.catalog.length) {
      $('catalog-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Загрузка каталога...</div>';
      try {
        const res = await api('/api/catalog');
        state.basicGifts = res.basicGifts || [];
        state.catalog = (res.collections || []).slice().sort((a, b) => a.price - b.price);
      } catch (e) {
        showToast(e.message, 'error');
        return;
      }
    }
    renderCatalogGrid($('catalog-search').value || '');
  }

  function renderCatalogGrid(query = '') {
    const q = query.trim().toLowerCase();
    const typeFilter = $('catalog-type-select')?.value || 'all';
    const sortMode = $('catalog-sort-select')?.value || 'price_asc';

    const sortArr = (arr) => {
      const a = arr.slice();
      if (sortMode === 'price_desc') a.sort((x, y) => Number(y.price || 0) - Number(x.price || 0));
      else if (sortMode === 'alpha') a.sort((x, y) => String(x.name || '').localeCompare(String(y.name || ''), 'ru'));
      else a.sort((x, y) => Number(x.price || 0) - Number(y.price || 0));
      return a;
    };

    const basics = typeFilter === 'collection' ? [] : sortArr(
      q ? state.basicGifts.filter((b) => b.name.toLowerCase().includes(q) || (b.enName || '').toLowerCase().includes(q))
        : state.basicGifts
    );
    const cols = typeFilter === 'basic' ? [] : sortArr(
      q ? state.catalog.filter((c) => c.name.toLowerCase().includes(q))
        : state.catalog
    );

    const grid = $('catalog-grid');
    if (!basics.length && !cols.length) {
      grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Ничего не найдено</div>';
      return;
    }

    grid.innerHTML = '';

    // 1. Cheap regular NON-COLLECTIBLE Telegram gifts (Screenshots 2 top)
    if (basics.length) {
      const hdr = document.createElement('div');
      hdr.className = 'catalog-section-label';
      hdr.textContent = 'Обычные подарки';
      grid.appendChild(hdr);

      for (const b of basics) {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
          <img src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy" />
          <div class="catalog-name">${esc(b.name)}</div>
          <button type="button" class="catalog-buy-btn">${formatStars(b.price)}</button>
        `;
        card.querySelector('button').onclick = async () => {
          try {
            const res = await api('/api/gifts/buy', { method: 'POST', body: { basicSlug: b.slug } });
            state.user = res.user;
            renderUser();
            haptic('success');
            showToast(`Куплен подарок «${b.name}»!`, 'success');
          } catch (e) {
            showToast(e.message, 'error');
          }
        };
        grid.appendChild(card);
      }
    }

    // 2. All 124 collectible Telegram gifts with real market prices & green "маркет" ribbon!
    if (cols.length) {
      const hdr = document.createElement('div');
      hdr.className = 'catalog-section-label';
      hdr.textContent = 'Коллекционные (Маркет)';
      grid.appendChild(hdr);

      for (const c of cols) {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
          <span class="catalog-ribbon">маркет</span>
          <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" />
          <div class="catalog-name">${esc(c.name)}</div>
          <button type="button" class="catalog-buy-btn">${formatStars(c.price)}</button>
        `;
        card.querySelector('button').onclick = async () => {
          try {
            const res = await api('/api/gifts/buy', { method: 'POST', body: { collectionName: c.name } });
            state.user = res.user;
            renderUser();
            haptic('success');
            showToast(`Куплен «${c.name}»! Можно улучшить в Профиле за 25 звёзд`, 'success');
          } catch (e) {
            showToast(e.message, 'error');
          }
        };
        grid.appendChild(card);
      }
    }
  }

  // ======================== HISTORY & TOP-UP ========================
  function renderHistory() {
    const list = $('history-list');
    const items = state.user?.history || [];
    if (!items.length) {
      list.innerHTML = '<div class="empty-inline">История пока пуста</div>';
      return;
    }
    list.innerHTML = items.map((h) => {
      const dt = new Date(h.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const amtHtml = h.amount
        ? `<span class="history-amt ${h.amount > 0 ? 'pos' : 'neg'}">${h.amount > 0 ? '+' : ''}${formatStars(h.amount)} ${starIconHtml(13)}</span>`
        : `<span class="history-amt" style="color:var(--accent)">${tgIcon('gift', 15)}</span>`;
      return `
        <div class="history-item">
          <div>
            <div class="history-title">${esc(h.title)}</div>
            <div class="history-date">${dt}</div>
          </div>
          ${amtHtml}
        </div>
      `;
    }).join('');
  }

  async function handleTopupPay() {
    const amount = Math.floor(Number($('topup-custom-input').value));
    if (!Number.isFinite(amount) || amount < 10) {
      showToast('Минимальная сумма пополнения — 10 звёзд', 'error');
      return;
    }
    $('topup-pay-btn').disabled = true;
    try {
      const res = await api('/api/topup', { method: 'POST', body: { amount } });
      if (tg?.openInvoice && res.invoiceUrl) {
        tg.openInvoice(res.invoiceUrl, async (status) => {
          if (status === 'paid') {
            const conf = await api('/api/topup/confirm', { method: 'POST', body: { amount, status, invoiceId: res.invoiceId || '' } });
            state.user = conf.user;
            renderUser();
            closeModal('modal-topup');
            showToast(`Баланс пополнен на +${formatStars(amount)} звёзд!`, 'gold');
          } else {
            showToast('Оплата отменена', 'info');
          }
        });
      } else {
        showToast('Откройте приложение для оплаты Stars', 'info');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      $('topup-pay-btn').disabled = false;
    }
  }

  // ======================== ADMIN PANEL (ID: 8213153991) ========================
  async function loadCatalogForAdmin() {
    try {
      const res = await api('/api/catalog');
      state.basicGifts = res.basicGifts || [];
      state.catalog = res.collections || [];
      const optsHtml = state.catalog
        .map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${formatStars(c.price)} зв.)</option>`)
        .join('');
      if ($('admin-gift-select')) {
        $('admin-gift-select').innerHTML = optsHtml;
        syncCustomSelect($('admin-gift-select'));
      }
      if ($('adm-giftrain-select')) {
        $('adm-giftrain-select').innerHTML = optsHtml;
        syncCustomSelect($('adm-giftrain-select'));
      }
    } catch {}
  }

  async function loadAdminRecentUsers() {
    try {
      const res = await api('/api/admin/users');
      const box = $('admin-users-list');
      box.innerHTML = (res.users || []).map((u) => `
        <div class="player-row" style="cursor:pointer" data-uid="${esc(u.telegramId)}">
          <div class="player-left">
            ${renderAvatarHtml(u.photoUrl, u.firstName, u.avatarFrame, { size: 32, className: 'player-ava-box' })}
            <div>
              <div class="player-name">${esc(u.firstName)} ${u.level ? `<span style="font-size:10px;color:#38bdf8;font-weight:800">Ур.${u.level}</span>` : ''} ${u.banned ? tgIcon('ban', 13) : ''}</div>
              <div class="player-bet">ID: ${esc(u.telegramId)} • ${starIconHtml(11)} ${formatStars(u.balance)} • ${tgIcon('gift', 11)} ${u.inventoryCount}</div>
            </div>
          </div>
          <span class="tg-btn-pill">Выбрать</span>
        </div>
      `).join('');
      box.querySelectorAll('[data-uid]').forEach((row) => {
        row.onclick = () => {
          $('admin-search-input').value = row.dataset.uid;
          handleAdminSearch();
        };
      });
    } catch {}
  }

  async function handleAdminSearch() {
    const q = $('admin-search-input').value.trim();
    if (!q) return showToast('Введите Telegram ID или @username', 'error');
    try {
      const res = await api(`/api/admin/user/${encodeURIComponent(q)}`);
      state.adminSelectedUser = res.user;
      renderAdminSelectedUser();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function renderAdminSelectedUser() {
    const u = state.adminSelectedUser;
    if (!u) return;
    $('admin-user-card').classList.remove('hidden');
    $('admin-u-name').textContent = `${u.firstName} ${u.username ? `(@${u.username})` : ''}`;
    const wagered = Number(u.stats?.totalWagered || 0);
    const won = Number(u.stats?.totalWon || 0);
    const net = won - wagered;
    const netStr = net >= 0 ? `+${formatStars(net)}` : `-${formatStars(Math.abs(net))}`;
    $('admin-u-meta').textContent = `ID: ${u.telegramId} • Ур. ${u.level || 1} • Баланс: ${formatStars(u.balance)} зв. • Подарков: ${(u.inventory || []).length} • Профит: ${netStr}`;
    const badge = $('admin-u-ban-badge');
    badge.textContent = u.banned ? 'Забанен' : 'Активен';
    badge.className = u.banned ? 'badge-red' : 'badge-green';
    $('admin-ban-toggle').innerHTML = u.banned ? `${tgIcon('check', 15)} Разбанить пользователя` : `${tgIcon('ban', 15)} Забанить пользователя`;
    const exactInp = $('adm-exact-bal-input');
    if (exactInp) exactInp.value = String(Math.floor(u.balance || 0));
    const lvInp = $('adm-level-input');
    if (lvInp) lvInp.value = String(u.level || 1);
    populateAdminFrameSelect(u.activeFrame || u.equippedFrame || '');

    // Render user inventory with per-gift remove button
    const invBox = $('adm-user-inv-list');
    if (invBox) {
      const inv = Array.isArray(u.inventory) ? u.inventory : [];
      if (!inv.length) {
        invBox.innerHTML = '<div class="empty-inline">Инвентарь пуст</div>';
      } else {
        invBox.innerHTML = inv.slice(0, 40).map((g) => `
          <div class="adm-user-inv-row">
            <div class="adm-user-inv-left">
              <img class="adm-user-inv-img" src="${esc(g.image || '')}" alt="" />
              <div style="min-width:0">
                <div class="adm-round-player-name">${esc(g.collectionName || 'Подарок')}${g.upgraded ? ' (NFT)' : ''}</div>
                <div class="adm-round-player-detail">${formatStars(g.value || 0)} зв.${g.mintNumber ? ` • #${g.mintNumber}` : ''}</div>
              </div>
            </div>
            <button type="button" class="tg-btn-pill" data-adm-del-gift="${esc(g.uid)}">Удалить</button>
          </div>
        `).join('');
        invBox.querySelectorAll('[data-adm-del-gift]').forEach((btn) => {
          btn.onclick = () => {
            if (!confirm('Удалить этот подарок из инвентаря игрока?')) return;
            callAdminUserExtra('remove_gift', { giftUid: btn.dataset.admDelGift }, 'Подарок удалён из инвентаря');
          };
        });
      }
    }
  }

  function applyAppConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    state.appConfig = cfg;
    const ov = $('maintenance-overlay');
    const txt = $('maintenance-overlay-text');
    if (txt && cfg.maintenanceText) txt.textContent = cfg.maintenanceText;
    if (ov) {
      const showMaint = Boolean(cfg.maintenanceMode) && !state.user?.isAdmin;
      ov.classList.toggle('hidden', !showMaint);
    }
    const navAuc = $('nav-p2p-auction');
    const aucOn = Boolean(cfg.p2pAuctionEnabled);
    if (navAuc) navAuc.classList.toggle('hidden', !aucOn);
    if (!aucOn && state.tab === 'p2p-auction') {
      state.p2pAuctionActiveLotId = null;
      switchTab('games', false);
    }
  }

  const ADMIN_GAMES_META = [
    { key: 'crash', label: 'Ракета' },
    { key: 'mines', label: 'Мины' },
    { key: 'plinko', label: 'Плинко' },
    { key: 'wheel', label: 'Колесо' },
    { key: 'slots', label: 'Слоты' },
    { key: 'upgrader', label: 'Апгрейдер' },
    { key: 'craft', label: 'Крафт' },
    { key: 'singularity', label: 'Сингулярность' },
    { key: 'auction', label: 'Аукцион' },
    { key: 'safe', label: 'Сейф' },
    { key: 'cases', label: 'Кейсы' },
    { key: 'pvp', label: 'PvP' }
  ];

  const ADMIN_GAME_LABEL_BY_KEY = Object.fromEntries(ADMIN_GAMES_META.map((g) => [g.key, g.label]));

  const adminLiveState = {
    syncTimer: null,
    lastCrashForecast: null,
    activeInfoGame: 'crash',
    gamesInfo: { totals: {}, rounds: {}, radar: [] },
    openRoundIds: new Set(),
    radarFilter: 'all',
    whalesTab: 'winners',
    whalesData: null,
    ecoDraft: { depositBonusPct: 0, xpMultiplier: 1, freezeMarket: false }
  };

  function startAdminAutoSync() {
    stopAdminAutoSync();
    adminLiveState.syncTimer = setInterval(() => {
      if (!state.user?.isAdmin || state.tab !== 'admin') return;
      loadAdminCrashForecast();
      loadAdminWithdraws();
      if (document.querySelector('[data-adm-acc="stats"].open, [data-adm-acc="stats"].is-open')) loadAdminStats();
      if (document.querySelector('[data-adm-acc="online-rain"].open, [data-adm-acc="games-ctl"].open, [data-adm-acc="system"].open, [data-adm-acc="online-rain"].is-open, [data-adm-acc="games-ctl"].is-open, [data-adm-acc="system"].is-open')) {
        loadAdminControls();
      }
      if (document.querySelector('[data-adm-acc="whales"].open, [data-adm-acc="whales"].is-open')) loadAdminWhales();
      if (document.querySelector('[data-adm-acc="bans-audit"].open, [data-adm-acc="bans-audit"].is-open')) {
        loadAdminBans();
        loadAdminAudit();
      }
    }, 3500);
  }

  async function loadAdminWithdraws(query = '') {
    try {
      const q = String(query || $('adm-wd-search-input')?.value || '').trim();
      const data = await api(`/api/admin/withdraws${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      const pending = data.pending || [];
      const history = data.history || [];
      const pill = $('adm-wd-pill');
      if (pill) pill.textContent = `${pending.length} ожидает`;

      const pBox = $('adm-wd-pending-list');
      if (pBox) {
        if (!pending.length) {
          pBox.innerHTML = '<div class="empty-inline" style="padding:10px 0">Активных заявок на вывод нет</div>';
        } else {
          pBox.innerHTML = pending.map((w) => `
            <div class="adm-wd-card-v2">
              <div class="adm-wd-top">
                <div class="adm-wd-thumb">
                  <img src="${esc(w.giftImage || '')}" alt="" />
                </div>
                <div class="adm-wd-body">
                  <div class="adm-wd-head-row">
                    <span class="adm-wd-id-badge">#${esc(w.id)}</span>
                    <span style="font-size:12px;font-weight:800;color:#fde68a">${formatStars(w.giftValue || 0)} ⭐</span>
                  </div>
                  <div class="adm-wd-title" style="margin-top:4px">${esc(w.giftName)}${w.mintNumber ? ` #${w.mintNumber}` : ''}</div>
                  <div class="adm-wd-detail-line">
                    Игрок: <b>${esc(w.userName)}</b> ${w.username ? `(@${esc(w.username)})` : ''} • ID ${esc(w.telegramId)}
                  </div>
                  <div class="adm-wd-detail-line">
                    Модель: ${esc(w.modelName || '—')} • Фон: ${esc(w.backdropName || '—')} • Узор: ${esc(w.symbolName || '—')}
                  </div>
                  ${w.obtainedFrom ? `<div class="adm-wd-detail-line">Источник: ${esc(w.obtainedFrom)}</div>` : ''}
                </div>
              </div>
              <div class="adm-wd-actions">
                <button type="button" class="tg-btn tg-btn-danger" data-wd-act="no" data-wd-id="${esc(w.id)}">Отклонить</button>
                <button type="button" class="tg-btn tg-btn-primary" data-wd-act="ok" data-wd-id="${esc(w.id)}">Принять</button>
              </div>
            </div>
          `).join('');
          pBox.querySelectorAll('[data-wd-act]').forEach((btn) => {
            btn.onclick = async () => {
              const approve = btn.dataset.wdAct === 'ok';
              const id = btn.dataset.wdId;
              btn.disabled = true;
              try {
                await api('/api/admin/withdraw/resolve', { method: 'POST', body: { id, approve } });
                showToast(approve ? `Заявка #${id} принята! Игрок уведомлён.` : `Заявка #${id} отклонена, подарок возвращён.`, approve ? 'success' : 'info');
                haptic('success');
                loadAdminWithdraws($('adm-wd-search-input')?.value || '');
                loadAdminAudit();
              } catch (e) {
                showToast(e.message, 'error');
                btn.disabled = false;
              }
            };
          });
        }
      }

      const hBox = $('adm-wd-history-list');
      if (hBox) {
        if (!history.length) {
          hBox.innerHTML = `<div class="empty-inline" style="padding:8px 0">${q ? 'По этому ID ничего не найдено' : 'История пока пуста'}</div>`;
        } else {
          hBox.innerHTML = history.slice(0, 60).map((w) => {
            const stLbl = w.status === 'approved' ? 'Выведено' : w.status === 'cancelled_by_user' ? 'Отменено' : 'Отклонено';
            const stCls = w.status === 'approved' ? 'approved' : w.status === 'cancelled_by_user' ? 'cancelled' : 'rejected';
            return `
              <div class="adm-wd-card-v2">
                <div class="adm-wd-top">
                  <div class="adm-wd-thumb">
                    <img src="${esc(w.giftImage || '')}" alt="" />
                  </div>
                  <div class="adm-wd-body">
                    <div class="adm-wd-head-row">
                      <span class="adm-wd-id-badge">#${esc(w.id)}</span>
                      <span class="adm-wd-status-right ${stCls}">${stLbl}</span>
                    </div>
                    <div class="adm-wd-title" style="margin-top:4px">${esc(w.giftName)}${w.mintNumber ? ` #${w.mintNumber}` : ''}</div>
                    <div class="adm-wd-detail-line">${esc(w.userName)} ${w.username ? `(@${esc(w.username)})` : ''} • ID ${esc(w.telegramId)}</div>
                    <div class="adm-wd-detail-line">${formatShortTime(w.resolvedAt || w.createdAt)} • ${formatStars(w.giftValue || 0)} ⭐</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    } catch {}
  }

  async function loadAdminBans() {
    try {
      const data = await api('/api/admin/bans');
      const banned = data.banned || [];
      const pill = $('adm-bans-pill');
      if (pill) pill.textContent = `${banned.length} бан`;
      const box = $('adm-bans-list');
      if (!box) return;
      if (!banned.length) {
        box.innerHTML = '<div class="empty-inline" style="padding:8px 0">Заблокированных игроков нет</div>';
        return;
      }
      box.innerHTML = banned.map((u) => `
        <div class="player-row">
          <div class="player-left">
            ${renderAvatarHtml(u.photoUrl, u.firstName, u.avatarFrame, { size: 30, className: 'player-ava-box' })}
            <div>
              <div class="player-name">${esc(u.firstName)} ${u.username ? `<span style="opacity:.65;font-size:11px">@${esc(u.username)}</span>` : ''}</div>
              <div class="player-bet">ID: ${esc(u.telegramId)} • ${starIconHtml(11)} ${formatStars(u.balance)}</div>
            </div>
          </div>
          <button type="button" class="tg-btn tg-btn-secondary" style="min-height:30px;padding:4px 10px;font-size:12px" data-unban-uid="${esc(u.telegramId)}">Разбанить</button>
        </div>
      `).join('');
      box.querySelectorAll('[data-unban-uid]').forEach((btn) => {
        btn.onclick = async () => {
          try {
            await api('/api/admin/user/update', { method: 'POST', body: { telegramId: btn.dataset.unbanUid, banned: false } });
            showToast('Игрок разблокирован', 'success');
            loadAdminBans();
            loadAdminAudit();
          } catch (e) { showToast(e.message, 'error'); }
        };
      });
    } catch {}
  }

  async function loadAdminAudit() {
    try {
      const data = await api('/api/admin/audit');
      const rows = data.audit || [];
      const box = $('adm-audit-list');
      if (!box) return;
      if (!rows.length) {
        box.innerHTML = '<div class="empty-inline" style="padding:8px 0">Журнал пока пуст</div>';
        return;
      }
      box.innerHTML = rows.slice(0, 30).map((r) => `
        <div class="adm-radar-row">
          <div style="flex:1;min-width:0">
            <div class="player-name" style="font-size:12.5px">${esc(r.action)}</div>
            <div class="player-bet">${esc(r.details)}</div>
          </div>
          <span class="adm-round-time">${formatShortTime(r.at)}</span>
        </div>
      `).join('');
    } catch {}
  }

  function formatFullDateTime(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  async function loadAdminStarDeposits(query = '') {
    try {
      const q = String(query || '').trim();
      const url = q ? `/api/admin/star-deposits?q=${encodeURIComponent(q)}` : '/api/admin/star-deposits';
      const data = await api(url);
      const deposits = data.deposits || [];
      const stats = data.stats || {};
      const uSum = data.userSummary || null;

      const pill = $('adm-refund-pill');
      if (pill) pill.textContent = `${stats.paidCount || 0} оплат`;
      if ($('adm-ref-stat-paid')) $('adm-ref-stat-paid').textContent = formatStars(stats.totalPaidStars || 0);
      if ($('adm-ref-stat-refunded')) $('adm-ref-stat-refunded').textContent = formatStars(stats.totalRefundedStars || 0);

      const uCard = $('adm-refund-user-card');
      if (uCard) {
        if (uSum) {
          uCard.classList.remove('hidden');
          uCard.innerHTML = `
            <div class="adm-ref-user-top">
              ${renderAvatarHtml(uSum.photoUrl, uSum.firstName, uSum.avatarFrame, { size: 36, className: 'player-ava-box' })}
              <div style="flex:1;min-width:0">
                <div class="adm-wd-title">${esc(uSum.firstName)} ${uSum.username ? `<span style="opacity:.7;font-weight:500">@${esc(uSum.username)}</span>` : ''}</div>
                <div class="adm-wd-meta">Telegram ID: <b>${esc(uSum.telegramId)}</b> • Пополнений: ${uSum.depositsCount}</div>
              </div>
            </div>
            <div class="adm-ref-user-metrics">
              <div class="adm-ref-metric">
                <div class="adm-ref-metric-v">${formatStars(uSum.balance)}</div>
                <div class="adm-ref-metric-k">Баланс</div>
              </div>
              <div class="adm-ref-metric">
                <div class="adm-ref-metric-v" style="color:#38bdf8">${formatStars(uSum.totalDeposited)}</div>
                <div class="adm-ref-metric-k">Пополнено</div>
              </div>
              <div class="adm-ref-metric">
                <div class="adm-ref-metric-v" style="color:#fbbf24">${formatStars(uSum.totalRefunded)}</div>
                <div class="adm-ref-metric-k">Возвращено</div>
              </div>
            </div>
          `;
        } else {
          uCard.classList.add('hidden');
          uCard.innerHTML = '';
        }
      }

      const titleEl = $('adm-refund-list-title');
      if (titleEl) {
        titleEl.textContent = q
          ? `Найдено пополнений: ${deposits.length}`
          : `Последние пополнения Telegram Stars (${deposits.length})`;
      }

      const listBox = $('adm-refund-list');
      if (!listBox) return;
      if (!deposits.length) {
        listBox.innerHTML = `<div class="empty-inline" style="padding:12px 0">${q ? 'По этому запросу пополнений не найдено' : 'Пополнений через Telegram Stars пока нет'}</div>`;
        return;
      }

      listBox.innerHTML = deposits.map((d) => {
        const isRef = d.status === 'refunded';
        const chargeText = d.chargeId || 'Ожидает charge_id от Telegram';
        const bonusNote = d.bonusStars > 0 ? ` <span style="font-size:11px;color:#38bdf8;font-weight:600">(+${formatStars(d.bonusStars)} бонус)</span>` : '';
        return `
          <div class="adm-ref-card${isRef ? ' is-refunded' : ''}">
            <div class="adm-ref-head">
              <div class="adm-ref-amount">${starIconHtml(14)} ${formatStars(d.amount)} XTR${bonusNote}</div>
              <span class="adm-ref-status ${isRef ? 'is-refunded' : 'is-paid'}">${isRef ? 'Возвращено' : 'Оплачено'}</span>
            </div>
            <div class="adm-wd-meta">
              <b>${esc(d.firstName)}</b> ${d.username ? `(@${esc(d.username)})` : ''} • ID: <b>${esc(d.telegramId)}</b><br/>
              Дата: ${formatFullDateTime(d.createdAt)}${isRef ? ` • Реф: ${formatFullDateTime(d.refundedAt)} (списано ${formatStars(d.deductedAmount || 0)} зв.)` : ''}
            </div>
            <div class="adm-ref-charge-row">
              <span class="adm-ref-charge-code" title="${esc(chargeText)}">ID перевода: ${esc(chargeText)}</span>
              ${d.chargeId ? `<button type="button" class="adm-ref-copy-btn" data-ref-copy="${esc(d.chargeId)}">Копировать</button>` : ''}
            </div>
            ${!isRef ? `
              <div class="adm-wd-actions">
                <button type="button" class="tg-btn tg-btn-danger" data-ref-exec="${esc(d.id)}" data-ref-uid="${esc(d.telegramId)}" data-ref-amt="${d.amount}" data-ref-charge="${esc(d.chargeId || '')}">
                  Вернуть звёзды (${formatStars(d.amount)})
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      listBox.querySelectorAll('[data-ref-copy]').forEach((btn) => {
        btn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(btn.dataset.refCopy);
            showToast('ID транзакции скопирован', 'info');
          } catch {
            showToast(btn.dataset.refCopy, 'info');
          }
        };
      });

      listBox.querySelectorAll('[data-ref-exec]').forEach((btn) => {
        btn.onclick = async () => {
          const depositId = btn.dataset.refExec;
          const uid = btn.dataset.refUid;
          const amt = Number(btn.dataset.refAmt) || 0;
          let chargeId = btn.dataset.refCharge || '';
          const deductBalance = Boolean($('adm-refund-deduct')?.checked);
          const notifyUser = Boolean($('adm-refund-notify')?.checked);

          let forceLocal = false;
          if (!chargeId) {
            const entered = prompt('У этой оплаты не записан telegram_payment_charge_id.\nВставьте charge_id (из чека Telegram Stars) для возврата через Telegram API, или оставьте пустым для локальной отметки возврата:', '');
            if (entered === null) return;
            chargeId = entered.trim();
            if (!chargeId) forceLocal = true;
          } else {
            const ok = confirm(`Вернуть ${formatStars(amt)} Telegram Stars игроку ID ${uid}?\nТранзакция: ${chargeId}\n${deductBalance ? '• Звёзды будут списаны с баланса игрока' : '• Баланс игрока не будет затронут'}`);
            if (!ok) return;
          }

          btn.disabled = true;
          try {
            const res = await api('/api/admin/star-deposits/refund', {
              method: 'POST',
              body: { depositId, chargeId, deductBalance, notifyUser, forceLocal }
            });
            showToast(res.message || 'Возврат выполнен!', 'success');
            haptic('success');
            loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
            loadAdminAudit();
          } catch (e) {
            showToast(e.message, 'error');
            btn.disabled = false;
          }
        };
      });
    } catch {}
  }

  function stopAdminAutoSync() {
    if (adminLiveState.syncTimer) {
      clearInterval(adminLiveState.syncTimer);
      adminLiveState.syncTimer = null;
    }
  }

  function updateAdminCrashLiveTick(mult) {
    const cur = adminLiveState.lastCrashForecast?.current;
    const statusEl = $('adm-crash-cur-status');
    const boomBtn = $('adm-crash-boom-btn');
    if (statusEl) {
      const bc = cur?.betsCount ?? (state.crash.bets || []).length;
      const tb = cur?.totalBet ? ` • Банк: ${formatStars(cur.totalBet)} зв.` : '';
      statusEl.textContent = `В полёте (${Number(mult || 1).toFixed(2)}x) • Ставок: ${bc}${tb}`;
    }
    if (boomBtn) boomBtn.disabled = false;
  }

  function populateAdminFrameSelect(selectedId = '') {
    const sel = $('adm-frame-select');
    if (!sel) return;
    const frames = state.levelConfig?.frames || state.adminFramesCache || [];
    sel.innerHTML = `<option value="">Без рамки (снять)</option>` + frames
      .map((f) => `<option value="${esc(f.id)}"${f.id === selectedId ? ' selected' : ''}>${esc(f.name)}</option>`)
      .join('');
    if (selectedId) sel.value = selectedId;
  }

  function crashMultClass(m) {
    const v = Number(m) || 1;
    if (v < 1.5) return 'is-low';
    if (v < 3) return 'is-mid';
    if (v < 10) return 'is-high';
    return 'is-moon';
  }

  function formatSignedStars(val) {
    const n = Math.round(Number(val) || 0);
    if (n > 0) return `+${formatStars(n)} зв.`;
    if (n < 0) return `-${formatStars(Math.abs(n))} зв.`;
    return '0 зв.';
  }

  function signedClass(val) {
    const n = Number(val) || 0;
    if (n > 0) return 'adm-val-pos';
    if (n < 0) return 'adm-val-neg';
    return 'adm-val-neu';
  }

  function formatShortTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  }

  function openUserInAdminCard(uid) {
    if (!uid) return;
    const usersAcc = document.querySelector('[data-adm-acc="users"]');
    if (usersAcc) usersAcc.classList.add('open');
    const searchInp = $('admin-search-input');
    if (searchInp) searchInp.value = String(uid);
    handleAdminSearch();
    usersAcc?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderAdminCrashForecast(data) {
    if (!data) return;
    adminLiveState.lastCrashForecast = data;
    const cur = data.current || {};
    const roundEl = $('adm-crash-cur-round');
    const statusEl = $('adm-crash-cur-status');
    const targetEl = $('adm-crash-cur-target');
    const pillEl = $('adm-crash-next-pill');
    const boomBtn = $('adm-crash-boom-btn');
    const betsBox = $('adm-crash-live-bets');

    if (roundEl) roundEl.textContent = `#${cur.roundId || '—'}`;
    if (statusEl) {
      const liveMult = cur.phase === 'running' ? Math.max(Number(cur.multiplier || 1), Number(state.crash?.multiplier || 1)) : Number(cur.multiplier || 1);
      const ph = cur.phase === 'running' ? `В полёте (${liveMult.toFixed(2)}x)`
        : (cur.phase === 'crashed' ? `Взорвалась (${Number(cur.crashPoint || 1).toFixed(2)}x)` : 'Ожидание ставок');
      const bankTxt = cur.totalBet ? ` • Банк: ${formatStars(cur.totalBet)} зв.` : '';
      statusEl.textContent = `${ph} • Ставок: ${cur.betsCount || 0}${bankTxt}`;
    }
    if (targetEl) {
      const cp = Number(cur.crashPoint || 1).toFixed(2);
      targetEl.textContent = `${cp}x${cur.forced ? ' *' : ''}`;
    }
    if (boomBtn) boomBtn.disabled = cur.phase !== 'running';

    if (betsBox) {
      const lb = Array.isArray(cur.liveBets) ? cur.liveBets : [];
      if (!lb.length) {
        betsBox.innerHTML = '';
      } else {
        betsBox.innerHTML = `
          <div class="adm-crash-live-bets-sum">
            <span>Ставки: ${formatStars(cur.totalBet || 0)} зв.</span>
            <span>Выведено: ${formatStars(cur.totalCashedOut || 0)} зв.</span>
          </div>
          ${lb.slice(0, 6).map((b) => `
            <div class="adm-crash-live-bet-mini">
              <span>${esc(b.firstName)} — ${formatStars(b.bet)} зв.</span>
              <span class="${b.cashedOut ? 'adm-val-pos' : 'adm-val-neu'}">${b.cashedOut ? `x${Number(b.cashoutAt || 1).toFixed(2)} (+${formatStars(b.payout)})` : 'В игре'}</span>
            </div>
          `).join('')}
        `;
      }
    }

    const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
    if (pillEl && cur.crashPoint) {
      pillEl.textContent = `Сейчас: ${Number(cur.crashPoint).toFixed(2)}x`;
    }

    const listEl = $('adm-crash-forecast-list');
    if (!listEl) return;
    listEl.innerHTML = upcoming.map((item, idx) => `
      <div class="adm-crash-slot${item.forced ? ' is-forced' : ''}" data-crash-slot-idx="${idx}" data-crash-slot-rid="${item.roundId}" title="Нажмите чтобы изменить">
        <div class="adm-crash-slot-num">#${item.roundId}</div>
        <div class="adm-crash-slot-val ${crashMultClass(item.crashPoint)}">${Number(item.crashPoint).toFixed(2)}x</div>
        ${item.forced ? '<span class="adm-crash-slot-tag">Ручной</span>' : `<div class="adm-crash-slot-num">+${item.offset}</div>`}
      </div>
    `).join('');

    listEl.querySelectorAll('[data-crash-slot-idx]').forEach((el) => {
      el.onclick = async () => {
        const idx = Number(el.dataset.crashSlotIdx);
        const rid = el.dataset.crashSlotRid;
        const val = prompt(`Новый икс для раунда #${rid} (от 1.00 до 100):`, '');
        if (val === null || !val.trim()) return;
        try {
          const updated = await api('/api/admin/crash/slot', { method: 'POST', body: { index: idx, multiplier: val.trim() } });
          renderAdminCrashForecast(updated);
          showToast(`Раунд #${rid} изменён`, 'success');
          haptic('success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  }

  async function loadAdminCrashForecast() {
    try {
      const data = await api('/api/admin/crash/forecast');
      renderAdminCrashForecast(data);
    } catch {}
  }

  // ==================== ADMIN GAMES INFORMATION (ALL 12 GAMES) & LIVE RADAR ====================
  function onAdminGameRoundEvent(payload) {
    const g = payload.game;
    if (!adminLiveState.gamesInfo.rounds[g]) adminLiveState.gamesInfo.rounds[g] = [];
    adminLiveState.gamesInfo.rounds[g].unshift(payload.round);
    if (adminLiveState.gamesInfo.rounds[g].length > 60) {
      adminLiveState.gamesInfo.rounds[g] = adminLiveState.gamesInfo.rounds[g].slice(0, 60);
    }
    if (payload.totals) adminLiveState.gamesInfo.totals[g] = payload.totals;
    if (adminLiveState.activeInfoGame === g) {
      renderAdminGamesInfoBody();
    }
  }

  function onAdminLiveRadarEvent(item) {
    adminLiveState.gamesInfo.radar.unshift(item);
    if (adminLiveState.gamesInfo.radar.length > 45) {
      adminLiveState.gamesInfo.radar = adminLiveState.gamesInfo.radar.slice(0, 45);
    }
    renderAdminLiveRadar();
  }

  async function loadAdminGamesInfo() {
    try {
      const data = await api('/api/admin/games-info');
      adminLiveState.gamesInfo = {
        totals: data.totals || {},
        rounds: data.rounds || {},
        radar: data.radar || []
      };
      renderAdminGamesInfoTabs();
      renderAdminGamesInfoBody();
      renderAdminLiveRadar();
    } catch {}
  }

  const ADMIN_GAME_GEN_HINTS = {
    crash: 'Влияет на множители будущих раундов Ракеты (совместно с режимом генерации).',
    cases: 'Меняет шансы выпадения дорогих призов и NFT из кейсов.',
    upgrader: 'Понижает или повышает реальный шанс апгрейда относительно шкалы (меньше 100% — меньше частых побед).',
    craft: 'Корректирует реальный шанс успешного крафта подарков.',
    mines: 'Настраивает вероятность безопасных ячеек / мин при открытии.',
    plinko: 'Слегка смещает траекторию шарика к центру (ниже 100%) или к краям (выше 100%).',
    slots: 'Корректирует частоту выигрышных комбинаций в слотах.',
    safe: 'Корректирует вероятность совпадения цифр при взломе сейфа.',
    wheel: 'Меняет веса дорогих секторов и подарков в Колесе удачи.',
    pvp: 'Колесо PvP между игроками (комиссия настраивается в разделе «Экономика»).',
    singularity: 'Гравитационная воронка между игроками (комиссия — в «Экономике»).',
    auction: 'Настройка призов Загадочного аукциона и включение вкладки P2P-аукциона.'
  };

  function renderAdminActiveGameControls() {
    const gKey = adminLiveState.activeInfoGame || 'crash';
    const meta = ADMIN_GAMES_META.find((m) => m.key === gKey) || { key: gKey, label: gKey };
    const titleEl = $('adm-active-game-title');
    if (titleEl) titleEl.textContent = meta.label;

    const isOff = Boolean(adminLiveState.disabledGames?.[gKey]);
    const tBtn = $('adm-active-game-toggle');
    if (tBtn) {
      tBtn.textContent = isOff ? 'ВЫКЛ' : 'ВКЛ';
      tBtn.className = isOff ? 'tg-btn tg-btn-danger' : 'tg-btn tg-btn-primary';
    }

    const genMap = adminLiveState.gameGenerosity || {};
    const curGen = Math.min(135, Math.max(40, Math.round(Number(genMap[gKey] ?? (gKey === 'upgrader' ? 78 : 95)))));
    const valEl = $('adm-gen-cur-val');
    if (valEl) valEl.textContent = `${curGen}%`;
    const inp = $('adm-gen-custom-input');
    if (inp && !inp.matches(':focus')) inp.value = String(curGen);
    document.querySelectorAll('[data-gen-preset]').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.genPreset) === curGen);
    });
    const hintEl = $('adm-gen-hint');
    if (hintEl) hintEl.textContent = ADMIN_GAME_GEN_HINTS[gKey] || '100% — стандарт. Ниже 100% — казино выигрывает чаще; выше 100% — игра щедрее.';

    document.querySelectorAll('[data-adm-game-extra]').forEach((pane) => {
      pane.classList.toggle('hidden', pane.dataset.admGameExtra !== gKey);
    });
  }

  function renderAdminGamesInfoTabs() {
    const box = $('adm-ginfo-tabs');
    if (!box) return;
    box.innerHTML = ADMIN_GAMES_META.map((g) => `
      <button type="button" class="adm-ginfo-tab${adminLiveState.activeInfoGame === g.key ? ' active' : ''}" data-ginfo-tab="${g.key}">
        ${g.label}
      </button>
    `).join('');
    box.querySelectorAll('[data-ginfo-tab]').forEach((btn) => {
      btn.onclick = () => {
        adminLiveState.activeInfoGame = btn.dataset.ginfoTab;
        adminLiveState.openRoundIds.clear();
        renderAdminGamesInfoTabs();
        renderAdminActiveGameControls();
        renderAdminGamesInfoBody();
        haptic('light');
      };
    });
    renderAdminActiveGameControls();
  }

  function renderAdminRoundPlayersHtml(players) {
    if (!Array.isArray(players) || !players.length) {
      return '<div class="empty-inline">В этом раунде ставок не было</div>';
    }
    return `<div class="adm-round-players">${players.map((p) => {
      const net = (Number(p.payout) || 0) - (Number(p.bet) || 0);
      return `
        <div class="adm-round-player" style="cursor:pointer" data-adm-jump-uid="${esc(p.telegramId)}">
          <div class="adm-round-player-left">
            ${renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 26, className: 'player-ava-box' })}
            <div style="min-width:0">
              <div class="adm-round-player-name">${esc(p.firstName)}</div>
              <div class="adm-round-player-detail">Ставка: ${formatStars(p.bet)} • ${esc(p.detail || '')}</div>
            </div>
          </div>
          <div class="${signedClass(net)}" style="font-weight:800;white-space:nowrap">${formatSignedStars(net)}</div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderAdminGamesInfoBody() {
    const g = adminLiveState.activeInfoGame;
    const t = adminLiveState.gamesInfo.totals?.[g] || { rounds: 0, totalBet: 0, totalPayout: 0, totalLost: 0, houseProfit: 0 };
    const rounds = adminLiveState.gamesInfo.rounds?.[g] || [];

    const sumBox = $('adm-ginfo-summary');
    if (sumBox) {
      const rtp = t.totalBet > 0 ? ((t.totalPayout / t.totalBet) * 100).toFixed(1) : '0.0';
      sumBox.innerHTML = `
        <div class="adm-ginfo-kpi">
          <div class="adm-ginfo-kpi-lbl">Всего игр / Общие ставки</div>
          <div class="adm-ginfo-kpi-val">${t.rounds || 0} • ${formatStars(t.totalBet || 0)} зв.</div>
        </div>
        <div class="adm-ginfo-kpi">
          <div class="adm-ginfo-kpi-lbl">Выиграли / Слили</div>
          <div class="adm-ginfo-kpi-val">${formatStars(t.totalPayout || 0)} / ${formatStars(t.totalLost || 0)}</div>
        </div>
        <div class="adm-ginfo-kpi full">
          <div>
            <div class="adm-ginfo-kpi-lbl">Чистый плюс / минус казино (${ADMIN_GAME_LABEL_BY_KEY[g] || g})</div>
            <div class="adm-round-player-detail">Фактический RTP: ${rtp}%</div>
          </div>
          <div class="adm-ginfo-kpi-val ${signedClass(t.houseProfit)}">${formatSignedStars(t.houseProfit)}</div>
        </div>
      `;
    }

    const latestBox = $('adm-ginfo-latest');
    if (latestBox) {
      const last = rounds[0];
      if (!last) {
        latestBox.innerHTML = '<div class="empty-inline">По этой игре ещё нет завершённых раундов</div>';
      } else {
        const ridTxt = last.roundId ? `Раунд #${last.roundId}` : 'Последний раунд';
        latestBox.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <div>
              <div class="adm-round-title">${ridTxt} • ${esc(last.summary || 'Завершён')}</div>
              <div class="adm-round-sub">${formatShortTime(last.createdAt)} • Игроков: ${last.playersCount || 0}</div>
            </div>
            <div class="adm-round-pl ${signedClass(last.houseProfit)}">Казино: ${formatSignedStars(last.houseProfit)}</div>
          </div>
          <div class="adm-round-metrics" style="margin-bottom:6px">
            <div class="adm-round-metric">Общие ставки<strong>${formatStars(last.totalBet)} зв.</strong></div>
            <div class="adm-round-metric">Выиграли игроки<strong>${formatStars(last.totalPayout)} зв.</strong></div>
            <div class="adm-round-metric">Слили игроки<strong>${formatStars(last.totalLost)} зв.</strong></div>
            <div class="adm-round-metric">Плюс / минус казино<strong class="${signedClass(last.houseProfit)}">${formatSignedStars(last.houseProfit)}</strong></div>
          </div>
          ${renderAdminRoundPlayersHtml(last.players)}
        `;
        latestBox.querySelectorAll('[data-adm-jump-uid]').forEach((el) => {
          el.onclick = () => openUserInAdminCard(el.dataset.admJumpUid);
        });
      }
    }

    const histBox = $('adm-ginfo-history');
    if (histBox) {
      if (!rounds.length) {
        histBox.innerHTML = '<div class="empty-inline">История пуста — сыграйте раунд, и он появится мгновенно</div>';
      } else {
        histBox.innerHTML = rounds.map((r) => {
          const isOpen = adminLiveState.openRoundIds.has(r.id);
          const ridTxt = r.roundId ? `#${r.roundId} • ` : '';
          return `
            <div class="adm-round-item${isOpen ? ' open' : ''}" data-adm-round-id="${esc(r.id)}">
              <button type="button" class="adm-round-head" data-adm-round-toggle="${esc(r.id)}">
                <div style="min-width:0">
                  <div class="adm-round-title">${ridTxt}${esc(r.summary || 'Раунд')}</div>
                  <div class="adm-round-sub">${formatShortTime(r.createdAt)} • Ставки: ${formatStars(r.totalBet)} • Игр.: ${r.playersCount || 0}</div>
                </div>
                <span class="adm-round-pl ${signedClass(r.houseProfit)}">${formatSignedStars(r.houseProfit)}</span>
              </button>
              <div class="adm-round-body">
                <div class="adm-round-metrics">
                  <div class="adm-round-metric">Общие ставки<strong>${formatStars(r.totalBet)} зв.</strong></div>
                  <div class="adm-round-metric">Выиграли<strong>${formatStars(r.totalPayout)} зв.</strong></div>
                  <div class="adm-round-metric">Слили<strong>${formatStars(r.totalLost)} зв.</strong></div>
                  <div class="adm-round-metric">Плюс / минус казино<strong class="${signedClass(r.houseProfit)}">${formatSignedStars(r.houseProfit)}</strong></div>
                </div>
                ${renderAdminRoundPlayersHtml(r.players)}
              </div>
            </div>
          `;
        }).join('');

        histBox.querySelectorAll('[data-adm-round-toggle]').forEach((btn) => {
          btn.onclick = () => {
            const id = btn.dataset.admRoundToggle;
            const item = histBox.querySelector(`[data-adm-round-id="${CSS.escape(id)}"]`);
            if (!item) return;
            const next = !item.classList.contains('open');
            item.classList.toggle('open', next);
            if (next) adminLiveState.openRoundIds.add(id);
            else adminLiveState.openRoundIds.delete(id);
            haptic('light');
          };
        });
        histBox.querySelectorAll('[data-adm-jump-uid]').forEach((el) => {
          el.onclick = () => openUserInAdminCard(el.dataset.admJumpUid);
        });
      }
    }
  }

  function renderAdminLiveRadar() {
    const box = $('adm-radar-list');
    const pill = $('adm-radar-pill');
    const all = adminLiveState.gamesInfo.radar || [];
    if (pill) pill.textContent = `${all.length} • LIVE`;
    if (!box) return;
    const f = adminLiveState.radarFilter;
    const filtered = all.filter((item) => {
      if (f === 'big') return (Number(item.totalBet) || 0) >= 100 || (Number(item.totalPayout) || 0) >= 100;
      if (f === 'loss') return (Number(item.houseProfit) || 0) < 0;
      return true;
    });
    if (!filtered.length) {
      box.innerHTML = '<div class="empty-inline">Пока нет событий под выбранный фильтр</div>';
      return;
    }
    box.innerHTML = filtered.slice(0, 35).map((item) => `
      <div class="adm-radar-row" style="${item.telegramId ? 'cursor:pointer' : ''}" data-radar-uid="${esc(item.telegramId || '')}">
        <div style="min-width:0">
          <div>
            <span class="adm-radar-game-tag">${esc(ADMIN_GAME_LABEL_BY_KEY[item.game] || item.game)}</span>
            <b>${esc(item.playerName || 'Раунд')}</b>
            <span style="opacity:.65;margin-left:4px">${formatShortTime(item.createdAt)}</span>
          </div>
          <div class="adm-round-player-detail" style="margin-top:2px">
            Ставка: ${formatStars(item.totalBet)} • Выплата: ${formatStars(item.totalPayout)} • ${esc(item.summary || '')}
          </div>
        </div>
        <div class="${signedClass(item.houseProfit)}" style="font-weight:800;white-space:nowrap">${formatSignedStars(item.houseProfit)}</div>
      </div>
    `).join('');
    box.querySelectorAll('[data-radar-uid]').forEach((el) => {
      if (el.dataset.radarUid) el.onclick = () => openUserInAdminCard(el.dataset.radarUid);
    });
  }

  async function loadAdminWhales() {
    try {
      adminLiveState.whalesData = await api('/api/admin/whales');
      renderAdminWhales();
    } catch {}
  }

  function renderAdminWhales() {
    const box = $('adm-whales-list');
    if (!box || !adminLiveState.whalesData) return;
    const tab = adminLiveState.whalesTab || 'winners';
    const list = adminLiveState.whalesData[tab] || [];
    if (!list.length) {
      box.innerHTML = '<div class="empty-inline">Пока нет данных</div>';
      return;
    }
    box.innerHTML = list.map((u, idx) => {
      const rightMetric = tab === 'winners'
        ? `<span class="${signedClass(u.netProfit)}" style="font-weight:800">${formatSignedStars(u.netProfit)}</span>`
        : (tab === 'richest'
          ? `<span style="font-weight:800;color:#fbbf24">${formatStars(u.totalWealth)} зв.</span>`
          : `<span style="font-weight:800;color:#38bdf8">${formatStars(u.totalWagered)} зв.</span>`);
      return `
        <div class="player-row" style="cursor:pointer" data-whale-uid="${esc(u.telegramId)}">
          <div class="player-left">
            <span style="font-size:11px;font-weight:800;opacity:.65;min-width:18px">#${idx + 1}</span>
            ${renderAvatarHtml(u.photoUrl, u.firstName, u.avatarFrame, { size: 30, className: 'player-ava-box' })}
            <div>
              <div class="player-name">${esc(u.firstName)} ${u.banned ? tgIcon('ban', 12) : ''}</div>
              <div class="player-bet">Бал: ${formatStars(u.balance)} • NFT: ${formatStars(u.invVal)} • Оборот: ${formatStars(u.totalWagered)}</div>
            </div>
          </div>
          ${rightMetric}
        </div>
      `;
    }).join('');
    box.querySelectorAll('[data-whale-uid]').forEach((row) => {
      row.onclick = () => openUserInAdminCard(row.dataset.whaleUid);
    });
  }

  function formatUptime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м ${s % 60}с`;
  }

  async function loadAdminControls() {
    try {
      const data = await api('/api/admin/controls');
      if (Array.isArray(data.frames)) {
        state.adminFramesCache = data.frames;
        populateAdminFrameSelect(state.adminSelectedUser?.activeFrame || '');
      }

      const cfg = data.config || {};
      const onlinePill = $('adm-online-pill');
      if (onlinePill) onlinePill.textContent = `${data.onlineCount || 0} онлайн`;

      const onlineBox = $('adm-online-list');
      if (onlineBox) {
        const list = data.onlineUsers || [];
        onlineBox.innerHTML = list.length ? list.map((u) => `
          <div class="player-row" style="cursor:pointer" data-adm-online-uid="${esc(u.telegramId)}">
            <div class="player-left">
              ${renderAvatarHtml(u.photoUrl, u.firstName, u.avatarFrame, { size: 30, className: 'player-ava-box' })}
              <div>
                <div class="player-name">${esc(u.firstName)} ${u.username ? `<span style="opacity:.65;font-size:11px">@${esc(u.username)}</span>` : ''}</div>
                <div class="player-bet">ID: ${esc(u.telegramId)} • ${starIconHtml(11)} ${formatStars(u.balance)} • ${tgIcon('gift', 11)} ${u.inventoryCount}</div>
              </div>
            </div>
            <span class="tg-btn-pill">Открыть</span>
          </div>
        `).join('') : '<div class="empty-inline">Сейчас никто не подключён</div>';

        onlineBox.querySelectorAll('[data-adm-online-uid]').forEach((row) => {
          row.onclick = () => openUserInAdminCard(row.dataset.admOnlineUid);
        });
      }

      // Maintenance UI
      const mBtn = $('adm-maint-toggle');
      const mPill = $('adm-maint-pill');
      const mText = $('adm-maint-text');
      const isMaint = Boolean(cfg.maintenanceMode);
      if (mBtn) {
        mBtn.textContent = isMaint ? 'Вкл' : 'Выкл';
        mBtn.className = isMaint ? 'tg-btn tg-btn-danger' : 'tg-btn tg-btn-secondary';
      }
      if (mPill) mPill.textContent = isMaint ? 'Техработы' : 'Работает';
      if (mText && !mText.matches(':focus')) mText.value = cfg.maintenanceText || '';

      // Bot DM alerts to admin toggle (OFF by default)
      const dmBtn = $('adm-botdm-toggle');
      const isDmOn = Boolean(cfg.botDmAlerts);
      if (dmBtn) {
        dmBtn.textContent = isDmOn ? 'Вкл' : 'Выкл';
        dmBtn.className = isDmOn ? 'tg-btn tg-btn-primary' : 'tg-btn tg-btn-secondary';
      }

      // P2P Auction tab toggle (OFF by default)
      const p2pBtn = $('adm-p2p-auction-toggle');
      const isP2pOn = Boolean(cfg.p2pAuctionEnabled);
      if (p2pBtn) {
        p2pBtn.textContent = isP2pOn ? 'Вкл' : 'Выкл';
        p2pBtn.className = isP2pOn ? 'tg-btn tg-btn-primary' : 'tg-btn tg-btn-secondary';
      }

      // Games toggles
      const gGrid = $('adm-games-toggles');
      if (gGrid) {
        const disabled = cfg.disabledGames || {};
        gGrid.innerHTML = ADMIN_GAMES_META.map((g) => {
          const isOff = Boolean(disabled[g.key]);
          return `
            <button type="button" class="adm-game-toggle-btn${isOff ? ' is-off' : ''}" data-adm-game-key="${g.key}">
              <span>${g.label}</span>
              <span class="adm-game-toggle-state">${isOff ? 'ВЫКЛ' : 'ВКЛ'}</span>
            </button>
          `;
        }).join('');
        gGrid.querySelectorAll('[data-adm-game-key]').forEach((btn) => {
          btn.onclick = async () => {
            try {
              await api('/api/admin/controls', { method: 'POST', body: { toggleGame: btn.dataset.admGameKey } });
              haptic('light');
              loadAdminControls();
            } catch (e) { showToast(e.message, 'error'); }
          };
        });
      }

      // Slots RTP, Crash generation modes & Per-game generosity sync
      adminLiveState.disabledGames = { ...(cfg.disabledGames || {}) };
      adminLiveState.gameGenerosity = { ...(cfg.gameGenerosity || {}) };
      const rtp = cfg.slotsRtpMode || 'normal';
      document.querySelectorAll('[data-rtp]').forEach((b) => b.classList.toggle('active', b.dataset.rtp === rtp));
      const cm = cfg.crashMode || 'normal';
      document.querySelectorAll('[data-crash-mode-btn]').forEach((b) => b.classList.toggle('active', b.dataset.crashModeBtn === cm));
      renderAdminActiveGameControls();

      // Economy controls sync
      adminLiveState.ecoDraft.depositBonusPct = Number(cfg.depositBonusPct || 0);
      adminLiveState.ecoDraft.xpMultiplier = Number(cfg.xpMultiplier || 1);
      adminLiveState.ecoDraft.freezeMarket = Boolean(cfg.freezeMarket);
      document.querySelectorAll('[data-eco-bonus]').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.ecoBonus) === adminLiveState.ecoDraft.depositBonusPct);
      });
      document.querySelectorAll('[data-eco-xp]').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.ecoXp) === adminLiveState.ecoDraft.xpMultiplier);
      });
      const stInp = $('adm-eco-starter');
      if (stInp && !stInp.matches(':focus')) stInp.value = String(cfg.starterBalance ?? 250);
      const feeInp = $('adm-eco-fee');
      if (feeInp && !feeInp.matches(':focus')) feeInp.value = String(cfg.houseFeePct ?? 5);
      const mbInp = $('adm-eco-maxbet');
      if (mbInp && !mbInp.matches(':focus')) mbInp.value = String(cfg.maxBet ?? 50000);
      const frzBtn = $('adm-eco-freeze-btn');
      if (frzBtn) {
        frzBtn.textContent = adminLiveState.ecoDraft.freezeMarket ? 'Вкл' : 'Выкл';
        frzBtn.className = adminLiveState.ecoDraft.freezeMarket ? 'tg-btn tg-btn-danger' : 'tg-btn tg-btn-secondary';
      }
      const ecoPill = $('adm-eco-pill');
      if (ecoPill) {
        const parts = [];
        if (adminLiveState.ecoDraft.depositBonusPct > 0) parts.push(`+${adminLiveState.ecoDraft.depositBonusPct}%`);
        if (adminLiveState.ecoDraft.xpMultiplier > 1) parts.push(`XP x${adminLiveState.ecoDraft.xpMultiplier}`);
        if (adminLiveState.ecoDraft.freezeMarket) parts.push('Заморожен');
        ecoPill.textContent = parts.length ? parts.join(' • ') : 'Стандарт';
      }

      // Auction info
      const aInfo = $('adm-auction-info');
      if (aInfo && data.auction) {
        const a = data.auction;
        aInfo.innerHTML = `Раунд <b>#${a.roundId}</b> (${esc(a.phase)}) • Лот: <b>${esc(a.prizeName || '—')}</b> (${formatStars(a.prizePrice || 0)} зв.) • Участников: <b>${a.participants || 0}</b>`;
      }

      // System stats
      const sysEl = $('adm-sys-stats');
      if (sysEl) {
        sysEl.innerHTML = `
          <div class="adm-sys-stat"><div class="adm-sys-stat-val">${formatUptime(data.uptimeSec)}</div><div class="adm-sys-stat-lbl">Аптайм</div></div>
          <div class="adm-sys-stat"><div class="adm-sys-stat-val">${data.memoryMb || 0} МБ</div><div class="adm-sys-stat-lbl">Память RAM</div></div>
          <div class="adm-sys-stat"><div class="adm-sys-stat-val">${data.onlineCount || 0}</div><div class="adm-sys-stat-lbl">Онлайн</div></div>
        `;
      }
    } catch {}
  }

  async function callAdminUserExtra(action, extraBody = {}, okMsg = 'Готово') {
    const u = state.adminSelectedUser;
    if (!u) return showToast('Сначала выберите игрока', 'error');
    try {
      const res = await api('/api/admin/user/extra', {
        method: 'POST',
        body: { telegramId: u.telegramId, action, ...extraBody }
      });
      if (res.user) {
        state.adminSelectedUser = res.user;
        if (String(res.user.telegramId) === String(state.user?.telegramId)) {
          applyServerUser(res.user, { force: true });
        }
        renderAdminSelectedUser();
      }
      showToast(res.msg || okMsg, 'success');
      haptic('success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function initExtendedAdminUI() {
    // 1. Crash forecast, current override & generation mode
    $('adm-crash-cur-set-btn')?.addEventListener('click', async () => {
      const val = $('adm-crash-cur-set-input')?.value?.trim() || '';
      if (!val) return showToast('Введите икс для текущего раунда (напр. 2.50)', 'error');
      try {
        const data = await api('/api/admin/crash/current', { method: 'POST', body: { multiplier: val } });
        renderAdminCrashForecast(data);
        if ($('adm-crash-cur-set-input')) $('adm-crash-cur-set-input').value = '';
        showToast('Икс текущего раунда изменён', 'success');
        haptic('success');
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-crash-boom-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/crash/force-boom', { method: 'POST', body: {} });
        showToast(`Ракета взорвана на ${Number(res.crashedAt || 1).toFixed(2)}x`, 'gold');
        haptic('heavy');
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.querySelectorAll('[data-crash-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inp = $('adm-crash-queue-input');
        if (!inp) return;
        const val = btn.dataset.crashPreset;
        const cur = inp.value.trim();
        inp.value = cur ? `${cur}, ${val}` : val;
        haptic('light');
      });
    });
    $('adm-crash-queue-set-btn')?.addEventListener('click', async () => {
      const raw = $('adm-crash-queue-input')?.value?.trim() || '';
      if (!raw) return showToast('Введите хотя бы один икс (например: 1.05, 5.2)', 'error');
      try {
        const data = await api('/api/admin/crash/queue', { method: 'POST', body: { multipliers: raw, replace: true } });
        renderAdminCrashForecast(data);
        if ($('adm-crash-queue-input')) $('adm-crash-queue-input').value = '';
        showToast('Очередь иксов Ракеты обновлена', 'success');
        haptic('success');
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-crash-queue-reset-btn')?.addEventListener('click', async () => {
      try {
        const data = await api('/api/admin/crash/queue/reset', { method: 'POST', body: {} });
        renderAdminCrashForecast(data);
        showToast('Очередь Ракеты сброшена к случайным значениям', 'info');
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.querySelectorAll('[data-crash-mode-btn]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api('/api/admin/controls', { method: 'POST', body: { crashMode: btn.dataset.crashModeBtn } });
          showToast(`Режим генерации Ракеты: ${btn.textContent}`, 'success');
          loadAdminControls();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });

    // 1.5 Live Radar filters & Whales tabs
    document.querySelectorAll('[data-radar-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adminLiveState.radarFilter = btn.dataset.radarFilter || 'all';
        document.querySelectorAll('[data-radar-filter]').forEach((b) => b.classList.toggle('active', b === btn));
        renderAdminLiveRadar();
      });
    });
    document.querySelectorAll('[data-whales-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adminLiveState.whalesTab = btn.dataset.whalesTab || 'winners';
        document.querySelectorAll('[data-whales-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        renderAdminWhales();
      });
    });

    // 2. Online, Rain & Live Toast
    $('adm-controls-refresh-btn')?.addEventListener('click', () => { SoundFX.click(); loadAdminControls(); });
    $('adm-rain-btn')?.addEventListener('click', async () => {
      const amount = Math.floor(Number($('adm-rain-amount')?.value));
      const scope = $('adm-rain-scope')?.value || 'online';
      if (!Number.isFinite(amount) || amount < 1) return showToast('Укажите сумму дождя', 'error');
      const ok = confirm(`Выдать по +${amount} звёзд (${scope === 'online' ? 'всем игрокам онлайн' : 'ВСЕМ игрокам в базе'})?`);
      if (!ok) return;
      try {
        const res = await api('/api/admin/rain', { method: 'POST', body: { amount, scope } });
        showToast(`Дождь звёзд завершён: ${res.count} игр. × ${res.amount} = ${formatStars(res.total)} зв.`, 'success');
        haptic('success');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-toast-btn')?.addEventListener('click', async () => {
      const text = $('adm-toast-text')?.value?.trim() || '';
      const type = $('adm-toast-type')?.value || 'gold';
      if (!text) return showToast('Введите текст уведомления', 'error');
      try {
        const res = await api('/api/admin/toast-all', { method: 'POST', body: { text, type } });
        if ($('adm-toast-text')) $('adm-toast-text').value = '';
        showToast(`Баннер показан (${res.sentTo || 0} онлайн)`, 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });

    // 3. Maintenance, Slots RTP, Auction & Economy controls
    $('adm-maint-toggle')?.addEventListener('click', async () => {
      const isCurrentlyOn = $('adm-maint-toggle')?.textContent === 'Вкл';
      try {
        await api('/api/admin/controls', { method: 'POST', body: { maintenanceMode: !isCurrentlyOn } });
        showToast(!isCurrentlyOn ? 'Режим техработ ВКЛЮЧЁН' : 'Режим техработ ВЫКЛЮЧЕН', 'gold');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-maint-save-btn')?.addEventListener('click', async () => {
      const maintenanceText = $('adm-maint-text')?.value?.trim() || '';
      if (!maintenanceText) return showToast('Введите текст техработ', 'error');
      try {
        await api('/api/admin/controls', { method: 'POST', body: { maintenanceText } });
        showToast('Текст техработ обновлён', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-botdm-toggle')?.addEventListener('click', async () => {
      const isCurrentlyOn = $('adm-botdm-toggle')?.textContent === 'Вкл';
      try {
        await api('/api/admin/controls', { method: 'POST', body: { botDmAlerts: !isCurrentlyOn } });
        showToast(!isCurrentlyOn ? 'Уведомления бота в ЛС ВКЛЮЧЕНЫ' : 'Уведомления бота в ЛС ВЫКЛЮЧЕНЫ', 'info');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-p2p-auction-toggle')?.addEventListener('click', async () => {
      const isCurrentlyOn = $('adm-p2p-auction-toggle')?.textContent === 'Вкл';
      if (isCurrentlyOn && !confirm('Отключить вкладку «Аукцион»? Все активные/очередные лоты отменятся, подарки и ставки вернутся владельцам.')) {
        return;
      }
      try {
        await api('/api/admin/controls', { method: 'POST', body: { p2pAuctionEnabled: !isCurrentlyOn } });
        showToast(!isCurrentlyOn ? 'Вкладка «Аукцион» ВКЛЮЧЕНА' : 'Вкладка «Аукцион» ВЫКЛЮЧЕНА (незавершённые лоты возвращены)', 'info');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-wd-search-btn')?.addEventListener('click', () => {
      SoundFX.click();
      loadAdminWithdraws($('adm-wd-search-input')?.value || '');
    });
    $('adm-wd-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadAdminWithdraws($('adm-wd-search-input')?.value || '');
    });
    $('adm-sing-start-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/singularity/force-start', { method: 'POST', body: {} });
        showToast(res.msg || 'Воронка запущена!', 'success');
        loadAdminAudit();
      } catch (e) { showToast(e.message, 'error'); }
    });
    const runAdminGiftRain = async (upgraded) => {
      const collectionName = $('adm-giftrain-select')?.value || '';
      const scope = $('adm-giftrain-scope')?.value || 'online';
      if (!collectionName) return showToast('Выберите коллекцию', 'error');
      const ok = confirm(`Выдать «${collectionName}»${upgraded ? ' (NFT)' : ''} (${scope === 'online' ? 'всем онлайн' : 'ВСЕМ игрокам'})?`);
      if (!ok) return;
      try {
        const res = await api('/api/admin/gift-rain', { method: 'POST', body: { collectionName, upgraded, scope } });
        showToast(`Дождь подарков: выдано ${res.count} шт. «${res.giftName}»!`, 'success');
        haptic('success');
        loadAdminAudit();
      } catch (e) { showToast(e.message, 'error'); }
    };
    $('adm-giftrain-reg-btn')?.addEventListener('click', () => runAdminGiftRain(false));
    $('adm-giftrain-nft-btn')?.addEventListener('click', () => runAdminGiftRain(true));

    // Stars Refund (Реф звёзд) bindings
    $('adm-refund-search-btn')?.addEventListener('click', () => {
      SoundFX.click();
      loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
    });
    $('adm-refund-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loadAdminStarDeposits($('adm-refund-search-input')?.value || '');
      }
    });
    $('adm-refund-recent-btn')?.addEventListener('click', () => {
      if ($('adm-refund-search-input')) $('adm-refund-search-input').value = '';
      SoundFX.click();
      loadAdminStarDeposits('');
    });
    $('adm-refund-manual-toggle')?.addEventListener('click', () => {
      $('adm-refund-manual-box')?.classList.toggle('hidden');
      SoundFX.click();
    });
    $('adm-ref-man-submit')?.addEventListener('click', async () => {
      const telegramId = String($('adm-ref-man-uid')?.value || '').trim();
      const chargeId = String($('adm-ref-man-charge')?.value || '').trim();
      const amount = Math.max(0, Math.floor(Number($('adm-ref-man-amt')?.value || 0)));
      const deductBalance = Boolean($('adm-refund-deduct')?.checked);
      const notifyUser = Boolean($('adm-refund-notify')?.checked);
      if (!telegramId) return showToast('Введите Telegram ID игрока', 'error');
      if (!chargeId) return showToast('Введите telegram_payment_charge_id', 'error');
      const ok = confirm(`Выполнить возврат Telegram Stars через Bot API?\nИгрок ID: ${telegramId}\ncharge_id: ${chargeId}`);
      if (!ok) return;
      const btn = $('adm-ref-man-submit');
      if (btn) btn.disabled = true;
      try {
        const res = await api('/api/admin/star-deposits/refund', {
          method: 'POST',
          body: { manual: true, telegramId, chargeId, amount, deductBalance, notifyUser }
        });
        showToast(res.message || 'Возврат звёзд выполнен!', 'success');
        haptic('success');
        if ($('adm-ref-man-charge')) $('adm-ref-man-charge').value = '';
        if ($('adm-ref-man-amt')) $('adm-ref-man-amt').value = '';
        $('adm-refund-manual-box')?.classList.add('hidden');
        loadAdminStarDeposits($('adm-refund-search-input')?.value || telegramId);
        loadAdminAudit();
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    document.querySelectorAll('[data-rtp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api('/api/admin/controls', { method: 'POST', body: { slotsRtpMode: btn.dataset.rtp } });
          showToast(`Режим отдачи Слотов: ${btn.textContent}`, 'success');
          loadAdminControls();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
    $('adm-auction-reroll-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/auction/control', { method: 'POST', body: { action: 'reroll_lot' } });
        showToast(res.msg || 'Лот обновлён', 'success');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-auction-finish-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/auction/control', { method: 'POST', body: { action: 'finish_now' } });
        showToast(res.msg || 'Раунд завершён', 'gold');
        setTimeout(loadAdminControls, 400);
      } catch (e) { showToast(e.message, 'error'); }
    });

    // Economy buttons
    document.querySelectorAll('[data-eco-bonus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adminLiveState.ecoDraft.depositBonusPct = Number(btn.dataset.ecoBonus) || 0;
        document.querySelectorAll('[data-eco-bonus]').forEach((b) => b.classList.toggle('active', b === btn));
        haptic('light');
      });
    });
    document.querySelectorAll('[data-eco-xp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adminLiveState.ecoDraft.xpMultiplier = Number(btn.dataset.ecoXp) || 1;
        document.querySelectorAll('[data-eco-xp]').forEach((b) => b.classList.toggle('active', b === btn));
        haptic('light');
      });
    });
    $('adm-eco-freeze-btn')?.addEventListener('click', async () => {
      const next = !adminLiveState.ecoDraft.freezeMarket;
      try {
        await api('/api/admin/controls', { method: 'POST', body: { freezeMarket: next } });
        showToast(next ? 'Маркет и вывод ЗАМОРОЖЕНЫ' : 'Маркет и вывод разморожены', 'gold');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-eco-save-btn')?.addEventListener('click', async () => {
      const starterBalance = Math.floor(Number($('adm-eco-starter')?.value));
      const houseFeePct = Math.floor(Number($('adm-eco-fee')?.value));
      const maxBet = Math.floor(Number($('adm-eco-maxbet')?.value));
      try {
        await api('/api/admin/controls', {
          method: 'POST',
          body: {
            depositBonusPct: adminLiveState.ecoDraft.depositBonusPct,
            xpMultiplier: adminLiveState.ecoDraft.xpMultiplier,
            starterBalance,
            houseFeePct,
            maxBet
          }
        });
        showToast('Параметры экономики сохранены', 'success');
        haptic('success');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });

    // 0. Unified Games Hub: active game toggle + per-game generosity presets/save
    const saveActiveGameGenerosity = async (pctVal) => {
      const gKey = adminLiveState.activeInfoGame || 'crash';
      const pct = Math.round(Number(pctVal));
      if (!Number.isFinite(pct) || pct < 40 || pct > 135) {
        return showToast('Укажите щедрость от 40% до 135%', 'error');
      }
      try {
        await api('/api/admin/controls', { method: 'POST', body: { gameGenerosity: { [gKey]: pct } } });
        if (!adminLiveState.gameGenerosity) adminLiveState.gameGenerosity = {};
        adminLiveState.gameGenerosity[gKey] = pct;
        renderAdminActiveGameControls();
        showToast(`Щедрость «${ADMIN_GAME_LABEL_BY_KEY[gKey] || gKey}»: ${pct}%`, 'success');
        haptic('success');
      } catch (e) { showToast(e.message, 'error'); }
    };
    document.querySelectorAll('[data-gen-preset]').forEach((btn) => {
      btn.addEventListener('click', () => saveActiveGameGenerosity(btn.dataset.genPreset));
    });
    $('adm-gen-save-btn')?.addEventListener('click', () => {
      saveActiveGameGenerosity($('adm-gen-custom-input')?.value);
    });
    $('adm-active-game-toggle')?.addEventListener('click', async () => {
      const gKey = adminLiveState.activeInfoGame || 'crash';
      try {
        await api('/api/admin/controls', { method: 'POST', body: { toggleGame: gKey } });
        haptic('light');
        loadAdminControls();
      } catch (e) { showToast(e.message, 'error'); }
    });

    // 4. Extra User Management actions
    $('adm-exact-bal-btn')?.addEventListener('click', () => {
      const value = Math.floor(Number($('adm-exact-bal-input')?.value));
      if (!Number.isFinite(value) || value < 0) return showToast('Некорректный баланс', 'error');
      callAdminUserExtra('set_balance', { value }, `Баланс установлен: ${formatStars(value)} зв.`);
    });
    $('adm-frame-btn')?.addEventListener('click', () => {
      const frameId = $('adm-frame-select')?.value || '';
      callAdminUserExtra('give_frame', { frameId }, frameId ? 'Рамка выдана и надета' : 'Рамка снята');
    });
    $('adm-level-btn')?.addEventListener('click', () => {
      const level = Math.floor(Number($('adm-level-input')?.value));
      if (!Number.isFinite(level) || level < 1 || level > 20) return showToast('Уровень от 1 до 20', 'error');
      callAdminUserExtra('set_level', { level }, `Уровень установлен: ${level}`);
    });
    $('adm-dm-btn')?.addEventListener('click', () => {
      const text = $('adm-dm-input')?.value?.trim() || '';
      if (!text) return showToast('Введите сообщение', 'error');
      callAdminUserExtra('dm_toast', { text }, 'Личное уведомление отправлено');
      if ($('adm-dm-input')) $('adm-dm-input').value = '';
    });
    $('adm-reset-stats-btn')?.addEventListener('click', () => {
      if (!confirm('Сбросить игровую статистику выбранного игрока?')) return;
      callAdminUserExtra('reset_stats', {}, 'Статистика игрока сброшена');
    });
    $('adm-clear-inv-btn')?.addEventListener('click', () => {
      if (!confirm('Очистить ВЕСЬ инвентарь выбранного игрока?')) return;
      callAdminUserExtra('clear_inventory', {}, 'Инвентарь игрока очищен');
    });

    // 5. System actions
    $('adm-sys-savedb-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/system', { method: 'POST', body: { action: 'save_db' } });
        showToast(res.msg || 'БД сохранена', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-sys-clearfeeds-btn')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/system', { method: 'POST', body: { action: 'clear_feeds' } });
        showToast(res.msg || 'Лайв-ленты очищены', 'info');
      } catch (e) { showToast(e.message, 'error'); }
    });
    $('adm-sys-clearlogs-btn')?.addEventListener('click', async () => {
      if (!confirm('Очистить накопленную историю раундов и радар в админке?')) return;
      try {
        const res = await api('/api/admin/system', { method: 'POST', body: { action: 'clear_game_logs' } });
        showToast(res.msg || 'История очищена', 'info');
        loadAdminGamesInfo();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  async function handleAdminBalance(sign) {
    const u = state.adminSelectedUser;
    if (!u) return;
    const amt = Math.floor(Number($('admin-bal-amount').value)) * sign;
    try {
      const res = await api('/api/admin/balance', { method: 'POST', body: { telegramId: u.telegramId, delta: amt } });
      state.adminSelectedUser = res.user;
      if (String(res.user.telegramId) === String(state.user?.telegramId)) {
        applyServerUser(res.user);
      }
      renderAdminSelectedUser();
      showToast(`Баланс обновлён: ${formatStars(res.user.balance)} звёзд`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleAdminGiveGift(upgraded) {
    const u = state.adminSelectedUser;
    if (!u) return;
    const collectionName = $('admin-gift-select').value;
    try {
      const res = await api('/api/admin/give-gift', {
        method: 'POST',
        body: { telegramId: u.telegramId, collectionName, upgraded }
      });
      state.adminSelectedUser = res.user;
      if (String(res.user.telegramId) === String(state.user?.telegramId)) {
        applyServerUser(res.user);
      }
      renderAdminSelectedUser();
      showToast(`Выдан подарок «${collectionName}»${upgraded ? ' (NFT)' : ''}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleAdminBanToggle() {
    const u = state.adminSelectedUser;
    if (!u) return;
    try {
      const res = await api('/api/admin/ban', {
        method: 'POST',
        body: { telegramId: u.telegramId, banned: !u.banned }
      });
      state.adminSelectedUser = res.user;
      renderAdminSelectedUser();
      showToast(res.user.banned ? 'Пользователь забанен' : 'Пользователь разбанен', 'info');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // ======================== ADMIN PROMO CODES MANAGEMENT ========================
  function generateRandomPromoCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (len) => {
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };
    return `ZET-${seg(4)}-${seg(3)}`;
  }

  function formatPromoTimeLeft(expiresAt) {
    if (!expiresAt) return '';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Истёк';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `ост. ${Math.max(1, mins)}м`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `ост. ${hrs}ч ${mins % 60}м`;
    const days = Math.floor(hrs / 24);
    return `ост. ${days}д ${hrs % 24}ч`;
  }

  async function loadAdminPromos() {
    if (!state.user?.isAdmin) return;
    try {
      const res = await api('/api/admin/promos');
      state.adminPromos = {
        active: Array.isArray(res.active) ? res.active : [],
        history: Array.isArray(res.history) ? res.history : []
      };
      renderAdminPromos();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function promoStatusMeta(status) {
    switch (status) {
      case 'active': return { label: 'Активен', cls: 'is-active' };
      case 'paused': return { label: 'Приостановлен', cls: 'is-paused' };
      case 'deleted': return { label: 'Удалён', cls: 'is-deleted' };
      case 'exhausted': return { label: 'Закончился', cls: 'is-exhausted' };
      case 'expired': return { label: 'Истёк', cls: 'is-expired' };
      default: return { label: status, cls: 'is-expired' };
    }
  }

  function renderAdminPromoCard(p, isHistory) {
    const st = promoStatusMeta(p.status);
    const usesText = p.maxUses !== null && p.maxUses !== undefined
      ? `Активаций: ${p.usedCount} / ${p.maxUses}`
      : `Активаций: ${p.usedCount} (безлимит)`;
    const timeText = p.expiresAt
      ? (isHistory ? `до ${new Date(p.expiresAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : formatPromoTimeLeft(p.expiresAt))
      : '';

    const menuItems = isHistory
      ? `
          <button type="button" class="promo-dropdown-item is-success" data-promo-act="resume" data-promo-id="${esc(p.id)}">
            ${tgIcon('refresh', 14)} Возобновить
          </button>
          <button type="button" class="promo-dropdown-item" data-promo-act="resume-edit" data-promo-id="${esc(p.id)}">
            ${tgIcon('clock', 14)} Возобновить с лимитом
          </button>
          <button type="button" class="promo-dropdown-item" data-promo-act="copy" data-promo-code="${esc(p.code)}">
            ${tgIcon('copy', 14)} Скопировать код
          </button>
          <button type="button" class="promo-dropdown-item is-danger" data-promo-act="purge" data-promo-id="${esc(p.id)}">
            ${tgIcon('trash', 14)} Удалить навсегда
          </button>
        `
      : `
          ${p.status === 'paused'
            ? `<button type="button" class="promo-dropdown-item is-success" data-promo-act="activate" data-promo-id="${esc(p.id)}">${tgIcon('play', 14)} Возобновить</button>`
            : `<button type="button" class="promo-dropdown-item is-warn" data-promo-act="pause" data-promo-id="${esc(p.id)}">${tgIcon('pause', 14)} Приостановить</button>`
          }
          <button type="button" class="promo-dropdown-item" data-promo-act="edit" data-promo-id="${esc(p.id)}">
            ${tgIcon('plus', 14)} Добавить лимит
          </button>
          <button type="button" class="promo-dropdown-item" data-promo-act="copy" data-promo-code="${esc(p.code)}">
            ${tgIcon('copy', 14)} Скопировать код
          </button>
          <button type="button" class="promo-dropdown-item is-danger" data-promo-act="delete" data-promo-id="${esc(p.id)}">
            ${tgIcon('trash', 14)} Удалить
          </button>
        `;

    return `
      <div class="promo-item-card ${p.status === 'paused' ? 'is-paused-card' : ''}">
        <div class="promo-item-main">
          <div class="promo-item-code">${esc(p.code)}</div>
          <div class="promo-item-meta">
            <span>${esc(usesText)}</span>
            ${timeText ? `<span>${tgIcon('clock', 11)} ${esc(timeText)}</span>` : ''}
          </div>
          ${p.note ? `<div class="promo-item-note">${esc(p.note)}</div>` : ''}
        </div>
        <div class="promo-item-right">
          <span class="promo-status-badge ${st.cls}">${st.label}</span>
          <div class="promo-dots-wrap">
            <button type="button" class="promo-dots-btn" data-promo-dots="${esc(p.id)}" aria-label="Действия">
              ${tgIcon('more-vertical', 16)}
            </button>
            <div class="promo-dropdown hidden" data-promo-menu="${esc(p.id)}">
              ${menuItems}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminPromos() {
    const active = state.adminPromos?.active || [];
    const history = state.adminPromos?.history || [];
    const activeCount = active.filter((p) => p.status === 'active').length;

    const badge = $('admin-promos-badge');
    if (badge) badge.textContent = `${activeCount} акт.`;
    const acEl = $('admin-promos-active-count');
    if (acEl) acEl.textContent = String(active.length);
    const hcEl = $('admin-promos-history-count');
    if (hcEl) hcEl.textContent = String(history.length);

    const activeBox = $('admin-promos-active-list');
    const historyBox = $('admin-promos-history-list');

    if (activeBox) {
      activeBox.innerHTML = active.length
        ? active.map((p) => renderAdminPromoCard(p, false)).join('')
        : '<div class="promo-empty-msg">Нет активных или приостановленных промокодов</div>';
    }
    if (historyBox) {
      historyBox.innerHTML = history.length
        ? history.map((p) => renderAdminPromoCard(p, true)).join('')
        : '<div class="promo-empty-msg">История промокодов пуста</div>';
    }

    const bindContainer = (root) => {
      if (!root) return;
      root.querySelectorAll('[data-promo-dots]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.promoDots;
          const menu = root.querySelector(`[data-promo-menu="${CSS.escape(id)}"]`);
          const wasHidden = menu?.classList.contains('hidden');
          document.querySelectorAll('.promo-dropdown:not(.hidden)').forEach((el) => el.classList.add('hidden'));
          if (wasHidden && menu) menu.classList.remove('hidden');
          SoundFX.click();
        });
      });

      root.querySelectorAll('[data-promo-act]').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.promo-dropdown:not(.hidden)').forEach((el) => el.classList.add('hidden'));
          const act = item.dataset.promoAct;
          const id = item.dataset.promoId;
          const code = item.dataset.promoCode;
          if (act === 'copy') {
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(code || '').then(() => showToast(`Промокод «${code}» скопирован`, 'success')).catch(() => showToast(code, 'info'));
            } else {
              showToast(`Код: ${code}`, 'info');
            }
            haptic('light');
            return;
          }
          if (act === 'edit' || act === 'resume-edit') {
            openAdminPromoEditModal(id, act === 'resume-edit' ? 'resume' : 'update');
            return;
          }
          handleAdminPromoAction(id, act);
        });
      });
    };

    bindContainer(activeBox);
    bindContainer(historyBox);
  }

  async function handleAdminCreatePromo() {
    const codeInp = $('admin-promo-code');
    const code = String(codeInp?.value || '').trim().toUpperCase();
    if (!code) {
      showToast('Введите промокод или нажмите «Авто»', 'error');
      return;
    }
    const limitType = state.promoLimitType || 'uses';
    const body = {
      code,
      limitType,
      note: String($('admin-promo-note')?.value || '').trim()
    };
    if (limitType === 'uses' || limitType === 'both') {
      body.maxUses = Math.floor(Number($('admin-promo-uses')?.value) || 0);
    }
    if (limitType === 'time' || limitType === 'both') {
      body.durationValue = Number($('admin-promo-dur-val')?.value) || 0;
      body.durationUnit = $('admin-promo-dur-unit')?.value || 'hours';
    }
    const btn = $('admin-promo-create-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await api('/api/admin/promos', { method: 'POST', body });
      if (codeInp) codeInp.value = '';
      if ($('admin-promo-note')) $('admin-promo-note').value = '';
      haptic('success');
      showToast(`Промокод «${res.promo.code}» создан!`, 'success');
      await loadAdminPromos();
    } catch (e) {
      haptic('error');
      showToast(e.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleAdminPromoAction(id, action, extraBody = {}) {
    try {
      await api(`/api/admin/promos/${encodeURIComponent(id)}/action`, {
        method: 'POST',
        body: { action, ...extraBody }
      });
      const labels = {
        pause: 'Промокод приостановлен',
        activate: 'Промокод снова активен',
        delete: 'Промокод удалён и перенесён в историю',
        resume: 'Промокод возобновлён!',
        update: 'Лимиты промокода обновлены',
        purge: 'Промокод окончательно удалён из истории'
      };
      haptic('success');
      showToast(labels[action] || 'Готово', action === 'pause' ? 'info' : 'success');
      await loadAdminPromos();
    } catch (e) {
      haptic('error');
      showToast(e.message, 'error');
    }
  }

  function openAdminPromoEditModal(id, mode) {
    const all = [...(state.adminPromos?.active || []), ...(state.adminPromos?.history || [])];
    const promo = all.find((p) => p.id === id);
    if (!promo) return;
    state.adminPromoEditTarget = { id, mode, promo };
    $('admin-promo-edit-title').textContent = mode === 'resume'
      ? `Возобновить «${promo.code}»`
      : `Лимиты «${promo.code}»`;
    $('admin-promo-edit-sub').textContent = mode === 'resume'
      ? 'Укажите дополнительные активации или новое время действия'
      : 'Добавьте активации или продлите срок действия';
    $('admin-promo-edit-uses').value = (mode === 'resume' && promo.status === 'exhausted') ? '20' : '0';
    $('admin-promo-edit-dur-val').value = (mode === 'resume' && promo.status === 'expired') ? '24' : '0';
    $('admin-promo-edit-dur-unit').value = 'hours';
    $('admin-promo-edit-reset').checked = false;
    $('admin-promo-edit-reset-wrap')?.classList.toggle('hidden', mode !== 'resume');
    openModal('modal-admin-promo-edit');
    SoundFX.click();
  }

  async function handleAdminPromoEditSave() {
    const target = state.adminPromoEditTarget;
    if (!target) return;
    const addUses = Math.floor(Number($('admin-promo-edit-uses')?.value) || 0);
    const durationValue = Number($('admin-promo-edit-dur-val')?.value) || 0;
    const durationUnit = $('admin-promo-edit-dur-unit')?.value || 'hours';
    const resetUsed = Boolean($('admin-promo-edit-reset')?.checked);
    closeModal('modal-admin-promo-edit');
    await handleAdminPromoAction(target.id, target.mode, {
      addUses,
      durationValue,
      durationUnit,
      resetUsed
    });
    state.adminPromoEditTarget = null;
  }

  // ======================== V2: CRASH VISIBILITY, CONTEXTUAL LIVE FEEDS, PROVABLY FAIR, EXTENDED ADMIN ========================
  function isCrashVisible() {
    return Boolean(
      $('tab-games')?.classList.contains('active')
      && !$('game-shell')?.classList.contains('hidden')
      && $('game-crash')?.classList.contains('active')
    );
  }

  function avatarThumbHtml(photoUrl, firstName, small = false, frameId = '') {
    return renderAvatarHtml(photoUrl, firstName, frameId, { size: small ? 18 : 28, className: small ? 'feed-avatar-box sm' : 'feed-avatar-box' });
  }

  function renderAllLiveFeeds() {
    renderLiveFeed('crash');
    renderLiveFeed('cases');
    renderLiveFeed('craft');
    renderLiveFeed('wheel');
    renderLiveFeed('upgrader');
    renderLiveFeed('slots');
    if (state.activeCase) renderSingleCaseFeed();
  }

  function renderSingleCaseFeed() {
    const el = $('feed-case-single');
    if (!el || !state.activeCase) return;
    const cid = state.activeCase.id;
    const items = (state.liveFeeds.cases || []).filter((x) => x.caseId === cid).slice(0, 18);
    if (!items.length) {
      el.innerHTML = '<div class="feed-empty">Пока нет дропов из этого кейса — стань первым!</div>';
      return;
    }
    el.innerHTML = items.map((it) => {
      const rewardThumb = it.isStars
        ? `<div class="feed-drop-stars">${starIconHtml(20)}</div>`
        : `<img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />`;
      const rewardLabel = it.isStars ? `+${formatStars(it.amount)}` : esc(it.giftName);
      return `
        <div class="feed-card">
          ${rewardThumb}
          <div class="feed-meta">
            <div class="feed-user-row">
              ${avatarThumbHtml(it.photoUrl, it.firstName, true, it.avatarFrame)}
              <span class="feed-nick">${esc(it.firstName)}</span>
            </div>
            <div class="feed-sub">${rewardLabel} • ${formatStars(it.value)} ${starIconHtml(11)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderLiveFeed(channel) {
    const items = (state.liveFeeds[channel] || []).slice(0, 20);
    if (channel === 'crash') {
      const el = $('feed-crash');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Здесь появятся свежие кэшауты Краша...</div>';
        return;
      }
      el.innerHTML = items.map((it) => `
        <div class="feed-card">
          ${avatarThumbHtml(it.photoUrl, it.firstName, false, it.avatarFrame)}
          <div class="feed-meta">
            <div class="feed-user-row">
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-mult-pill">x${Number(it.mult || 1).toFixed(2)}</span>
            </div>
            <div class="feed-sub">${formatStars(it.bet)} ${tgIcon('chevron-right', 10)} <b>${formatStars(it.payout)}</b> ${starIconHtml(11)}</div>
          </div>
        </div>
      `).join('');
    } else if (channel === 'cases') {
      const el = $('feed-cases');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Откройте любой кейс — дропы появятся здесь!</div>';
        return;
      }
      // Overview Cases feed: Case cover image + slightly smaller avatar & nick + won NFT or Stars!
      el.innerHTML = items.map((it) => {
        const rewardThumb = it.isStars
          ? `<div class="feed-drop-stars">${starIconHtml(18)}</div>`
          : `<img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />`;
        const rewardTxt = it.isStars ? `+${formatStars(it.amount)}` : esc(it.giftName);
        return `
          <div class="feed-card">
            <img class="feed-case-cover" src="${esc(it.caseCover || 'case_starter.png')}" alt="" loading="lazy" />
            <div class="feed-meta">
              <div class="feed-user-row">
                ${avatarThumbHtml(it.photoUrl, it.firstName, true, it.avatarFrame)}
                <span class="feed-nick">${esc(it.firstName)}</span>
              </div>
              <div class="feed-sub">${rewardTxt} ${starIconHtml(11)}</div>
            </div>
            ${rewardThumb}
          </div>
        `;
      }).join('');
    } else if (channel === 'craft') {
      const el = $('feed-craft');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Свежие скрафченные NFT появятся здесь...</div>';
        return;
      }
      el.innerHTML = items.map((it) => `
        <div class="feed-card">
          <img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />
          <div class="feed-meta">
            <div class="feed-user-row">
              ${avatarThumbHtml(it.photoUrl, it.firstName, true, it.avatarFrame)}
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-tier-pill">${esc(it.tier || 'Craft')}</span>
            </div>
            <div class="feed-sub">${esc(it.giftName)} • ${formatStars(it.value)} ${starIconHtml(11)}</div>
          </div>
        </div>
      `).join('');
    } else if (channel === 'wheel') {
      const el = $('feed-wheel');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Выигрыши Колеса Удачи появятся здесь...</div>';
        return;
      }
      el.innerHTML = items.map((it) => {
        const thumb = it.isStars
          ? `<div class="feed-drop-stars">${starIconHtml(18)}</div>`
          : `<img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />`;
        const tierRaw = String(it.tierLabel || 'Low');
        const tierKey = String(it.tierId || tierRaw).toLowerCase().replace(/[^a-z]/g, '') || 'low';
        return `
          <div class="feed-card">
            ${thumb}
            <div class="feed-meta">
              <div class="feed-user-row">
                ${avatarThumbHtml(it.photoUrl, it.firstName, true, it.avatarFrame)}
                <span class="feed-nick">${esc(it.firstName)}</span>
              </div>
              <div class="feed-sub">${it.isStars ? `+${formatStars(it.amount)}` : esc(it.giftName)} ${starIconHtml(11)}</div>
              <span class="feed-wheel-tier tier-${esc(tierKey)}">${esc(tierRaw)}</span>
            </div>
          </div>
        `;
      }).join('');
    } else if (channel === 'upgrader') {
      const el = $('feed-upgrader');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Удачные апгрейды появятся здесь...</div>';
        return;
      }
      el.innerHTML = items.map((it) => `
        <div class="feed-card">
          ${it.giftImage ? `<img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />` : avatarThumbHtml(it.photoUrl, it.firstName, false, it.avatarFrame)}
          <div class="feed-meta">
            <div class="feed-user-row">
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-mult-pill">x${Number(it.mult || 1).toFixed(2)}</span>
            </div>
            <div class="feed-sub">${it.giftName ? esc(it.giftName) : `+${formatStars(it.payout)}`} ${starIconHtml(11)}</div>
          </div>
        </div>
      `).join('');
    } else if (channel === 'slots') {
      const el = $('feed-slots');
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<div class="feed-empty">Выигрыши слот-машины появятся здесь...</div>';
        return;
      }
      el.innerHTML = items.map((it) => `
        <div class="feed-card">
          <img class="feed-case-cover" src="/hub_slots.png?v=ua6" alt="" loading="lazy" />
          <div class="feed-meta">
            <div class="feed-user-row">
              ${avatarThumbHtml(it.photoUrl, it.firstName, true, it.avatarFrame)}
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-mult-pill">x${Number(it.mult || 1).toFixed(1)}</span>
            </div>
            <div class="feed-sub">${esc(it.mode || '1x3')} • <b>+${formatStars(it.payout)}</b> ${starIconHtml(11)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // ======================== PROVABLY FAIR (SHA-256) UI & VERIFIER (ONLY IN OWN PROFILE!) ========================
  function updatePfStrips() {
    // Provably Fair bars were removed from all game screens; PF is accessed exclusively from bottom of own profile modal.
  }

  async function sha256BrowserHex(str) {
    const data = new TextEncoder().encode(String(str));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function openProvablyFairModal(tab = 'user') {
    state.pfActiveTab = tab;
    document.querySelectorAll('[data-pf-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.pfTab === tab);
    });
    openModal('modal-pf');
    try {
      const res = await api('/api/pf/state');
      if (state.user && res.userPf) state.user.pf = res.userPf;
      if (res.crashPf) state.pfCrash = res.crashPf;
      updatePfStrips();
    } catch {}
    renderProvablyFairModalBody();
  }

  function renderProvablyFairModalBody() {
    const body = $('pf-modal-body');
    if (!body) return;
    if (state.pfActiveTab === 'crash') {
      const hist = state.pfCrash?.history || [];
      body.innerHTML = `
        <div class="pf-box">
          <div class="pf-kv">Текущий раунд Краша #${state.pfCrash?.roundId || 1} — SHA-256(Server Seed) ДО старта:</div>
          <div class="pf-mono">${esc(state.pfCrash?.serverSeedHash || 'Ожидание...')}</div>
          <div class="muted-sub">После краша Server Seed раскрывается ниже — вы можете проверить совпадение SHA-256 локально в браузере.</div>
        </div>
        ${hist.length ? hist.map((h, idx) => `
          <div class="pf-box">
            <div class="card-head" style="margin-bottom:4px">
              <span style="font-weight:800">Раунд #${h.roundId}</span>
              <span class="feed-mult-pill">x${Number(h.crashPoint).toFixed(2)}</span>
            </div>
            <div class="pf-kv">SHA-256 Hash (опубликован до раунда):</div>
            <div class="pf-mono">${esc(h.serverSeedHash)}</div>
            <div class="pf-kv">Раскрытый Server Seed:</div>
            <div class="pf-mono">${esc(h.serverSeed)}</div>
            <button type="button" class="mini-pill-btn" data-pf-check-crash="${idx}">${tgIcon('check', 13)} Проверить SHA-256</button>
            <div id="pf-check-crash-res-${idx}" class="pf-verify-status"></div>
          </div>
        `).join('') : '<div class="empty-inline">Дождитесь завершения текущего раунда Краша, чтобы увидеть раскрытый Server Seed</div>'}
      `;
      body.querySelectorAll('[data-pf-check-crash]').forEach((btn) => {
        btn.onclick = async () => {
          const i = Number(btn.dataset.pfCheckCrash);
          const item = hist[i];
          const resEl = $(`pf-check-crash-res-${i}`);
          if (!item || !resEl) return;
          const computed = await sha256BrowserHex(item.serverSeed);
          const ok = computed === item.serverSeedHash;
          resEl.className = `pf-verify-status ${ok ? 'ok' : 'err'}`;
          resEl.innerHTML = ok ? `${tgIcon('check', 13)} SHA-256 полностью совпадает! Раунд честный.` : `${tgIcon('x', 13)} Несовпадение хэша!`;
        };
      });
    } else {
      const pf = state.user?.pf || { serverSeedHash: '', clientSeed: '', nonce: 0, history: [] };
      const hist = pf.history || [];
      body.innerHTML = `
        <div class="pf-box">
          <div class="pf-kv">Следующий SHA-256(Server Seed) — зафиксирован ДО игры:</div>
          <div class="pf-mono">${esc(pf.serverSeedHash || '—')}</div>
          <div class="pf-kv" style="margin-top:6px">Ваш Client Seed (Nonce: ${pf.nonce || 0}):</div>
          <div class="search-row">
            <input type="text" id="pf-client-seed-input" class="tg-input" value="${esc(pf.clientSeed || '')}" maxlength="48" />
            <button type="button" id="pf-save-client-seed" class="tg-btn tg-btn-primary">Сохранить</button>
          </div>
        </div>
        ${hist.length ? hist.map((h, idx) => `
          <div class="pf-box">
            <div class="card-head" style="margin-bottom:4px">
              <span style="font-weight:800">${esc(h.game)}</span>
              <span class="badge">Roll: ${h.roll}% • #${h.nonce}</span>
            </div>
            <div class="pf-kv">SHA-256 Hash (до ролла):</div>
            <div class="pf-mono">${esc(h.serverSeedHash)}</div>
            <div class="pf-kv">Раскрытый Server Seed:</div>
            <div class="pf-mono">${esc(h.serverSeed)}</div>
            <button type="button" class="mini-pill-btn" data-pf-check-user="${idx}">${tgIcon('check', 13)} Проверить SHA-256</button>
            <div id="pf-check-user-res-${idx}" class="pf-verify-status"></div>
          </div>
        `).join('') : '<div class="empty-inline">Откройте кейс или сыграйте в Апгрейдер — каждый раскрытый Server Seed появится здесь!</div>'}
      `;
      $('pf-save-client-seed')?.addEventListener('click', async () => {
        const val = $('pf-client-seed-input')?.value?.trim() || '';
        try {
          const res = await api('/api/pf/client-seed', { method: 'POST', body: { clientSeed: val } });
          if (res.user) applyServerUser(res.user);
          updatePfStrips();
          SoundFX.click();
          showToast('Client Seed обновлён!', 'success');
          renderProvablyFairModalBody();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
      body.querySelectorAll('[data-pf-check-user]').forEach((btn) => {
        btn.onclick = async () => {
          const i = Number(btn.dataset.pfCheckUser);
          const item = hist[i];
          const resEl = $(`pf-check-user-res-${i}`);
          if (!item || !resEl) return;
          const computed = await sha256BrowserHex(item.serverSeed);
          const ok = computed === item.serverSeedHash;
          resEl.className = `pf-verify-status ${ok ? 'ok' : 'err'}`;
          resEl.innerHTML = ok ? `${tgIcon('check', 13)} SHA-256 полностью совпадает! Ролл честный.` : `${tgIcon('x', 13)} Несовпадение хэша!`;
        };
      });
    }
  }

  // ======================== EXTENDED ADMIN DASHBOARD & BOT BROADCAST ========================
  async function loadAdminStats() {
    if (!state.user?.isAdmin) return;
    try {
      const s = await api('/api/admin/stats');
      const kpi = $('admin-kpi-grid');
      if (kpi) {
        const ggrCls = s.ggr >= 0 ? 'pos' : 'neg';
        const ggrSign = s.ggr >= 0 ? '+' : '';
        kpi.innerHTML = `
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">${tgIcon('users', 13)} Игроков онлайн</div>
            <div class="admin-kpi-val online">${s.onlineUsersCount} <span style="font-size:11px;color:#8ea1b5">/ ${s.totalUsers}</span></div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">${tgIcon('coins', 13)} Прибыль казино (GGR)</div>
            <div class="admin-kpi-val ${ggrCls}">${ggrSign}${formatStars(s.ggr)} ${starIconHtml(14)}</div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">${tgIcon('trend', 13)} Общий оборот</div>
            <div class="admin-kpi-val">${formatStars(s.totalWagered)} ${starIconHtml(14)}</div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">${tgIcon('gift', 13)} Выплачено игрокам</div>
            <div class="admin-kpi-val">${formatStars(s.totalWon)} ${starIconHtml(14)}</div>
          </div>
        `;
      }
      const rateEl = $('admin-market-rate');
      if (rateEl && s.marketInfo) {
        rateEl.textContent = `MRKT курс: 1 TON ($${s.marketInfo.tonUsd}) = ${s.marketInfo.starsPerTon} звёзд • Комиссия +${s.marketInfo.commissionTon} TON • Маржа: ${s.marginPct}%`;
      }
      const gamesEl = $('admin-games-breakdown');
      if (gamesEl) {
        const arr = s.topProfitable || [];
        gamesEl.innerHTML = arr.map((g) => {
          const cls = g.ggr >= 0 ? 'pos' : 'neg';
          const sign = g.ggr >= 0 ? '+' : '';
          return `
            <div class="admin-game-row">
              <div>
                <div style="font-weight:700">${esc(g.name)}</div>
                <div class="admin-game-meta">Игр: ${g.plays} • Оборот: ${formatStars(g.wagered)}</div>
              </div>
              <span class="admin-ggr-pill ${cls}">${sign}${formatStars(g.ggr)}</span>
            </div>
          `;
        }).join('') || '<div class="empty-inline">Пока нет сыгранных раундов</div>';
      }
      const alertsEl = $('admin-alerts-list');
      if (alertsEl) {
        const list = s.recentAlerts || [];
        alertsEl.innerHTML = list.length ? list.map((a) => {
          const t = new Date(a.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const ico = a.kind === 'suspicious' ? tgIcon('alert', 14) : a.kind === 'drop' ? tgIcon('gem', 14) : tgIcon('settings', 14);
          return `
            <div class="admin-alert-item ${esc(a.kind)}">
              <div class="admin-alert-head">
                <span>${ico} ${esc(a.title)}</span>
                <span class="admin-alert-time">${t}</span>
              </div>
              <div class="admin-alert-desc">${a.firstName ? `<b>${esc(a.firstName)}</b>: ` : ''}${esc(a.details)}</div>
            </div>
          `;
        }).join('') : '<div class="empty-inline">Подозрительной активности и крупных дропов пока нет</div>';
      }
    } catch {}
  }

  async function handleAdminBroadcast() {
    const btn = $('admin-bc-send');
    const statusEl = $('admin-bc-status');
    const text = $('admin-bc-text')?.value?.trim() || '';
    const imageMode = $('admin-bc-img-mode')?.value || 'none';
    const includePlayButton = Boolean($('admin-bc-playbtn')?.checked);

    if (!text && imageMode === 'none') {
      showToast('Введите текст или выберите картинку для рассылки', 'error');
      return;
    }
    if (imageMode === 'upload' && !state.adminBroadcastImageDataUrl) {
      showToast('Выберите файл изображения для загрузки', 'error');
      return;
    }

    btn.disabled = true;
    statusEl.textContent = 'Отправка рассылки через бота...';
    try {
      const res = await api('/api/admin/broadcast', {
        method: 'POST',
        body: {
          text,
          imageMode,
          imageDataUrl: imageMode === 'upload' ? state.adminBroadcastImageDataUrl : '',
          includePlayButton
        }
      });
      SoundFX.coin();
      statusEl.innerHTML = `${tgIcon('check', 13)} Готово! Доставлено: ${res.sent} из ${res.total} (ошибок: ${res.failed})`;
      showToast(`Рассылка завершена: ${res.sent}/${res.total}`, 'success');
      loadAdminStats();
    } catch (e) {
      statusEl.innerHTML = `${tgIcon('x', 13)} Ошибка: ${esc(e.message)}`;
      showToast(e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ======================== MASTER FRAME LOOP (STRICTLY ACTIVE SCREEN ONLY!) ========================
  let lastPvpTimerTs = 0;
  function masterFrameLoop(now) {
    if (!document.hidden) {
      if (isCrashVisible()) {
        drawCrashGraph();
      } else if (isPvpVisible() && now - lastPvpTimerTs >= 100) {
        lastPvpTimerTs = now;
        const pill = $('pvp-timer-pill');
        if (pill) {
          if (state.pvp.phase === 'countdown') {
            const leftMs = Math.max(0, state.pvp.endsAt - Date.now());
            pill.textContent = `Старт через ${(leftMs / 1000).toFixed(1)}с`;
          } else if (state.pvp.phase === 'waiting') {
            pill.textContent = state.pvp.players.length === 1
              ? 'Ожидание 2-го игрока...'
              : 'Ожидание игроков';
          }
        }
      }
    }

    requestAnimationFrame(masterFrameLoop);
  }

  // ======================== 4 NEW GAMES: AUCTION, SINGULARITY, SAFE, SLOTS ========================
  let auctionTimerInterval = null;
  let auctionLastPrizeKey = '';

  function startAuctionTimerLoop() {
    stopAuctionTimerLoop();
    auctionTimerInterval = setInterval(() => {
      if (state.activeGame !== 'auction' || !state.auction) return;
      const pill = $('auction-timer-pill');
      if (!pill) return;
      if (state.auction.phase === 'bidding' && state.auction._endsAtLocal) {
        const left = Math.max(0, state.auction._endsAtLocal - Date.now());
        pill.textContent = `${(left / 1000).toFixed(1)}с`;
      } else if (state.auction.phase === 'reveal') {
        pill.textContent = 'Вскрытие';
      } else {
        pill.textContent = 'Ждём 2+ игрока';
      }
    }, 150);
  }

  function stopAuctionTimerLoop() {
    if (auctionTimerInterval) { clearInterval(auctionTimerInterval); auctionTimerInterval = null; }
  }

  function renderAuctionState() {
    const a = state.auction;
    if (!a) return;
    if (a.phase === 'bidding' && Number.isFinite(a.timeLeftMs)) {
      a._endsAtLocal = Date.now() + a.timeLeftMs;
    }

    const phasePill = $('auction-phase-pill');
    if (phasePill) {
      const txt = a.phase === 'bidding' ? 'Идут ставки' : (a.phase === 'reveal' ? 'Конверты открыты' : 'Ожидание');
      phasePill.innerHTML = `<span class="live-dot"></span>${txt}`;
    }

    if (a.prize) {
      const pKey = `${a.roundId}_${a.prize.name}`;
      if ($('auction-prize-name')) $('auction-prize-name').textContent = a.prize.name;
      if ($('auction-prize-price')) $('auction-prize-price').innerHTML = `${starIconHtml(14)} ${formatStars(a.prize.price)}`;
      const bg = $('auction-prize-bg');
      if (bg && a.prize.center && a.prize.edge) {
        bg.style.background = `radial-gradient(circle, ${a.prize.center}, ${a.prize.edge})`;
      }
      const img = $('auction-prize-img');
      if (img && img.src !== a.prize.image) img.src = a.prize.image;
      if (pKey !== auctionLastPrizeKey) {
        auctionLastPrizeKey = pKey;
        mountGiftLottie('auction-prize', $('auction-prize-lottie'), img, a.prize);
      }
    }

    const minLbl = $('auction-min-label');
    if (minLbl) {
      minLbl.textContent = a.myBid > 0
        ? `Новая общая сумма (сейчас ${formatStars(a.myBid)} ⭐ — спишется только разница)`
        : `Сумма ставки (от ${formatStars(a.minBid || 50)} ⭐ • при проигрыше сгорает)`;
    }
    const bidInp = $('auction-bid-input');
    if (bidInp && !bidInp.matches(':focus')) {
      const minTarget = a.myBid > 0 ? (a.myBid + 10) : (a.minBid || 50);
      if (Number(bidInp.value) < minTarget) bidInp.value = String(minTarget);
    }

    const myPill = $('auction-my-bid-pill');
    if (myPill) {
      myPill.innerHTML = a.myBid > 0
        ? `Ваша ставка: ${formatStars(a.myBid)} ${starIconHtml(11)}`
        : 'Вы не участвуете';
    }

    const bidBtn = $('auction-bid-btn');
    if (bidBtn) {
      bidBtn.disabled = a.phase === 'reveal';
      bidBtn.textContent = a.myBid > 0 ? 'Повысить ставку (доплата разницы)' : 'Сделать ставку';
    }

    const revBanner = $('auction-reveal-banner');
    if (revBanner) {
      if (a.phase === 'reveal' && a.lastResult) {
        const r = a.lastResult;
        revBanner.classList.remove('hidden');
        revBanner.innerHTML = `
          <div style="font-size:12px;color:#86efac;font-weight:800;margin-bottom:3px">ПОБЕДИТЕЛЬ АУКЦИОНА</div>
          <div style="font-size:15px;font-weight:900;color:#fff">${esc(r.winnerName)} забрал «${esc(r.prizeName)}»</div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px">
            Победная ставка: <strong style="color:#fde68a">${formatStars(r.winnerBid)} ⭐</strong>
          </div>
        `;
      } else {
        revBanner.classList.add('hidden');
      }
    }

    const cntPill = $('auction-count-pill');
    if (cntPill) cntPill.textContent = String(a.participantsCount || 0);

    const list = $('auction-bids-list');
    if (list) {
      const parts = a.participants || [];
      if (!parts.length) {
        list.innerHTML = '<div class="empty-inline">Ставок пока нет — сделайте первую ставку</div>';
      } else {
        const ordered = a.phase === 'reveal'
          ? parts.slice().sort((x, y) => (Number(y.amount) || 0) - (Number(x.amount) || 0))
          : parts;
        list.innerHTML = ordered.map((p, idx) => {
          const isMe = String(p.telegramId) === String(state.user?.telegramId);
          const amtText = a.phase === 'reveal' && p.amount != null
            ? `${formatStars(p.amount)} ${starIconHtml(12)}`
            : (isMe && a.myBid > 0 ? `${formatStars(a.myBid)} ${starIconHtml(12)}` : 'Ставка скрыта');
          const ava = renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 30, className: 'player-ava-box' });
          return `
            <div class="player-row" style="${idx === 0 && a.phase === 'reveal' ? 'border-color:#22c55e;background:rgba(34,197,94,0.12)' : ''}">
              <div class="player-left">
                ${ava}
                <div style="min-width:0">
                  <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.firstName || 'Игрок')}${isMe ? ' (Вы)' : ''}</div>
                  ${isMe && a.phase !== 'reveal' ? '<div style="font-size:10.5px;color:rgba(203,213,225,0.68)">Другие игроки не видят вашу ставку</div>' : ''}
                </div>
              </div>
              <span style="font-weight:800;font-size:12.5px;color:${(a.phase === 'reveal' || isMe) ? '#fde68a' : '#94a3b8'}">${amtText}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  async function handleAuctionBid() {
    const amount = Math.floor(Number($('auction-bid-input')?.value));
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Введите корректную сумму ставки', 'error');
      return;
    }
    const btn = $('auction-bid-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await api('/api/games/auction/bid', { method: 'POST', body: { amount } });
      state.auction = res.auction;
      applyServerUser(res.user, { force: true });
      renderAuctionState();
      haptic('medium');
      SoundFX.click();
      const deltaNote = res.paidDelta && res.paidDelta < res.myBid
        ? ` (списана разница ${formatStars(res.paidDelta)} зв.)`
        : '';
      showToast(`Ваша ставка: ${formatStars(res.myBid)} зв.${deltaNote}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      if (btn && state.auction?.phase !== 'reveal') btn.disabled = false;
    }
  }

  // ======================== USER P2P NFT AUCTION HOUSE (10 SLOTS + QUEUE + ANTI-SNIPE) ========================
  let p2pAuctionTickTimer = null;
  let activeSellerPayoutNotice = null;

  function formatP2pCountdown(lot) {
    const now = Date.now();
    if (lot.bidCount > 0 && lot.endsAt > 0) {
      const leftMs = Math.max(0, lot.endsAt - now);
      const sec = (leftMs / 1000).toFixed(1);
      return { text: `${sec}с`, hot: leftMs <= 5000 };
    }
    if (lot.expiresAt > 0) {
      const leftSec = Math.max(0, Math.floor((lot.expiresAt - now) / 1000));
      const h = Math.floor(leftSec / 3600);
      const m = Math.floor((leftSec % 3600) / 60);
      return { text: `${h}ч ${String(m).padStart(2, '0')}м`, hot: false };
    }
    return { text: 'Ожидание', hot: false };
  }

  async function loadP2pAuctionState() {
    try {
      const data = await api('/api/p2p-auction/state');
      state.p2pAuction = data;
      renderP2pAuctionUI();
    } catch {}
  }

  function startP2pAuctionTicker() {
    stopP2pAuctionTicker();
    p2pAuctionTickTimer = setInterval(() => {
      if (state.tab !== 'p2p-auction' || !state.p2pAuction) return;
      renderP2pAuctionTimersOnly();
    }, 250);
  }

  function stopP2pAuctionTicker() {
    if (p2pAuctionTickTimer) {
      clearInterval(p2pAuctionTickTimer);
      p2pAuctionTickTimer = null;
    }
  }

  function renderP2pAuctionTimersOnly() {
    const active = state.p2pAuction?.active || [];
    if (state.p2pAuctionActiveLotId) {
      const lot = active.find((l) => l.id === state.p2pAuctionActiveLotId);
      if (lot) {
        const pill = $('p2p-detail-timer-pill');
        if (pill) {
          const t = formatP2pCountdown(lot);
          pill.textContent = lot.bidCount > 0 ? `До конца: ${t.text}` : `Без ставок • ${t.text}`;
          pill.classList.toggle('hot', t.hot);
        }
      }
      return;
    }
    for (const lot of active) {
      const el = document.querySelector(`[data-p2p-timer="${lot.id}"]`);
      if (el) {
        const t = formatP2pCountdown(lot);
        el.textContent = t.text;
        el.classList.toggle('hot', t.hot);
      }
    }
  }

  function renderP2pAuctionUI() {
    const st = state.p2pAuction;
    if (!st) return;
    const active = st.active || [];

    // If open lot vanished (finished/cancelled), return to list
    if (state.p2pAuctionActiveLotId && !active.some((l) => l.id === state.p2pAuctionActiveLotId)) {
      state.p2pAuctionActiveLotId = null;
      syncTelegramBackButton();
    }

    const listView = $('p2p-auc-list-view');
    const detailView = $('p2p-auc-detail-view');

    if (state.p2pAuctionActiveLotId) {
      listView?.classList.add('hidden');
      detailView?.classList.remove('hidden');
      const lot = active.find((l) => l.id === state.p2pAuctionActiveLotId);
      if (lot) renderP2pLotDetail(lot);
      return;
    }

    listView?.classList.remove('hidden');
    detailView?.classList.add('hidden');

    const slotsPill = $('p2p-auc-slots-pill');
    if (slotsPill) slotsPill.textContent = `${active.length} / ${st.maxActive || 10} лотов`;
    const qPill = $('p2p-auc-queue-pill');
    if (qPill) {
      const qc = Number(st.queueCount || 0);
      qPill.classList.toggle('hidden', qc <= 0);
      qPill.textContent = `В очереди: ${qc}`;
    }

    const grid = $('p2p-auc-grid');
    if (grid) {
      if (!active.length) {
        grid.innerHTML = `
          <div class="p2p-auc-empty">
            <div class="p2p-auc-empty-title">Сейчас нет активных лотов</div>
            <div>Нажмите на синий <b>+</b> сверху, чтобы выставить свой улучшенный NFT-подарок на аукцион!</div>
          </div>
        `;
      } else {
        grid.innerHTML = active.map((lot) => {
          const g = lot.gift || {};
          const t = formatP2pCountdown(lot);
          const bidText = lot.bidCount > 0 ? `${formatStars(lot.currentBid)} ⭐` : 'От 10 ⭐';
          return `
            <button type="button" class="p2p-auc-card" data-open-p2p-lot="${esc(lot.id)}">
              <div class="p2p-auc-card-media" style="background:${giftBgStyle(g)}">
                ${buildCardSymbolPattern(g)}
                <span class="p2p-auc-card-timer${t.hot ? ' hot' : ''}" data-p2p-timer="${esc(lot.id)}">${esc(t.text)}</span>
                <img class="p2p-auc-card-img" src="${esc(g.image || '')}" alt="" loading="lazy" />
              </div>
              <div class="p2p-auc-card-name">${esc(giftDisplayName(g))}</div>
              <div class="p2p-auc-card-sub">${g.mintNumber ? `#${g.mintNumber} • ` : ''}${esc(lot.sellerName || 'Игрок')}</div>
              <div class="p2p-auc-card-foot">
                <span>${bidText}</span>
                <span style="font-size:11px;color:rgba(203,213,225,0.75)">${lot.bidCount} ст.</span>
              </div>
            </button>
          `;
        }).join('');
        grid.querySelectorAll('[data-open-p2p-lot]').forEach((btn) => {
          btn.onclick = () => openP2pAuctionLotDetail(btn.dataset.openP2pLot);
        });
      }
    }

    // Recent finished lots
    const histWrap = $('p2p-auc-history-wrap');
    const histList = $('p2p-auc-history-list');
    const hist = st.history || [];
    if (histWrap && histList) {
      histWrap.classList.toggle('hidden', !hist.length);
      if ($('p2p-auc-hist-count')) $('p2p-auc-hist-count').textContent = String(hist.length);
      histList.innerHTML = hist.slice(0, 10).map((h) => `
        <div class="player-row">
          <div class="player-left">
            <img src="${esc(h.giftImage || '')}" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.06);padding:2px" />
            <div style="min-width:0">
              <div style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.giftName)}</div>
              <div style="font-size:11px;color:rgba(203,213,225,0.72)">Победил ${esc(h.buyerName)}</div>
            </div>
          </div>
          <span style="font-weight:800;font-size:12.5px;color:#fde68a">${formatStars(h.finalBid)} ⭐</span>
        </div>
      `).join('');
    }
  }

  function openP2pAuctionLotDetail(lotId) {
    state.p2pAuctionActiveLotId = lotId;
    haptic('light');
    renderP2pAuctionUI();
    syncTelegramBackButton();
  }

  function closeP2pAuctionLotDetail() {
    state.p2pAuctionActiveLotId = null;
    renderP2pAuctionUI();
    syncTelegramBackButton();
  }

  function renderP2pLotDetail(lot) {
    const g = lot.gift || {};
    const hero = $('p2p-detail-hero-card');
    if (hero) hero.style.background = giftBgStyle(g);
    const pat = $('p2p-detail-pattern');
    if (pat) pat.innerHTML = buildCardSymbolPattern(g);

    const t = formatP2pCountdown(lot);
    const timerPill = $('p2p-detail-timer-pill');
    if (timerPill) {
      timerPill.textContent = lot.bidCount > 0 ? `До конца: ${t.text}` : `Без ставок • ${t.text}`;
      timerPill.classList.toggle('hot', t.hot);
    }
    const stepPill = $('p2p-detail-step-pill');
    if (stepPill) stepPill.textContent = `Таймер: ${lot.nextTimerSec || 15}с`;

    if ($('p2p-detail-img')) $('p2p-detail-img').src = g.image || '';
    if ($('p2p-detail-name')) $('p2p-detail-name').textContent = `${giftDisplayName(g)}${g.mintNumber ? ` #${g.mintNumber}` : ''}`;
    const traits = [g.model?.name, g.backdrop?.name, g.symbol?.name].filter(Boolean).join(' • ');
    if ($('p2p-detail-traits')) $('p2p-detail-traits').textContent = traits || 'Коллекционный NFT';
    const stagesSummary = Array.isArray(lot.timerStages) && lot.timerStages.length
      ? lot.timerStages.map((s) => `#${s.fromBid}+→${s.sec}с`).join(' ')
      : '#1+→15с #6+→10с #16+→5с #26+→3с';
    if ($('p2p-detail-seller')) {
      $('p2p-detail-seller').textContent = `Продавец: ${lot.sellerName || 'Игрок'} • Мин. ${formatStars(lot.minBid || 10)} ⭐ • Шаг +${formatStars(lot.minStep || 10)} ⭐ • ${stagesSummary}`;
    }

    const isOwner = String(lot.sellerId) === String(state.user?.telegramId);
    const isLeader = String(lot.leaderId) === String(state.user?.telegramId);
    const lotMinBid = Math.max(10, Number(lot.minBid) || 10);
    const lotMinStep = Math.max(1, Number(lot.minStep) || 10);

    if ($('p2p-detail-cur-bid')) {
      $('p2p-detail-cur-bid').textContent = lot.bidCount > 0 ? `${formatStars(lot.currentBid)} ⭐` : 'Нет ставок';
    }
    const leaderBox = $('p2p-detail-leader');
    if (leaderBox) {
      if (lot.bidCount > 0 && lot.leaderName) {
        leaderBox.classList.remove('hidden');
        leaderBox.innerHTML = `Лидер: <b>${esc(lot.leaderName)}</b>${isLeader ? ' (Вы)' : ''} • Ставок: ${lot.bidCount}`;
      } else {
        leaderBox.classList.add('hidden');
      }
    }

    const bidControls = $('p2p-detail-bid-controls');
    const cancelBtn = $('p2p-detail-cancel-btn');
    if (bidControls) bidControls.classList.toggle('hidden', isOwner);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !(isOwner && lot.bidCount === 0));

    if (!isOwner) {
      const minNext = lot.bidCount === 0 ? lotMinBid : (lot.currentBid + lotMinStep);
      const lbl = $('p2p-detail-bid-label');
      if (lbl) {
        lbl.textContent = isLeader
          ? `Новая общая ставка (сейчас ${formatStars(lot.currentBid)} ⭐ — спишется только разница)`
          : `Ваша ставка (мин. ${formatStars(minNext)} ⭐)`;
      }
      const inp = $('p2p-detail-bid-input');
      if (inp && !inp.matches(':focus') && Number(inp.value) < minNext) {
        inp.value = String(minNext);
      }
      const btn = $('p2p-detail-bid-btn');
      if (btn) btn.textContent = isLeader ? 'Повысить ставку (доплата разницы)' : 'Сделать ставку';
    }

    const bCount = $('p2p-detail-bids-count');
    if (bCount) bCount.textContent = String(lot.bidCount || 0);

    const bList = $('p2p-detail-bids-list');
    if (bList) {
      const bids = lot.bids || [];
      if (!bids.length) {
        bList.innerHTML = '<div class="empty-inline">Ставок пока нет — будьте первым!</div>';
      } else {
        bList.innerHTML = bids.map((b, idx) => `
          <div class="player-row" style="${idx === 0 ? 'border-color:rgba(59,130,246,0.65);background:rgba(59,130,246,0.12)' : ''}">
            <div class="player-left">
              ${renderAvatarHtml(b.photoUrl, b.firstName, b.avatarFrame, { size: 30, className: 'player-ava-box' })}
              <div style="min-width:0">
                <div style="font-weight:700;font-size:13px">${esc(b.firstName)}</div>
                <div style="font-size:10.5px;color:rgba(203,213,225,0.72)">Ставка #${b.bidNum} • таймер ${b.timerSec}с</div>
              </div>
            </div>
            <span style="font-weight:800;font-size:13px;color:#fde68a">${formatStars(b.amount)} ⭐</span>
          </div>
        `).join('');
      }
    }
  }

  let p2pSelectedCreateGiftUid = '';

  function openP2pCreateModal() {
    const grid = $('p2p-create-grid');
    if (!grid) return;
    p2pSelectedCreateGiftUid = '';
    const selBadge = $('p2p-create-selected-badge');
    const subBtn = $('p2p-create-submit-btn');
    if (selBadge) selBadge.textContent = 'NFT не выбран';
    if (subBtn) {
      subBtn.disabled = true;
      subBtn.textContent = 'Выберите NFT выше';
    }

    const eligible = (state.user?.inventory || []).filter((g) => (g.upgraded || g.crafted) && !g.withdrawPending && !g.inAuction);
    if (!eligible.length) {
      grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 10px">У вас нет доступных улучшенных (NFT) подарков для выставления на аукцион.</div>';
    } else {
      grid.innerHTML = '';
      for (const g of eligible) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.dataset.p2pCreateUid = g.uid;
        card.style.background = giftBgStyle(g);
        const ribbonText = g.crafted ? `${g.craftTier} #${g.mintNumber}` : `#${g.mintNumber || ''}`;
        const ribbonCls = g.crafted ? `gift-card-ribbon tier-${g.craftTier}` : 'gift-card-ribbon';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="${ribbonCls}">${esc(ribbonText)}</span>
          <img src="${esc(g.image)}" alt="" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">${starIconHtml(13)} ${formatStars(g.value)}</div>
        `;
        card.onclick = () => {
          p2pSelectedCreateGiftUid = g.uid;
          grid.querySelectorAll('.gift-card').forEach((el) => {
            el.classList.toggle('selected', el.dataset.p2pCreateUid === g.uid);
          });
          if (selBadge) selBadge.textContent = `${giftDisplayName(g)}${g.mintNumber ? ` #${g.mintNumber}` : ''}`;
          if (subBtn) {
            subBtn.disabled = false;
            subBtn.textContent = 'Выставить на аукцион';
          }
          haptic('light');
        };
        grid.appendChild(card);
      }
    }
    if (subBtn) {
      subBtn.onclick = () => {
        if (!p2pSelectedCreateGiftUid) {
          showToast('Сначала выберите NFT-подарок', 'error');
          return;
        }
        const minBid = Math.max(10, Math.floor(Number($('p2p-create-minbid')?.value) || 10));
        const minStep = Math.max(1, Math.floor(Number($('p2p-create-minstep')?.value) || 10));
        const idleMinutes = Math.max(5, Math.floor(Number($('p2p-create-idle')?.value) || 1440));
        const timerStages = [];
        document.querySelectorAll('#p2p-create-stages-box .p2p-stage-row').forEach((row) => {
          const fromBid = Math.max(1, Math.floor(Number(row.querySelector('.p2p-stage-from')?.value) || 1));
          const sec = Math.max(3, Math.floor(Number(row.querySelector('.p2p-stage-sec')?.value) || 15));
          timerStages.push({ fromBid, sec });
        });
        createP2pAuctionLot(p2pSelectedCreateGiftUid, { minBid, minStep, idleMinutes, timerStages });
      };
    }
    openModal('modal-p2p-create');
  }

  async function createP2pAuctionLot(uid, opts = {}) {
    const subBtn = $('p2p-create-submit-btn');
    if (subBtn) subBtn.disabled = true;
    try {
      const res = await api('/api/p2p-auction/create', {
        method: 'POST',
        body: {
          uid,
          minBid: opts.minBid || 10,
          minStep: opts.minStep || 10,
          idleMinutes: opts.idleMinutes || 1440,
          timerStages: opts.timerStages
        }
      });
      applyServerUser(res.user, { force: true });
      state.p2pAuction = res.state;
      closeModal('modal-p2p-create');
      renderP2pAuctionUI();
      haptic('success');
      showToast(res.queued ? `Подарок добавлен в очередь аукциона (#${res.queuePos})` : 'Подарок выставлен на аукцион!', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      if (subBtn) subBtn.disabled = false;
    }
  }

  async function cancelP2pAuctionLot({ lotId = '', uid = '' }) {
    try {
      const res = await api('/api/p2p-auction/cancel', { method: 'POST', body: { lotId, uid } });
      applyServerUser(res.user, { force: true });
      state.p2pAuction = res.state;
      if (lotId && state.p2pAuctionActiveLotId === lotId) {
        state.p2pAuctionActiveLotId = null;
        syncTelegramBackButton();
      }
      renderP2pAuctionUI();
      haptic('medium');
      showToast('Подарок снят с аукциона и возвращён в профиль', 'info');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleP2pAuctionBid() {
    const lotId = state.p2pAuctionActiveLotId;
    if (!lotId) return;
    const amount = Math.floor(Number($('p2p-detail-bid-input')?.value));
    if (!Number.isFinite(amount) || amount < 1) {
      showToast('Введите корректную сумму ставки', 'error');
      return;
    }
    const btn = $('p2p-detail-bid-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await api('/api/p2p-auction/bid', {
        method: 'POST',
        body: { lotId, amount, mode: 'bid' }
      });
      applyServerUser(res.user, { force: true });
      state.p2pAuction = res.state;
      renderP2pAuctionUI();
      haptic('medium');
      SoundFX.coin();
      const deltaMsg = res.paidDelta && res.paidDelta < res.currentBid
        ? ` (списана разница ${formatStars(res.paidDelta)} ⭐)`
        : '';
      showToast(`Ставка принята: ${formatStars(res.currentBid)} ⭐${deltaMsg} • таймер ${res.timerSec}с`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function maybeShowNextAuctionSellerPayout(notice) {
    if (!notice || activeSellerPayoutNotice?.id === notice.id) return;
    activeSellerPayoutNotice = notice;
    const txt = $('p2p-seller-payout-text');
    if (txt) {
      txt.textContent = `Вы получили ${formatStars(notice.payout)} звёзд с аукциона за «${notice.giftName}» (${notice.feePct || 5}% забрало казино).`;
    }
    SoundFX.bigWin();
    haptic('success');
    openModal('modal-p2p-seller-payout');
  }

  async function acknowledgeAuctionSellerPayout() {
    const id = activeSellerPayoutNotice?.id || '';
    activeSellerPayoutNotice = null;
    closeModal('modal-p2p-seller-payout');
    try {
      const res = await api('/api/p2p-auction/ack-payout', { method: 'POST', body: { id } });
      if (res?.user) applyServerUser(res.user, { force: true });
    } catch {}
  }

  // ======================== GAME 10: SINGULARITY (LOTTIE BLACK HOLE + STABLE SMOOTH ORBITS) ========================
  const singRuntime = {
    rafId: null,
    lastTs: 0,
    bhLottie: null,
    astImgs: [],
    imgCache: new Map(),
    spaceStars: [],
    nodes: new Map(), // telegramId -> { angle, orbitRx, orbitRy, curSize, astType, entryStartAt, arrivedAt, spawnX, spawnY, lastX, lastY }
    lastRoundId: 0,
    suckAnims: [],    // { telegramId, asteroidType, photoUrl, avatarFrame, firstName, betMode, gift, mass, startAngle, startRx, startRy, startSize, startAt, dur }
    suckPulseUntil: 0,
    pullOffset: 0,    // smoothed global gravitational pull (0 -> 1 during suck -> spring bounce back to 0)
    pullVel: 0,
    betMode: 'stars',
    selectedGift: null
  };

  function getCachedCanvasImg(url) {
    if (!url) return null;
    if (singRuntime.imgCache.has(url)) {
      const entry = singRuntime.imgCache.get(url);
      return entry.ok ? entry.img : null;
    }
    const img = new Image();
    const rec = { img, ok: false };
    singRuntime.imgCache.set(url, rec);
    img.onload = () => { rec.ok = true; };
    img.onerror = () => { rec.ok = false; };
    img.src = url;
    return null;
  }

  function mountSingularityBlackHole(retryCount = 0) {
    if (singRuntime.bhLottie || state.activeGame !== 'singularity') return;
    const bhEl = $('sing-blackhole-lottie');
    if (!bhEl) return;
    if (!window.lottie) {
      if (retryCount < 15) setTimeout(() => mountSingularityBlackHole(retryCount + 1), 350);
      return;
    }
    const cachedBh = warmedJson.get('/blackhole.json');
    bhEl.innerHTML = '';
    const bhCfg = {
      container: bhEl,
      renderer: 'svg',
      loop: true,
      autoplay: true
    };
    if (cachedBh) bhCfg.animationData = JSON.parse(JSON.stringify(cachedBh));
    else bhCfg.path = '/blackhole.json';
    singRuntime.bhLottie = lottie.loadAnimation(bhCfg);
  }

  function startSingularityRuntime() {
    stopSingularityRuntime();

    singRuntime.astImgs = [1, 2, 3].map((n) => {
      const im = new Image();
      im.src = `/asteroid_${n}.png`;
      return im;
    });

    singRuntime.spaceStars = Array.from({ length: 48 }, () => ({
      x: Math.random() * 360,
      y: Math.random() * 330,
      r: 0.6 + Math.random() * 1.35,
      a: 0.22 + Math.random() * 0.5,
      tw: 0.001 + Math.random() * 0.002,
      ph: Math.random() * Math.PI * 2
    }));

    singRuntime.lastTs = performance.now();
    mountSingularityBlackHole();

    const loop = (now) => {
      if (state.activeGame !== 'singularity') return;
      drawSingularityFrame(now);
      singRuntime.rafId = requestAnimationFrame(loop);
    };
    singRuntime.rafId = requestAnimationFrame(loop);
  }

  function stopSingularityRuntime() {
    if (singRuntime.rafId) {
      cancelAnimationFrame(singRuntime.rafId);
      singRuntime.rafId = null;
    }
    if (singRuntime.bhLottie) {
      try { singRuntime.bhLottie.destroy(); } catch {}
      singRuntime.bhLottie = null;
    }
    const bhEl = $('sing-blackhole-lottie');
    if (bhEl) {
      bhEl.innerHTML = '';
      bhEl.classList.remove('is-sucking');
    }
    singRuntime.astImgs = [];
    singRuntime.imgCache.clear();
    singRuntime.nodes.clear();
    singRuntime.suckAnims = [];
    singRuntime.pullOffset = 0;
    singRuntime.pullVel = 0;
  }

  function triggerSingularitySuckAnim(victim) {
    const now = performance.now();
    const suckDur = Number(state.singularity?.suckDurMs) || 1800;
    singRuntime.suckPulseUntil = now + suckDur;
    const tid = String(victim.telegramId);
    const pl = (state.singularity?.players || []).find((p) => String(p.telegramId) === tid);
    const node = singRuntime.nodes.get(tid);

    // Launch suction smoothly from the victim's EXACT current on-screen orbit position (ZERO jump!)
    const startAngle = node ? node.angle : (pl?.orbitSeed || 0);
    const startRx = node ? node.orbitRx : 122;
    const startRy = node ? node.orbitRy : 96;
    const startSize = node ? node.curSize : 18;
    const astType = node ? node.astType : (victim.asteroidType ?? 0);
    singRuntime.nodes.delete(tid);

    singRuntime.suckAnims.push({
      telegramId: victim.telegramId,
      asteroidType: astType,
      photoUrl: pl?.photoUrl || '',
      avatarFrame: pl?.avatarFrame || '',
      firstName: pl?.firstName || victim.firstName || 'U',
      betMode: pl?.betMode || 'stars',
      gift: pl?.gift || null,
      mass: victim.mass || 10,
      startAngle,
      startRx,
      startRy,
      startSize,
      startAt: now,
      dur: suckDur
    });

    SoundFX.lose();
    haptic('medium');

    // Keep event banner hidden during sucking (no text naming who is being sucked!)
    const banner = $('sing-event-banner');
    if (banner && state.singularity?.phase !== 'finished') {
      banner.classList.add('hidden');
    }
  }

  function drawAsteroidEntity(ctx, x, y, size, astType, player, now, shakeAmt, hudAlpha = 1) {
    const sx = shakeAmt > 0 ? (Math.sin(now * 0.042 + astType * 1.9 + x * 0.04) * shakeAmt) : 0;
    const sy = shakeAmt > 0 ? (Math.cos(now * 0.048 + astType * 2.3 + y * 0.04) * shakeAmt) : 0;
    const px = x + sx;
    const py = y + sy;

    // 1. Asteroid body sprite (fixed shape per player — only size smoothly scales!)
    const astImg = singRuntime.astImgs[astType % 3];
    ctx.save();
    ctx.translate(px, py);
    if (astImg && astImg.complete && astImg.naturalWidth > 0) {
      const ratio = astImg.naturalWidth / Math.max(1, astImg.naturalHeight);
      const dw = ratio >= 1 ? size * 2 : size * 2 * ratio;
      const dh = ratio >= 1 ? (size * 2) / ratio : size * 2;
      ctx.drawImage(astImg, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fillStyle = '#334155';
      ctx.fill();
    }

    const alpha = Math.max(0, Math.min(1, hudAlpha));
    if (alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha *= alpha;

      // 2. Center of asteroid: EITHER square boxed Gift (full backdrop+pattern or grey non-upgraded bg) OR framed Star badge
      if (player.betMode === 'gift' && player.gift && player.gift.image) {
        const g = player.gift;
        const boxSz = Math.max(18, size * 1.18);
        const half = boxSz / 2;
        const rad = Math.max(4, boxSz * 0.22);

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-half, -half, boxSz, boxSz, rad);
        ctx.clip();

        // Full backdrop gradient for upgraded/crafted NFT OR authentic grey non-upgraded gift background
        if ((g.upgraded || g.crafted) && g.backdrop?.center && g.backdrop?.edge) {
          const grad = ctx.createRadialGradient(0, -boxSz * 0.1, 1, 0, 0, boxSz * 0.78);
          grad.addColorStop(0, g.backdrop.center);
          grad.addColorStop(1, g.backdrop.edge);
          ctx.fillStyle = grad;
        } else {
          const grad = ctx.createLinearGradient(-half, -half, half, half);
          grad.addColorStop(0, '#364152');
          grad.addColorStop(1, '#1e2532');
          ctx.fillStyle = grad;
        }
        ctx.fillRect(-half, -half, boxSz, boxSz);

        // Subtle symbol pattern inside square box for upgraded/crafted gifts
        if ((g.upgraded || g.crafted) && g.symbol?.image) {
          const symImg = getCachedCanvasImg(g.symbol.image);
          if (symImg) {
            ctx.save();
            ctx.globalAlpha *= 0.24;
            const sSz = boxSz * 0.25;
            const pts = [[-0.3, -0.3], [0.3, -0.28], [-0.28, 0.3], [0.28, 0.3]];
            for (const [ox, oy] of pts) {
              ctx.drawImage(symImg, ox * boxSz - sSz / 2, oy * boxSz - sSz / 2, sSz, sSz);
            }
            ctx.restore();
          }
        }

        const gImg = getCachedCanvasImg(g.image);
        if (gImg) {
          const imgSz = boxSz * 0.82;
          ctx.drawImage(gImg, -imgSz / 2, -imgSz / 2, imgSz, imgSz);
        }
        ctx.restore();

        // Crisp square border frame around gift box
        ctx.beginPath();
        ctx.roundRect(-half, -half, boxSz, boxSz, rad);
        ctx.strokeStyle = (g.upgraded || g.crafted) ? 'rgba(255, 255, 255, 0.42)' : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      } else {
        // Framed star badge centered cleanly on the asteroid
        const fontSize = Math.max(8.5, Math.min(11.5, size * 0.46));
        const label = formatCompactStars(player.mass);
        ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const tw = ctx.measureText(label).width;
        const badgeW = tw + fontSize + 12;
        const badgeH = fontSize + 7;

        ctx.beginPath();
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 7);
        ctx.fillStyle = 'rgba(10, 15, 28, 0.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.82)';
        ctx.lineWidth = 1.25;
        ctx.stroke();

        const starX = -badgeW / 2 + fontSize * 0.56 + 3.5;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const a2 = a1 + Math.PI / 5;
          const sr = fontSize * 0.44;
          if (i === 0) ctx.moveTo(starX + Math.cos(a1) * sr, Math.sin(a1) * sr);
          else ctx.lineTo(starX + Math.cos(a1) * sr, Math.sin(a1) * sr);
          ctx.lineTo(starX + Math.cos(a2) * (sr * 0.45), Math.sin(a2) * (sr * 0.45));
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, starX + fontSize * 0.54, 0.5);
      }

      // 3. Owner avatar smoothly fading in above the asteroid
      const avaR = Math.max(8.5, Math.min(13, size * 0.48));
      const avaY = -size - avaR * 0.62;
      ctx.beginPath();
      ctx.arc(0, avaY, avaR + 1.4, 0, Math.PI * 2);
      ctx.fillStyle = player.isMe ? '#38bdf8' : 'rgba(148, 163, 184, 0.72)';
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, avaY, avaR, 0, Math.PI * 2);
      ctx.clip();
      const avaImg = getCachedCanvasImg(player.photoUrl);
      if (avaImg) {
        ctx.drawImage(avaImg, -avaR, avaY - avaR, avaR * 2, avaR * 2);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-avaR, avaY - avaR, avaR * 2, avaR * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `800 ${Math.round(avaR * 1.05)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((player.firstName || 'U')[0].toUpperCase(), 0, avaY + 0.5);
      }
      ctx.restore();

      const frameUrl = getFrameUrl(player.avatarFrame);
      if (frameUrl) {
        const fImg = getCachedCanvasImg(frameUrl);
        if (fImg) {
          const fR = avaR * 1.38;
          ctx.drawImage(fImg, -fR, avaY - fR, fR * 2, fR * 2);
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function formatCompactStars(n) {
    const v = Number(n) || 0;
    if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
  }

  function drawSingularityFrame(now) {
    const canvas = $('singularity-canvas');
    if (!canvas) return;
    const W = 360;
    const H = 330;
    const ctx = setupHiDpiCanvas(canvas, W, H);
    const cx = W / 2;
    const cy = H / 2;

    const dtMs = Math.min(48, Math.max(4, now - (singRuntime.lastTs || now)));
    singRuntime.lastTs = now;
    const dtSec = dtMs / 1000;

    ctx.clearRect(0, 0, W, H);

    // 1. Deep space subtle starfield
    for (const st of singRuntime.spaceStars) {
      const a = st.a * (0.6 + 0.4 * Math.sin(now * st.tw + st.ph));
      ctx.fillStyle = `rgba(226, 232, 240, ${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const s = state.singularity;
    if (s?.roundId && s.roundId !== singRuntime.lastRoundId) {
      singRuntime.lastRoundId = s.roundId;
      singRuntime.nodes.clear();
      singRuntime.suckAnims = [];
      singRuntime.pullOffset = 0;
      singRuntime.pullVel = 0;
    }

    const alive = (s?.players || []).filter((p) => p.status === 'alive');
    const n = alive.length;

    const zoomScale = n >= 6 ? Math.max(0.66, 1 - (n - 5) * 0.045) : 1.0;
    const isSucking = singRuntime.suckAnims.length > 0 || now < singRuntime.suckPulseUntil;

    // Spring physics for global gravitational pull: pulls all surviving asteroids inward during suction, then bounces them smoothly back out!
    const targetPull = isSucking ? 1.0 : 0.0;
    const stiffness = isSucking ? 12.0 : 28.0;
    const damping = isSucking ? 6.2 : 5.4; // slight elastic bounce-back when suction ends!
    const force = (targetPull - singRuntime.pullOffset) * stiffness - singRuntime.pullVel * damping;
    singRuntime.pullVel += force * dtSec;
    singRuntime.pullOffset += singRuntime.pullVel * dtSec;
    const pullFactor = Math.max(-0.18, Math.min(1.12, singRuntime.pullOffset));

    // Sync Lottie Black Hole scale + very subtle calm vibration during suction
    const bhEl = $('sing-blackhole-lottie');
    if (bhEl) {
      const bhScale = zoomScale * (0.94 + Math.max(0, pullFactor) * 0.12);
      const jx = isSucking ? (Math.sin(now * 0.045) * 0.9) : 0;
      const jy = isSucking ? (Math.cos(now * 0.052) * 0.7) : 0;
      bhEl.style.transform = `translate(calc(-50% + ${jx.toFixed(1)}px), calc(-50% + ${jy.toFixed(1)}px)) scale(${bhScale.toFixed(3)})`;
      bhEl.classList.toggle('is-sucking', isSucking);
      if (singRuntime.bhLottie) {
        singRuntime.bhLottie.setSpeed(isSucking ? 1.9 : 1.0);
      }
    }

    // 2. Wider concentric gravitational orbit rings (further from black hole)
    const ringRadii = [82, 114, 146];
    for (let i = 0; i < ringRadii.length; i++) {
      const rx = ringRadii[i] * (1 - pullFactor * 0.06);
      const ry = rx * 0.78;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.min(168, rx), Math.min(148, ry), 0, 0, Math.PI * 2);
      ctx.strokeStyle = isSucking
        ? `rgba(129, 140, 248, ${(0.20 - i * 0.035).toFixed(2)})`
        : `rgba(148, 163, 184, ${(0.14 - i * 0.025).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Soft gravitational pull streaks during suction
    if (pullFactor > 0.08) {
      ctx.save();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + now * 0.0018;
        const rOut = 134 * zoomScale;
        const rIn = 34 * zoomScale;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut * 0.72);
        ctx.lineTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn * 0.5);
        ctx.strokeStyle = `rgba(129, 140, 248, ${(0.2 * Math.max(0, pullFactor)).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Sync persistent nodes for alive players (ZERO jumps on join or pull; smooth fly-in from offscreen + smooth size-only lerp!)
    const masses = alive.map((p) => p.mass || 10);
    const minM = masses.length ? Math.min(...masses) : 10;
    const maxM = masses.length ? Math.max(...masses) : 10;
    const myId = String(state.user?.telegramId || '');
    const aliveIds = new Set(alive.map((p) => String(p.telegramId)));

    for (const key of singRuntime.nodes.keys()) {
      if (!aliveIds.has(key)) singRuntime.nodes.delete(key);
    }

    const drawList = [];
    for (let idx = 0; idx < alive.length; idx++) {
      const p = alive[idx];
      const tid = String(p.telegramId);
      const normM = maxM > minM ? (p.mass - minM) / (maxM - minM) : 0.45;
      // Slightly smaller initial meteorites (14..24px), scaling smoothly ONLY in size when bets change
      const targetSize = (14.5 + normM * 10.5) * zoomScale;

      let node = singRuntime.nodes.get(tid);
      if (!node) {
        // Stable personal orbit radius further out from the black hole (108..146px) based ONLY on player's own orbitSeed
        const seed = Number(p.orbitSeed) || (idx * 2.13 + 0.7);
        const laneHash = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
        const orbitRx = 112 + laneHash * 36;
        const orbitRy = orbitRx * 0.78;
        const initAngle = seed % (Math.PI * 2);
        // Spawn cleanly OUTSIDE screen bounds along the same angular vector for fast smooth fly-in
        const spawnR = 265;
        node = {
          angle: initAngle,
          orbitRx,
          orbitRy,
          curSize: targetSize,
          astType: p.asteroidType || 0, // LOCKED forever for this player in this round!
          entryStartAt: now,
          entryDur: 520,
          arrivedAt: 0,
          spawnX: cx + Math.cos(initAngle) * spawnR,
          spawnY: cy + Math.sin(initAngle) * spawnR,
          lastX: cx,
          lastY: cy
        };
        singRuntime.nodes.set(tid, node);
      }

      // Smooth constant angular velocity (independent of other players' bets -> NEVER jumps!)
      const angSpeed = 0.38; // rad/sec
      node.angle += angSpeed * dtSec;
      // Smooth size-only interpolation (never changes shape or position!)
      node.curSize += (targetSize - node.curSize) * Math.min(1, dtSec * 5.5);

      // Apply inward pull during suction (-18%) + elastic bounce-back when suction finishes
      const curRx = node.orbitRx * (1 - pullFactor * 0.18);
      const curRy = node.orbitRy * (1 - pullFactor * 0.18);
      const targetX = cx + Math.cos(node.angle) * curRx;
      const targetY = cy + Math.sin(node.angle) * curRy;

      // Smooth fast fly-in from off-screen onto orbit, then fade in avatar + bet!
      const rawEntry = Math.min(1, (now - node.entryStartAt) / node.entryDur);
      const easeEntry = 1 - Math.pow(1 - rawEntry, 3); // easeOutCubic
      const x = node.spawnX + (targetX - node.spawnX) * easeEntry;
      const y = node.spawnY + (targetY - node.spawnY) * easeEntry;
      node.lastX = x;
      node.lastY = y;

      let hudAlpha = 0;
      if (rawEntry >= 0.96) {
        if (!node.arrivedAt) node.arrivedAt = now;
        hudAlpha = Math.min(1, (now - node.arrivedAt) / 320);
      }

      drawList.push({
        p,
        node,
        x,
        y,
        size: node.curSize,
        hudAlpha
      });
    }

    drawList.sort((a, b) => a.y - b.y);

    // Very gentle tremble on surviving asteroids while black hole pulls
    const globalShake = isSucking ? 0.55 : 0;
    for (const item of drawList) {
      drawAsteroidEntity(ctx, item.x, item.y, item.size, item.node.astType, {
        betMode: item.p.betMode || 'stars',
        gift: item.p.gift || null,
        mass: item.p.mass,
        photoUrl: item.p.photoUrl,
        avatarFrame: item.p.avatarFrame,
        firstName: item.p.firstName,
        isMe: String(item.p.telegramId) === myId
      }, now, globalShake, item.hudAlpha);
    }

    // 5. Actively Sucked Asteroid: smooth spiral plunge from exact orbit coords (gentle tremble, zero jump!)
    for (let i = singRuntime.suckAnims.length - 1; i >= 0; i--) {
      const sa = singRuntime.suckAnims[i];
      const t = Math.min(1, (now - sa.startAt) / sa.dur);
      if (t >= 1) {
        singRuntime.suckAnims.splice(i, 1);
        continue;
      }
      // Smooth ease-in-quad/cubic spiral plunge
      const ease = t * t * (0.35 + 0.65 * t);
      const rx = sa.startRx * (1 - ease);
      const ry = sa.startRy * (1 - ease);
      const ang = sa.startAngle + t * 1.1 + ease * 3.8;
      const x = cx + Math.cos(ang) * rx;
      const y = cy + Math.sin(ang) * ry;
      const sz = Math.max(3, sa.startSize * (1 - ease * 0.86));
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, (t - 0.74) / 0.26);
      drawAsteroidEntity(ctx, x, y, sz, sa.asteroidType || 0, {
        betMode: sa.betMode,
        gift: sa.gift || null,
        mass: sa.mass,
        photoUrl: sa.photoUrl,
        avatarFrame: sa.avatarFrame,
        firstName: sa.firstName,
        isMe: String(sa.telegramId) === myId
      }, now, 1.1 + t * 0.9, 1 - Math.max(0, (t - 0.45) / 0.45));
      ctx.restore();
    }

    // Update live pull countdown badge
    const timerEl = $('sing-pull-timer');
    if (timerEl && s) {
      if (s.phase === 'active' && s._nextPullLocal) {
        const left = Math.max(0, s._nextPullLocal - Date.now());
        timerEl.textContent = `${(left / 1000).toFixed(1)}с`;
      } else if (s.phase === 'finished') {
        timerEl.textContent = 'Финал';
      } else {
        timerEl.textContent = 'Ждём 2+';
      }
    }
  }

  function renderSingularityState() {
    const s = state.singularity;
    if (!s) return;
    if (s.phase === 'active' && s.nextPullAt && s.now) {
      s._nextPullLocal = Date.now() + Math.max(0, s.nextPullAt - s.now);
    }

    const potEl = $('sing-pot-pill');
    if (potEl) potEl.innerHTML = `Банк: ${formatStars(s.totalPot || 0)} ${starIconHtml(12)}`;

    const phaseEl = $('sing-phase-pill');
    if (phaseEl) {
      const txt = s.phase === 'active' ? 'Поглощение' : (s.phase === 'finished' ? 'Победитель' : 'Ожидание');
      phaseEl.innerHTML = `<span class="live-dot"></span>${txt}`;
    }

    const alive = (s.players || []).filter((p) => p.status === 'alive');
    const aliveEl = $('sing-alive-pill');
    if (aliveEl) aliveEl.textContent = `${alive.length} в орбите`;

    const myId = String(state.user?.telegramId || '');
    const mePl = (s.players || []).find((p) => String(p.telegramId) === myId);
    const myPill = $('sing-my-mass-pill');
    const joinBtn = $('sing-join-btn');
    if (myPill) {
      if (!mePl) myPill.textContent = 'Вы вне орбиты';
      else if (mePl.status === 'sucked') myPill.textContent = 'Поглощён';
      else {
        const chTxt = mePl.winChance ? ` • ${mePl.winChance}%` : '';
        myPill.innerHTML = `Масса: ${formatStars(mePl.mass)} ${starIconHtml(11)}${chTxt}`;
      }
    }
    if (joinBtn) {
      if (mePl && mePl.status === 'sucked') {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Вы вылетели в этом раунде';
      } else if (mePl && mePl.betMode === 'gift') {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Ваш подарок уже на орбите';
      } else if (mePl && mePl.betMode === 'stars') {
        joinBtn.disabled = s.phase === 'finished';
        joinBtn.textContent = 'Увеличить массу астероида';
      } else {
        joinBtn.disabled = s.phase === 'finished';
        joinBtn.textContent = singRuntime.betMode === 'gift' ? 'Отправить подарок на орбиту' : 'Выйти на орбиту';
      }
    }

    const banner = $('sing-event-banner');
    if (banner && s.phase === 'finished' && s.lastWinner) {
      banner.className = 'sing-event-banner is-win';
      banner.textContent = `Победил ${s.lastWinner.firstName} • +${formatStars(s.lastWinner.payout)}`;
    } else if (banner && s.phase === 'waiting') {
      banner.classList.add('hidden');
    }

    const list = $('sing-players-list');
    if (list) {
      const sorted = (s.players || []).slice().sort((a, b) => {
        if (a.status !== b.status) return a.status === 'alive' ? -1 : 1;
        return (b.mass || 0) - (a.mass || 0);
      });
      if (!sorted.length) {
        list.innerHTML = '<div class="empty-inline">Орбита пуста — войдите звёздами или подарком</div>';
      } else {
        list.innerHTML = sorted.map((p) => {
          const dead = p.status === 'sucked';
          const stakeHtml = p.betMode === 'gift' && p.gift
            ? `<span style="display:inline-flex;align-items:center;gap:4px"><img src="${esc(p.gift.image)}" style="width:18px;height:18px;object-fit:contain" /> ${formatStars(p.mass)}</span>`
            : `${formatStars(p.mass)} ${starIconHtml(12)}`;
          const chBadge = !dead && Number(p.winChance) > 0
            ? `<span style="margin-left:6px;padding:1px 6px;border-radius:999px;background:rgba(56,189,248,0.16);color:#7dd3fc;font-size:11px;font-weight:800">${p.winChance}%</span>`
            : '';
          const ava = renderAvatarHtml(p.photoUrl, p.firstName, p.avatarFrame, { size: 30, className: 'player-ava-box' });
          return `
            <div class="player-row" style="${dead ? 'opacity:0.45;text-decoration:line-through' : ''}">
              <div class="player-left">
                ${ava}
                <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.firstName || 'Игрок')}${chBadge}</span>
              </div>
              <span style="font-weight:800;font-size:12.5px;color:${dead ? '#94a3b8' : '#fde68a'}">${stakeHtml}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  function renderSingGiftPreview() {
    const box = $('sing-gift-preview');
    if (!box) return;
    if (singRuntime.selectedGift) {
      const still = (state.user?.inventory || []).find((g) => g.uid === singRuntime.selectedGift.uid);
      if (!still) singRuntime.selectedGift = null;
      else singRuntime.selectedGift = still;
    }
    if (singRuntime.selectedGift) {
      const g = singRuntime.selectedGift;
      box.innerHTML = `<img src="${esc(g.image)}" style="width:28px;height:28px;object-fit:contain" /> <span>${esc(giftDisplayName(g))} (${formatStars(g.value)})</span>`;
    } else {
      box.textContent = 'Выбрать подарок из инвентаря';
    }
  }

  function openSingGiftPicker() {
    const grid = $('stake-picker-grid');
    const title = $('stake-picker-title');
    const doneBtn = $('stake-picker-done-btn');
    if (!grid) return;
    if (title) title.textContent = 'Подарок для Сингулярности';
    if (doneBtn) doneBtn.classList.add('hidden');

    const renderSingGrid = () => {
      const typeF = $('stake-pick-type')?.value || 'all';
      const sortM = $('stake-pick-sort')?.value || 'price_desc';
      const base = (state.user?.inventory || []).filter((g) => !g.withdrawPending && !g.inAuction);
      const items = sortGiftList(filterInventoryByType(base, typeF), sortM);
      if (!items.length) {
        grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подходящих подарков нет</div>';
        return;
      }
      grid.innerHTML = '';
      for (const g of items) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.style.background = giftBgStyle(g);
        const ribbonText = g.crafted
          ? `${g.craftTier} #${g.mintNumber}`
          : g.upgraded
            ? `#${g.mintNumber}`
            : isBasicNonUpgradable(g)
              ? 'Подарок'
              : 'Обычный';
        const ribbonClass = g.crafted
          ? `gift-card-ribbon tier-${g.craftTier}`
          : g.upgraded ? 'gift-card-ribbon' : 'gift-card-ribbon regular';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="${ribbonClass}">${esc(ribbonText)}</span>
          <img src="${esc(g.image)}" alt="${esc(giftDisplayName(g))}" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">${starIconHtml(11)} ${formatStars(g.value)}</div>
        `;
        card.onclick = () => {
          singRuntime.selectedGift = g;
          closeModal('modal-stake-picker');
          renderSingGiftPreview();
          haptic('light');
        };
        grid.appendChild(card);
      }
    };
    if ($('stake-pick-type')) $('stake-pick-type').onchange = renderSingGrid;
    if ($('stake-pick-sort')) $('stake-pick-sort').onchange = renderSingGrid;
    renderSingGrid();
    openModal('modal-stake-picker');
  }

  async function handleSingularityJoin() {
    const btn = $('sing-join-btn');
    if (btn) btn.disabled = true;
    try {
      let body;
      if (singRuntime.betMode === 'gift') {
        if (!singRuntime.selectedGift) {
          showToast('Выберите подарок из инвентаря', 'error');
          if (btn) btn.disabled = false;
          return;
        }
        body = { mode: 'gift', giftUid: singRuntime.selectedGift.uid };
      } else {
        const amount = Math.floor(Number($('sing-bet-input')?.value));
        if (!Number.isFinite(amount) || amount < 10) {
          showToast('Минимальная ставка — 10 звёзд', 'error');
          if (btn) btn.disabled = false;
          return;
        }
        body = { mode: 'stars', amount };
      }
      const res = await api('/api/games/singularity/join', { method: 'POST', body });
      if (singRuntime.betMode === 'gift') {
        singRuntime.selectedGift = null;
        renderSingGiftPreview();
      }
      state.singularity = res.singularity;
      applyServerUser(res.user, { force: true });
      renderSingularityState();
      haptic('medium');
      SoundFX.click();
    } catch (e) {
      showToast(e.message, 'error');
      renderSingularityState();
    }
  }

  // ======================== GAME 11: CRACK THE SAFE (3 DIALS + SPARKS) ========================
  const safeState = {
    digits: [0, 0, 0],
    cracking: false,
    sparks: [],
    rafId: null
  };

  function renderSafeDials() {
    for (let i = 0; i < 3; i++) {
      const el = $(`safe-digit-${i}`);
      if (el) {
        el.textContent = String(safeState.digits[i]);
        el.classList.remove('is-match', 'is-miss');
      }
      const sec = $(`safe-secret-${i}`);
      if (sec) sec.textContent = '?';
    }
  }

  function spawnSafeSparks(count = 24, isGold = false) {
    const canvas = $('safe-sparks-canvas');
    if (!canvas) return;
    const W = 320;
    const H = 190;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.8 + Math.random() * 4.5;
      safeState.sparks.push({
        x: W / 2 + (Math.random() - 0.5) * 140,
        y: H / 2 + (Math.random() - 0.5) * 40,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 1.2,
        life: 1,
        col: isGold ? '#fde047' : (Math.random() < 0.5 ? '#38bdf8' : '#fbbf24')
      });
    }
    if (!safeState.rafId) {
      const step = () => {
        const c = $('safe-sparks-canvas');
        if (!c || !safeState.sparks.length) {
          safeState.rafId = null;
          if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
          return;
        }
        const ctx = setupHiDpiCanvas(c, W, H);
        ctx.clearRect(0, 0, W, H);
        for (let i = safeState.sparks.length - 1; i >= 0; i--) {
          const p = safeState.sparks[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.14;
          p.life -= 0.032;
          if (p.life <= 0) { safeState.sparks.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        safeState.rafId = requestAnimationFrame(step);
      };
      safeState.rafId = requestAnimationFrame(step);
    }
  }

  function stopSafeSparks() {
    safeState.sparks = [];
    if (safeState.rafId) { cancelAnimationFrame(safeState.rafId); safeState.rafId = null; }
  }

  function renderSafeBets() {
    const list = $('safe-bets-list');
    const cnt = $('safe-bets-count');
    if (!list) return;
    const bets = state.safeRecentBets || [];
    if (cnt) cnt.textContent = bets.length;
    if (!bets.length) {
      list.innerHTML = '<div class="empty-inline">Пока нет завершённых взломов...</div>';
      return;
    }
    list.innerHTML = bets.map((b) => {
      const ava = renderAvatarHtml(b.photoUrl, b.firstName, b.avatarFrame, { size: 30, className: 'player-ava-box' });
      const betVal = Number(b.bet || 0);
      const payoutVal = Number(b.payout || 0);
      const isWin = payoutVal > 0;
      const cls = isWin ? 'win' : 'lose';
      const rightTxt = isWin
        ? `x${b.multiplier} • +${formatStars(payoutVal)} ${starIconHtml(11)}`
        : `${b.matches || 0}/3 • -${formatStars(betVal)} ${starIconHtml(11)}`;
      return `
        <div class="player-row">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(b.firstName)}</div>
              <div class="player-bet">Ставка: ${formatStars(betVal)} ${starIconHtml(11)} • Угадано ${b.matches || 0}/3</div>
            </div>
          </div>
          <span class="player-status ${cls}">${rightTxt}</span>
        </div>
      `;
    }).join('');
  }

  async function handleSafeCrack() {
    if (safeState.cracking) return;
    const bet = Math.floor(Number($('safe-bet-input')?.value));
    if (!Number.isFinite(bet) || bet < 10) {
      showToast('Минимальная ставка — 10 звёзд', 'error');
      return;
    }

    safeState.cracking = true;
    state.safeCracking = true;
    const btn = $('safe-crack-btn');
    const ind = $('safe-lock-indicator');
    const door = $('safe-door-frame');
    const resLine = $('safe-result-line');
    if (btn) btn.disabled = true;
    if (ind) { ind.textContent = 'ВЗЛОМ...'; ind.classList.remove('is-open'); }
    if (door) door.classList.remove('is-unlocked');
    for (let i = 0; i < 3; i++) {
      $(`safe-digit-${i}`)?.classList.remove('is-match', 'is-miss');
      if ($(`safe-secret-${i}`)) $(`safe-secret-${i}`).textContent = '...';
    }

    try {
      const res = await api('/api/games/safe/crack', {
        method: 'POST',
        body: { bet, digits: safeState.digits }
      });

      if (state.user) updateDisplayedBalance(Math.max(0, (state.user.balance || 0) - bet));

      // Sequential dial reveal with sparks and mechanical clicks
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 340));
        SoundFX.tick();
        const winEl = $(`safe-digit-${i}`);
        const secEl = $(`safe-secret-${i}`);
        if (secEl) secEl.textContent = `Код: ${res.secret[i]}`;
        if (res.matchedPositions[i]) {
          winEl?.classList.add('is-match');
          spawnSafeSparks(18, true);
          haptic('medium');
        } else {
          winEl?.classList.add('is-miss');
          spawnSafeSparks(8, false);
        }
      }

      await flushAndApplyUser(res.feedToken, res.user);

      if (res.winAmount > 0) {
        if (ind) { ind.textContent = res.matches === 3 ? 'ДЖЕКПОТ x50' : `ОТКРЫТ x${res.multiplier}`; ind.classList.add('is-open'); }
        if (door) door.classList.add('is-unlocked');
        if (resLine) resLine.innerHTML = `Угадано ${res.matches}/3 • Выигрыш: <strong style="color:#4ade80">+${formatStars(res.winAmount)}</strong> ${starIconHtml(13)}`;
        spawnSafeSparks(res.matches === 3 ? 55 : 26, true);
        res.matches === 3 ? SoundFX.bigWin() : SoundFX.coin();
        haptic('success');
      } else {
        if (ind) ind.textContent = 'ЗАКРЫТ';
        if (resLine) resLine.textContent = `Код сейфа был ${res.secret.join('')} — попробуйте ещё`;
        SoundFX.lose();
        haptic('error');
      }
    } catch (e) {
      showToast(e.message, 'error');
      if (ind) ind.textContent = 'ЗАКРЫТ';
    } finally {
      safeState.cracking = false;
      state.safeCracking = false;
      if (btn) btn.disabled = false;
    }
  }

  // ======================== GAME 12: CLASSIC SLOTS (TELEGRAM 🎰 STYLE, 1x3 / 3x3 / 5x5) ========================
  const slotsState = {
    mode: '1x3',
    spinning: false
  };

  const TG_SLOT_SYMBOLS = [{"viewBox":"-4.8 -4.8 90.1 109.6","body":"<path d=\"M36.2,-25L36.2,-46L-36.2,-46L-36.2,-16.3L-17.1,-16.3C-17.1,-16.3 -10.1,-22.9 -5.6,-21.6C-2.5,-20.7 -5.9,-13.1 -8.3,-8.7C-9.7,-5.9 -10.9,-3 -11.6,0C-12.5,3.4 -13.4,7.9 -13.7,12C-13.7,12 -15.4,35.2 -12.8,46L26,46C26,46 16.3,27.6 17.7,12C17.7,12 18.6,-16.2 36.2,-25Z\" fill=\"rgb(255,0,0)\" transform=\"translate(40.3,50)\"/><path d=\"M-9.6,42.2L20,42.2C17.1,35.3 12.9,23 13.9,11.7C14,9.5 15.3,-16.8 32.4,-27.2L32.4,-42.2L-32.4,-42.2L-32.4,-20.1L-18.5,-20.1C-15.8,-22.4 -9.7,-26.8 -4.5,-25.2C-2.9,-24.8 -1.7,-23.6 -1,-22.1C-0.2,-20 0.2,-16.5 -4.9,-6.9C-6.3,-4.4 -7.3,-1.7 -8,0.9C-9,5.2 -9.7,9.1 -9.9,12.2L-9.9,12.3C-9.9,12.5 -11.3,31.3 -9.6,42.2Z M26,49.8L-12.8,49.8C-14.5,49.8 -16,48.6 -16.4,46.9C-19.2,35.8 -17.6,13.2 -17.4,11.7C-17.2,8.1 -16.5,3.8 -15.3,-0.9C-14.5,-4.2 -13.3,-7.4 -11.6,-10.5C-9.9,-13.8 -8.9,-16.1 -8.5,-17.6C-10.2,-16.9 -12.6,-15.3 -14.5,-13.6C-15.2,-12.9 -16.1,-12.5 -17.1,-12.5L-36.2,-12.5C-38.3,-12.5 -40.1,-14.2 -40.1,-16.3L-40.1,-46C-40.1,-48.1 -38.3,-49.8 -36.2,-49.8L36.2,-49.8C38.3,-49.8 40.1,-48.1 40.1,-46L40.1,-24.9C40.1,-23.5 39.2,-22.2 37.9,-21.5C22.5,-13.9 21.5,11.8 21.5,12.1C21.5,12.2 21.5,12.2 21.5,12.3C20.2,26.6 29.3,44 29.3,44.2C30,45.4 29.9,46.8 29.2,48C28.5,49.1 27.3,49.8 26,49.8Z\" fill=\"rgb(168,0,0)\" fill-rule=\"evenodd\" transform=\"translate(40.3,50)\"/>"},{"viewBox":"-4.8 -4.8 97.7 44.5","body":"<path d=\"M34.2,17.2L-34.2,17.2C-39.5,17.2 -43.9,12.9 -43.9,7.6L-43.9,-7.6C-43.9,-12.9 -39.5,-17.2 -34.2,-17.2L34.2,-17.2C39.5,-17.2 43.9,-12.9 43.9,-7.6L43.9,7.6C43.9,12.9 39.5,17.2 34.2,17.2Z\" fill=\"rgb(51,51,51)\" transform=\"translate(44.1,17.5)\"/><path d=\"M-4.3,1.1L-4.3,5.9L-0.6,5.9C0.8,5.9 1.7,5.8 2.1,5.7C2.7,5.6 3.2,5.4 3.6,5C3.9,4.7 4.1,4.2 4.1,3.5C4.1,3 4,2.6 3.7,2.2C3.4,1.8 3,1.6 2.5,1.4C1.9,1.2 0.7,1.1 -1.1,1.1L-4.3,1.1Z M-4.3,-5.9L-4.3,-1.8L-1.7,-1.8C-0.1,-1.8 0.8,-1.8 1.2,-1.9C1.9,-1.9 2.4,-2.1 2.8,-2.5C3.2,-2.8 3.4,-3.3 3.4,-3.9C3.4,-4.4 3.2,-4.9 2.9,-5.2C2.6,-5.5 2.1,-5.8 1.4,-5.8C1,-5.9 -0.1,-5.9 -2,-5.9L-4.3,-5.9Z M-8.2,-8.8L-0.4,-8.8C1.2,-8.8 2.3,-8.8 3.1,-8.6C3.9,-8.5 4.5,-8.3 5.1,-7.9C5.7,-7.6 6.2,-7.1 6.6,-6.4C7,-5.8 7.2,-5.1 7.2,-4.4C7.2,-3.6 7,-2.8 6.5,-2.1C6,-1.4 5.3,-0.9 4.5,-0.6C5.7,-0.2 6.6,0.3 7.2,1C7.9,1.8 8.2,2.7 8.2,3.7C8.2,4.5 8,5.3 7.6,6C7.2,6.8 6.6,7.4 5.9,7.9C5.2,8.3 4.3,8.6 3.2,8.7C2.6,8.8 1,8.8 -1.5,8.8L-8.2,8.8L-8.2,-8.8Z\" fill=\"rgb(255,255,255)\" fill-rule=\"evenodd\" transform=\"translate(22,17.1)\"/><path d=\"M2.5,1.8L-0.2,-4.7L-2.8,1.8L2.5,1.8Z M9.8,8.8L5.5,8.8L3.8,4.8L-4,4.8L-5.6,8.8L-9.8,8.8L-2.2,-8.8L2,-8.8L9.8,8.8Z\" fill=\"rgb(255,255,255)\" fill-rule=\"evenodd\" transform=\"translate(43.5,17.1)\"/><path d=\"M-4.9,-1.4L-1.9,-1.4C0,-1.4 1.2,-1.4 1.6,-1.6C2.1,-1.7 2.5,-2 2.7,-2.3C3,-2.7 3.1,-3.1 3.1,-3.6C3.1,-4.2 3,-4.7 2.6,-5.1C2.3,-5.5 1.8,-5.7 1.1,-5.8C0.8,-5.8 -0.2,-5.8 -1.8,-5.8L-4.9,-5.8L-4.9,-1.4Z M-8.8,8.8L-8.8,-8.8L-0.5,-8.8C1.6,-8.8 3.1,-8.7 4.1,-8.3C5,-8 5.8,-7.5 6.4,-6.7C6.9,-5.8 7.2,-4.9 7.2,-3.9C7.2,-2.6 6.8,-1.5 5.9,-0.6C5.1,0.3 3.8,0.8 2,1C2.9,1.5 3.6,2 4.2,2.5C4.7,3.1 5.5,4 6.4,5.4L8.8,8.8L4.1,8.8L1.2,5C0.2,3.6 -0.5,2.7 -0.9,2.4C-1.2,2 -1.6,1.8 -2.1,1.7C-2.5,1.5 -3.1,1.5 -4,1.5L-4.9,1.5L-4.9,8.8L-8.8,8.8Z\" fill=\"rgb(255,255,255)\" fill-rule=\"evenodd\" transform=\"translate(66.5,17.1)\"/>"},{"viewBox":"-4.8 -3.7 89.7 100.5","body":"<path d=\"M-18.9,22.2C-19.9,21.8 -20.6,20.9 -20.9,19.9C-21.3,18.1 -20.2,16.2 -18.4,15.8C-18.2,15.8 -4.6,12.4 3.6,3.1C11.9,-6.2 14.3,-19.4 14.4,-19.5C14.7,-21.3 16.4,-22.5 18.3,-22.2C20.1,-21.9 21.3,-20.1 21,-18.3C20.9,-17.7 18.2,-3.2 8.6,7.6C-1,18.5 -16.2,22.2 -16.8,22.3C-17.5,22.5 -18.3,22.4 -18.9,22.2Z\" fill=\"rgb(174,85,5)\" transform=\"translate(39.8,39.3)\"/><path d=\"M20.5,-5.5C20.5,-5.5 5.8,-14.8 -5.1,-8.6C-5.1,-8.6 -14.9,-3 -18.8,7.1C-20.5,11.6 -3.2,14.8 3.4,11.6C10.1,8.4 17.1,4.7 20.5,-5.5Z\" fill=\"rgb(0,219,0)\" transform=\"translate(35.2,25.4)\"/><path d=\"M-13.5,8C-13.4,8.5 -12.5,8.7 -11.5,9C-10.7,9.2 -9.7,9.4 -8.6,9.6C-5.2,10.1 -1.6,10.3 1.5,9.4C3.2,8.8 5,7.8 6.7,6.9C10.5,4.7 13.6,2.4 15.9,-1.4C16.5,-2.3 16.7,-3.4 15.4,-3.8C10,-6.1 3.2,-7.6 -2.5,-4.3C-3.6,-3.6 -8.4,-0.4 -12,4.9C-12.5,5.8 -13.5,6.9 -13.5,7.9L-13.5,8Z M18.2,8C13.7,12.2 8.6,15.1 3.5,16.8C0.1,17.7 -4.3,17.8 -8.4,17.2C-17.5,15.9 -25.8,12.2 -19.7,2.7C-15,-5.5 -8.2,-9.9 -6.3,-11.1C4.5,-17.8 20.8,-10.1 23.3,-8.3C25.3,-7 25.8,-4.5 24.8,-2.3C23.1,2.1 21,5.2 18.2,8L18.2,8Z\" fill=\"rgb(0,116,0)\" fill-rule=\"evenodd\" transform=\"translate(34.2,24.6)\"/><path d=\"M8.2,27.6C8,27.6 7.8,27.6 7.5,27.6C5.7,27.2 4.5,25.4 4.9,23.6C5,23.4 7.8,9.7 2.9,-1.7C-2,-13.2 -12.8,-21 -12.9,-21.1C-14.4,-22.2 -14.8,-24.3 -13.7,-25.8C-12.6,-27.3 -10.5,-27.6 -9,-26.6C-8.5,-26.2 3.4,-17.6 9.1,-4.3C14.8,9 11.6,24.3 11.5,25C11.2,26.6 9.8,27.6 8.2,27.6Z\" fill=\"rgb(174,85,5)\" transform=\"translate(56.7,27.9)\"/><path d=\"M18.1,0C18.1,10 10,18.1 0,18.1C-10,18.1 -18.1,10 -18.1,0C-18.1,-10 -10,-18.1 0,-18.1C10,-18.1 18.1,-10 18.1,0Z\" fill=\"rgb(99,36,228)\" transform=\"translate(40.8,55.8)\"/><path d=\"M0,-14.3C-7.9,-14.3 -14.3,-7.9 -14.3,0C-14.3,7.9 -7.9,14.3 0,14.3C7.9,14.3 14.3,7.9 14.3,0C14.3,-7.9 7.9,-14.3 0,-14.3Z M0,21.9C-12.1,21.9 -21.9,12.1 -21.9,0C-21.9,-12.1 -12.1,-21.9 0,-21.9C12.1,-21.9 21.9,-12.1 21.9,0C21.9,12.1 12.1,21.9 0,21.9Z\" fill=\"rgb(23,27,103)\" fill-rule=\"evenodd\" transform=\"translate(40.5,55.5)\"/><path d=\"M18.1,0C18.1,10 10,18.1 0,18.1C-10,18.1 -18.1,10 -18.1,0C-18.1,-10 -10,-18.1 0,-18.1C10,-18.1 18.1,-10 18.1,0Z\" fill=\"rgb(142,72,255)\" transform=\"translate(58.2,70.1)\"/><path d=\"M0,-14.3C-7.9,-14.3 -14.3,-7.9 -14.3,0C-14.3,7.9 -7.9,14.3 0,14.3C7.9,14.3 14.3,7.9 14.3,0C14.3,-7.9 7.9,-14.3 0,-14.3Z M0,21.9C-12.1,21.9 -21.9,12.1 -21.9,0C-21.9,-12.1 -12.1,-21.9 0,-21.9C12.1,-21.9 21.9,-12.1 21.9,0C21.9,12.1 12.1,21.9 0,21.9Z\" fill=\"rgb(45,41,143)\" fill-rule=\"evenodd\" transform=\"translate(58,69.9)\"/><path d=\"M18.1,0C18.1,10 10,18.1 0,18.1C-10,18.1 -18.1,10 -18.1,0C-18.1,-10 -10,-18.1 0,-18.1C10,-18.1 18.1,-10 18.1,0Z\" fill=\"rgb(142,72,255)\" transform=\"translate(22.4,70.1)\"/><path d=\"M0,-14.3C-7.9,-14.3 -14.3,-7.9 -14.3,0C-14.3,7.9 -7.9,14.3 0,14.3C7.9,14.3 14.3,7.9 14.3,0C14.3,-7.9 7.9,-14.3 0,-14.3Z M0,21.9C-12.1,21.9 -21.9,12.1 -21.9,0C-21.9,-12.1 -12.1,-21.9 0,-21.9C12.1,-21.9 21.9,-12.1 21.9,0C21.9,12.1 12.1,21.9 0,21.9Z\" fill=\"rgb(45,41,143)\" fill-rule=\"evenodd\" transform=\"translate(22.2,69.9)\"/><path d=\"M-3.5,4.9C-4,4.9 -4.4,4.8 -4.8,4.6C-6.1,3.9 -6.6,2.3 -5.9,1C-5.8,0.8 -4.9,-0.7 -3.4,-2.1C-1.1,-4.1 1.5,-4.9 4.2,-4.4C5.6,-4.1 6.6,-2.7 6.3,-1.2C6,0.2 4.6,1.2 3.1,0.9C0.7,0.4 -1.1,3.5 -1.2,3.6C-1.7,4.4 -2.6,4.9 -3.5,4.9Z\" fill=\"rgb(255,255,255)\" transform=\"translate(17.4,62.9)\"/><path d=\"M-3.5,4.9C-4,4.9 -4.4,4.8 -4.8,4.6C-6.1,3.9 -6.6,2.3 -5.9,1C-5.8,0.8 -4.9,-0.7 -3.4,-2.1C-1.1,-4.1 1.5,-4.9 4.2,-4.4C5.6,-4.1 6.6,-2.7 6.3,-1.2C6,0.2 4.6,1.2 3.1,0.9C0.7,0.4 -1.1,3.5 -1.2,3.6C-1.7,4.4 -2.6,4.9 -3.5,4.9Z\" fill=\"rgb(255,255,255)\" transform=\"translate(53.7,62.8)\"/>"},{"viewBox":"3.6 -2.7 89.8 86.7","body":"<path d=\"M39.1,-13.4C39.2,-15.1 38.4,-16.7 37.1,-17.7C21.3,-29.6 21.6,-27.6 3.1,-29.7C-4.5,-30.6 -10.6,-28.5 -15.1,-25.7C-20.5,-22.4 -24.6,-17.5 -27,-11.7C-28.8,-7.4 -32,-0.6 -34.9,3C-37.1,5.6 -38.1,9.2 -38.6,12.2C-39.2,16.3 -37.3,20.3 -33.8,22.4C-27.6,26.2 -18.1,28.5 -12.7,29.7C-9.5,30.3 -6.2,30.6 -3,30.5C17.9,29.5 25.2,18 29.3,13.5C33.8,8.5 35.3,-1.2 36.9,-5.3C38,-8.2 39.1,-13.4 39.1,-13.4Z\" fill=\"rgb(255,239,0)\" transform=\"translate(47.2,45.2)\"/><path d=\"M1.3,-26.6C-6.6,-26.4 -14.4,-22.7 -19.2,-16.4C-22.4,-12.4 -24.6,-7.6 -27.2,-3.1C-29.5,1.4 -33.2,6.3 -33.6,11.2C-34.3,18.4 -27.5,22 -21.2,23.9C-17.6,25.1 -13.8,26 -10,26.6C1.2,28.2 13.7,25.6 22.5,18.6C30,12.9 34.1,3.9 36.5,-5C39.6,-14.5 34.3,-19 26.3,-22.8C22.6,-24.6 18.4,-25.3 14.3,-25.8C10.2,-26.3 5.7,-26.8 1.4,-26.6L1.3,-26.6Z M-3.1,33.8C-9.8,33.8 -16.4,32.3 -22.9,30.2C-40.9,24.8 -45.2,14.1 -35,-1.7C-30.5,-9 -27.5,-17.9 -21.2,-24C-17,-28.2 -11.5,-31.2 -5.7,-32.5C0.1,-33.8 6.5,-33.3 12.6,-32.7C16.5,-32.2 20.5,-31.8 24.3,-30.6C30.3,-28.7 39,-23.6 42.6,-18.3C45.2,-14.4 44.2,-9.7 43,-5.4C40.8,2.3 38.1,10.9 33.1,16.9C24.8,27.7 11.4,33.7 -3,33.8L-3.1,33.8Z\" fill=\"rgb(214,139,0)\" fill-rule=\"evenodd\" transform=\"translate(45.4,45.2)\"/><path d=\"M3.6,0C3.6,2 2,3.6 0,3.6C-2,3.6 -3.6,2 -3.6,0C-3.6,-2 -2,-3.6 0,-3.6C2,-3.6 3.6,-2 3.6,0Z\" fill=\"rgb(214,139,0)\" transform=\"translate(39.8,49.2)\"/><path d=\"M3.6,0C3.6,2 2,3.6 0,3.6C-2,3.6 -3.6,2 -3.6,0C-3.6,-2 -2,-3.6 0,-3.6C2,-3.6 3.6,-2 3.6,0Z\" fill=\"rgb(214,139,0)\" transform=\"translate(43.4,61.8)\"/><path d=\"M3.6,0C3.6,2 2,3.6 0,3.6C-2,3.6 -3.6,2 -3.6,0C-3.6,-2 -2,-3.6 0,-3.6C2,-3.6 3.6,-2 3.6,0Z\" fill=\"rgb(214,139,0)\" transform=\"translate(30.8,58.2)\"/><path d=\"M-5.1,4.4C-5.1,4.4 -3.8,-1.3 5.1,-4.4\" fill=\"none\" stroke=\"rgb(255,255,255)\" stroke-width=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\" transform=\"translate(36,33.9)\"/><path d=\"M19,8.5C19,8.5 15.4,-7.1 4.3,-10.3C4.3,-10.3 -5.8,-13 -15,-8.9C-19,-7.1 -9.8,6.3 -3.4,8.5C3.1,10.8 10.1,13 19,8.5Z\" fill=\"rgb(0,219,0)\" transform=\"translate(63.3,16.1)\"/><path d=\"M-12.2,-5.5C-12.5,-5 -12,-4.3 -11.6,-3.6C-11.2,-2.8 -10.6,-2.1 -10.1,-1.3C-8.2,1.3 -6,3.8 -3.3,5.3C-1.8,6 0,6.5 1.7,7C5.6,8.1 9.2,8.5 13.1,7.6C14.1,7.4 14.9,6.8 14.4,5.7C12.3,0.7 8.8,-4.7 3,-6.3C1.8,-6.6 -3.4,-7.6 -9.2,-6.5C-10.2,-6.3 -11.6,-6.2 -12.2,-5.5L-12.2,-5.5Z M8.4,15.3C2.8,15.1 -2.4,13.6 -6.8,11.4C-9.6,9.8 -12.6,7 -14.9,3.9C-20,-2.9 -23,-10.7 -12.8,-12.9C-4.4,-15.3 2.9,-13.7 5,-13.2C16.4,-10.5 22,5.1 22.5,8C23,10.1 21.6,12 19.5,12.8C15.5,14.6 12.1,15.3 8.5,15.3L8.4,15.3Z\" fill=\"rgb(0,116,0)\" fill-rule=\"evenodd\" transform=\"translate(63.3,15.5)\"/>"}];

  function slotSymbolSvg(id) {
    const sym = TG_SLOT_SYMBOLS[id] || TG_SLOT_SYMBOLS[3];
    return `<svg viewBox="${sym.viewBox}" preserveAspectRatio="xMidYMid meet" fill="none">${sym.body}</svg>`;
  }

  let slotsBackAnim = null;
  let slotsFrontAnim = null;

  function initSlotsTgsShell(attempt = 0) {
    const backEl = $('slots-tgs-back');
    const frontEl = $('slots-tgs-front');
    if (!backEl || !frontEl) return;
    if (!window.lottie) {
      if (attempt < 16) setTimeout(() => initSlotsTgsShell(attempt + 1), 350);
      return;
    }
    if (!slotsBackAnim) {
      backEl.innerHTML = '';
      try {
        slotsBackAnim = window.lottie.loadAnimation({
          container: backEl,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          path: '/slot_back.json',
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
        });
        slotsBackAnim.addEventListener('DOMLoaded', () => {
          try { slotsBackAnim.goToAndStop(0, true); } catch {}
        });
      } catch {}
    }
    if (!slotsFrontAnim) {
      frontEl.innerHTML = '';
      try {
        slotsFrontAnim = window.lottie.loadAnimation({
          container: frontEl,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          path: '/slot_front.json',
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
        });
        slotsFrontAnim.addEventListener('DOMLoaded', () => {
          try { slotsFrontAnim.goToAndStop(0, true); } catch {}
        });
      } catch {}
    }
  }

  function playSlotsTgsLever() {
    if (!slotsBackAnim) initSlotsTgsShell();
    try {
      slotsBackAnim?.setSpeed?.(1.1);
      slotsBackAnim?.playSegments?.([0, 22], true);
    } catch {}
  }

  function playSlotsTgsSiren() {
    try {
      slotsBackAnim?.setSpeed?.(1.15);
      slotsBackAnim?.playSegments?.([92, 180], true);
    } catch {}
  }

  function getSlotsMinBet(mode) {
    return mode === '5x5' ? 100 : (mode === '3x3' ? 50 : 10);
  }

  function buildDefaultSlotsGrid(rows, cols) {
    const out = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push((r + c) % 4);
      out.push(row);
    }
    return out;
  }

  function renderSlotsGrid(gridData = null, winningCells = []) {
    const gridEl = $('slots-grid');
    if (!gridEl) return;
    const mode = slotsState.mode;
    const rows = mode === '1x3' ? 1 : (mode === '3x3' ? 3 : 5);
    const cols = mode === '5x5' ? 5 : 3;
    const winSet = new Set(winningCells.map(([r, c]) => `${r}_${c}`));
    const grid = (gridData && gridData.length === rows && gridData[0]?.length === cols)
      ? gridData
      : buildDefaultSlotsGrid(rows, cols);
    slotsState.lastGrid = grid;

    gridEl.className = `slots-grid mode-${mode}`;
    let html = '';

    if (rows === 1) {
      // Authentic Telegram 1x3 curved drum: main symbol centered, neighbor rims peeking top & bottom
      const colH = gridEl.clientHeight > 20 ? gridEl.clientHeight : 140;
      const tileH = colH * 0.68;
      const restY = -(0.52 * colH);
      for (let c = 0; c < cols; c++) {
        const sym = grid[0][c];
        const prevSym = (sym + 3) % 4;
        const nextSym = (sym + 1) % 4;
        const isWin = winSet.has(`0_${c}`);
        html += `
          <div class="slot-reel-col" data-slot-col="${c}">
            <div class="slot-reel-strip" style="transform:translate3d(0,${restY.toFixed(2)}px,0)">
              <div class="slot-sym-tile" style="height:${tileH.toFixed(2)}px;opacity:0.52">${slotSymbolSvg(prevSym)}</div>
              <div class="slot-sym-tile${isWin ? ' is-win' : ''}" data-slot-r="0" data-slot-c="${c}" style="height:${tileH.toFixed(2)}px">${slotSymbolSvg(sym)}</div>
              <div class="slot-sym-tile" style="height:${tileH.toFixed(2)}px;opacity:0.52">${slotSymbolSvg(nextSym)}</div>
            </div>
          </div>
        `;
      }
    } else {
      // Unified vertical drum per column (3x3 = 3 solid reels, 5x5 = 5 solid reels)
      const tilePct = (100 / rows).toFixed(4);
      for (let c = 0; c < cols; c++) {
        let tiles = '';
        for (let r = 0; r < rows; r++) {
          const isWin = winSet.has(`${r}_${c}`);
          tiles += `<div class="slot-sym-tile${isWin ? ' is-win' : ''}" data-slot-r="${r}" data-slot-c="${c}" style="height:${tilePct}%">${slotSymbolSvg(grid[r][c])}</div>`;
        }
        html += `
          <div class="slot-reel-col" data-slot-col="${c}">
            <div class="slot-reel-strip" style="height:100%">${tiles}</div>
          </div>
        `;
      }
    }

    gridEl.innerHTML = html;
  }

  function setSlotsMode(mode) {
    if (slotsState.spinning) return;
    const prevMode = slotsState.mode;
    const prevMin = getSlotsMinBet(prevMode);
    slotsState.mode = mode;
    document.querySelectorAll('[data-slots-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.slotsMode === mode);
    });
    const minBet = getSlotsMinBet(mode);
    const lbl = $('slots-min-label');
    const inp = $('slots-bet-input');
    if (lbl) lbl.textContent = `Ставка (от ${minBet})`;
    if (inp) {
      inp.min = String(minBet);
      const curVal = Math.floor(Number(inp.value));
      const bal = Math.floor(state.user?.balance || 0);
      // Always adjust bet cleanly when switching modes so returning from 5x5 (100) to 1x3 (10) never gets stuck at 100
      if (!Number.isFinite(curVal) || curVal < minBet || curVal === prevMin || (bal >= minBet && curVal > bal)) {
        inp.value = String(minBet);
      }
    }
    const bar = $('slots-result-bar');
    if (bar) { bar.className = 'slots-result-bar'; bar.textContent = `Режим ${mode} • от ${minBet} зв.`; }
    slotsState.lastGrid = null;
    renderSlotsGrid();
    haptic('light');
  }

  async function handleSlotsSpin() {
    if (slotsState.spinning) return;
    const mode = slotsState.mode;
    const minBet = getSlotsMinBet(mode);
    const inp = $('slots-bet-input');
    const bet = Math.floor(Number(inp?.value));
    if (!Number.isFinite(bet) || bet < minBet) {
      showToast(`Минимальная ставка для ${mode} — ${minBet} звёзд`, 'error');
      if (inp) inp.value = String(minBet);
      return;
    }
    if (state.user && bet > Math.floor(state.user.balance || 0)) {
      showToast('Недостаточно звёзд на балансе', 'error');
      return;
    }

    slotsState.spinning = true;
    state.slotsSpinning = true;
    const btn = $('slots-spin-btn');
    const bar = $('slots-result-bar');
    if (btn) btn.disabled = true;
    playSlotsTgsLever();
    if (bar) { bar.className = 'slots-result-bar'; bar.textContent = 'Вращение барабанов...'; }
    haptic('medium');
    SoundFX.click();

    try {
      const res = await api('/api/games/slots/spin', { method: 'POST', body: { bet, mode } });
      if (state.user) updateDisplayedBalance(Math.max(0, (state.user.balance || 0) - bet));

      // Unified per-column spinning drums (top-to-bottom like real Telegram slot machine)
      const gridEl = $('slots-grid');
      const rows = res.rows;
      const cols = res.cols;
      const colH = (gridEl && gridEl.clientHeight > 20) ? gridEl.clientHeight : 140;
      const prevGrid = (slotsState.lastGrid && slotsState.lastGrid.length === rows && slotsState.lastGrid[0]?.length === cols)
        ? slotsState.lastGrid
        : buildDefaultSlotsGrid(rows, cols);

      gridEl.className = `slots-grid mode-${mode}`;
      gridEl.innerHTML = '';

      for (let c = 0; c < cols; c++) {
        const colEl = document.createElement('div');
        colEl.className = 'slot-reel-col';
        colEl.dataset.slotCol = String(c);

        const strip = document.createElement('div');
        strip.className = 'slot-reel-strip';

        const spinSteps = 11 + c * 3;
        let startY = 0;
        let endY = 0;
        let tilesHtml = '';

        if (rows === 1) {
          const tileH = colH * 0.68;
          const restOffset = 0.52 * colH;
          const finalSym = res.grid[0][c];
          const oldSym = prevGrid[0][c];
          const seq = [
            (finalSym + 3) % 4,
            finalSym,
            (finalSym + 1) % 4
          ];
          for (let k = 0; k < spinSteps; k++) {
            seq.push((finalSym + k * 3 + c + 2) % 4);
          }
          const oldStartIdx = seq.length;
          seq.push((oldSym + 3) % 4, oldSym, (oldSym + 1) % 4);

          tilesHtml = seq.map((s) => `<div class="slot-sym-tile" style="height:${tileH.toFixed(2)}px">${slotSymbolSvg(s)}</div>`).join('');
          startY = -(oldStartIdx * tileH + restOffset);
          endY = -restOffset;
        } else {
          const tileH = colH / rows;
          const seq = [];
          // Final visible rows sit at the top of the strip (index 0..rows-1)
          for (let r = 0; r < rows; r++) seq.push(res.grid[r][c]);
          // Spinning filler symbols in the middle
          for (let k = 0; k < spinSteps; k++) seq.push((k * 3 + c + 1) % 4);
          // Previous visible rows sit at the bottom of the strip so start is seamless
          const oldStartIdx = seq.length;
          for (let r = 0; r < rows; r++) seq.push(prevGrid[r][c]);

          tilesHtml = seq.map((s) => `<div class="slot-sym-tile" style="height:${tileH.toFixed(2)}px">${slotSymbolSvg(s)}</div>`).join('');
          startY = -(oldStartIdx * tileH);
          endY = 0;
        }

        strip.innerHTML = tilesHtml;
        strip.style.transform = `translate3d(0, ${startY.toFixed(2)}px, 0)`;
        colEl.appendChild(strip);
        gridEl.appendChild(colEl);

        const durMs = 760 + c * 200;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            strip.style.transition = `transform ${durMs}ms cubic-bezier(0.15, 0.92, 0.22, 1.015)`;
            strip.style.transform = `translate3d(0, ${endY.toFixed(2)}px, 0)`;
          });
        });
      }

      // Column stop sounds synchronized with each solid drum stopping
      for (let c = 0; c < cols; c++) {
        setTimeout(() => SoundFX.reelStop(), 740 + c * 200);
      }

      const totalAnimMs = 820 + (cols - 1) * 200;
      await new Promise((r) => setTimeout(r, totalAnimMs));

      // Lock clean final grid & highlight winning symbols
      renderSlotsGrid(res.grid, res.winningCells || []);

      await flushAndApplyUser(res.feedToken, res.user);

      if (res.winAmount > 0) {
        playSlotsTgsSiren();
        if (bar) {
          bar.className = 'slots-result-bar is-win';
          bar.innerHTML = `Выигрыш x${res.multiplier} • +${formatStars(res.winAmount)} ${starIconHtml(13)}`;
        }
        res.multiplier >= 10 ? SoundFX.bigWin() : SoundFX.coin();
        haptic('success');
      } else {
        if (bar) {
          bar.className = 'slots-result-bar';
          bar.textContent = 'Мимо — попробуйте ещё раз';
        }
        SoundFX.lose();
      }
    } catch (e) {
      if (bar) {
        bar.className = 'slots-result-bar';
        bar.textContent = `Режим ${mode} • от ${minBet} зв.`;
      }
      showToast(e.message, 'error');
    } finally {
      slotsState.spinning = false;
      state.slotsSpinning = false;
      if (btn) btn.disabled = false;
    }
  }

  function initNewGamesUI() {
    // 1. Death Auction
    $('auction-bid-btn')?.addEventListener('click', handleAuctionBid);

    // 2. Singularity
    document.querySelectorAll('[data-sing-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        singRuntime.betMode = btn.dataset.singMode === 'gift' ? 'gift' : 'stars';
        $('sing-mode-stars')?.classList.toggle('active', singRuntime.betMode === 'stars');
        $('sing-mode-gift')?.classList.toggle('active', singRuntime.betMode === 'gift');
        $('sing-stars-controls')?.classList.toggle('hidden', singRuntime.betMode !== 'stars');
        $('sing-gift-controls')?.classList.toggle('hidden', singRuntime.betMode !== 'gift');
        renderSingGiftPreview();
        renderSingularityState();
        haptic('light');
      });
    });
    $('sing-gift-pick-btn')?.addEventListener('click', openSingGiftPicker);
    $('sing-join-btn')?.addEventListener('click', handleSingularityJoin);

    // 3. Crack the Safe
    document.querySelectorAll('.safe-dial-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (safeState.cracking) return;
        const idx = Number(btn.dataset.dial);
        const dir = Number(btn.dataset.dir);
        safeState.digits[idx] = (safeState.digits[idx] + dir + 10) % 10;
        renderSafeDials();
        SoundFX.tick();
        haptic('light');
      });
    });
    $('safe-random-btn')?.addEventListener('click', () => {
      if (safeState.cracking) return;
      safeState.digits = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ];
      renderSafeDials();
      SoundFX.tick();
      haptic('light');
    });
    $('safe-crack-btn')?.addEventListener('click', handleSafeCrack);

    // 4. Classic Slots
    document.querySelectorAll('[data-slots-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setSlotsMode(btn.dataset.slotsMode));
    });
    $('slots-spin-btn')?.addEventListener('click', handleSlotsSpin);
    $('slots-lever')?.addEventListener('click', handleSlotsSpin);
    renderSlotsGrid();
    initSlotsTgsShell();
    initHubAuctionMiddleFrame();
  }

  function initHubAuctionMiddleFrame(attempt = 0) {
    const box = $('hub-auction-lottie');
    const img = $('hub-auction-img');
    if (!box) return;
    if (!window.lottie) {
      if (attempt < 14) setTimeout(() => initHubAuctionMiddleFrame(attempt + 1), 350);
      return;
    }
    try {
      const anim = window.lottie.loadAnimation({
        container: box,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: 'https://cdn.changes.tg/gifts/models/Loot%20Bag/lottie/Money%20Bag.json',
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
      });
      anim.addEventListener('DOMLoaded', () => {
        try {
          const midFrame = Math.round((anim.totalFrames || 180) * 0.5);
          anim.goToAndStop(midFrame, true);
          box.classList.remove('hidden');
          if (img) img.classList.add('hidden');
        } catch {}
      });
      anim.addEventListener('data_failed', () => {
        try { anim.destroy(); } catch {}
      });
    } catch {}
  }

  try {
    boot();
  } catch (err) {
    if (typeof window.__ZG_SHOW_BOOT_ERR__ === 'function') {
      window.__ZG_SHOW_BOOT_ERR__(err && err.message ? err.message : String(err));
    }
  }
})();
