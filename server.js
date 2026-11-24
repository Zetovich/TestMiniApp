require('dotenv').config();
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

// ======================== CONFIGURATION ========================
const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '9094198940:AAG0ofO0UaeGFQWaD3O2Kfje6ubiu_7Ds74';
const ADMIN_ID = String(process.env.ADMIN_ID || '8213153991');
const ADMIN_LOG_CHAT_ID = String(process.env.ADMIN_LOG_CHAT_ID || ADMIN_ID);
let DETECTED_WEBAPP_URL = (process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '').replace(/\/+$/, '');
const UPGRADE_COST = 25;
const WHEEL_COST = 10;
const INIT_DATA_MAX_AGE_SEC = 86400; // 24 hours

// ======================== MRKT / PORTALS / TONNEL MARKET PRICING (TON FLOOR + 0.3 TON COMMISSION -> STARS) ========================
const MARKET_COMMISSION_TON = Number(process.env.MARKET_COMMISSION_TON) || 0.3;
let LIVE_TON_USD = 1.01;
let STARS_PER_TON = Number(process.env.STARS_PER_TON) || 70; // Real Nov 2026 rate: 1 TON (~$1.01) / $0.0145 ≈ 70 Stars

// Live market floor prices in TON across MRKT, Portals, Tonnel, GetGems & Fragment (all 124 collections)
const MRKT_COLLECTION_FLOORS_TON = {
  'Plush Pepe': 7140.0, 'Heart Locket': 1600.0, 'Algorithm Cup': 1440.0, 'Intelligence Cup': 1019.0,
  'Resistance Dog': 527.7, "Durov's Cap": 425.1, 'Scared Cat': 294.8, 'Precious Peach': 292.7,
  'Heroic Helmet': 193.8, 'Loot Bag': 147.2, "Durov's Glasses": 145.9, 'Nail Bracelet': 143.3,
  'Astral Shard': 141.8, 'Westside Sign': 137.5, 'Mighty Arm': 132.6, 'Perfume Bottle': 91.9,
  'Low Rider': 89.8, 'Ion Gem': 88.0, 'Artisan Brick': 81.8, 'Mini Oscar': 76.0,
  'Gem Signet': 74.4, 'Magic Potion': 70.3, 'Swiss Watch': 69.5, 'Kissed Frog': 57.1,
  'Sharp Tongue': 53.8, 'Bonded Ring': 51.7, 'Vintage Cigar': 47.8, 'Voodoo Doll': 45.2,
  'Neko Helmet': 44.4, 'Diamond Ring': 42.2, 'Toy Bear': 40.2, 'Genie Lamp': 39.2,
  'Signet Ring': 38.6, 'Electric Skull': 33.3, 'Eternal Rose': 33.0, "Khabib's Papakha": 31.9,
  'Rare Bird': 31.6, 'Bling Binky': 30.6, 'Cupid Charm': 26.4, 'Sky Stilettos': 24.8,
  'Trapped Heart': 20.1, 'UFC Strike': 19.7, 'Snoop Cigar': 18.2, 'Ionic Dryer': 18.1,
  'Love Potion': 17.6, 'Lucky Locket': 15.1, 'Crystal Ball': 14.8, 'Record Player': 14.6,
  'Flying Broom': 14.4, 'Valentine Box': 14.3, 'Skull Flower': 13.6, 'Mad Pumpkin': 13.2,
  'Love Candle': 12.6, 'Sakura Flower': 12.4, 'Jingle Bells': 11.1, 'Top Hat': 10.9,
  'Hanging Star': 10.6, 'Jelly Bunny': 10.6, 'Sleigh Bell': 10.2, 'Bunny Muffin': 10.0,
  'Berry Box': 9.93, 'Joyful Bundle': 9.53, 'Jolly Chimp': 9.43, 'Snow Mittens': 9.35,
  'Myth Mask': 9.18, 'Fine Pen': 9.03, 'Evil Eye': 8.84, 'Santa Hat': 8.78,
  'Snow Globe': 8.14, 'Surge Board': 7.79, 'Spy Agaric': 7.57, 'Input Key': 7.48,
  'Light Sword': 7.03, 'Moon Pendant': 7.01, 'Faith Amulet': 7.0, 'Liberty Figure': 6.87,
  'Snoop Dogg': 6.75, 'Swag Bag': 6.72, 'Lush Bouquet': 6.62, 'Spring Basket': 6.62,
  'Eternal Candle': 6.61, 'Witch Hat': 6.58, 'Bow Tie': 6.53, 'Restless Jar': 6.33,
  'Desk Calendar': 6.23, 'Cookie Heart': 6.13, 'Clover Pin': 6.01, 'Mousse Cake': 5.91,
  'Winter Wreath': 5.9, 'Party Sparkler': 5.87, 'Homemade Cake': 5.82, 'Hex Pot': 5.8,
  'Stellar Rocket': 5.8, 'B-Day Candle': 5.71, 'Pretty Posy': 5.71, 'Money Pot': 5.69,
  'Ginger Cookie': 5.62, 'Spiced Wine': 5.59, 'Star Notepad': 5.52, 'Timeless Book': 5.52,
  'Holiday Drink': 5.41, 'Mood Pack': 5.37, 'Tama Gadget': 5.36, 'Happy Brownie': 5.31,
  'Victory Medal': 5.31, 'Fresh Socks': 5.21, 'Hypno Lollipop': 5.19, 'Jack-in-the-Box': 5.14,
  'Jester Hat': 5.07, 'Pet Snake': 5.02, 'Easter Egg': 5.01, 'Chill Flame': 4.92,
  'Lol Pop': 4.92, 'Big Year': 4.91, 'Ice Cream': 4.91, 'Mirage Lamp': 4.89,
  'Pool Float': 4.88, 'Vice Cream': 4.85, 'Candy Cane': 4.82, 'Whip Cupcake': 4.81,
  'Lunar Snake': 4.8, 'Xmas Stocking': 4.8, 'Instant Ramen': 4.79, 'Snake Box': 3.63
};

// Only Black / Onyx Black backdrops command a true high-tier floor premium on MRKT
const MRKT_BACKDROP_FLOORS_TON = {
  'Black': 20.0,
  'Onyx Black': 15.0
};

const MONOCHROME_MODEL_RE = /\b(monochrome|black|onyx|obsidian|noir|shadow|dark|midnight|ink|ghost|sketch|emo|b&w|carbon|charcoal|jet|ash|silver|platinum|chrome|white|grey|gray|void|eclipse|matte|phantom)\b/i;
const MONOCHROME_BG_RE = /\b(black|onyx|midnight|silver|steel|platinum|iron|ash|slate|charcoal|white|ivory|grey|gray|obsidian|smoke)\b/i;

function getCollectionFloorTon(col) {
  if (!col) return 4.8;
  if (MRKT_COLLECTION_FLOORS_TON[col.name] !== undefined) {
    return Math.max(2.0, MRKT_COLLECTION_FLOORS_TON[col.name]);
  }
  return Math.max(3.5, Number(((col.basePrice || col.price || 500) / 140).toFixed(2)));
}

function getBackdropFloorTon(backdropName) {
  if (!backdropName) return 0;
  return MRKT_BACKDROP_FLOORS_TON[backdropName] || 0;
}

function tonWithCommissionToStars(floorTon) {
  const cleanFloor = Math.max(2.0, Number(floorTon) || 4.8);
  const rawMarketTon = Number((cleanFloor + MARKET_COMMISSION_TON).toFixed(2));
  const stars = Math.max(150, Math.round(rawMarketTon * STARS_PER_TON));
  const marketTon = Number((stars / Math.max(1, STARS_PER_TON)).toFixed(2));
  return { floorTon: Number(cleanFloor.toFixed(2)), marketTon, stars };
}

function computeCollectionMarketPrice(col) {
  return tonWithCommissionToStars(getCollectionFloorTon(col));
}

function isMonochromeCombo(modelName, backdropName) {
  const m = String(modelName || '');
  const b = String(backdropName || '');
  if (!m || !b) return false;
  if (MONOCHROME_MODEL_RE.test(m) && MONOCHROME_BG_RE.test(b)) return true;
  // Exact color tone match between model name & backdrop name (e.g., "Pink ..." on "... Pink")
  const colorWords = ['red', 'blue', 'green', 'gold', 'pink', 'purple', 'violet', 'cyan', 'emerald', 'ruby', 'sapphire', 'amber', 'orange', 'yellow', 'mint', 'crimson', 'lavender', 'coral', 'teal', 'indigo'];
  const ml = m.toLowerCase();
  const bl = b.toLowerCase();
  for (const w of colorWords) {
    if (ml.includes(w) && bl.includes(w)) return true;
  }
  return false;
}

function computeNftMarketPrice(col, modelRarity, backdropName, modelName = '') {
  const colFloor = getCollectionFloorTon(col);
  const bg = String(backdropName || '');
  const isBlackBg = bg === 'Black';
  const isOnyxBg = bg === 'Onyx Black';
  const isMono = isMonochromeCombo(modelName, bg);

  // Regular upgrades: modest realistic boost max 1.05x–1.28x (never > 1.30x!)
  const baseMult = modelRarity <= 0.5 ? 1.28
    : modelRarity <= 1.0 ? 1.22
      : modelRarity <= 1.5 ? 1.16
        : modelRarity <= 2.5 ? 1.10
          : 1.05;

  let combinedFloorTon = colFloor * baseMult;

  // Significant price premium ONLY for Black, Onyx Black, or Monochrome model+backdrop combos!
  if (isBlackBg) {
    const blackMult = isMono ? 2.65 : 2.15;
    combinedFloorTon = Math.max(colFloor * blackMult, colFloor + 20.0);
  } else if (isOnyxBg) {
    const onyxMult = isMono ? 2.35 : 1.85;
    combinedFloorTon = Math.max(colFloor * onyxMult, colFloor + 15.0);
  } else if (isMono) {
    combinedFloorTon = colFloor * (modelRarity <= 1.0 ? 1.95 : 1.65);
  }

  return tonWithCommissionToStars(combinedFloorTon);
}

function computeCraftedMarketPrice(baseCol, craftedSpec, backdropName) {
  const colFloor = getCollectionFloorTon(baseCol);
  const tierMult = craftedSpec.tier === 'Legendary' ? 3.2
    : craftedSpec.tier === 'Epic' ? 2.3
      : craftedSpec.tier === 'Rare' ? 1.7
        : 1.3;
  let combinedFloorTon = colFloor * tierMult;
  if (backdropName === 'Black') {
    combinedFloorTon = Math.max(combinedFloorTon * 1.45, combinedFloorTon + 20.0);
  } else if (backdropName === 'Onyx Black') {
    combinedFloorTon = Math.max(combinedFloorTon * 1.3, combinedFloorTon + 15.0);
  }
  return tonWithCommissionToStars(combinedFloorTon);
}

function refreshCatalogMarketPrices() {
  for (const col of CATALOG.collections) {
    if (!col.basePrice) col.basePrice = col.price;
    const mp = computeCollectionMarketPrice(col);
    col.floorTon = mp.floorTon;
    col.marketTon = mp.marketTon;
    col.price = mp.stars;
  }
}

async function syncLiveTonRate() {
  if (process.env.STARS_PER_TON) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ZetGifts/2.0' }
    });
    clearTimeout(timer);
    const data = await r.json().catch(() => null);
    const usd = Number(data?.['the-open-network']?.usd);
    if (Number.isFinite(usd) && usd > 0.2 && usd < 50) {
      LIVE_TON_USD = Number(usd.toFixed(3));
      STARS_PER_TON = Math.max(45, Math.round(usd / 0.0145));
      refreshCatalogMarketPrices();
      rebuildCasesMeta();
      console.log(`[MRKT] Live TON=$${LIVE_TON_USD} -> 1 TON = ${STARS_PER_TON} Stars (+${MARKET_COMMISSION_TON} TON fee)`);
    }
  } catch {
    // Keep default STARS_PER_TON gracefully
  }
}

// ======================== CATALOG LOADING ========================
const CATALOG_PATH = path.join(__dirname, 'gifts_catalog.json');
const CATALOG = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const CDN_BASE = CATALOG.cdn || 'https://cdn.changes.tg/gifts';

const COLLECTIONS_BY_NAME = new Map();
const COLLECTIONS_BY_ID = new Map();
for (const col of CATALOG.collections) {
  COLLECTIONS_BY_NAME.set(col.name, col);
  COLLECTIONS_BY_ID.set(col.id, col);
}
refreshCatalogMarketPrices();

const CRAFTED_BY_ID = new Map();
for (const col of CATALOG.collections) {
  for (const cm of (col.craftedModels || [])) {
    CRAFTED_BY_ID.set(cm.id, cm);
  }
}
for (const c of (CATALOG.crafted || [])) {
  if (!CRAFTED_BY_ID.has(c.id)) CRAFTED_BY_ID.set(c.id, c);
}

const BASIC_GIFTS = Array.isArray(CATALOG.basicGifts) ? CATALOG.basicGifts : [];
const BASIC_BY_SLUG = new Map();
for (const bg of BASIC_GIFTS) BASIC_BY_SLUG.set(bg.slug, bg);

function encodeCdnPart(str) {
  return encodeURIComponent(String(str).replace(/\u2019/g, "'").replace(/\//g, '\\'));
}

function getOriginalImage(col) {
  if (col.local) return col.local;
  return `${CDN_BASE}/originals/${col.id}/Original.png`;
}

function getOriginalLottie(col) {
  return `${CDN_BASE}/originals/${col.id}/Original.json`;
}

function getModelImage(colName, modelName) {
  return `${CDN_BASE}/models/${encodeURIComponent(colName)}/png/${encodeCdnPart(modelName)}.png`;
}

function getModelLottie(colName, modelName) {
  return `${CDN_BASE}/models/${encodeURIComponent(colName)}/lottie/${encodeCdnPart(modelName)}.json`;
}

function getPatternImage(colName, symbolName) {
  return `${CDN_BASE}/patterns/${encodeURIComponent(colName)}/png/${encodeCdnPart(symbolName)}.png`;
}

function weightedPick(items, weightFn) {
  let total = 0;
  for (const item of items) total += Math.max(0.01, Number(weightFn(item)) || 1);
  let r = crypto.randomInt(0, 1000000) / 1000000 * total;
  for (const item of items) {
    r -= Math.max(0.01, Number(weightFn(item)) || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function makeUid() {
  return crypto.randomBytes(8).toString('hex');
}

// ======================== BUILT-IN JSON / IN-MEMORY STORE (NO MONGODB REQUIRED) ========================
const SERVER_BOOT_ID = crypto.randomBytes(6).toString('hex');
const LEGACY_DB_FILE = path.join(__dirname, 'db.json');
const DB_HASH = crypto.createHash('md5').update(__dirname).digest('hex').slice(0, 8);
const DB_FILE = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(os.tmpdir(), `zetgifts_db_${DB_HASH}.json`);

const memDb = {
  users: {},      // telegramId -> user object
  counters: {},   // key -> seq number
  rounds: [],     // recent game rounds
  alerts: [],     // recent admin alerts (big drops & suspicious actions)
  promoCodes: []  // admin-managed promo codes for the Promo Case
};

// ======================== PROVABLY FAIR (SHA-256 COMMIT-REVEAL) ========================
function sha256Hex(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

function hmacFloat01(serverSeed, message) {
  const hex = crypto.createHmac('sha256', String(serverSeed)).update(String(message)).digest('hex');
  // First 13 hex chars = 52 bits precision in [0, 1)
  const int52 = parseInt(hex.slice(0, 13), 16);
  return int52 / 0x10000000000000;
}

function ensureUserPf(user) {
  if (!user.pf || typeof user.pf !== 'object') {
    const seed = crypto.randomBytes(32).toString('hex');
    user.pf = {
      serverSeed: seed,
      serverSeedHash: sha256Hex(seed),
      clientSeed: crypto.randomBytes(8).toString('hex'),
      nonce: 0,
      history: []
    };
  }
  if (!user.pf.serverSeed) {
    user.pf.serverSeed = crypto.randomBytes(32).toString('hex');
    user.pf.serverSeedHash = sha256Hex(user.pf.serverSeed);
  }
  if (!user.pf.serverSeedHash) user.pf.serverSeedHash = sha256Hex(user.pf.serverSeed);
  if (!user.pf.clientSeed) user.pf.clientSeed = crypto.randomBytes(8).toString('hex');
  if (!Number.isFinite(Number(user.pf.nonce))) user.pf.nonce = 0;
  if (!Array.isArray(user.pf.history)) user.pf.history = [];
  return user.pf;
}

function consumeUserPfRoll(user, gameLabel) {
  const pf = ensureUserPf(user);
  const usedServerSeed = pf.serverSeed;
  const usedHash = pf.serverSeedHash;
  const usedClientSeed = pf.clientSeed;
  const usedNonce = pf.nonce;
  const roll01 = hmacFloat01(usedServerSeed, `${usedClientSeed}:${usedNonce}`);

  // Immediately rotate serverSeed for the next round!
  const nextSeed = crypto.randomBytes(32).toString('hex');
  pf.serverSeed = nextSeed;
  pf.serverSeedHash = sha256Hex(nextSeed);
  pf.nonce = usedNonce + 1;

  const record = {
    game: gameLabel,
    serverSeed: usedServerSeed,
    serverSeedHash: usedHash,
    clientSeed: usedClientSeed,
    nonce: usedNonce,
    roll: Number((roll01 * 100).toFixed(4)),
    createdAt: Date.now()
  };
  pf.history.unshift(record);
  if (pf.history.length > 25) pf.history = pf.history.slice(0, 25);

  return {
    roll01,
    record,
    nextServerSeedHash: pf.serverSeedHash,
    nextNonce: pf.nonce
  };
}

// ======================== LIVE FEEDS (CONTEXTUAL PER GAME) ========================
const liveFeeds = {
  cases: [],     // { id, caseId, caseName, caseCover, firstName, photoUrl, isStars, amount, giftName, giftImage, value, createdAt }
  craft: [],     // { id, firstName, photoUrl, giftName, giftImage, tier, chance, value, createdAt }
  crash: [],     // { id, firstName, photoUrl, bet, mult, payout, createdAt }
  wheel: [],     // { id, firstName, photoUrl, isStars, amount, giftName, giftImage, value, createdAt }
  upgrader: [],  // { id, firstName, photoUrl, bet, mult, payout, giftName, giftImage, createdAt }
  slots: [],     // { id, firstName, photoUrl, bet, mult, payout, mode, createdAt }
  auction: [],
  safe: [],
  singularity: []
};

function pushLiveFeed(channel, entry) {
  if (!liveFeeds[channel]) return;
  const item = { id: makeUid(), createdAt: Date.now(), ...entry };
  liveFeeds[channel].unshift(item);
  if (liveFeeds[channel].length > 25) liveFeeds[channel].pop();
  if (typeof io !== 'undefined' && io) {
    io.emit('feed:update', { channel, item });
  }
}

// Deferred reward & feed publisher: NEVER credits rewards or spoils results before the game animation finishes!
const pendingFeeds = new Map(); // token -> { ownerId, timer, publish }
let activePvpPendingSettle = null;

function schedulePendingFeed(ownerId, fallbackDelayMs, publishFn) {
  const token = makeUid();
  let runPromise = null;
  const run = () => {
    if (runPromise) return runPromise;
    const entry = pendingFeeds.get(token);
    if (entry && entry.timer) clearTimeout(entry.timer);
    pendingFeeds.delete(token);
    runPromise = Promise.resolve()
      .then(() => publishFn())
      .catch((err) => {
        console.warn('[PendingSettlement]', err?.message || err);
      });
    return runPromise;
  };
  const timer = setTimeout(() => { run(); }, Math.max(1500, Number(fallbackDelayMs) || 10000));
  pendingFeeds.set(token, { ownerId: String(ownerId), timer, publish: run });
  return token;
}

async function flushAllPendingSettlements() {
  const tasks = [];
  for (const [, entry] of Array.from(pendingFeeds.entries())) {
    tasks.push(entry.publish());
  }
  if (typeof activePvpPendingSettle === 'function') {
    const fn = activePvpPendingSettle;
    activePvpPendingSettle = null;
    tasks.push(Promise.resolve().then(() => fn()));
  }
  if (tasks.length) {
    await Promise.allSettled(tasks);
  }
  saveDbNow();
}

// ======================== ADMIN ALERTS & SUSPICIOUS ACTIVITY MONITOR ========================
const onlineSocketsByUser = new Map(); // telegramId -> Set<socketId>
const userRateBuckets = new Map();     // telegramId -> { ts: number[] }
const userWinStreaks = new Map();      // telegramId -> number

function logAdminEvent(kind, title, details = '', userObj = null) {
  const alert = {
    id: makeUid(),
    kind, // 'drop' | 'suspicious' | 'admin'
    title,
    details,
    telegramId: userObj?.telegramId || '',
    username: userObj?.username || '',
    firstName: userObj?.firstName || '',
    createdAt: new Date().toISOString()
  };
  if (!Array.isArray(memDb.alerts)) memDb.alerts = [];
  memDb.alerts.unshift(alert);
  if (memDb.alerts.length > 60) memDb.alerts = memDb.alerts.slice(0, 60);
  scheduleDbSave();

  if (typeof io !== 'undefined') {
    io.to('admin_room').emit('admin:alert', alert);
  }

  // Send real-time notification to Admin Log Telegram Chat ONLY if explicitly enabled in Admin Panel (OFF by default!)
  const dmOn = typeof adminConfig !== 'undefined' && Boolean(adminConfig.botDmAlerts);
  if (dmOn && BOT_TOKEN && ADMIN_LOG_CHAT_ID && process.env.DISABLE_BOT !== '1') {
    const tag = kind === 'suspicious' ? '[АЛЕРТ]' : kind === 'drop' ? '[ДРОП]' : '[АДМИН]';
    const escHtml = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const who = userObj
      ? `\n<b>Игрок:</b> <a href="tg://user?id=${escHtml(userObj.telegramId)}">${escHtml(userObj.firstName)}</a> ${userObj.username ? `(@${escHtml(userObj.username)})` : ''} [<code>${escHtml(userObj.telegramId)}</code>]`
      : '';
    const msg = `<b>${tag} ${escHtml(title)}</b>${who}${details ? `\n${escHtml(details)}` : ''}`;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_LOG_CHAT_ID, text: msg, parse_mode: 'HTML' })
    }).catch(() => {});
  }
}

function trackSuspiciousOutcome(user, gameKey, bet, win, mult = 0) {
  if (!user) return;
  const uid = String(user.telegramId);
  if (win > bet && win >= 50) {
    const nextStreak = (userWinStreaks.get(uid) || 0) + 1;
    userWinStreaks.set(uid, nextStreak);
    if (nextStreak === 5 || (nextStreak > 5 && nextStreak % 3 === 0)) {
      logAdminEvent(
        'suspicious',
        `Серия из ${nextStreak} побед подряд!`,
        `Игра: ${gameKey}, последняя ставка ${bet}, выигрыш ${win} звёзд`,
        user
      );
    }
  } else if (win < bet) {
    userWinStreaks.set(uid, 0);
  }
  if (win >= 1500 || (mult >= 10 && win >= 300)) {
    logAdminEvent(
      'drop',
      `Крупный выигрыш в ${gameKey}!`,
      `Ставка: ${bet} → Выигрыш: ${win} звёзд${mult ? ` (x${mult})` : ''}`,
      user
    );
  }
}

let saveTimer = null;
let lastDbMtimeMs = 0;

function applyRawDb(raw) {
  if (!raw || typeof raw !== 'object') return;
  if (raw.users && typeof raw.users === 'object') {
    const nextUsers = {};
    for (const [k, u] of Object.entries(raw.users)) {
      if (!u || typeof u !== 'object') continue;
      const id = String(u.telegramId || k).trim();
      u.telegramId = id;
      if (!Array.isArray(u.inventory)) u.inventory = [];
      if (!Array.isArray(u.history)) u.history = [];
      u.rev = Number(u.rev) || 1;
      nextUsers[id] = u;
    }
    memDb.users = nextUsers;
  }
  if (raw.counters && typeof raw.counters === 'object') memDb.counters = raw.counters;
  if (Array.isArray(raw.rounds)) memDb.rounds = raw.rounds;
  if (Array.isArray(raw.alerts)) memDb.alerts = raw.alerts;
  if (Array.isArray(raw.promoCodes)) memDb.promoCodes = raw.promoCodes;
  if (raw.gameRounds && typeof raw.gameRounds === 'object') memDb.gameRounds = raw.gameRounds;
  if (raw.gameTotals && typeof raw.gameTotals === 'object') memDb.gameTotals = raw.gameTotals;
  if (Array.isArray(raw.liveRadar)) memDb.liveRadar = raw.liveRadar;
  if (Array.isArray(raw.withdrawRequests)) memDb.withdrawRequests = raw.withdrawRequests;
  if (Array.isArray(raw.adminAudit)) memDb.adminAudit = raw.adminAudit;
  if (Array.isArray(raw.starDeposits)) memDb.starDeposits = raw.starDeposits;
  if (raw.p2pAuction && typeof raw.p2pAuction === 'object') {
    memDb.p2pAuction = {
      active: Array.isArray(raw.p2pAuction.active) ? raw.p2pAuction.active : [],
      queue: Array.isArray(raw.p2pAuction.queue) ? raw.p2pAuction.queue : [],
      history: Array.isArray(raw.p2pAuction.history) ? raw.p2pAuction.history : []
    };
  }
  if (raw.adminConfig && typeof raw.adminConfig === 'object' && typeof adminConfig !== 'undefined') {
    Object.assign(adminConfig, raw.adminConfig);
  }
}

function syncDbFromDiskIfNewer() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const st = fs.statSync(DB_FILE);
    if (st.mtimeMs > lastDbMtimeMs + 1) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      applyRawDb(raw);
      lastDbMtimeMs = st.mtimeMs;
    }
  } catch {
    // Ignore transient concurrent read during atomic rename
  }
}

function saveDbNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(memDb), 'utf8');
    fs.renameSync(tmp, DB_FILE);
    try { lastDbMtimeMs = fs.statSync(DB_FILE).mtimeMs; } catch {}
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(memDb), 'utf8');
      try { lastDbMtimeMs = fs.statSync(DB_FILE).mtimeMs; } catch {}
    } catch (e2) {
      console.error('[Store] Save warning:', e2.message);
    }
  }
}

function scheduleDbSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveDbNow();
  }, 150);
}

function loadLocalDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      applyRawDb(raw);
      lastDbMtimeMs = fs.statSync(DB_FILE).mtimeMs;
      console.log(`[Store] Loaded ${Object.keys(memDb.users).length} users from ${DB_FILE}`);
      return;
    }
    // One-time migration from legacy __dirname/db.json into watcher-safe DB_FILE
    if (DB_FILE !== LEGACY_DB_FILE && fs.existsSync(LEGACY_DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8'));
      applyRawDb(raw);
      saveDbNow();
      console.log(`[Store] Migrated ${Object.keys(memDb.users).length} users from legacy db.json to ${DB_FILE}`);
    }
  } catch (err) {
    console.error('[Store] Load warning:', err.message);
  }
}

function wrapUserDoc(raw) {
  if (!raw) return null;
  if (!Array.isArray(raw.inventory)) raw.inventory = [];
  if (!Array.isArray(raw.history)) raw.history = [];
  if (!Number.isFinite(Number(raw.rev))) raw.rev = 1;
  if (typeof raw.save !== 'function') {
    Object.defineProperty(raw, 'save', {
      enumerable: false,
      value: async function save() {
        const id = String(this.telegramId).trim();
        this.telegramId = id;
        this.rev = (Number(this.rev) || 0) + 1;
        memDb.users[id] = this;
        saveDbNow();
        return this;
      }
    });
    Object.defineProperty(raw, 'markModified', {
      enumerable: false,
      value: function markModified() {}
    });
  }
  return raw;
}

const User = {
  async findOne(query = {}) {
    syncDbFromDiskIfNewer();
    if (query.telegramId !== undefined) {
      const id = String(query.telegramId).trim();
      return wrapUserDoc(memDb.users[id] || null);
    }
    if (Array.isArray(query.$or)) {
      const all = Object.values(memDb.users);
      for (const cond of query.$or) {
        if (cond.telegramId !== undefined) {
          const hit = memDb.users[String(cond.telegramId).trim()];
          if (hit) return wrapUserDoc(hit);
        }
        if (cond.username instanceof RegExp) {
          const hit = all.find((u) => cond.username.test(u.username || ''));
          if (hit) return wrapUserDoc(hit);
        } else if (typeof cond.username === 'string') {
          const hit = all.find((u) => (u.username || '').toLowerCase() === cond.username.toLowerCase());
          if (hit) return wrapUserDoc(hit);
        }
      }
    }
    return null;
  },

  async create(data) {
    syncDbFromDiskIfNewer();
    const doc = {
      telegramId: String(data.telegramId).trim(),
      username: data.username || '',
      firstName: data.firstName || 'Telegram User',
      lastName: data.lastName || '',
      photoUrl: data.photoUrl || '',
      avatarFrame: data.avatarFrame || '',
      balance: Number.isFinite(Number(data.balance)) ? Number(data.balance) : 250,
      banned: Boolean(data.banned),
      inventory: Array.isArray(data.inventory) ? data.inventory : [],
      history: Array.isArray(data.history) ? data.history : [],
      stats: data.stats || ensureUserStats({}),
      rev: 1,
      createdAt: data.createdAt || new Date().toISOString()
    };
    memDb.users[doc.telegramId] = doc;
    saveDbNow();
    return wrapUserDoc(doc);
  },

  find() {
    syncDbFromDiskIfNewer();
    let list = Object.values(memDb.users).map(wrapUserDoc);
    const chain = {
      sort(spec = {}) {
        if (spec.createdAt) {
          const dir = spec.createdAt < 0 ? -1 : 1;
          list.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir);
        }
        return chain;
      },
      limit(n) {
        list = list.slice(0, n);
        return Promise.resolve(list);
      },
      then(resolve, reject) {
        return Promise.resolve(list).then(resolve, reject);
      }
    };
    return chain;
  }
};

const RoundHistory = {
  async create(entry) {
    memDb.rounds.unshift({ ...entry, createdAt: new Date().toISOString() });
    if (memDb.rounds.length > 200) memDb.rounds = memDb.rounds.slice(0, 200);
    scheduleDbSave();
    return entry;
  }
};

async function nextMintNumber(collectionId) {
  const key = `mint_${collectionId}`;
  const next = (Number(memDb.counters[key]) || 0) + 1;
  memDb.counters[key] = next;
  scheduleDbSave();
  return next;
}

function pushHistory(user, type, amount, title) {
  user.history.unshift({ type, amount, title, createdAt: new Date() });
  if (user.history.length > 80) user.history = user.history.slice(0, 80);
}

const STAT_GAME_KEYS = ['crash', 'cases', 'wheel', 'mines', 'plinko', 'pvp', 'upgrader'];

function makeEmptyGameStat() {
  return { wagered: 0, won: 0, lost: 0, maxWin: 0, maxMult: 0, plays: 0 };
}

function ensureUserStats(user) {
  if (!user.stats || typeof user.stats !== 'object') {
    user.stats = {};
  }
  const s = user.stats;
  s.totalWagered = Number(s.totalWagered || 0);
  s.totalWon = Number(s.totalWon || 0);
  s.totalLost = Number(s.totalLost || 0);
  s.totalGames = Number(s.totalGames || 0);
  s.biggestWin = Number(s.biggestWin || 0);
  s.giftsUpgraded = Number(s.giftsUpgraded || 0);
  s.giftsCrafted = Number(s.giftsCrafted || 0);
  if (!s.games || typeof s.games !== 'object') s.games = {};
  for (const k of STAT_GAME_KEYS) {
    if (!s.games[k] || typeof s.games[k] !== 'object') {
      s.games[k] = makeEmptyGameStat();
    } else {
      const g = s.games[k];
      g.wagered = Number(g.wagered || 0);
      g.won = Number(g.won || 0);
      g.lost = Number(g.lost || 0);
      g.maxWin = Number(g.maxWin || 0);
      g.maxMult = Number(g.maxMult || 0);
      g.plays = Number(g.plays || 0);
    }
  }
  return s;
}

function recordWager(user, gameKey, betAmount) {
  const amt = Math.max(0, Math.round(Number(betAmount) || 0));
  if (!user || amt <= 0) return;
  const xpMult = (typeof adminConfig !== 'undefined' && Number(adminConfig.xpMultiplier) > 0)
    ? Number(adminConfig.xpMultiplier)
    : 1;
  const s = ensureUserStats(user);
  s.totalWagered += Math.round(amt * xpMult);
  s.totalGames += 1;
  if (s.games[gameKey]) {
    s.games[gameKey].wagered += amt;
    s.games[gameKey].plays += 1;
  }
}

const ADMIN_GAME_KEYS = ['crash', 'mines', 'plinko', 'wheel', 'slots', 'upgrader', 'craft', 'singularity', 'auction', 'safe', 'cases', 'pvp'];
const MULTIPLAYER_ROUND_GAMES = new Set(['crash', 'pvp', 'auction', 'singularity']);

function ensureAdminGameStores() {
  if (!memDb.gameRounds || typeof memDb.gameRounds !== 'object') memDb.gameRounds = {};
  if (!memDb.gameTotals || typeof memDb.gameTotals !== 'object') memDb.gameTotals = {};
  if (!Array.isArray(memDb.liveRadar)) memDb.liveRadar = [];
  for (const k of ADMIN_GAME_KEYS) {
    if (!Array.isArray(memDb.gameRounds[k])) memDb.gameRounds[k] = [];
    if (!memDb.gameTotals[k] || typeof memDb.gameTotals[k] !== 'object') {
      memDb.gameTotals[k] = { rounds: 0, totalBet: 0, totalPayout: 0, totalLost: 0, houseProfit: 0 };
    }
  }
}

function recordAdminGameRound(gameKey, entry = {}) {
  const g = ADMIN_GAME_KEYS.includes(gameKey) ? gameKey : 'other';
  ensureAdminGameStores();
  const players = Array.isArray(entry.players) ? entry.players.map((p) => {
    const pBet = Math.max(0, Math.round(Number(p.bet) || 0));
    const pPay = Math.max(0, Math.round(Number(p.payout) || 0));
    const pLost = p.lost !== undefined ? Math.max(0, Math.round(Number(p.lost) || 0)) : Math.max(0, pBet - pPay);
    return {
      telegramId: String(p.telegramId || ''),
      firstName: String(p.firstName || 'Игрок'),
      username: String(p.username || ''),
      photoUrl: String(p.photoUrl || ''),
      avatarFrame: String(p.avatarFrame || ''),
      bet: pBet,
      payout: pPay,
      lost: pLost,
      net: pPay - pBet,
      status: String(p.status || (pPay > 0 ? 'win' : 'lose')),
      detail: String(p.detail || '')
    };
  }) : [];

  const totalBet = entry.totalBet !== undefined
    ? Math.max(0, Math.round(Number(entry.totalBet) || 0))
    : players.reduce((s, p) => s + p.bet, 0);
  const totalPayout = entry.totalPayout !== undefined
    ? Math.max(0, Math.round(Number(entry.totalPayout) || 0))
    : players.reduce((s, p) => s + p.payout, 0);
  const totalLost = entry.totalLost !== undefined
    ? Math.max(0, Math.round(Number(entry.totalLost) || 0))
    : players.reduce((s, p) => s + p.lost, 0);
  const houseProfit = entry.houseProfit !== undefined
    ? Math.round(Number(entry.houseProfit) || 0)
    : (totalBet - totalPayout);

  const roundRec = {
    id: makeUid(),
    game: g,
    roundId: entry.roundId || null,
    summary: String(entry.summary || ''),
    mult: entry.mult !== undefined ? Number(Number(entry.mult).toFixed(2)) : null,
    totalBet,
    totalPayout,
    totalLost,
    houseProfit,
    playersCount: players.length,
    players: players.slice(0, 40),
    createdAt: Date.now()
  };

  if (memDb.gameRounds[g]) {
    memDb.gameRounds[g].unshift(roundRec);
    if (memDb.gameRounds[g].length > 60) memDb.gameRounds[g] = memDb.gameRounds[g].slice(0, 60);
  }
  if (memDb.gameTotals[g]) {
    const t = memDb.gameTotals[g];
    t.rounds += 1;
    t.totalBet += totalBet;
    t.totalPayout += totalPayout;
    t.totalLost += totalLost;
    t.houseProfit += houseProfit;
  }

  // Push to live radar when any real bet happened
  if (totalBet > 0 || players.length > 0) {
    const topPlayer = players[0] || null;
    const radarItem = {
      id: roundRec.id,
      game: g,
      summary: roundRec.summary,
      playerName: topPlayer ? topPlayer.firstName : `${players.length} игр.`,
      telegramId: topPlayer ? topPlayer.telegramId : '',
      totalBet,
      totalPayout,
      houseProfit,
      createdAt: roundRec.createdAt
    };
    memDb.liveRadar.unshift(radarItem);
    if (memDb.liveRadar.length > 45) memDb.liveRadar = memDb.liveRadar.slice(0, 45);
    if (typeof io !== 'undefined') {
      io.to('admin_room').emit('admin:live_radar', radarItem);
    }
  }

  scheduleDbSave();
  if (typeof io !== 'undefined') {
    io.to('admin_room').emit('admin:game_round', {
      game: g,
      round: roundRec,
      totals: memDb.gameTotals[g]
    });
  }
  return roundRec;
}

