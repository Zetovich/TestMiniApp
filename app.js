(() => {
  'use strict';

  // ======================== STATE ========================
  const tg = window.Telegram?.WebApp || null;
  const initData = tg?.initData || '';

  const GAME_TITLES = {
    crash: 'Краш 🚀',
    cases: 'Кейсы 🎁',
    craft: 'Крафт ⚒️',
    wheel: 'Колесо Удачи 🎡',
    mines: 'Мины 💎',
    plinko: 'Плинко 🎯',
    pvp: 'PvP Колесо ⚔️',
    upgrader: 'Апгрейдер ⚡',
    redblack: 'Красное / Чёрное 🔴'
  };

  const state = {
    user: null,
    socket: null,
    cases: [],
    activeCase: null,
    activeGame: null,
    wheelSegments: [],
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

    // Crash (Rocket + Explosion, NO dice!)
    crash: {
      phase: 'waiting',
      multiplier: 1.0,
      startedAt: 0,
      waitEndsAt: 0,
      bets: [],
      history: []
    },
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

    // Plinko
    plinkoDropping: false,
    plinkoRecentBets: [],

    // PvP
    pvp: { phase: 'waiting', endsAt: 0, players: [], totalPot: 0, angle: 0, spinning: false },
    pvpImages: {},

    // Live Feeds (contextual per game)
    liveFeeds: { cases: [], craft: [], crash: [], wheel: [], upgrader: [] },

    // Provably Fair
    pfCrash: { roundId: 1, serverSeedHash: '', history: [] },
    pfActiveTab: 'user',

    // Market Pricing (MRKT TON + 0.3 TON fee)
    marketPricing: { starsPerTon: 100, commissionTon: 0.3, tonUsd: 1.5 },

    // Upgrader (stars OR gifts by price!)
    upg: {
      mode: 'stars',
      multiplier: 2,
      chance: 50,
      spinning: false,
      pointerAngle: 0,
      sourceGift: null,
      targetItem: null
    },
    upgPickerMode: 'source',
    upgXFilter: 'all',
    upgPickerLimit: 24,

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

  // ======================== WEB AUDIO API SOUND ENGINE (ZERO HEAVY MP3s + MUTE TOGGLE) ========================
  const SoundFX = (() => {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem('zg_sound_muted') === '1'; } catch {}

    function getCtx() {
      if (muted) return null;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function tone(freq, dur, type = 'sine', vol = 0.08, delay = 0, endFreq = null) {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }

    return {
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        try { localStorage.setItem('zg_sound_muted', muted ? '1' : '0'); } catch {}
        if (!muted) this.click();
        return muted;
      },
      click() { tone(680, 0.045, 'triangle', 0.05, 0, 420); },
      tick() { tone(920, 0.028, 'triangle', 0.045, 0, 520); },
      coin() {
        tone(587.3, 0.11, 'sine', 0.08, 0);
        tone(880, 0.14, 'sine', 0.08, 0.07);
        tone(1174.7, 0.22, 'triangle', 0.07, 0.14);
      },
      bigWin() {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) => {
          tone(f, 0.26, 'triangle', 0.085, idx * 0.065);
        });
      },
      lose() {
        tone(320, 0.18, 'sawtooth', 0.04, 0, 180);
        tone(210, 0.22, 'sine', 0.05, 0.12, 130);
      },
      glass() {
        tone(1480, 0.14, 'sine', 0.055, 0, 1760);
        tone(2217, 0.18, 'sine', 0.035, 0.03);
      },
      rocket() {
        tone(110, 0.45, 'sawtooth', 0.035, 0, 340);
        tone(220, 0.42, 'triangle', 0.04, 0.05, 520);
      },
      boom() {
        tone(140, 0.36, 'sawtooth', 0.08, 0, 38);
        tone(85, 0.42, 'sine', 0.09, 0.02, 28);
      }
    };
  })();

  const CRAFT_CHANCES = { 0: 0, 1: 8, 2: 24, 3: 52, 4: 85 };

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

  async function initStarLottie() {
    try {
      const r = await fetch('star.json');
      if (r.ok) state.starAnimData = await r.json();
    } catch {}
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
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'gold' ? starIconHtml(16) : 'ℹ️';
    el.innerHTML = `<span>${icon}</span><span>${esc(message).replace(/⭐/g, starIconHtml(14))}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      el.style.transition = 'all 0.2s ease';
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  async function api(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const finalUrl = method === 'GET'
      ? `${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : url;

    const res = await fetch(finalUrl, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Telegram-Init-Data': initData
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  }

  // Publish deferred server live-feed / plinko recent item right when client animation ends!
  function flushFeedToken(token) {
    if (!token) return;
    api('/api/feed/flush', { method: 'POST', body: { token } }).catch(() => {});
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
    return true;
  }

  function showAuthDenied(msg = 'Ошибка авторизации') {
    $('app').classList.add('hidden');
    $('auth-gate').classList.remove('hidden');
    $('auth-gate-text').textContent = msg;
  }

  function openModal(id) {
    $(id)?.classList.remove('hidden');
  }

  function closeModal(id) {
    $(id)?.classList.add('hidden');
    if (id === 'modal-gift' && state.giftLottie) {
      state.giftLottie.destroy();
      state.giftLottie = null;
      $('tg-gift-lottie').classList.add('hidden');
      $('tg-gift-img').classList.remove('hidden');
    }
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
    if (!g.upgraded && !g.crafted) {
      return 'linear-gradient(160deg, #243343 0%, #17212b 100%)';
    }
    const c = g.backdrop?.center || '#2b4a6f';
    const e = g.backdrop?.edge || '#17212b';
    return `radial-gradient(circle at 50% 40%, ${c} 0%, ${e} 100%)`;
  }

  function isBasicNonUpgradable(g) {
    return g.upgradable === false || Boolean(g.basicSlug);
  }

  // ======================== BOOT & STRICT AUTH ========================
  async function boot() {
    if (!initData) {
      showAuthDenied('Ошибка авторизации');
      return;
    }

    try {
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#17212b');
        tg.setBackgroundColor?.('#17212b');
      }

      const me = await api('/api/me');
      applyServerUser(me.user, { force: true, render: false });
      state.cases = me.cases || [];
      state.wheelCost = Number(me.wheelCost) || 10;
      state.wheelSegments = me.wheelSegments || [];
      state.plinkoMultipliers = me.plinkoMultipliers || state.plinkoMultipliers;
      state.plinkoRecentBets = me.plinkoRecentBets || [];
      state.craftedCatalog = me.catalogSummary?.crafted || [];
      if (me.liveFeeds) state.liveFeeds = { ...state.liveFeeds, ...me.liveFeeds };
      if (me.marketPricing) state.marketPricing = me.marketPricing;
      if (me.pfCrash) state.pfCrash = me.pfCrash;

      $('auth-gate').classList.add('hidden');
      $('app').classList.remove('hidden');

      initUI();
      initLotties();
      initStarLottie();
      preloadWheelImages();
      const wheelBtn = $('wheel-spin-btn');
      if (wheelBtn) {
        wheelBtn.innerHTML = `Крутить за ${formatStars(state.wheelCost)} ${starIconHtml(16)}`;
      }
      renderUser();
      renderAllLiveFeeds();
      updatePfStrips();
      renderCasesList();
      renderCraftedShowcase();
      renderCraftSlots();
      initWheelCanvas();
      initMinesGrid();
      initPlinkoBoard();
      renderPlinkoBets();
      initUpgraderCanvas();
      initRedBlackTape();
      connectSocket();
      loadMinesState();

      if (state.user.isAdmin) {
        $('nav-admin-btn').classList.remove('hidden');
        loadCatalogForAdmin();
        loadAdminStats();
        loadAdminRecentUsers();
      }
    } catch {
      showAuthDenied('Ошибка авторизации');
    }
  }

  // ======================== SOCKET.IO ========================
  function connectSocket() {
    const socket = io({ auth: { initData } });
    state.socket = socket;

    socket.on('connect_error', () => showAuthDenied('Ошибка авторизации'));
    socket.on('force_logout', () => {
      socket.disconnect();
      showAuthDenied('Ошибка авторизации');
    });

    socket.on('user_update', (u) => {
      // Do not clobber mid-animation local balance deduction during spin/roll/craft
      const busyAnim = state.wheelSpinning || state.caseOpening || state.plinkoDropping || state.upg.spinning || state.upgrading || state.crafting;
      if (busyAnim) return;
      applyServerUser(u);
    });

    // CRASH
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
        updatePfStrips();
      }
      if (payload.phase === 'running') {
        state.crash.startedAt = Date.now() - Math.log(Math.max(1, payload.multiplier)) / 0.145 * 1000;
        setCrashVisual('running');
        if (prevPhase !== 'running' && isCrashVisible()) SoundFX.rocket();
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
      if (state.crash.phase !== 'running') {
        state.crash.phase = 'running';
        state.crash.startedAt = Date.now() - (payload.elapsedMs || 0);
        setCrashVisual('running');
        if (isCrashVisible()) SoundFX.rocket();
      }
      state.crash.multiplier = payload.multiplier;
      $('crash-multiplier').textContent = `${payload.multiplier.toFixed(2)}x`;
      updateCrashButton();
    });

    socket.on('crash:bets', (bets) => {
      state.crash.bets = bets || [];
      renderCrashBets();
      updateCrashButton();
    });

    socket.on('crash:boom', (payload) => {
      state.crash.phase = 'crashed';
      state.crash.multiplier = payload.crashPoint;
      state.crash.bets = payload.bets || [];
      state.crash.history = payload.history || [];
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
      setCrashVisual('crashed');
      renderCrashHistory();
      renderCrashBets();
      updateCrashButton();
      // Vibrate & explosion sound ONLY when Crash game is currently open and visible!
      if (isCrashVisible()) {
        haptic('error');
        SoundFX.boom();
      }
    });

    // LIVE CONTEXTUAL DROP FEEDS
    socket.on('feed:update', ({ channel, item }) => {
      if (!channel || !item || !state.liveFeeds[channel]) return;
      state.liveFeeds[channel].unshift(item);
      if (state.liveFeeds[channel].length > 25) state.liveFeeds[channel].pop();
      renderLiveFeed(channel);
      if (channel === 'cases' && state.activeCase) renderSingleCaseFeed();
    });

    // RED/BLACK
    socket.on('rb:state', (payload) => {
      state.rb.phase = payload.phase;
      state.rb.endsAt = Date.now() + (payload.timeLeftMs || 0);
      state.rb.bets = payload.bets || [];
      state.rb.history = payload.history || [];
      renderRbHistory();
      renderRbBets();
    });

    socket.on('rb:result', (payload) => {
      state.rb.phase = 'spinning';
      state.rb.history = payload.history || [];
      animateRedBlackSpin(payload.winnerColor, payload.payouts || []);
    });

    // PVP WHEEL
    socket.on('pvp:state', (payload) => {
      state.pvp.phase = payload.phase;
      state.pvp.endsAt = Date.now() + (payload.timeLeftMs || 0);
      state.pvp.players = payload.players || [];
      state.pvp.totalPot = payload.totalPot || 0;
      $('pvp-pot-badge').innerHTML = `Банк: ${formatStars(state.pvp.totalPot)} ${starIconHtml(14)}`;
      if (payload.lastWinner) {
        const b = $('pvp-last-winner');
        b.textContent = `🏆 Победитель: ${payload.lastWinner.firstName} (+${formatStars(payload.lastWinner.winAmount)} ⭐ • ${payload.lastWinner.chance}%)`;
        b.classList.remove('hidden');
      }
      drawPvpWheel();
      renderPvpPlayers();
    });

    socket.on('pvp:spin', (payload) => {
      state.pvp.phase = 'spinning';
      state.pvp.players = payload.players || [];
      state.pvp.totalPot = payload.totalPot || 0;
      animatePvpSpin(payload.stopAngle, payload.winner);
    });

    // PLINKO RECENT BETS
    socket.on('plinko:history', (list) => {
      state.plinkoRecentBets = Array.isArray(list) ? list : [];
      renderPlinkoBets();
    });

    socket.on('plinko:bet', (entry) => {
      if (!entry) return;
      state.plinkoRecentBets.unshift(entry);
      if (state.plinkoRecentBets.length > 30) state.plinkoRecentBets.pop();
      renderPlinkoBets();
    });
  }

  // ======================== LOTTIE INITIALIZATION (ROCKET ONLY IN CRASH CENTER!) ========================
  function initLotties() {
    if (!window.lottie) return;

    // Looped Rocket ONLY in Crash center over graph during flight!
    state.rocketLottie = lottie.loadAnimation({
      container: $('crash-rocket'),
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: 'rocket.json'
    });

    // One-shot Explosion in Crash center on crash!
    state.explosionLottie = lottie.loadAnimation({
      container: $('crash-explosion'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'explosion.json'
    });
  }

  // ======================== GAMES HUB & NAVIGATION ========================
  function openGame(gameId) {
    state.activeGame = gameId;
    switchTab('games', false);
    $('games-hub').classList.add('hidden');
    $('game-shell').classList.remove('hidden');
    $('active-game-title').textContent = GAME_TITLES[gameId] || 'Игра';

    document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    $(`game-${gameId}`)?.classList.add('active');

    if (gameId === 'cases') {
      closeCaseDetail();
      renderCasesList();
    } else if (gameId === 'craft') {
      if (!state.crafting) resetCraftHeroToIdle();
      renderCraftSlots();
    } else if (gameId === 'wheel') {
      drawWheel();
    } else if (gameId === 'pvp') {
      drawPvpWheel();
    } else if (gameId === 'upgrader') {
      updateUpgraderInfo();
      drawUpgraderWheel();
    } else if (gameId === 'plinko') {
      drawPlinkoStatic();
      renderPlinkoBets();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function backToGamesHub() {
    state.activeGame = null;
    $('game-shell').classList.add('hidden');
    $('games-hub').classList.remove('hidden');
    document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function switchTab(tab, resetHub = true) {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'games' && resetHub) {
      backToGamesHub();
    }
    if (tab === 'top') loadLeaderboard();
    if (tab === 'admin' && state.user?.isAdmin) {
      loadAdminStats();
      loadAdminRecentUsers();
    }
    if (tab === 'profile') {
      renderUser();
      const busyAnim = state.wheelSpinning || state.caseOpening || state.plinkoDropping || state.upg.spinning || state.upgrading || state.crafting;
      if (!busyAnim) refreshUserSilently();
    }
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

    $('btn-back-to-hub').addEventListener('click', () => {
      haptic('light');
      backToGamesHub();
    });

    // Cases back button, multi-spin controls, turbo, skip & open button
    $('btn-back-to-cases').addEventListener('click', () => {
      if (state.caseOpening) return;
      haptic('light');
      closeCaseDetail();
    });
    $('case-open-btn').addEventListener('click', () => {
      if (state.activeCase) openCase(state.activeCase);
    });
    $('case-skip-btn').addEventListener('click', () => {
      if (typeof state.caseSkipFn === 'function') {
        SoundFX.click();
        state.caseSkipFn();
      }
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

    // Sound Toggle button (Mute / Unmute)
    const soundBtn = $('sound-toggle-btn');
    if (soundBtn) {
      const syncSoundIcon = () => {
        const m = SoundFX.isMuted();
        soundBtn.textContent = m ? '🔇' : '🔊';
        soundBtn.classList.toggle('muted', m);
      };
      syncSoundIcon();
      soundBtn.addEventListener('click', () => {
        SoundFX.toggle();
        syncSoundIcon();
        showToast(SoundFX.isMuted() ? 'Звуки выключены 🔇' : 'Звуки включены 🔊', 'info');
      });
    }

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

    document.querySelectorAll('.topup-preset').forEach((b) => {
      b.addEventListener('click', () => { $('topup-custom-input').value = b.dataset.stars; });
    });
    $('topup-pay-btn').addEventListener('click', handleTopupPay);

    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.invFilter = btn.dataset.filter;
        renderInventory();
      });
    });

    $('catalog-search').addEventListener('input', (e) => renderCatalogGrid(e.target.value));
    $('crash-action-btn').addEventListener('click', handleCrashAction);
    $('wheel-spin-btn').addEventListener('click', handleWheelSpin);
    $('mines-start-btn').addEventListener('click', handleMinesStart);
    $('mines-cashout-btn').addEventListener('click', handleMinesCashout);
    $('plinko-drop-btn').addEventListener('click', handlePlinkoDrop);
    $('pvp-join-btn').addEventListener('click', handlePvpJoin);

    // Upgrader Stars vs Gifts switcher
    document.querySelectorAll('[data-upg-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.upg.spinning) return;
        setUpgraderMode(btn.dataset.upgMode);
      });
    });
    $('upg-pick-source').addEventListener('click', () => openUpgraderPicker('source'));
    $('upg-pick-target').addEventListener('click', () => openUpgraderPicker('target'));
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

    document.querySelectorAll('.mult-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mult-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.upg.multiplier = Number(btn.dataset.mult);
        updateUpgraderInfo();
        drawUpgraderWheel();
      });
    });
    $('upg-bet-input').addEventListener('input', updateUpgraderInfo);
    $('upg-play-btn').addEventListener('click', handleUpgraderPlay);

    $('rb-bet-red').addEventListener('click', () => handleRbBet('red'));
    $('rb-bet-black').addEventListener('click', () => handleRbBet('black'));

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
    $('admin-give-crafted').addEventListener('click', handleAdminGiveCrafted);
    $('admin-ban-toggle').addEventListener('click', handleAdminBanToggle);

    requestAnimationFrame(masterFrameLoop);
  }

  // ======================== RENDER USER, PROFILE & INVENTORY ========================
  function renderUser() {
    const u = state.user;
    if (!u) return;

    $('header-balance').textContent = formatStars(u.balance);
    $('profile-balance').textContent = formatStars(u.balance);
    $('profile-name').textContent = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Telegram User';
    $('profile-username').textContent = u.username ? `@${u.username}` : 'Без username';
    $('profile-id').textContent = `ID: ${u.telegramId}`;
    $('inv-count').textContent = u.inventory?.length || 0;

    const initial = (u.firstName || 'U').charAt(0).toUpperCase();
    if (u.photoUrl) {
      $('profile-avatar').src = u.photoUrl;
      $('profile-avatar').classList.remove('hidden');
      $('profile-avatar-fallback').classList.add('hidden');

      // Bottom nav Profile button shows user's actual avatar!
      $('nav-profile-avatar').src = u.photoUrl;
      $('nav-profile-avatar').classList.remove('hidden');
      $('nav-profile-avatar-fallback').classList.add('hidden');
    } else {
      $('profile-avatar').classList.add('hidden');
      $('profile-avatar-fallback').classList.remove('hidden');
      $('profile-avatar-fallback').textContent = initial;

      $('nav-profile-avatar').classList.add('hidden');
      $('nav-profile-avatar-fallback').classList.remove('hidden');
      $('nav-profile-avatar-fallback').textContent = initial;
    }

    const invIds = new Set((u.inventory || []).map((g) => g.uid));
    state.craftSlots = state.craftSlots.map((g) => (g && invIds.has(g.uid) ? u.inventory.find((x) => x.uid === g.uid) : null));

    renderInventory();
    if (!state.crafting && !state.craftResultShown) {
      renderCraftSlots();
    }
    updateUpgraderInfo();
  }

  // Renders NFT symbol pattern directly behind artwork on profile & picker cards!
  function buildCardSymbolPattern(g) {
    if (!(g.upgraded || g.crafted) || !g.symbol?.image) return '';
    const pts = [
      [10, 12, -16], [76, 10, 14],
      [6, 46, 12],   [80, 44, -14],
      [16, 76, -10], [72, 74, 16]
    ];
    const imgs = pts
      .map(([x, y, rot]) => `<img class="gift-card-sym" src="${esc(g.symbol.image)}" style="left:${x}%;top:${y}%;transform:rotate(${rot}deg)" alt="" loading="lazy" onerror="this.remove()" />`)
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
      $('confirm-desc').textContent = `«${label}» будет продан за ${formatStars(g.value)} ⭐. Это действие нельзя отменить.`;
      okBtn.className = 'tg-btn tg-btn-gold';
      okBtn.innerHTML = `Продать (${formatStars(g.value)} ${starIconHtml(14)})`;
    } else {
      $('confirm-title').textContent = 'Вывести подарок в TG?';
      $('confirm-desc').textContent = `«${label}» будет списан из инвентаря и отправлен на вывод в ваш профиль Telegram.`;
      okBtn.className = 'tg-btn tg-btn-primary';
      okBtn.textContent = 'Вывести в TG';
    }

    state.confirmCallback = onConfirm;
    openModal('modal-confirm');
  }

  function renderInventory() {
    const grid = $('inventory-grid');
    const items = (state.user?.inventory || []).filter((g) => {
      if (state.invFilter === 'upgraded') return g.upgraded && !g.crafted;
      if (state.invFilter === 'regular') return !g.upgraded;
      if (state.invFilter === 'crafted') return g.crafted;
      return true;
    });

    if (!items.length) {
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подарков пока нет. Откройте кейс или загляните в магазин!</div>`;
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
        <div class="gift-card-val">${starIconHtml(13)} ${formatStars(g.value)}</div>
        <div class="gift-card-actions-mini">
          <button type="button" class="mini-btn sell" data-act="sell">Продать</button>
          <button type="button" class="mini-btn withdraw" data-act="withdraw">Вывести</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const actBtn = e.target.closest('[data-act]');
        if (actBtn) {
          e.stopPropagation();
          if (actBtn.dataset.act === 'sell') {
            openGiftConfirmModal(g, 'sell', () => sellGift(g.uid));
          } else if (actBtn.dataset.act === 'withdraw') {
            openGiftConfirmModal(g, 'withdraw', () => withdrawGift(g.uid));
          }
          return;
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
      tierRibbon.textContent = `⚒️ ${g.craftTier} Craft`;
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

    $('tg-gift-art-wrap').onclick = () => {
      if (!g.lottie || !window.lottie) return;
      haptic('light');
      if (state.giftLottie) {
        state.giftLottie.goToAndPlay(0, true);
        return;
      }
      $('tg-gift-img').classList.add('hidden');
      $('tg-gift-lottie').classList.remove('hidden');
      state.giftLottie = lottie.loadAnimation({
        container: $('tg-gift-lottie'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: g.lottie
      });
    };

    $('tg-gift-title').textContent = giftDisplayName(g);
    $('tg-gift-subtitle').textContent = g.crafted
      ? `Скрафченный коллекционный #${g.mintNumber}`
      : g.upgraded
        ? `Коллекционный подарок #${g.mintNumber}`
        : isBasicNonUpgradable(g)
          ? 'Обычный подарок Telegram'
          : 'Подарок Telegram • можно улучшить за 25 ⭐';

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

    if (!g.upgraded && !isBasicNonUpgradable(g)) {
      const upgBtn = document.createElement('button');
      upgBtn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      upgBtn.innerHTML = `✨ Улучшить за 25 ${starIconHtml(15)}`;
      upgBtn.onclick = () => {
        closeModal('modal-gift');
        openUpgradeModal(g);
      };
      actions.appendChild(upgBtn);
    } else if (g.upgraded && !g.crafted) {
      const craftBtn = document.createElement('button');
      craftBtn.className = 'tg-btn tg-btn-craft tg-btn-lg';
      craftBtn.innerHTML = '⚒️ Отправить в Крафт';
      craftBtn.onclick = () => {
        closeModal('modal-gift');
        state.craftSlots = [g, null, null, null];
        openGame('craft');
        showToast(`«${g.collectionName}» добавлен в слот крафта`, 'info');
      };
      actions.appendChild(craftBtn);
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

    const wdBtn = document.createElement('button');
    wdBtn.className = 'tg-btn tg-btn-secondary';
    wdBtn.innerHTML = 'Вывести в TG';
    wdBtn.onclick = () => {
      openGiftConfirmModal(g, 'withdraw', async () => {
        await withdrawGift(g.uid);
        closeModal('modal-gift');
      });
    };

    rowDiv.appendChild(sellBtn);
    rowDiv.appendChild(wdBtn);
    actions.appendChild(rowDiv);

    openModal('modal-gift');
  }

  async function refreshUserSilently() {
    try {
      const me = await api('/api/me');
      if (me?.user) {
        const busyAnim = state.wheelSpinning || state.caseOpening || state.plinkoDropping || state.upg.spinning || state.upgrading || state.crafting;
        if (!busyAnim) applyServerUser(me.user);
      }
    } catch {}
  }

  async function sellGift(uid) {
    try {
      const res = await api('/api/gifts/sell', { method: 'POST', body: { uid } });
      state.user = res.user;
      renderUser();
      haptic('success');
      showToast(`Продано за +${formatStars(res.soldFor)} ⭐`, 'gold');
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
      showToast(res.message || 'Заявка на вывод создана', 'success');
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
    $('upgrade-confirm-btn').innerHTML = `✨ Улучшить за 25 ${starIconHtml(15)}`;
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
      $('upgrade-confirm-btn').innerHTML = `✨ Улучшить за 25 ${starIconHtml(15)}`;
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
      const exitRightX = Math.round(targetX + winW * 0.65 + itemW);

      strip.style.transform = `translate3d(${startX}px, 0, 0)`;
      void strip.offsetWidth;

      let useA = false;
      const timers = [];
      let rafId = null;
      let finished = false;
      let winnerPinned = false;
      let lastModelIdx = -1;
      let lastModelTickAt = 0;

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

      // Pin winner dead-center & smoothly slide all right-side neighbors off the right edge!
      function pinWinnerAndClearRight(fast = false) {
        if (winnerPinned) return;
        winnerPinned = true;
        strip.style.transition = 'none';
        strip.style.transform = `translate3d(${targetX}px, 0, 0)`;
        void strip.offsetWidth;

        pinned.classList.remove('hidden');
        strip.firstElementChild?.classList.add('winner-picked');
        const dur = fast ? '0.24s' : '0.58s';
        requestAnimationFrame(() => {
          strip.style.transition = `transform ${dur} cubic-bezier(0.2, 0.7, 0.35, 1), opacity ${dur} ease`;
          strip.style.transform = `translate3d(${exitRightX}px, 0, 0)`;
          strip.style.opacity = '0';
        });
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

        scrollSlotDown('upg-slot-model', `${esc(finalGift.model.name)} <span class="rarity-pill">${finalGift.model.rarity || 1}%</span>`);
        scrollSlotDown('upg-slot-backdrop', `<span class="trait-dot" style="background:${esc(finalGift.backdrop.center)}"></span>${esc(finalGift.backdrop.name)} <span class="rarity-pill">${finalGift.backdrop.rarity || 1.5}%</span>`);
        if (finalGift.symbol?.name) {
          scrollSlotDown('upg-slot-symbol', `${esc(finalGift.symbol.name)} <span class="rarity-pill">${finalGift.symbol.rarity || 0.5}%</span>`);
        }
        scrollSlotDown('upg-slot-mint', `<b style="color:var(--gold)">#${finalGift.mintNumber}</b>`);

        $('upg-mint-caption').textContent = `#${finalGift.mintNumber}`;
        $('upg-mint-caption').classList.remove('hidden');
        $('upgrade-collection-caption').textContent = finalGift.model.name;

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
        if (centerIdx > 0 && centerIdx !== lastModelIdx && (now - lastModelTickAt >= 145 || centerIdx <= 3)) {
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

  // ======================== TELEGRAM CRAFTING + 3D TRANSPARENT GLASS CUBE ANIMATION ========================
  function renderCraftedShowcase(modelsList = null, collectionTitle = null) {
    const box = $('crafted-showcase');
    const list = modelsList || state.craftedCatalog;
    const headTitle = box.closest('.tg-card')?.querySelector('.card-title');
    if (headTitle) {
      headTitle.textContent = collectionTitle
        ? `5 крафт-моделей «${collectionTitle}»`
        : '5 крафт-моделей на каждую коллекцию';
    }
    box.innerHTML = '';
    for (const c of list) {
      const card = document.createElement('div');
      card.className = 'crafted-mini-card';
      card.style.background = `radial-gradient(circle at 50% 35%, ${c.center} 0%, ${c.edge} 100%)`;
      const chanceHtml = c.rarity ? `<div style="font-size:10px;color:rgba(255,255,255,0.8);margin-top:2px">Шанс: ${c.rarity}%</div>` : '';
      card.innerHTML = `
        <img src="${esc(c.image)}" alt="${esc(c.ruName)}" loading="lazy" />
        <div class="crafted-mini-name">${esc(c.ruName)}</div>
        ${chanceHtml}
        <span class="crafted-mini-tier tier-${esc(c.tier)}">${esc(c.tier)}</span>
      `;
      box.appendChild(card);
    }
  }

  async function loadCraftModelsForCollection(colName) {
    if (!colName) {
      state.activeCraftCollection = null;
      renderCraftedShowcase(state.craftedCatalog, null);
      return;
    }
    if (state.activeCraftCollection === colName && state.craftModelsCache[colName]) {
      renderCraftedShowcase(state.craftModelsCache[colName], colName);
      return;
    }
    state.activeCraftCollection = colName;
    if (state.craftModelsCache[colName]) {
      renderCraftedShowcase(state.craftModelsCache[colName], colName);
      return;
    }
    try {
      const res = await api(`/api/craft/models/${encodeURIComponent(colName)}`);
      state.craftModelsCache[colName] = res.models || [];
      if (state.activeCraftCollection === colName) {
        renderCraftedShowcase(state.craftModelsCache[colName], colName);
      }
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
    const colName = count ? filled[0].collectionName : null;

    loadCraftModelsForCollection(colName);

    $('craft-collection-pill').textContent = colName ? colName : 'Выберите NFT';
    $('craft-chance-value').textContent = `${chance}%`;

    const submitBtn = $('craft-submit-btn');
    submitBtn.disabled = count === 0 || state.crafting;
    submitBtn.textContent = `⚒️ Изготовить • ${chance}%`;

    const pctAdds = ['+8%', '+16%', '+28%', '+33%'];
    document.querySelectorAll('.craft-slot').forEach((slotBtn, idx) => {
      const g = state.craftSlots[idx];
      if (g) {
        slotBtn.classList.add('filled');
        slotBtn.style.background = giftBgStyle(g);
        slotBtn.innerHTML = `
          <span class="slot-remove">✕</span>
          <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
          <span class="slot-label">#${g.mintNumber}</span>
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
      const bgCounts = {};
      let totalBg = 0;
      filled.forEach((g) => {
        if (g.backdrop?.name) {
          bgCounts[g.backdrop.name] = (bgCounts[g.backdrop.name] || 0) + 1;
          totalBg += 1;
        }
      });
      const pills = [];
      if (totalBg > 0) {
        const maxSame = Math.max(...Object.values(bgCounts));
        const poolShare = maxSame < 3 ? 70 : 100;
        const sorted = Object.entries(bgCounts).sort((a, b) => b[1] - a[1]);
        for (const [name, cnt] of sorted) {
          const pct = Math.round((cnt / totalBg) * poolShare);
          pills.push(`<span class="attr-pill">🎨 ${esc(name)}: ${pct}%</span>`);
        }
        if (maxSame < 3) {
          pills.push(`<span class="attr-pill">🎲 Рандом: 30%</span>`);
        }
      }
      if (pills.length) {
        attrBox.innerHTML = pills.join('');
        attrBox.classList.remove('hidden');
      } else {
        attrBox.classList.add('hidden');
      }
    } else {
      attrBox.classList.add('hidden');
    }
  }

  function openCraftPicker() {
    const filled = state.craftSlots.filter(Boolean);
    const lockedCol = filled.length ? filled[0].collectionName : null;
    const usedUids = new Set(filled.map((g) => g.uid));

    const eligible = (state.user?.inventory || []).filter((g) => {
      if (!g.upgraded || g.crafted) return false;
      if (usedUids.has(g.uid)) return false;
      if (lockedCol && g.collectionName !== lockedCol) return false;
      return true;
    });

    $('craft-picker-hint').textContent = lockedCol
      ? `Выберите улучшенный подарок из коллекции «${lockedCol}»`
      : 'В крафт принимаются только улучшенные подарки (улучшите их в Профиле за 25 ⭐)';

    const grid = $('craft-picker-grid');
    if (!eligible.length) {
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 8px">Нет подходящих улучшенных подарков. Улучшите коллекционные подарки в Профиле!</div>`;
    } else {
      grid.innerHTML = '';
      for (const g of eligible) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.style.background = giftBgStyle(g);
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="gift-card-ribbon">#${g.mintNumber}</span>
          <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
          <div class="gift-card-name">${esc(g.model?.name || g.collectionName)}</div>
          <div class="gift-card-val">${esc(g.collectionName)}</div>
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
      applyServerUser(res.user, { force: true });
      state.crafting = false;
      flushFeedToken(res.feedToken);

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
      titleEl.textContent = '⚒️ Изготовление';
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
      state.rocketLottie?.goToAndStop(0, true);
      state.explosionLottie?.stop();
    } else if (phase === 'running') {
      pill.textContent = 'В полёте 🚀';
      multEl.classList.add('flying');
      rocketEl.classList.remove('hidden');
      rocketEl.classList.add('flying');
      boomEl.classList.add('hidden');
      state.rocketLottie?.play();
    } else if (phase === 'crashed') {
      pill.textContent = 'КРАШ 💥';
      multEl.textContent = `${state.crash.multiplier.toFixed(2)}x`;
      multEl.classList.add('crashed');
      stage.classList.add('crashed');
      rocketEl.classList.add('hidden');
      state.rocketLottie?.stop();
      boomEl.classList.remove('hidden');
      state.explosionLottie?.goToAndPlay(0, true);
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

  function renderCrashBets() {
    const list = $('crash-players-list');
    const bets = state.crash.bets;
    $('crash-players-count').textContent = bets.length;
    if (!bets.length) {
      list.innerHTML = '<div class="empty-inline">Ожидание ставок игроков...</div>';
      return;
    }
    list.innerHTML = bets.map((b) => {
      const ava = b.photoUrl
        ? `<img class="player-ava" src="${esc(b.photoUrl)}" alt="" />`
        : `<div class="player-ava">${esc((b.firstName || 'P')[0].toUpperCase())}</div>`;
      let statusHtml = `<span class="player-status live">В игре...</span>`;
      if (b.cashedOut) statusHtml = `<span class="player-status win">x${b.cashoutAt.toFixed(2)} • +${formatStars(b.payout)} ${starIconHtml(13)}</span>`;
      else if (state.crash.phase === 'crashed') statusHtml = `<span class="player-status lose">Сгорел</span>`;
      return `
        <div class="player-row">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(b.firstName)}</div>
              <div class="player-bet">Ставка: ${formatStars(b.bet)} ⭐</div>
            </div>
          </div>
          ${statusHtml}
        </div>
      `;
    }).join('');
  }

  function getMyCrashBet() {
    return state.crash.bets.find((b) => b.telegramId === state.user?.telegramId) || null;
  }

  function updateCrashButton() {
    const btn = $('crash-action-btn');
    const myBet = getMyCrashBet();
    btn.className = 'tg-btn tg-btn-lg';

    if (state.crash.phase === 'waiting') {
      if (myBet) {
        btn.classList.add('tg-btn-secondary');
        btn.disabled = true;
        btn.innerHTML = `Ставка принята (${formatStars(myBet.bet)} ${starIconHtml(14)})`;
      } else {
        btn.classList.add('tg-btn-primary');
        btn.disabled = false;
        btn.textContent = 'Сделать ставку';
      }
    } else if (state.crash.phase === 'running') {
      if (myBet && !myBet.cashedOut) {
        const liveWin = Math.floor(myBet.bet * state.crash.multiplier);
        btn.classList.add('tg-btn-success');
        btn.disabled = false;
        btn.innerHTML = `Забрать +${formatStars(liveWin)} ${starIconHtml(14)}`;
      } else if (myBet && myBet.cashedOut) {
        btn.classList.add('tg-btn-secondary');
        btn.disabled = true;
        btn.innerHTML = `Забрано: +${formatStars(myBet.payout)} ${starIconHtml(14)} (x${myBet.cashoutAt.toFixed(2)})`;
      } else {
        btn.classList.add('tg-btn-secondary');
        btn.disabled = true;
        btn.textContent = 'Раунд идёт...';
      }
    } else {
      btn.classList.add('tg-btn-danger');
      btn.disabled = true;
      btn.textContent = `Краш на ${state.crash.multiplier.toFixed(2)}x`;
    }
  }

  function handleCrashAction() {
    if (!state.socket) return;
    const myBet = getMyCrashBet();

    if (state.crash.phase === 'running' && myBet && !myBet.cashedOut) {
      state.socket.emit('crash:cashout', {}, (res) => {
        if (res?.error) showToast(res.error, 'error');
        else if (res?.ok) {
          haptic('success');
          showToast(`Забрали +${formatStars(res.payout)} ⭐ на x${res.cashoutAt.toFixed(2)}!`, 'success');
        }
      });
      return;
    }

    if (state.crash.phase === 'waiting' && !myBet) {
      const bet = Math.floor(Number($('crash-bet-input').value));
      const autoCashout = Number($('crash-auto-input').value) || 0;
      state.socket.emit('crash:bet', { bet, autoCashout }, (res) => {
        if (res?.error) showToast(res.error, 'error');
        else {
          haptic('medium');
          showToast(`Ставка ${formatStars(bet)} ⭐ принята!`, 'info');
        }
      });
    }
  }

  // ======================== GAME 2: CASES (8 CASES WITH CUSTOM ART + STARS DROPS!) ========================
  function renderCaseTileHtml(item) {
    if (item.isStars || item.type === 'stars') {
      const amt = item.amount || item.price || 0;
      return `
        <div class="case-item-tile is-stars-tile" style="background:radial-gradient(circle at 50% 40%, ${esc(item.center || '#69470d')}, ${esc(item.edge || '#261705')})">
          <div class="case-star-icon-wrap">${starIconHtml(46)}</div>
          <span class="case-star-val">+${formatStars(amt)}</span>
        </div>
      `;
    }
    return `
      <div class="case-item-tile" style="background:radial-gradient(circle at 50% 40%, ${esc(item.center)}, ${esc(item.edge)})">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" />
        <span>${esc(item.name)}</span>
      </div>
    `;
  }

  function renderCasesList() {
    const grid = $('cases-grid');
    grid.innerHTML = '';
    for (const c of state.cases) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'case-mini-card';
      btn.style.borderColor = `${c.accent}55`;
      btn.innerHTML = `
        <div class="case-cover-wrap" style="background:radial-gradient(circle at 50% 50%, ${esc(c.accent)}28, rgba(14,22,33,0.45))">
          <img src="${esc(c.cover)}" alt="${esc(c.name)}" loading="lazy" />
        </div>
        <div class="case-mini-name">${esc(c.name)}</div>
        <div class="case-mini-price">${starIconHtml(14)} ${formatStars(c.price)}</div>
      `;
      btn.onclick = () => openCaseDetail(c);
      grid.appendChild(btn);
    }
  }

  function updateCaseOpenButtonLabel() {
    const c = state.activeCase;
    if (!c) return;
    const total = c.price * (state.caseCount || 1);
    const multTag = state.caseCount > 1 ? `x${state.caseCount} ` : '';
    $('case-open-btn').innerHTML = `Открыть ${multTag}за ${formatStars(total)} ${starIconHtml(16)}`;
  }

  function renderCaseIdleStrips(c) {
    const stack = $('case-strips-stack');
    if (!stack || !c) return;
    const cnt = state.caseCount || 1;
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

  function openCaseDetail(c) {
    state.activeCase = c;
    $('cases-list-view').classList.add('hidden');
    $('case-detail-view').classList.remove('hidden');
    $('case-detail-title').textContent = c.name;
    $('case-detail-price').innerHTML = `${formatStars(c.price)} ${starIconHtml(14)}`;
    updateCaseOpenButtonLabel();
    $('case-open-btn').disabled = false;
    $('case-open-btn').style.background = c.accent;
    $('case-skip-btn').classList.add('hidden');

    renderCaseIdleStrips(c);
    renderSingleCaseFeed();
    updatePfStrips();

    // Render drops grid below roulette with real chances & prices!
    const dropsGrid = $('case-drops-grid');
    dropsGrid.innerHTML = c.items.map((it) => {
      if (it.type === 'stars') {
        return `
          <div class="case-drop-card is-stars-drop" style="background:radial-gradient(circle at 50% 35%, ${esc(it.center)}, ${esc(it.edge)})">
            <span class="case-drop-chance">${it.chance}%</span>
            <div class="case-drop-star-wrap">${starIconHtml(42)}</div>
            <div class="case-drop-name">+${formatStars(it.amount)}</div>
            <div class="case-drop-price">${starIconHtml(12)} Звёзды</div>
          </div>
        `;
      }
      return `
        <div class="case-drop-card" style="background:radial-gradient(circle at 50% 35%, ${esc(it.center)}, ${esc(it.edge)})">
          <span class="case-drop-chance">${it.chance}%</span>
          <img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy" />
          <div class="case-drop-name">${esc(it.name)}</div>
          <div class="case-drop-price">${starIconHtml(12)} ${formatStars(it.price)}</div>
        </div>
      `;
    }).join('');
  }

  function closeCaseDetail() {
    state.activeCase = null;
    $('case-detail-view').classList.add('hidden');
    $('cases-list-view').classList.remove('hidden');
    renderLiveFeed('cases');
  }

  function openMultiDropSheet(caseDef, rolls) {
    const modal = $('modal-multi-drop');
    const titleEl = $('multi-drop-title');
    const subEl = $('multi-drop-sub');
    const summaryEl = $('multi-drop-summary');
    const gridEl = $('multi-drop-grid');
    if (!modal || !gridEl) return;

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

  async function openCase(caseDef) {
    if (state.caseOpening) return;
    const count = state.caseCount || 1;
    state.caseOpening = true;
    $('case-open-btn').disabled = true;

    let tickTimer = null;
    let finishTimer = null;

    try {
      const res = await api('/api/games/case/open', {
        method: 'POST',
        body: { caseId: caseDef.id, count }
      });
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
      SoundFX.tick();

      // Soft roulette tick sound cadence during deceleration
      let ticks = 0;
      const maxTicks = state.caseTurbo ? 6 : 18;
      tickTimer = setInterval(() => {
        ticks++;
        if (ticks >= maxTicks) { clearInterval(tickTimer); tickTimer = null; return; }
        SoundFX.tick();
      }, state.caseTurbo ? 140 : 210);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          for (const t of targets) {
            t.stripEl.style.transition = `transform ${durSec}s cubic-bezier(0.1, 0.86, 0.14, 1)`;
            t.stripEl.style.transform = `translateX(${t.offset}px)`;
          }
        });
      });

      let finished = false;
      const finishSpin = (skipped = false) => {
        if (finished) return;
        finished = true;
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
        state.caseSkipFn = null;
        $('case-skip-btn').classList.add('hidden');

        for (const t of targets) {
          if (skipped) {
            t.stripEl.style.transition = 'transform 0.16s ease-out';
            t.stripEl.style.transform = `translateX(${t.offset}px)`;
          }
          t.winTile?.classList.add('winner-glow');
        }

        // Flush live feed ONLY after spin finishes or is skipped!
        flushFeedToken(res.feedToken);
        applyServerUser(res.user, { force: true });
        updatePfStrips();
        state.caseOpening = false;
        $('case-open-btn').disabled = false;

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
      $('case-skip-btn').classList.remove('hidden');
      finishTimer = setTimeout(() => finishSpin(false), durMs);
    } catch (e) {
      if (tickTimer) clearInterval(tickTimer);
      if (finishTimer) clearTimeout(finishTimer);
      state.caseSkipFn = null;
      $('case-skip-btn').classList.add('hidden');
      state.caseOpening = false;
      $('case-open-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 3: LUCKY WHEEL (10 STARS, IMAGES ONLY + CHILL FLAME JACKPOT) ========================
  function preloadWheelImages() {
    for (const seg of state.wheelSegments) {
      if (!seg.image || state.wheelImages[seg.id]) continue;
      const img = new Image();
      img.crossOrigin = 'anonymous';
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
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
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

      if (seg.type === 'collection') {
        const g = ctx.createRadialGradient(0, 0, 20, 0, 0, r);
        g.addColorStop(0, '#c2410c');
        g.addColorStop(1, '#f97316');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = seg.color;
      }
      ctx.fill();
      ctx.strokeStyle = '#17212b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + arc / 2);

      if (seg.type === 'stars') {
        // Stars sector: ONLY digits + crisp Telegram star icon (no words!)
        const dist = r - 44;
        ctx.translate(dist, 0);
        ctx.rotate(Math.PI / 2);
        drawTelegramStarOnCanvas(ctx, 0, -14, 13);
        ctx.fillStyle = '#ffe58f';
        ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(seg.amount), 0, 11);
      } else {
        // Gift sector (Basic gift or Chill Flame): ONLY the real gift image, NO text & NO emoji!
        const img = state.wheelImages[seg.id];
        const dist = r - 44;
        const imgSz = seg.type === 'collection' ? 46 : 42;
        ctx.translate(dist, 0);
        ctx.rotate(Math.PI / 2);
        if (seg.type === 'collection') {
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 237, 150, 0.24)';
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
      const res = await api('/api/games/wheel', { method: 'POST' });
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

      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        state.wheelAngle = startAngle + totalDelta * eased;
        drawWheel();
        if (p < 1) requestAnimationFrame(step);
        else {
          state.wheelSpinning = false;
          flushFeedToken(res.feedToken);
          applyServerUser(res.user, { force: true });
          $('wheel-spin-btn').disabled = false;
          haptic('success');
          if (res.wonGift) {
            SoundFX.bigWin();
            showToast(`Выпал подарок: ${res.wonGift.collectionName} (${formatStars(res.wonGift.value)})!`, 'gold');
            openTelegramGiftModal(res.wonGift);
          } else {
            SoundFX.coin();
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
  function initMinesGrid() {
    const grid = $('mines-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mine-cell';
      btn.dataset.cell = String(i);
      btn.addEventListener('click', () => handleMinesClick(i));
      grid.appendChild(btn);
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
    $('mines-mult-badge').textContent = `x${Number(state.mines.multiplier || 1).toFixed(2)}`;
    const revealedSet = new Set(state.mines.revealed || []);
    const minesSet = new Set(allMines || []);

    document.querySelectorAll('.mine-cell').forEach((btn, i) => {
      btn.className = 'mine-cell';
      btn.textContent = '';
      if (revealedSet.has(i)) {
        btn.classList.add('safe');
        btn.textContent = '💎';
        btn.disabled = true;
      } else if (minesSet.has(i)) {
        btn.classList.add('bomb');
        if (i !== boomCell && boomCell !== -1) btn.classList.add('dim');
        btn.textContent = '💣';
        btn.disabled = true;
      } else {
        btn.disabled = !state.mines.active;
      }
    });

    if (state.mines.active) {
      $('mines-start-btn').classList.add('hidden');
      $('mines-cashout-btn').classList.remove('hidden');
      const payout = Math.floor(state.mines.bet * state.mines.multiplier);
      $('mines-cashout-btn').disabled = state.mines.revealed.length === 0;
      $('mines-cashout-btn').textContent = state.mines.revealed.length
        ? `Забрать +${formatStars(payout)} ⭐ (x${state.mines.multiplier.toFixed(2)})`
        : 'Откройте клетку';
    } else {
      $('mines-start-btn').classList.remove('hidden');
      $('mines-cashout-btn').classList.add('hidden');
    }
  }

  async function handleMinesStart() {
    try {
      const bet = Math.floor(Number($('mines-bet-input').value));
      const minesCount = Number($('mines-count-select').value) || 3;
      const res = await api('/api/games/mines/start', { method: 'POST', body: { bet, minesCount } });
      state.user = res.user;
      renderUser();
      state.mines = { active: true, bet: res.bet, minesCount: res.minesCount, revealed: [], multiplier: 1.0 };
      syncMinesUI();
      haptic('medium');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleMinesClick(cell) {
    if (!state.mines.active) return;
    try {
      const res = await api('/api/games/mines/reveal', { method: 'POST', body: { cell } });
      if (res.hitMine) {
        state.mines.active = false;
        state.mines.revealed = res.revealed || [];
        syncMinesUI(res.mines, cell);
        state.user = res.user;
        renderUser();
        haptic('error');
        showToast('Бум! Вы попали на мину 💣', 'error');
      } else if (res.autoCashout) {
        state.mines.active = false;
        state.mines.revealed = res.revealed;
        state.mines.multiplier = res.multiplier;
        syncMinesUI(res.mines);
        state.user = res.user;
        renderUser();
        haptic('success');
        showToast(`Все алмазы открыты! +${formatStars(res.winAmount)} ⭐`, 'gold');
      } else {
        state.mines.revealed = res.revealed;
        state.mines.multiplier = res.multiplier;
        syncMinesUI();
        haptic('light');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleMinesCashout() {
    try {
      const res = await api('/api/games/mines/cashout', { method: 'POST' });
      state.mines.active = false;
      syncMinesUI(res.mines);
      state.user = res.user;
      renderUser();
      haptic('success');
      showToast(`Мины: забрали +${formatStars(res.winAmount)} ⭐ (x${res.multiplier})!`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 5: PLINKO ========================
  function initPlinkoBoard() {
    $('plinko-buckets').innerHTML = state.plinkoMultipliers.map((m, i) => {
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
      const ava = b.photoUrl
        ? `<img class="player-ava" src="${esc(b.photoUrl)}" alt="" />`
        : `<div class="player-ava">${esc((b.firstName || 'P')[0].toUpperCase())}</div>`;
      const isWin = Number(b.multiplier) >= 1;
      const cls = isWin ? 'win' : 'lose';
      return `
        <div class="player-row">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(b.firstName)}</div>
              <div class="player-bet">Ставка: ${formatStars(b.bet)} ⭐</div>
            </div>
          </div>
          <span class="player-status ${cls}">x${b.multiplier} • ${formatStars(b.payout)} ⭐</span>
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
      const res = await api('/api/games/plinko/drop', { method: 'POST', body: { bet } });
      // Instant balance deduction BEFORE ball falls!
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

      function animateBall() {
        const a = waypoints[seg];
        const b = waypoints[seg + 1];
        if (!b) {
          drawPlinkoStatic();
          const bEl = $(`plinko-b-${res.bucketIndex}`);
          bEl?.classList.add('hit');
          setTimeout(() => bEl?.classList.remove('hit'), 700);
          state.plinkoDropping = false;
          flushFeedToken(res.feedToken);
          applyServerUser(res.user, { force: true });
          $('plinko-drop-btn').disabled = false;
          haptic(res.multiplier >= 1 ? 'success' : 'light');
          showToast(`Плинко x${res.multiplier}: ${formatStars(res.payout)} звёзд`, res.multiplier >= 1 ? 'gold' : 'info');
          return;
        }

        segT += 0.14;
        const t = Math.min(1, segT);
        const bx = a.x + (b.x - a.x) * t;
        const by = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 9;
        drawPlinkoStatic({ x: bx, y: by });

        if (segT >= 1) {
          seg++;
          segT = 0;
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
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
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

          // Crisp white + player-color ring around avatar
          ctx.beginPath();
          ctx.arc(0, 0, avaR, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = avaR >= 14 ? 2.4 : 1.5;
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
      const avaInner = p.photoUrl
        ? `<img src="${esc(p.photoUrl)}" alt="" />`
        : esc((p.firstName || 'P')[0].toUpperCase());
      return `
        <div class="pvp-player-row" style="--pvp-color:${esc(col)}">
          <div class="pvp-player-left">
            <div class="pvp-avatar-ring">${avaInner}</div>
            <div class="pvp-player-info">
              <div class="pvp-player-name">${esc(p.firstName)}</div>
              <div class="pvp-player-chance">Шанс ${pct}%</div>
            </div>
          </div>
          <div class="pvp-player-bet">${formatStars(p.bet)} ${starIconHtml(14)}</div>
        </div>
      `;
    }).join('');
  }

  function animatePvpSpin(stopAngleDeg, winner) {
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
    const dur = 4500;
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      state.pvp.angle = startAngle + total * eased;
      drawPvpWheel();
      if (p < 1) requestAnimationFrame(step);
      else {
        state.pvp.spinning = false;
        haptic('success');
        if (winner) {
          const b = $('pvp-last-winner');
          b.textContent = `🏆 Победитель: ${winner.firstName} (+${formatStars(winner.winAmount)} ⭐ • ${winner.chance}%)`;
          b.classList.remove('hidden');
          showToast(`PvP Колесо: победил ${winner.firstName} (+${formatStars(winner.winAmount)} ⭐)!`, 'gold');
        }
      }
    }
    requestAnimationFrame(step);
  }

  function handlePvpJoin() {
    if (!state.socket) return;
    const bet = Math.floor(Number($('pvp-bet-input').value));
    state.socket.emit('pvp:join', { bet }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else {
        haptic('medium');
        showToast(`Вы вошли в PvP банк на ${formatStars(bet)} ⭐!`, 'info');
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
    updateUpgraderInfo();
    drawUpgraderWheel();
  }

  function setUpgraderMode(mode) {
    state.upg.mode = mode === 'gifts' ? 'gifts' : 'stars';
    $('upg-mode-stars').classList.toggle('active', state.upg.mode === 'stars');
    $('upg-mode-gifts').classList.toggle('active', state.upg.mode === 'gifts');
    $('upg-stars-controls').classList.toggle('hidden', state.upg.mode !== 'stars');
    $('upg-gifts-controls').classList.toggle('hidden', state.upg.mode !== 'gifts');
    updateUpgraderInfo();
    drawUpgraderWheel();
  }

  function renderUpgraderGiftSlots() {
    // Sync source gift with current inventory
    if (state.upg.sourceGift) {
      const stillOwned = (state.user?.inventory || []).find((g) => g.uid === state.upg.sourceGift.uid);
      if (!stillOwned) {
        state.upg.sourceGift = null;
        state.upg.targetItem = null;
      } else {
        state.upg.sourceGift = stillOwned;
      }
    }

    const srcBtn = $('upg-pick-source');
    const srcBody = $('upg-source-body');
    const tgtBtn = $('upg-pick-target');
    const tgtBody = $('upg-target-body');

    if (state.upg.sourceGift) {
      const g = state.upg.sourceGift;
      srcBtn.classList.add('filled');
      srcBtn.style.background = giftBgStyle(g);
      srcBody.innerHTML = `
        <img src="${esc(g.image)}" alt="" />
        <span class="upg-slot-hint" style="color:#fff;font-weight:700">${esc(giftDisplayName(g))}</span>
        <span class="upg-slot-price">⭐ ${formatStars(g.value)}</span>
      `;
    } else {
      srcBtn.classList.remove('filled');
      srcBtn.style.background = '';
      srcBody.innerHTML = `<span class="upg-slot-plus">+</span><span class="upg-slot-hint">Выбрать из профиля</span>`;
    }

    if (state.upg.targetItem) {
      const t = state.upg.targetItem;
      tgtBtn.classList.add('filled');
      tgtBtn.style.background = 'linear-gradient(160deg, #25364a 0%, #17212b 100%)';
      tgtBody.innerHTML = `
        <img src="${esc(t.image)}" alt="" />
        <span class="upg-slot-hint" style="color:#fff;font-weight:700">${esc(t.name)}</span>
        <span class="upg-slot-price">⭐ ${formatStars(t.price)}</span>
      `;
    } else {
      tgtBtn.classList.remove('filled');
      tgtBtn.style.background = '';
      tgtBody.innerHTML = `<span class="upg-slot-plus">🎁</span><span class="upg-slot-hint">Выбрать приз</span>`;
    }
  }

  function updateUpgraderInfo() {
    renderUpgraderGiftSlots();

    if (state.upg.mode === 'stars') {
      const bet = Math.max(5, Math.floor(Number($('upg-bet-input').value) || 25));
      const mult = state.upg.multiplier;
      const chance = Number((90 / mult).toFixed(2));
      state.upg.chance = chance;
      $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
      $('upg-mult-display').textContent = `x${mult}`;
      $('upg-payout-display').innerHTML = `${formatStars(Math.floor(bet * mult))} ${starIconHtml(14)}`;
      $('upg-play-btn').disabled = state.upg.spinning;
      $('upg-play-btn').textContent = 'Запустить апгрейд';
    } else {
      const src = state.upg.sourceGift;
      const tgt = state.upg.targetItem;
      const hintEl = $('upg-gift-ratio-hint');

      if (src && tgt && tgt.price > src.value) {
        const rawChance = (src.value / tgt.price) * 90;
        const chance = Number(rawChance.toFixed(2));
        const mult = Number((tgt.price / src.value).toFixed(2));
        const valid = chance >= 0.5 && chance <= 78;
        state.upg.chance = valid ? chance : 0;

        $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
        $('upg-mult-display').textContent = `x${mult}`;
        $('upg-payout-display').innerHTML = `${formatStars(tgt.price)} ${starIconHtml(14)}`;
        hintEl.innerHTML = valid
          ? `${formatStars(src.value)} ${starIconHtml(12)} → ${formatStars(tgt.price)} ${starIconHtml(12)} • шанс ${chance}%`
          : 'Выберите другой подарок (шанс должен быть от 0.5% до 78%)';
        $('upg-play-btn').disabled = !valid || state.upg.spinning;
        $('upg-play-btn').textContent = valid ? `Апгрейд подарка (${chance}%)` : 'Выберите подарки';
      } else {
        state.upg.chance = 0;
        $('upg-chance-badge').textContent = 'Шанс: —';
        $('upg-mult-display').textContent = '🎁';
        $('upg-payout-display').textContent = 'Выберите пару';
        hintEl.textContent = 'Можно ставить любые подарки (обычные, NFT и крафт) → на обычный подарок дороже';
        $('upg-play-btn').disabled = true;
        $('upg-play-btn').textContent = 'Выберите подарки';
      }
    }
  }

  async function openUpgraderPicker(mode) {
    if (state.upg.spinning) return;
    if (mode === 'target' && !state.upg.sourceGift) {
      showToast('Сначала выберите свой подарок из инвентаря', 'info');
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
    $('upg-picker-scroll').scrollTop = 0;

    if (mode === 'source') {
      $('upg-picker-title').textContent = 'Выберите ваш подарок';
      $('upg-picker-sub').textContent = 'Подходят любые: обычные, улучшенные NFT и скрафченные';
    } else {
      const sv = state.upg.sourceGift.value;
      $('upg-picker-title').textContent = 'Выберите желаемый подарок';
      $('upg-picker-sub').textContent = `Обычные подарки дороже ${formatStars(sv)} (от 0.5% до 78%)`;
      $('upg-picker-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Загрузка подарков...</div>';
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

    if (state.upgPickerMode === 'source') {
      const items = state.user?.inventory || [];
      if (!items.length) {
        grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Ваш инвентарь пуст. Купите подарок в магазине или откройте кейс!</div>';
        return;
      }
      for (const g of items) {
        const card = document.createElement('div');
        card.className = 'upg-pick-card';
        card.style.background = giftBgStyle(g);
        const tag = g.crafted ? `Крафт #${g.mintNumber}` : g.upgraded ? `#${g.mintNumber}` : 'Обычный';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="upg-pick-badge">${esc(tag)}</span>
          <img class="upg-pick-img" src="${esc(g.image)}" alt="" loading="lazy" />
          <div class="upg-pick-name">${esc(giftDisplayName(g))}</div>
          <div class="upg-pick-price">⭐ ${formatStars(g.value)}</div>
        `;
        card.onclick = () => {
          state.upg.sourceGift = g;
          if (state.upg.targetItem) {
            const ch = (g.value / state.upg.targetItem.price) * 100;
            if (ch < 0.5 || ch > 85) state.upg.targetItem = null;
          }
          closeModal('modal-upg-picker');
          updateUpgraderInfo();
          drawUpgraderWheel();
          haptic('light');
        };
        grid.appendChild(card);
      }
      return;
    }

    // Target mode: STRICTLY un-upgraded gifts more expensive than sourceGift (0.5% <= chance <= 85%),
    // filtered by All / x2 / x3 / x5 / x10 / x30, sorted ascending by price, lazy-rendered in chunks of 24!
    const srcVal = Math.max(15, Math.round(state.upg.sourceGift?.value || 15));
    const q = query.trim().toLowerCase();
    const xf = state.upgXFilter || 'all';

    const pool = [
      ...state.basicGifts.map((b) => ({ type: 'basic', key: b.slug, name: b.name, price: b.price, image: b.image })),
      ...state.catalog.map((c) => ({ type: 'collection', key: c.name, name: c.name, price: Math.round(c.price), image: c.image }))
    ].filter((it) => {
      if (it.price <= srcVal) return false;
      const ch = (srcVal / it.price) * 100;
      if (ch < 0.5 || ch > 85) return false;
      const ratio = it.price / srcVal;
      if (!matchesUpgXFilter(ratio, xf)) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => a.price - b.price);

    if (!pool.length) {
      const msg = xf === 'all'
        ? 'Нет доступных подарков дороже вашего'
        : `Нет подарков в категории x${xf} для цены ${formatStars(srcVal)} ⭐`;
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">${msg}</div>`;
      return;
    }

    const slice = pool.slice(0, state.upgPickerLimit);
    const frag = document.createDocumentFragment();
    for (const item of slice) {
      const ch = Number(((srcVal / item.price) * 100).toFixed(1));
      const mult = Number((item.price / srcVal).toFixed(1));
      const card = document.createElement('div');
      card.className = 'upg-pick-card';
      card.innerHTML = `
        <span class="upg-pick-mult">x${mult}</span>
        <span class="upg-pick-badge">${ch}%</span>
        <img class="upg-pick-img" src="${esc(item.image)}" alt="" loading="lazy" />
        <div class="upg-pick-name">${esc(item.name)}</div>
        <div class="upg-pick-price">⭐ ${formatStars(item.price)}</div>
      `;
      card.onclick = () => {
        state.upg.targetItem = item;
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
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 104;

    const chance = state.upg.mode === 'stars'
      ? (100 / state.upg.multiplier)
      : Math.max(0, Math.min(85, state.upg.chance || 0));
    const winRad = (chance / 100) * Math.PI * 2;
    const startRad = -Math.PI / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#243447';
    ctx.lineWidth = 22;
    ctx.stroke();

    if (winRad > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startRad, startRad + winRad);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 22;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    const ptrRad = startRad + (state.upg.pointerAngle * Math.PI) / 180;
    const px = cx + Math.cos(ptrRad) * (r + 16);
    const py = cy + Math.sin(ptrRad) * (r + 16);
    const tx = cx + Math.cos(ptrRad) * (r - 12);
    const ty = cy + Math.sin(ptrRad) * (r - 12);

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function runUpgraderSpinAnim(stopAngle, onDone) {
    const startDeg = state.upg.pointerAngle % 360;
    const targetDeg = 360 * 5 + stopAngle;
    const t0 = performance.now();
    const dur = 3200;

    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      state.upg.pointerAngle = startDeg + (targetDeg - startDeg) * eased;
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

    if (state.upg.mode === 'gifts') {
      const src = state.upg.sourceGift;
      const tgt = state.upg.targetItem;
      if (!src || !tgt) {
        showToast('Выберите свой подарок и целевой подарок', 'error');
        return;
      }

      state.upg.spinning = true;
      $('upg-play-btn').disabled = true;

      try {
        const res = await api('/api/games/upgrader/play-gift', {
          method: 'POST',
          body: { sourceUid: src.uid, targetType: tgt.type, targetKey: tgt.key }
        });

        // Immediately reflect staked gift removal before wheel finishes!
        if (state.user && Array.isArray(res.inventoryAfterBet)) {
          state.user.inventory = res.inventoryAfterBet;
          $('inv-count').textContent = state.user.inventory.length;
        }
        haptic('medium');

        runUpgraderSpinAnim(res.stopAngle, () => {
          state.upg.spinning = false;
          state.upg.sourceGift = null;
          state.upg.targetItem = null;
          flushFeedToken(res.feedToken);
          applyServerUser(res.user, { force: true });
          updatePfStrips();
          drawUpgraderWheel();
          if (res.won && res.wonGift) {
            haptic('success');
            SoundFX.bigWin();
            showToast(`Апгрейд успешен! Получен «${res.wonGift.collectionName}» (${formatStars(res.wonGift.value)})!`, 'gold');
            openTelegramGiftModal(res.wonGift);
          } else {
            haptic('error');
            SoundFX.lose();
            showToast('Не повезло — подарок сгорел в апгрейдере', 'error');
          }
        });
      } catch (e) {
        state.upg.spinning = false;
        updateUpgraderInfo();
        showToast(e.message, 'error');
      }
      return;
    }

    // Mode: Stars
    state.upg.spinning = true;
    $('upg-play-btn').disabled = true;

    try {
      const bet = Math.floor(Number($('upg-bet-input').value));
      const res = await api('/api/games/upgrader/play', {
        method: 'POST',
        body: { bet, multiplier: state.upg.multiplier }
      });
      // Deduct bet IMMEDIATELY before pointer spins!
      updateDisplayedBalance(res.balanceAfterBet);

      runUpgraderSpinAnim(res.stopAngle, () => {
        state.upg.spinning = false;
        flushFeedToken(res.feedToken);
        applyServerUser(res.user, { force: true });
        updatePfStrips();
        $('upg-play-btn').disabled = false;
        if (res.won) {
          haptic('success');
          SoundFX.coin();
          showToast(`Апгрейд успешен! +${formatStars(res.payout)} звёзд`, 'success');
        } else {
          haptic('error');
          SoundFX.lose();
          showToast('Не повезло — сектор LOSE', 'error');
        }
      });
    } catch (e) {
      state.upg.spinning = false;
      $('upg-play-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 8: RED / BLACK (REAL LIVE BETS LIKE CRASH!) ========================
  function initRedBlackTape() {
    let html = '';
    for (let i = 0; i < 60; i++) {
      const isRed = i % 2 === 0;
      html += `<div class="rb-tile ${isRed ? 'red' : 'black'}">${isRed ? '🔴' : '⚫'}</div>`;
    }
    $('rb-tape').innerHTML = html;
  }

  function renderRbHistory() {
    $('rb-history').innerHTML = state.rb.history.map((c) => `<span class="rb-dot ${c}"></span>`).join('');
  }

  function renderRbBets() {
    const list = $('rb-bets-list');
    const cnt = $('rb-bets-count');
    const bets = state.rb.bets || [];
    if (cnt) cnt.textContent = bets.length;
    if (!bets.length) {
      list.innerHTML = '<div class="empty-inline">Ожидание ставок игроков...</div>';
      return;
    }
    list.innerHTML = bets.map((b) => {
      const ava = b.photoUrl
        ? `<img class="player-ava" src="${esc(b.photoUrl)}" alt="" />`
        : `<div class="player-ava">${esc((b.firstName || 'P')[0].toUpperCase())}</div>`;
      const colorIcon = b.color === 'red' ? '🔴 Красное' : '⚫ Чёрное';
      let statusHtml = `<span class="player-status live">${formatStars(b.amount)} ${starIconHtml(13)}</span>`;
      if (b.won === true) {
        statusHtml = `<span class="player-status win">x1.9 • +${formatStars(b.winAmount)} ${starIconHtml(13)}</span>`;
      } else if (b.won === false) {
        statusHtml = `<span class="player-status lose">Сгорел</span>`;
      }
      return `
        <div class="player-row">
          <div class="player-left">
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(b.firstName)}</div>
              <div class="player-bet">${colorIcon} • ${formatStars(b.amount)} ⭐</div>
            </div>
          </div>
          ${statusHtml}
        </div>
      `;
    }).join('');
  }

  function animateRedBlackSpin(winnerColor, payouts) {
    const tape = $('rb-tape');
    tape.style.transition = 'none';
    tape.style.transform = 'translateX(0px)';

    const targetIdx = winnerColor === 'red' ? 42 : 43;
    const tileStep = 66;
    const windowW = tape.parentElement.clientWidth || 320;
    const targetX = -(targetIdx * tileStep + 36 - windowW / 2);

    void tape.offsetWidth;
    requestAnimationFrame(() => {
      tape.style.transition = 'transform 3.6s cubic-bezier(0.12, 0.85, 0.15, 1)';
      tape.style.transform = `translateX(${targetX}px)`;
    });

    setTimeout(() => {
      renderRbHistory();
      if (Array.isArray(payouts) && payouts.length) {
        state.rb.bets = payouts;
        renderRbBets();
      }
      const myRes = payouts.find((p) => p.telegramId === state.user?.telegramId);
      if (myRes) {
        if (myRes.won) {
          haptic('success');
          showToast(`Выпало ${winnerColor === 'red' ? 'Красное' : 'Чёрное'}! Выигрыш +${formatStars(myRes.winAmount)} ⭐`, 'success');
        } else {
          haptic('error');
          showToast(`Выпало ${winnerColor === 'red' ? 'Красное' : 'Чёрное'}. Ставка не сыграла`, 'error');
        }
      }
    }, 3750);
  }

  function handleRbBet(color) {
    if (!state.socket) return;
    const amount = Math.floor(Number($('rb-bet-input').value));
    state.socket.emit('rb:bet', { color, amount }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else {
        haptic('medium');
        showToast(`Ставка ${formatStars(amount)} ⭐ на ${color === 'red' ? 'Красное' : 'Чёрное'}!`, 'info');
      }
    });
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

      const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
      list.innerHTML = '';
      for (const p of top) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `lb-row${p.rank <= 3 ? ` rank-${p.rank}` : ''}`;
        const ava = p.photoUrl
          ? `<img class="player-ava" src="${esc(p.photoUrl)}" alt="" />`
          : `<div class="player-ava">${esc((p.firstName || 'P')[0].toUpperCase())}</div>`;
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Player';
        btn.innerHTML = `
          <div class="lb-left">
            <span class="lb-rank">${medals[p.rank] || `#${p.rank}`}</span>
            ${ava}
            <div style="min-width:0">
              <div class="player-name">${esc(fullName)}</div>
              <div class="player-bet">${p.username ? `@${esc(p.username)}` : `ID: ${esc(p.telegramId)}`}</div>
            </div>
          </div>
          <div class="lb-right">
            <div class="lb-wager">⭐ ${formatStars(p.totalWagered)}</div>
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
    { key: 'crash',    title: '🚀 Краш (Ракета)', showMult: true },
    { key: 'cases',    title: '🎁 Кейсы',          showMult: false },
    { key: 'wheel',    title: '🎡 Колесо Удачи',   showMult: false },
    { key: 'mines',    title: '💎 Мины 5×5',       showMult: true },
    { key: 'plinko',   title: '🎯 Плинко',         showMult: true },
    { key: 'pvp',      title: '⚔️ PvP Колесо',     showMult: false },
    { key: 'upgrader', title: '⚡ Апгрейдер',       showMult: true },
    { key: 'redblack', title: '🔴 Красное / Чёрное', showMult: false }
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
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Telegram User';
      const joined = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

      const avaHtml = p.photoUrl
        ? `<img class="pstats-avatar" src="${esc(p.photoUrl)}" alt="" />`
        : `<div class="pstats-avatar">${esc((p.firstName || 'U')[0].toUpperCase())}</div>`;

      const gameCardsHtml = GAME_STAT_META.map((gm) => {
        const g = games[gm.key] || { wagered: 0, won: 0, lost: 0, maxWin: 0, maxMult: 0, plays: 0 };
        const multRow = gm.showMult
          ? `<div class="game-stat-cell"><span>Макс. X</span><b class="gold">${g.maxMult ? `x${g.maxMult}` : '—'}</b></div>`
          : '';
        return `
          <div class="game-stat-card">
            <div class="game-stat-head">
              <span class="game-stat-title">${gm.title}</span>
              <span class="game-stat-plays">Игр: ${formatStars(g.plays)}</span>
            </div>
            <div class="game-stat-grid">
              <div class="game-stat-cell"><span>Ставок</span><b>${formatStars(g.wagered)} ⭐</b></div>
              <div class="game-stat-cell"><span>Выиграно</span><b class="pos">+${formatStars(g.won)} ⭐</b></div>
              <div class="game-stat-cell"><span>Проиграно</span><b class="neg">-${formatStars(g.lost)} ⭐</b></div>
              <div class="game-stat-cell"><span>Макс. выигрыш</span><b class="gold">${formatStars(g.maxWin)} ⭐</b></div>
              ${multRow}
            </div>
          </div>
        `;
      }).join('');

      body.innerHTML = `
        <div class="pstats-hero">
          ${avaHtml}
          <div style="min-width:0">
            <div class="pstats-name">${esc(fullName)}</div>
            <div class="pstats-meta">${p.username ? `@${esc(p.username)} • ` : ''}ID: ${esc(p.telegramId)}</div>
            <div class="pstats-meta">В ZetGifts с ${joined} • Подарков: ${p.giftsCount} (⭐ ${formatStars(p.inventoryValue)})</div>
          </div>
        </div>

        <div class="pstats-summary-grid">
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Общий объём ставок</div>
            <div class="pstats-kpi-val gold">⭐ ${formatStars(st.totalWagered || 0)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Макс. выигрыш</div>
            <div class="pstats-kpi-val green">⭐ ${formatStars(st.biggestWin || 0)}</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Всего выиграно</div>
            <div class="pstats-kpi-val green">+${formatStars(st.totalWon || 0)} ⭐</div>
          </div>
          <div class="pstats-kpi">
            <div class="pstats-kpi-label">Всего проиграно</div>
            <div class="pstats-kpi-val red">-${formatStars(st.totalLost || 0)} ⭐</div>
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
        ${String(p.telegramId) === String(state.user?.telegramId) ? `
          <div class="pstats-pf-footer">
            <button type="button" id="pstats-open-pf-btn" class="tg-btn tg-btn-secondary tg-btn-lg">
              🛡 Проверка честности (Provably Fair)
            </button>
          </div>
        ` : ''}
      `;
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
      $('catalog-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Загрузка каталога Telegram...</div>';
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
    const basics = q
      ? state.basicGifts.filter((b) => b.name.toLowerCase().includes(q) || (b.enName || '').toLowerCase().includes(q))
      : state.basicGifts;
    const cols = q
      ? state.catalog.filter((c) => c.name.toLowerCase().includes(q))
      : state.catalog;

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
      hdr.textContent = 'Обычные подарки Telegram';
      grid.appendChild(hdr);

      for (const b of basics) {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
          <img src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy" />
          <div class="catalog-name">${esc(b.name)}</div>
          <button type="button" class="catalog-buy-btn">⭐ ${formatStars(b.price)}</button>
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
          <button type="button" class="catalog-buy-btn">⭐ ${formatStars(c.price)}</button>
        `;
        card.querySelector('button').onclick = async () => {
          try {
            const res = await api('/api/gifts/buy', { method: 'POST', body: { collectionName: c.name } });
            state.user = res.user;
            renderUser();
            haptic('success');
            showToast(`Куплен «${c.name}»! Можно улучшить в Профиле за 25 ⭐`, 'success');
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
        : `<span class="history-amt" style="color:var(--accent)">🎁</span>`;
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
      showToast('Минимальная сумма пополнения — 10 ⭐', 'error');
      return;
    }
    $('topup-pay-btn').disabled = true;
    try {
      const res = await api('/api/topup', { method: 'POST', body: { amount } });
      if (tg?.openInvoice && res.invoiceUrl) {
        tg.openInvoice(res.invoiceUrl, async (status) => {
          if (status === 'paid') {
            const conf = await api('/api/topup/confirm', { method: 'POST', body: { amount, status } });
            state.user = conf.user;
            renderUser();
            closeModal('modal-topup');
            showToast(`Баланс пополнен на +${formatStars(amount)} ⭐!`, 'gold');
          } else {
            showToast('Оплата отменена', 'info');
          }
        });
      } else {
        showToast('Откройте приложение в Telegram для оплаты Stars', 'info');
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
      $('admin-gift-select').innerHTML = state.catalog
        .map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${formatStars(c.price)} зв.)</option>`)
        .join('');
      $('admin-craft-select').innerHTML =
        `<option value="__collection_random__">🎲 Случайная из 5 моделей выбранной коллекции</option>` +
        (res.crafted || [])
          .map((c) => `<option value="${esc(c.id)}">${esc(c.ruName)} [${c.tier}]</option>`)
          .join('');
    } catch {}
  }

  async function loadAdminRecentUsers() {
    try {
      const res = await api('/api/admin/users');
      const box = $('admin-users-list');
      box.innerHTML = (res.users || []).map((u) => `
        <div class="player-row" style="cursor:pointer" data-uid="${esc(u.telegramId)}">
          <div>
            <div class="player-name">${esc(u.firstName)} ${u.banned ? '🚫' : ''}</div>
            <div class="player-bet">ID: ${esc(u.telegramId)} • ⭐ ${formatStars(u.balance)} • 🎁 ${u.inventoryCount}</div>
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
    $('admin-u-meta').textContent = `ID: ${u.telegramId} • Баланс: ${formatStars(u.balance)} ⭐ • Подарков: ${u.inventory.length}`;
    const badge = $('admin-u-ban-badge');
    badge.textContent = u.banned ? 'Забанен' : 'Активен';
    badge.className = u.banned ? 'badge-red' : 'badge-green';
    $('admin-ban-toggle').textContent = u.banned ? '✅ Разбанить пользователя' : '🚫 Забанить пользователя';
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
      showToast(`Баланс обновлён: ${formatStars(res.user.balance)} ⭐`, 'success');
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

  async function handleAdminGiveCrafted() {
    const u = state.adminSelectedUser;
    if (!u) return;
    const craftedId = $('admin-craft-select').value;
    const collectionName = $('admin-gift-select').value;
    try {
      const body = craftedId === '__collection_random__'
        ? { telegramId: u.telegramId, collectionName, crafted: true }
        : { telegramId: u.telegramId, craftedId };
      const res = await api('/api/admin/give-gift', { method: 'POST', body });
      state.adminSelectedUser = res.user;
      if (String(res.user.telegramId) === String(state.user?.telegramId)) {
        applyServerUser(res.user);
      }
      renderAdminSelectedUser();
      showToast(`Выдан крафт-подарок «${res.gift.craftedRuName}»`, 'gold');
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

  // ======================== V2: CRASH VISIBILITY, CONTEXTUAL LIVE FEEDS, PROVABLY FAIR, EXTENDED ADMIN ========================
  function isCrashVisible() {
    return Boolean(
      $('tab-games')?.classList.contains('active')
      && !$('game-shell')?.classList.contains('hidden')
      && $('game-crash')?.classList.contains('active')
    );
  }

  function avatarThumbHtml(photoUrl, firstName, small = false) {
    const cls = small ? 'feed-avatar sm' : 'feed-avatar';
    if (photoUrl) {
      return `<div class="${cls}"><img src="${esc(photoUrl)}" alt="" loading="lazy" /></div>`;
    }
    return `<div class="${cls}">${esc((firstName || 'P')[0].toUpperCase())}</div>`;
  }

  function renderAllLiveFeeds() {
    renderLiveFeed('crash');
    renderLiveFeed('cases');
    renderLiveFeed('craft');
    renderLiveFeed('wheel');
    renderLiveFeed('upgrader');
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
              ${avatarThumbHtml(it.photoUrl, it.firstName, true)}
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
          ${avatarThumbHtml(it.photoUrl, it.firstName)}
          <div class="feed-meta">
            <div class="feed-user-row">
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-mult-pill">x${Number(it.mult || 1).toFixed(2)}</span>
            </div>
            <div class="feed-sub">${formatStars(it.bet)} → <b>${formatStars(it.payout)}</b> ${starIconHtml(11)}</div>
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
                ${avatarThumbHtml(it.photoUrl, it.firstName, true)}
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
              ${avatarThumbHtml(it.photoUrl, it.firstName, true)}
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
        return `
          <div class="feed-card">
            ${thumb}
            <div class="feed-meta">
              <div class="feed-user-row">
                ${avatarThumbHtml(it.photoUrl, it.firstName, true)}
                <span class="feed-nick">${esc(it.firstName)}</span>
              </div>
              <div class="feed-sub">${it.isStars ? `+${formatStars(it.amount)}` : esc(it.giftName)} ${starIconHtml(11)}</div>
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
          ${it.giftImage ? `<img class="feed-drop-thumb" src="${esc(it.giftImage)}" alt="" loading="lazy" />` : avatarThumbHtml(it.photoUrl, it.firstName)}
          <div class="feed-meta">
            <div class="feed-user-row">
              <span class="feed-nick">${esc(it.firstName)}</span>
              <span class="feed-mult-pill">x${Number(it.mult || 1).toFixed(2)}</span>
            </div>
            <div class="feed-sub">${it.giftName ? esc(it.giftName) : `+${formatStars(it.payout)}`} ${starIconHtml(11)}</div>
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
            <button type="button" class="mini-pill-btn" data-pf-check-crash="${idx}">✅ Проверить SHA-256</button>
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
          resEl.textContent = ok ? '✅ SHA-256 полностью совпадает! Раунд честный.' : '❌ Несовпадение хэша!';
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
            <button type="button" class="mini-pill-btn" data-pf-check-user="${idx}">✅ Проверить SHA-256</button>
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
          resEl.textContent = ok ? '✅ SHA-256 полностью совпадает! Ролл честный.' : '❌ Несовпадение хэша!';
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
            <div class="admin-kpi-lbl">🟢 Игроков онлайн</div>
            <div class="admin-kpi-val online">${s.onlineUsersCount} <span style="font-size:11px;color:#8ea1b5">/ ${s.totalUsers}</span></div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">💰 Прибыль казино (GGR)</div>
            <div class="admin-kpi-val ${ggrCls}">${ggrSign}${formatStars(s.ggr)} ${starIconHtml(14)}</div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">📈 Общий оборот</div>
            <div class="admin-kpi-val">${formatStars(s.totalWagered)} ${starIconHtml(14)}</div>
          </div>
          <div class="admin-kpi-card">
            <div class="admin-kpi-lbl">🎁 Выплачено игрокам</div>
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
          const ico = a.kind === 'suspicious' ? '🚨' : a.kind === 'drop' ? '💎' : '🛠';
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
      statusEl.textContent = `✅ Готово! Доставлено: ${res.sent} из ${res.total} (ошибок: ${res.failed})`;
      showToast(`Рассылка завершена: ${res.sent}/${res.total}`, 'success');
      loadAdminStats();
    } catch (e) {
      statusEl.textContent = `❌ Ошибка: ${e.message}`;
      showToast(e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ======================== MASTER 60FPS ANIMATION LOOP ========================
  function masterFrameLoop() {
    if ($('game-crash')?.classList.contains('active')) {
      drawCrashGraph();
    }

    if (state.rb.phase === 'betting') {
      const leftMs = Math.max(0, state.rb.endsAt - Date.now());
      $('rb-timer-badge').textContent = `${(leftMs / 1000).toFixed(1)}с`;
      $('rb-progress-fill').style.width = `${(leftMs / 15000) * 100}%`;
    } else {
      $('rb-timer-badge').textContent = 'Крутим...';
      $('rb-progress-fill').style.width = '0%';
    }

    if (state.pvp.phase === 'countdown') {
      const leftMs = Math.max(0, state.pvp.endsAt - Date.now());
      $('pvp-timer-pill').textContent = `Старт через ${(leftMs / 1000).toFixed(1)}с`;
    } else if (state.pvp.phase === 'waiting') {
      $('pvp-timer-pill').textContent = state.pvp.players.length === 1
        ? 'Ожидание 2-го игрока...'
        : 'Ожидание игроков';
    }

    requestAnimationFrame(masterFrameLoop);
  }

  boot();
})();
