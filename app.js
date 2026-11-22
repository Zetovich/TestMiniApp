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
    wheelSpinning: false,
    wheelAngle: 0,

    // Mines
    mines: { active: false, bet: 25, minesCount: 3, revealed: [], multiplier: 1.0 },

    // Plinko
    plinkoDropping: false,
    plinkoRecentBets: [],

    // PvP
    pvp: { phase: 'waiting', endsAt: 0, players: [], totalPot: 0, angle: 0, spinning: false },

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

    // Cases
    caseOpening: false,

    // Admin
    adminSelectedUser: null
  };

  const CRAFT_CHANCES = { 0: 0, 1: 10, 2: 30, 3: 60, 4: 85 };

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
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'gold' ? '⭐' : 'ℹ️';
    el.innerHTML = `<span>${icon}</span><span>${esc(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      el.style.transition = 'all 0.2s ease';
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
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
      state.user = me.user;
      state.cases = me.cases || [];
      state.wheelSegments = me.wheelSegments || [];
      state.plinkoMultipliers = me.plinkoMultipliers || state.plinkoMultipliers;
      state.plinkoRecentBets = me.plinkoRecentBets || [];
      state.craftedCatalog = me.catalogSummary?.crafted || [];

      $('auth-gate').classList.add('hidden');
      $('app').classList.remove('hidden');

      initUI();
      initLotties();
      renderUser();
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
      // Do not clobber mid-animation local balance deduction during spin/roll
      const busyAnim = state.wheelSpinning || state.caseOpening || state.plinkoDropping || state.upg.spinning || state.upgrading;
      if (busyAnim) return;
      state.user = u;
      renderUser();
    });

    // CRASH
    socket.on('crash:state', (payload) => {
      state.crash.phase = payload.phase;
      state.crash.multiplier = payload.multiplier;
      state.crash.bets = payload.bets || [];
      state.crash.history = payload.history || [];
      state.crash.waitEndsAt = Date.now() + (payload.waitMs || 0);
      if (payload.phase === 'running') {
        state.crash.startedAt = Date.now() - Math.log(Math.max(1, payload.multiplier)) / 0.145 * 1000;
        setCrashVisual('running');
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
      setCrashVisual('crashed');
      renderCrashHistory();
      renderCrashBets();
      updateCrashButton();
      // Vibrate ONLY when Crash game is currently open and visible!
      const isCrashOpen = $('tab-games')?.classList.contains('active')
        && !$('game-shell')?.classList.contains('hidden')
        && $('game-crash')?.classList.contains('active');
      if (isCrashOpen) haptic('error');
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
      $('pvp-pot-badge').textContent = `Банк: ${formatStars(state.pvp.totalPot)} ⭐`;
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
    if (tab === 'profile') renderUser();
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

    // Cases back button & open button
    $('btn-back-to-cases').addEventListener('click', () => {
      if (state.caseOpening) return;
      haptic('light');
      closeCaseDetail();
    });
    $('case-open-btn').addEventListener('click', () => {
      if (state.activeCase) openCase(state.activeCase);
    });

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
    $('upg-picker-search').addEventListener('input', (e) => renderUpgraderPickerGrid(e.target.value));

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
      okBtn.textContent = `Продать (${formatStars(g.value)} ⭐)`;
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
        <div class="gift-card-val">⭐ ${formatStars(g.value)}</div>
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
      rows.push({
        k: 'Фон',
        v: `<span class="trait-dot" style="background:${esc(g.backdrop?.center || '#2ea6ff')}"></span>${esc(g.backdrop?.name || 'Classic')} <span class="rarity-pill">${g.backdrop?.rarity || 1.5}%</span>`
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

    rows.push({ k: 'Цена', v: `<span style="color:var(--gold)">⭐ ${formatStars(g.value)}</span>` });

    $('tg-traits-table').innerHTML = rows
      .map((r) => `<div class="trait-row"><span class="trait-key">${r.k}</span><span class="trait-val">${r.v}</span></div>`)
      .join('');

    const actions = $('tg-gift-actions');
    actions.innerHTML = '';

    if (!g.upgraded && !isBasicNonUpgradable(g)) {
      const upgBtn = document.createElement('button');
      upgBtn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      upgBtn.innerHTML = '✨ Улучшить за 25 ⭐';
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
    sellBtn.innerHTML = `Продать (${formatStars(g.value)} ⭐)`;
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
        state.user = me.user;
        renderUser();
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
    strip.classList.add('idle');
    strip.style.transition = 'none';
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
    $('upgrade-confirm-btn').textContent = '✨ Улучшить за 25 ⭐';
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
      $('upgrade-confirm-btn').textContent = '✨ Улучшить за 25 ⭐';
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

      // Build horizontal reel: slides smoothly LEFT -> RIGHT!
      // Winner is at index 0 (LAST item to enter from left!),
      // margin-right: 190px makes neighbor #1 smoothly exit completely off the RIGHT edge!
      const itemW = 136;
      const winnerGap = 190;
      const winW = viewport.clientWidth || 360;
      const reelCount = 18;

      const reelModels = [
        { name: finalGift.model.name, rarity: finalGift.model.rarity, image: finalGift.image, isWinner: true }
      ];
      for (let i = 1; i < reelCount; i++) {
        const pm = previewModels[i % Math.max(1, previewModels.length)] || { name: finalGift.model.name, rarity: 1, image: finalGift.image };
        reelModels.push({ ...pm, isWinner: false });
      }
      reelModels.forEach((m) => { const im = new Image(); im.src = m.image; });

      strip.style.transition = 'none';
      strip.innerHTML = reelModels
        .map((m) => `<div class="upg-reel-item${m.isWinner ? ' is-winner' : ''}"><img src="${esc(m.image)}" alt="" /></div>`)
        .join('');

      const startIdx = reelCount - 2;
      const startCenter = itemW + winnerGap + (startIdx - 1) * itemW + itemW / 2;
      const targetCenter = itemW / 2;
      const startX = Math.round(winW / 2 - startCenter);
      const targetX = Math.round(winW / 2 - targetCenter);

      strip.style.transform = `translate3d(${startX}px, 0, 0)`;
      void strip.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          strip.style.transition = 'transform 3.7s cubic-bezier(0.10, 0.88, 0.16, 1)';
          strip.style.transform = `translate3d(${targetX}px, 0, 0)`;
        });
      });

      let useA = false;
      const timers = [];
      let finished = false;

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

      function finishNow(skipped = false) {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);

        if (skipped) {
          strip.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.25, 1)';
          strip.style.transform = `translate3d(${targetX}px, 0, 0)`;
        }

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

      // Exact Telegram GiftUpdate.mp4 cadence:
      // 1) Backdrop locks early (~1.75s)
      const bgTicks = [160, 420, 720, 1080, 1460, 1820];
      bgTicks.forEach((ms, idx) => {
        timers.push(setTimeout(() => {
          const isLock = idx === bgTicks.length - 1;
          const bg = isLock ? finalGift.backdrop : (previewBackdrops[idx % Math.max(1, previewBackdrops.length)] || finalGift.backdrop);
          applyBackdrop(bg);
          scrollSlotDown('upg-slot-backdrop', `<span class="trait-dot" style="background:${esc(bg.center)}"></span>${esc(bg.name)} <span class="rarity-pill">${bg.rarity || 1.5}%</span>`);
        }, ms));
      });

      // 2) Symbol/Pattern locks second (~2.35s)
      const symTicks = [220, 560, 940, 1360, 1840, 2320];
      symTicks.forEach((ms, idx) => {
        timers.push(setTimeout(() => {
          const isLock = idx === symTicks.length - 1;
          const sym = isLock ? finalGift.symbol : (previewSymbols[idx % Math.max(1, previewSymbols.length)] || finalGift.symbol);
          if (sym?.name) {
            renderUpgradePattern(sym.image || '');
            scrollSlotDown('upg-slot-symbol', `${esc(sym.name)} <span class="rarity-pill">${sym.rarity || 0.5}%</span>`);
          }
        }, ms));
      });

      // 3) Model scrolls all the way to the finale (~3.55s) synced with the horizontal reel!
      const mdlTicks = [180, 420, 680, 980, 1320, 1720, 2180, 2720, 3260];
      mdlTicks.forEach((ms, idx) => {
        timers.push(setTimeout(() => {
          const mdl = previewModels[idx % Math.max(1, previewModels.length)] || finalGift.model;
          scrollSlotDown('upg-slot-model', `${esc(mdl.name)} <span class="rarity-pill">${mdl.rarity || 1}%</span>`);
          haptic('light');
        }, ms));
      });

      // Finale
      timers.push(setTimeout(() => finishNow(false), 3720));
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

    const pctAdds = ['+10%', '+20%', '+30%', '+25%'];
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
    if (count >= 2 && !state.crafting && !state.craftResultShown) {
      const bgCounts = {};
      filled.forEach((g) => { if (g.backdrop?.name) bgCounts[g.backdrop.name] = (bgCounts[g.backdrop.name] || 0) + 1; });
      const pills = [];
      for (const [name, cnt] of Object.entries(bgCounts)) {
        if (cnt >= 2) {
          const pct = cnt === 4 ? 100 : cnt * 25;
          pills.push(`<span class="attr-pill">🎨 Фон «${esc(name)}»: ${pct}%</span>`);
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
        <svg width="50" height="50" viewBox="0 0 64 64" fill="none">
          <path d="M18 22C14 22 12 19 12 16C12 12.5 15 10 18.5 10C22.5 10 26.5 14 29 19H21L18 22Z" fill="#ffffff"/>
          <path d="M46 22C50 22 52 19 52 16C52 12.5 49 10 45.5 10C41.5 10 37.5 14 35 19H43L46 22Z" fill="#ffffff"/>
          <path d="M10 24H29L25 34L30 41L26 54H13C11.3 54 10 52.7 10 51V24Z" fill="#ffffff"/>
          <path d="M35 24H54V51C54 52.7 52.7 54 51 54H33L37 41L32 34L35 24Z" fill="#ffffff"/>
        </svg>
        <span class="broken-gift-count">${count}</span>
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

      await playInline3DCraftAnimation(entries, res);

      state.craftSlots = [null, null, null, null];
      state.user = res.user;
      state.crafting = false;
      renderUser();

      if (res.success && res.resultGift) {
        // Brief emerald celebration, then open full NFT viewer and restore slots cleanly!
        setTimeout(() => {
          resetCraftHeroToIdle();
          renderCraftSlots();
          openTelegramGiftModal(res.resultGift);
        }, 1350);
      }
    } catch (e) {
      state.crafting = false;
      resetCraftHeroToIdle();
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

    // Stop idle spin & align cube cleanly on front face before loading NFTs
    clearCraftCubeFaces();
    cube.classList.remove('idle-spin');
    cube.style.transition = 'transform 0.28s cubic-bezier(0.22, 0.85, 0.36, 1)';
    cube.style.transform = 'rotateX(-14deg) rotateY(0deg)';
    void cube.offsetWidth;
    await waitMs(220);

    // Phase 1: Sequentially fly each NFT from its slot onto a cube face, rotating slightly between each!
    // Fast at first, gradually slowing down as each NFT loads in!
    const faceOrder = [
      { id: 'cube-face-front', yaw: 0 },
      { id: 'cube-face-right', yaw: -90 },
      { id: 'cube-face-back',  yaw: -180 },
      { id: 'cube-face-left',  yaw: -270 }
    ];
    const slotBtns = Array.from(document.querySelectorAll('.craft-slot'));

    subEl.textContent = 'Загрузка NFT в куб...';
    for (let k = 0; k < entries.length; k++) {
      const { gift, slotIdx } = entries[k];
      const slotEl = slotBtns[slotIdx];
      const targetFace = faceOrder[k];

      // Progressively slower timing: 240ms -> 320ms -> 410ms -> 520ms
      const rotMs = 190 + k * 70;
      const flyMs = 240 + k * 85;

      // Turn cube smoothly to present the next empty face
      if (k > 0) {
        cube.style.transition = `transform ${rotMs}ms cubic-bezier(0.22, 0.85, 0.34, 1)`;
        cube.style.transform = `rotateX(-14deg) rotateY(${targetFace.yaw}deg)`;
        await waitMs(rotMs - 30);
      }

      // Fly NFT from slot -> cube face (and hide that slot immediately!)
      await flyGiftFromSlotToCube(slotEl, gift.image, flyMs);

      // Attach NFT artwork onto this transparent glass face!
      const fEl = $(targetFace.id);
      fEl.classList.add('face-filled');
      fEl.innerHTML = `<img src="${esc(gift.image)}" alt="" />`;
      haptic('light');
      await waitMs(70 + k * 45);
    }

    // Hide any remaining empty slots smoothly while the roll plays
    slotBtns.forEach((s) => s.classList.add('slot-vanished'));
    await waitMs(120);
    slotsWrap.classList.add('slots-collapsed');

    // Also mirror participating NFTs on top/bottom faces for full 3D richness during roll
    ['cube-face-top', 'cube-face-bottom'].forEach((fid, i) => {
      const g = entries[i % entries.length].gift;
      const fEl = $(fid);
      fEl.innerHTML = `<img src="${esc(g.image)}" alt="" />`;
    });

    // Phase 2: One smooth 60FPS GPU 3D roll landing strictly flat on FRONT face!
    subEl.textContent = `Вероятность успеха ${res.chance}%`;
    haptic('medium');

    // Swap front face to final outcome mid-spin (~300ms in, when front face is facing away!)
    setTimeout(() => {
      const front = $('cube-face-front');
      front.className = 'cube-face face-front';
      if (res.success && res.resultGift) {
        front.classList.add('success-face');
        front.style.background = giftBgStyle(res.resultGift);
        front.innerHTML = `<img src="${esc(res.resultGift.image)}" alt="" />`;
      } else {
        front.classList.add('fail-face');
        front.style.background = '';
        front.innerHTML = brokenGiftSvg(res.burnedCount);
      }
    }, 320);

    // Calculate multi-turn final angles that are exact multiples of 360deg (so FRONT face lands dead-straight!)
    const finalX = 720;  // 2 full X rotations -> 0deg mod 360
    const finalY = -1080; // 3 full Y rotations -> 0deg mod 360
    requestAnimationFrame(() => {
      cube.style.transition = 'transform 2.25s cubic-bezier(0.14, 0.88, 0.22, 1)';
      cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg) scale(1.06)`;
    });

    await waitMs(2320);

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

    const mult = Math.max(1, state.crash.multiplier);
    const progressX = Math.min(0.92, Math.log(mult) / Math.log(12) * 0.92 + 0.08);
    const progressY = Math.min(0.84, Math.log(mult) / Math.log(8) * 0.84 + 0.04);

    const startX = 16;
    const startY = h - 18;
    const endX = startX + (w - 36) * progressX;
    const endY = startY - (h - 46) * progressY;

    const isCrashed = state.crash.phase === 'crashed';
    const strokeCol = isCrashed ? '#ef4444' : '#22c55e';
    const fillTop = isCrashed ? 'rgba(239, 68, 68, 0.28)' : 'rgba(34, 197, 94, 0.26)';
    const fillBot = 'rgba(0, 0, 0, 0)';

    const grad = ctx.createLinearGradient(0, endY, 0, startY);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBot);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const cpX = startX + (endX - startX) * 0.62;
    const cpY = startY - (startY - endY) * 0.12;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = strokeCol;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(endX, endY, 5.5, 0, Math.PI * 2);
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
      if (b.cashedOut) statusHtml = `<span class="player-status win">x${b.cashoutAt.toFixed(2)} • +${formatStars(b.payout)} ⭐</span>`;
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
        btn.textContent = `Ставка принята (${formatStars(myBet.bet)} ⭐)`;
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
        btn.textContent = `Забрать +${formatStars(liveWin)} ⭐`;
      } else if (myBet && myBet.cashedOut) {
        btn.classList.add('tg-btn-secondary');
        btn.disabled = true;
        btn.textContent = `Забрано: +${formatStars(myBet.payout)} ⭐ (x${myBet.cashoutAt.toFixed(2)})`;
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

  // ======================== GAME 2: CASES (MINI-WINDOWS -> DETAIL VIEW WITH DROPS & CHANCES) ========================
  function renderCasesList() {
    const grid = $('cases-grid');
    grid.innerHTML = '';
    for (const c of state.cases) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'case-mini-card';
      btn.style.borderColor = `${c.accent}55`;
      btn.innerHTML = `
        <img src="${esc(c.cover)}" alt="${esc(c.name)}" />
        <div class="case-mini-name">${esc(c.name)}</div>
        <div class="case-mini-price">⭐ ${formatStars(c.price)}</div>
      `;
      btn.onclick = () => openCaseDetail(c);
      grid.appendChild(btn);
    }
  }

  function openCaseDetail(c) {
    state.activeCase = c;
    $('cases-list-view').classList.add('hidden');
    $('case-detail-view').classList.remove('hidden');
    $('case-detail-title').textContent = c.name;
    $('case-detail-price').textContent = `${formatStars(c.price)} ⭐`;
    $('case-open-btn').textContent = `Открыть за ${formatStars(c.price)} ⭐`;
    $('case-open-btn').disabled = false;
    $('case-open-btn').style.background = c.accent;

    // Preview idle strip with items from this case
    const strip = $('case-strip');
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0px)';
    const previewItems = [...c.items, ...c.items];
    strip.innerHTML = previewItems.map((it) => `
      <div class="case-item-tile" style="background:radial-gradient(circle at 50% 40%, ${esc(it.center)}, ${esc(it.edge)})">
        <img src="${esc(it.image)}" alt="${esc(it.name)}" />
        <span>${esc(it.name)}</span>
      </div>
    `).join('');

    // Render drops grid below roulette with real chances & prices!
    const dropsGrid = $('case-drops-grid');
    dropsGrid.innerHTML = c.items.map((it) => `
      <div class="case-drop-card" style="background:radial-gradient(circle at 50% 35%, ${esc(it.center)}, ${esc(it.edge)})">
        <span class="case-drop-chance">${it.chance}%</span>
        <img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy" />
        <div class="case-drop-name">${esc(it.name)}</div>
        <div class="case-drop-price">⭐ ${formatStars(it.price)}</div>
      </div>
    `).join('');
  }

  function closeCaseDetail() {
    state.activeCase = null;
    $('case-detail-view').classList.add('hidden');
    $('cases-list-view').classList.remove('hidden');
  }

  async function openCase(caseDef) {
    if (state.caseOpening) return;
    state.caseOpening = true;
    $('case-open-btn').disabled = true;

    try {
      const res = await api('/api/games/case/open', { method: 'POST', body: { caseId: caseDef.id } });
      // Instant balance deduction BEFORE spin!
      updateDisplayedBalance(res.balanceAfterBet);

      const strip = $('case-strip');
      strip.style.transition = 'none';
      strip.style.transform = 'translateX(0px)';

      strip.innerHTML = res.strip.map((item) => `
        <div class="case-item-tile" style="background:radial-gradient(circle at 50% 40%, ${esc(item.center)}, ${esc(item.edge)})">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" />
          <span>${esc(item.name)}</span>
        </div>
      `).join('');

      const tileStep = 96;
      const winW = $('case-roulette-window').clientWidth || 340;
      const jitter = (Math.random() - 0.5) * 28;
      const offset = -(res.winnerIndex * tileStep + 54 - winW / 2 + jitter);

      haptic('medium');
      requestAnimationFrame(() => {
        strip.style.transition = 'transform 4.4s cubic-bezier(0.1, 0.86, 0.14, 1)';
        strip.style.transform = `translateX(${offset}px)`;
      });

      setTimeout(() => {
        state.user = res.user;
        renderUser();
        state.caseOpening = false;
        $('case-open-btn').disabled = false;
        haptic('success');
        showToast(`Выпал подарок: ${res.wonGift.collectionName} (${formatStars(res.wonGift.value)} ⭐)!`, 'gold');
        openTelegramGiftModal(res.wonGift);
      }, 4600);
    } catch (e) {
      state.caseOpening = false;
      $('case-open-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 3: LUCKY WHEEL (25 ⭐, CHEAP REGULAR TG GIFTS) ========================
  function initWheelCanvas() { drawWheel(); }

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
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#17212b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + arc / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(seg.label, r - 18, 5);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#17212b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', 0, 6);
    ctx.restore();
  }

  async function handleWheelSpin() {
    if (state.wheelSpinning) return;
    state.wheelSpinning = true;
    $('wheel-spin-btn').disabled = true;

    try {
      const res = await api('/api/games/wheel', { method: 'POST' });
      // Deduct 25 ⭐ IMMEDIATELY before wheel spins!
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
          state.user = res.user;
          renderUser();
          $('wheel-spin-btn').disabled = false;
          haptic('success');
          if (res.wonGift) {
            showToast(`Выпал подарок Telegram: ${res.wonGift.collectionName} (${res.wonGift.value} ⭐)!`, 'gold');
            openTelegramGiftModal(res.wonGift);
          } else {
            showToast(`Выигрыш в Колесе: +${res.wonStars} ⭐!`, 'success');
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
          state.user = res.user;
          renderUser();
          $('plinko-drop-btn').disabled = false;
          haptic(res.multiplier >= 1 ? 'success' : 'light');
          showToast(`Плинко x${res.multiplier}: ${formatStars(res.payout)} ⭐`, res.multiplier >= 1 ? 'gold' : 'info');
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

  // ======================== GAME 6: PVP WHEEL ========================
  function drawPvpWheel() {
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

        if (frac >= 0.08) {
          ctx.save();
          ctx.rotate(start + slice / 2);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(frac * 100)}%`, r - 14, 4);
          ctx.restore();
        }
        start += slice;
      }
    }

    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#17212b';
    ctx.fill();
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
      return `
        <div class="player-row">
          <div class="player-left">
            <span class="trait-dot" style="background:${esc(p.color)};width:14px;height:14px"></span>
            <div>
              <div class="player-name">${esc(p.firstName)}</div>
              <div class="player-bet">Вклад: ${formatStars(p.bet)} ⭐</div>
            </div>
          </div>
          <span class="player-status win">${pct}%</span>
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
      const chance = Number((100 / mult).toFixed(2));
      state.upg.chance = chance;
      $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
      $('upg-mult-display').textContent = `x${mult}`;
      $('upg-payout-display').textContent = `${formatStars(Math.floor(bet * mult))} ⭐`;
      $('upg-play-btn').disabled = state.upg.spinning;
      $('upg-play-btn').textContent = 'Запустить апгрейд';
    } else {
      const src = state.upg.sourceGift;
      const tgt = state.upg.targetItem;
      const hintEl = $('upg-gift-ratio-hint');

      if (src && tgt && tgt.price > src.value) {
        const rawChance = (src.value / tgt.price) * 100;
        const chance = Number(rawChance.toFixed(2));
        const mult = Number((tgt.price / src.value).toFixed(2));
        const valid = chance >= 1 && chance <= 85;
        state.upg.chance = valid ? chance : 0;

        $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
        $('upg-mult-display').textContent = `x${mult}`;
        $('upg-payout-display').textContent = `${formatStars(tgt.price)} ⭐`;
        hintEl.textContent = valid
          ? `${formatStars(src.value)} ⭐ → ${formatStars(tgt.price)} ⭐ • честный шанс ${chance}%`
          : 'Выберите другой подарок (шанс должен быть от 1% до 85%)';
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
    $('upg-picker-search').value = '';
    $('upg-picker-search').classList.toggle('hidden', mode !== 'target');

    if (mode === 'source') {
      $('upg-picker-title').textContent = 'Выберите ваш подарок';
      $('upg-picker-sub').textContent = 'Подходят любые: обычные, улучшенные NFT и скрафченные';
    } else {
      const sv = state.upg.sourceGift.value;
      $('upg-picker-title').textContent = 'Выберите желаемый подарок';
      $('upg-picker-sub').textContent = `Показаны обычные подарки дороже ${formatStars(sv)} ⭐ (шанс 1%–85%)`;
      $('upg-picker-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Загрузка подарков...</div>';
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

  function renderUpgraderPickerGrid(query = '') {
    const grid = $('upg-picker-grid');
    grid.innerHTML = '';

    if (state.upgPickerMode === 'source') {
      const items = state.user?.inventory || [];
      if (!items.length) {
        grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Ваш инвентарь пуст. Купите подарок в магазине или откройте кейс!</div>';
        return;
      }
      for (const g of items) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.style.background = giftBgStyle(g);
        const tag = g.crafted ? `Крафт #${g.mintNumber}` : g.upgraded ? `NFT #${g.mintNumber}` : 'Обычный';
        card.innerHTML = `
          ${buildCardSymbolPattern(g)}
          <span class="gift-card-ribbon">${esc(tag)}</span>
          <img src="${esc(g.image)}" alt="" loading="lazy" />
          <div class="gift-card-name">${esc(giftDisplayName(g))}</div>
          <div class="gift-card-val">⭐ ${formatStars(g.value)}</div>
        `;
        card.onclick = () => {
          state.upg.sourceGift = g;
          // Reset target if no longer valid for new source price
          if (state.upg.targetItem) {
            const ch = (g.value / state.upg.targetItem.price) * 100;
            if (ch < 1 || ch > 85) state.upg.targetItem = null;
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

    // Target mode: all un-upgraded gifts (basic + 124 regular collections) with 1% <= (sourceVal / price * 100) <= 85%
    const srcVal = Math.max(15, Math.round(state.upg.sourceGift?.value || 15));
    const q = query.trim().toLowerCase();

    const pool = [
      ...state.basicGifts.map((b) => ({ type: 'basic', key: b.slug, name: b.name, price: b.price, image: b.image })),
      ...state.catalog.map((c) => ({ type: 'collection', key: c.name, name: c.name, price: Math.round(c.price), image: c.image }))
    ].filter((it) => {
      const ch = (srcVal / it.price) * 100;
      if (ch < 1 || ch > 85) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => a.price - b.price);

    if (!pool.length) {
      grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Нет подходящих подарков дороже вашего</div>';
      return;
    }

    for (const item of pool) {
      const ch = Number(((srcVal / item.price) * 100).toFixed(1));
      const card = document.createElement('div');
      card.className = 'gift-card';
      card.style.background = 'linear-gradient(160deg, #243343 0%, #17212b 100%)';
      card.innerHTML = `
        <span class="gift-card-ribbon">${ch}%</span>
        <img src="${esc(item.image)}" alt="" loading="lazy" />
        <div class="gift-card-name">${esc(item.name)}</div>
        <div class="gift-card-val">⭐ ${formatStars(item.price)}</div>
      `;
      card.onclick = () => {
        state.upg.targetItem = item;
        closeModal('modal-upg-picker');
        updateUpgraderInfo();
        drawUpgraderWheel();
        haptic('light');
      };
      grid.appendChild(card);
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
          state.user = res.user;
          renderUser();
          drawUpgraderWheel();
          if (res.won && res.wonGift) {
            haptic('success');
            showToast(`Апгрейд успешен! Получен «${res.wonGift.collectionName}» (${formatStars(res.wonGift.value)} ⭐)!`, 'gold');
            openTelegramGiftModal(res.wonGift);
          } else {
            haptic('error');
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
        state.user = res.user;
        renderUser();
        $('upg-play-btn').disabled = false;
        if (res.won) {
          haptic('success');
          showToast(`Апгрейд успешен! +${formatStars(res.payout)} ⭐`, 'success');
        } else {
          haptic('error');
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
      let statusHtml = `<span class="player-status live">${formatStars(b.amount)} ⭐</span>`;
      if (b.won === true) {
        statusHtml = `<span class="player-status win">x2 • +${formatStars(b.winAmount)} ⭐</span>`;
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
      `;
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
        ? `<span class="history-amt ${h.amount > 0 ? 'pos' : 'neg'}">${h.amount > 0 ? '+' : ''}${formatStars(h.amount)} ⭐</span>`
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
        .map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${formatStars(c.price)} ⭐)</option>`)
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
      $('pvp-timer-pill').textContent = 'Ожидание игроков';
    }

    requestAnimationFrame(masterFrameLoop);
  }

  boot();
})();