function recordOutcome(user, gameKey, betAmount, winAmount, mult = 0) {
  if (!user) return;
  const bet = Math.max(0, Math.round(Number(betAmount) || 0));
  const win = Math.max(0, Math.round(Number(winAmount) || 0));
  const netLoss = Math.max(0, bet - win);
  const s = ensureUserStats(user);
  s.totalWon += win;
  s.totalLost += netLoss;
  if (win > s.biggestWin) s.biggestWin = win;
  if (s.games[gameKey]) {
    const g = s.games[gameKey];
    g.won += win;
    g.lost += netLoss;
    if (win > g.maxWin) g.maxWin = win;
    if (mult && Number(mult) > g.maxMult) g.maxMult = Number(Number(mult).toFixed(2));
  }
  trackSuspiciousOutcome(user, gameKey, bet, win, mult);

  if (!MULTIPLAYER_ROUND_GAMES.has(gameKey) && ADMIN_GAME_KEYS.includes(gameKey)) {
    const mVal = Number(mult) || (bet > 0 && win > 0 ? Number((win / bet).toFixed(2)) : 0);
    recordAdminGameRound(gameKey, {
      summary: win > 0 ? `Выигрыш${mVal ? ` x${mVal}` : ''}` : 'Проигрыш',
      mult: mVal,
      totalBet: bet,
      totalPayout: win,
      totalLost: netLoss,
      houseProfit: bet - win,
      players: [{
        telegramId: user.telegramId,
        firstName: user.firstName || 'Игрок',
        username: user.username || '',
        photoUrl: user.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(user),
        bet,
        payout: win,
        lost: netLoss,
        status: win > 0 ? 'win' : 'lose',
        detail: win > 0 ? `+${win} зв.${mVal ? ` (x${mVal})` : ''}` : `Слив -${bet} зв.`
      }]
    });
  }
}

const plinkoRecentBets = []; // latest 30 finished Plinko drops across players
const safeRecentBets = [];   // latest 30 finished Safe cracks across players (wins & losses)


function createBasicGift(bg, obtainedFrom = 'Wheel') {
  return {
    uid: makeUid(),
    collectionId: bg.id,
    collectionName: bg.name,
    basicSlug: bg.slug,
    upgradable: false,
    upgraded: false,
    crafted: false,
    craftTier: '',
    craftedName: '',
    craftedRuName: '',
    mintNumber: 0,
    model: { name: '', rarity: 0 },
    backdrop: { name: '', rarity: 0, center: '#243447', edge: '#17212b', pattern: '#2ea6ff', text: '#ffffff' },
    symbol: { name: '', rarity: 0, image: '' },
    image: bg.image,
    lottie: `${CDN_BASE}/originals/${bg.id}/Original.json`,
    value: bg.price,
    obtainedFrom,
    createdAt: new Date()
  };
}

function createRegularGift(col, obtainedFrom = 'Shop') {
  const mp = computeCollectionMarketPrice(col);
  return {
    uid: makeUid(),
    collectionId: col.id,
    collectionName: col.name,
    upgradable: true,
    upgraded: false,
    crafted: false,
    craftTier: '',
    craftedName: '',
    craftedRuName: '',
    mintNumber: 0,
    model: { name: 'Original', rarity: 100 },
    backdrop: {
      name: 'Standard',
      rarity: 100,
      center: '#253545',
      edge: '#17212b',
      pattern: '#2ea6ff',
      text: '#c8d6e5'
    },
    symbol: { name: '', rarity: 0, image: '' },
    image: getOriginalImage(col),
    lottie: getOriginalLottie(col),
    value: mp.stars,
    floorTon: mp.floorTon,
    marketTon: mp.marketTon,
    obtainedFrom,
    createdAt: new Date()
  };
}

async function rollUpgradedTraits(col, preferredBackdropName = null, preferredSymbolName = null) {
  const mPick = col.models.length
    ? weightedPick(col.models, (m) => m[1])
    : ['Classic', 10];
  const modelName = mPick[0];
  const modelRarity = mPick[1];

  let bRef;
  if (preferredBackdropName && col.backdrops.length) {
    const found = col.backdrops.find((b) => CATALOG.backdrops[b[0]] && CATALOG.backdrops[b[0]][0] === preferredBackdropName);
    if (found) bRef = found;
  }
  if (!bRef) {
    bRef = col.backdrops.length ? weightedPick(col.backdrops, (b) => b[1]) : [0, 2];
  }
  const bMeta = CATALOG.backdrops[bRef[0]] || ['Sapphire', '#58a3c8', '#5379c2', '#0d45b6', '#c1deff'];

  let sRef;
  if (preferredSymbolName && col.symbols.length) {
    const found = col.symbols.find((s) => CATALOG.symbols[s[0]] === preferredSymbolName);
    if (found) sRef = found;
  }
  if (!sRef) {
    sRef = col.symbols.length ? weightedPick(col.symbols, (s) => s[1]) : [0, 1];
  }
  const symName = CATALOG.symbols[sRef[0]] || 'Star';

  const mintNumber = await nextMintNumber(col.id);
  // Real MRKT pricing: ordinary upgrades give max 1.05x-1.28x; big boost ONLY for Black / Onyx Black / Monochrome combos!
  const mp = computeNftMarketPrice(col, modelRarity, bMeta[0], modelName);

  return {
    mintNumber,
    model: { name: modelName, rarity: modelRarity },
    backdrop: {
      name: bMeta[0],
      rarity: bRef[1],
      center: bMeta[1],
      edge: bMeta[2],
      pattern: bMeta[3],
      text: bMeta[4],
      floorTon: getBackdropFloorTon(bMeta[0])
    },
    symbol: {
      name: symName,
      rarity: sRef[1],
      image: getPatternImage(col.name, symName)
    },
    image: getModelImage(col.name, modelName),
    lottie: getModelLottie(col.name, modelName),
    value: mp.stars,
    floorTon: mp.floorTon,
    marketTon: mp.marketTon
  };
}

async function createUpgradedGift(col, obtainedFrom = 'Upgrade') {
  const traits = await rollUpgradedTraits(col);
  return {
    uid: makeUid(),
    collectionId: col.id,
    collectionName: col.name,
    upgraded: true,
    crafted: false,
    craftTier: '',
    craftedName: '',
    craftedRuName: '',
    ...traits,
    obtainedFrom,
    createdAt: new Date()
  };
}

function pickRandomCollectionBackdrop(col) {
  if (col && Array.isArray(col.backdrops) && col.backdrops.length) {
    const bRef = col.backdrops[crypto.randomInt(0, col.backdrops.length)];
    const bMeta = CATALOG.backdrops[bRef[0]];
    if (bMeta) {
      return {
        name: bMeta[0],
        rarity: bRef[1],
        center: bMeta[1],
        edge: bMeta[2],
        pattern: bMeta[3],
        text: bMeta[4]
      };
    }
  }
  const fallback = CATALOG.backdrops[crypto.randomInt(0, CATALOG.backdrops.length)] || ['Sapphire', '#58a3c8', '#5379c2', '#0d45b6', '#c1deff'];
  return {
    name: fallback[0],
    rarity: 1.5,
    center: fallback[1],
    edge: fallback[2],
    pattern: fallback[3],
    text: fallback[4]
  };
}

function pickRandomCollectionSymbol(col) {
  if (col && Array.isArray(col.symbols) && col.symbols.length) {
    const sRef = col.symbols[crypto.randomInt(0, col.symbols.length)];
    const sName = CATALOG.symbols[sRef[0]] || 'Star';
    return {
      name: sName,
      rarity: sRef[1],
      image: getPatternImage(col.name, sName)
    };
  }
  return { name: 'Star', rarity: 1.0, image: '' };
}

async function createCraftedGift(craftedSpec, inheritedBackdrop = null, inheritedSymbol = null, obtainedFrom = 'Craft') {
  const baseCol = COLLECTIONS_BY_NAME.get(craftedSpec.baseCollection) || CATALOG.collections[0];
  const mintNumber = await nextMintNumber(craftedSpec.id);

  // Crafted gifts ONLY craft the model — backdrop & symbol are NEVER fixed Forge gradients!
  const backdrop = (inheritedBackdrop && inheritedBackdrop.name && inheritedBackdrop.center)
    ? { ...inheritedBackdrop, floorTon: getBackdropFloorTon(inheritedBackdrop.name) }
    : { ...pickRandomCollectionBackdrop(baseCol) };
  backdrop.floorTon = getBackdropFloorTon(backdrop.name);

  const symbol = (inheritedSymbol && inheritedSymbol.name)
    ? { ...inheritedSymbol }
    : pickRandomCollectionSymbol(baseCol);

  const mp = computeCraftedMarketPrice(baseCol, craftedSpec, backdrop.name);

  return {
    uid: makeUid(),
    collectionId: baseCol.id,
    collectionName: baseCol.name,
    upgraded: true,
    crafted: true,
    craftTier: craftedSpec.tier,
    craftedName: craftedSpec.name,
    craftedRuName: craftedSpec.ruName,
    mintNumber,
    model: {
      name: craftedSpec.name,
      rarity: craftedSpec.tier === 'Legendary' ? 0.1 : craftedSpec.tier === 'Epic' ? 0.4 : craftedSpec.tier === 'Rare' ? 1.0 : 2.0
    },
    backdrop,
    symbol,
    image: craftedSpec.image,
    lottie: '',
    value: mp.stars,
    floorTon: mp.floorTon,
    marketTon: mp.marketTon,
    obtainedFrom,
    createdAt: new Date()
  };
}

// ======================== TELEGRAM INITDATA AUTH ========================
function verifyTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return null;

    const authDate = Number(params.get('auth_date'));
    if (!authDate || Number.isNaN(authDate)) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - authDate) > INIT_DATA_MAX_AGE_SEC) return null;

    const pairs = [];
    for (const [k, v] of params.entries()) {
      if (k !== 'hash') pairs.push(`${k}=${v}`);
    }
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;
    const tgUser = JSON.parse(userRaw);
    if (!tgUser || !tgUser.id) return null;

    return {
      telegramId: String(tgUser.id),
      username: tgUser.username || '',
      firstName: tgUser.first_name || 'Player',
      lastName: tgUser.last_name || '',
      photoUrl: tgUser.photo_url || ''
    };
  } catch {
    return null;
  }
}

const lastBotProfileSyncByUser = new Map();

async function syncUserProfileFromBotIfStale(user) {
  if (!user || !BOT_TOKEN || process.env.DISABLE_BOT === '1') return;
  const tid = String(user.telegramId);
  if (!/^\d+$/.test(tid)) return;
  const now = Date.now();
  const prev = lastBotProfileSyncByUser.get(tid) || 0;
  if (now - prev < 180000) return; // max once per 3 minutes per user
  lastBotProfileSyncByUser.set(tid, now);
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(tid)}`);
    const d = await r.json().catch(() => null);
    if (!d?.ok || !d.result) return;
    const c = d.result;
    let changed = false;
    const nextFirst = typeof c.first_name === 'string' && c.first_name.trim() ? c.first_name.trim() : user.firstName;
    const nextLast = typeof c.last_name === 'string' ? c.last_name.trim() : '';
    const nextUser = typeof c.username === 'string' ? c.username.trim() : '';
    if (nextFirst && user.firstName !== nextFirst) { user.firstName = nextFirst; changed = true; }
    if (user.lastName !== nextLast) { user.lastName = nextLast; changed = true; }
    if (user.username !== nextUser) { user.username = nextUser; changed = true; }
    if (changed) {
      await user.save();
      scheduleDbSave();
    }
  } catch {}
}

async function getOrCreateUser(tgProfile) {
  let user = await User.findOne({ telegramId: tgProfile.telegramId });
  if (!user) {
    const startBal = (typeof adminConfig !== 'undefined' && Number.isFinite(Number(adminConfig.starterBalance)))
      ? Math.max(0, Math.floor(Number(adminConfig.starterBalance)))
      : 0;
    user = await User.create({
      telegramId: tgProfile.telegramId,
      username: tgProfile.username || '',
      firstName: tgProfile.firstName || 'Player',
      lastName: tgProfile.lastName || '',
      photoUrl: tgProfile.photoUrl || '',
      balance: startBal,
      inventory: [],
      history: startBal > 0 ? [{ type: 'topup', amount: startBal, title: 'Приветственный бонус ZetGifts' }] : []
    });
  } else {
    let changed = false;
    const nextUser = typeof tgProfile.username === 'string' ? tgProfile.username.trim() : user.username;
    const nextFirst = typeof tgProfile.firstName === 'string' && tgProfile.firstName.trim() ? tgProfile.firstName.trim() : user.firstName;
    const nextLast = typeof tgProfile.lastName === 'string' ? tgProfile.lastName.trim() : '';
    const nextPhoto = typeof tgProfile.photoUrl === 'string' && tgProfile.photoUrl.trim() ? tgProfile.photoUrl.trim() : user.photoUrl;

    if (user.username !== nextUser) { user.username = nextUser; changed = true; }
    if (user.firstName !== nextFirst) { user.firstName = nextFirst; changed = true; }
    if (user.lastName !== nextLast) { user.lastName = nextLast; changed = true; }
    if (nextPhoto && user.photoUrl !== nextPhoto) { user.photoUrl = nextPhoto; changed = true; }
    if (changed) {
      await user.save();
      scheduleDbSave();
    }
    // Background fresh check via Telegram Bot API getChat so changed names/usernames always sync even if WebApp caches initData
    syncUserProfileFromBotIfStale(user).catch(() => {});
  }
  return user;
}

const LEVEL_TIERS = [
  { level: 1,  minWager: 0,      frameId: '',           rewardTitle: '' },
  { level: 2,  minWager: 1000,   frameId: '',           rewardTitle: '' },
  { level: 3,  minWager: 3000,   frameId: 'frame_lv3',  rewardTitle: 'Рамка «Ледяной Кристалл»' },
  { level: 4,  minWager: 5000,   frameId: '',           rewardTitle: '' },
  { level: 5,  minWager: 10000,  frameId: 'frame_lv5',  rewardTitle: 'Рамка «Изумрудный Лавр»' },
  { level: 6,  minWager: 20000,  frameId: 'frame_lv6',  rewardTitle: 'Рамка «Пламя Феникса»' },
  { level: 7,  minWager: 35000,  frameId: '',           rewardTitle: '' },
  { level: 8,  minWager: 60000,  frameId: 'frame_lv8',  rewardTitle: 'Рамка «Кибер-Аметист»' },
  { level: 9,  minWager: 100000, frameId: '',           rewardTitle: '' },
  { level: 10, minWager: 150000, frameId: 'frame_lv10', rewardTitle: 'Рамка «Императорская Легенда»' }
];

const AVATAR_FRAMES = [
  { id: 'frame_lv3',  level: 3,  name: 'Ледяной Кристалл',      rarity: 'Rare',      image: 'frame_lv3.png?v=f1',  accent: '#38bdf8', center: '#103b5c', edge: '#0a1c2e' },
  { id: 'frame_lv5',  level: 5,  name: 'Изумрудный Лавр',       rarity: 'Epic',      image: 'frame_lv5.png?v=f1',  accent: '#22c55e', center: '#11442c', edge: '#091f16' },
  { id: 'frame_lv6',  level: 6,  name: 'Пламя Феникса',         rarity: 'Epic',      image: 'frame_lv6.png?v=f1',  accent: '#f97316', center: '#5c240c', edge: '#240d07' },
  { id: 'frame_lv8',  level: 8,  name: 'Кибер-Аметист',         rarity: 'Mythic',    image: 'frame_lv8.png?v=f1',  accent: '#c084fc', center: '#3e1863', edge: '#180a29' },
  { id: 'frame_lv10', level: 10, name: 'Императорская Легенда', rarity: 'Legendary', image: 'frame_lv10.png?v=f1', accent: '#facc15', center: '#5c4209', edge: '#241805' }
];

const FRAME_BY_ID = new Map(AVATAR_FRAMES.map((f) => [f.id, f]));

function getUserLevelInfo(user) {
  const stats = ensureUserStats(user);
  const totalWagered = Math.max(0, Math.floor(Number(stats.totalWagered) || 0));
  let curIdx = 0;
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (totalWagered >= LEVEL_TIERS[i].minWager) curIdx = i;
  }
  const curTier = LEVEL_TIERS[curIdx];
  const nextTier = LEVEL_TIERS[curIdx + 1] || null;
  const currentMin = curTier.minWager;
  const nextMin = nextTier ? nextTier.minWager : curTier.minWager;
  const span = nextTier ? Math.max(1, nextMin - currentMin) : 1;
  const inTier = nextTier ? Math.max(0, totalWagered - currentMin) : span;
  const percent = nextTier ? Math.min(100, Math.max(0, Number(((inTier / span) * 100).toFixed(1)))) : 100;
  const remaining = nextTier ? Math.max(0, nextMin - totalWagered) : 0;
  const levelFrames = AVATAR_FRAMES.filter((f) => curTier.level >= f.level).map((f) => f.id);
  const ownedExtras = Array.isArray(user.ownedFrames) ? user.ownedFrames : [];
  const unlockedFrames = Array.from(new Set([...levelFrames, ...ownedExtras]));
  const rawFrame = String(user.avatarFrame || user.activeFrame || user.equippedFrame || '');
  const activeFrame = (rawFrame && unlockedFrames.includes(rawFrame)) ? rawFrame : '';

  // Find next frame milestone if nextTier has no frame
  const nextFrameObj = AVATAR_FRAMES.find((f) => f.level > curTier.level) || null;

  return {
    level: curTier.level,
    maxLevel: 10,
    totalWagered,
    currentMin,
    nextLevel: nextTier ? nextTier.level : null,
    nextMin: nextTier ? nextMin : currentMin,
    remaining,
    percent,
    nextRewardTitle: nextTier ? nextTier.rewardTitle : '',
    nextRewardFrameId: nextTier ? nextTier.frameId : '',
    nextFrameLevel: nextFrameObj ? nextFrameObj.level : null,
    nextFrameName: nextFrameObj ? nextFrameObj.name : '',
    unlockedFrames,
    activeFrame
  };
}

function getActiveAvatarFrame(user) {
  if (!user) return '';
  return getUserLevelInfo(user).activeFrame;
}

function serializeUser(user) {
  const pf = ensureUserPf(user);
  const levelInfo = getUserLevelInfo(user);
  return {
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    avatarFrame: levelInfo.activeFrame,
    level: levelInfo.level,
    levelInfo,
    balance: Math.floor(user.balance),
    banned: user.banned,
    isAdmin: user.telegramId === ADMIN_ID,
    inventory: user.inventory,
    history: user.history,
    pendingAuctionPayouts: Array.isArray(user.pendingAuctionPayouts) ? user.pendingAuctionPayouts : [],
    stats: ensureUserStats(user),
    pf: {
      serverSeedHash: pf.serverSeedHash,
      clientSeed: pf.clientSeed,
      nonce: pf.nonce,
      history: pf.history.slice(0, 15)
    },
    rev: Number(user.rev) || 1,
    serverBootId: SERVER_BOOT_ID,
    createdAt: user.createdAt || new Date().toISOString()
  };
}

// ======================== EXPRESS + SOCKET.IO SETUP ========================
const app = express();
app.set('etag', false);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '6mb' }));

// Auto-detect public HTTPS Mini App URL if WEBAPP_URL / RENDER_EXTERNAL_URL wasn't set manually
app.use((req, _res, next) => {
  if (!DETECTED_WEBAPP_URL && req.headers.host) {
    const host = String(req.headers.host);
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    if (!/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) && proto === 'https') {
      DETECTED_WEBAPP_URL = `https://${host}`;
    }
  }
  next();
});

// Prevent Telegram/Android WebView/proxies from EVER caching live API state (balance/inventory)
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ======================== ZERO-DEPENDENCY MULTI-ZIP IMAGE READER (images-*.zip) ========================
const ZIP_INDEX = new Map(); // filename -> { buf, dataOffset, compSize, method }
const ZIP_CACHE = new Map(); // filename -> Buffer (lazy decoded PNG cache)

function indexSingleZipFile(zipPath) {
  if (!fs.existsSync(zipPath)) return 0;
  let added = 0;
  try {
    const buf = fs.readFileSync(zipPath);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) return 0;

    const totalEntries = buf.readUInt16LE(eocd + 10);
    let cdPos = buf.readUInt32LE(eocd + 16);

    for (let n = 0; n < totalEntries; n++) {
      if (cdPos + 46 > buf.length || buf.readUInt32LE(cdPos) !== 0x02014b50) break;
      const method = buf.readUInt16LE(cdPos + 10);
      const compSize = buf.readUInt32LE(cdPos + 20);
      const nameLen = buf.readUInt16LE(cdPos + 28);
      const extraLen = buf.readUInt16LE(cdPos + 30);
      const commentLen = buf.readUInt16LE(cdPos + 32);
      const localHeaderOff = buf.readUInt32LE(cdPos + 42);
      const entryName = buf.toString('utf8', cdPos + 46, cdPos + 46 + nameLen);
      cdPos += 46 + nameLen + extraLen + commentLen;

      if (entryName.endsWith('/')) continue;
      if (localHeaderOff + 30 > buf.length || buf.readUInt32LE(localHeaderOff) !== 0x04034b50) continue;
      const lhNameLen = buf.readUInt16LE(localHeaderOff + 26);
      const lhExtraLen = buf.readUInt16LE(localHeaderOff + 28);
      const dataOffset = localHeaderOff + 30 + lhNameLen + lhExtraLen;

      const base = path.basename(entryName);
      ZIP_INDEX.set(base, { buf, dataOffset, compSize, method });
      added++;
    }
  } catch (err) {
    console.error(`[ZetGifts] Failed to index ${path.basename(zipPath)}:`, err.message);
  }
  return added;
}

function initImagesZip() {
  try {
    // Matches images.zip, images-cases.zip, images-gifts.zip, images-bot.zip, images-crafted-1.zip, images-crafted-2.zip, etc.
    const files = fs.readdirSync(__dirname).filter((f) => /^images(?:-[a-z0-9_-]+)?\.zip$/i.test(f)).sort();
    let total = 0;
    for (const f of files) {
      const n = indexSingleZipFile(path.join(__dirname, f));
      total += n;
    }
    console.log(`[ZetGifts] Indexed ${total} images across ${files.length} archive(s): ${files.join(', ')}`);
  } catch (err) {
    console.error('[ZetGifts] Failed to scan zip archives:', err.message);
  }
}

function getImageFromZip(filename) {
  if (ZIP_CACHE.has(filename)) return ZIP_CACHE.get(filename);
  const meta = ZIP_INDEX.get(filename);
  if (!meta) return null;

  const slice = meta.buf.subarray(meta.dataOffset, meta.dataOffset + meta.compSize);
  let out = null;
  if (meta.method === 0) out = Buffer.from(slice);
  else if (meta.method === 8) out = zlib.inflateRawSync(slice);
  if (out) ZIP_CACHE.set(filename, out);
  return out;
}

initImagesZip();

// Block direct download of server source/config/raw archives/db
app.get(['/server.js', '/package.json', '/package-lock.json', '/.env', '/db.json'], (_req, res) => {
  res.status(403).end();
});
app.get(/\.zip$/i, (_req, res) => res.status(403).end());

// Static flat assets from ZetGifts directory (NEVER cache html/js/css in Telegram WebView!)
app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'deny',
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (/\.json$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Serve PNG/WebP/JPG assets directly from images-*.zip without extracting!
app.get(/^\/([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp|gif))$/i, (req, res, next) => {
  const filename = req.params[0];
  const imgBuf = getImageFromZip(filename);
  if (!imgBuf) return next();
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
        : 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(imgBuf);
});

// Auth Middleware for ALL /api/* routes + rate anomaly monitor
async function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const tgProfile = verifyTelegramInitData(initData);
  if (!tgProfile) {
    return res.status(401).json({ error: 'Ошибка авторизации' });
  }
  try {
    const user = await getOrCreateUser(tgProfile);
    if (user.banned && user.telegramId !== ADMIN_ID) {
      logAdminEvent('suspicious', 'Попытка входа забаненного игрока', `Route: ${req.method} ${req.path}`, user);
      return res.status(403).json({ error: 'Аккаунт заблокирован администратором' });
    }
    if (user.telegramId !== ADMIN_ID && typeof adminConfig !== 'undefined') {
      if (adminConfig.maintenanceMode && req.path !== '/api/me') {
        return res.status(503).json({ error: adminConfig.maintenanceText || 'Ведутся технические работы' });
      }
      if (adminConfig.freezeMarket && req.method === 'POST' && (req.path === '/api/gifts/sell' || req.path === '/api/gifts/buy' || req.path === '/api/gifts/withdraw')) {
        return res.status(503).json({ error: 'Операции маркета и вывода временно приостановлены администратором' });
      }
      if (req.method === 'POST' && req.path.startsWith('/api/games/')) {
        const gKey = req.path.split('/')[3];
        if (gKey && adminConfig.disabledGames?.[gKey]) {
          return res.status(503).json({ error: 'Эта игра временно отключена администратором' });
        }
        const maxBetLimit = Number(adminConfig.maxBet || 0);
        if (maxBetLimit > 0 && req.body?.bet && Number(req.body.bet) > maxBetLimit) {
          return res.status(400).json({ error: `Максимальная ставка сейчас ограничена: ${maxBetLimit} звёзд` });
        }
      }
    }
    if (req.method === 'POST' && user.telegramId !== ADMIN_ID) {
      const now = Date.now();
      let bucket = userRateBuckets.get(user.telegramId);
      if (!bucket) { bucket = { ts: [], alertedAt: 0 }; userRateBuckets.set(user.telegramId, bucket); }
      bucket.ts = bucket.ts.filter((t) => now - t < 10000);
      bucket.ts.push(now);
      if (bucket.ts.length >= 35 && now - bucket.alertedAt > 60000) {
        bucket.alertedAt = now;
        logAdminEvent('suspicious', 'Аномальная частота запросов', `${bucket.ts.length} POST-запросов за 10 сек (${req.path})`, user);
      }
    }
    req.user = user;
    req.isAdmin = user.telegramId === ADMIN_ID;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

function adminOnly(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Доступ запрещен' });
  next();
}

// ======================== CASES & WHEEL DEFINITIONS (STRICT CASINO ODDS + STARS DROPS) ========================
function buildCaseItemMeta(entry) {
  if (entry.type === 'stars') {
    const amt = Math.max(1, Math.round(Number(entry.amount) || 5));
    return {
      type: 'stars',
      amount: amt,
      name: `${amt}`,
      price: amt,
      image: '',
      chance: entry.chance,
      center: '#69470d',
      edge: '#261705'
    };
  }
  if (entry.type === 'basic') {
    const bg = BASIC_BY_SLUG.get(entry.slug) || BASIC_GIFTS[0];
    return {
      type: 'basic',
      slug: bg.slug,
      name: bg.name,
      price: bg.price,
      image: bg.image,
      chance: entry.chance,
      center: '#253547',
      edge: '#16202b'
    };
  }
  const col = COLLECTIONS_BY_NAME.get(entry.name) || CATALOG.collections[0];
  const tierColor = col.price >= 14000 ? ['#8b5cf6', '#2e1065']
    : col.price >= 3000 ? ['#d97706', '#451a03']
      : col.price >= 900 ? ['#0284c7', '#0c2340']
        : ['#1f7a5c', '#0d2620'];
  return {
    type: 'collection',
    name: col.name,
    price: col.price,
    image: getOriginalImage(col),
    chance: entry.chance,
    center: tierColor[0],
    edge: tierColor[1]
  };
}

const CASES_RAW = [
  {
    id: 'promo',
    name: 'Промо-кейс',
    price: 0,
    isPromo: true,
    isFree: true,
    accent: '#10b981',
    cover: 'case_promo.png?v=nobg4',
    entries: [
      { type: 'collection', name: 'Snake Box', chance: 18 },
      { type: 'collection', name: 'Lunar Snake', chance: 14 },
      { type: 'collection', name: 'Candy Cane', chance: 13 },
      { type: 'collection', name: 'Lol Pop', chance: 12 },
      { type: 'collection', name: 'Jester Hat', chance: 10 },
      { type: 'collection', name: 'Tama Gadget', chance: 8.5 },
      { type: 'collection', name: 'Holiday Drink', chance: 7.5 },
      { type: 'collection', name: 'B-Day Candle', chance: 6 },
      { type: 'collection', name: 'Homemade Cake', chance: 4.5 },
      { type: 'collection', name: 'Desk Calendar', chance: 3 },
      { type: 'collection', name: 'Santa Hat', chance: 1.8 },
      { type: 'collection', name: 'Top Hat', chance: 1.0 },
      { type: 'collection', name: 'Sakura Flower', chance: 0.45 },
      { type: 'collection', name: 'Skull Flower', chance: 0.25 }
    ]
  },
  {
    id: 'starter',
    name: 'Стартовый',
    price: 20,
    accent: '#2ea6ff',
    cover: 'case_starter.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 8, chance: 26 },
      { type: 'stars', amount: 14, chance: 22 },
      { type: 'stars', amount: 19, chance: 15 },
      { type: 'basic', slug: 'basic_heart', chance: 13 },
      { type: 'basic', slug: 'basic_bear', chance: 11.5 },
      { type: 'basic', slug: 'basic_giftbox', chance: 5.5 },
      { type: 'basic', slug: 'basic_rose', chance: 3.8 },
      { type: 'basic', slug: 'basic_cake', chance: 1.6 },
      { type: 'basic', slug: 'basic_rocket', chance: 0.9 },
      { type: 'basic', slug: 'basic_trophy', chance: 0.45 },
      { type: 'collection', name: 'Lunar Snake', chance: 0.25 }
    ]
  },
  {
    id: 'giftbox',
    name: 'Праздничный',
    price: 95,
    accent: '#22c55e',
    cover: 'case_holiday.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 20, chance: 27 },
      { type: 'stars', amount: 40, chance: 21 },
      { type: 'stars', amount: 65, chance: 14 },
      { type: 'basic', slug: 'basic_giftbox', chance: 10 },
      { type: 'basic', slug: 'basic_rose', chance: 9 },
      { type: 'basic', slug: 'basic_cake', chance: 7.5 },
      { type: 'basic', slug: 'basic_champagne', chance: 5.0 },
      { type: 'basic', slug: 'basic_trophy', chance: 3.1 },
      { type: 'basic', slug: 'basic_ring', chance: 1.6 },
      { type: 'basic', slug: 'basic_diamond', chance: 1.0 },
      { type: 'collection', name: 'Homemade Cake', chance: 0.5 },
      { type: 'collection', name: 'Santa Hat', chance: 0.2 },
      { type: 'collection', name: 'Crystal Ball', chance: 0.1 }
    ]
  },
  {
    id: 'snoop',
    name: 'Snoop Case',
    price: 320,
    accent: '#a855f7',
    cover: 'case_snoop.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 65, chance: 29 },
      { type: 'stars', amount: 115, chance: 23 },
      { type: 'stars', amount: 185, chance: 14 },
      { type: 'basic', slug: 'basic_trophy', chance: 12 },
      { type: 'basic', slug: 'basic_diamond', chance: 9.5 },
      { type: 'collection', name: 'Swag Bag', chance: 5.2 },
      { type: 'collection', name: 'Snoop Cigar', chance: 3.4 },
      { type: 'collection', name: 'Snoop Dogg', chance: 2.1 },
      { type: 'collection', name: 'Low Rider', chance: 1.1 },
      { type: 'collection', name: 'Westside Sign', chance: 0.7 }
    ]
  },
  {
    id: 'flame',
    name: 'Огненный',
    price: 480,
    accent: '#f97316',
    cover: 'case_flame.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 95, chance: 28 },
      { type: 'stars', amount: 175, chance: 23 },
      { type: 'stars', amount: 280, chance: 14 },
      { type: 'collection', name: 'B-Day Candle', chance: 11 },
      { type: 'collection', name: 'Love Candle', chance: 8.5 },
      { type: 'collection', name: 'Eternal Candle', chance: 6.2 },
      { type: 'collection', name: 'Evil Eye', chance: 4.1 },
      { type: 'collection', name: 'Mad Pumpkin', chance: 2.5 },
      { type: 'collection', name: 'Light Sword', chance: 1.6 },
      { type: 'collection', name: 'Chill Flame', chance: 1.1 }
    ]
  },
  {
    id: 'collectible',
    name: 'Коллекционный',
    price: 750,
    accent: '#f59e0b',
    cover: 'case_collectible.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 150, chance: 28 },
      { type: 'stars', amount: 280, chance: 22 },
      { type: 'stars', amount: 440, chance: 14 },
      { type: 'collection', name: 'Lunar Snake', chance: 11 },
      { type: 'collection', name: 'Homemade Cake', chance: 8.2 },
      { type: 'collection', name: 'Santa Hat', chance: 6.4 },
      { type: 'collection', name: 'Berry Box', chance: 4.5 },
      { type: 'collection', name: 'Crystal Ball', chance: 2.9 },
      { type: 'collection', name: 'Eternal Rose', chance: 1.7 },
      { type: 'collection', name: 'Toy Bear', chance: 0.9 },
      { type: 'collection', name: 'Swiss Watch', chance: 0.4 }
    ]
  },
  {
    id: 'cyber',
    name: 'Неоновый',
    price: 1450,
    accent: '#06b6d4',
    cover: 'case_cyber.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 280, chance: 29 },
      { type: 'stars', amount: 520, chance: 22 },
      { type: 'stars', amount: 850, chance: 14 },
      { type: 'collection', name: 'Stellar Rocket', chance: 11 },
      { type: 'collection', name: 'Tama Gadget', chance: 8.5 },
      { type: 'collection', name: 'Light Sword', chance: 6.0 },
      { type: 'collection', name: 'Neko Helmet', chance: 4.2 },
      { type: 'collection', name: 'Electric Skull', chance: 2.6 },
      { type: 'collection', name: 'Ion Gem', chance: 1.5 },
      { type: 'collection', name: 'Astral Shard', chance: 0.8 },
      { type: 'collection', name: 'Heroic Helmet', chance: 0.4 }
    ]
  },
  {
    id: 'champion',
    name: 'Чемпионский',
    price: 2400,
    accent: '#eab308',
    cover: 'case_champion.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 480, chance: 29 },
      { type: 'stars', amount: 860, chance: 23 },
      { type: 'stars', amount: 1400, chance: 14 },
      { type: 'collection', name: 'Victory Medal', chance: 11 },
      { type: 'collection', name: 'Mighty Arm', chance: 8.4 },
      { type: 'collection', name: 'UFC Strike', chance: 6.0 },
      { type: 'collection', name: 'Mini Oscar', chance: 4.1 },
      { type: 'collection', name: "Khabib's Papakha", chance: 2.4 },
      { type: 'collection', name: 'Resistance Dog', chance: 1.3 },
      { type: 'collection', name: "Durov's Glasses", chance: 0.8 }
    ]
  },
  {
    id: 'luxury',
    name: 'Легендарный',
    price: 4500,
    accent: '#c084fc',
    cover: 'case_luxury.png?v=nobg3',
    entries: [
      { type: 'stars', amount: 850, chance: 30 },
      { type: 'stars', amount: 1550, chance: 23 },
      { type: 'stars', amount: 2600, chance: 14 },
      { type: 'collection', name: 'Crystal Ball', chance: 10 },
      { type: 'collection', name: 'Eternal Rose', chance: 7.4 },
      { type: 'collection', name: 'Toy Bear', chance: 5.5 },
      { type: 'collection', name: 'Vintage Cigar', chance: 4.0 },
      { type: 'collection', name: 'Swiss Watch', chance: 2.6 },
      { type: 'collection', name: 'Perfume Bottle', chance: 1.6 },
      { type: 'collection', name: 'Loot Bag', chance: 1.0 },
      { type: 'collection', name: 'Precious Peach', chance: 0.5 },
      { type: 'collection', name: "Durov's Cap", chance: 0.25 },
      { type: 'collection', name: 'Heart Locket', chance: 0.1 },
      { type: 'collection', name: 'Plush Pepe', chance: 0.05 }
    ]
  }
];

let CASES = [];
function rebuildCasesMeta() {
  CASES = CASES_RAW.map((c) => ({
    id: c.id,
    name: c.name,
    price: c.price,
    isPromo: Boolean(c.isPromo),
    isFree: Boolean(c.isFree),
    accent: c.accent,
    cover: c.cover,
    items: c.entries.map(buildCaseItemMeta)
  }));
}
rebuildCasesMeta();

// Lucky Wheel (10 Stars — cheaper, images ONLY for gifts, digits for stars, tiny chance for un-upgraded Chill Flame!)
const CHILL_FLAME_COL = COLLECTIONS_BY_NAME.get('Chill Flame') || CATALOG.collections[0];
function wheelBasicImg(slug) {
  return BASIC_BY_SLUG.get(slug)?.image || `${slug}.png`;
}
function wheelCol(name) {
  return COLLECTIONS_BY_NAME.get(name) || CHILL_FLAME_COL;
}

