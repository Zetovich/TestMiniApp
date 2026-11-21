(() => {
  'use strict';

  // ======================== STATE ========================
  const tg = window.Telegram?.WebApp || null;
  const initData = tg?.initData || '';

  const state = {
    user: null,
    socket: null,
    cases: [],
    wheelSegments: [],
    plinkoMultipliers: [5.0, 2.0, 1.1, 0.5, 0.3, 0.5, 1.1, 2.0, 5.0],
    catalog: [],
    craftedCatalog: [],
    invFilter: 'all',
    currentGift: null,
    upgradeTargetGift: null,

    // Crash
    crash: {
      phase: 'waiting',
      multiplier: 1.0,
      startedAt: 0,
      waitEndsAt: 0,
      bets: [],
      history: [],
      points: []
    },
    diceLottie: null,
    explosionLottie: null,
    giftLottie: null,

    // Wheel
    wheelSpinning: false,
    wheelAngle: 0,

    // Mines
    mines: { active: false, bet: 25, minesCount: 3, revealed: [], multiplier: 1.0 },

    // Plinko
    plinkoDropping: false,

    // PvP
    pvp: { phase: 'waiting', endsAt: 0, players: [], totalPot: 0, angle: 0, spinning: false },

    // Upgrader
    upg: { multiplier: 2, spinning: false, pointerAngle: 0 },

    // Red/Black
    rb: { phase: 'betting', endsAt: 0, bets: [], history: [], spinning: false },

    // Craft
    craftSlots: [null, null, null, null],
    craftPickerSlot: 0,
    crafting: false,
    craftModelsCache: {},
    activeCraftCollection: null,

    // Cases
    caseOpening: false,

    // Admin
    adminSelectedUser: null
  };

  const CRAFT_CHANCES = { 0: 0, 1: 10, 2: 30, 3: 60, 4: 100 };

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
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка запроса');
    }
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
      state.craftedCatalog = me.catalogSummary?.crafted || [];

      // Reveal app ONLY after strict server HMAC verification succeeded
      $('auth-gate').classList.add('hidden');
      $('app').classList.remove('hidden');

      initUI();
      initLotties();
      renderUser();
      renderCases();
      renderCraftedShowcase();
      renderCraftSlots();
      initWheelCanvas();
      initMinesGrid();
      initPlinkoBoard();
      initUpgraderCanvas();
      initRedBlackTape();
      connectSocket();
      loadMinesState();

      if (state.user.isAdmin) {
        $('nav-admin-btn').classList.remove('hidden');
        loadCatalogForAdmin();
        loadAdminRecentUsers();
      }
    } catch (err) {
      showAuthDenied('Ошибка авторизации');
    }
  }

  // ======================== SOCKET.IO ========================
  function connectSocket() {
    const socket = io({ auth: { initData } });
    state.socket = socket;

    socket.on('connect_error', () => {
      showAuthDenied('Ошибка авторизации');
    });

    socket.on('force_logout', () => {
      socket.disconnect();
      showAuthDenied('Ошибка авторизации');
    });

    socket.on('user_update', (u) => {
      state.user = u;
      renderUser();
    });

    // CRASH events
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
        state.crash.points = [];
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
      haptic('error');
    });

    // RED/BLACK events
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

    // PVP WHEEL events
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
  }

  // ======================== LOTTIE INITIALIZATION ========================
  function initLotties() {
    if (!window.lottie) return;

    // Header mini Stellar Rocket (rocket.json)
    lottie.loadAnimation({
      container: $('header-rocket-slot'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'rocket.json'
    });

    // Crash center animated Dice (dice.json)
    state.diceLottie = lottie.loadAnimation({
      container: $('crash-dice'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'dice.json'
    });

    // Crash center one-shot Explosion (explosion.json)
    state.explosionLottie = lottie.loadAnimation({
      container: $('crash-explosion'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'explosion.json'
    });
  }

  // ======================== GLOBAL UI BINDINGS ========================
  function initUI() {
    // Bottom navigation tabs
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Games sub-pills
    document.querySelectorAll('.game-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        document.querySelectorAll('.game-pill').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
        btn.classList.add('active');
        $(`game-${btn.dataset.game}`)?.classList.add('active');
        if (btn.dataset.game === 'wheel') drawWheel();
        if (btn.dataset.game === 'pvp') drawPvpWheel();
        if (btn.dataset.game === 'upgrader') drawUpgraderWheel();
        if (btn.dataset.game === 'plinko') drawPlinkoStatic();
      });
    });

    // Quick bet chips
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

    // Modal close buttons & backdrop clicks
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

    // Profile buttons
    $('btn-topup-quick').addEventListener('click', () => openModal('modal-topup'));
    $('btn-open-topup').addEventListener('click', () => openModal('modal-topup'));
    $('btn-open-history').addEventListener('click', () => { renderHistory(); openModal('modal-history'); });
    $('btn-open-catalog').addEventListener('click', openCatalogModal);

    // Top-up presets & payment
    document.querySelectorAll('.topup-preset').forEach((b) => {
      b.addEventListener('click', () => {
        $('topup-custom-input').value = b.dataset.stars;
      });
    });
    $('topup-pay-btn').addEventListener('click', handleTopupPay);

    // Inventory filter pills
    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.invFilter = btn.dataset.filter;
        renderInventory();
      });
    });

    // Catalog search
    $('catalog-search').addEventListener('input', (e) => renderCatalogGrid(e.target.value));

    // Crash action
    $('crash-action-btn').addEventListener('click', handleCrashAction);

    // Wheel spin
    $('wheel-spin-btn').addEventListener('click', handleWheelSpin);

    // Mines buttons
    $('mines-start-btn').addEventListener('click', handleMinesStart);
    $('mines-cashout-btn').addEventListener('click', handleMinesCashout);

    // Plinko drop
    $('plinko-drop-btn').addEventListener('click', handlePlinkoDrop);

    // PvP join
    $('pvp-join-btn').addEventListener('click', handlePvpJoin);

    // Upgrader controls
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

    // Red/Black bet buttons
    $('rb-bet-red').addEventListener('click', () => handleRbBet('red'));
    $('rb-bet-black').addEventListener('click', () => handleRbBet('black'));

    // Craft slots & execute
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

    // Upgrade confirm
    $('upgrade-confirm-btn').addEventListener('click', handleUpgradeConfirm);

    // Admin actions
    $('admin-search-btn').addEventListener('click', handleAdminSearch);
    $('admin-refresh-users').addEventListener('click', loadAdminRecentUsers);
    $('admin-bal-add').addEventListener('click', () => handleAdminBalance(1));
    $('admin-bal-sub').addEventListener('click', () => handleAdminBalance(-1));
    $('admin-give-regular').addEventListener('click', () => handleAdminGiveGift(false));
    $('admin-give-upgraded').addEventListener('click', () => handleAdminGiveGift(true));
    $('admin-give-crafted').addEventListener('click', handleAdminGiveCrafted);
    $('admin-ban-toggle').addEventListener('click', handleAdminBanToggle);

    // Master animation loop for Crash canvas & countdown bars
    requestAnimationFrame(masterFrameLoop);
  }

  function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'craft') renderCraftSlots();
    if (tab === 'profile') renderUser();
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

    if (u.photoUrl) {
      $('profile-avatar').src = u.photoUrl;
      $('profile-avatar').classList.remove('hidden');
      $('profile-avatar-fallback').classList.add('hidden');
    } else {
      $('profile-avatar').classList.add('hidden');
      $('profile-avatar-fallback').classList.remove('hidden');
      $('profile-avatar-fallback').textContent = (u.firstName || 'U').charAt(0).toUpperCase();
    }

    // Revalidate craft slots against current inventory
    const invIds = new Set((u.inventory || []).map((g) => g.uid));
    state.craftSlots = state.craftSlots.map((g) => (g && invIds.has(g.uid) ? u.inventory.find((x) => x.uid === g.uid) : null));

    renderInventory();
    renderCraftSlots();
    updateUpgraderInfo();
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
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 0">Подарков пока нет. Откройте кейс или загляните в каталог TG!</div>`;
      return;
    }

    grid.innerHTML = '';
    for (const g of items) {
      const card = document.createElement('div');
      card.className = 'gift-card';
      card.style.background = giftBgStyle(g);

      const ribbonText = g.crafted
        ? g.craftTier
        : g.upgraded
          ? `#${g.mintNumber}`
          : 'Обычный';

      const ribbonClass = g.crafted
        ? `gift-card-ribbon tier-${g.craftTier}`
        : g.upgraded
          ? 'gift-card-ribbon'
          : 'gift-card-ribbon regular';

      card.innerHTML = `
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
          if (actBtn.dataset.act === 'sell') sellGift(g.uid);
          else if (actBtn.dataset.act === 'withdraw') withdrawGift(g.uid);
          return;
        }
        openTelegramGiftModal(g);
      });

      grid.appendChild(card);
    }
  }

  // ======================== EXACT TELEGRAM FULL-SCREEN GIFT VIEWER ========================
  function openTelegramGiftModal(g) {
    state.currentGift = g;
    const hero = $('tg-gift-hero');
    hero.style.background = giftBgStyle(g);

    // Floating Telegram pattern symbols around the gift
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

    // Tap artwork to play official Telegram Lottie animation if available!
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
        : 'Обычный подарок Telegram • можно улучшить';

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
      rows.push({ k: 'Статус', v: '<span class="rarity-pill">Не улучшен</span>' });
    }

    rows.push({ k: 'Оценка', v: `<span style="color:var(--gold)">⭐ ${formatStars(g.value)}</span>` });

    $('tg-traits-table').innerHTML = rows
      .map((r) => `<div class="trait-row"><span class="trait-key">${r.k}</span><span class="trait-val">${r.v}</span></div>`)
      .join('');

    const actions = $('tg-gift-actions');
    actions.innerHTML = '';

    if (!g.upgraded) {
      const upgBtn = document.createElement('button');
      upgBtn.className = 'tg-btn tg-btn-primary tg-btn-lg';
      upgBtn.innerHTML = '✨ Улучшить за 25 ⭐';
      upgBtn.onclick = () => {
        closeModal('modal-gift');
        openUpgradeModal(g);
      };
      actions.appendChild(upgBtn);
    } else if (!g.crafted) {
      const craftBtn = document.createElement('button');
      craftBtn.className = 'tg-btn tg-btn-craft tg-btn-lg';
      craftBtn.innerHTML = '⚒️ Отправить в Крафт';
      craftBtn.onclick = () => {
        closeModal('modal-gift');
        state.craftSlots = [g, null, null, null];
        switchTab('craft');
        showToast(`«${g.collectionName}» добавлен в слот крафта`, 'info');
      };
      actions.appendChild(craftBtn);
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'tg-gift-actions-row';

    const sellBtn = document.createElement('button');
    sellBtn.className = 'tg-btn tg-btn-gold';
    sellBtn.innerHTML = `Продать (${formatStars(g.value)} ⭐)`;
    sellBtn.onclick = async () => {
      await sellGift(g.uid);
      closeModal('modal-gift');
    };

    const wdBtn = document.createElement('button');
    wdBtn.className = 'tg-btn tg-btn-secondary';
    wdBtn.innerHTML = 'Вывести в TG';
    wdBtn.onclick = async () => {
      await withdrawGift(g.uid);
      closeModal('modal-gift');
    };

    rowDiv.appendChild(sellBtn);
    rowDiv.appendChild(wdBtn);
    actions.appendChild(rowDiv);

    openModal('modal-gift');
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
    }
  }

  // ======================== EXACT TELEGRAM GIFT UPGRADE (25 ⭐ + ROULETTE ANIMATION) ========================
  function openUpgradeModal(g) {
    state.upgradeTargetGift = g;
    $('upgrade-stage').style.background = 'radial-gradient(circle at 50% 45%, #2b4463 0%, #17212b 75%)';
    $('upgrade-preview-img').src = g.image;
    $('upgrade-roulette-label').textContent = `${g.collectionName} • Обычный`;
    $('upgrade-art-ring').className = 'upgrade-art-ring';
    $('upgrade-info-block').classList.remove('hidden');
    $('upgrade-confirm-btn').disabled = false;
    $('upgrade-confirm-btn').textContent = '✨ Улучшить за 25 ⭐';
    $('upg-modal-close').disabled = false;
    openModal('modal-upgrade');
  }

  async function handleUpgradeConfirm() {
    const g = state.upgradeTargetGift;
    if (!g) return;
    $('upgrade-confirm-btn').disabled = true;
    $('upg-modal-close').disabled = true;

    try {
      const res = await api('/api/gifts/upgrade', { method: 'POST', body: { uid: g.uid } });
      haptic('medium');
      await playTelegramUpgradeAnimation(res.gift, res.previewModels || [], res.previewBackdrops || []);
      state.user = res.user;
      renderUser();
      closeModal('modal-upgrade');
      openTelegramGiftModal(res.gift);
      showToast(`Улучшено! ${res.gift.collectionName} #${res.gift.mintNumber} (${res.gift.model.name})`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
      $('upgrade-confirm-btn').disabled = false;
      $('upg-modal-close').disabled = false;
    }
  }

  function playTelegramUpgradeAnimation(finalGift, previewModels, previewBackdrops) {
    return new Promise((resolve) => {
      const stage = $('upgrade-stage');
      const ring = $('upgrade-art-ring');
      const img = $('upgrade-preview-img');
      const label = $('upgrade-roulette-label');
      const canvas = $('upgrade-fx-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = stage.clientWidth || 360;
      canvas.height = stage.clientHeight || 270;

      ring.classList.add('spinning');
      $('upgrade-info-block').classList.add('hidden');

      // Preload candidate images
      previewModels.forEach((m) => { const im = new Image(); im.src = m.image; });
      const finalImg = new Image();
      finalImg.src = finalGift.image;

      const sparks = [];
      let burstDone = false;
      let startTs = performance.now();
      let lastSwap = 0;
      let stepIdx = 0;

      function spawnSparks(count, burst = false) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2 - 10;
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = burst ? (3 + Math.random() * 7) : (1 + Math.random() * 2.5);
          sparks.push({
            x: burst ? cx : cx + Math.cos(ang) * (70 + Math.random() * 75),
            y: burst ? cy : cy + Math.sin(ang) * (70 + Math.random() * 75),
            vx: burst ? Math.cos(ang) * spd : -Math.cos(ang) * spd * 1.1,
            vy: burst ? Math.sin(ang) * spd : -Math.sin(ang) * spd * 1.1,
            r: burst ? (2 + Math.random() * 3.5) : (1.5 + Math.random() * 2),
            life: 1,
            color: burst ? (Math.random() > 0.4 ? '#fde047' : '#ffffff') : '#60a5fa'
          });
        }
      }

      function tick(now) {
        const elapsed = now - startTs;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (elapsed < 2350) {
          // Accelerating then decelerating Telegram trait roulette
          const interval = elapsed < 1200 ? 95 : elapsed < 1850 ? 140 : 210;
          if (now - lastSwap > interval) {
            lastSwap = now;
            stepIdx++;
            if (previewModels.length) {
              const pm = previewModels[stepIdx % previewModels.length];
              img.src = pm.image;
              label.textContent = `Модель: ${pm.name}...`;
            }
            if (previewBackdrops.length) {
              const pb = previewBackdrops[stepIdx % previewBackdrops.length];
              stage.style.background = `radial-gradient(circle at 50% 45%, ${pb.center} 0%, ${pb.edge} 100%)`;
            }
            haptic('light');
          }
          spawnSparks(3, false);
        } else if (!burstDone) {
          burstDone = true;
          ring.classList.remove('spinning');
          ring.classList.add('revealed');
          img.src = finalGift.image;
          stage.style.background = giftBgStyle(finalGift);
          label.textContent = `${finalGift.model.name} • ${finalGift.backdrop.name} • #${finalGift.mintNumber}`;
          spawnSparks(65, true);
          haptic('success');
        }

        // Flash ring on reveal
        if (burstDone && elapsed < 2650) {
          const a = Math.max(0, 1 - (elapsed - 2350) / 300);
          ctx.fillStyle = `rgba(255, 250, 220, ${a * 0.7})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.028;
          if (p.life <= 0) { sparks.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (elapsed < 3250) {
          requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  // ======================== EXACT TELEGRAM GIFT CRAFTING (5 MODELS PER EVERY COLLECTION) ========================
  function renderCraftedShowcase(modelsList = null, collectionTitle = null) {
    const box = $('crafted-showcase');
    const list = modelsList || state.craftedCatalog;
    const headTitle = box.closest('.tg-card')?.querySelector('.card-title');
    if (headTitle) {
      headTitle.textContent = collectionTitle
        ? `5 крафт-моделей «${collectionTitle}»`
        : 'Эксклюзивные крафты (по 5 на каждую из 124 коллекций)';
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

  function renderCraftSlots() {
    const filled = state.craftSlots.filter(Boolean);
    const count = filled.length;
    const chance = CRAFT_CHANCES[count] || 0;
    const colName = count ? filled[0].collectionName : null;

    loadCraftModelsForCollection(colName);

    $('craft-collection-pill').textContent = colName ? `Коллекция: ${colName}` : 'Выберите коллекцию';
    $('craft-chance-value').textContent = `${chance}%`;
    const deg = (chance / 100) * 360;
    const ringColor = chance === 100 ? '#22c55e' : chance >= 60 ? '#f59e0b' : '#2ea6ff';
    $('craft-core-ring').style.background = `conic-gradient(${ringColor} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`;

    const submitBtn = $('craft-submit-btn');
    submitBtn.disabled = count === 0 || state.crafting;
    submitBtn.textContent = `⚒️ Скрафтить • ${chance}%`;

    const pctAdds = ['+10%', '+20%', '+30%', '+40%'];
    document.querySelectorAll('.craft-slot').forEach((slotBtn, idx) => {
      const g = state.craftSlots[idx];
      if (g) {
        slotBtn.classList.add('filled');
        slotBtn.style.background = giftBgStyle(g);
        slotBtn.innerHTML = `
          <span class="slot-remove">✕</span>
          <img src="${esc(g.image)}" alt="${esc(g.collectionName)}" />
          <span class="slot-label">${esc(g.model?.name || g.collectionName)}</span>
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

    // Attribute inheritance preview (just like Telegram!)
    const attrBox = $('craft-attr-preview');
    if (count >= 2) {
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
      : 'Выберите любой улучшенный подарок (обычные сначала улучшите в Профиле за 25 ⭐)';

    const grid = $('craft-picker-grid');
    if (!eligible.length) {
      grid.innerHTML = `<div class="empty-inline" style="grid-column:1/-1;padding:24px 8px">Нет подходящих улучшенных подарков. Улучшите обычные подарки в Профиле за 25 ⭐!</div>`;
    } else {
      grid.innerHTML = '';
      for (const g of eligible) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.style.background = giftBgStyle(g);
        card.innerHTML = `
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

  async function handleCraftSubmit() {
    const filled = state.craftSlots.filter(Boolean);
    if (!filled.length || state.crafting) return;
    state.crafting = true;
    renderCraftSlots();

    try {
      const res = await api('/api/gifts/craft', {
        method: 'POST',
        body: { uids: filled.map((g) => g.uid) }
      });

      haptic('heavy');
      await playCraftForgeAnimation(res.success, res.previewModels || [], res.resultGift);

      state.craftSlots = [null, null, null, null];
      state.user = res.user;
      state.crafting = false;
      renderUser();

      const content = $('craft-result-content');
      if (res.success && res.resultGift) {
        const g = res.resultGift;
        haptic('success');
        content.innerHTML = `
          <div style="width:130px;height:130px;margin:0 auto 12px;border-radius:24px;background:${giftBgStyle(g)};display:flex;align-items:center;justify-content:center;box-shadow:0 0 36px rgba(245,158,11,0.45)">
            <img src="${esc(g.image)}" style="width:104px;height:104px;object-fit:contain" />
          </div>
          <span class="crafted-mini-tier tier-${esc(g.craftTier)}" style="font-size:12px;padding:4px 12px">${esc(g.craftTier)}</span>
          <h3 class="sheet-title" style="margin-top:8px">✨ Крафт успешен!</h3>
          <p class="sheet-desc" style="margin-top:4px">Вы создали эксклюзивный подарок <b>${esc(giftDisplayName(g))}</b> #${g.mintNumber} (⭐ ${formatStars(g.value)})</p>
        `;
        showToast(`Успешный крафт: ${giftDisplayName(g)}!`, 'gold');
      } else {
        haptic('error');
        content.innerHTML = `
          <div style="font-size:56px;margin-bottom:8px">💨</div>
          <h3 class="sheet-title" style="color:var(--red)">Крафт не удался</h3>
          <p class="sheet-desc" style="margin-top:6px">Все ${res.burnedCount} добавленных подарка сгорели в горне. Попробуйте добавить больше подарков для повышения шанса до 100%!</p>
        `;
        showToast('Крафт не удался — подарки сгорели', 'error');
      }
      openModal('modal-craft-result');
    } catch (e) {
      state.crafting = false;
      renderCraftSlots();
      showToast(e.message, 'error');
    }
  }

  function playCraftForgeAnimation(success, previewModels = [], resultGift = null) {
    return new Promise((resolve) => {
      const hero = $('craft-hero');
      const anvilIcon = $('craft-anvil-icon');
      const canvas = $('craft-fx-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = hero.clientWidth || 360;
      canvas.height = hero.clientHeight || 360;

      hero.classList.add('forging');
      const cx = canvas.width / 2;
      const cy = 115;
      const particles = [];
      let climaxDone = false;
      let lastModelSwap = 0;
      let modelIdx = 0;
      const start = performance.now();

      previewModels.forEach((m) => { const im = new Image(); im.src = m.image; });

      function tick(now) {
        const t = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (t < 1900) {
          // Cycle through the 5 possible crafted models of this collection (roulette feel!)
          if (previewModels.length && now - lastModelSwap > (t < 1100 ? 110 : 180)) {
            lastModelSwap = now;
            const pm = previewModels[modelIdx % previewModels.length];
            modelIdx++;
            anvilIcon.innerHTML = `<img src="${esc(pm.image)}" style="width:46px;height:46px;object-fit:contain" />`;
            haptic('light');
          }
          // Energy vortex pulling sparks inward toward forge core
          for (let i = 0; i < 4; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 90 + Math.random() * 110;
            particles.push({
              mode: 'vortex',
              ang,
              dist,
              speed: 0.08 + Math.random() * 0.06,
              r: 1.8 + Math.random() * 2.5,
              color: Math.random() > 0.45 ? '#2ea6ff' : '#f59e0b'
            });
          }
        } else if (!climaxDone) {
          climaxDone = true;
          hero.classList.remove('forging');
          if (success) {
            if (resultGift?.image) {
              anvilIcon.innerHTML = `<img src="${esc(resultGift.image)}" style="width:52px;height:52px;object-fit:contain" />`;
            }
            for (let i = 0; i < 85; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 2.5 + Math.random() * 7.5;
              particles.push({
                mode: 'burst',
                x: cx, y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                r: 2 + Math.random() * 4,
                life: 1,
                color: Math.random() > 0.35 ? '#fde047' : '#ffffff'
              });
            }
          } else {
            anvilIcon.textContent = '💨';
            hero.classList.add('forge-fail');
            // Dark volcanic smoke + red embers
            for (let i = 0; i < 55; i++) {
              particles.push({
                mode: 'smoke',
                x: cx + (Math.random() - 0.5) * 90,
                y: cy + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 1.4,
                vy: -(0.9 + Math.random() * 2.2),
                r: 14 + Math.random() * 26,
                life: 1,
                color: i % 5 === 0 ? 'rgba(239,68,68,0.65)' : 'rgba(15,23,32,0.78)'
              });
            }
          }
        }

        // Flash on success climax
        if (climaxDone && success && t < 2350) {
          const a = Math.max(0, 1 - (t - 1900) / 450);
          ctx.fillStyle = `rgba(255, 250, 215, ${a * 0.85})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          if (p.mode === 'vortex') {
            p.ang += p.speed;
            p.dist -= 3.2;
            if (p.dist < 8) { particles.splice(i, 1); continue; }
            const x = cx + Math.cos(p.ang) * p.dist;
            const y = cy + Math.sin(p.ang) * p.dist;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(x, y, p.r, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.mode === 'burst') {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= 0.022;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.mode === 'smoke') {
            p.x += p.vx;
            p.y += p.vy;
            p.r += 0.45;
            p.life -= 0.018;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        if (t < 3100) {
          requestAnimationFrame(tick);
        } else {
          hero.classList.remove('forge-fail');
          anvilIcon.textContent = '⚒️';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  // ======================== GAME 1: CRASH ENGINE ========================
  function setCrashVisual(phase) {
    const stage = $('crash-stage');
    const multEl = $('crash-multiplier');
    const pill = $('crash-status-pill');
    const diceEl = $('crash-dice');
    const boomEl = $('crash-explosion');

    stage.classList.remove('crashed');
    multEl.classList.remove('flying', 'crashed');

    if (phase === 'waiting') {
      pill.textContent = 'Приём ставок...';
      multEl.textContent = '1.00x';
      diceEl.classList.remove('hidden');
      boomEl.classList.add('hidden');
      state.diceLottie?.play();
      state.explosionLottie?.stop();
    } else if (phase === 'running') {
      pill.textContent = 'В полёте 🚀';
      multEl.classList.add('flying');
      diceEl.classList.remove('hidden');
      boomEl.classList.add('hidden');
      state.diceLottie?.play();
    } else if (phase === 'crashed') {
      pill.textContent = 'КРАШ 💥';
      multEl.textContent = `${state.crash.multiplier.toFixed(2)}x`;
      multEl.classList.add('crashed');
      stage.classList.add('crashed');
      // Hide dice, play explosion.json ONCE in exact center!
      diceEl.classList.add('hidden');
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
    const fillBot = isCrashed ? 'rgba(239, 68, 68, 0.0)' : 'rgba(34, 197, 94, 0.0)';

    // Area under curve
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

    // Glowing main curve line
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

    // Leading dot
    ctx.beginPath();
    ctx.arc(endX, endY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function renderCrashHistory() {
    const box = $('crash-history');
    box.innerHTML = state.crash.history
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

  // ======================== GAME 2: LUCKY WHEEL (25 ⭐) ========================
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

    // Center hub
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
      const n = state.wheelSegments.length;
      const arc = (Math.PI * 2) / n;
      // Target angle so segmentIndex centers at top pointer (-PI/2)
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
          state.user = res.user;
          renderUser();
          state.wheelSpinning = false;
          $('wheel-spin-btn').disabled = false;
          haptic('success');
          if (res.wonGift) {
            showToast(`Выпал подарок Telegram: ${res.wonGift.collectionName}!`, 'gold');
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

  // ======================== GAME 3: MINES (5x5) ========================
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

  // ======================== GAME 4: PLINKO (PHYSICS CANVAS) ========================
  function initPlinkoBoard() {
    const box = $('plinko-buckets');
    box.innerHTML = state.plinkoMultipliers.map((m, i) => {
      const cls = m >= 2 ? 'high' : m >= 1 ? 'mid' : 'low';
      return `<div class="plinko-bucket ${cls}" id="plinko-b-${i}">x${m}</div>`;
    }).join('');
    drawPlinkoStatic();
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

    const pegs = getPlinkoPegCoords();
    for (const p of pegs) {
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

      // Build smooth parabolic bounce waypoints down the 8 peg rows
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
      // Final bucket alignment
      const finalX = (res.bucketIndex + 0.5) * (340 / 9);
      waypoints.push({ x: finalX, y: 288 });

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
          state.user = res.user;
          renderUser();
          state.plinkoDropping = false;
          $('plinko-drop-btn').disabled = false;
          haptic(res.multiplier >= 1 ? 'success' : 'light');
          showToast(`Плинко x${res.multiplier}: ${formatStars(res.payout)} ⭐`, res.multiplier >= 1 ? 'gold' : 'info');
          return;
        }

        segT += 0.14;
        const t = Math.min(1, segT);
        const bx = a.x + (b.x - a.x) * t;
        const arcLift = Math.sin(t * Math.PI) * 9;
        const by = a.y + (b.y - a.y) * t - arcLift;
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

  // ======================== GAME 5: PVP WHEEL ========================
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

  // ======================== GAME 6: UPGRADER (HONEST CHANCE) ========================
  function initUpgraderCanvas() {
    updateUpgraderInfo();
    drawUpgraderWheel();
  }

  function updateUpgraderInfo() {
    const bet = Math.max(5, Math.floor(Number($('upg-bet-input').value) || 25));
    const mult = state.upg.multiplier;
    const chance = Number((100 / mult).toFixed(2));
    $('upg-chance-badge').textContent = `Шанс: ${chance}%`;
    $('upg-mult-display').textContent = `x${mult}`;
    $('upg-payout-display').textContent = `${formatStars(Math.floor(bet * mult))} ⭐`;
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

    const chance = 100 / state.upg.multiplier;
    const winRad = (chance / 100) * Math.PI * 2;
    const startRad = -Math.PI / 2;

    ctx.clearRect(0, 0, w, h);

    // LOSE background ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#243447';
    ctx.lineWidth = 22;
    ctx.stroke();

    // WIN green arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startRad, startRad + winRad);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 22;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // Spinning pointer needle on outer rim
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

  async function handleUpgraderPlay() {
    if (state.upg.spinning) return;
    state.upg.spinning = true;
    $('upg-play-btn').disabled = true;

    try {
      const bet = Math.floor(Number($('upg-bet-input').value));
      const res = await api('/api/games/upgrader/play', {
        method: 'POST',
        body: { bet, multiplier: state.upg.multiplier }
      });

      const startDeg = state.upg.pointerAngle % 360;
      const targetDeg = 360 * 5 + res.stopAngle;
      const t0 = performance.now();
      const dur = 3200;

      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        state.upg.pointerAngle = startDeg + (targetDeg - startDeg) * eased;
        drawUpgraderWheel();
        if (p < 1) requestAnimationFrame(step);
        else {
          state.upg.pointerAngle = res.stopAngle;
          drawUpgraderWheel();
          state.user = res.user;
          renderUser();
          state.upg.spinning = false;
          $('upg-play-btn').disabled = false;
          if (res.won) {
            haptic('success');
            showToast(`Апгрейд успешен! +${formatStars(res.payout)} ⭐`, 'success');
          } else {
            haptic('error');
            showToast('Не повезло — сектор LOSE', 'error');
          }
        }
      }
      requestAnimationFrame(step);
    } catch (e) {
      state.upg.spinning = false;
      $('upg-play-btn').disabled = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== GAME 7: RED / BLACK (15s) ========================
  function initRedBlackTape() {
    const tape = $('rb-tape');
    let html = '';
    for (let i = 0; i < 60; i++) {
      const isRed = i % 2 === 0;
      html += `<div class="rb-tile ${isRed ? 'red' : 'black'}">${isRed ? '🔴' : '⚫'}</div>`;
    }
    tape.innerHTML = html;
  }

  function renderRbHistory() {
    $('rb-history').innerHTML = state.rb.history
      .map((c) => `<span class="rb-dot ${c}"></span>`)
      .join('');
  }

  function renderRbBets() {
    const list = $('rb-bets-list');
    if (!state.rb.bets.length) {
      list.innerHTML = '<div class="empty-inline">Ожидание ставок...</div>';
      return;
    }
    list.innerHTML = state.rb.bets.map((b) => `
      <div class="player-row">
        <div class="player-left">
          <span>${b.color === 'red' ? '🔴' : '⚫'}</span>
          <div class="player-name">${esc(b.firstName)}</div>
        </div>
        <span class="player-status live">${formatStars(b.amount)} ⭐</span>
      </div>
    `).join('');
  }

  function animateRedBlackSpin(winnerColor, payouts) {
    const tape = $('rb-tape');
    tape.style.transition = 'none';
    tape.style.transform = 'translateX(0px)';

    // Pick tile index 42 (red = even) or 43 (black = odd)
    const targetIdx = winnerColor === 'red' ? 42 : 43;
    const tileStep = 66; // 60px width + 6px gap
    const windowW = tape.parentElement.clientWidth || 320;
    const targetX = -(targetIdx * tileStep + 36 - windowW / 2);

    requestAnimationFrame(() => {
      tape.style.transition = 'transform 3.6s cubic-bezier(0.12, 0.85, 0.15, 1)';
      tape.style.transform = `translateX(${targetX}px)`;
    });

    setTimeout(() => {
      renderRbHistory();
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

  // ======================== TAB 3: CASES (ROULETTE TAPE) ========================
  function renderCases() {
    const grid = $('cases-grid');
    grid.innerHTML = '';
    for (const c of state.cases) {
      const card = document.createElement('div');
      card.className = 'case-card';
      card.style.borderColor = `${c.accent}44`;
      card.innerHTML = `
        <img src="${esc(c.cover)}" alt="${esc(c.name)}" />
        <div class="case-card-title">${esc(c.name)}</div>
        <div class="case-card-sub">${esc(c.subtitle)}</div>
        <button type="button" class="tg-btn tg-btn-primary" style="width:100%;background:${esc(c.accent)}">
          Открыть • ${formatStars(c.price)} ⭐
        </button>
      `;
      card.querySelector('button').onclick = () => openCase(c);
      grid.appendChild(card);
    }
  }

  async function openCase(caseDef) {
    if (state.caseOpening) return;
    state.caseOpening = true;
    $('case-active-name').textContent = caseDef.name;

    try {
      const res = await api('/api/games/case/open', { method: 'POST', body: { caseId: caseDef.id } });
      const strip = $('case-strip');
      strip.style.transition = 'none';
      strip.style.transform = 'translateX(0px)';

      strip.innerHTML = res.strip.map((item) => `
        <div class="case-item-tile" style="background:radial-gradient(circle at 50% 40%, ${esc(item.center)}, ${esc(item.edge)})">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" />
          <span>${esc(item.name)}</span>
        </div>
      `).join('');

      const tileStep = 96; // 88px + 8px gap
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
        haptic('success');
        showToast(`Из кейса выпал: ${res.wonGift.collectionName}!`, 'gold');
        openTelegramGiftModal(res.wonGift);
      }, 4600);
    } catch (e) {
      state.caseOpening = false;
      showToast(e.message, 'error');
    }
  }

  // ======================== CATALOG (ALL 124 REAL TELEGRAM GIFTS) ========================
  async function openCatalogModal() {
    openModal('modal-catalog');
    if (!state.catalog.length) {
      $('catalog-grid').innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Загрузка 124 коллекций Telegram...</div>';
      try {
        const res = await api('/api/catalog');
        state.catalog = res.collections || [];
      } catch (e) {
        showToast(e.message, 'error');
        return;
      }
    }
    renderCatalogGrid($('catalog-search').value || '');
  }

  function renderCatalogGrid(query = '') {
    const q = query.trim().toLowerCase();
    const list = q
      ? state.catalog.filter((c) => c.name.toLowerCase().includes(q))
      : state.catalog;
    const grid = $('catalog-grid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty-inline" style="grid-column:1/-1">Ничего не найдено</div>';
      return;
    }
    grid.innerHTML = '';
    for (const c of list) {
      const card = document.createElement('div');
      card.className = 'catalog-card';
      card.innerHTML = `
        <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" />
        <div class="catalog-name">${esc(c.name)}</div>
        <div class="catalog-meta">${c.modelsCount} мод. • ${c.backdropsCount} фон.</div>
        <button type="button" class="catalog-buy-btn">⭐ ${formatStars(c.price)}</button>
      `;
      card.querySelector('button').onclick = async () => {
        try {
          const res = await api('/api/gifts/buy', { method: 'POST', body: { collectionName: c.name } });
          state.user = res.user;
          renderUser();
          haptic('success');
          showToast(`Куплен подарок «${c.name}»! Откройте его в Профиле для улучшения за 25 ⭐`, 'success');
        } catch (e) {
          showToast(e.message, 'error');
        }
      };
      grid.appendChild(card);
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
      state.catalog = res.collections || [];
      $('admin-gift-select').innerHTML = state.catalog
        .map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${c.modelsCount} мод.)</option>`)
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
    // 1. Crash Canvas
    if ($('game-crash')?.classList.contains('active')) {
      drawCrashGraph();
    }

    // 2. Red/Black 15s countdown bar
    if (state.rb.phase === 'betting') {
      const leftMs = Math.max(0, state.rb.endsAt - Date.now());
      $('rb-timer-badge').textContent = `${(leftMs / 1000).toFixed(1)}с`;
      $('rb-progress-fill').style.width = `${(leftMs / 15000) * 100}%`;
    } else {
      $('rb-timer-badge').textContent = 'Крутим...';
      $('rb-progress-fill').style.width = '0%';
    }

    // 3. PvP Countdown
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