const WHEEL_TIERS = [
  {
    id: 'low',
    label: 'Low',
    cost: 10,
    segments: [
      { id: 'low_s1',    type: 'stars',      amount: 1,   label: '1',           image: '',                                       weight: 34,  color: '#1e2c3a' },
      { id: 'low_bear',  type: 'basic',      slug: 'basic_bear',    label: 'Мишка',  image: wheelBasicImg('basic_bear'),         weight: 6.5, color: '#243a52' },
      { id: 'low_s2',    type: 'stars',      amount: 2,   label: '2',           image: '',                                       weight: 24,  color: '#182430' },
      { id: 'low_rose',  type: 'basic',      slug: 'basic_rose',    label: 'Роза',   image: wheelBasicImg('basic_rose'),         weight: 4.5, color: '#4c182c' },
      { id: 'low_s3',    type: 'stars',      amount: 3,   label: '3',           image: '',                                       weight: 16,  color: '#1e2c3a' },
      { id: 'low_cake',  type: 'basic',      slug: 'basic_cake',    label: 'Торт',   image: wheelBasicImg('basic_cake'),         weight: 3.0, color: '#523412' },
      { id: 'low_s5',    type: 'stars',      amount: 5,   label: '5',           image: '',                                       weight: 10,  color: '#182430' },
      { id: 'low_cup',   type: 'basic',      slug: 'basic_trophy',  label: 'Кубок',  image: wheelBasicImg('basic_trophy'),       weight: 1.6, color: '#39225c' },
      { id: 'low_jp',    type: 'collection', name: wheelCol('Chill Flame').name, label: 'Chill Flame', image: getOriginalImage(wheelCol('Chill Flame')), weight: 0.4, color: '#7c2d12', jackpot: true }
    ]
  },
  {
    id: 'medium',
    label: 'Medium',
    cost: 50,
    segments: [
      { id: 'med_s10',   type: 'stars',      amount: 10,  label: '10',          image: '',                                       weight: 33,  color: '#1e2c3a' },
      { id: 'med_champ', type: 'basic',      slug: 'basic_champagne', label: 'Шампанское', image: wheelBasicImg('basic_champagne'), weight: 7.5, color: '#23405c' },
      { id: 'med_s20',   type: 'stars',      amount: 20,  label: '20',          image: '',                                       weight: 23,  color: '#182430' },
      { id: 'med_cup',   type: 'basic',      slug: 'basic_trophy',    label: 'Кубок',      image: wheelBasicImg('basic_trophy'),    weight: 5.5, color: '#45225e' },
      { id: 'med_s30',   type: 'stars',      amount: 30,  label: '30',          image: '',                                       weight: 15,  color: '#1e2c3a' },
      { id: 'med_ring',  type: 'basic',      slug: 'basic_ring',      label: 'Кольцо',     image: wheelBasicImg('basic_ring'),      weight: 3.4, color: '#164e4d' },
      { id: 'med_s45',   type: 'stars',      amount: 45,  label: '45',          image: '',                                       weight: 10,  color: '#182430' },
      { id: 'med_lol',   type: 'collection', name: wheelCol('Lol Pop').name, label: 'Lol Pop', image: getOriginalImage(wheelCol('Lol Pop')), weight: 2.0, color: '#5a1e46' },
      { id: 'med_jp',    type: 'collection', name: wheelCol('Snoop Dogg').name, label: 'Snoop Dogg', image: getOriginalImage(wheelCol('Snoop Dogg')), weight: 0.6, color: '#7c2d12', jackpot: true }
    ]
  },
  {
    id: 'high',
    label: 'High',
    cost: 200,
    segments: [
      { id: 'hi_s40',    type: 'stars',      amount: 40,  label: '40',          image: '',                                       weight: 32,  color: '#1e2c3a' },
      { id: 'hi_ring',   type: 'basic',      slug: 'basic_ring',      label: 'Кольцо',     image: wheelBasicImg('basic_ring'),      weight: 8.5, color: '#164e4d' },
      { id: 'hi_s80',    type: 'stars',      amount: 80,  label: '80',          image: '',                                       weight: 22,  color: '#182430' },
      { id: 'hi_diam',   type: 'basic',      slug: 'basic_diamond',   label: 'Алмаз',      image: wheelBasicImg('basic_diamond'),   weight: 6.0, color: '#1d3d6e' },
      { id: 'hi_s130',   type: 'stars',      amount: 130, label: '130',         image: '',                                       weight: 15,  color: '#1e2c3a' },
      { id: 'hi_snoop',  type: 'collection', name: wheelCol('Snoop Dogg').name,   label: 'Snoop Dogg',   image: getOriginalImage(wheelCol('Snoop Dogg')),   weight: 4.5, color: '#4c1d52' },
      { id: 'hi_s190',   type: 'stars',      amount: 190, label: '190',         image: '',                                       weight: 9.0, color: '#182430' },
      { id: 'hi_cigar',  type: 'collection', name: wheelCol('Snoop Cigar').name,  label: 'Snoop Cigar',  image: getOriginalImage(wheelCol('Snoop Cigar')),  weight: 2.3, color: '#5c3416' },
      { id: 'hi_jp',     type: 'collection', name: wheelCol('Vintage Cigar').name, label: 'Vintage Cigar', image: getOriginalImage(wheelCol('Vintage Cigar')), weight: 0.7, color: '#7c2d12', jackpot: true }
    ]
  },
  {
    id: 'vip',
    label: 'VIP',
    cost: 1000,
    segments: [
      { id: 'vip_s250',  type: 'stars',      amount: 250, label: '250',         image: '',                                       weight: 31,  color: '#1e2c3a' },
      { id: 'vip_snoop', type: 'collection', name: wheelCol('Snoop Cigar').name,  label: 'Snoop Cigar',  image: getOriginalImage(wheelCol('Snoop Cigar')),  weight: 10,  color: '#4c2614' },
      { id: 'vip_s500',  type: 'stars',      amount: 500, label: '500',         image: '',                                       weight: 22,  color: '#182430' },
      { id: 'vip_ion',   type: 'collection', name: wheelCol('Ion Gem').name,      label: 'Ion Gem',      image: getOriginalImage(wheelCol('Ion Gem')),      weight: 6.5, color: '#1e3a6d' },
      { id: 'vip_s750',  type: 'stars',      amount: 750, label: '750',         image: '',                                       weight: 15,  color: '#1e2c3a' },
      { id: 'vip_shard', type: 'collection', name: wheelCol('Astral Shard').name, label: 'Astral Shard', image: getOriginalImage(wheelCol('Astral Shard')), weight: 3.5, color: '#451f66' },
      { id: 'vip_s950',  type: 'stars',      amount: 950, label: '950',         image: '',                                       weight: 9.0, color: '#182430' },
      { id: 'vip_bag',   type: 'collection', name: wheelCol('Loot Bag').name,     label: 'Loot Bag',     image: getOriginalImage(wheelCol('Loot Bag')),     weight: 2.4, color: '#5c3d0e' },
      { id: 'vip_jp',    type: 'collection', name: wheelCol('Plush Pepe').name,   label: 'Plush Pepe',   image: getOriginalImage(wheelCol('Plush Pepe')),   weight: 0.6, color: '#7c2d12', jackpot: true }
    ]
  }
];

const WHEEL_TIER_MAP = new Map(WHEEL_TIERS.map((t) => [t.id, t]));
const WHEEL_SEGMENTS = WHEEL_TIERS[0].segments;

const PLINKO_RISK_TABLES = {
  low: [4.2, 2.2, 1.4, 0.9, 0.5, 0.9, 1.4, 2.2, 4.2],
  medium: [4.0, 1.8, 1.0, 0.4, 0.2, 0.4, 1.0, 1.8, 4.0],
  high: [25.0, 6.0, 1.8, 0.3, 0.1, 0.3, 1.8, 6.0, 25.0]
};
const PLINKO_MULTIPLIERS = PLINKO_RISK_TABLES.medium;

// ======================== CORE API ROUTES ========================
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    user: serializeUser(req.user),
    appConfig: getPublicAppConfig(),
    levelConfig: {
      tiers: LEVEL_TIERS,
      frames: AVATAR_FRAMES
    },
    upgradeCost: UPGRADE_COST,
    wheelCost: WHEEL_COST,
    wheelTiers: WHEEL_TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      cost: t.cost,
      segments: t.segments.map(({ weight, ...rest }) => rest)
    })),
    cases: CASES,
    wheelSegments: WHEEL_SEGMENTS.map(({ weight, ...rest }) => rest),
    plinkoMultipliers: PLINKO_MULTIPLIERS,
    plinkoRiskTables: PLINKO_RISK_TABLES,
    plinkoRecentBets: plinkoRecentBets.slice(0, 30),
    safeRecentBets: safeRecentBets.slice(0, 30),
    liveFeeds,
    crashNftTiers: getCrashCatalogTiers(),
    marketPricing: {
      starsPerTon: STARS_PER_TON,
      commissionTon: MARKET_COMMISSION_TON,
      tonUsd: LIVE_TON_USD
    },
    pfCrash: {
      roundId: crashState.roundId,
      serverSeedHash: crashState.serverSeedHash || '',
      history: pfCrashHistory.slice(0, 20)
    },
    catalogSummary: {
      totalCollections: CATALOG.collections.length,
      totalModels: CATALOG.collections.reduce((acc, c) => acc + c.models.length, 0),
      totalBackdrops: CATALOG.backdrops.length,
      totalSymbols: CATALOG.symbols.length
    }
  });
});

// Equip or unequip an unlocked avatar frame
app.post('/api/profile/frame', authMiddleware, async (req, res) => {
  const frameId = String(req.body?.frameId || '').trim();
  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const lv = getUserLevelInfo(user);

  if (frameId === '') {
    user.avatarFrame = '';
  } else {
    const frameDef = FRAME_BY_ID.get(frameId);
    if (!frameDef) return res.status(400).json({ error: 'Неизвестная рамка' });
    if (lv.level < frameDef.level) {
      return res.status(403).json({ error: `Рамка открывается на Уровне ${frameDef.level}` });
    }
    user.avatarFrame = frameDef.id;
  }

  await user.save();
  // Live-sync active frame into ongoing multiplayer rounds immediately!
  const activeFrame = getActiveAvatarFrame(user);
  const cBet = crashState.bets.get(user.telegramId);
  if (cBet) { cBet.avatarFrame = activeFrame; io.emit('crash:bets', getCrashBetsArray()); }
  const pPl = pvpState.players.find((p) => p.telegramId === user.telegramId);
  if (pPl) { pPl.avatarFrame = activeFrame; broadcastPvpState(); }

  emitUserUpdate(user);
  res.json({ ok: true, avatarFrame: activeFrame, user: serializeUser(user) });
});

// Flush deferred reward & live-feed right when client animation ends (or on Skip)
app.post('/api/feed/flush', authMiddleware, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const entry = pendingFeeds.get(token);
  let flushed = false;
  if (entry && entry.ownerId === String(req.user.telegramId)) {
    await entry.publish();
    flushed = true;
  }
  const fresh = await User.findOne({ telegramId: req.user.telegramId });
  res.json({ ok: true, flushed, user: fresh ? serializeUser(fresh) : null });
});

// ======================== PROVABLY FAIR API ========================
app.get('/api/pf/state', authMiddleware, (req, res) => {
  const pf = ensureUserPf(req.user);
  res.json({
    userPf: {
      serverSeedHash: pf.serverSeedHash,
      clientSeed: pf.clientSeed,
      nonce: pf.nonce,
      history: pf.history.slice(0, 25)
    },
    crashPf: {
      roundId: crashState.roundId,
      serverSeedHash: crashState.serverSeedHash || '',
      history: pfCrashHistory.slice(0, 25)
    }
  });
});

app.post('/api/pf/client-seed', authMiddleware, async (req, res) => {
  const raw = String(req.body.clientSeed || '').trim().slice(0, 48);
  if (!raw || raw.length < 3) {
    return res.status(400).json({ error: 'Client Seed должен быть от 3 до 48 символов' });
  }
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const pf = ensureUserPf(user);
  pf.clientSeed = raw;
  await user.save();
  res.json({
    clientSeed: pf.clientSeed,
    serverSeedHash: pf.serverSeedHash,
    nonce: pf.nonce,
    user: serializeUser(user)
  });
});


// ======================== LEADERBOARD (TOP 10 BY TOTAL WAGERED) & PLAYER PROFILE STATS ========================
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  const allUsers = Object.values(memDb.users).filter((u) => !u.banned);
  allUsers.forEach(ensureUserStats);
  allUsers.sort((a, b) => {
    const dw = (b.stats?.totalWagered || 0) - (a.stats?.totalWagered || 0);
    if (dw !== 0) return dw;
    return (b.balance || 0) - (a.balance || 0);
  });

  const top10 = allUsers.slice(0, 10).map((u, i) => {
    const lv = getUserLevelInfo(u);
    return {
      rank: i + 1,
      telegramId: u.telegramId,
      firstName: u.firstName || 'Telegram User',
      lastName: u.lastName || '',
      username: u.username || '',
      photoUrl: u.photoUrl || '',
      avatarFrame: lv.activeFrame,
      level: lv.level,
      totalWagered: Math.floor(u.stats?.totalWagered || 0),
      totalGames: Math.floor(u.stats?.totalGames || 0),
      biggestWin: Math.floor(u.stats?.biggestWin || 0)
    };
  });

  const myIndex = allUsers.findIndex((u) => u.telegramId === req.user.telegramId);
  const myUser = req.user;
  ensureUserStats(myUser);

  res.json({
    leaderboard: top10,
    myRank: myIndex >= 0 ? myIndex + 1 : allUsers.length + 1,
    myTotalWagered: Math.floor(myUser.stats?.totalWagered || 0)
  });
});

app.get('/api/player/:telegramId', authMiddleware, async (req, res) => {
  const tid = String(req.params.telegramId).trim();
  const user = await User.findOne({ telegramId: tid });
  if (!user) return res.status(404).json({ error: 'Игрок не найден' });

  const stats = ensureUserStats(user);
  const levelInfo = getUserLevelInfo(user);
  const inv = Array.isArray(user.inventory) ? user.inventory : [];
  const inventoryValue = inv.reduce((sum, g) => sum + Math.round(g.value || 0), 0);

  res.json({
    player: {
      telegramId: user.telegramId,
      firstName: user.firstName || 'Telegram User',
      lastName: user.lastName || '',
      username: user.username || '',
      photoUrl: user.photoUrl || '',
      avatarFrame: levelInfo.activeFrame,
      level: levelInfo.level,
      levelInfo,
      createdAt: user.createdAt || new Date().toISOString(),
      giftsCount: inv.length,
      inventoryValue,
      stats
    }
  });
});

// ======================== REAL GIFT CRAFT POOL (1.5x .. 3.0x OF TOTAL SUM) ========================
const CRAFT_TIER_TARGETS = [
  { targetMult: 1.50, weight: 36, tier: 'Common',    center: '#1e3a5f', edge: '#0f1d2e' },
  { targetMult: 1.75, weight: 25, tier: 'Uncommon',  center: '#134e4a', edge: '#0a2624' },
  { targetMult: 2.00, weight: 17, tier: 'Rare',      center: '#1d4ed8', edge: '#0f1f5c' },
  { targetMult: 2.35, weight: 11, tier: 'Epic',      center: '#6d28d9', edge: '#2e1065' },
  { targetMult: 2.70, weight: 7,  tier: 'Epic',      center: '#9333ea', edge: '#3b0764' },
  { targetMult: 3.00, weight: 4,  tier: 'Legendary', center: '#b45309', edge: '#451a03' }
];

function buildCraftRewardPool(totalInputValue) {
  const sum = Math.max(15, Math.round(Number(totalInputValue) || 0));
  const sortedCols = [...CATALOG.collections].sort((a, b) => a.price - b.price);
  const usedNames = new Set();
  const pickedCols = [];

  for (const spec of CRAFT_TIER_TARGETS) {
    const targetPrice = sum * spec.targetMult;
    // Prefer unused collections strictly pricier than input sum and within sane max (~3.6x)
    let candidates = sortedCols.filter((c) => !usedNames.has(c.name) && c.price > sum && c.price <= sum * 3.6);
    if (!candidates.length && pickedCols.length === 0) {
      candidates = sortedCols.filter((c) => !usedNames.has(c.name) && c.price > sum);
    }
    if (!candidates.length && pickedCols.length === 0) {
      candidates = sortedCols.filter((c) => !usedNames.has(c.name));
    }
    if (!candidates.length) break;

    let best = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      // Relative distance (allows slightly below or slightly above targetMult cleanly!)
      const relDiff = Math.abs(c.price - targetPrice) / Math.max(1, targetPrice);
      // Slight preference to stay within [1.35x .. 3.25x] if available
      const mult = c.price / sum;
      const outPenalty = (mult < 1.35 || mult > 3.35) ? 0.35 : 0;
      const score = relDiff + outPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    usedNames.add(best.name);
    pickedCols.push(best);
  }

  // Sort ascending by actual price so cheapest (~x1.5) is most common and priciest (~x3.0) is rarest!
  pickedCols.sort((a, b) => a.price - b.price);

  const count = pickedCols.length;
  const specs = CRAFT_TIER_TARGETS.slice(0, count);
  const weightSum = specs.reduce((s, x) => s + x.weight, 0) || 100;

  return pickedCols.map((col, idx) => {
    const sp = specs[idx] || CRAFT_TIER_TARGETS[CRAFT_TIER_TARGETS.length - 1];
    const actualMult = Number((col.price / sum).toFixed(2));
    const chancePct = Number(((sp.weight / weightSum) * 100).toFixed(1));
    return {
      collectionName: col.name,
      price: col.price,
      actualMult,
      targetMult: sp.targetMult,
      chance: chancePct,
      weight: sp.weight,
      tier: sp.tier,
      center: sp.center,
      edge: sp.edge,
      image: getOriginalImage(col)
    };
  });
}

app.post('/api/craft/preview', authMiddleware, (req, res) => {
  const totalValue = Math.max(0, Number(req.body?.totalValue) || 0);
  if (totalValue <= 0) return res.json({ totalValue: 0, pool: [] });
  res.json({
    totalValue,
    pool: buildCraftRewardPool(totalValue)
  });
});

app.get('/api/catalog', authMiddleware, (_req, res) => {
  res.json({
    cdn: CDN_BASE,
    basicGifts: BASIC_GIFTS,
    collections: CATALOG.collections.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      floorTon: c.floorTon,
      marketTon: c.marketTon,
      image: getOriginalImage(c),
      modelsCount: c.models.length,
      backdropsCount: c.backdrops.length,
      symbolsCount: c.symbols.length
    }))
  });
});

app.get('/api/catalog/collection/:name', authMiddleware, (req, res) => {
  const col = COLLECTIONS_BY_NAME.get(req.params.name);
  if (!col) return res.status(404).json({ error: 'Коллекция не найдена' });
  res.json({
    id: col.id,
    name: col.name,
    price: col.price,
    image: getOriginalImage(col),
    models: col.models.map(([name, rarity]) => ({ name, rarity, image: getModelImage(col.name, name) })),
    backdrops: col.backdrops.map(([idx, rarity]) => {
      const b = CATALOG.backdrops[idx];
      return { name: b[0], center: b[1], edge: b[2], pattern: b[3], text: b[4], rarity };
    }),
    symbols: col.symbols.slice(0, 60).map(([idx, rarity]) => {
      const sName = CATALOG.symbols[idx];
      return { name: sName, rarity, image: getPatternImage(col.name, sName) };
    })
  });
});

// ======================== TELEGRAM STARS DEPOSITS & REFUND STORAGE ========================
async function recordOrCreditStarDeposit({
  invoiceId = '',
  telegramId,
  amount,
  chargeId = '',
  providerChargeId = '',
  source = 'telegram_stars',
  fromBotWebhook = false
}) {
  if (!Array.isArray(memDb.starDeposits)) memDb.starDeposits = [];
  const tid = String(telegramId || '').trim();
  const amt = Math.max(1, Math.floor(Number(amount) || 0));
  const invId = String(invoiceId || '').trim();
  const cId = String(chargeId || '').trim();
  const pId = String(providerChargeId || '').trim();

  // Deduplicate by chargeId or invoiceId (or very recent matching topup within 60s when chargeId arrives from bot webhook)
  let rec = null;
  if (cId) rec = memDb.starDeposits.find((d) => d.chargeId === cId);
  if (!rec && invId) rec = memDb.starDeposits.find((d) => d.invoiceId === invId);
  if (!rec && fromBotWebhook && cId) {
    const cutoff = Date.now() - 90 * 1000;
    rec = memDb.starDeposits.find(
      (d) => String(d.telegramId) === tid && d.amount === amt && !d.chargeId && (d.createdAt || 0) >= cutoff
    );
  }

  let user = await User.findOne({ telegramId: tid });
  if (!user) return { user: null, deposit: rec, bonusStars: 0 };

  if (rec) {
    let changed = false;
    if (cId && !rec.chargeId) { rec.chargeId = cId; changed = true; }
    if (pId && !rec.providerChargeId) { rec.providerChargeId = pId; changed = true; }
    if (invId && !rec.invoiceId) { rec.invoiceId = invId; changed = true; }
    if (changed) {
      scheduleDbSave();
      if (typeof io !== 'undefined') io.to('admin_room').emit('admin:deposits_update', { id: rec.id });
    }
    return { user, deposit: rec, bonusStars: rec.bonusStars || 0, alreadyCredited: true };
  }

  const bonusPct = Math.max(0, Math.min(200, Math.floor(Number(adminConfig?.depositBonusPct) || 0)));
  const bonusStars = bonusPct > 0 ? Math.floor(amt * bonusPct / 100) : 0;
  const totalAdded = amt + bonusStars;

  user.balance += totalAdded;
  pushHistory(
    user,
    'topup',
    totalAdded,
    bonusStars > 0 ? `Пополнение +${amt} зв. (+${bonusStars} бонус ${bonusPct}%)` : `Пополнение (+${amt} зв.)`
  );
  await user.save();

  rec = {
    id: makeUid(),
    invoiceId: invId || makeUid(),
    telegramId: tid,
    firstName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Игрок',
    username: user.username || '',
    photoUrl: user.photoUrl || '',
    amount: amt,
    bonusStars,
    totalAdded,
    currency: 'XTR',
    chargeId: cId,
    providerChargeId: pId,
    source,
    status: 'paid', // 'paid' | 'refunded'
    createdAt: Date.now(),
    refundedAt: 0,
    refundedBy: '',
    deductedAmount: 0
  };
  memDb.starDeposits.unshift(rec);
  if (memDb.starDeposits.length > 1000) memDb.starDeposits = memDb.starDeposits.slice(0, 1000);
  saveDbNow();

  if (typeof io !== 'undefined') {
    io.to(`user_${tid}`).emit('user:sync', serializeUser(user));
    io.to('admin_room').emit('admin:deposits_update', { id: rec.id });
  }
  return { user, deposit: rec, bonusStars, alreadyCredited: false };
}

// Top-up Stars (creates real Telegram Stars invoice link via Bot API)
app.post('/api/topup', authMiddleware, async (req, res) => {
  const amount = Math.floor(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
    return res.status(400).json({ error: 'Сумма от 10 до 100 000 ⭐' });
  }
  const invoiceId = makeUid();
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Пополнение ${amount} ⭐`,
        description: `Пополнение баланса ZetGifts на ${amount} Telegram Stars`,
        payload: JSON.stringify({ id: invoiceId, uid: req.user.telegramId, amount, ts: Date.now() }),
        currency: 'XTR',
        prices: [{ label: `${amount} Telegram Stars`, amount }]
      })
    });
    const data = await tgRes.json();
    if (data && data.ok && data.result) {
      return res.json({ invoiceUrl: data.result, amount, invoiceId });
    }
    return res.status(502).json({ error: data.description || 'Не удалось создать счёт Telegram Stars' });
  } catch (err) {
    console.error('Invoice error:', err);
    return res.status(502).json({ error: 'Ошибка соединения с Telegram Bot API' });
  }
});

// Confirm paid Telegram Stars invoice (deduplicated with bot successful_payment webhook)
app.post('/api/topup/confirm', authMiddleware, async (req, res) => {
  const amount = Math.floor(Number(req.body.amount));
  const status = String(req.body.status || '');
  const invoiceId = String(req.body.invoiceId || '').trim();
  const chargeId = String(req.body.chargeId || '').trim();
  if (status !== 'paid' || !Number.isFinite(amount) || amount < 10 || amount > 100000) {
    return res.status(400).json({ error: 'Платёж не подтверждён' });
  }
  const result = await recordOrCreditStarDeposit({
    invoiceId,
    telegramId: req.user.telegramId,
    amount,
    chargeId,
    source: 'telegram_stars',
    fromBotWebhook: false
  });
  if (!result.user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: serializeUser(result.user), bonusStars: result.bonusStars, depositId: result.deposit?.id || '' });
});

// ======================== GIFTS: BUY / UPGRADE / CRAFT / SELL / WITHDRAW ========================
app.post('/api/gifts/buy', authMiddleware, async (req, res) => {
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const { basicSlug, collectionName, collectionId } = req.body;

  if (basicSlug && BASIC_BY_SLUG.has(basicSlug)) {
    const bg = BASIC_BY_SLUG.get(basicSlug);
    if (user.balance < bg.price) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${bg.price} ⭐)` });
    user.balance -= bg.price;
    const gift = createBasicGift(bg, 'Магазин');
    user.inventory.unshift(gift);
    pushHistory(user, 'bet', -bg.price, `Покупка подарка «${bg.name}»`);
    await user.save();
    return res.json({ gift, user: serializeUser(user) });
  }

  const col = COLLECTIONS_BY_NAME.get(collectionName) || COLLECTIONS_BY_ID.get(collectionId);
  if (!col) return res.status(404).json({ error: 'Подарок не найден в каталоге Telegram' });
  if (user.balance < col.price) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${col.price} ⭐)` });

  user.balance -= col.price;
  const gift = createRegularGift(col, 'Telegram Shop');
  user.inventory.unshift(gift);
  pushHistory(user, 'bet', -col.price, `Покупка подарка «${col.name}»`);
  await user.save();
  res.json({ gift, user: serializeUser(user) });
});

// UPGRADE regular Telegram Gift -> Collectible NFT (25 ⭐, exact Telegram traits)
app.post('/api/gifts/upgrade', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден в инвентаре' });

  const gift = user.inventory[idx];
  if (gift.withdrawPending || gift.inAuction) {
    return res.status(400).json({ error: gift.inAuction ? 'Подарок выставлен на аукцион' : 'Подарок ожидает вывода — сначала отмените вывод' });
  }
  if (gift.upgradable === false || gift.basicSlug) {
    return res.status(400).json({ error: 'Обычный не-коллекционный подарок нельзя улучшить' });
  }
  if (gift.upgraded) return res.status(400).json({ error: 'Этот подарок уже улучшен' });
  if (user.balance < UPGRADE_COST) return res.status(400).json({ error: `Нужно ${UPGRADE_COST} ⭐ для улучшения` });

  const col = COLLECTIONS_BY_ID.get(gift.collectionId) || COLLECTIONS_BY_NAME.get(gift.collectionName);
  if (!col) return res.status(400).json({ error: 'Коллекция не поддерживает улучшение' });

  user.balance -= UPGRADE_COST;
  const balanceAfterBet = Math.floor(user.balance);
  const traits = await rollUpgradedTraits(col);

  gift.upgraded = true;
  gift.mintNumber = traits.mintNumber;
  gift.model = traits.model;
  gift.backdrop = traits.backdrop;
  gift.symbol = traits.symbol;
  gift.image = traits.image;
  gift.lottie = traits.lottie;
  gift.value = traits.value;
  gift.floorTon = traits.floorTon;
  gift.marketTon = traits.marketTon;

  if (traits.backdrop?.floorTon >= 15 || traits.value >= 1800) {
    logAdminEvent(
      'drop',
      `Редкий апгрейд: ${col.name} #${traits.mintNumber}!`,
      `Модель: ${traits.model.name} (${traits.model.rarity}%), Фон: ${traits.backdrop.name} (${traits.backdrop.floorTon} TON), Цена: ${traits.value} звёзд (~${traits.marketTon} TON)`,
      user
    );
  }

  ensureUserStats(user).giftsUpgraded += 1;
  pushHistory(user, 'upgrade', -UPGRADE_COST, `Улучшение «${col.name}» #${traits.mintNumber} (${traits.model.name})`);
  user.markModified('inventory');
  await user.save();

  const previewModels = [];
  for (let i = 0; i < 16; i++) {
    const rm = col.models[crypto.randomInt(0, col.models.length)];
    previewModels.push({ name: rm[0], rarity: rm[1], image: getModelImage(col.name, rm[0]) });
  }
  const previewBackdrops = [];
  for (let i = 0; i < 12; i++) {
    const rb = col.backdrops[crypto.randomInt(0, col.backdrops.length)];
    const b = CATALOG.backdrops[rb[0]];
    if (b) previewBackdrops.push({ name: b[0], rarity: rb[1], center: b[1], edge: b[2] });
  }
  const previewSymbols = [];
  for (let i = 0; i < 12; i++) {
    const rs = col.symbols[crypto.randomInt(0, col.symbols.length)];
    const sn = CATALOG.symbols[rs[0]] || 'Star';
    previewSymbols.push({ name: sn, rarity: rs[1] });
  }

  res.json({
    gift,
    balanceAfterBet,
    previewModels,
    previewBackdrops,
    previewSymbols,
    user: serializeUser(user)
  });
});

// CRAFT (1-4 UPGRADED gifts from SAME collection: 1=10%, 2=30%, 3=60%, 4=100%)
const CRAFT_CHANCES = { 1: 8, 2: 24, 3: 52, 4: 85 };

app.post('/api/gifts/craft', authMiddleware, async (req, res) => {
  const uids = Array.isArray(req.body.uids) ? [...new Set(req.body.uids.map(String))] : [];
  if (uids.length < 1 || uids.length > 4) {
    return res.status(400).json({ error: 'Выберите от 1 до 4 подарков' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  const selected = [];
  for (const uid of uids) {
    const g = user.inventory.find((item) => item.uid === uid);
    if (!g) return res.status(404).json({ error: 'Один из подарков не найден' });
    if (g.withdrawPending || g.inAuction) return res.status(400).json({ error: g.inAuction ? 'Подарок в аукционе — его нельзя использовать' : 'Подарок ожидает вывода — его нельзя использовать' });
    selected.push(g);
  }

  const totalInputValue = selected.reduce((sum, g) => sum + (Number(g.value) || 15), 0);
  const rewardPool = buildCraftRewardPool(totalInputValue);
  if (!rewardPool.length) {
    return res.status(400).json({ error: 'Нет доступных подарков для крафта' });
  }

  const chance = CRAFT_CHANCES[selected.length];
  const roll = crypto.randomInt(0, 10000) / 100; // 0.00 .. 99.99
  const success = roll < chance;

  // Burn committed gifts
  const uidSet = new Set(uids);
  user.inventory = user.inventory.filter((g) => !uidSet.has(g.uid));

  let resultGift = null;
  let pickedTier = null;

  if (success) {
    pickedTier = weightedPick(rewardPool, (item) => item.weight || 1);
    const pickedCol = COLLECTIONS_BY_NAME.get(pickedTier.collectionName) || CATALOG.collections[0];
    resultGift = createRegularGift(pickedCol, 'Крафт');
  }

  // Save ONLY the burned input gifts now — resultGift & craft history are credited strictly AFTER 3D cube animation!
  user.markModified('inventory');
  await user.save();

  const craftUid = user.telegramId;
  const craftUserSnap = {
    firstName: user.firstName || 'Игрок',
    username: user.username || '',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user)
  };
  const craftWinVal = success && resultGift ? Math.round(Number(resultGift.value) || 0) : 0;

  const feedToken = schedulePendingFeed(craftUid, 12000, async () => {
    const u = await User.findOne({ telegramId: craftUid });
    if (u) {
      if (success && resultGift) {
        ensureUserStats(u).giftsCrafted += 1;
        u.inventory.unshift(resultGift);
        u.markModified('inventory');
        pushHistory(u, 'craft', 0, `Успешный крафт (${chance}%, x${pickedTier.actualMult}): ${resultGift.collectionName} (${resultGift.value})`);
        if (pickedTier.actualMult >= 2.5 || resultGift.value >= 1500) {
          logAdminEvent(
            'drop',
            `Редкий крафт [x${pickedTier.actualMult}]: ${resultGift.collectionName}`,
            `Шанс: ${chance}%, Сумма входа: ${totalInputValue} -> Выигрыш: ${resultGift.value} звёзд`,
            u
          );
        }
      } else {
        pushHistory(u, 'craft', 0, `Неудачный крафт (${chance}%): сгорело ${selected.length} подарков на ${totalInputValue} звёзд`);
      }
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }

    recordAdminGameRound('craft', {
      summary: success && resultGift
        ? `Успех (${chance}%) • ${resultGift.collectionName} (x${pickedTier?.actualMult || 1.5})`
        : `Неудача (${chance}%) • сгорело ${selected.length} шт.`,
      mult: success && pickedTier?.actualMult ? pickedTier.actualMult : 0,
      totalBet: totalInputValue,
      totalPayout: craftWinVal,
      totalLost: success ? 0 : totalInputValue,
      houseProfit: totalInputValue - craftWinVal,
      players: [{
        telegramId: craftUid,
        firstName: craftUserSnap.firstName,
        username: craftUserSnap.username,
        photoUrl: craftUserSnap.photoUrl,
        avatarFrame: craftUserSnap.avatarFrame,
        bet: totalInputValue,
        payout: craftWinVal,
        lost: success ? 0 : totalInputValue,
        status: success ? 'win' : 'lose',
        detail: success && resultGift ? `Выпал «${resultGift.collectionName}» (${craftWinVal} зв.)` : `Сгорело ${selected.length} подарков`
      }]
    });

    if (success && resultGift) {
      pushLiveFeed('craft', {
        firstName: craftUserSnap.firstName,
        photoUrl: craftUserSnap.photoUrl,
        avatarFrame: craftUserSnap.avatarFrame,
        giftName: resultGift.collectionName,
        giftImage: resultGift.image,
        tier: pickedTier?.tier || 'Rare',
        actualMult: pickedTier?.actualMult || 1.5,
        chance,
        value: resultGift.value,
        backdropName: ''
      });
    }
  });

  res.json({
    success,
    chance,
    totalInputValue,
    actualMult: pickedTier?.actualMult || null,
    burnedCount: selected.length,
    burnedGifts: selected.map((g) => ({
      uid: g.uid,
      collectionName: g.collectionName,
      mintNumber: g.mintNumber,
      image: g.image,
      center: g.backdrop?.center || '#243447',
      edge: g.backdrop?.edge || '#17212b'
    })),
    resultGift,
    feedToken,
    previewModels: rewardPool,
    user: serializeUser(user)
  });
});

app.post('/api/gifts/sell', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден' });
  if (user.inventory[idx].withdrawPending || user.inventory[idx].inAuction) {
    return res.status(400).json({ error: user.inventory[idx].inAuction ? 'Подарок в аукционе — сначала снимите его' : 'Подарок ожидает вывода — сначала отмените вывод' });
  }

  const [gift] = user.inventory.splice(idx, 1);
  const price = Math.max(10, Math.round(gift.value || 25));
  user.balance += price;
  const displayName = gift.crafted ? (gift.craftedRuName || gift.craftedName) : gift.collectionName;
  pushHistory(user, 'sell', price, `Продажа «${displayName}» (+${price} ⭐)`);
  user.markModified('inventory');
  await user.save();

  res.json({ soldFor: price, user: serializeUser(user) });
});

function buildGiftPublicLink(gift) {
  if (!gift) return '';
  const slug = String(gift.collectionName || '').replace(/[^a-zA-Z0-9]/g, '');
  if (gift.upgraded && slug && gift.mintNumber) {
    return `https://t.me/nft/${slug}-${gift.mintNumber}`;
  }
  if (slug) return `https://t.me/nft/${slug}-1`;
  return '';
}

function escHtmlSafe(s) {
  return String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function buildWithdrawAdminHtml(wd, statusNote = '') {
  const g = wd.giftSnapshot || {};
  const fullName = [wd.firstName, wd.lastName].filter(Boolean).join(' ') || 'Игрок';
  const profileLink = `<a href="tg://user?id=${escHtmlSafe(wd.telegramId)}">${escHtmlSafe(fullName)}</a>`;
  const userTag = wd.username ? `@${escHtmlSafe(wd.username)}` : 'нет username';
  const gTitle = g.crafted
    ? `${g.craftedRuName || g.craftedName || g.collectionName}${g.mintNumber ? ` #${g.mintNumber}` : ''}`
    : `${g.collectionName || 'Подарок'}${g.mintNumber ? ` #${g.mintNumber}` : ''}`;
  const gLink = wd.giftLink ? `<a href="${escHtmlSafe(wd.giftLink)}">${escHtmlSafe(gTitle)}</a>` : `<b>${escHtmlSafe(gTitle)}</b>`;

  const lines = [
    `<b>Заявка на вывод подарка</b>  •  <code>#${escHtmlSafe(wd.id)}</code>`,
    '',
    `<b>Игрок:</b> ${profileLink}`,
    `<b>Username:</b> ${userTag}`,
    `<b>ID:</b> <code>${escHtmlSafe(wd.telegramId)}</code>`,
    '',
    `<b>Подарок:</b> ${gLink}`,
    `<b>Коллекция:</b> ${escHtmlSafe(g.collectionName || '—')}`,
    `<b>Цена:</b> ${Math.round(Number(g.value) || 0)} зв.`
  ];
  if (g.upgraded || g.crafted) {
    lines.push(`<b>Модель:</b> ${escHtmlSafe(g.model?.name || '—')}${g.model?.rarity ? ` (${g.model.rarity}%)` : ''}`);
    lines.push(`<b>Фон:</b> ${escHtmlSafe(g.backdrop?.name || '—')}${g.backdrop?.rarity ? ` (${g.backdrop.rarity}%)` : ''}`);
    lines.push(`<b>Символ:</b> ${escHtmlSafe(g.symbol?.name || '—')}${g.symbol?.rarity ? ` (${g.symbol.rarity}%)` : ''}`);
  } else {
    lines.push('<b>Тип:</b> Обычный подарок');
  }
  if (statusNote) {
    lines.push('', `<b>Статус:</b> ${escHtmlSafe(statusNote)}`);
  }
  return lines.join('\n');
}

function generate9DigitWithdrawId() {
  const used = new Set((memDb.withdrawRequests || []).map((w) => String(w.id)));
  for (let i = 0; i < 40; i++) {
    const id = String(crypto.randomInt(100000000, 999999999));
    if (!used.has(id)) return id;
  }
  return String(Date.now()).slice(-9);
}

async function sendWithdrawRequestToAdminBot(wd) {
  if (!BOT_TOKEN || !ADMIN_LOG_CHAT_ID || process.env.DISABLE_BOT === '1') return;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_LOG_CHAT_ID,
        text: buildWithdrawAdminHtml(wd),
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Подтвердить', callback_data: `wd_ok:${wd.id}` },
            { text: 'Отменить', callback_data: `wd_no:${wd.id}` }
          ]]
        }
      })
    });
    const data = await resp.json().catch(() => null);
    if (data?.ok && data.result?.message_id) {
      wd.botMessageId = data.result.message_id;
      wd.botChatId = String(data.result.chat?.id || ADMIN_LOG_CHAT_ID);
      scheduleDbSave();
    }
  } catch (err) {
    console.warn('[Withdraw Bot Notify]', err.message);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegramText(chatId, htmlText) {
  if (!chatId || !BOT_TOKEN || process.env.DISABLE_BOT === '1') return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: String(htmlText),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const j = await resp.json().catch(() => ({}));
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

async function deleteWithdrawBotMessage(wd, fallbackNote = '') {
  if (!wd?.botMessageId || !BOT_TOKEN || process.env.DISABLE_BOT === '1') return;
  const chatId = wd.botChatId || ADMIN_LOG_CHAT_ID;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: wd.botMessageId })
    });
    const data = await resp.json().catch(() => ({ ok: false }));
    if (data?.ok) {
      wd.botMessageId = null;
      return;
    }
  } catch {}
  // Fallback if Telegram cannot delete older messages: strip inline buttons and mark status
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: wd.botMessageId,
        text: buildWithdrawAdminHtml(wd, fallbackNote || 'Обработано'),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] }
      })
    });
  } catch {}
}

function restoreGiftPositionAfterWithdrawCancel(user, giftUid) {
  const curIdx = (user.inventory || []).findIndex((g) => g.uid === giftUid);
  if (curIdx === -1) return null;
  const [gift] = user.inventory.splice(curIdx, 1);
  const targetIdx = Number.isFinite(Number(gift.withdrawOrigIdx))
    ? Math.max(0, Math.min(user.inventory.length, Number(gift.withdrawOrigIdx)))
    : 0;
  delete gift.withdrawPending;
  delete gift.withdrawId;
  delete gift.withdrawRequestedAt;
  delete gift.withdrawOrigIdx;
  user.inventory.splice(targetIdx, 0, gift);
  return gift;
}

async function resolveWithdrawRequest(reqId, approve, actor = 'admin') {
  if (!Array.isArray(memDb.withdrawRequests)) memDb.withdrawRequests = [];
  const wd = memDb.withdrawRequests.find((w) => String(w.id) === String(reqId));
  if (!wd) return { error: 'Заявка на вывод не найдена' };
  if (wd.status !== 'pending') return { error: `Заявка уже обработана (${wd.status})` };

  const user = await User.findOne({ telegramId: String(wd.telegramId) });
  const gName = wd.giftName || wd.giftSnapshot?.collectionName || 'Подарок';

  if (approve) {
    wd.status = 'approved';
    wd.resolvedAt = Date.now();
    wd.resolvedBy = actor;
    if (user) {
      user.inventory = (user.inventory || []).filter((g) => g.uid !== wd.giftUid);
      pushHistory(user, 'withdraw', 0, `Вывод #${wd.id}: «${gName}» — Выведено`);
      user.markModified('inventory');
      await user.save();
      emitUserUpdate(user);
      io.to(`user_${user.telegramId}`).emit('user:sync', serializeUser(user));
      io.to(`user_${user.telegramId}`).emit('withdraw:resolved', {
        approved: true,
        withdrawId: wd.id,
        giftUid: wd.giftUid,
        giftName: gName,
        text: `Подарок «${gName}» был выведен к вам в профиль`
      });
      sendTelegramText(user.telegramId, `✅ Подарок <b>${escapeHtml(gName)}</b> был выведен к вам в профиль!\nID заявки: <code>${wd.id}</code>`).catch(() => {});
    }
    deleteWithdrawBotMessage(wd, 'Выведено').catch(() => {});
    recordAdminAudit('Подтверждён вывод', `#${wd.id} • ${wd.firstName} [${wd.telegramId}] — ${gName}`);
  } else {
    wd.status = 'rejected';
    wd.resolvedAt = Date.now();
    wd.resolvedBy = actor;
    if (user) {
      restoreGiftPositionAfterWithdrawCancel(user, wd.giftUid);
      pushHistory(user, 'withdraw', 0, `Вывод #${wd.id}: «${gName}» — Отклонено`);
      user.markModified('inventory');
      await user.save();
      emitUserUpdate(user);
      io.to(`user_${user.telegramId}`).emit('user:sync', serializeUser(user));
      io.to(`user_${user.telegramId}`).emit('withdraw:resolved', {
        approved: false,
        withdrawId: wd.id,
        giftUid: wd.giftUid,
        giftName: gName,
        text: 'Подарок не был выведен, попробуйте позже'
      });
      sendTelegramText(user.telegramId, `Подарок <b>${escapeHtml(gName)}</b> не был выведен, попробуйте позже.\nID заявки: <code>${wd.id}</code>`).catch(() => {});
    }
    deleteWithdrawBotMessage(wd, 'Отклонено').catch(() => {});
    recordAdminAudit('Отклонён вывод', `#${wd.id} • ${wd.firstName} [${wd.telegramId}] — ${gName}`);
  }

  saveDbNow();
  io.to('admin_room').emit('admin:withdraw_update', {
    pendingCount: memDb.withdrawRequests.filter((w) => w.status === 'pending').length
  });
  return { ok: true, withdraw: wd };
}

app.post('/api/gifts/withdraw', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден' });
  const gift = user.inventory[idx];
  if (gift.withdrawPending) {
    return res.status(400).json({ error: 'Этот подарок уже ожидает вывода' });
  }
  if (gift.inAuction) {
    return res.status(400).json({ error: 'Подарок выставлен на аукцион — его нельзя вывести' });
  }
  // Collectible gifts MUST be upgraded before withdrawal; basic non-upgradable gifts (bear, cup, ring, etc.) can be withdrawn directly!
  const isBasic = gift.upgradable === false || Boolean(gift.basicSlug);
  if (!isBasic && !gift.upgraded && !gift.crafted) {
    return res.status(400).json({ error: 'Коллекционный подарок можно вывести только после улучшения!' });
  }

  const reqId = generate9DigitWithdrawId();
  const displayName = gift.crafted
    ? (gift.craftedRuName || gift.craftedName)
    : `${gift.collectionName}${gift.mintNumber ? ' #' + gift.mintNumber : ''}`;

  // Mark gift as pending withdrawal (DO NOT remove from inventory!)
  gift.withdrawPending = true;
  gift.withdrawId = reqId;
  gift.withdrawRequestedAt = Date.now();
  gift.withdrawOrigIdx = idx;

  if (!Array.isArray(memDb.withdrawRequests)) memDb.withdrawRequests = [];
  const wdRecord = {
    id: reqId,
    status: 'pending',
    telegramId: String(user.telegramId),
    firstName: user.firstName || 'Игрок',
    lastName: user.lastName || '',
    username: user.username || '',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    giftUid: gift.uid,
    giftName: displayName,
    giftLink: buildGiftPublicLink(gift),
    giftSnapshot: {
      collectionName: gift.collectionName,
      mintNumber: gift.mintNumber || 0,
      upgraded: Boolean(gift.upgraded),
      crafted: Boolean(gift.crafted),
      value: gift.value || 0,
      image: gift.image || '',
      model: gift.model || null,
      backdrop: gift.backdrop || null,
      symbol: gift.symbol || null
    },
    createdAt: Date.now(),
    botMessageId: null,
    botChatId: null
  };
  memDb.withdrawRequests.unshift(wdRecord);
  if (memDb.withdrawRequests.length > 300) memDb.withdrawRequests = memDb.withdrawRequests.slice(0, 300);

  pushHistory(user, 'withdraw', 0, `Вывод #${reqId}: «${displayName}» — Ожидает`);
  user.markModified('inventory');
  await user.save();
  saveDbNow();

  sendWithdrawRequestToAdminBot(wdRecord).catch(() => {});
  io.to('admin_room').emit('admin:withdraw_update', {
    pendingCount: memDb.withdrawRequests.filter((w) => w.status === 'pending').length
  });

  res.json({
    withdrawId: reqId,
    message: `Заявка на вывод #${reqId} создана и ожидает подтверждения`,
    user: serializeUser(user)
  });
});

app.post('/api/gifts/withdraw/cancel', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const gift = (user.inventory || []).find((g) => g.uid === uid);
  if (!gift) return res.status(404).json({ error: 'Подарок не найден' });
  if (!gift.withdrawPending) return res.status(400).json({ error: 'Этот подарок не находится на выводе' });

  const reqId = gift.withdrawId;
  const restored = restoreGiftPositionAfterWithdrawCancel(user, uid);
  const displayName = restored
    ? `${restored.collectionName}${restored.mintNumber ? ' #' + restored.mintNumber : ''}`
    : 'Подарок';

  if (Array.isArray(memDb.withdrawRequests) && reqId) {
    const wd = memDb.withdrawRequests.find((w) => String(w.id) === String(reqId));
    if (wd && wd.status === 'pending') {
      wd.status = 'cancelled_by_user';
      wd.resolvedAt = Date.now();
      deleteWithdrawBotMessage(wd, 'Отменено пользователем').catch(() => {});
    }
  }

  pushHistory(user, 'withdraw', 0, `Вывод #${reqId || '—'}: «${displayName}» — Отменён`);
  user.markModified('inventory');
  await user.save();
  saveDbNow();

  io.to('admin_room').emit('admin:withdraws_update', {
    pendingCount: (memDb.withdrawRequests || []).filter((w) => w.status === 'pending').length
  });

  res.json({
    message: `Вывод подарка «${displayName}» отменён`,
    user: serializeUser(user)
  });
});

// ======================== GAME: LUCKY WHEEL (10 ⭐, CHILL FLAME JACKPOT) ========================
app.post('/api/games/wheel', authMiddleware, async (req, res) => {
  const tierId = String(req.body?.tier || 'low').toLowerCase();
  const tierDef = WHEEL_TIER_MAP.get(tierId) || WHEEL_TIERS[0];
  const cost = tierDef.cost;
  const segments = tierDef.segments;

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < cost) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${cost})` });

  user.balance -= cost;
  const balanceAfterBet = Math.floor(user.balance);
  const seg = weightedPick(segments, (s) => s.weight);
  const segIndex = segments.findIndex((s) => s.id === seg.id);

  let wonGift = null;
  let wonStars = 0;
  let histLine = '';

  if (seg.type === 'stars') {
    wonStars = seg.amount;
    histLine = `Колесо [${tierDef.label}]: +${wonStars} звёзд`;
  } else if (seg.type === 'collection') {
    const col = COLLECTIONS_BY_NAME.get(seg.name) || CHILL_FLAME_COL;
    wonGift = createRegularGift(col, `Колесо [${tierDef.label}]`);
    histLine = `Колесо [${tierDef.label}]: подарок «${col.name}» (${col.price})`;
  } else {
    const bg = BASIC_BY_SLUG.get(seg.slug) || BASIC_GIFTS[0];
    wonGift = createBasicGift(bg, `Колесо [${tierDef.label}]`);
    histLine = `Колесо [${tierDef.label}]: подарок «${bg.name}» (${bg.price})`;
  }

  recordWager(user, 'wheel', cost);
  await user.save();

  const wheelUid = user.telegramId;
  const wheelFeedPayload = (wonGift || wonStars >= Math.max(3, Math.floor(cost * 0.25))) ? {
    firstName: user.firstName || 'Игрок',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    tierId: tierDef.id,
    tierLabel: tierDef.label,
    isStars: !wonGift,
    amount: wonStars,
    giftName: wonGift ? wonGift.collectionName : '',
    giftImage: wonGift ? wonGift.image : '',
    value: wonGift ? wonGift.value : wonStars
  } : null;

  // Defer reward crediting strictly until the wheel finishes spinning!
  const feedToken = schedulePendingFeed(wheelUid, 9000, async () => {
    const u = await User.findOne({ telegramId: wheelUid });
    if (u) {
      if (wonStars > 0) u.balance += wonStars;
      if (wonGift) {
        u.inventory.unshift(wonGift);
        u.markModified('inventory');
      }
      pushHistory(u, 'win', wonGift ? -cost : (wonStars - cost), histLine);
      recordOutcome(u, 'wheel', cost, wonGift ? wonGift.value : wonStars);
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
      if (seg.jackpot && wonGift) {
        logAdminEvent('drop', `ДЖЕКПОТ Колеса [${tierDef.label}]: ${wonGift.collectionName}!`, `За ${cost} звёзд выпал ${wonGift.collectionName} (${wonGift.value} звёзд)`, u);
      }
    }
    if (wheelFeedPayload) pushLiveFeed('wheel', wheelFeedPayload);
  });

  res.json({
    tier: tierDef.id,
    cost,
    segmentIndex: segIndex,
    segment: { id: seg.id, label: seg.label, type: seg.type, image: seg.image || '' },
    balanceAfterBet,
    wonStars,
    wonGift,
    feedToken,
    user: serializeUser(user)
  });
});

// ======================== GAME: CASES (MULTI-SPIN x1/x2/x3/x5 + PROVABLY FAIR!) ========================
function weightedPickWithRoll(items, weightFn, roll01) {
  let total = 0;
  for (const it of items) total += Math.max(0, weightFn(it));
  if (total <= 0) return items[0];
  let r = Math.min(0.9999999, Math.max(0, roll01)) * total;
  for (const it of items) {
    r -= Math.max(0, weightFn(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// ======================== PROMO CODES ENGINE ========================
function normalizePromoCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

function syncPromoStatuses() {
  if (!Array.isArray(memDb.promoCodes)) memDb.promoCodes = [];
  const now = Date.now();
  let changed = false;
  for (const p of memDb.promoCodes) {
    if (!Array.isArray(p.usedBy)) p.usedBy = [];
    if (p.status === 'active') {
      if (p.expiresAt && now >= p.expiresAt) {
        p.status = 'expired';
        p.updatedAt = now;
        changed = true;
      } else if (p.maxUses !== null && p.maxUses !== undefined && p.usedCount >= p.maxUses) {
        p.status = 'exhausted';
        p.updatedAt = now;
        changed = true;
      }
    }
  }
  if (changed) scheduleDbSave();
}

function serializePromoForAdmin(p) {
  return {
    id: p.id,
    code: p.code,
    limitType: p.limitType || 'uses',
    maxUses: p.maxUses ?? null,
    usedCount: Number(p.usedCount) || 0,
    uniqueUsers: Array.isArray(p.usedBy) ? p.usedBy.length : 0,
    expiresAt: p.expiresAt || null,
    durationMinutes: p.durationMinutes || null,
    status: p.status || 'active',
    note: p.note || '',
    createdAt: p.createdAt || Date.now(),
    updatedAt: p.updatedAt || p.createdAt || Date.now()
  };
}

function durationToMs(value, unit) {
  const num = Math.max(1, Number(value) || 0);
  if (unit === 'days') return num * 24 * 60 * 60 * 1000;
  if (unit === 'hours') return num * 60 * 60 * 1000;
  return num * 60 * 1000; // minutes
}

app.post('/api/games/case/open', authMiddleware, async (req, res) => {
  syncDbFromDiskIfNewer();
  syncPromoStatuses();

  const caseDef = CASES.find((c) => c.id === req.body.caseId);
  if (!caseDef) return res.status(404).json({ error: 'Кейс не найден' });

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  let count = 1;
  let totalPrice = 0;
  let usedPromoObj = null;

  if (caseDef.isPromo) {
    const code = normalizePromoCode(req.body.promoCode);
    if (!code) {
      return res.status(400).json({ error: 'Введите промокод', errorCode: 'EMPTY' });
    }
    const promo = memDb.promoCodes.find((p) => p.code === code);
    if (!promo || promo.status === 'deleted') {
      return res.status(404).json({ error: 'Этого промокода не существует', errorCode: 'NOT_FOUND' });
    }
    if (promo.status === 'paused') {
      return res.status(400).json({ error: 'Этот промо-код больше не действителен', errorCode: 'PAUSED' });
    }
    if (promo.expiresAt && Date.now() >= promo.expiresAt) {
      promo.status = 'expired';
      promo.updatedAt = Date.now();
      saveDbNow();
      return res.status(400).json({ error: 'Этот промо-код больше не действителен', errorCode: 'EXPIRED' });
    }
    if (promo.status === 'expired') {
      return res.status(400).json({ error: 'Этот промо-код больше не действителен', errorCode: 'EXPIRED' });
    }
    if (!Array.isArray(promo.usedBy)) promo.usedBy = [];
    if (promo.usedBy.includes(String(user.telegramId))) {
      return res.status(400).json({ error: 'Вы уже использовали этот промокод', errorCode: 'ALREADY_USED' });
    }
    if (promo.status === 'exhausted' || (promo.maxUses !== null && promo.maxUses !== undefined && promo.usedCount >= promo.maxUses)) {
      promo.status = 'exhausted';
      promo.updatedAt = Date.now();
      saveDbNow();
      return res.status(400).json({ error: 'На этот промо-код закончились активации', errorCode: 'EXHAUSTED' });
    }

    // Consume 1 promo activation atomically
    promo.usedBy.push(String(user.telegramId));
    promo.usedCount = (Number(promo.usedCount) || 0) + 1;
    promo.updatedAt = Date.now();
    if (promo.maxUses !== null && promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) {
      promo.status = 'exhausted';
    }
    usedPromoObj = promo;
    count = 1;
    totalPrice = 0;
  } else {
    const allowedCounts = [1, 2, 3, 5];
    const reqCount = Number(req.body.count) || 1;
    count = allowedCounts.includes(reqCount) ? reqCount : 1;
    totalPrice = caseDef.price * count;
    if (user.balance < totalPrice) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${totalPrice})` });
    user.balance -= totalPrice;
  }
  const balanceAfterBet = Math.floor(user.balance);

  const makeStripCard = (item) => {
    if (item.type === 'stars') {
      return {
        isStars: true,
        amount: item.amount,
        name: `${item.amount}`,
        sub: `${item.amount}`,
        image: '',
        center: item.center,
        edge: item.edge
      };
    }
    return {
      isStars: false,
      amount: 0,
      name: item.name,
      sub: `${item.price}`,
      image: item.image,
      center: item.center,
      edge: item.edge
    };
  };

  const rolls = [];
  const pendingCaseFeedEntries = [];
  const pendingCaseHist = [];
  const pendingCaseOutcomes = [];
  let totalWonStars = 0;
  const wonGifts = [];

  for (let rIdx = 0; rIdx < count; rIdx++) {
    const pfRes = consumeUserPfRoll(user, `Кейс «${caseDef.name}»`);
    const pickedItem = weightedPickWithRoll(caseDef.items, (it) => it.chance, pfRes.roll01);
    let wonGift = null;
    let wonStars = 0;

    recordWager(user, 'cases', caseDef.price);
    if (pickedItem.type === 'stars') {
      wonStars = pickedItem.amount;
      totalWonStars += wonStars;
      pendingCaseOutcomes.push(wonStars);
      pendingCaseHist.push({ delta: wonStars - caseDef.price, msg: `Кейс «${caseDef.name}»: +${wonStars} звёзд` });
    } else if (pickedItem.type === 'basic') {
      const bg = BASIC_BY_SLUG.get(pickedItem.slug) || BASIC_GIFTS[0];
      wonGift = createBasicGift(bg, `Кейс «${caseDef.name}»`);
      wonGifts.push(wonGift);
      pendingCaseOutcomes.push(wonGift.value);
      pendingCaseHist.push({ delta: -caseDef.price, msg: `Кейс «${caseDef.name}»: ${wonGift.collectionName} (${wonGift.value})` });
    } else {
      const col = COLLECTIONS_BY_NAME.get(pickedItem.name) || CATALOG.collections[0];
      wonGift = createRegularGift(col, `Кейс «${caseDef.name}»`);
      wonGifts.push(wonGift);
      pendingCaseOutcomes.push(wonGift.value);
      pendingCaseHist.push({ delta: -caseDef.price, msg: `Кейс «${caseDef.name}»: ${wonGift.collectionName} (${wonGift.value})` });
    }

    const winnerIndex = 34;
    const strip = [];
    for (let i = 0; i < 42; i++) {
      if (i === winnerIndex) {
        strip.push(makeStripCard(pickedItem));
      } else {
        const rc = weightedPick(caseDef.items, (it) => Math.max(4, it.chance));
        strip.push(makeStripCard(rc));
      }
    }

    rolls.push({
      strip,
      winnerIndex,
      wonGift,
      wonStars,
      card: {
        isStars: !wonGift,
        amount: wonStars,
        name: wonGift ? wonGift.collectionName : `+${wonStars}`,
        value: wonGift ? wonGift.value : wonStars,
        image: wonGift ? wonGift.image : '',
        center: pickedItem.center,
        edge: pickedItem.edge,
        chance: pickedItem.chance,
        giftUid: wonGift ? wonGift.uid : ''
      },
      pf: pfRes.record
    });

    pendingCaseFeedEntries.push({
      caseId: caseDef.id,
      caseName: caseDef.name,
      caseCover: caseDef.cover,
      firstName: user.firstName || 'Игрок',
      photoUrl: user.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(user),
      isStars: !wonGift,
      amount: wonStars,
      giftName: wonGift ? wonGift.collectionName : `${wonStars}`,
      giftImage: wonGift ? wonGift.image : '',
      value: wonGift ? wonGift.value : wonStars
    });
  }

  // Save ONLY the case cost deduction — rewards are credited strictly when roulette finishes or Skip is pressed!
  await user.save();
  if (usedPromoObj) saveDbNow();

  const caseUid = user.telegramId;
  const feedToken = schedulePendingFeed(caseUid, 10000, async () => {
    const u = await User.findOne({ telegramId: caseUid });
    if (u) {
      if (totalWonStars > 0) u.balance += totalWonStars;
      if (wonGifts.length > 0) {
        for (const wg of wonGifts) u.inventory.unshift(wg);
        u.markModified('inventory');
      }
      for (const val of pendingCaseOutcomes) recordOutcome(u, 'cases', caseDef.price, val);
      for (const h of pendingCaseHist) pushHistory(u, 'case', h.delta, h.msg);
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    for (const entry of pendingCaseFeedEntries) {
      pushLiveFeed('cases', entry);
    }
  });

  const firstRoll = rolls[0];
  res.json({
    count,
    caseId: caseDef.id,
    promoCode: usedPromoObj ? usedPromoObj.code : null,
    rolls,
    strip: firstRoll.strip,
    winnerIndex: firstRoll.winnerIndex,
    wonGift: firstRoll.wonGift,
    wonStars: firstRoll.wonStars,
    totalWonStars,
    wonGifts,
    feedToken,
    provablyFair: firstRoll.pf,
    balanceAfterBet,
    user: serializeUser(user)
  });
});

// ======================== GAME: MINES (5x5, 3 MINES) ========================
const activeMinesGames = new Map(); // telegramId -> game state

function minesMultiplier(opened, minesCount = 3) {
  if (opened <= 0) return 1.0;
  let prob = 1;
  for (let i = 0; i < opened; i++) {
    prob *= (25 - minesCount - i) / (25 - i);
  }
  return Number((0.94 / prob).toFixed(2));
}

app.get('/api/games/mines/state', authMiddleware, (req, res) => {
  const g = activeMinesGames.get(req.user.telegramId);
  if (!g) return res.json({ active: false });
  res.json({
    active: true,
    bet: g.bet,
    minesCount: g.minesCount,
    revealed: Array.from(g.revealed),
    multiplier: minesMultiplier(g.revealed.size, g.minesCount),
    nextMultiplier: minesMultiplier(g.revealed.size + 1, g.minesCount)
  });
});

app.post('/api/games/mines/start', authMiddleware, async (req, res) => {
  const bet = Math.floor(Number(req.body.bet));
  const minesCount = Math.min(10, Math.max(3, Math.floor(Number(req.body.minesCount) || 3)));
  if (!Number.isFinite(bet) || bet < 5 || bet > 50000) {
    return res.status(400).json({ error: 'Ставка от 5 до 50 000 ⭐' });
  }
  if (activeMinesGames.has(req.user.telegramId)) {
    return res.status(400).json({ error: 'Сначала завершите текущую игру в Мины' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < bet) return res.status(400).json({ error: 'Недостаточно звёзд ⭐' });
  user.balance -= bet;
  recordWager(user, 'mines', bet);
  await user.save();

  const mines = new Set();
  while (mines.size < minesCount) {
    mines.add(crypto.randomInt(0, 25));
  }

  const game = { bet, minesCount, mines, revealed: new Set() };
  activeMinesGames.set(req.user.telegramId, game);

  res.json({
    active: true,
    bet,
    minesCount,
    revealed: [],
    multiplier: 1.0,
    nextMultiplier: minesMultiplier(1, minesCount),
    user: serializeUser(user)
  });
});

app.post('/api/games/mines/reveal', authMiddleware, async (req, res) => {
  const cell = Math.floor(Number(req.body.cell));
  const game = activeMinesGames.get(req.user.telegramId);
  if (!game) return res.status(400).json({ error: 'Нет активной игры' });
  if (!Number.isFinite(cell) || cell < 0 || cell > 24) return res.status(400).json({ error: 'Неверная клетка' });
  if (game.revealed.has(cell)) return res.status(400).json({ error: 'Клетка уже открыта' });

  if (game.mines.has(cell)) {
    const minePositions = Array.from(game.mines);
    activeMinesGames.delete(req.user.telegramId);
    const user = await User.findOne({ telegramId: req.user.telegramId });
    recordOutcome(user, 'mines', game.bet, 0);
    pushHistory(user, 'bet', -game.bet, `Мины: подрыв на бомбе (-${game.bet} ⭐)`);
    await user.save();
    return res.json({
      hitMine: true,
      cell,
      mines: minePositions,
      revealed: Array.from(game.revealed),
      user: serializeUser(user)
    });
  }

  game.revealed.add(cell);
  const mult = minesMultiplier(game.revealed.size, game.minesCount);
  const maxSafe = 25 - game.minesCount;

  // Auto-cashout if all safe tiles revealed
  if (game.revealed.size >= maxSafe) {
    const winAmount = Math.floor(game.bet * mult);
    const minePositions = Array.from(game.mines);
    activeMinesGames.delete(req.user.telegramId);
    const user = await User.findOne({ telegramId: req.user.telegramId });
    user.balance += winAmount;
    recordOutcome(user, 'mines', game.bet, winAmount, mult);
    pushHistory(user, 'win', winAmount - game.bet, `Мины: все алмазы x${mult} (+${winAmount} ⭐)`);
    await user.save();
    return res.json({
      hitMine: false,
      autoCashout: true,
      cell,
      mines: minePositions,
      revealed: Array.from(game.revealed),
      multiplier: mult,
      winAmount,
      user: serializeUser(user)
    });
  }

  res.json({
    hitMine: false,
    cell,
    revealed: Array.from(game.revealed),
    multiplier: mult,
    nextMultiplier: minesMultiplier(game.revealed.size + 1, game.minesCount),
    payout: Math.floor(game.bet * mult)
  });
});

app.post('/api/games/mines/cashout', authMiddleware, async (req, res) => {
  const game = activeMinesGames.get(req.user.telegramId);
  if (!game) return res.status(400).json({ error: 'Нет активной игры' });
  if (game.revealed.size === 0) return res.status(400).json({ error: 'Откройте хотя бы одну клетку' });

  const mult = minesMultiplier(game.revealed.size, game.minesCount);
  const winAmount = Math.floor(game.bet * mult);
  const minePositions = Array.from(game.mines);
  activeMinesGames.delete(req.user.telegramId);

  const user = await User.findOne({ telegramId: req.user.telegramId });
  user.balance += winAmount;
  recordOutcome(user, 'mines', game.bet, winAmount, mult);
  pushHistory(user, 'win', winAmount - game.bet, `Мины: забрал x${mult} (+${winAmount} ⭐)`);
  await user.save();

  res.json({
    cashedOut: true,
    multiplier: mult,
    winAmount,
    mines: minePositions,
    user: serializeUser(user)
  });
});

// ======================== GAME: PLINKO (3 RISK LEVELS + DEFERRED PAYOUT DISPLAY) ========================
app.post('/api/games/plinko/drop', authMiddleware, async (req, res) => {
  const bet = Math.floor(Number(req.body.bet));
  const rawRisk = String(req.body.risk || 'medium');
  const risk = PLINKO_RISK_TABLES[rawRisk] ? rawRisk : 'medium';
  const table = PLINKO_RISK_TABLES[risk];
  if (!Number.isFinite(bet) || bet < 5 || bet > 50000) {
    return res.status(400).json({ error: 'Ставка от 5 до 50 000 ⭐' });
  }
  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < bet) return res.status(400).json({ error: 'Недостаточно звёзд ⭐' });

  user.balance -= bet;
  const balanceAfterBet = Math.floor(user.balance);
  // 8 peg rows -> 9 pockets (binomial fair drop)
  const pathDirs = [];
  let rights = 0;
  for (let i = 0; i < 8; i++) {
    const dir = crypto.randomInt(0, 2); // 0 = left, 1 = right
    pathDirs.push(dir);
    rights += dir;
  }
  const bucketIndex = rights; // 0..8
  const multiplier = table[bucketIndex];
  const payout = Math.round(bet * multiplier);

  // Deduct bet ONLY now — payout is credited strictly AFTER the ball lands in the bucket!
  recordWager(user, 'plinko', bet);
  await user.save();

  const riskRu = risk === 'low' ? 'Лёгкий' : risk === 'high' ? 'Высокий' : 'Средний';
  const plinkoUid = user.telegramId;
  const plinkoEntry = {
    telegramId: user.telegramId,
    firstName: user.firstName || 'Player',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    bet,
    risk,
    multiplier,
    payout,
    createdAt: Date.now()
  };

  const feedToken = schedulePendingFeed(plinkoUid, 10000, async () => {
    const u = await User.findOne({ telegramId: plinkoUid });
    if (u) {
      if (payout > 0) u.balance += payout;
      recordOutcome(u, 'plinko', bet, payout, multiplier);
      pushHistory(u, payout >= bet ? 'win' : 'bet', payout - bet, `Плинко (${riskRu}) x${multiplier} (${payout} ⭐)`);
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    plinkoRecentBets.unshift(plinkoEntry);
    if (plinkoRecentBets.length > 30) plinkoRecentBets.pop();
    io.emit('plinko:bet', plinkoEntry);
  });

  res.json({
    pathDirs,
    bucketIndex,
    risk,
    multiplier,
    payout,
    feedToken,
    balanceAfterBet,
    user: serializeUser(user)
  });
});

// ======================== GAME: UPGRADER (HONEST CHANCE) ========================
app.post('/api/games/upgrader/play', authMiddleware, async (req, res) => {
  const bet = Math.floor(Number(req.body.bet));
  const multiplier = Number(req.body.multiplier);
  const allowed = [1.5, 2, 3, 5, 10];
  if (!Number.isFinite(bet) || bet < 5 || bet > 50000) {
    return res.status(400).json({ error: 'Ставка от 5 до 50 000 ⭐' });
  }
  if (!allowed.includes(multiplier)) {
    return res.status(400).json({ error: 'Недопустимый множитель' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < bet) return res.status(400).json({ error: 'Недостаточно звёзд ⭐' });

  user.balance -= bet;
  const balanceAfterBet = Math.floor(user.balance);
  const winChance = Number((90 / multiplier).toFixed(2)); // 10% casino edge
  const pfRes = consumeUserPfRoll(user, `Апгрейдер x${multiplier}`);
  const roll = pfRes.roll01 * 100; // 0.00..99.9999
  const won = roll < winChance;
  const payout = won ? Math.floor(bet * multiplier) : 0;

  recordWager(user, 'upgrader', bet);
  await user.save();

  const upgUid = user.telegramId;
  const upgFeedPayload = won ? {
    firstName: user.firstName || 'Игрок',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    bet,
    mult: multiplier,
    payout,
    giftName: '',
    giftImage: ''
  } : null;

  const feedToken = schedulePendingFeed(upgUid, 9000, async () => {
    const u = await User.findOne({ telegramId: upgUid });
    if (u) {
      if (won && payout > 0) {
        u.balance += payout;
        pushHistory(u, 'win', payout - bet, `Апгрейдер x${multiplier}: победа (+${payout} ⭐)`);
      } else {
        pushHistory(u, 'bet', -bet, `Апгрейдер x${multiplier}: проигрыш (-${bet} ⭐)`);
      }
      recordOutcome(u, 'upgrader', bet, payout, won ? multiplier : 0);
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    if (upgFeedPayload) pushLiveFeed('upgrader', upgFeedPayload);
  });

  // Compute exact landing angle (0..360) strictly inside WIN or LOSE with safe margin from borders!
  const winAngleSpan = (winChance / 100) * 360;
  const loseAngleSpan = 360 - winAngleSpan;
  const winPad = Math.min(5, Math.max(1.2, winAngleSpan * 0.14));
  const losePad = Math.min(5, Math.max(1.2, loseAngleSpan * 0.14));
  const stopAngle = won
    ? Number((winPad + Math.random() * Math.max(0.5, winAngleSpan - winPad * 2)).toFixed(2))
    : Number((winAngleSpan + losePad + Math.random() * Math.max(0.5, loseAngleSpan - losePad * 2)).toFixed(2));

  res.json({
    won,
    winChance,
    multiplier,
    payout,
    stopAngle,
    feedToken,
    provablyFair: pfRes.record,
    balanceAfterBet,
    user: serializeUser(user)
  });
});


// GIFT(S) (+ OPTIONAL EXTRA STARS) UPGRADER: stake 1+ gifts + stars (or only gifts, or only stars) -> target gift OR target stars!
app.post('/api/games/upgrader/play-gift', authMiddleware, async (req, res) => {
  const { sourceUid, targetType, targetKey } = req.body;
  const rawUids = Array.isArray(req.body?.sourceUids)
    ? [...new Set(req.body.sourceUids.map(String).filter(Boolean))]
    : (sourceUid ? [String(sourceUid)] : []);
  const extraStars = Math.max(0, Math.floor(Number(req.body?.extraStars) || 0));
  const user = await User.findOne({ telegramId: req.user.telegramId });

  const sourceGifts = [];
  let giftVal = 0;

  for (const uid of rawUids) {
    const found = user.inventory.find((g) => g.uid === uid);
    if (!found) return res.status(404).json({ error: 'Один из выбранных подарков не найден в инвентаре' });
    if (found.withdrawPending || found.inAuction) return res.status(400).json({ error: found.inAuction ? 'Подарок в аукционе — его нельзя использовать' : 'Подарок ожидает вывода — его нельзя использовать' });
    sourceGifts.push(found);
    giftVal += Math.max(15, Math.round(found.value || 15));
  }

  if (extraStars > 0 && user.balance < extraStars) {
    return res.status(400).json({ error: 'Недостаточно звёзд для доплаты к апгрейду' });
  }

  const totalStake = giftVal + extraStars;
  if (totalStake < 10) {
    return res.status(400).json({ error: 'Выберите подарок или введите сумму звёзд от 10' });
  }

  let targetPrice = 0;
  let targetName = '';
  let targetCol = null;
  let targetBasic = null;
  const isStarsTarget = targetType === 'stars';

  if (isStarsTarget) {
    targetPrice = Math.floor(Number(req.body?.targetStars || targetKey || 0));
    if (!Number.isFinite(targetPrice) || targetPrice <= totalStake) {
      return res.status(400).json({ error: 'Целевая сумма звёзд должна быть больше ставки' });
    }
    targetName = `${targetPrice} зв.`;
  } else if (targetType === 'basic') {
    targetBasic = BASIC_BY_SLUG.get(targetKey);
    if (!targetBasic) return res.status(404).json({ error: 'Целевой подарок не найден' });
    targetPrice = targetBasic.price;
    targetName = targetBasic.name;
  } else {
    targetCol = COLLECTIONS_BY_NAME.get(targetKey) || COLLECTIONS_BY_ID.get(targetKey);
    if (!targetCol) return res.status(404).json({ error: 'Целевой подарок не найден' });
    targetPrice = Math.max(15, Math.round(targetCol.price));
    targetName = targetCol.name;
  }

  if (targetPrice <= totalStake) {
    return res.status(400).json({ error: 'Целевой приз должен быть дороже общей ставки' });
  }

  const rawChance = (totalStake / targetPrice) * 90;
  if (rawChance < 0.5 || rawChance > 85) {
    return res.status(400).json({ error: 'Шанс апгрейда должен быть от 0.5% до 85%' });
  }

  const winChance = Number(rawChance.toFixed(2));
  const multiplier = Number((targetPrice / totalStake).toFixed(2));

  if (rawUids.length > 0) {
    const uidSet = new Set(rawUids);
    user.inventory = user.inventory.filter((g) => !uidSet.has(g.uid));
  }
  if (extraStars > 0) user.balance -= extraStars;
  const inventoryAfterBet = user.inventory.slice();

  recordWager(user, 'upgrader', totalStake);

  const pfRes = consumeUserPfRoll(user, `Апгрейдер (${winChance}%)`);
  const roll = pfRes.roll01 * 100;
  const won = roll < winChance;
  let wonGift = null;
  let wonStars = 0;

  const giftNamesLabel = sourceGifts.length === 1
    ? sourceGifts[0].collectionName
    : (sourceGifts.length > 1 ? `${sourceGifts.length} NFT` : '');
  const stakeLabel = giftNamesLabel
    ? (extraStars > 0 ? `${giftNamesLabel} + ${extraStars} зв.` : giftNamesLabel)
    : `${extraStars} зв.`;

  let upgFeedPayload = null;
  if (won) {
    if (isStarsTarget) {
      wonStars = targetPrice;
      upgFeedPayload = {
        firstName: user.firstName || 'Игрок',
        photoUrl: user.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(user),
        bet: totalStake,
        mult: multiplier,
        payout: wonStars,
        giftName: '',
        giftImage: ''
      };
    } else {
      wonGift = targetBasic
        ? createBasicGift(targetBasic, 'Апгрейдер')
        : createRegularGift(targetCol, 'Апгрейдер');
      upgFeedPayload = {
        firstName: user.firstName || 'Игрок',
        photoUrl: user.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(user),
        bet: totalStake,
        mult: multiplier,
        payout: wonGift.value,
        giftName: wonGift.collectionName,
        giftImage: wonGift.image
      };
    }
  }

  // Save ONLY stake deduction — prize is credited strictly AFTER the arrow finishes spinning!
  user.markModified('inventory');
  await user.save();

  const upgGiftUid = user.telegramId;
  const feedToken = schedulePendingFeed(upgGiftUid, 9000, async () => {
    const u = await User.findOne({ telegramId: upgGiftUid });
    if (u) {
      if (won) {
        if (isStarsTarget) {
          u.balance += wonStars;
          recordOutcome(u, 'upgrader', totalStake, wonStars, multiplier);
          pushHistory(u, 'win', wonStars - totalStake, `Апгрейдер: ${stakeLabel} на ${wonStars} зв. (${winChance}%)`);
        } else if (wonGift) {
          u.inventory.unshift(wonGift);
          u.markModified('inventory');
          recordOutcome(u, 'upgrader', totalStake, wonGift.value, multiplier);
          pushHistory(u, 'win', wonGift.value - totalStake, `Апгрейдер: ${stakeLabel} на ${targetName} (${winChance}%)`);
        }
      } else {
        recordOutcome(u, 'upgrader', totalStake, 0, 0);
        pushHistory(u, 'bet', -totalStake, `Апгрейдер: не вышло (${stakeLabel} на ${targetName}, ${winChance}%)`);
      }
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    if (upgFeedPayload) pushLiveFeed('upgrader', upgFeedPayload);
  });

  const winAngleSpan = (winChance / 100) * 360;
  const loseAngleSpan = 360 - winAngleSpan;
  const winPad = Math.min(5, Math.max(1.2, winAngleSpan * 0.14));
  const losePad = Math.min(5, Math.max(1.2, loseAngleSpan * 0.14));
  const stopAngle = won
    ? Number((winPad + Math.random() * Math.max(0.5, winAngleSpan - winPad * 2)).toFixed(2))
    : Number((winAngleSpan + losePad + Math.random() * Math.max(0.5, loseAngleSpan - losePad * 2)).toFixed(2));

  res.json({
    won,
    winChance,
    multiplier,
    totalStake,
    stopAngle,
    wonGift,
    wonStars,
    feedToken,
    provablyFair: pfRes.record,
    inventoryAfterBet,
    user: serializeUser(user)
  });
});

// ======================== ADMIN PANEL API (ID: 8213153991) ========================
const GAME_LABELS_RU = {
  crash: '🚀 Краш',
  cases: '🎁 Кейсы',
  wheel: '🎡 Колесо',
  mines: '💣 Мины',
  plinko: '🔵 Плинко',
  pvp: 'PvP Колесо',
  upgrader: 'Апгрейдер'
};

app.get('/api/admin/stats', authMiddleware, adminOnly, async (_req, res) => {
  syncDbFromDiskIfNewer();
  const users = Object.values(memDb.users);
  let totalBalances = 0;
  let totalInventoryValue = 0;
  let bannedCount = 0;
  let totalWagered = 0;
  let totalWon = 0;

  const gameTotals = {};
  for (const key of Object.keys(GAME_LABELS_RU)) {
    gameTotals[key] = { key, name: GAME_LABELS_RU[key], plays: 0, wagered: 0, won: 0, ggr: 0 };
  }

  for (const u of users) {
    totalBalances += Math.max(0, Math.floor(u.balance || 0));
    if (u.banned) bannedCount++;
    for (const g of (u.inventory || [])) totalInventoryValue += Math.max(0, Math.round(g.value || 0));
    const st = ensureUserStats(u);
    totalWagered += st.totalWagered || 0;
    totalWon += st.totalWon || 0;
    for (const [k, gs] of Object.entries(st.games || {})) {
      if (!gameTotals[k]) continue;
      gameTotals[k].plays += gs.plays || 0;
      gameTotals[k].wagered += gs.wagered || 0;
      gameTotals[k].won += gs.won || 0;
    }
  }

  const gamesArr = Object.values(gameTotals).map((g) => ({
    ...g,
    ggr: g.wagered - g.won
  }));
  const topProfitable = [...gamesArr].sort((a, b) => b.ggr - a.ggr);
  const topUnprofitable = [...gamesArr].filter((g) => g.ggr < 0).sort((a, b) => a.ggr - b.ggr);
  const ggr = totalWagered - totalWon;
  const marginPct = totalWagered > 0 ? Number(((ggr / totalWagered) * 100).toFixed(1)) : 0;

  res.json({
    onlineUsersCount: onlineSocketsByUser.size,
    totalUsers: users.length,
    bannedCount,
    totalBalances,
    totalInventoryValue,
    totalWagered,
    totalWon,
    ggr,
    marginPct,
    topProfitable,
    topUnprofitable,
    recentAlerts: (memDb.alerts || []).slice(0, 35),
    marketInfo: {
      starsPerTon: STARS_PER_TON,
      commissionTon: MARKET_COMMISSION_TON,
      tonUsd: LIVE_TON_USD
    }
  });
});

app.post('/api/admin/broadcast', authMiddleware, adminOnly, async (req, res) => {
  const text = String(req.body.text || '').trim();
  const imageMode = String(req.body.imageMode || 'none'); // 'none' | 'banner' | 'upload'
  const imageDataUrl = String(req.body.imageDataUrl || '');
  const includePlayButton = req.body.includePlayButton !== false;

  if (!text && imageMode === 'none') {
    return res.status(400).json({ error: 'Введите текст рассылки или выберите картинку' });
  }
  if (text.length > 3500) {
    return res.status(400).json({ error: 'Текст слишком длинный (макс. 3500 символов)' });
  }

  let photoBuf = null;
  let photoMime = 'image/png';
  let photoName = 'broadcast.png';

  if (imageMode === 'banner') {
    photoBuf = getImageFromZip('bot_welcome.png');
  } else if (imageMode === 'upload' && imageDataUrl) {
    const m = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!m) return res.status(400).json({ error: 'Неверный формат изображения (PNG/JPG/WebP)' });
    photoMime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
    photoName = photoMime === 'image/jpeg' ? 'broadcast.jpg' : photoMime === 'image/webp' ? 'broadcast.webp' : 'broadcast.png';
    photoBuf = Buffer.from(m[2], 'base64');
    if (photoBuf.length > 4.5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Картинка слишком большая (макс. 4.5 МБ)' });
    }
  }

  syncDbFromDiskIfNewer();
  const chatIds = Object.keys(memDb.users).filter((id) => /^\d+$/.test(id));
  const webAppUrl = includePlayButton ? await resolveMiniAppUrl() : '';
  const replyMarkup = (includePlayButton && webAppUrl)
    ? { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: webAppUrl } }]] }
    : undefined;

  let sent = 0;
  let failed = 0;
  const dryRun = process.env.DISABLE_BOT === '1';

  for (const chatId of chatIds) {
    if (dryRun) {
      sent++;
      continue;
    }
    try {
      let ok = false;
      if (photoBuf) {
        const form = new FormData();
        form.append('chat_id', chatId);
        if (text) {
          form.append('caption', text.slice(0, 1020));
          form.append('parse_mode', 'HTML');
        }
        if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
        form.append('photo', new Blob([photoBuf], { type: photoMime }), photoName);
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form });
        const d = await r.json().catch(() => ({}));
        ok = Boolean(d?.ok);
      } else {
        const d = await tgApiJson('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {})
        });
        ok = Boolean(d?.ok);
      }
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
    if (chatIds.length > 1) {
      await new Promise((r) => setTimeout(r, 45));
    }
  }

  logAdminEvent('admin', 'Рассылка через бота завершена', `Доставлено: ${sent}/${chatIds.length}, ошибок: ${failed}`);
  res.json({ total: chatIds.length, sent, failed, hasPlayButton: Boolean(replyMarkup) });
});
app.get('/api/admin/users', authMiddleware, adminOnly, async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(30);
  res.json({
    users: users.map((u) => ({
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      photoUrl: u.photoUrl,
      avatarFrame: getActiveAvatarFrame(u),
      level: getUserLevelInfo(u).level,
      balance: Math.floor(u.balance),
      banned: u.banned,
      inventoryCount: u.inventory.length
    }))
  });
});

app.get('/api/admin/user/:id', authMiddleware, adminOnly, async (req, res) => {
  const q = String(req.params.id).trim();
  const user = await User.findOne({
    $or: [{ telegramId: q }, { username: new RegExp(`^${q.replace(/^@/, '')}$`, 'i') }]
  });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: serializeUser(user) });
});

app.post('/api/admin/balance', authMiddleware, adminOnly, async (req, res) => {
  const { telegramId, delta } = req.body;
  const amount = Math.floor(Number(delta));
  if (!telegramId || !Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ error: 'Укажите ID и сумму' });
  }
  const user = await User.findOne({ telegramId: String(telegramId) });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  user.balance = Math.max(0, user.balance + amount);
  pushHistory(user, 'admin', amount, `Администратор: ${amount > 0 ? '+' : ''}${amount} ⭐`);
  await user.save();

  logAdminEvent('admin', `Изменён баланс (${amount > 0 ? '+' : ''}${amount})`, `Новый баланс: ${Math.floor(user.balance)} звёзд`, user);
  emitUserUpdate(user);
  res.json({ user: serializeUser(user) });
});

app.post('/api/admin/give-gift', authMiddleware, adminOnly, async (req, res) => {
  const { telegramId, collectionName, upgraded } = req.body;
  const user = await User.findOne({ telegramId: String(telegramId || '').trim() });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!Array.isArray(user.inventory)) user.inventory = [];

  const col = COLLECTIONS_BY_NAME.get(collectionName) || CATALOG.collections[0];
  const gift = upgraded
    ? await createUpgradedGift(col, 'Администратор')
    : createRegularGift(col, 'Администратор');

  user.inventory.unshift(gift);
  pushHistory(user, 'admin', 0, `Администратор выдал «${gift.collectionName}»`);
  user.markModified('inventory');
  await user.save();

  const serialized = serializeUser(user);
  emitUserUpdate(user);
  res.json({ gift, user: serialized });
});

app.post('/api/admin/ban', authMiddleware, adminOnly, async (req, res) => {
  const { telegramId, banned } = req.body;
  if (String(telegramId) === ADMIN_ID) return res.status(400).json({ error: 'Нельзя забанить администратора' });
  const user = await User.findOne({ telegramId: String(telegramId) });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  user.banned = Boolean(banned);
  await user.save();

  if (user.banned) {
    io.to(`user_${user.telegramId}`).emit('force_logout', { reason: 'Аккаунт заблокирован администратором' });
  }
  res.json({ user: serializeUser(user) });
});

// ======================== ADMIN PROMO CODES API ========================
app.get('/api/admin/promos', authMiddleware, adminOnly, async (_req, res) => {
  syncDbFromDiskIfNewer();
  syncPromoStatuses();
  const all = (memDb.promoCodes || []).map(serializePromoForAdmin);
  const active = all
    .filter((p) => p.status === 'active' || p.status === 'paused')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const history = all
    .filter((p) => p.status === 'deleted' || p.status === 'expired' || p.status === 'exhausted')
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  res.json({ active, history, now: Date.now() });
});

app.post('/api/admin/promos', authMiddleware, adminOnly, async (req, res) => {
  syncDbFromDiskIfNewer();
  syncPromoStatuses();
  const code = normalizePromoCode(req.body.code);
  if (!code || code.length < 2 || code.length > 32) {
    return res.status(400).json({ error: 'Промокод должен содержать от 2 до 32 символов' });
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return res.status(400).json({ error: 'Используйте только латиницу, цифры, дефис или подчёркивание' });
  }

  const existing = memDb.promoCodes.find((p) => p.code === code);
  if (existing) {
    const inHistory = existing.status === 'deleted' || existing.status === 'expired' || existing.status === 'exhausted';
    return res.status(400).json({
      error: inHistory
        ? `Промокод «${code}» уже есть в истории — возобновите его или удалите из истории, чтобы создать заново`
        : `Промокод «${code}» уже существует среди активных`
    });
  }

  const allowedTypes = ['uses', 'time', 'both', 'unlimited'];
  const limitType = allowedTypes.includes(req.body.limitType) ? req.body.limitType : 'uses';

  let maxUses = null;
  let expiresAt = null;
  let durationMinutes = null;

  if (limitType === 'uses' || limitType === 'both') {
    const m = Math.floor(Number(req.body.maxUses));
    if (!Number.isFinite(m) || m < 1 || m > 1000000) {
      return res.status(400).json({ error: 'Укажите корректное количество активаций (от 1)' });
    }
    maxUses = m;
  }

  if (limitType === 'time' || limitType === 'both') {
    const durVal = Number(req.body.durationValue);
    const durUnit = ['minutes', 'hours', 'days'].includes(req.body.durationUnit) ? req.body.durationUnit : 'hours';
    if (!Number.isFinite(durVal) || durVal < 1) {
      return res.status(400).json({ error: 'Укажите корректное время действия промокода' });
    }
    const ms = durationToMs(durVal, durUnit);
    expiresAt = Date.now() + ms;
    durationMinutes = Math.round(ms / 60000);
  }

  const now = Date.now();
  const promo = {
    id: `promo_${now}_${crypto.randomBytes(3).toString('hex')}`,
    code,
    limitType,
    maxUses,
    usedCount: 0,
    usedBy: [],
    expiresAt,
    durationMinutes,
    status: 'active',
    note: String(req.body.note || '').trim().slice(0, 80),
    createdAt: now,
    updatedAt: now
  };
  memDb.promoCodes.unshift(promo);
  saveDbNow();
  res.json({ promo: serializePromoForAdmin(promo) });
});

app.post('/api/admin/promos/:id/action', authMiddleware, adminOnly, async (req, res) => {
  syncDbFromDiskIfNewer();
  syncPromoStatuses();
  const idx = memDb.promoCodes.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Промокод не найден' });

  const promo = memDb.promoCodes[idx];
  const action = String(req.body.action || '');
  const now = Date.now();

  if (action === 'pause') {
    if (promo.status !== 'active') return res.status(400).json({ error: 'Можно приостановить только активный промокод' });
    promo.status = 'paused';
    promo.updatedAt = now;
  } else if (action === 'activate') {
    if (promo.status !== 'paused') return res.status(400).json({ error: 'Промокод не приостановлен' });
    if (promo.expiresAt && now >= promo.expiresAt) {
      promo.status = 'expired';
      promo.updatedAt = now;
      saveDbNow();
      return res.status(400).json({ error: 'Срок действия истёк — промокод перенесён в историю, возобновите его с новым временем' });
    }
    promo.status = 'active';
    promo.updatedAt = now;
  } else if (action === 'delete') {
    // Soft-delete: moves to History as 'deleted'; players see "Этого промокода не существует"
    promo.status = 'deleted';
    promo.updatedAt = now;
  } else if (action === 'purge') {
    // Hard-delete from History: frees the code so the same code can be created again!
    memDb.promoCodes.splice(idx, 1);
    saveDbNow();
    return res.json({ purged: true, id: req.params.id });
  } else if (action === 'update') {
    // Optional: add activations or extend time for active/paused promo
    const addUses = Math.floor(Number(req.body.addUses) || 0);
    const addTimeVal = Number(req.body.durationValue) || 0;
    const addTimeUnit = ['minutes', 'hours', 'days'].includes(req.body.durationUnit) ? req.body.durationUnit : 'hours';
    if (addUses > 0) {
      promo.maxUses = (promo.maxUses || promo.usedCount || 0) + addUses;
      if (promo.limitType === 'unlimited') promo.limitType = 'uses';
      if (promo.limitType === 'time') promo.limitType = 'both';
    }
    if (addTimeVal > 0) {
      const ms = durationToMs(addTimeVal, addTimeUnit);
      const base = promo.expiresAt && promo.expiresAt > now ? promo.expiresAt : now;
      promo.expiresAt = base + ms;
      promo.durationMinutes = Math.round(ms / 60000);
      if (promo.limitType === 'unlimited') promo.limitType = 'time';
      if (promo.limitType === 'uses') promo.limitType = 'both';
    }
    promo.updatedAt = now;
  } else if (action === 'resume') {
    // Restore deleted / expired / exhausted promo back to active
    const addUses = Math.floor(Number(req.body.addUses) || 0);
    const resetUsed = Boolean(req.body.resetUsed);
    const durVal = Number(req.body.durationValue) || 0;
    const durUnit = ['minutes', 'hours', 'days'].includes(req.body.durationUnit) ? req.body.durationUnit : 'hours';
    const clearExpiry = Boolean(req.body.clearExpiry);

    if (resetUsed) {
      promo.usedCount = 0;
      promo.usedBy = [];
    }
    if (addUses > 0) {
      promo.maxUses = (promo.maxUses !== null && promo.maxUses !== undefined ? promo.maxUses : promo.usedCount) + addUses;
    } else if (promo.maxUses !== null && promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) {
      // If user clicked quick resume on an exhausted promo without extra uses, add +10 or double safely
      promo.maxUses = promo.usedCount + Math.max(10, promo.maxUses || 10);
    }

    if (clearExpiry) {
      promo.expiresAt = null;
      if (promo.limitType === 'time') promo.limitType = 'unlimited';
      if (promo.limitType === 'both') promo.limitType = 'uses';
    } else if (durVal > 0) {
      const ms = durationToMs(durVal, durUnit);
      promo.expiresAt = now + ms;
      promo.durationMinutes = Math.round(ms / 60000);
    } else if (promo.expiresAt && promo.expiresAt <= now) {
      // Quick resume expired promo: restore its original duration (default 24h)
      const fallbackMs = (promo.durationMinutes ? promo.durationMinutes : 24 * 60) * 60000;
      promo.expiresAt = now + fallbackMs;
    }

    promo.status = 'active';
    promo.updatedAt = now;
  } else {
    return res.status(400).json({ error: 'Неизвестное действие' });
  }

  saveDbNow();
  res.json({ promo: serializePromoForAdmin(promo) });
});

// ======================== EXTENDED ADMIN CONTROLS (CRASH FORECAST/QUEUE, GAMES INFO, RADAR, ECONOMY, WHALES) ========================
const adminConfig = {
  maintenanceMode: false,
  maintenanceText: 'Ведутся технические работы, скоро вернёмся!',
  disabledGames: {},
  slotsRtpMode: 'normal', // 'tight' | 'normal' | 'generous'
  crashMode: 'normal',    // 'tight' | 'normal' | 'generous'
  depositBonusPct: 0,     // 0..200%
  xpMultiplier: 1,        // 1 | 1.5 | 2 | 3
  houseFeePct: 5,         // 0..20% (Singularity)
  starterBalance: 0,      // 0..5000 stars for new users (default 0!)
  maxBet: 50000,          // global max bet limit
  freezeMarket: false,    // freeze market buy/sell/withdraw
  botDmAlerts: false,     // OFF by default: stop bot DM spam to admin!
  p2pAuctionEnabled: false // OFF by default: user P2P NFT Auction tab in bottom nav
};
if (memDb.adminConfig && typeof memDb.adminConfig === 'object') {
  Object.assign(adminConfig, memDb.adminConfig);
}

function recordAdminAudit(action, details = '') {
  if (!Array.isArray(memDb.adminAudit)) memDb.adminAudit = [];
  const rec = { id: makeUid(), action: String(action || ''), details: String(details || ''), at: Date.now() };
  memDb.adminAudit.unshift(rec);
  if (memDb.adminAudit.length > 80) memDb.adminAudit = memDb.adminAudit.slice(0, 80);
  scheduleDbSave();
  if (typeof io !== 'undefined') io.to('admin_room').emit('admin:audit_log', rec);
}

function getPublicAppConfig() {
  return {
    maintenanceMode: Boolean(adminConfig.maintenanceMode),
    maintenanceText: String(adminConfig.maintenanceText || ''),
    disabledGames: { ...(adminConfig.disabledGames || {}) },
    depositBonusPct: Number(adminConfig.depositBonusPct || 0),
    xpMultiplier: Number(adminConfig.xpMultiplier || 1),
    freezeMarket: Boolean(adminConfig.freezeMarket),
    p2pAuctionEnabled: Boolean(adminConfig.p2pAuctionEnabled)
  };
}

const crashForecastQueue = []; // 5 upcoming pre-rolled rounds: { roundId, serverSeed, serverSeedHash, crashPoint, forced }

function makeCrashQueueItem(roundId, forcedMult = null) {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = sha256Hex(serverSeed);
  let crashPoint;
  if (forcedMult !== null) {
    crashPoint = Math.min(100, Math.max(1.0, Number(Number(forcedMult).toFixed(2))));
  } else {
    crashPoint = generateCrashPointFromSeed(serverSeed, roundId);
    if (adminConfig.crashMode === 'tight' && crashPoint > 1.35) {
      crashPoint = Math.max(1.0, Number((1 + (crashPoint - 1) * 0.65).toFixed(2)));
    } else if (adminConfig.crashMode === 'generous') {
      crashPoint = Math.min(100, Number((1 + (crashPoint - 1) * 1.35).toFixed(2)));
    }
  }
  return {
    roundId,
    serverSeed,
    serverSeedHash,
    crashPoint,
    forced: forcedMult !== null
  };
}

function ensureCrashForecastQueue(targetLen = 5) {
  let nextRid = crashForecastQueue.length
    ? crashForecastQueue[crashForecastQueue.length - 1].roundId + 1
    : crashState.roundId + 1;
  while (crashForecastQueue.length < targetLen) {
    crashForecastQueue.push(makeCrashQueueItem(nextRid, null));
    nextRid += 1;
  }
}

function getAdminCrashForecast() {
  ensureCrashForecastQueue(5);
  let totalBet = 0;
  let totalCashedOut = 0;
  const liveBets = [];
  for (const b of crashState.bets.values()) {
    const bv = Math.round(Number(b.bet) || 0);
    const pv = b.cashedOut ? Math.round(Number(b.payout) || 0) : 0;
    totalBet += bv;
    totalCashedOut += pv;
    liveBets.push({
      telegramId: b.telegramId,
      firstName: b.firstName || 'Игрок',
      photoUrl: b.photoUrl || '',
      avatarFrame: b.avatarFrame || '',
      bet: bv,
      cashedOut: Boolean(b.cashedOut),
      cashoutAt: b.cashoutAt || 0,
      payout: pv
    });
  }
  return {
    current: {
      roundId: crashState.roundId,
      phase: crashState.phase,
      multiplier: crashState.multiplier,
      crashPoint: crashState.crashPoint,
      forced: Boolean(crashState.forced),
      betsCount: crashState.bets.size,
      totalBet,
      totalCashedOut,
      liveBets: liveBets.slice(0, 20)
    },
    history: crashState.history.slice(0, 10),
    upcoming: crashForecastQueue.slice(0, 5).map((q, idx) => ({
      offset: idx + 1,
      roundId: q.roundId,
      crashPoint: q.crashPoint,
      forced: Boolean(q.forced)
    }))
  };
}

function emitAdminCrashForecast() {
  const payload = getAdminCrashForecast();
  io.to('admin_room').emit('admin:crash_forecast', payload);
  io.to(`user_${ADMIN_ID}`).emit('admin:crash_forecast', payload);
}

app.get('/api/admin/crash/forecast', authMiddleware, adminOnly, (_req, res) => {
  res.json(getAdminCrashForecast());
});

app.post('/api/admin/crash/current', authMiddleware, adminOnly, (req, res) => {
  const rawVal = Number(String(req.body?.multiplier || '').replace(/x/gi, '').replace(',', '.').trim());
  if (!Number.isFinite(rawVal) || rawVal < 1.0 || rawVal > 100) {
    return res.status(400).json({ error: 'Укажите множитель от 1.00 до 100' });
  }
  const val = Number(rawVal.toFixed(2));
  if (crashState.phase === 'crashed') {
    return res.status(400).json({ error: 'Раунд уже взорвался, дождитесь следующего' });
  }
  if (crashState.phase === 'running' && val < crashState.multiplier) {
    crashState.crashPoint = Math.max(1.0, Number(crashState.multiplier));
  } else {
    crashState.crashPoint = val;
  }
  crashState.forced = true;
  emitAdminCrashForecast();
  res.json(getAdminCrashForecast());
});

app.post('/api/admin/crash/slot', authMiddleware, adminOnly, (req, res) => {
  const index = Math.floor(Number(req.body?.index));
  const rawVal = Number(String(req.body?.multiplier || '').replace(/x/gi, '').replace(',', '.').trim());
  if (!Number.isFinite(index) || index < 0 || index > 4) {
    return res.status(400).json({ error: 'Индекс слота от 0 до 4' });
  }
  if (!Number.isFinite(rawVal) || rawVal < 1.0 || rawVal > 100) {
    return res.status(400).json({ error: 'Укажите множитель от 1.00 до 100' });
  }
  ensureCrashForecastQueue(5);
  const rid = crashForecastQueue[index]?.roundId || (crashState.roundId + 1 + index);
  crashForecastQueue[index] = makeCrashQueueItem(rid, Number(rawVal.toFixed(2)));
  emitAdminCrashForecast();
  res.json(getAdminCrashForecast());
});

app.post('/api/admin/crash/queue', authMiddleware, adminOnly, (req, res) => {
  const raw = req.body?.multipliers;
  const replace = req.body?.replace !== false;
  let parsed = [];
  if (Array.isArray(raw)) {
    parsed = raw.map((x) => Number(String(x).replace(',', '.').trim()));
  } else if (typeof raw === 'string') {
    parsed = raw
      .split(/[\s,;]+/)
      .map((s) => s.replace(/x/gi, '').replace(',', '.').trim())
      .filter(Boolean)
      .map(Number);
  }
  const clean = parsed
    .filter((n) => Number.isFinite(n) && n >= 1.0 && n <= 100)
    .map((n) => Number(n.toFixed(2)))
    .slice(0, 5);

  if (!clean.length) {
    return res.status(400).json({ error: 'Укажите иксы от 1.00 до 100 (например: 1.05, 5.2, 2.0)' });
  }

  ensureCrashForecastQueue(5);
  if (replace) {
    for (let i = 0; i < clean.length; i++) {
      const rid = crashForecastQueue[i]?.roundId || (crashState.roundId + 1 + i);
      crashForecastQueue[i] = makeCrashQueueItem(rid, clean[i]);
    }
  } else {
    let placed = 0;
    for (let i = 0; i < crashForecastQueue.length && placed < clean.length; i++) {
      if (!crashForecastQueue[i].forced) {
        crashForecastQueue[i] = makeCrashQueueItem(crashForecastQueue[i].roundId, clean[placed++]);
      }
    }
    if (placed < clean.length) {
      for (let i = placed; i < clean.length; i++) {
        const idx = Math.min(4, i);
        crashForecastQueue[idx] = makeCrashQueueItem(crashForecastQueue[idx].roundId, clean[i]);
      }
    }
  }

  emitAdminCrashForecast();
  res.json(getAdminCrashForecast());
});

app.post('/api/admin/crash/queue/reset', authMiddleware, adminOnly, (_req, res) => {
  crashForecastQueue.length = 0;
  ensureCrashForecastQueue(5);
  emitAdminCrashForecast();
  res.json(getAdminCrashForecast());
});

app.post('/api/admin/crash/force-boom', authMiddleware, adminOnly, (_req, res) => {
  if (crashState.phase !== 'running') {
    return res.status(400).json({ error: 'Ракета сейчас не в полёте' });
  }
  crashState.crashPoint = Math.max(1.0, Number(crashState.multiplier || 1.0));
  crashState.forced = true;
  emitAdminCrashForecast();
  res.json({ ok: true, crashedAt: crashState.crashPoint });
});

app.get('/api/admin/games-info', authMiddleware, adminOnly, (req, res) => {
  ensureAdminGameStores();
  const game = String(req.query?.game || '').trim();
  if (game && ADMIN_GAME_KEYS.includes(game)) {
    return res.json({
      game,
      totals: memDb.gameTotals[game],
      rounds: (memDb.gameRounds[game] || []).slice(0, 60)
    });
  }
  res.json({
    totals: memDb.gameTotals,
    rounds: memDb.gameRounds,
    radar: (memDb.liveRadar || []).slice(0, 45)
  });
});

app.get('/api/admin/whales', authMiddleware, adminOnly, (_req, res) => {
  const all = Object.values(memDb.users || {}).map((u) => {
    const s = ensureUserStats(u);
    const invVal = (u.inventory || []).reduce((sum, g) => sum + (Number(g.value) || 0), 0);
    const totalWagered = Number(s.totalWagered || 0);
    const totalWon = Number(s.totalWon || 0);
    const netProfit = totalWon - totalWagered;
    return {
      telegramId: u.telegramId,
      firstName: u.firstName || 'Игрок',
      username: u.username || '',
      photoUrl: u.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(u),
      balance: Math.floor(u.balance || 0),
      invVal: Math.floor(invVal),
      totalWealth: Math.floor((u.balance || 0) + invVal),
      totalWagered: Math.floor(totalWagered),
      totalWon: Math.floor(totalWon),
      netProfit: Math.floor(netProfit),
      banned: Boolean(u.banned)
    };
  });
  res.json({
    richest: [...all].sort((a, b) => b.totalWealth - a.totalWealth).slice(0, 12),
    winners: [...all].filter((u) => u.totalWagered > 0).sort((a, b) => b.netProfit - a.netProfit).slice(0, 12),
    wagerers: [...all].sort((a, b) => b.totalWagered - a.totalWagered).slice(0, 12)
  });
});

app.get('/api/admin/controls', authMiddleware, adminOnly, async (_req, res) => {
  const onlineIds = Array.from(onlineSocketsByUser.keys());
  const onlineUsers = [];
  for (const tid of onlineIds.slice(0, 60)) {
    const u = await User.findOne({ telegramId: String(tid) });
    if (u) {
      onlineUsers.push({
        telegramId: u.telegramId,
        firstName: u.firstName || 'Игрок',
        username: u.username || '',
        photoUrl: u.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(u),
        balance: Math.floor(u.balance || 0),
        inventoryCount: (u.inventory || []).length,
        banned: Boolean(u.banned)
      });
    }
  }
  const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  res.json({
    config: adminConfig,
    onlineCount: onlineIds.length,
    onlineUsers,
    uptimeSec: Math.floor(process.uptime()),
    memoryMb: memMb,
    frames: (typeof AVATAR_FRAMES !== 'undefined' ? AVATAR_FRAMES : []).map((f) => ({ id: f.id, name: f.name })),
    auction: {
      roundId: auctionState.roundId,
      phase: auctionState.phase,
      prizeName: auctionState.prize?.name || '',
      prizePrice: auctionState.prize?.price || 0,
      participants: auctionState.bids.length
    }
  });
});

app.post('/api/admin/controls', authMiddleware, adminOnly, async (req, res) => {
  if (typeof req.body?.maintenanceMode === 'boolean') {
    adminConfig.maintenanceMode = req.body.maintenanceMode;
  }
  if (typeof req.body?.maintenanceText === 'string' && req.body.maintenanceText.trim()) {
    adminConfig.maintenanceText = req.body.maintenanceText.trim().slice(0, 140);
  }
  if (req.body?.toggleGame && typeof req.body.toggleGame === 'string') {
    const g = req.body.toggleGame;
    adminConfig.disabledGames[g] = !adminConfig.disabledGames[g];
  }
  if (['tight', 'normal', 'generous'].includes(req.body?.slotsRtpMode)) {
    adminConfig.slotsRtpMode = req.body.slotsRtpMode;
  }
  if (['tight', 'normal', 'generous'].includes(req.body?.crashMode)) {
    adminConfig.crashMode = req.body.crashMode;
  }
  if (req.body?.depositBonusPct !== undefined) {
    const v = Math.floor(Number(req.body.depositBonusPct));
    if (Number.isFinite(v) && v >= 0 && v <= 200) adminConfig.depositBonusPct = v;
  }
  if (req.body?.xpMultiplier !== undefined) {
    const v = Number(req.body.xpMultiplier);
    if ([1, 1.5, 2, 3].includes(v)) adminConfig.xpMultiplier = v;
  }
  if (req.body?.houseFeePct !== undefined) {
    const v = Math.floor(Number(req.body.houseFeePct));
    if (Number.isFinite(v) && v >= 0 && v <= 20) adminConfig.houseFeePct = v;
  }
  if (req.body?.starterBalance !== undefined) {
    const v = Math.floor(Number(req.body.starterBalance));
    if (Number.isFinite(v) && v >= 0 && v <= 5000) adminConfig.starterBalance = v;
  }
  if (req.body?.maxBet !== undefined) {
    const v = Math.floor(Number(req.body.maxBet));
    if (Number.isFinite(v) && v >= 50 && v <= 500000) adminConfig.maxBet = v;
  }
  if (typeof req.body?.freezeMarket === 'boolean') {
    adminConfig.freezeMarket = req.body.freezeMarket;
  }
  if (typeof req.body?.botDmAlerts === 'boolean') {
    adminConfig.botDmAlerts = req.body.botDmAlerts;
  }
  if (typeof req.body?.p2pAuctionEnabled === 'boolean') {
    const prev = Boolean(adminConfig.p2pAuctionEnabled);
    adminConfig.p2pAuctionEnabled = req.body.p2pAuctionEnabled;
    if (prev && !adminConfig.p2pAuctionEnabled) {
      await cancelAllUnfinishedP2pAuctions('Администратор временно отключил раздел Аукцион');
    }
    recordAdminAudit('Вкладка Аукцион', adminConfig.p2pAuctionEnabled ? 'Включена' : 'Выключена (активные лоты возвращены)');
  }

  memDb.adminConfig = { ...adminConfig };
  scheduleDbSave();
  io.emit('app:config', getPublicAppConfig());
  res.json({ ok: true, config: adminConfig });
});

app.get('/api/admin/withdraws', authMiddleware, adminOnly, (req, res) => {
  if (!Array.isArray(memDb.withdrawRequests)) memDb.withdrawRequests = [];
  const q = String(req.query?.q || '').trim().toLowerCase().replace(/^#/, '');
  const mapRow = (w) => {
    const snap = w.giftSnapshot || {};
    return {
      ...w,
      userName: [w.firstName, w.lastName].filter(Boolean).join(' ') || 'Игрок',
      giftImage: snap.image || '',
      giftValue: snap.value || 0,
      mintNumber: snap.mintNumber || 0,
      collectionName: snap.collectionName || '',
      modelName: snap.model?.name || '',
      modelRarity: snap.model?.rarity || 0,
      backdropName: snap.backdrop?.name || '',
      backdropRarity: snap.backdrop?.rarity || 0,
      symbolName: snap.symbol?.name || '',
      symbolRarity: snap.symbol?.rarity || 0,
      upgraded: Boolean(snap.upgraded || snap.crafted)
    };
  };
  const matchesQ = (w) => {
    if (!q) return true;
    return (
      String(w.id || '').toLowerCase().includes(q) ||
      String(w.telegramId || '').toLowerCase().includes(q) ||
      String(w.username || '').toLowerCase().includes(q) ||
      String(w.firstName || '').toLowerCase().includes(q) ||
      String(w.giftName || '').toLowerCase().includes(q)
    );
  };
  const pending = memDb.withdrawRequests.filter((w) => w.status === 'pending').map(mapRow);
  const history = memDb.withdrawRequests.filter((w) => w.status !== 'pending' && matchesQ(w)).slice(0, 80).map(mapRow);
  res.json({ pending, history, pendingCount: pending.length });
});

app.post('/api/admin/withdraw/resolve', authMiddleware, adminOnly, async (req, res) => {
  const reqId = String(req.body?.id || '').trim();
  const approve = Boolean(req.body?.approve);
  if (!reqId) return res.status(400).json({ error: 'Не указан ID заявки' });
  const result = await resolveWithdrawRequest(reqId, approve, 'web_admin');
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/admin/bans', authMiddleware, adminOnly, (_req, res) => {
  const banned = Object.values(memDb.users || {})
    .filter((u) => Boolean(u.banned))
    .map((u) => ({
      telegramId: u.telegramId,
      firstName: u.firstName || 'Игрок',
      username: u.username || '',
      photoUrl: u.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(u),
      balance: Math.floor(u.balance || 0),
      inventoryCount: (u.inventory || []).length
    }));
  res.json({ banned });
});

app.post('/api/admin/gift-rain', authMiddleware, adminOnly, async (req, res) => {
  const collectionName = String(req.body?.collectionName || '').trim();
  const upgraded = Boolean(req.body?.upgraded);
  const scope = req.body?.scope === 'all' ? 'all' : 'online';
  const col = COLLECTIONS_BY_NAME.get(collectionName);
  if (!col) return res.status(400).json({ error: 'Выберите коллекцию подарка' });
  const targetIds = scope === 'online'
    ? Array.from(onlineSocketsByUser.keys()).map(String)
    : Object.values(memDb.users || {}).filter((u) => !u.banned).map((u) => String(u.telegramId));
  let count = 0;
  for (const tid of targetIds) {
    const u = await User.findOne({ telegramId: String(tid) });
    if (!u || u.banned) continue;
    const gift = upgraded ? await createUpgradedGift(col, 'Дождь подарков') : createRegularGift(col, 'Дождь подарков');
    u.inventory.unshift(gift);
    u.markModified('inventory');
    pushHistory(u, 'bonus', 0, `Дождь подарков: получен «${col.name}»${upgraded ? ' (NFT)' : ''}`);
    await u.save();
    emitUserUpdate(u);
    io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    io.to(`user_${u.telegramId}`).emit('admin:toast', {
      text: `Подарок от администратора: «${col.name}»${upgraded ? ' (NFT)' : ''}!`,
      type: 'gold'
    });
    count++;
  }
  saveDbNow();
  recordAdminAudit('Дождь подарков', `${col.name}${upgraded ? ' (NFT)' : ''} × ${count} игр. (${scope})`);
  res.json({ ok: true, count, giftName: col.name });
});

app.get('/api/admin/audit', authMiddleware, adminOnly, (_req, res) => {
  res.json({ audit: (memDb.adminAudit || []).slice(0, 60) });
});

app.get('/api/admin/star-deposits', authMiddleware, adminOnly, (req, res) => {
  if (!Array.isArray(memDb.starDeposits)) memDb.starDeposits = [];
  const rawQ = String(req.query?.q || '').trim();
  const q = rawQ.toLowerCase().replace(/^@/, '');

  let matchedUser = null;
  if (q) {
    const allUsers = Object.values(memDb.users || {});
    const foundU = allUsers.find((u) =>
      String(u.telegramId) === rawQ ||
      String(u.username || '').toLowerCase() === q ||
      String(u.firstName || '').toLowerCase() === q
    ) || allUsers.find((u) =>
      String(u.telegramId).includes(q) ||
      String(u.username || '').toLowerCase().includes(q) ||
      `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q)
    );
    if (foundU) {
      const userDeps = memDb.starDeposits.filter((d) => String(d.telegramId) === String(foundU.telegramId));
      const paidSum = userDeps.filter((d) => d.status === 'paid').reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const refundedSum = userDeps.filter((d) => d.status === 'refunded').reduce((s, d) => s + (Number(d.amount) || 0), 0);
      matchedUser = {
        telegramId: foundU.telegramId,
        firstName: [foundU.firstName, foundU.lastName].filter(Boolean).join(' ') || 'Игрок',
        username: foundU.username || '',
        photoUrl: foundU.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(foundU),
        balance: Math.floor(foundU.balance || 0),
        totalDeposited: paidSum + refundedSum,
        activePaid: paidSum,
        totalRefunded: refundedSum,
        depositsCount: userDeps.length
      };
    }
  }

  let deposits = memDb.starDeposits;
  if (q) {
    const targetTid = matchedUser ? String(matchedUser.telegramId) : '';
    deposits = memDb.starDeposits.filter((d) =>
      (targetTid && String(d.telegramId) === targetTid) ||
      String(d.telegramId || '').toLowerCase().includes(q) ||
      String(d.username || '').toLowerCase().includes(q) ||
      String(d.firstName || '').toLowerCase().includes(q) ||
      String(d.chargeId || '').toLowerCase().includes(q) ||
      String(d.invoiceId || '').toLowerCase().includes(q)
    );
  }

  // Enrich each deposit with live user name/username/photo if present
  const enriched = deposits.slice(0, 60).map((d) => {
    const u = memDb.users?.[String(d.telegramId)];
    return {
      ...d,
      firstName: u ? ([u.firstName, u.lastName].filter(Boolean).join(' ') || d.firstName || 'Игрок') : (d.firstName || 'Игрок'),
      username: u ? (u.username || '') : (d.username || ''),
      photoUrl: u ? (u.photoUrl || '') : (d.photoUrl || ''),
      userBalance: u ? Math.floor(u.balance || 0) : null
    };
  });

  const allPaid = memDb.starDeposits.filter((d) => d.status === 'paid');
  const allRefunded = memDb.starDeposits.filter((d) => d.status === 'refunded');
  res.json({
    deposits: enriched,
    userSummary: matchedUser,
    stats: {
      totalCount: memDb.starDeposits.length,
      paidCount: allPaid.length,
      refundedCount: allRefunded.length,
      totalPaidStars: allPaid.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      totalRefundedStars: allRefunded.reduce((s, d) => s + (Number(d.amount) || 0), 0)
    }
  });
});

app.post('/api/admin/star-deposits/refund', authMiddleware, adminOnly, async (req, res) => {
  if (!Array.isArray(memDb.starDeposits)) memDb.starDeposits = [];
  const depositId = String(req.body?.depositId || '').trim();
  const manual = Boolean(req.body?.manual);
  const deductBalance = req.body?.deductBalance !== false;
  const notifyUser = req.body?.notifyUser !== false;
  const forceLocal = Boolean(req.body?.forceLocal);

  let dep = depositId ? memDb.starDeposits.find((d) => d.id === depositId) : null;
  let telegramId = String(dep?.telegramId || req.body?.telegramId || '').trim();
  let chargeId = String(dep?.chargeId || req.body?.chargeId || '').trim();
  let amount = Math.max(0, Math.floor(Number(dep?.amount ?? req.body?.amount ?? 0)));

  if (!dep && !manual) {
    return res.status(404).json({ error: 'Транзакция пополнения не найдена' });
  }
  if (dep && dep.status === 'refunded') {
    return res.status(400).json({ error: 'По этому пополнению уже был сделан возврат' });
  }
  if (!telegramId) {
    return res.status(400).json({ error: 'Не указан Telegram ID пользователя' });
  }
  if (manual && !chargeId) {
    return res.status(400).json({ error: 'Укажите telegram_payment_charge_id для возврата через Telegram' });
  }

  let tgApiCalled = false;
  let tgApiWarning = '';
  if (chargeId && BOT_TOKEN) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/refundStarPayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(telegramId),
          telegram_payment_charge_id: chargeId
        })
      });
      const tgData = await tgRes.json().catch(() => ({ ok: false, description: 'Invalid JSON from Telegram' }));
      if (tgData?.ok) {
        tgApiCalled = true;
      } else {
        const desc = String(tgData?.description || 'Telegram API отклонил возврат');
        if (!forceLocal) {
          return res.status(502).json({
            error: `Telegram refundStarPayment: ${desc}`,
            canForceLocal: true
          });
        }
        tgApiWarning = desc;
      }
    } catch (err) {
      if (!forceLocal) {
        return res.status(502).json({ error: `Ошибка сети Telegram API: ${err.message}` });
      }
      tgApiWarning = err.message;
    }
  } else if (!forceLocal && !chargeId) {
    return res.status(400).json({
      error: 'У этого пополнения отсутствует telegram_payment_charge_id. Вы можете ввести charge_id вручную или подтвердить локальный возврат.',
      needsChargeId: true
    });
  }

  // Deduct stars from user balance if requested
  let deductedAmount = 0;
  const user = await User.findOne({ telegramId });
  if (user) {
    const targetDeduct = Math.max(0, Math.floor(Number(dep?.totalAdded || amount || 0)));
    if (deductBalance && targetDeduct > 0) {
      deductedAmount = Math.min(Math.max(0, Math.floor(user.balance || 0)), targetDeduct);
      user.balance = Math.max(0, Math.floor(user.balance || 0) - deductedAmount);
    }
    pushHistory(
      user,
      'withdraw',
      -deductedAmount,
      `Возврат Telegram Stars${amount > 0 ? ` (${amount} зв.)` : ''}${chargeId ? ` • ${chargeId.slice(0, 14)}…` : ''}`
    );
    await user.save();
    emitUserUpdate(user);
    io.to(`user_${telegramId}`).emit('user:sync', serializeUser(user));
  }

  if (dep) {
    dep.status = 'refunded';
    dep.chargeId = chargeId || dep.chargeId;
    dep.refundedAt = Date.now();
    dep.refundedBy = 'web_admin';
    dep.deductedAmount = deductedAmount;
    dep.tgApiRefunded = tgApiCalled;
  } else {
    dep = {
      id: makeUid(),
      invoiceId: 'manual',
      telegramId,
      firstName: user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || 'Игрок') : `ID ${telegramId}`,
      username: user?.username || '',
      photoUrl: user?.photoUrl || '',
      amount,
      bonusStars: 0,
      totalAdded: amount,
      currency: 'XTR',
      chargeId,
      providerChargeId: '',
      source: 'manual_refund',
      status: 'refunded',
      createdAt: Date.now(),
      refundedAt: Date.now(),
      refundedBy: 'web_admin',
      deductedAmount,
      tgApiRefunded: tgApiCalled
    };
    memDb.starDeposits.unshift(dep);
  }
  saveDbNow();

  if (notifyUser) {
    const txt = `💫 <b>Возврат Telegram Stars выполнен</b>\n${amount > 0 ? `Сумма: <b>${amount} ⭐</b>\n` : ''}${chargeId ? `ID транзакции: <code>${escapeHtml(chargeId)}</code>` : ''}`;
    sendTelegramText(telegramId, txt).catch(() => {});
    io.to(`user_${telegramId}`).emit('admin:toast', {
      text: `Выполнен возврат Telegram Stars${amount > 0 ? ` (${amount} зв.)` : ''}`,
      type: 'info'
    });
  }

  recordAdminAudit(
    'Возврат звёзд (Refund)',
    `ID ${telegramId} • ${amount > 0 ? `${amount} зв.` : 'ручной'} • списано ${deductedAmount} зв. • TG API: ${tgApiCalled ? 'OK' : 'локально'}`
  );
  io.to('admin_room').emit('admin:deposits_update', { id: dep.id });

  res.json({
    ok: true,
    deposit: dep,
    tgApiCalled,
    tgApiWarning,
    deductedAmount,
    message: tgApiCalled
      ? `Звёзды успешно возвращены через Telegram Stars API${deductedAmount > 0 ? ` (списано с баланса: ${deductedAmount} зв.)` : ''}!`
      : `Возврат зафиксирован в базе${deductedAmount > 0 ? ` (списано с баланса: ${deductedAmount} зв.)` : ''}.`
  });
});

app.post('/api/admin/singularity/force-start', authMiddleware, adminOnly, (_req, res) => {
  const alive = singularityState.players.filter((p) => p.status === 'alive');
  if (singularityState.phase === 'waiting' && alive.length >= 2) {
    if (singularityTimer) clearTimeout(singularityTimer);
    singularityState.phase = 'active';
    singularityState.nextPullAt = Date.now() + 800;
    broadcastSingularityState();
    singularityTimer = setTimeout(runSingularityPull, 800);
    recordAdminAudit('Сингулярность', 'Принудительный старт воронки');
    return res.json({ ok: true, msg: 'Воронка Сингулярности запущена досрочно!' });
  }
  res.status(400).json({ error: 'Для старта нужно минимум 2 игрока в фазе ожидания' });
});

app.post('/api/admin/auction/control', authMiddleware, adminOnly, async (req, res) => {
  const action = String(req.body?.action || '');
  if (action === 'finish_now') {
    if (auctionState.phase === 'bidding') {
      await finishAuctionRound();
      return res.json({ ok: true, msg: 'Раунд Загадочного аукциона завершён досрочно' });
    }
    return res.status(400).json({ error: 'Сейчас не фаза ставок' });
  }
  if (action === 'reroll_lot') {
    const colName = String(req.body?.collectionName || '').trim();
    if (colName && COLLECTIONS_BY_NAME.has(colName)) {
      const c = COLLECTIONS_BY_NAME.get(colName);
      auctionState.prize = {
        collectionId: c.id,
        name: c.name,
        price: Math.max(15, Math.round(c.price)),
        image: getOriginalImage(c),
        lottie: getOriginalLottie(c),
        center: c.bg?.center || '#1e3a5f',
        edge: c.bg?.edge || '#0f172a'
      };
    } else {
      auctionState.prize = pickAuctionPrize();
    }
    auctionState.minBid = Math.max(15, Math.floor((auctionState.prize?.price || 200) * 0.08));
    broadcastAuctionState();
    return res.json({ ok: true, msg: `Новый лот: ${auctionState.prize?.name} (${auctionState.prize?.price} зв.)` });
  }
  res.status(400).json({ error: 'Неизвестное действие' });
});

app.post('/api/admin/rain', authMiddleware, adminOnly, async (req, res) => {
  const amount = Math.floor(Number(req.body?.amount));
  const scope = req.body?.scope === 'all' ? 'all' : 'online';
  if (!Number.isFinite(amount) || amount < 1 || amount > 50000) {
    return res.status(400).json({ error: 'Сумма дождя: от 1 до 50 000 звёзд' });
  }
  let targetIds = [];
  if (scope === 'online') {
    targetIds = Array.from(onlineSocketsByUser.keys()).map(String);
  } else {
    targetIds = Object.values(memDb.users || {}).filter((u) => !u.banned).map((u) => String(u.telegramId));
  }
  let count = 0;
  for (const tid of targetIds) {
    const u = await User.findOne({ telegramId: String(tid) });
    if (!u || u.banned) continue;
    u.balance = Math.floor((u.balance || 0) + amount);
    pushHistory(u, 'bonus', amount, `Бонус-дождь от администратора (+${amount} зв.)`);
    await u.save();
    emitUserUpdate(u);
    io.to(`user_${u.telegramId}`).emit('admin:toast', {
      text: `Бонус-дождь! Вы получили +${amount} звёзд`,
      type: 'gold'
    });
    count++;
  }
  saveDbNow();
  res.json({ ok: true, count, amount, total: count * amount });
});

app.post('/api/admin/toast-all', authMiddleware, adminOnly, (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 180);
  const type = ['info', 'success', 'gold', 'error'].includes(req.body?.type) ? req.body.type : 'gold';
  if (!text) return res.status(400).json({ error: 'Введите текст уведомления' });
  io.emit('admin:toast', { text, type });
  res.json({ ok: true, sentTo: onlineSocketsByUser.size });
});

app.post('/api/admin/user/extra', authMiddleware, adminOnly, async (req, res) => {
  const tid = String(req.body?.telegramId || '').trim();
  const action = String(req.body?.action || '');
  const u = await User.findOne({ telegramId: tid });
  if (!u) return res.status(404).json({ error: 'Игрок не найден' });

  if (action === 'set_balance') {
    const val = Math.max(0, Math.floor(Number(req.body?.value)));
    if (!Number.isFinite(val)) return res.status(400).json({ error: 'Неверная сумма' });
    u.balance = val;
    pushHistory(u, 'bonus', 0, `Администратор установил баланс: ${val} зв.`);
  } else if (action === 'set_level') {
    const lv = Math.min(10, Math.max(1, Math.floor(Number(req.body?.level) || 1)));
    const tier = LEVEL_TIERS.find((t) => t.level === lv) || LEVEL_TIERS[0];
    const s = ensureUserStats(u);
    s.totalWagered = tier.minWager;
    u.level = lv;
  } else if (action === 'give_frame') {
    const frameId = String(req.body?.frameId || '').trim();
    if (!frameId) {
      u.avatarFrame = '';
      u.activeFrame = '';
      u.equippedFrame = '';
    } else {
      if (!Array.isArray(u.ownedFrames)) u.ownedFrames = [];
      if (!u.ownedFrames.includes(frameId)) u.ownedFrames.push(frameId);
      u.avatarFrame = frameId;
      u.activeFrame = frameId;
      u.equippedFrame = frameId;
    }
    recordAdminAudit('Рамка игроку', `${u.firstName} [${u.telegramId}] -> ${frameId || 'снята'}`);
  } else if (action === 'remove_gift') {
    const uid = String(req.body?.giftUid || '').trim();
    const before = (u.inventory || []).length;
    u.inventory = (u.inventory || []).filter((g) => String(g.uid) !== uid);
    if (u.inventory.length === before) return res.status(404).json({ error: 'Подарок не найден в инвентаре' });
    u.markModified('inventory');
  } else if (action === 'clear_inventory') {
    u.inventory = [];
    u.markModified('inventory');
  } else if (action === 'reset_stats') {
    u.stats = null;
    ensureUserStats(u);
  } else if (action === 'dm_toast') {
    const msg = String(req.body?.text || '').trim().slice(0, 180);
    if (!msg) return res.status(400).json({ error: 'Введите сообщение' });
    io.to(`user_${u.telegramId}`).emit('admin:toast', { text: msg, type: 'gold' });
    return res.json({ ok: true, msg: 'Уведомление отправлено игроку' });
  } else {
    return res.status(400).json({ error: 'Неизвестное действие' });
  }

  await u.save();
  saveDbNow();
  emitUserUpdate(u);
  io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
  res.json({ ok: true, user: serializeUser(u) });
});

app.post('/api/admin/system', authMiddleware, adminOnly, (req, res) => {
  const action = String(req.body?.action || '');
  if (action === 'save_db') {
    saveDbNow();
    return res.json({ ok: true, msg: 'База данных сохранена на диск' });
  }
  if (action === 'clear_feeds') {
    for (const k of Object.keys(liveFeeds)) liveFeeds[k] = [];
    plinkoRecentBets.length = 0;
    safeRecentBets.length = 0;
    io.emit('live:feeds_init', liveFeeds);
    return res.json({ ok: true, msg: 'Все лайв-ленты очищены' });
  }
  if (action === 'clear_game_logs') {
    memDb.gameRounds = {};
    memDb.gameTotals = {};
    memDb.liveRadar = [];
    ensureAdminGameStores();
    saveDbNow();
    return res.json({ ok: true, msg: 'История и статистика раундов админки очищены' });
  }
  res.status(400).json({ error: 'Неизвестное действие' });
});

function emitUserUpdate(user) {
  io.to(`user_${user.telegramId}`).emit('user_update', serializeUser(user));
}

// ======================== REALTIME ENGINE 1: CRASH (PROVABLY FAIR + NFT BETS + DEFERRED SETTLEMENT!) ========================
function getCrashCatalogTiers() {
  return CATALOG.collections
    .map((c) => ({
      name: c.name,
      price: c.price,
      image: getOriginalImage(c),
      center: '#1e3a5f',
      edge: '#0f172a'
    }))
    .sort((a, b) => a.price - b.price);
}

function findBestUnupgradedNftForValue(targetStars, minStrictPrice = 0) {
  let best = null;
  for (const col of CATALOG.collections) {
    if (col.price <= targetStars && col.price > minStrictPrice) {
      if (!best || col.price > best.price) best = col;
    }
  }
  return best;
}

function giftToPreview(g) {
  if (!g) return null;
  return {
    uid: g.uid || '',
    name: g.collectionName || g.name || 'Подарок',
    image: g.image || '',
    value: Math.floor(Number(g.value || 0)),
    upgraded: Boolean(g.upgraded),
    crafted: Boolean(g.crafted),
    craftTier: g.craftTier || '',
    model: g.model?.name || '',
    backdropCenter: g.backdrop?.center || '',
    backdropEdge: g.backdrop?.edge || '',
    symbolImage: g.symbol?.image || '',
    num: g.mintNumber || g.number || g.num || 0
  };
}

function resolveCrashReward(betObj, payoutValue) {
  if (betObj.betMode === 'gift' && betObj.stakedGift) {
    const betterCol = findBestUnupgradedNftForValue(payoutValue, betObj.bet);
    if (betterCol) {
      const rewardGift = createRegularGift(betterCol, 'Краш Ракета');
      const rewardStars = Math.max(0, payoutValue - betterCol.price);
      return { rewardGift, rewardStars, returnedOriginal: false };
    }
    const clonedOrig = JSON.parse(JSON.stringify(betObj.stakedGift));
    const rewardStars = Math.max(0, payoutValue - betObj.bet);
    return { rewardGift: clonedOrig, rewardStars, returnedOriginal: true };
  }
  const bestCol = findBestUnupgradedNftForValue(payoutValue, 0);
  if (bestCol) {
    const rewardGift = createRegularGift(bestCol, 'Краш Ракета');
    const rewardStars = Math.max(0, payoutValue - bestCol.price);
    return { rewardGift, rewardStars, returnedOriginal: false };
  }
  return { rewardGift: null, rewardStars: payoutValue, returnedOriginal: false };
}

function serializeCrashBet(b) {
  return {
    telegramId: b.telegramId,
    firstName: b.firstName,
    photoUrl: b.photoUrl,
    avatarFrame: b.avatarFrame || '',
    bet: b.bet,
    betMode: b.betMode || 'stars',
    giftPreview: b.giftPreview || null,
    autoCashout: b.autoCashout || 0,
    placedAt: b.placedAt || 0,
    cashedOut: Boolean(b.cashedOut),
    cashoutAt: b.cashoutAt || 0,
    payout: b.payout || 0,
    rewardGiftPreview: b.pendingReward?.rewardGift ? giftToPreview(b.pendingReward.rewardGift) : null,
    rewardStars: b.pendingReward ? b.pendingReward.rewardStars : 0,
    returnedOriginal: Boolean(b.pendingReward?.returnedOriginal)
  };
}

const pfCrashHistory = []; // { roundId, crashPoint, serverSeed, serverSeedHash, createdAt }
const crashState = {
  phase: 'waiting', // 'waiting' | 'running' | 'crashed'
  roundId: 1,
  multiplier: 1.0,
  crashPoint: 2.0,
  serverSeed: '',
  serverSeedHash: '',
  startedAt: 0,
  waitEndsAt: Date.now() + 7000,
  bets: new Map(),
  history: [1.32, 1.04, 2.41, 1.00, 1.56, 1.18, 3.85, 1.24]
};

function generateCrashPointFromSeed(serverSeed, roundId) {
  // Balanced Provably Fair Crash distribution:
  // ~4.5% exact 1.00x, ~16.5% in 1.01-1.29x (21% < 1.30x),
  // ~35% in 1.30-1.69x (sweet spot!), ~12% in 1.70-1.99x (68% < 2.00x),
  // ~32% >= 2.00x (regular 2x-10x+ flights, max 100x).
  const r = hmacFloat01(serverSeed, `crash:${roundId}`);
  if (r < 0.045) return 1.0;
  if (r < 0.21) {
    const t = (r - 0.045) / 0.165;
    return Number((1.01 + t * 0.28).toFixed(2));
  }
  if (r < 0.56) {
    const t = (r - 0.21) / 0.35;
    return Number((1.30 + t * 0.39).toFixed(2));
  }
  if (r < 0.68) {
    const t = (r - 0.56) / 0.12;
    return Number((1.70 + t * 0.29).toFixed(2));
  }
  const u = (r - 0.68) / 0.32;
  const raw = 2.0 * Math.pow(1 / (1 - Math.min(0.9999, u)), 0.58);
  return Math.min(100, Math.max(2.0, Number(raw.toFixed(2))));
}

function getCrashBetsArray() {
  return Array.from(crashState.bets.values())
    .sort((a, b) => {
      if (a.cashedOut !== b.cashedOut) return a.cashedOut ? 1 : -1;
      return (a.placedAt || 0) - (b.placedAt || 0);
    })
    .map(serializeCrashBet);
}

function broadcastCrashState() {
  io.emit('crash:state', {
    phase: crashState.phase,
    roundId: crashState.roundId,
    multiplier: crashState.multiplier,
    serverSeedHash: crashState.serverSeedHash,
    waitMs: Math.max(0, crashState.waitEndsAt - Date.now()),
    bets: getCrashBetsArray(),
    history: crashState.history.slice(0, 16)
  });
}

let crashLoopTimer = null;

function startCrashWaiting() {
  crashState.phase = 'waiting';
  ensureCrashForecastQueue(5);
  const nextRound = crashForecastQueue.shift();
  crashState.roundId = nextRound.roundId;
  crashState.multiplier = 1.0;
  crashState.serverSeed = nextRound.serverSeed;
  crashState.serverSeedHash = nextRound.serverSeedHash;
  crashState.crashPoint = nextRound.crashPoint;
  crashState.forced = Boolean(nextRound.forced);
  ensureCrashForecastQueue(5);
  crashState.bets.clear();
  crashState.waitEndsAt = Date.now() + 6500;
  broadcastCrashState();
  emitAdminCrashForecast();

  setTimeout(startCrashRunning, 6500);
}

async function settleCrashRoundAtBoom() {
  const roundId = crashState.roundId;
  const crashPoint = crashState.crashPoint;
  for (const betObj of crashState.bets.values()) {
    try {
      const u = await User.findOne({ telegramId: betObj.telegramId });
      if (!u) continue;
      if (betObj.cashedOut && !betObj.settled && betObj.pendingReward) {
        betObj.settled = true;
        const { rewardGift, rewardStars, returnedOriginal } = betObj.pendingReward;
        if (rewardStars > 0) u.balance += rewardStars;
        if (rewardGift) {
          u.inventory.unshift(rewardGift);
          u.markModified('inventory');
        }
        recordOutcome(u, 'crash', betObj.bet, betObj.payout, betObj.cashoutAt);
        const descParts = [];
        if (rewardGift) descParts.push(returnedOriginal ? `возврат «${rewardGift.collectionName}»` : `NFT «${rewardGift.collectionName}»`);
        if (rewardStars > 0) descParts.push(`+${rewardStars} звёзд`);
        pushHistory(u, 'win', betObj.payout - betObj.bet, `Краш @ x${betObj.cashoutAt.toFixed(2)}: ${descParts.join(' + ')}`);
        await u.save();
        emitUserUpdate(u);

        io.to(`user_${betObj.telegramId}`).emit('crash:round_reward', {
          roundId,
          crashPoint,
          cashoutAt: betObj.cashoutAt,
          bet: betObj.bet,
          payoutValue: betObj.payout,
          rewardGift: rewardGift || null,
          rewardStars,
          returnedOriginal
        });
      } else if (!betObj.cashedOut && !betObj.settled) {
        betObj.settled = true;
        recordOutcome(u, 'crash', betObj.bet, 0);
        const loseLbl = betObj.betMode === 'gift' && betObj.giftPreview
          ? `Краш @ x${crashPoint}: подарок «${betObj.giftPreview.name}» сгорел (-${betObj.bet})`
          : `Краш @ x${crashPoint}: ставка сгорела (-${betObj.bet})`;
        pushHistory(u, 'bet', -betObj.bet, loseLbl);
        await u.save();
        emitUserUpdate(u);
      }
    } catch (err) {
      console.error('[Crash settle error]', err.message);
    }
  }
}

function startCrashRunning() {
  crashState.phase = 'running';
  crashState.startedAt = Date.now();
  crashState.multiplier = 1.0;
  broadcastCrashState();
  emitAdminCrashForecast();

  clearInterval(crashLoopTimer);
  crashLoopTimer = setInterval(async () => {
    if (crashState.phase !== 'running') return;
    const elapsedSec = (Date.now() - crashState.startedAt) / 1000;
    const nextMult = Number(Math.pow(Math.E, 0.145 * elapsedSec).toFixed(2));
    crashState.multiplier = Math.max(1.0, nextMult);

    // Check auto-cashouts synchronously BEFORE boom so edge ticks NEVER miss an auto-cashout!
    const reachedMult = Math.min(crashState.multiplier, crashState.crashPoint);
    for (const betObj of crashState.bets.values()) {
      if (
        !betObj.cashedOut &&
        betObj.autoCashout >= 1.1 &&
        betObj.autoCashout <= 100 &&
        betObj.autoCashout < crashState.crashPoint &&
        reachedMult >= betObj.autoCashout
      ) {
        processCrashCashout(betObj.telegramId, betObj.autoCashout, true);
      }
    }

    if (crashState.multiplier >= crashState.crashPoint) {
      clearInterval(crashLoopTimer);
      crashState.multiplier = crashState.crashPoint;
      crashState.phase = 'crashed';
      crashState.history.unshift(crashState.crashPoint);
      if (crashState.history.length > 20) crashState.history.pop();

      await settleCrashRoundAtBoom();

      const crashPlayers = Array.from(crashState.bets.values()).map((b) => {
        const bv = Math.round(Number(b.bet) || 0);
        const pv = b.cashedOut ? Math.round(Number(b.payout) || 0) : 0;
        const lv = b.cashedOut ? Math.max(0, bv - pv) : bv;
        return {
          telegramId: b.telegramId,
          firstName: b.firstName || 'Игрок',
          photoUrl: b.photoUrl || '',
          avatarFrame: b.avatarFrame || '',
          bet: bv,
          payout: pv,
          lost: lv,
          status: b.cashedOut ? 'win' : 'lose',
          detail: b.cashedOut
            ? `Кэшаут @ x${Number(b.cashoutAt || 1).toFixed(2)} (+${pv} зв.)`
            : `Сгорело на x${Number(crashState.crashPoint).toFixed(2)} (-${bv} зв.)`
        };
      });
      recordAdminGameRound('crash', {
        roundId: crashState.roundId,
        summary: `Взрыв @ x${Number(crashState.crashPoint).toFixed(2)}${crashState.forced ? ' (ручной)' : ''}`,
        mult: crashState.crashPoint,
        players: crashPlayers
      });

      RoundHistory.create({ game: 'crash', result: crashState.crashPoint }).catch(() => {});

      const revealedPf = {
        roundId: crashState.roundId,
        crashPoint: crashState.crashPoint,
        serverSeed: crashState.serverSeed,
        serverSeedHash: crashState.serverSeedHash,
        createdAt: Date.now()
      };
      pfCrashHistory.unshift(revealedPf);
      if (pfCrashHistory.length > 30) pfCrashHistory.pop();

      io.emit('crash:boom', {
        roundId: crashState.roundId,
        crashPoint: crashState.crashPoint,
        serverSeed: crashState.serverSeed,
        serverSeedHash: crashState.serverSeedHash,
        bets: getCrashBetsArray(),
        history: crashState.history.slice(0, 16)
      });
      emitAdminCrashForecast();

      setTimeout(startCrashWaiting, 4200);
    } else {
      io.emit('crash:tick', {
        multiplier: crashState.multiplier,
        elapsedMs: Date.now() - crashState.startedAt
      });
    }
  }, 60);
}

async function processCrashCashout(telegramId, forcedMult = null, isAuto = false) {
  if (crashState.phase !== 'running') return { error: 'Раунд не активен' };
  const betObj = crashState.bets.get(telegramId);
  if (!betObj || betObj.cashedOut) return { error: 'Нет активной ставки' };

  const cashMult = forcedMult || crashState.multiplier;
  if (cashMult >= crashState.crashPoint) return { error: 'Слишком поздно!' };

  const payoutValue = Math.floor(betObj.bet * cashMult);
  const reward = resolveCrashReward(betObj, payoutValue);

  // Mark cashedOut & settled synchronously BEFORE await so boom/double-click can NEVER double-pay
  betObj.cashedOut = true;
  betObj.cashoutAt = cashMult;
  betObj.payout = payoutValue;
  betObj.pendingReward = reward;
  betObj.settled = true;

  const { rewardGift, rewardStars, returnedOriginal } = reward;
  let updatedUser = null;
  try {
    const u = await User.findOne({ telegramId: betObj.telegramId });
    if (u) {
      if (rewardStars > 0) u.balance += rewardStars;
      if (rewardGift) {
        u.inventory.unshift(rewardGift);
        u.markModified('inventory');
      }
      recordOutcome(u, 'crash', betObj.bet, payoutValue, cashMult);
      const descParts = [];
      if (rewardGift) descParts.push(returnedOriginal ? `возврат «${rewardGift.collectionName}»` : `NFT «${rewardGift.collectionName}»`);
      if (rewardStars > 0) descParts.push(`+${rewardStars} звёзд`);
      pushHistory(u, 'win', payoutValue - betObj.bet, `Краш @ x${cashMult.toFixed(2)}: ${descParts.join(' + ')}`);
      await u.save();
      updatedUser = serializeUser(u);
      emitUserUpdate(u);
    }
  } catch (err) {
    console.error('[Crash instant cashout settle error]', err.message);
  }

  const rewardPayload = {
    roundId: crashState.roundId,
    crashPoint: null,
    cashoutAt: cashMult,
    bet: betObj.bet,
    payoutValue,
    rewardGift: rewardGift || null,
    rewardStars,
    returnedOriginal
  };

  io.emit('crash:bets', getCrashBetsArray());
  emitAdminCrashForecast();
  io.to(`user_${telegramId}`).emit('crash:round_reward', rewardPayload);

  if (isAuto) {
    io.to(`user_${telegramId}`).emit('crash:auto_cashed', {
      cashoutAt: cashMult,
      payout: payoutValue,
      rewardGiftPreview: rewardGift ? giftToPreview(rewardGift) : null,
      rewardStars
    });
  }
  pushLiveFeed('crash', {
    firstName: betObj.firstName || 'Игрок',
    photoUrl: betObj.photoUrl || '',
    avatarFrame: betObj.avatarFrame || '',
    bet: betObj.bet,
    mult: cashMult,
    payout: payoutValue,
    giftImage: rewardGift?.image || '',
    giftName: rewardGift?.collectionName || ''
  });
  return {
    ok: true,
    payout: payoutValue,
    cashoutAt: cashMult,
    rewardGiftPreview: rewardGift ? giftToPreview(rewardGift) : null,
    rewardGift: rewardGift || null,
    rewardStars,
    returnedOriginal,
    user: updatedUser
  };
}

// ======================== REALTIME ENGINE 2: PVP WHEEL (STARS + NFT GIFTS!) ========================
const PVP_COLORS = ['#2ea6ff', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const pvpState = {
  phase: 'waiting', // 'waiting' | 'countdown' | 'spinning'
  endsAt: 0,
  players: [], // { telegramId, firstName, photoUrl, avatarFrame, bet, starsBet, gifts: [fullGift], color }
  totalPot: 0,
  lastWinner: null
};
let pvpTimer = null;

function serializePvpPlayer(p) {
  return {
    telegramId: p.telegramId,
    firstName: p.firstName,
    photoUrl: p.photoUrl,
    avatarFrame: p.avatarFrame || '',
    bet: p.bet,
    starsBet: p.starsBet || 0,
    gifts: (p.gifts || []).map(giftToPreview),
    color: p.color
  };
}

function broadcastPvpState() {
  io.emit('pvp:state', {
    phase: pvpState.phase,
    timeLeftMs: pvpState.phase === 'countdown' ? Math.max(0, pvpState.endsAt - Date.now()) : 0,
    players: pvpState.players.map(serializePvpPlayer),
    totalPot: pvpState.totalPot,
    lastWinner: pvpState.lastWinner
  });
}

function startPvpCountdown() {
  if (pvpState.phase !== 'waiting' || pvpState.players.length < 2) return;
  pvpState.phase = 'countdown';
  pvpState.endsAt = Date.now() + 12000;
  broadcastPvpState();

  clearTimeout(pvpTimer);
  pvpTimer = setTimeout(async () => {
    const total = pvpState.totalPot;
    if (pvpState.players.length < 2 || total <= 0) {
      pvpState.phase = 'waiting';
      pvpState.endsAt = 0;
      broadcastPvpState();
      return;
    }
    pvpState.phase = 'spinning';

    const ticket = crypto.randomInt(0, total);
    let acc = 0;
    let winner = pvpState.players[0];
    let winStartFrac = 0;
    let winEndFrac = 1;

    for (const p of pvpState.players) {
      const nextAcc = acc + p.bet;
      if (ticket >= acc && ticket < nextAcc) {
        winner = p;
        winStartFrac = acc / total;
        winEndFrac = nextAcc / total;
        break;
      }
      acc = nextAcc;
    }

    const landingFrac = winStartFrac + (winEndFrac - winStartFrac) * (0.2 + Math.random() * 0.6);
    const stopAngle = Number((landingFrac * 360).toFixed(2));
    const PVP_SPIN_MS = 4800;

    // Prepare pot snapshot — DO NOT credit anyone until the wheel physically stops!
    const potGifts = [];
    let potStars = 0;
    const roundPlayers = pvpState.players.map((pl) => ({ ...pl }));
    for (const pl of roundPlayers) {
      potStars += Number(pl.starsBet || 0);
      for (const g of (pl.gifts || [])) {
        potGifts.push(JSON.parse(JSON.stringify(g)));
      }
    }
    const winAmount = total;
    const roundIdSnap = pvpState.roundId || null;

    // Broadcast spin start WITHOUT crediting rewards or revealing winner to DB/balance!
    io.emit('pvp:spin', {
      stopAngle,
      spinDurationMs: PVP_SPIN_MS,
      players: roundPlayers.map(serializePvpPlayer),
      totalPot: total
    });

    let pvpSettled = false;
    const settlePvpRound = async () => {
      if (pvpSettled) return;
      pvpSettled = true;
      activePvpPendingSettle = null;

      for (const pl of roundPlayers) {
        const pu = await User.findOne({ telegramId: pl.telegramId });
        if (!pu) continue;
        if (pl.telegramId === winner.telegramId) {
          if (potStars > 0) pu.balance += potStars;
          if (potGifts.length > 0) {
            for (const g of potGifts) pu.inventory.unshift(g);
            pu.markModified('inventory');
          }
          recordOutcome(pu, 'pvp', pl.bet, winAmount, Number((winAmount / Math.max(1, pl.bet)).toFixed(2)));
          const wonDesc = [];
          if (potGifts.length > 0) wonDesc.push(`${potGifts.length} NFT`);
          if (potStars > 0) wonDesc.push(`+${potStars} звёзд`);
          pushHistory(pu, 'win', winAmount - pl.bet, `PvP Колесо: победа (${wonDesc.join(' + ') || winAmount})`);
        } else {
          recordOutcome(pu, 'pvp', pl.bet, 0, 0);
          pushHistory(pu, 'bet', -pl.bet, `PvP Колесо: банк забрал ${winner.firstName} (-${pl.bet})`);
        }
        await pu.save();
        emitUserUpdate(pu);
        io.to(`user_${pu.telegramId}`).emit('user:sync', serializeUser(pu));
      }
      saveDbNow();

      pvpState.lastWinner = {
        telegramId: winner.telegramId,
        firstName: winner.firstName,
        photoUrl: winner.photoUrl,
        avatarFrame: winner.avatarFrame || '',
        winAmount,
        wonStars: potStars,
        wonGifts: potGifts,
        chance: Number(((winner.bet / total) * 100).toFixed(1))
      };

      recordAdminGameRound('pvp', {
        roundId: roundIdSnap,
        summary: `Победил ${winner.firstName} • банк ${winAmount} зв. (${roundPlayers.length} игр.)`,
        mult: Number((winAmount / Math.max(1, winner.bet)).toFixed(2)),
        totalBet: total,
        totalPayout: winAmount,
        totalLost: Math.max(0, total - winner.bet),
        houseProfit: total - winAmount,
        players: roundPlayers.map((pl) => ({
          telegramId: pl.telegramId,
          firstName: pl.firstName || 'Игрок',
          photoUrl: pl.photoUrl || '',
          avatarFrame: pl.avatarFrame || '',
          bet: Math.round(Number(pl.bet) || 0),
          payout: pl.telegramId === winner.telegramId ? winAmount : 0,
          lost: pl.telegramId === winner.telegramId ? 0 : Math.round(Number(pl.bet) || 0),
          status: pl.telegramId === winner.telegramId ? 'win' : 'lose',
          detail: pl.telegramId === winner.telegramId ? `Забрал банк ${winAmount} зв.` : `Проиграл -${pl.bet} зв.`
        }))
      });

      io.emit('pvp:settled', { winner: pvpState.lastWinner });
    };

    activePvpPendingSettle = settlePvpRound;

    // Credit winner strictly AFTER the wheel stops spinning!
    setTimeout(() => {
      settlePvpRound().catch((e) => console.warn('[PvP Settle]', e.message));
    }, PVP_SPIN_MS + 100);

    setTimeout(() => {
      pvpState.phase = 'waiting';
      pvpState.players = [];
      pvpState.totalPot = 0;
      broadcastPvpState();
    }, PVP_SPIN_MS + 1600);
  }, 12000);
}

// ======================== SOCKET.IO AUTH & HANDLERS ========================
io.use(async (socket, next) => {
  const initData = socket.handshake.auth?.initData || '';
  const tgProfile = verifyTelegramInitData(initData);
  if (!tgProfile) return next(new Error('Ошибка авторизации'));
  try {
    const user = await getOrCreateUser(tgProfile);
    if (user.banned && user.telegramId !== ADMIN_ID) {
      return next(new Error('Аккаунт заблокирован'));
    }
    socket.telegramId = user.telegramId;
    socket.userProfile = {
      telegramId: user.telegramId,
      firstName: user.firstName,
      photoUrl: user.photoUrl
    };
    next();
  } catch {
    next(new Error('Ошибка сервера'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.telegramId}`);
  if (!onlineSocketsByUser.has(socket.telegramId)) {
    onlineSocketsByUser.set(socket.telegramId, new Set());
  }
  onlineSocketsByUser.get(socket.telegramId).add(socket.id);

  socket.on('disconnect', () => {
    const set = onlineSocketsByUser.get(socket.telegramId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) onlineSocketsByUser.delete(socket.telegramId);
    }
  });

  // Send immediate game snapshots
  socket.emit('app:config', getPublicAppConfig());
  socket.emit('p2p_auction:state', getPublicP2pAuctionState());
  if (String(socket.telegramId) === String(ADMIN_ID)) {
    socket.join('admin_room');
    socket.emit('admin:crash_forecast', getAdminCrashForecast());
  }
  socket.emit('crash:state', {
    phase: crashState.phase,
    roundId: crashState.roundId,
    multiplier: crashState.multiplier,
    serverSeedHash: crashState.serverSeedHash,
    waitMs: Math.max(0, crashState.waitEndsAt - Date.now()),
    bets: getCrashBetsArray(),
    history: crashState.history.slice(0, 16)
  });

  socket.emit('pvp:state', {
    phase: pvpState.phase,
    timeLeftMs: pvpState.phase === 'countdown' ? Math.max(0, pvpState.endsAt - Date.now()) : 0,
    players: pvpState.players.map(serializePvpPlayer),
    totalPot: pvpState.totalPot,
    lastWinner: pvpState.lastWinner
  });

  socket.emit('plinko:history', plinkoRecentBets.slice(0, 30));
  socket.emit('safe:history', safeRecentBets.slice(0, 30));
  socket.emit('auction:state', getPublicAuctionState(socket.telegramId));
  socket.emit('singularity:state', getPublicSingularityState());

  // CRASH BET (STARS OR GIFT NFT!)
  socket.on('crash:bet', async (payload, cb) => {
    try {
      if (crashState.phase !== 'waiting') return cb?.({ error: 'Ставки принимаются только до старта раунда' });
      if (crashState.bets.has(socket.telegramId)) return cb?.({ error: 'Вы уже сделали ставку в этом раунде' });

      const rawGiftUids = Array.isArray(payload?.giftUids)
        ? [...new Set(payload.giftUids.map(String).filter(Boolean))]
        : (payload?.giftUid ? [String(payload.giftUid)] : []);
      const mode = payload?.mode === 'gift' || rawGiftUids.length > 0 ? 'gift' : 'stars';
      const rawAutoStr = String(payload?.autoCashout ?? '').replace(',', '.').trim();
      const rawAutoNum = Number(rawAutoStr);
      const cleanAutoCashout = (Number.isFinite(rawAutoNum) && rawAutoNum > 0)
        ? Math.min(100, Math.max(1.1, Number(rawAutoNum.toFixed(2))))
        : 0;
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || user.banned) return cb?.({ error: 'Доступ запрещен' });

      if (mode === 'gift') {
        if (!rawGiftUids.length) return cb?.({ error: 'Выберите подарок из инвентаря' });
        const pickedGifts = [];
        let totalGiftVal = 0;
        for (const uid of rawGiftUids) {
          const found = user.inventory.find((g) => g.uid === uid);
          if (!found) return cb?.({ error: 'Один из выбранных подарков не найден в инвентаре' });
          if (found.withdrawPending || found.inAuction) return cb?.({ error: found.inAuction ? 'Подарок в аукционе — его нельзя поставить' : 'Подарок ожидает вывода — его нельзя поставить' });
          pickedGifts.push(JSON.parse(JSON.stringify(found)));
          totalGiftVal += Math.max(5, Math.floor(Number(found.value || 0)));
        }
        const uidSet = new Set(rawGiftUids);
        user.inventory = user.inventory.filter((g) => !uidSet.has(g.uid));
        user.markModified('inventory');
        recordWager(user, 'crash', totalGiftVal);
        await user.save();

        // If 2+ NFTs are staked together, immediately combine their total value into a single NFT!
        let stakedGift = pickedGifts[0];
        if (pickedGifts.length > 1) {
          const mergedCol = findBestUnupgradedNftForValue(totalGiftVal, 0);
          if (mergedCol) {
            stakedGift = createRegularGift(mergedCol, 'Краш Ракета');
          } else {
            pickedGifts.sort((a, b) => (b.value || 0) - (a.value || 0));
            stakedGift = pickedGifts[0];
          }
        }

        crashState.bets.set(socket.telegramId, {
          telegramId: user.telegramId,
          firstName: user.firstName,
          photoUrl: user.photoUrl,
          avatarFrame: getActiveAvatarFrame(user),
          bet: totalGiftVal,
          betMode: 'gift',
          stakedGift,
          giftPreview: giftToPreview(stakedGift),
          autoCashout: cleanAutoCashout,
          placedAt: Date.now(),
          cashedOut: false,
          cashoutAt: 0,
          payout: 0,
          pendingReward: null,
          settled: false
        });
      } else {
        const bet = Math.floor(Number(payload?.bet));
        if (!Number.isFinite(bet) || bet < 5 || bet > 50000) return cb?.({ error: 'Ставка от 5 до 50 000 звёзд' });
        if (user.balance < bet) return cb?.({ error: 'Недостаточно звёзд' });

        user.balance -= bet;
        recordWager(user, 'crash', bet);
        await user.save();

        // If star bet already reaches an unupgraded NFT price, immediately convert it into that NFT!
        const matchedCol = findBestUnupgradedNftForValue(bet, 0);
        const instantGift = matchedCol ? createRegularGift(matchedCol, 'Краш Ракета') : null;

        crashState.bets.set(socket.telegramId, {
          telegramId: user.telegramId,
          firstName: user.firstName,
          photoUrl: user.photoUrl,
          avatarFrame: getActiveAvatarFrame(user),
          bet,
          betMode: instantGift ? 'gift' : 'stars',
          stakedGift: instantGift,
          giftPreview: instantGift ? giftToPreview(instantGift) : null,
          autoCashout: cleanAutoCashout,
          placedAt: Date.now(),
          cashedOut: false,
          cashoutAt: 0,
          payout: 0,
          pendingReward: null,
          settled: false
        });
      }

      emitUserUpdate(user);
      io.emit('crash:bets', getCrashBetsArray());
      emitAdminCrashForecast();
      cb?.({ ok: true });
    } catch {
      cb?.({ error: 'Ошибка ставки' });
    }
  });

  // CRASH CASHOUT
  socket.on('crash:cashout', async (_payload, cb) => {
    const res = await processCrashCashout(socket.telegramId);
    cb?.(res);
  });

  // PVP WHEEL JOIN (STARS AND/OR NFT GIFTS!)
  socket.on('pvp:join', async (payload, cb) => {
    try {
      if (pvpState.phase === 'spinning') return cb?.({ error: 'Колесо уже крутится!' });

      const rawStars = Math.floor(Number(payload?.bet || 0));
      const starsBet = Number.isFinite(rawStars) && rawStars > 0 ? rawStars : 0;
      const giftUids = Array.isArray(payload?.giftUids)
        ? [...new Set(payload.giftUids.map(String).filter(Boolean))]
        : (payload?.giftUid ? [String(payload.giftUid)] : []);

      if (starsBet === 0 && giftUids.length === 0) {
        return cb?.({ error: 'Укажите ставку в звёздах или выберите подарок' });
      }
      if (starsBet > 0 && (starsBet < 5 || starsBet > 50000)) {
        return cb?.({ error: 'Ставка звёздами от 5 до 50 000' });
      }

      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || user.banned) return cb?.({ error: 'Доступ запрещен' });
      if (starsBet > 0 && user.balance < starsBet) return cb?.({ error: 'Недостаточно звёзд' });

      const stakedGifts = [];
      let giftsValTotal = 0;
      for (const uid of giftUids) {
        const g = user.inventory.find((item) => item.uid === uid);
        if (!g) return cb?.({ error: 'Один из выбранных подарков не найден в инвентаре' });
        if (g.withdrawPending || g.inAuction) return cb?.({ error: g.inAuction ? 'Подарок в аукционе — его нельзя поставить' : 'Подарок ожидает вывода — его нельзя поставить' });
        stakedGifts.push(JSON.parse(JSON.stringify(g)));
        giftsValTotal += Math.max(1, Math.floor(Number(g.value || 0)));
      }

      const totalAdded = starsBet + giftsValTotal;
      if (totalAdded < 5) return cb?.({ error: 'Минимальная ставка 5 звёзд' });

      if (starsBet > 0) user.balance -= starsBet;
      if (stakedGifts.length > 0) {
        const uidSet = new Set(giftUids);
        user.inventory = user.inventory.filter((item) => !uidSet.has(item.uid));
        user.markModified('inventory');
      }
      recordWager(user, 'pvp', totalAdded);
      await user.save();

      const existing = pvpState.players.find((p) => p.telegramId === user.telegramId);
      if (existing) {
        existing.bet += totalAdded;
        existing.starsBet = (existing.starsBet || 0) + starsBet;
        existing.gifts = [...(existing.gifts || []), ...stakedGifts];
        existing.avatarFrame = getActiveAvatarFrame(user);
      } else {
        pvpState.players.push({
          telegramId: user.telegramId,
          firstName: user.firstName,
          photoUrl: user.photoUrl,
          avatarFrame: getActiveAvatarFrame(user),
          bet: totalAdded,
          starsBet,
          gifts: stakedGifts,
          color: PVP_COLORS[pvpState.players.length % PVP_COLORS.length]
        });
      }
      pvpState.totalPot += totalAdded;

      emitUserUpdate(user);
      if (pvpState.phase === 'waiting' && pvpState.players.length >= 2) {
        startPvpCountdown();
      } else {
        broadcastPvpState();
      }
      cb?.({ ok: true, totalAdded });
    } catch {
      cb?.({ error: 'Ошибка входа в PvP' });
    }
  });
});

// ======================== BUILT-IN TELEGRAM BOT AUTO-RESPONDER ========================
let botPollingActive = false;
let botUpdateOffset = 0;

async function tgApiJson(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({ ok: false }));
}

async function resolveMiniAppUrl() {
  if (DETECTED_WEBAPP_URL) return DETECTED_WEBAPP_URL;
  try {
    const mb = await tgApiJson('getChatMenuButton', {});
    const url = mb?.result?.web_app?.url;
    if (url && /^https:\/\//i.test(url)) {
      DETECTED_WEBAPP_URL = url.replace(/\/+$/, '');
      return DETECTED_WEBAPP_URL;
    }
  } catch {}
  return '';
}

async function sendBotWelcome(chatId, firstName = '') {
  const webAppUrl = await resolveMiniAppUrl();
  const hi = firstName ? `Привет, <b>${String(firstName).replace(/[<>&]/g, '')}</b>!` : 'Привет!';
  const caption = [
    `✨ ${hi} Добро пожаловать в казино подарков <b>ZetGifts</b>!`,
    '',
    '🎁 <b>8 эксклюзивных кейсов</b> — включая <i>Snoop Case</i>, <i>Огненный</i> и <i>Легендарный</i>',
    '🎡 <b>Колесо Удачи за 10 звёзд</b> — шанс выбить редкий <i>Chill Flame</i>',
    '🚀 <b>Краш, Мины, Плинко, Апгрейдер, Крафт 3D и PvP Колесо</b>',
    '💎 Собирай, улучшай и крафти редкие Telegram NFT-подарки!',
    '',
    'Нажми кнопку <b>«🎮 Играть»</b> ниже, чтобы открыть приложение 👇'
  ].join('\n');

  const replyMarkup = webAppUrl
    ? { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: webAppUrl } }]] }
    : undefined;

  // Read rectangular casino banner directly from images.zip (or fallback file in __dirname)
  let photoBuf = getImageFromZip('bot_welcome.png');
  if (!photoBuf) {
    const diskPath = path.join(__dirname, 'bot_welcome.png');
    if (fs.existsSync(diskPath)) {
      try { photoBuf = fs.readFileSync(diskPath); } catch {}
    }
  }

  try {
    if (photoBuf) {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
      form.append('photo', new Blob([photoBuf], { type: 'image/png' }), 'zetgifts_welcome.png');
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
      });
      const data = await r.json().catch(() => ({}));
      if (data?.ok) return;
    }
  } catch (err) {
    console.warn('[Bot] sendPhoto warning:', err.message);
  }

  // Fallback to sendMessage if photo upload fails
  await tgApiJson('sendMessage', {
    chat_id: chatId,
    text: caption,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  }).catch(() => {});
}

async function startTelegramBotPoller() {
  if (!BOT_TOKEN || process.env.DISABLE_BOT === '1') return;
  botPollingActive = true;
  try {
    await tgApiJson('deleteWebhook', { drop_pending_updates: false });
    await resolveMiniAppUrl();
    console.log(`[Bot] Auto-responder started (WebApp URL: ${DETECTED_WEBAPP_URL || 'auto-detecting'})`);
  } catch (err) {
    console.warn('[Bot] Init warning:', err.message);
  }

  (async function pollLoop() {
    while (botPollingActive) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=25&offset=${botUpdateOffset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'callback_query', 'pre_checkout_query']))}`);
        const data = await res.json().catch(() => ({ ok: false }));
        if (data?.ok && Array.isArray(data.result)) {
          for (const upd of data.result) {
            botUpdateOffset = Math.max(botUpdateOffset, Number(upd.update_id) + 1);
            // 0. Handle Telegram Stars pre_checkout_query (required for XTR payments to succeed!)
            if (upd.pre_checkout_query) {
              const pcq = upd.pre_checkout_query;
              await tgApiJson('answerPreCheckoutQuery', {
                pre_checkout_query_id: pcq.id,
                ok: true
              }).catch(() => {});
              continue;
            }
            // 1. Handle inline keyboard button clicks (Admin withdraw approve / reject)
            if (upd.callback_query) {
              const cq = upd.callback_query;
              const fromId = String(cq.from?.id || '');
              const cbData = String(cq.data || '');
              const answerCb = (text) => fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cq.id, text, show_alert: false })
              }).catch(() => {});

              if (cbData.startsWith('wd_ok:') || cbData.startsWith('wd_no:')) {
                if (fromId !== String(ADMIN_ID)) {
                  await answerCb('Только администратор может обрабатывать выводы');
                  continue;
                }
                const approve = cbData.startsWith('wd_ok:');
                const reqId = cbData.slice(6);
                const result = await resolveWithdrawRequest(reqId, approve, 'telegram_bot');
                await answerCb(result.error ? result.error : (approve ? 'Вывод подтверждён!' : 'Вывод отменён'));
              } else {
                await answerCb('');
              }
              continue;
            }
            // 2. Capture successful Telegram Stars payment (stores exact telegram_payment_charge_id for refunds!)
            const msg = upd.message;
            if (msg?.successful_payment) {
              const sp = msg.successful_payment;
              let payloadObj = {};
              try { payloadObj = JSON.parse(sp.invoice_payload || '{}'); } catch {}
              const payUid = String(payloadObj.uid || msg.from?.id || '');
              const payAmt = Math.floor(Number(sp.total_amount || payloadObj.amount || 0));
              if (payUid && payAmt > 0) {
                await recordOrCreditStarDeposit({
                  invoiceId: String(payloadObj.id || ''),
                  telegramId: payUid,
                  amount: payAmt,
                  chargeId: String(sp.telegram_payment_charge_id || ''),
                  providerChargeId: String(sp.provider_payment_charge_id || ''),
                  source: 'telegram_stars',
                  fromBotWebhook: true
                }).catch(() => {});
              }
              continue;
            }
            // 3. Private chat messages -> welcome card
            if (!msg || !msg.chat || msg.chat.type !== 'private') continue;
            if (msg.from?.is_bot) continue;
            sendBotWelcome(msg.chat.id, msg.from?.first_name || '').catch(() => {});
          }
        } else if (data?.error_code === 409) {
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}

// ======================== 1. DEATH AUCTION (BLIND VICKREY AUCTION) ========================
const AUCTION_BID_MS = 25000;
const AUCTION_REVEAL_MS = 6500;
let auctionRoundSeq = 1;
let auctionTimer = null;

const auctionState = {
  roundId: 1,
  phase: 'waiting', // waiting | bidding | reveal
  prize: null,
  minBid: 100,
  endsAt: 0,
  bids: [], // { telegramId, firstName, username, photoUrl, avatarFrame, amount, placedAt }
  lastResult: null,
  history: []
};

function pickAuctionPrize() {
  // Real market prices: strictly <= 7000 stars; mostly 300-1500 (~80%), 1501-3000 (~15%), very rarely 3001-7000 (~5%)
  const priced = CATALOG.collections
    .map((c) => ({ col: c, price: computeCollectionMarketPrice(c).stars }))
    .filter((x) => x.price >= 250 && x.price <= 7000);

  const tierCommon = priced.filter((x) => x.price >= 300 && x.price <= 1500);
  const tierMid = priced.filter((x) => x.price > 1500 && x.price <= 3000);
  const tierRare = priced.filter((x) => x.price > 3000 && x.price <= 7000);

  const roll = crypto.randomInt(0, 100);
  let bucket = tierCommon;
  if (roll >= 95 && tierRare.length) bucket = tierRare;
  else if (roll >= 80 && tierMid.length) bucket = tierMid;
  if (!bucket.length) bucket = priced.length ? priced : [{ col: CATALOG.collections[0], price: computeCollectionMarketPrice(CATALOG.collections[0]).stars }];

  const chosen = bucket[crypto.randomInt(0, bucket.length)];
  const col = chosen.col;
  return {
    col,
    collectionId: col.id,
    name: col.name,
    price: chosen.price,
    image: getOriginalImage(col),
    lottie: getOriginalLottie(col),
    center: '#243447',
    edge: '#141e2a'
  };
}

function getPublicAuctionState(forTelegramId = null) {
  const isReveal = auctionState.phase === 'reveal';
  const myBidEntry = forTelegramId
    ? auctionState.bids.find((b) => String(b.telegramId) === String(forTelegramId))
    : null;

  return {
    roundId: auctionState.roundId,
    phase: auctionState.phase,
    prize: auctionState.prize ? {
      collectionId: auctionState.prize.collectionId,
      name: auctionState.prize.name,
      price: auctionState.prize.price,
      image: auctionState.prize.image,
      lottie: auctionState.prize.lottie,
      center: auctionState.prize.center,
      edge: auctionState.prize.edge
    } : null,
    minBid: auctionState.minBid,
    timeLeftMs: auctionState.phase === 'bidding' ? Math.max(0, auctionState.endsAt - Date.now()) : 0,
    participantsCount: auctionState.bids.length,
    participants: auctionState.bids.map((b) => ({
      telegramId: b.telegramId,
      firstName: b.firstName,
      username: b.username,
      photoUrl: b.photoUrl,
      avatarFrame: b.avatarFrame,
      amount: isReveal ? b.amount : null,
      placedAt: b.placedAt
    })),
    myBid: myBidEntry ? myBidEntry.amount : 0,
    lastResult: auctionState.lastResult,
    history: auctionState.history.slice(0, 8)
  };
}

function broadcastAuctionState() {
  for (const [uid, sockSet] of onlineSocketsByUser.entries()) {
    const snap = getPublicAuctionState(uid);
    for (const sid of sockSet) {
      io.to(sid).emit('auction:state', snap);
    }
  }
}

function initAuctionRound() {
  if (auctionTimer) { clearTimeout(auctionTimer); auctionTimer = null; }
  const prize = pickAuctionPrize();
  auctionState.roundId = auctionRoundSeq++;
  auctionState.phase = 'waiting';
  auctionState.prize = prize;
  auctionState.minBid = Math.max(50, Math.round((prize.price * 0.08) / 10) * 10);
  auctionState.endsAt = 0;
  auctionState.bids = [];
  broadcastAuctionState();
}

async function finishAuctionRound() {
  if (auctionState.phase !== 'bidding') return;
  if (auctionTimer) { clearTimeout(auctionTimer); auctionTimer = null; }

  const sorted = auctionState.bids.slice().sort((a, b) => (b.amount - a.amount) || (a.placedAt - b.placedAt));
  if (sorted.length < 2) {
    // Refund single bidder if only 1 participant
    for (const b of sorted) {
      const u = await User.findOne({ telegramId: b.telegramId });
      if (u) {
        u.balance += b.amount;
        await u.save();
        saveDbNow();
        emitUserUpdate(u);
        io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
      }
    }
    initAuctionRound();
    return;
  }

  const winnerBid = sorted[0];
  const paidPrice = winnerBid.amount;
  const prizeMeta = auctionState.prize;
  const prizeCol = prizeMeta.col || CATALOG.collections.find((c) => c.name === prizeMeta.name) || CATALOG.collections[0];

  // Settle winner
  const winUser = await User.findOne({ telegramId: winnerBid.telegramId });
  let wonGift = null;
  if (winUser) {
    wonGift = createRegularGift(prizeCol, 'Загадочный аукцион');
    winUser.inventory.unshift(wonGift);
    winUser.markModified('inventory');
    recordWager(winUser, 'auction', paidPrice);
    recordOutcome(winUser, 'auction', paidPrice, wonGift.value, Number((wonGift.value / Math.max(1, paidPrice)).toFixed(2)));
    pushHistory(winUser, 'win', wonGift.value - paidPrice, `Загадочный аукцион: выигран «${prizeMeta.name}» за ${paidPrice} зв.`);
    await winUser.save();
    saveDbNow();
    emitUserUpdate(winUser);
    io.to(`user_${winUser.telegramId}`).emit('user:sync', serializeUser(winUser));
    io.to(`user_${winUser.telegramId}`).emit('auction:won', {
      roundId: auctionState.roundId,
      gift: wonGift,
      paidAmount: paidPrice,
      prizeName: prizeMeta.name
    });
    pushLiveFeed('auction', {
      firstName: winUser.firstName || 'Игрок',
      photoUrl: winUser.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(winUser),
      bet: paidPrice,
      mult: Number((wonGift.value / Math.max(1, paidPrice)).toFixed(2)),
      payout: wonGift.value,
      giftName: wonGift.collectionName,
      giftImage: wonGift.image
    });
  }

  // Refund all other participants
  for (let i = 1; i < sorted.length; i++) {
    const loser = sorted[i];
    const lu = await User.findOne({ telegramId: loser.telegramId });
    if (lu) {
      lu.balance += loser.amount;
      await lu.save();
      saveDbNow();
      emitUserUpdate(lu);
      io.to(`user_${lu.telegramId}`).emit('user:sync', serializeUser(lu));
    }
  }

  recordAdminGameRound('auction', {
    roundId: auctionState.roundId,
    summary: `Лот «${prizeMeta.name}» (${prizeMeta.price} зв.) • Победил ${winnerBid.firstName || 'Игрок'} (${paidPrice} зв.)`,
    mult: Number(((wonGift?.value || prizeMeta.price) / Math.max(1, paidPrice)).toFixed(2)),
    totalBet: paidPrice,
    totalPayout: Math.round(wonGift?.value || prizeMeta.price),
    totalLost: 0,
    houseProfit: paidPrice - Math.round(wonGift?.value || prizeMeta.price),
    players: sorted.map((b, idx) => ({
      telegramId: b.telegramId,
      firstName: b.firstName || 'Игрок',
      photoUrl: b.photoUrl || '',
      avatarFrame: b.avatarFrame || '',
      bet: b.amount,
      payout: idx === 0 ? Math.round(wonGift?.value || prizeMeta.price) : b.amount,
      lost: 0,
      status: idx === 0 ? 'win' : 'refund',
      detail: idx === 0
        ? `Выиграл «${prizeMeta.name}» за ${b.amount} зв.`
        : `Возврат ставки ${b.amount} зв.`
    }))
  });

  const resultRecord = {
    roundId: auctionState.roundId,
    prizeName: prizeMeta.name,
    prizeImage: prizeMeta.image,
    prizePrice: prizeMeta.price,
    winnerName: winnerBid.firstName || winnerBid.username || 'Игрок',
    winnerId: winnerBid.telegramId,
    winnerBid: winnerBid.amount,
    paidAmount: paidPrice,
    savedAmount: 0,
    revealedBids: sorted.map((b) => ({
      telegramId: b.telegramId,
      firstName: b.firstName,
      photoUrl: b.photoUrl,
      amount: b.amount
    })),
    at: Date.now()
  };

  auctionState.phase = 'reveal';
  auctionState.lastResult = resultRecord;
  auctionState.history.unshift(resultRecord);
  if (auctionState.history.length > 15) auctionState.history.length = 15;
  broadcastAuctionState();

  auctionTimer = setTimeout(() => {
    initAuctionRound();
  }, AUCTION_REVEAL_MS);
}

app.get('/api/games/auction/state', authMiddleware, (req, res) => {
  res.json(getPublicAuctionState(req.user.telegramId));
});

app.post('/api/games/auction/bid', authMiddleware, async (req, res) => {
  if (auctionState.phase === 'reveal') {
    return res.status(400).json({ error: 'Идёт вскрытие ставок, дождитесь нового лота' });
  }
  const addAmount = Math.floor(Number(req.body?.amount));
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const existing = auctionState.bids.find((b) => String(b.telegramId) === String(user.telegramId));
  const prevAmt = existing ? existing.amount : 0;

  if (!existing && (!Number.isFinite(addAmount) || addAmount < auctionState.minBid)) {
    return res.status(400).json({ error: `Минимальная первая ставка: ${auctionState.minBid} звёзд` });
  }
  if (existing && (!Number.isFinite(addAmount) || addAmount < 1)) {
    return res.status(400).json({ error: 'Укажите сумму добавления (от 1 звезды)' });
  }

  if (user.balance < addAmount) {
    return res.status(400).json({ error: 'Недостаточно звёзд на балансе' });
  }

  const nextTotal = prevAmt + addAmount;
  user.balance -= addAmount;
  await user.save();

  if (existing) {
    existing.amount = nextTotal;
    existing.placedAt = Date.now();
  } else {
    auctionState.bids.push({
      telegramId: user.telegramId,
      firstName: user.firstName || user.username || 'Игрок',
      username: user.username || '',
      photoUrl: user.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(user),
      amount: nextTotal,
      placedAt: Date.now()
    });
  }

  if (auctionState.phase === 'waiting' && auctionState.bids.length >= 2) {
    auctionState.phase = 'bidding';
    auctionState.endsAt = Date.now() + AUCTION_BID_MS;
    if (auctionTimer) clearTimeout(auctionTimer);
    auctionTimer = setTimeout(finishAuctionRound, AUCTION_BID_MS);
  }

  broadcastAuctionState();
  res.json({ ok: true, myBid: nextTotal, added: addAmount, user: serializeUser(user), auction: getPublicAuctionState(user.telegramId) });
});

// ======================== USER P2P NFT AUCTION HOUSE (10 ACTIVE SLOTS + QUEUE + ANTI-SNIPE) ========================
const P2P_AUCTION_MAX_ACTIVE = 10;
const P2P_AUCTION_IDLE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours without bids -> auto return to owner
const P2P_AUCTION_FEE_PCT = 5; // 5% house commission

function ensureP2pAuctionStore() {
  if (!memDb.p2pAuction || typeof memDb.p2pAuction !== 'object') {
    memDb.p2pAuction = { active: [], queue: [], history: [] };
  }
  if (!Array.isArray(memDb.p2pAuction.active)) memDb.p2pAuction.active = [];
  if (!Array.isArray(memDb.p2pAuction.queue)) memDb.p2pAuction.queue = [];
  if (!Array.isArray(memDb.p2pAuction.history)) memDb.p2pAuction.history = [];
  return memDb.p2pAuction;
}

function getP2pAntiSnipeSeconds(nextBidCount) {
  // 1..5 -> 15s; 6..15 (next 10) -> 10s; 16..25 (next 10) -> 5s; 26+ -> 3s
  if (nextBidCount <= 5) return 15;
  if (nextBidCount <= 15) return 10;
  if (nextBidCount <= 25) return 5;
  return 3;
}

async function syncOwnerGiftAuctionMeta(telegramId, giftUid, meta) {
  const u = await User.findOne({ telegramId: String(telegramId) });
  if (!u) return null;
  const g = (u.inventory || []).find((x) => x.uid === giftUid);
  if (!g) return u;
  if (meta === null) {
    delete g.inAuction;
    delete g.auctionLotId;
    delete g.auctionQueuePos;
    delete g.auctionOrigIdx;
  } else {
    g.inAuction = true;
    g.auctionLotId = meta.lotId;
    g.auctionQueuePos = meta.queuePos || 0;
  }
  u.markModified('inventory');
  await u.save();
  emitUserUpdate(u);
  io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
  return u;
}

async function restoreOwnerGiftFromAuction(telegramId, giftSnapshot, origIdx = 0) {
  const u = await User.findOne({ telegramId: String(telegramId) });
  if (!u) return null;
  const existingIdx = (u.inventory || []).findIndex((x) => x.uid === giftSnapshot.uid);
  if (existingIdx !== -1) {
    const [g] = u.inventory.splice(existingIdx, 1);
    delete g.inAuction;
    delete g.auctionLotId;
    delete g.auctionQueuePos;
    delete g.auctionOrigIdx;
    const tIdx = Math.max(0, Math.min(u.inventory.length, Number.isFinite(Number(origIdx)) ? Number(origIdx) : 0));
    u.inventory.splice(tIdx, 0, g);
  } else {
    const clean = JSON.parse(JSON.stringify(giftSnapshot));
    delete clean.inAuction;
    delete clean.auctionLotId;
    delete clean.auctionQueuePos;
    delete clean.auctionOrigIdx;
    const tIdx = Math.max(0, Math.min(u.inventory.length, Number.isFinite(Number(origIdx)) ? Number(origIdx) : 0));
    u.inventory.splice(tIdx, 0, clean);
  }
  u.markModified('inventory');
  await u.save();
  emitUserUpdate(u);
  io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
  return u;
}

async function promoteP2pAuctionQueue() {
  const store = ensureP2pAuctionStore();
  let changed = false;
  while (store.active.length < P2P_AUCTION_MAX_ACTIVE && store.queue.length > 0) {
    const lot = store.queue.shift();
    lot.status = 'active';
    lot.activatedAt = Date.now();
    lot.expiresAt = Date.now() + P2P_AUCTION_IDLE_TTL_MS;
    store.active.push(lot);
    await syncOwnerGiftAuctionMeta(lot.sellerId, lot.giftUid, { lotId: lot.id, queuePos: 0 });
    changed = true;
  }
  // Update queue positions for remaining queued lots
  for (let i = 0; i < store.queue.length; i++) {
    const ql = store.queue[i];
    const nextPos = i + 1;
    if (ql.queuePos !== nextPos) {
      ql.queuePos = nextPos;
      await syncOwnerGiftAuctionMeta(ql.sellerId, ql.giftUid, { lotId: ql.id, queuePos: nextPos });
      changed = true;
    }
  }
  if (changed) scheduleDbSave();
  return changed;
}

function getPublicP2pAuctionState() {
  const store = ensureP2pAuctionStore();
  return {
    enabled: Boolean(adminConfig.p2pAuctionEnabled),
    maxActive: P2P_AUCTION_MAX_ACTIVE,
    now: Date.now(),
    active: store.active.map((l) => ({
      id: l.id,
      sellerId: l.sellerId,
      sellerName: l.sellerName,
      sellerUsername: l.sellerUsername,
      sellerPhoto: l.sellerPhoto,
      gift: l.gift,
      currentBid: l.currentBid || 0,
      leaderId: l.leaderId || '',
      leaderName: l.leaderName || '',
      leaderPhoto: l.leaderPhoto || '',
      bidCount: l.bidCount || 0,
      nextTimerSec: getP2pAntiSnipeSeconds((l.bidCount || 0) + 1),
      bids: (l.bids || []).slice(0, 40),
      createdAt: l.createdAt,
      activatedAt: l.activatedAt || l.createdAt,
      expiresAt: l.expiresAt || 0,
      endsAt: l.endsAt || 0
    })),
    queueCount: store.queue.length,
    queue: store.queue.map((l, idx) => ({
      id: l.id,
      sellerId: l.sellerId,
      sellerName: l.sellerName,
      giftName: l.gift?.collectionName || 'NFT',
      mintNumber: l.gift?.mintNumber || 0,
      queuePos: idx + 1
    })),
    history: store.history.slice(0, 20)
  };
}

function broadcastP2pAuctionState() {
  io.emit('p2p_auction:state', getPublicP2pAuctionState());
}

async function settleP2pAuctionLot(lot) {
  const store = ensureP2pAuctionStore();
  store.active = store.active.filter((x) => x.id !== lot.id);
  const gName = lot.gift?.crafted
    ? (lot.gift.craftedRuName || lot.gift.craftedName)
    : `${lot.gift?.collectionName || 'NFT'}${lot.gift?.mintNumber ? ' #' + lot.gift.mintNumber : ''}`;

  if (!lot.bidCount || !lot.leaderId) {
    // 24h expired with zero bids -> return NFT to owner
    await restoreOwnerGiftFromAuction(lot.sellerId, lot.gift, lot.origIdx);
    const seller = await User.findOne({ telegramId: String(lot.sellerId) });
    if (seller) {
      pushHistory(seller, 'info', 0, `Аукцион: лот «${gName}» не получил ставок за 24ч и возвращён в профиль`);
      await seller.save();
    }
    io.to(`user_${lot.sellerId}`).emit('admin:toast', {
      text: `Лот «${gName}» возвращён в профиль (24ч без ставок)`,
      type: 'info'
    });
    sendTelegramText(lot.sellerId, `⏰ На ваш лот <b>${escapeHtml(gName)}</b> не сделали ставок за 24 часа — подарок возвращён в ваш профиль.`).catch(() => {});
    await promoteP2pAuctionQueue();
    saveDbNow();
    broadcastP2pAuctionState();
    return;
  }

  // Finalize sale: winner gets NFT (source: 'С аукциона'), seller immediately gets 95% (5% casino fee)
  const finalBid = Math.max(1, Math.floor(Number(lot.currentBid) || 0));
  const sellerPayout = Math.floor(finalBid * (100 - P2P_AUCTION_FEE_PCT) / 100);
  const houseFee = Math.max(0, finalBid - sellerPayout);

  const winner = await User.findOne({ telegramId: String(lot.leaderId) });
  let wonGift = null;
  if (winner) {
    wonGift = JSON.parse(JSON.stringify(lot.gift));
    delete wonGift.inAuction;
    delete wonGift.auctionLotId;
    delete wonGift.auctionQueuePos;
    delete wonGift.auctionOrigIdx;
    wonGift.obtainedFrom = 'С аукциона';
    wonGift.obtainedAt = Date.now();
    winner.inventory.unshift(wonGift);
    winner.markModified('inventory');
    recordWager(winner, 'auction', finalBid);
    pushHistory(winner, 'win', 0, `Аукцион: выигран «${gName}» за ${finalBid} зв. (с аукциона)`);
    await winner.save();
    emitUserUpdate(winner);
    io.to(`user_${winner.telegramId}`).emit('user:sync', serializeUser(winner));
    io.to(`user_${winner.telegramId}`).emit('p2p_auction:won', {
      lotId: lot.id,
      gift: wonGift,
      paidAmount: finalBid,
      giftName: gName
    });
  }

  const seller = await User.findOne({ telegramId: String(lot.sellerId) });
  if (seller) {
    seller.balance += sellerPayout;
    if (!Array.isArray(seller.pendingAuctionPayouts)) seller.pendingAuctionPayouts = [];
    const payoutNotice = {
      id: makeUid(),
      lotId: lot.id,
      giftName: gName,
      giftImage: lot.gift?.image || '',
      finalBid,
      payout: sellerPayout,
      fee: houseFee,
      feePct: P2P_AUCTION_FEE_PCT,
      buyerName: lot.leaderName || 'Игрок',
      at: Date.now()
    };
    seller.pendingAuctionPayouts.push(payoutNotice);
    if (seller.pendingAuctionPayouts.length > 10) seller.pendingAuctionPayouts = seller.pendingAuctionPayouts.slice(-10);
    pushHistory(seller, 'win', sellerPayout, `Аукцион: продан «${gName}» (+${sellerPayout} зв., комиссия 5%)`);
    await seller.save();
    emitUserUpdate(seller);
    io.to(`user_${seller.telegramId}`).emit('user:sync', serializeUser(seller));
    io.to(`user_${seller.telegramId}`).emit('p2p_auction:seller_paid', payoutNotice);
  }

  store.history.unshift({
    id: lot.id,
    giftName: gName,
    giftImage: lot.gift?.image || '',
    sellerId: lot.sellerId,
    sellerName: lot.sellerName,
    buyerId: lot.leaderId,
    buyerName: lot.leaderName,
    finalBid,
    sellerPayout,
    houseFee,
    bidCount: lot.bidCount,
    finishedAt: Date.now()
  });
  if (store.history.length > 50) store.history = store.history.slice(0, 50);

  await promoteP2pAuctionQueue();
  saveDbNow();
  broadcastP2pAuctionState();
}

async function cancelAllUnfinishedP2pAuctions(reason = 'Раздел Аукцион отключён администратором') {
  const store = ensureP2pAuctionStore();
  const activeCopy = store.active.slice();
  const queueCopy = store.queue.slice();
  store.active = [];
  store.queue = [];

  for (const lot of [...activeCopy, ...queueCopy]) {
    const gName = lot.gift?.crafted
      ? (lot.gift.craftedRuName || lot.gift.craftedName)
      : `${lot.gift?.collectionName || 'NFT'}${lot.gift?.mintNumber ? ' #' + lot.gift.mintNumber : ''}`;

    // Return NFT to owner
    await restoreOwnerGiftFromAuction(lot.sellerId, lot.gift, lot.origIdx);
    const seller = await User.findOne({ telegramId: String(lot.sellerId) });
    if (seller) {
      pushHistory(seller, 'info', 0, `Аукцион отменён: «${gName}» возвращён в профиль`);
      await seller.save();
    }
    io.to(`user_${lot.sellerId}`).emit('admin:toast', {
      text: `${reason}. Подарок «${gName}» возвращён в ваш профиль.`,
      type: 'info'
    });
    sendTelegramText(lot.sellerId, `ℹ️ ${escapeHtml(reason)}. Ваш подарок <b>${escapeHtml(gName)}</b> возвращён в профиль.`).catch(() => {});

    // Refund current leader's escrowed stars if bids were placed
    if (lot.bidCount > 0 && lot.leaderId && lot.currentBid > 0) {
      const leader = await User.findOne({ telegramId: String(lot.leaderId) });
      if (leader) {
        leader.balance += lot.currentBid;
        pushHistory(leader, 'topup', lot.currentBid, `Возврат ставки с отменённого аукциона «${gName}» (+${lot.currentBid} зв.)`);
        await leader.save();
        emitUserUpdate(leader);
        io.to(`user_${leader.telegramId}`).emit('user:sync', serializeUser(leader));
        io.to(`user_${leader.telegramId}`).emit('admin:toast', {
          text: `Аукцион «${gName}» отменён — вам возвращено ${lot.currentBid} зв.`,
          type: 'info'
        });
        sendTelegramText(lot.leaderId, `ℹ️ Аукцион <b>${escapeHtml(gName)}</b> был отменён администратором. Ваша ставка <b>${lot.currentBid} ⭐</b> полностью возвращена на баланс.`).catch(() => {});
      }
    }
  }
  saveDbNow();
  broadcastP2pAuctionState();
}

// 1-second P2P Auction ticker (handles 15/10/5/3s countdowns & 24h idle expirations)
let p2pTickRunning = false;
setInterval(async () => {
  if (p2pTickRunning) return;
  const store = ensureP2pAuctionStore();
  if (!store.active.length) return;
  p2pTickRunning = true;
  try {
    const now = Date.now();
    const expired = store.active.filter((l) =>
      (l.bidCount > 0 && l.endsAt > 0 && l.endsAt <= now) ||
      (l.bidCount === 0 && l.expiresAt > 0 && l.expiresAt <= now)
    );
    for (const lot of expired) {
      await settleP2pAuctionLot(lot);
    }
  } catch (err) {
    console.warn('[P2P Auction Tick]', err.message);
  } finally {
    p2pTickRunning = false;
  }
}, 1000);

app.get('/api/p2p-auction/state', authMiddleware, (_req, res) => {
  res.json(getPublicP2pAuctionState());
});

app.post('/api/p2p-auction/create', authMiddleware, async (req, res) => {
  if (!adminConfig.p2pAuctionEnabled) {
    return res.status(403).json({ error: 'Раздел Аукцион сейчас отключён' });
  }
  const uid = String(req.body?.uid || '').trim();
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = (user.inventory || []).findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден в инвентаре' });
  const gift = user.inventory[idx];
  if (!gift.upgraded && !gift.crafted) {
    return res.status(400).json({ error: 'На аукцион можно выставить только улучшенный (NFT) подарок!' });
  }
  if (gift.withdrawPending) return res.status(400).json({ error: 'Подарок ожидает вывода' });
  if (gift.inAuction) return res.status(400).json({ error: 'Подарок уже выставлен на аукцион' });

  const store = ensureP2pAuctionStore();
  const lotId = makeUid();
  const giftCopy = JSON.parse(JSON.stringify(gift));
  const goesActive = store.active.length < P2P_AUCTION_MAX_ACTIVE;
  const queuePos = goesActive ? 0 : (store.queue.length + 1);

  gift.inAuction = true;
  gift.auctionLotId = lotId;
  gift.auctionQueuePos = queuePos;
  gift.auctionOrigIdx = idx;

  const lot = {
    id: lotId,
    status: goesActive ? 'active' : 'queued',
    queuePos,
    origIdx: idx,
    sellerId: String(user.telegramId),
    sellerName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Игрок',
    sellerUsername: user.username || '',
    sellerPhoto: user.photoUrl || '',
    giftUid: gift.uid,
    gift: giftCopy,
    currentBid: 0,
    leaderId: '',
    leaderName: '',
    leaderPhoto: '',
    bidCount: 0,
    bids: [],
    createdAt: Date.now(),
    activatedAt: goesActive ? Date.now() : 0,
    expiresAt: goesActive ? (Date.now() + P2P_AUCTION_IDLE_TTL_MS) : 0,
    endsAt: 0
  };

  if (goesActive) store.active.push(lot);
  else store.queue.push(lot);

  user.markModified('inventory');
  await user.save();
  saveDbNow();
  broadcastP2pAuctionState();

  res.json({
    ok: true,
    lotId,
    queued: !goesActive,
    queuePos,
    user: serializeUser(user),
    state: getPublicP2pAuctionState()
  });
});

app.post('/api/p2p-auction/cancel', authMiddleware, async (req, res) => {
  const uid = String(req.body?.uid || '').trim();
  const lotIdReq = String(req.body?.lotId || '').trim();
  const store = ensureP2pAuctionStore();

  let lot = store.active.find((l) => (lotIdReq && l.id === lotIdReq) || (uid && l.giftUid === uid));
  let fromQueue = false;
  if (!lot) {
    lot = store.queue.find((l) => (lotIdReq && l.id === lotIdReq) || (uid && l.giftUid === uid));
    fromQueue = Boolean(lot);
  }
  if (!lot) return res.status(404).json({ error: 'Лот не найден на аукционе' });
  if (String(lot.sellerId) !== String(req.user.telegramId)) {
    return res.status(403).json({ error: 'Вы не владелец этого лота' });
  }
  if (lot.bidCount > 0) {
    return res.status(400).json({ error: 'На подарок уже сделали ставку — снять с аукциона нельзя!' });
  }

  if (fromQueue) store.queue = store.queue.filter((l) => l.id !== lot.id);
  else store.active = store.active.filter((l) => l.id !== lot.id);

  const user = await restoreOwnerGiftFromAuction(lot.sellerId, lot.gift, lot.origIdx);
  await promoteP2pAuctionQueue();
  saveDbNow();
  broadcastP2pAuctionState();

  res.json({ ok: true, user: serializeUser(user), state: getPublicP2pAuctionState() });
});

app.post('/api/p2p-auction/bid', authMiddleware, async (req, res) => {
  if (!adminConfig.p2pAuctionEnabled) {
    return res.status(403).json({ error: 'Раздел Аукцион отключён' });
  }
  const lotId = String(req.body?.lotId || '').trim();
  const amount = Math.floor(Number(req.body?.amount));
  const mode = req.body?.mode === 'add' ? 'add' : 'bid'; // 'bid' = total bid or 'add' = add to my bid

  const store = ensureP2pAuctionStore();
  const lot = store.active.find((l) => l.id === lotId);
  if (!lot) return res.status(404).json({ error: 'Лот не найден или уже завершён' });
  if (String(lot.sellerId) === String(req.user.telegramId)) {
    return res.status(400).json({ error: 'Нельзя делать ставки на собственный подарок' });
  }
  if (lot.bidCount > 0 && lot.endsAt > 0 && lot.endsAt <= Date.now()) {
    return res.status(400).json({ error: 'Торги по этому лоту уже завершились' });
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ error: 'Укажите корректную сумму ставки' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  const isCurrentLeader = String(lot.leaderId) === String(user.telegramId);
  let targetBid = amount;
  let payDelta = amount;

  if (isCurrentLeader) {
    // Leader can either add amount on top of their current bid, or set a higher total
    if (mode === 'add') {
      payDelta = amount;
      targetBid = lot.currentBid + amount;
    } else {
      if (amount <= lot.currentBid) {
        // Treat small input as adding on top so UX is intuitive
        payDelta = amount;
        targetBid = lot.currentBid + amount;
      } else {
        payDelta = amount - lot.currentBid;
        targetBid = amount;
      }
    }
  } else {
    const minNext = lot.bidCount === 0 ? 10 : (lot.currentBid + 10);
    if (amount < minNext) {
      return res.status(400).json({ error: `Минимальная ставка: ${minNext} звёзд` });
    }
    targetBid = amount;
    payDelta = amount;
  }

  if (user.balance < payDelta) {
    return res.status(400).json({ error: `Недостаточно звёзд (нужно ${payDelta})` });
  }

  // Deduct stars from bidder
  user.balance -= payDelta;
  await user.save();

  // Refund previous leader immediately when outbid
  if (!isCurrentLeader && lot.leaderId && lot.currentBid > 0) {
    const prevLeader = await User.findOne({ telegramId: String(lot.leaderId) });
    if (prevLeader) {
      prevLeader.balance += lot.currentBid;
      await prevLeader.save();
      emitUserUpdate(prevLeader);
      io.to(`user_${prevLeader.telegramId}`).emit('user:sync', serializeUser(prevLeader));
    }
  }

  // On the VERY FIRST bid -> permanently remove the gift from seller's profile (no longer cancellable!)
  const isFirstBid = lot.bidCount === 0;
  if (isFirstBid) {
    const seller = await User.findOne({ telegramId: String(lot.sellerId) });
    if (seller) {
      seller.inventory = (seller.inventory || []).filter((g) => g.uid !== lot.giftUid);
      seller.markModified('inventory');
      await seller.save();
      emitUserUpdate(seller);
      io.to(`user_${seller.telegramId}`).emit('user:sync', serializeUser(seller));
    }
  }

  lot.bidCount += 1;
  lot.currentBid = targetBid;
  lot.leaderId = String(user.telegramId);
  lot.leaderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Игрок';
  lot.leaderPhoto = user.photoUrl || '';

  const timerSec = getP2pAntiSnipeSeconds(lot.bidCount);
  lot.endsAt = Date.now() + timerSec * 1000;

  lot.bids.unshift({
    id: makeUid(),
    telegramId: String(user.telegramId),
    firstName: lot.leaderName,
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    amount: targetBid,
    added: payDelta,
    bidNum: lot.bidCount,
    timerSec,
    at: Date.now()
  });
  if (lot.bids.length > 60) lot.bids = lot.bids.slice(0, 60);

  saveDbNow();
  emitUserUpdate(user);
  broadcastP2pAuctionState();

  res.json({
    ok: true,
    currentBid: targetBid,
    bidCount: lot.bidCount,
    timerSec,
    user: serializeUser(user),
    state: getPublicP2pAuctionState()
  });
});

app.post('/api/p2p-auction/ack-payout', authMiddleware, async (req, res) => {
  const noticeId = String(req.body?.id || '').trim();
  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user && Array.isArray(user.pendingAuctionPayouts)) {
    user.pendingAuctionPayouts = noticeId
      ? user.pendingAuctionPayouts.filter((n) => n.id !== noticeId)
      : [];
    await user.save();
  }
  res.json({ ok: true, user: user ? serializeUser(user) : null });
});

// ======================== 2. SINGULARITY (GRAVITATIONAL VORTEX) ========================
const SINGULARITY_SUCK_MS = 1800;     // smooth spiral pull animation
const SINGULARITY_COOLDOWN_MS = 2000; // exact 2.0s calm orbit cooldown after each suck
const SINGULARITY_PULL_MS = SINGULARITY_SUCK_MS + SINGULARITY_COOLDOWN_MS;
const SINGULARITY_WARMUP_MS = 5000;
const SINGULARITY_FINISH_MS = 4500;
let singularityRoundSeq = 1;
let singularityTimer = null;

const singularityState = {
  roundId: 1,
  phase: 'waiting', // waiting | active | finished
  players: [], // { telegramId, firstName, photoUrl, avatarFrame, mass, asteroidType, orbitSeed, status: 'alive'|'sucked', suckedAt, joinedAt }
  totalPot: 0,
  nextPullAt: 0,
  lastSucked: null,
  lastWinner: null,
  history: []
};

function getPublicSingularityState() {
  const aliveMassSum = singularityState.players
    .filter((p) => p.status === 'alive')
    .reduce((sum, p) => sum + Math.max(1, Number(p.mass) || 0), 0);
  return {
    roundId: singularityState.roundId,
    phase: singularityState.phase,
    players: singularityState.players.map((p) => ({
      telegramId: p.telegramId,
      firstName: p.firstName,
      photoUrl: p.photoUrl,
      avatarFrame: p.avatarFrame,
      betMode: p.betMode || 'stars',
      gift: p.gift ? {
        image: p.gift.image,
        collectionName: p.gift.collectionName,
        modelName: p.gift.model?.name || '',
        upgraded: Boolean(p.gift.upgraded),
        crafted: Boolean(p.gift.crafted),
        mintNumber: p.gift.mintNumber || 0,
        backdrop: p.gift.backdrop || null,
        symbol: p.gift.symbol || null,
        value: p.gift.value
      } : null,
      mass: p.mass,
      winChance: p.status === 'alive' && aliveMassSum > 0
        ? Number(((Math.max(1, Number(p.mass) || 0) / aliveMassSum) * 100).toFixed(1))
        : 0,
      asteroidType: p.asteroidType,
      orbitSeed: p.orbitSeed,
      joinedAt: p.joinedAt || 0,
      status: p.status,
      suckedAt: p.suckedAt || 0
    })),
    totalPot: singularityState.totalPot,
    nextPullAt: singularityState.nextPullAt,
    suckDurMs: SINGULARITY_SUCK_MS,
    cooldownMs: SINGULARITY_COOLDOWN_MS,
    now: Date.now(),
    lastSucked: singularityState.lastSucked,
    lastWinner: singularityState.lastWinner,
    history: singularityState.history.slice(0, 8)
  };
}

function broadcastSingularityState() {
  io.emit('singularity:state', getPublicSingularityState());
}

function resetSingularityRound() {
  if (singularityTimer) { clearTimeout(singularityTimer); singularityTimer = null; }
  singularityState.roundId = singularityRoundSeq++;
  singularityState.phase = 'waiting';
  singularityState.players = [];
  singularityState.totalPot = 0;
  singularityState.nextPullAt = 0;
  singularityState.lastSucked = null;
  broadcastSingularityState();
}

async function runSingularityPull() {
  if (singularityState.phase !== 'active') return;
  const alive = singularityState.players.filter((p) => p.status === 'alive');
  if (alive.length <= 1) {
    await settleSingularityWinner(alive[0] || null);
    return;
  }

  // Probabilistic gravity pull: smaller stake = higher chance to be sucked (weight = 1 / mass).
  // For 2 players with stakes A and B: P(win A) = A / (A + B), P(win B) = B / (A + B).
  const victim = weightedPick(alive, (p) => 1 / Math.max(1, Number(p.mass) || 1));
  victim.status = 'sucked';
  victim.suckedAt = Date.now();

  singularityState.lastSucked = {
    telegramId: victim.telegramId,
    firstName: victim.firstName,
    mass: victim.mass,
    asteroidType: victim.asteroidType,
    at: victim.suckedAt
  };

  // Record loss for sucked player
  const vUser = await User.findOne({ telegramId: victim.telegramId });
  if (vUser) {
    recordOutcome(vUser, 'singularity', victim.mass, 0, 0);
    pushHistory(vUser, 'bet', -victim.mass, `Сингулярность: астероид поглощён (${victim.mass} зв.)`);
    await vUser.save();
  }

  const remaining = singularityState.players.filter((p) => p.status === 'alive');
  if (remaining.length <= 1) {
    broadcastSingularityState();
    singularityTimer = setTimeout(() => {
      settleSingularityWinner(remaining[0] || null);
    }, SINGULARITY_SUCK_MS + 200);
  } else {
    singularityState.nextPullAt = Date.now() + SINGULARITY_PULL_MS;
    broadcastSingularityState();
    singularityTimer = setTimeout(runSingularityPull, SINGULARITY_PULL_MS);
  }
}

async function settleSingularityWinner(winner) {
  if (singularityTimer) { clearTimeout(singularityTimer); singularityTimer = null; }
  singularityState.phase = 'finished';
  singularityState.nextPullAt = 0;

  if (winner) {
    const starsPot = singularityState.players
      .filter((p) => (p.betMode || 'stars') === 'stars')
      .reduce((sum, p) => sum + (Number(p.mass) || 0), 0);
    const allGifts = singularityState.players
      .filter((p) => p.betMode === 'gift' && p.gift)
      .map((p) => ({ ...p.gift, source: 'Сингулярность' }));

    // Winner takes the whole pot minus configurable casino fee (default 5%)
    const feeRate = Math.min(0.20, Math.max(0, Number(adminConfig?.houseFeePct ?? 5) / 100));
    const keepRate = 1 - feeRate;
    const winnerOwnStars = (winner.betMode || 'stars') === 'stars' ? (Number(winner.mass) || 0) : 0;
    const otherStars = Math.max(0, starsPot - winnerOwnStars);
    let starsPayout = 0;
    if (starsPot > 0) {
      const potAfterFee = Math.floor(starsPot * keepRate);
      if (otherStars > 0 && potAfterFee <= winnerOwnStars) {
        starsPayout = winnerOwnStars + Math.max(1, Math.floor(otherStars * keepRate));
      } else {
        starsPayout = Math.max(winnerOwnStars, potAfterFee);
      }
    }
    const giftsTotalVal = allGifts.reduce((s, g) => s + (Number(g.value) || 0), 0);
    const totalWinValue = starsPayout + giftsTotalVal;
    const netProfit = totalWinValue - (Number(winner.mass) || 0);
    const mult = Number((totalWinValue / Math.max(1, winner.mass)).toFixed(2));
    const singTotalPot = singularityState.players.reduce((s, p) => s + Math.round(Number(p.mass) || 0), 0);
    recordAdminGameRound('singularity', {
      roundId: singularityState.roundId,
      summary: `Победил ${winner.firstName} • банк ${singTotalPot} зв. (ком. ${Math.round(feeRate * 100)}%)`,
      mult,
      totalBet: singTotalPot,
      totalPayout: totalWinValue,
      totalLost: Math.max(0, singTotalPot - Math.round(Number(winner.mass) || 0)),
      houseProfit: singTotalPot - totalWinValue,
      players: singularityState.players.map((p) => {
        const isWin = String(p.telegramId) === String(winner.telegramId);
        const m = Math.round(Number(p.mass) || 0);
        return {
          telegramId: p.telegramId,
          firstName: p.firstName || 'Игрок',
          photoUrl: p.photoUrl || '',
          avatarFrame: p.avatarFrame || '',
          bet: m,
          payout: isWin ? totalWinValue : 0,
          lost: isWin ? 0 : m,
          status: isWin ? 'win' : 'lose',
          detail: isWin ? `Забрал банк ${totalWinValue} зв. (x${mult})` : `Поглощён чёрной дырой (-${m} зв.)`
        };
      })
    });

    const u = await User.findOne({ telegramId: winner.telegramId });
    if (u) {
      if (starsPayout > 0) u.balance += starsPayout;
      if (allGifts.length > 0) {
        for (const gf of allGifts) u.inventory.unshift(gf);
        u.markModified('inventory');
      }
      recordOutcome(u, 'singularity', winner.mass, totalWinValue, mult);
      pushHistory(u, 'win', Math.max(0, netProfit), `Сингулярность: победа (банк ${totalWinValue} зв.)`);
      await u.save();
      saveDbNow();
      const serialized = serializeUser(u);
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serialized);
      io.to(`user_${u.telegramId}`).emit('singularity:reward', {
        roundId: singularityState.roundId,
        payout: totalWinValue,
        netProfit,
        starsPayout,
        gifts: allGifts,
        totalPot: singularityState.totalPot
      });
      pushLiveFeed('singularity', {
        firstName: u.firstName || 'Игрок',
        photoUrl: u.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(u),
        bet: winner.mass,
        mult,
        payout: totalWinValue,
        giftName: allGifts[0]?.collectionName || '',
        giftImage: allGifts[0]?.image || ''
      });
    }
    const winRec = {
      roundId: singularityState.roundId,
      telegramId: winner.telegramId,
      firstName: winner.firstName,
      photoUrl: winner.photoUrl,
      mass: winner.mass,
      payout: totalWinValue,
      netProfit,
      starsPayout,
      giftsWon: allGifts.length,
      totalPot: singularityState.totalPot,
      at: Date.now()
    };
    singularityState.lastWinner = winRec;
    singularityState.history.unshift(winRec);
    if (singularityState.history.length > 12) singularityState.history.length = 12;
  }

  broadcastSingularityState();
  singularityTimer = setTimeout(resetSingularityRound, SINGULARITY_FINISH_MS);
}

app.get('/api/games/singularity/state', authMiddleware, (req, res) => {
  res.json(getPublicSingularityState());
});

app.post('/api/games/singularity/join', authMiddleware, async (req, res) => {
  if (singularityState.phase === 'finished') {
    return res.status(400).json({ error: 'Раунд завершён, дождитесь новой воронки' });
  }

  const mode = req.body?.mode === 'gift' || req.body?.giftUid ? 'gift' : 'stars';
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const existing = singularityState.players.find((p) => String(p.telegramId) === String(user.telegramId));

  if (existing && existing.status === 'sucked') {
    return res.status(400).json({ error: 'Ваш астероид уже поглощён в этом раунде' });
  }
  if (existing && (existing.betMode || 'stars') !== mode) {
    return res.status(400).json({ error: 'В одном раунде нельзя совмещать звёзды и подарки' });
  }

  if (mode === 'gift') {
    if (existing) {
      return res.status(400).json({ error: 'Ваш подарок уже на орбите в этом раунде' });
    }
    const giftUid = String(req.body?.giftUid || '');
    const idx = user.inventory.findIndex((g) => g.uid === giftUid);
    if (idx === -1) return res.status(404).json({ error: 'Подарок не найден в инвентаре' });
    if (user.inventory[idx].withdrawPending || user.inventory[idx].inAuction) return res.status(400).json({ error: user.inventory[idx].inAuction ? 'Подарок в аукционе — его нельзя поставить' : 'Подарок ожидает вывода — его нельзя поставить' });
    const stakedGift = user.inventory.splice(idx, 1)[0];
    const gVal = Math.max(15, Math.round(stakedGift.value || 15));

    user.markModified('inventory');
    recordWager(user, 'singularity', gVal);
    await user.save();

    singularityState.players.push({
      telegramId: user.telegramId,
      firstName: user.firstName || user.username || 'Игрок',
      photoUrl: user.photoUrl || '',
      avatarFrame: getActiveAvatarFrame(user),
      betMode: 'gift',
      gift: stakedGift,
      mass: gVal,
      asteroidType: crypto.randomInt(0, 3),
      orbitSeed: Number((Math.random() * Math.PI * 2).toFixed(4)),
      status: 'alive',
      suckedAt: 0,
      joinedAt: Date.now()
    });
    singularityState.totalPot += gVal;
  } else {
    const amount = Math.floor(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ error: 'Минимальная ставка — 10 звёзд' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Недостаточно звёзд на балансе' });
    }
    user.balance -= amount;
    recordWager(user, 'singularity', amount);
    await user.save();

    if (existing) {
      existing.mass += amount;
    } else {
      singularityState.players.push({
        telegramId: user.telegramId,
        firstName: user.firstName || user.username || 'Игрок',
        photoUrl: user.photoUrl || '',
        avatarFrame: getActiveAvatarFrame(user),
        betMode: 'stars',
        gift: null,
        mass: amount,
        asteroidType: crypto.randomInt(0, 3),
        orbitSeed: Number((Math.random() * Math.PI * 2).toFixed(4)),
        status: 'alive',
        suckedAt: 0,
        joinedAt: Date.now()
      });
    }
    singularityState.totalPot += amount;
  }

  const aliveCount = singularityState.players.filter((p) => p.status === 'alive').length;
  if (singularityState.phase === 'waiting' && aliveCount >= 2) {
    singularityState.phase = 'active';
    singularityState.nextPullAt = Date.now() + SINGULARITY_WARMUP_MS;
    if (singularityTimer) clearTimeout(singularityTimer);
    singularityTimer = setTimeout(runSingularityPull, SINGULARITY_WARMUP_MS);
  }

  broadcastSingularityState();
  res.json({ ok: true, user: serializeUser(user), singularity: getPublicSingularityState() });
});

// ======================== 3. CRACK THE SAFE (3-DIAL CODE LOCK) ========================
app.post('/api/games/safe/crack', authMiddleware, async (req, res) => {
  const bet = Math.floor(Number(req.body?.bet));
  const rawDigits = req.body?.digits;
  if (!Number.isFinite(bet) || bet < 10) {
    return res.status(400).json({ error: 'Минимальная ставка — 10 звёзд' });
  }
  if (!Array.isArray(rawDigits) || rawDigits.length !== 3) {
    return res.status(400).json({ error: 'Введите комбинацию из 3 цифр (0–9)' });
  }
  const digits = rawDigits.map((d) => Math.floor(Number(d)));
  if (digits.some((d) => !Number.isFinite(d) || d < 0 || d > 9)) {
    return res.status(400).json({ error: 'Цифры кода должны быть от 0 до 9' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < bet) {
    return res.status(400).json({ error: 'Недостаточно звёзд на балансе' });
  }

  user.balance -= bet;
  recordWager(user, 'safe', bet);

  const secret = [crypto.randomInt(0, 10), crypto.randomInt(0, 10), crypto.randomInt(0, 10)];
  const matchedPositions = [
    digits[0] === secret[0],
    digits[1] === secret[1],
    digits[2] === secret[2]
  ];
  const matches = matchedPositions.filter(Boolean).length;
  const SAFE_MULTS = { 0: 0, 1: 1.2, 2: 3, 3: 50 };
  const multiplier = SAFE_MULTS[matches] || 0;
  const winAmount = Math.floor(bet * multiplier);

  const safeEntry = {
    telegramId: user.telegramId,
    firstName: user.firstName || 'Игрок',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    bet,
    matches,
    multiplier,
    payout: winAmount,
    createdAt: Date.now()
  };

  // Save ONLY bet deduction — winAmount is credited strictly AFTER all 3 dials reveal!
  await user.save();

  const safeUid = user.telegramId;
  const feedToken = schedulePendingFeed(safeUid, 6500, async () => {
    const u = await User.findOne({ telegramId: safeUid });
    if (u) {
      if (winAmount > 0) {
        u.balance += winAmount;
        recordOutcome(u, 'safe', bet, winAmount, multiplier);
        pushHistory(u, 'win', winAmount - bet, `Взлом Сейфа: угадано ${matches}/3 (x${multiplier})`);
      } else {
        recordOutcome(u, 'safe', bet, 0, 0);
        pushHistory(u, 'bet', -bet, `Взлом Сейфа: код ${secret.join('')} не подошёл`);
      }
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    safeRecentBets.unshift(safeEntry);
    if (safeRecentBets.length > 30) safeRecentBets.pop();
    io.emit('safe:bet', safeEntry);
    if (multiplier >= 3) {
      pushLiveFeed('safe', {
        firstName: safeEntry.firstName,
        photoUrl: safeEntry.photoUrl,
        avatarFrame: safeEntry.avatarFrame,
        bet,
        mult: multiplier,
        payout: winAmount
      });
    }
  });
  res.json({
    digits,
    secret,
    matchedPositions,
    matches,
    multiplier,
    winAmount,
    feedToken,
    user: serializeUser(user)
  });
});

// ======================== 4. CLASSIC SLOTS (TELEGRAM 🎰 DICE STYLE: 1x3 / 3x3 / 5x5) ========================
// Exact 4 symbols of Telegram 🎰 animated dice: 777, BAR, Grapes, Lemon
const SLOT_SYMBOLS = [
  { id: 0, key: 'seven', label: '777', weight: 14 },
  { id: 1, key: 'bar', label: 'BAR', weight: 22 },
  { id: 2, key: 'grape', label: 'Виноград', weight: 31 },
  { id: 3, key: 'lemon', label: 'Лимон', weight: 33 }
];
const SLOT_WEIGHT_TOTAL = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);

function pickSlotSymbol() {
  const mode = adminConfig.slotsRtpMode || 'normal';
  const weights = mode === 'tight'
    ? [9, 18, 35, 38]
    : (mode === 'generous' ? [19, 26, 28, 27] : [14, 22, 31, 33]);
  const total = weights[0] + weights[1] + weights[2] + weights[3];
  let r = crypto.randomInt(0, total);
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return 3;
}

// Strictly horizontal & strictly adjacent (no gaps like a===c, no diagonals, no verticals!)
function evalSlotLine3(a, b, c) {
  if (a === b && b === c) {
    if (a === 0) return { mult: 14, reason: '777 Джекпот', matched: [0, 1, 2] };
    if (a === 1) return { mult: 7, reason: 'Три BAR', matched: [0, 1, 2] };
    if (a === 2) return { mult: 4, reason: 'Три Винограда', matched: [0, 1, 2] };
    return { mult: 2.5, reason: 'Три Лимона', matched: [0, 1, 2] };
  }
  // Strictly adjacent pair ONLY (a===b or b===c); gap pair a===c does NOT win!
  if (a === b) return { mult: 0.9, reason: '2 подряд', matched: [0, 1] };
  if (b === c) return { mult: 0.9, reason: '2 подряд', matched: [1, 2] };
  return { mult: 0, reason: '', matched: [] };
}

function evalSlotLine5(line) {
  // Find longest strictly consecutive horizontal run in the 5-symbol row
  let bestLen = 1;
  let bestStart = 0;
  let bestSym = -1;
  let i = 0;
  while (i < 5) {
    let j = i + 1;
    while (j < 5 && line[j] === line[i]) j++;
    const len = j - i;
    if (len > bestLen || (len === bestLen && line[i] < bestSym)) {
      bestLen = len;
      bestStart = i;
      bestSym = line[i];
    }
    i = j;
  }
  if (bestLen >= 3) {
    const base3 = { 0: 9, 1: 4.5, 2: 2.5, 3: 1.8 }[bestSym] || 1.6;
    const scale = bestLen === 5 ? 2.4 : (bestLen === 4 ? 1.45 : 1);
    const m = Number((base3 * scale).toFixed(2));
    return {
      mult: m,
      reason: `${bestLen} подряд`,
      matched: Array.from({ length: bestLen }, (_, k) => bestStart + k)
    };
  }
  if (bestLen === 2) {
    return { mult: 0.4, reason: '2 подряд', matched: [bestStart, bestStart + 1] };
  }
  return { mult: 0, reason: '', matched: [] };
}

app.post('/api/games/slots/spin', authMiddleware, async (req, res) => {
  const mode = ['1x3', '3x3', '5x5'].includes(req.body?.mode) ? req.body.mode : '1x3';
  const minBet = mode === '5x5' ? 100 : (mode === '3x3' ? 50 : 10);
  const bet = Math.floor(Number(req.body?.bet));

  if (!Number.isFinite(bet) || bet < minBet) {
    return res.status(400).json({ error: `Минимальная ставка для режима ${mode} — ${minBet} звёзд` });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < bet) {
    return res.status(400).json({ error: 'Недостаточно звёзд на балансе' });
  }

  user.balance -= bet;
  recordWager(user, 'slots', bet);

  const cols = mode === '5x5' ? 5 : 3;
  const rows = mode === '1x3' ? 1 : (mode === '3x3' ? 3 : 5);
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pickSlotSymbol())
  );

  let totalMult = 0;
  const winningCells = [];
  const winReasons = [];

  if (mode === '1x3') {
    const r = evalSlotLine3(grid[0][0], grid[0][1], grid[0][2]);
    if (r.mult > 0) {
      totalMult = r.mult;
      winReasons.push(r.reason);
      for (const idx of r.matched) winningCells.push([0, idx]);
    }
  } else if (mode === '3x3') {
    // ONLY 3 horizontal rows (no diagonals, no verticals)
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const r = evalSlotLine3(grid[rIdx][0], grid[rIdx][1], grid[rIdx][2]);
      if (r.mult > 0) {
        totalMult += r.mult / 3;
        winReasons.push(r.reason);
        for (const cIdx of r.matched) winningCells.push([rIdx, cIdx]);
      }
    }
  } else {
    // ONLY 5 horizontal rows (no diagonals, no verticals)
    for (let rIdx = 0; rIdx < 5; rIdx++) {
      const r = evalSlotLine5(grid[rIdx]);
      if (r.mult > 0) {
        totalMult += r.mult / 5;
        winReasons.push(r.reason);
        for (const cIdx of r.matched) winningCells.push([rIdx, cIdx]);
      }
    }
  }

  totalMult = Number(totalMult.toFixed(2));
  const winAmount = Math.floor(bet * totalMult);

  // Save ONLY bet deduction — winAmount is credited strictly AFTER all slot drums stop!
  await user.save();

  const slotsUid = user.telegramId;
  const slotsFeedPayload = winAmount > 0 ? {
    firstName: user.firstName || 'Игрок',
    photoUrl: user.photoUrl || '',
    avatarFrame: getActiveAvatarFrame(user),
    bet,
    mult: totalMult,
    payout: winAmount,
    mode
  } : null;

  const feedToken = schedulePendingFeed(slotsUid, 6500, async () => {
    const u = await User.findOne({ telegramId: slotsUid });
    if (u) {
      if (winAmount > 0) {
        u.balance += winAmount;
        recordOutcome(u, 'slots', bet, winAmount, totalMult);
        pushHistory(u, 'win', winAmount - bet, `Слоты ${mode}: x${totalMult}`);
      } else {
        recordOutcome(u, 'slots', bet, 0, 0);
        pushHistory(u, 'bet', -bet, `Слоты ${mode}: ставка ${bet} зв.`);
      }
      await u.save();
      saveDbNow();
      emitUserUpdate(u);
      io.to(`user_${u.telegramId}`).emit('user:sync', serializeUser(u));
    }
    if (slotsFeedPayload) pushLiveFeed('slots', slotsFeedPayload);
  });
  res.json({
    mode,
    rows,
    cols,
    grid,
    winningCells,
    winReasons,
    multiplier: totalMult,
    winAmount,
    feedToken,
    user: serializeUser(user)
  });
});

// ======================== STARTUP ========================
async function boot() {
  loadLocalDb();

  syncLiveTonRate();
  setInterval(syncLiveTonRate, 15 * 60 * 1000);

  startCrashWaiting();
  initAuctionRound();
  startTelegramBotPoller();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZetGifts] Server listening on http://0.0.0.0:${PORT}`);
  });
}

// Always flush pending rewards & db.json cleanly on shutdown/redeploy signals
const gracefulShutdown = async () => {
  botPollingActive = false;
  try { await flushAllPendingSettlements(); } catch {}
  saveDbNow();
  process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('beforeExit', () => { saveDbNow(); });

boot();
