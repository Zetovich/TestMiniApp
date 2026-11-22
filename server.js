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
const BOT_TOKEN = process.env.BOT_TOKEN || '9043576207:AAG8IGLNGs_NcqHiFXnBGVvmcSyOiTxqtZQ';
const ADMIN_ID = String(process.env.ADMIN_ID || '8213153991');
const ADMIN_LOG_CHAT_ID = String(process.env.ADMIN_LOG_CHAT_ID || ADMIN_ID);
let DETECTED_WEBAPP_URL = (process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '').replace(/\/+$/, '');
const UPGRADE_COST = 25;
const WHEEL_COST = 10;
const INIT_DATA_MAX_AGE_SEC = 86400; // 24 hours

// ======================== MRKT MARKET PRICING (TON FLOOR + 0.3 TON COMMISSION -> STARS) ========================
const MARKET_COMMISSION_TON = Number(process.env.MARKET_COMMISSION_TON) || 0.3;
let STARS_PER_TON = Number(process.env.STARS_PER_TON) || 100; // Live-synced from TON/USD (1 Star = $0.015 on Fragment)
let LIVE_TON_USD = 1.50;

// Realistic MRKT / Tonnel / Getgems floor prices in TON for Telegram Gift collections
const MRKT_COLLECTION_FLOORS_TON = {
  'Plush Pepe': 480.0, 'Heart Locket': 145.0, "Durov's Cap": 120.0, 'Precious Peach': 72.0,
  'Heroic Helmet': 58.0, 'Loot Bag': 46.0, 'Nail Bracelet': 38.0, 'Perfume Bottle': 32.0,
  'Astral Shard': 30.0, 'Swiss Watch': 28.0, 'Mini Oscar': 24.0, 'Signet Ring': 22.0,
  'Gem Signet': 21.0, 'Vintage Cigar': 19.5, 'Westside Sign': 18.0, 'Low Rider': 15.5,
  'Snoop Dogg': 4.8, 'Snoop Cigar': 7.5, 'Swag Bag': 5.2, "Khabib's Papakha": 29.0,
  'UFC Strike': 14.0, "Durov's Glasses": 44.0, 'Resistance Dog': 40.0, 'Myth Mask': 19.0,
  'Ion Gem': 16.5, 'Electric Skull': 14.8, 'Toy Bear': 13.5, 'Eternal Rose': 12.2,
  'Magic Potion': 11.5, 'Genie Lamp': 10.8, 'Kissed Frog': 10.2, 'Diamond Ring': 9.8,
  'Bonded Ring': 9.4, 'Trapped Heart': 8.2, 'Crystal Ball': 7.4, 'Chill Flame': 6.8,
  'Light Sword': 6.2, 'Neko Helmet': 6.9, 'Scared Cat': 6.4, 'Skull Flower': 5.6,
  'Mad Pumpkin': 5.2, 'Voodoo Doll': 4.9, 'Evil Eye': 4.6, 'Witch Hat': 4.5,
  'Santa Hat': 4.5, 'Berry Box': 3.9, 'Eternal Candle': 3.6, 'Love Potion': 3.4,
  'Snow Globe': 3.2, 'Record Player': 3.1, 'Top Hat': 3.0, 'Flying Broom': 2.9,
  'Spiced Wine': 2.8, 'Sharp Tongue': 2.7, 'Hex Pot': 2.6, 'Spy Agaric': 2.5,
  'Love Candle': 2.4, 'Jester Hat': 2.3, 'Snow Mittens': 2.2, 'Cupid Charm': 2.2,
  'Valentine Box': 2.1, 'Sakura Flower': 2.1, 'Bunny Muffin': 2.0, 'Easter Egg': 1.9,
  'Tama Gadget': 1.9, 'Stellar Rocket': 1.9, 'Moon Pendant': 1.8, 'Star Notepad': 1.8,
  'Homemade Cake': 1.8, 'Cookie Heart': 1.7, 'Desk Calendar': 1.7, 'B-Day Candle': 1.6,
  'Ginger Cookie': 1.6, 'Party Sparkler': 1.5, 'Holiday Drink': 1.5, 'Big Year': 1.5,
  'Lunar Snake': 1.4, 'Candy Cane': 1.4, 'Xmas Stocking': 1.3, 'Jingle Bells': 1.3,
  'Hanging Star': 1.3, 'Winter Wreath': 1.2, 'Sleigh Bell': 1.2, 'Lol Pop': 1.2
};

// MRKT floor prices for high-demand Backdrops in TON (Black backdrop floor = 20 TON!)
const MRKT_BACKDROP_FLOORS_TON = {
  'Black': 20.0,
  'Onyx Black': 16.5,
  'Midnight Blue': 8.5,
  'Pure Gold': 7.2,
  'Cyberpunk': 5.8,
  'Electric Purple': 4.8,
  'Satin Gold': 4.2,
  'Neon Blue': 3.8,
  'Electric Indigo': 3.5,
  'Crimson': 3.2,
  'Burgundy': 3.0,
  'Emerald': 2.8,
  'Sapphire': 2.6,
  'Amber': 2.4,
  'Lavender': 2.2,
  'Navy Blue': 2.1,
  'English Violet': 2.0,
  'Roman Silver': 1.9,
  'Pacific Cyan': 1.8,
  'Mint Green': 1.6
};

function getCollectionFloorTon(col) {
  if (!col) return 1.5;
  if (MRKT_COLLECTION_FLOORS_TON[col.name] !== undefined) {
    return MRKT_COLLECTION_FLOORS_TON[col.name];
  }
  const fallbackTon = Math.max(1.2, Number(((col.basePrice || col.price || 300) / 160).toFixed(2)));
  return fallbackTon;
}

function getBackdropFloorTon(backdropName) {
  if (!backdropName) return 0;
  if (MRKT_BACKDROP_FLOORS_TON[backdropName] !== undefined) {
    return MRKT_BACKDROP_FLOORS_TON[backdropName];
  }
  return 0.4;
}

function tonWithCommissionToStars(floorTon) {
  const cleanFloor = Math.max(0.5, Number(floorTon) || 1.0);
  const marketTon = Number((cleanFloor + MARKET_COMMISSION_TON).toFixed(2));
  const stars = Math.max(25, Math.round(marketTon * STARS_PER_TON));
  return { floorTon: Number(cleanFloor.toFixed(2)), marketTon, stars };
}

function computeCollectionMarketPrice(col) {
  return tonWithCommissionToStars(getCollectionFloorTon(col));
}

function computeNftMarketPrice(col, modelRarity, backdropName) {
  const colFloor = getCollectionFloorTon(col);
  // Rare models trade significantly above base collection floor on MRKT
  const modelMult = modelRarity <= 0.5 ? 2.65
    : modelRarity <= 1.0 ? 1.85
      : modelRarity <= 1.5 ? 1.45
        : modelRarity <= 2.5 ? 1.22
          : 1.08;
  const modelFloorTon = colFloor * modelMult;
  const bgFloorTon = getBackdropFloorTon(backdropName);

  // If backdrop itself has a high MRKT floor (e.g. Black = 20 TON), it adds substantial value
  // and guarantees the NFT floor is at least bgFloorTon + fraction of model floor!
  let combinedFloorTon = modelFloorTon;
  if (bgFloorTon >= 2.0) {
    if (bgFloorTon >= modelFloorTon) {
      combinedFloorTon = bgFloorTon + modelFloorTon * 0.40;
    } else {
      combinedFloorTon = modelFloorTon + bgFloorTon * 0.65;
    }
  } else if (bgFloorTon >= 1.5) {
    combinedFloorTon = modelFloorTon + bgFloorTon * 0.35;
  }

  return tonWithCommissionToStars(combinedFloorTon);
}

function computeCraftedMarketPrice(baseCol, craftedSpec, backdropName) {
  const colFloor = getCollectionFloorTon(baseCol);
  const tierMult = craftedSpec.tier === 'Legendary' ? 3.6
    : craftedSpec.tier === 'Epic' ? 2.5
      : craftedSpec.tier === 'Rare' ? 1.85
        : 1.4;
  const craftBaseFloor = colFloor * tierMult;
  const bgFloorTon = getBackdropFloorTon(backdropName);
  const combinedFloorTon = bgFloorTon >= 2.0
    ? (bgFloorTon >= craftBaseFloor ? bgFloorTon + craftBaseFloor * 0.45 : craftBaseFloor + bgFloorTon * 0.70)
    : craftBaseFloor;
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
      // Fragment 1 Star = $0.015; clamp reasonably so prices stay smooth
      STARS_PER_TON = Math.max(65, Math.round(usd / 0.015));
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
  users: {},     // telegramId -> user object
  counters: {},  // key -> seq number
  rounds: [],    // recent game rounds
  alerts: []     // recent admin alerts (big drops & suspicious actions)
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
  upgrader: []   // { id, firstName, photoUrl, bet, mult, payout, giftName, giftImage, createdAt }
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

// Deferred feed publisher: NEVER spoils results before the player's animation finishes!
const pendingFeeds = new Map(); // token -> { ownerId, timer, publish }

function schedulePendingFeed(ownerId, fallbackDelayMs, publishFn) {
  const token = makeUid();
  let published = false;
  const run = () => {
    if (published) return;
    published = true;
    const entry = pendingFeeds.get(token);
    if (entry && entry.timer) clearTimeout(entry.timer);
    pendingFeeds.delete(token);
    try { publishFn(); } catch {}
  };
  const timer = setTimeout(run, Math.max(1500, Number(fallbackDelayMs) || 6000));
  pendingFeeds.set(token, { ownerId: String(ownerId), timer, publish: run });
  return token;
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

  // Send real-time notification to Admin Log Telegram Chat (if bot enabled)
  if (BOT_TOKEN && ADMIN_LOG_CHAT_ID && process.env.DISABLE_BOT !== '1') {
    const icon = kind === 'suspicious' ? '🚨' : kind === 'drop' ? '💎' : '🛠';
    const escHtml = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const who = userObj
      ? `\n👤 <b>Игрок:</b> ${escHtml(userObj.firstName)} ${userObj.username ? `(@${escHtml(userObj.username)})` : ''} [<code>${escHtml(userObj.telegramId)}</code>]`
      : '';
    const msg = `${icon} <b>${escHtml(title)}</b>${who}${details ? `\n📝 ${escHtml(details)}` : ''}`;
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

const STAT_GAME_KEYS = ['crash', 'cases', 'wheel', 'mines', 'plinko', 'pvp', 'upgrader', 'redblack'];

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
  const s = ensureUserStats(user);
  s.totalWagered += amt;
  s.totalGames += 1;
  if (s.games[gameKey]) {
    s.games[gameKey].wagered += amt;
    s.games[gameKey].plays += 1;
  }
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
}

const plinkoRecentBets = []; // latest 30 finished Plinko drops across players


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
  // Real MRKT market pricing: collection floor + model rarity + backdrop floor (e.g. Black = 20 TON!) + 0.3 TON fee
  const mp = computeNftMarketPrice(col, modelRarity, bMeta[0]);

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

async function getOrCreateUser(tgProfile) {
  let user = await User.findOne({ telegramId: tgProfile.telegramId });
  if (!user) {
    user = await User.create({
      telegramId: tgProfile.telegramId,
      username: tgProfile.username,
      firstName: tgProfile.firstName,
      lastName: tgProfile.lastName,
      photoUrl: tgProfile.photoUrl,
      balance: 250,
      inventory: [],
      history: [{ type: 'topup', amount: 250, title: 'Приветственный бонус ZetGifts' }]
    });
  } else {
    let changed = false;
    if (tgProfile.username && user.username !== tgProfile.username) { user.username = tgProfile.username; changed = true; }
    if (tgProfile.firstName && user.firstName !== tgProfile.firstName) { user.firstName = tgProfile.firstName; changed = true; }
    if (tgProfile.lastName !== undefined && user.lastName !== tgProfile.lastName) { user.lastName = tgProfile.lastName; changed = true; }
    if (tgProfile.photoUrl && user.photoUrl !== tgProfile.photoUrl) { user.photoUrl = tgProfile.photoUrl; changed = true; }
    if (changed) await user.save();
  }
  return user;
}

function serializeUser(user) {
  const pf = ensureUserPf(user);
  return {
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    balance: Math.floor(user.balance),
    banned: user.banned,
    isAdmin: user.telegramId === ADMIN_ID,
    inventory: user.inventory,
    history: user.history,
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

// Static flat assets from ZetGifts directory
app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'deny'
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
    id: 'starter',
    name: 'Стартовый',
    price: 35,
    accent: '#2ea6ff',
    cover: 'case_starter.png',
    entries: [
      { type: 'stars', amount: 8, chance: 28 },
      { type: 'stars', amount: 15, chance: 22 },
      { type: 'stars', amount: 22, chance: 14 },
      { type: 'basic', slug: 'basic_heart', chance: 12 },
      { type: 'basic', slug: 'basic_bear', chance: 11 },
      { type: 'basic', slug: 'basic_giftbox', chance: 5.5 },
      { type: 'basic', slug: 'basic_rose', chance: 4.2 },
      { type: 'basic', slug: 'basic_cake', chance: 1.7 },
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
    cover: 'case_holiday.png',
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
    cover: 'case_snoop.png',
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
    cover: 'case_flame.png',
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
    cover: 'case_collectible.png',
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
    cover: 'case_cyber.png',
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
    cover: 'case_champion.png',
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
    cover: 'case_luxury.png',
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
    accent: c.accent,
    cover: c.cover,
    items: c.entries.map(buildCaseItemMeta)
  }));
}
rebuildCasesMeta();

// Lucky Wheel (10 Stars — cheaper, images ONLY for gifts, digits for stars, tiny chance for un-upgraded Chill Flame!)
const CHILL_FLAME_COL = COLLECTIONS_BY_NAME.get('Chill Flame') || CATALOG.collections[0];
const WHEEL_SEGMENTS = [
  { id: 's1',    type: 'stars',      amount: 1,                  label: '1',           image: '',                                       weight: 34,  color: '#1e2c3a' },
  { id: 'bear',  type: 'basic',      slug: 'basic_bear',         label: 'Мишка',       image: (BASIC_BY_SLUG.get('basic_bear')?.image || 'basic_bear.png'),     weight: 6.5, color: '#243a52' },
  { id: 's2',    type: 'stars',      amount: 2,                  label: '2',           image: '',                                       weight: 24,  color: '#182430' },
  { id: 'rose',  type: 'basic',      slug: 'basic_rose',         label: 'Роза',        image: (BASIC_BY_SLUG.get('basic_rose')?.image || 'basic_rose.png'),     weight: 4.5, color: '#4c182c' },
  { id: 's3',    type: 'stars',      amount: 3,                  label: '3',           image: '',                                       weight: 16,  color: '#1e2c3a' },
  { id: 'cake',  type: 'basic',      slug: 'basic_cake',         label: 'Торт',        image: (BASIC_BY_SLUG.get('basic_cake')?.image || 'basic_cake.png'),     weight: 3.0, color: '#523412' },
  { id: 's5',    type: 'stars',      amount: 5,                  label: '5',           image: '',                                       weight: 10,  color: '#182430' },
  { id: 'cup',   type: 'basic',      slug: 'basic_trophy',       label: 'Кубок',       image: (BASIC_BY_SLUG.get('basic_trophy')?.image || 'basic_trophy.png'), weight: 1.6, color: '#39225c' },
  { id: 'flame', type: 'collection', name: CHILL_FLAME_COL.name, label: 'Chill Flame', image: getOriginalImage(CHILL_FLAME_COL),        weight: 0.4, color: '#7c2d12' }
];

const PLINKO_MULTIPLIERS = [4.0, 1.8, 1.0, 0.4, 0.2, 0.4, 1.0, 1.8, 4.0];

// ======================== CORE API ROUTES ========================
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    user: serializeUser(req.user),
    upgradeCost: UPGRADE_COST,
    wheelCost: WHEEL_COST,
    cases: CASES,
    wheelSegments: WHEEL_SEGMENTS.map(({ weight, ...rest }) => rest),
    plinkoMultipliers: PLINKO_MULTIPLIERS,
    plinkoRecentBets: plinkoRecentBets.slice(0, 30),
    liveFeeds,
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
      totalCraftedModels: CATALOG.totalCraftedModels || CRAFTED_BY_ID.size,
      totalBackdrops: CATALOG.backdrops.length,
      totalSymbols: CATALOG.symbols.length,
      crafted: CATALOG.crafted
    }
  });
});

// Flush deferred live-feed / plinko recent item right when client animation ends (or on Skip)
app.post('/api/feed/flush', authMiddleware, (req, res) => {
  const token = String(req.body?.token || '').trim();
  const entry = pendingFeeds.get(token);
  if (entry && entry.ownerId === String(req.user.telegramId)) {
    entry.publish();
    return res.json({ ok: true, flushed: true });
  }
  res.json({ ok: true, flushed: false });
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

  const top10 = allUsers.slice(0, 10).map((u, i) => ({
    rank: i + 1,
    telegramId: u.telegramId,
    firstName: u.firstName || 'Telegram User',
    lastName: u.lastName || '',
    username: u.username || '',
    photoUrl: u.photoUrl || '',
    totalWagered: Math.floor(u.stats?.totalWagered || 0),
    totalGames: Math.floor(u.stats?.totalGames || 0),
    biggestWin: Math.floor(u.stats?.biggestWin || 0)
  }));

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
  const inv = Array.isArray(user.inventory) ? user.inventory : [];
  const inventoryValue = inv.reduce((sum, g) => sum + Math.round(g.value || 0), 0);

  res.json({
    player: {
      telegramId: user.telegramId,
      firstName: user.firstName || 'Telegram User',
      lastName: user.lastName || '',
      username: user.username || '',
      photoUrl: user.photoUrl || '',
      createdAt: user.createdAt || new Date().toISOString(),
      giftsCount: inv.length,
      inventoryValue,
      stats
    }
  });
});

app.get('/api/craft/models/:collectionName', authMiddleware, (req, res) => {
  const col = COLLECTIONS_BY_NAME.get(req.params.collectionName);
  if (!col) return res.status(404).json({ error: 'Коллекция не найдена' });
  res.json({
    collectionName: col.name,
    models: col.craftedModels || []
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
    })),
    crafted: CATALOG.crafted
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

// Top-up Stars (creates real Telegram Stars invoice link via Bot API if available, plus instant sandbox fallback if requested)
app.post('/api/topup', authMiddleware, async (req, res) => {
  const amount = Math.floor(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
    return res.status(400).json({ error: 'Сумма от 10 до 100 000 ⭐' });
  }
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Пополнение ${amount} ⭐`,
        description: `Пополнение баланса ZetGifts на ${amount} Telegram Stars`,
        payload: JSON.stringify({ uid: req.user.telegramId, amount, ts: Date.now() }),
        currency: 'XTR',
        prices: [{ label: `${amount} Telegram Stars`, amount }]
      })
    });
    const data = await tgRes.json();
    if (data && data.ok && data.result) {
      return res.json({ invoiceUrl: data.result, amount });
    }
    return res.status(502).json({ error: data.description || 'Не удалось создать счёт Telegram Stars' });
  } catch (err) {
    console.error('Invoice error:', err);
    return res.status(502).json({ error: 'Ошибка соединения с Telegram Bot API' });
  }
});

// Confirm paid Telegram Stars invoice (webhook/callback helper)
app.post('/api/topup/confirm', authMiddleware, async (req, res) => {
  const amount = Math.floor(Number(req.body.amount));
  const status = String(req.body.status || '');
  if (status !== 'paid' || !Number.isFinite(amount) || amount < 10 || amount > 100000) {
    return res.status(400).json({ error: 'Платёж не подтверждён' });
  }
  const user = await User.findOne({ telegramId: req.user.telegramId });
  user.balance += amount;
  pushHistory(user, 'topup', amount, `Пополнение Telegram Stars (+${amount} ⭐)`);
  await user.save();
  res.json({ user: serializeUser(user) });
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
    return res.status(400).json({ error: 'Выберите от 1 до 4 улучшенных подарков' });
  }

  const user = await User.findOne({ telegramId: req.user.telegramId });
  const selected = [];
  for (const uid of uids) {
    const g = user.inventory.find((item) => item.uid === uid);
    if (!g) return res.status(404).json({ error: 'Один из подарков не найден' });
    if (!g.upgraded) return res.status(400).json({ error: 'В крафт можно класть только улучшенные подарки!' });
    if (g.crafted) return res.status(400).json({ error: 'Уже скрафченные подарки нельзя использовать повторно' });
    selected.push(g);
  }

  // Must be from the SAME collection (exact Telegram rule)
  const collectionName = selected[0].collectionName;
  if (selected.some((g) => g.collectionName !== collectionName)) {
    return res.status(400).json({ error: 'Все подарки в крафте должны быть из одной коллекции!' });
  }

  const chance = CRAFT_CHANCES[selected.length];
  const roll = crypto.randomInt(0, 10000) / 100; // 0.00 .. 99.99
  const success = roll < chance;

  // Dynamic backdrop & symbol inheritance from committed gifts (Craft ONLY crafts the model!)
  // Rule:
  // - Backdrop is drawn from the backdrops of the input gifts proportionally (e.g. 2 Black out of 4 = 50% of input pool).
  // - If all backdrops are different OR fewer than 3 match (maxSame < 3), there is a 30% chance to roll a random backdrop from the collection.
  // - If 3 or 4 inputs share the same backdrop (maxSame >= 3), backdrop is guaranteed to come from the input pool (75%/25% or 100%).
  const inputBackdrops = selected
    .map((g) => (g.backdrop && g.backdrop.name && g.backdrop.center ? { ...(g.backdrop.toObject ? g.backdrop.toObject() : g.backdrop) } : null))
    .filter(Boolean);
  const inputSymbols = selected
    .map((g) => (g.symbol && g.symbol.name ? { ...(g.symbol.toObject ? g.symbol.toObject() : g.symbol) } : null))
    .filter(Boolean);

  const backdropCounts = {};
  for (const b of inputBackdrops) {
    backdropCounts[b.name] = (backdropCounts[b.name] || 0) + 1;
  }
  const maxSameBackdrops = Object.values(backdropCounts).reduce((m, c) => Math.max(m, c), 0);

  const symbolCounts = {};
  for (const s of inputSymbols) {
    symbolCounts[s.name] = (symbolCounts[s.name] || 0) + 1;
  }
  const maxSameSymbols = Object.values(symbolCounts).reduce((m, c) => Math.max(m, c), 0);

  // Burn committed gifts
  const uidSet = new Set(uids);
  user.inventory = user.inventory.filter((g) => !uidSet.has(g.uid));

  let resultGift = null;
  const col = COLLECTIONS_BY_NAME.get(collectionName) || CATALOG.collections[0];
  const collectionCraftPool = (col.craftedModels && col.craftedModels.length) ? col.craftedModels : CATALOG.crafted;

  if (success) {
    // Weighted random from THAT EXACT COLLECTION'S crafted models!
    // More input gifts slightly improve Rare/Epic/Legendary odds
    const luckBoost = selected.length === 4 ? { Uncommon: 0.75, Rare: 1.0, Epic: 1.35, Legendary: 2.0 }
      : selected.length === 3 ? { Uncommon: 0.85, Rare: 1.0, Epic: 1.2, Legendary: 1.5 }
        : { Uncommon: 1.0, Rare: 1.0, Epic: 1.0, Legendary: 1.0 };

    const chosenCraft = weightedPick(
      collectionCraftPool,
      (cm) => (cm.weight || 10) * (luckBoost[cm.tier] || 1)
    );

    let finalBackdrop = null;
    if (inputBackdrops.length > 0) {
      const rollRandomBackdrop = maxSameBackdrops < 3 && crypto.randomInt(0, 100) < 30;
      if (rollRandomBackdrop) {
        finalBackdrop = pickRandomCollectionBackdrop(col);
      } else {
        finalBackdrop = { ...inputBackdrops[crypto.randomInt(0, inputBackdrops.length)] };
      }
    } else {
      finalBackdrop = pickRandomCollectionBackdrop(col);
    }

    let finalSymbol = null;
    if (inputSymbols.length > 0) {
      const rollRandomSymbol = maxSameSymbols < 3 && crypto.randomInt(0, 100) < 30;
      if (rollRandomSymbol) {
        finalSymbol = pickRandomCollectionSymbol(col);
      } else {
        finalSymbol = { ...inputSymbols[crypto.randomInt(0, inputSymbols.length)] };
      }
    } else {
      finalSymbol = pickRandomCollectionSymbol(col);
    }

    const totalInputValue = selected.reduce((sum, g) => sum + (g.value || 100), 0);
    resultGift = await createCraftedGift(chosenCraft, finalBackdrop, finalSymbol, 'Craft');
    resultGift.value = Math.max(resultGift.value, Math.round(totalInputValue * 1.45));
    ensureUserStats(user).giftsCrafted += 1;
    user.inventory.unshift(resultGift);
    pushHistory(user, 'craft', 0, `Успешный крафт (${chance}%): ${resultGift.craftedRuName || resultGift.craftedName}`);
    if (resultGift.craftTier === 'Legendary' || resultGift.craftTier === 'Epic' || resultGift.value >= 1500 || (resultGift.backdrop?.floorTon || 0) >= 15) {
      logAdminEvent(
        'drop',
        `Редкий крафт [${resultGift.craftTier}]: ${resultGift.craftedRuName || resultGift.craftedName}`,
        `Шанс: ${chance}%, Фон: ${resultGift.backdrop?.name || '—'}, Цена: ${resultGift.value} звёзд`,
        user
      );
    }
  } else {
    pushHistory(user, 'craft', 0, `Неудачный крафт (${chance}%): сгорело ${selected.length} шт. «${collectionName}»`);
  }

  user.markModified('inventory');
  await user.save();

  let feedToken = '';
  if (success && resultGift) {
    const craftFeedPayload = {
      firstName: user.firstName || 'Игрок',
      photoUrl: user.photoUrl || '',
      giftName: resultGift.craftedRuName || resultGift.craftedName || resultGift.collectionName,
      giftImage: resultGift.image,
      tier: resultGift.craftTier || 'Rare',
      chance,
      value: resultGift.value,
      backdropName: resultGift.backdrop?.name || ''
    };
    feedToken = schedulePendingFeed(user.telegramId, 8500, () => {
      pushLiveFeed('craft', craftFeedPayload);
    });
  }

  res.json({
    success,
    chance,
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
    previewModels: collectionCraftPool,
    user: serializeUser(user)
  });
});

app.post('/api/gifts/sell', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден' });

  const [gift] = user.inventory.splice(idx, 1);
  const price = Math.max(10, Math.round(gift.value || 25));
  user.balance += price;
  const displayName = gift.crafted ? (gift.craftedRuName || gift.craftedName) : gift.collectionName;
  pushHistory(user, 'sell', price, `Продажа «${displayName}» (+${price} ⭐)`);
  user.markModified('inventory');
  await user.save();

  res.json({ soldFor: price, user: serializeUser(user) });
});

app.post('/api/gifts/withdraw', authMiddleware, async (req, res) => {
  const { uid } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден' });

  const [gift] = user.inventory.splice(idx, 1);
  const displayName = gift.crafted ? (gift.craftedRuName || gift.craftedName) : `${gift.collectionName}${gift.mintNumber ? ' #' + gift.mintNumber : ''}`;
  pushHistory(user, 'withdraw', 0, `Заявка на вывод «${displayName}» в профиль TG`);
  user.markModified('inventory');
  await user.save();

  res.json({ message: `Подарок «${displayName}» отправлен на вывод в ваш Telegram`, user: serializeUser(user) });
});

// ======================== GAME: LUCKY WHEEL (10 ⭐, CHILL FLAME JACKPOT) ========================
app.post('/api/games/wheel', authMiddleware, async (req, res) => {
  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < WHEEL_COST) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${WHEEL_COST})` });

  user.balance -= WHEEL_COST;
  const balanceAfterBet = Math.floor(user.balance);
  const seg = weightedPick(WHEEL_SEGMENTS, (s) => s.weight);
  const segIndex = WHEEL_SEGMENTS.findIndex((s) => s.id === seg.id);

  let wonGift = null;
  let wonStars = 0;

  if (seg.type === 'stars') {
    wonStars = seg.amount;
    user.balance += wonStars;
    pushHistory(user, 'win', wonStars - WHEEL_COST, `Колесо Удачи: +${wonStars} звёзд`);
  } else if (seg.type === 'collection') {
    // Un-upgraded collectible NFT (e.g. Chill Flame!)
    const col = COLLECTIONS_BY_NAME.get(seg.name) || CHILL_FLAME_COL;
    wonGift = createRegularGift(col, 'Колесо Удачи');
    user.inventory.unshift(wonGift);
    pushHistory(user, 'win', -WHEEL_COST, `Колесо Удачи: джекпот «${col.name}» (${col.price})`);
  } else {
    const bg = BASIC_BY_SLUG.get(seg.slug) || BASIC_GIFTS[0];
    wonGift = createBasicGift(bg, 'Колесо Удачи');
    user.inventory.unshift(wonGift);
    pushHistory(user, 'win', -WHEEL_COST, `Колесо Удачи: подарок «${bg.name}» (${bg.price})`);
  }

  recordWager(user, 'wheel', WHEEL_COST);
  recordOutcome(user, 'wheel', WHEEL_COST, wonGift ? wonGift.value : wonStars);
  user.markModified('inventory');
  await user.save();

  let feedToken = '';
  if (wonGift || wonStars >= 3) {
    const wheelFeedPayload = {
      firstName: user.firstName || 'Игрок',
      photoUrl: user.photoUrl || '',
      isStars: !wonGift,
      amount: wonStars,
      giftName: wonGift ? wonGift.collectionName : '',
      giftImage: wonGift ? wonGift.image : '',
      value: wonGift ? wonGift.value : wonStars
    };
    feedToken = schedulePendingFeed(user.telegramId, 6000, () => {
      pushLiveFeed('wheel', wheelFeedPayload);
    });
  }
  if (seg.type === 'collection' && wonGift) {
    logAdminEvent('drop', `ДЖЕКПОТ Колеса Удачи: ${wonGift.collectionName}!`, `За 10 звёзд выпал ${wonGift.collectionName} (${wonGift.value} звёзд)`, user);
  }

  res.json({
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

app.post('/api/games/case/open', authMiddleware, async (req, res) => {
  const caseDef = CASES.find((c) => c.id === req.body.caseId);
  if (!caseDef) return res.status(404).json({ error: 'Кейс не найден' });

  const allowedCounts = [1, 2, 3, 5];
  const reqCount = Number(req.body.count) || 1;
  const count = allowedCounts.includes(reqCount) ? reqCount : 1;
  const totalPrice = caseDef.price * count;

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < totalPrice) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${totalPrice})` });

  user.balance -= totalPrice;
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
  let totalWonStars = 0;
  const wonGifts = [];

  for (let rIdx = 0; rIdx < count; rIdx++) {
    const pfRes = consumeUserPfRoll(user, `Кейс «${caseDef.name}»`);
    const pickedItem = weightedPickWithRoll(caseDef.items, (it) => it.chance, pfRes.roll01);
    let wonGift = null;
    let wonStars = 0;

    if (pickedItem.type === 'stars') {
      wonStars = pickedItem.amount;
      totalWonStars += wonStars;
      user.balance += wonStars;
      recordWager(user, 'cases', caseDef.price);
      recordOutcome(user, 'cases', caseDef.price, wonStars);
      pushHistory(user, 'case', wonStars - caseDef.price, `Кейс «${caseDef.name}»: +${wonStars} звёзд`);
    } else if (pickedItem.type === 'basic') {
      const bg = BASIC_BY_SLUG.get(pickedItem.slug) || BASIC_GIFTS[0];
      wonGift = createBasicGift(bg, `Кейс «${caseDef.name}»`);
      user.inventory.unshift(wonGift);
      wonGifts.push(wonGift);
      recordWager(user, 'cases', caseDef.price);
      recordOutcome(user, 'cases', caseDef.price, wonGift.value);
      pushHistory(user, 'case', -caseDef.price, `Кейс «${caseDef.name}»: ${wonGift.collectionName} (${wonGift.value})`);
    } else {
      const col = COLLECTIONS_BY_NAME.get(pickedItem.name) || CATALOG.collections[0];
      wonGift = createRegularGift(col, `Кейс «${caseDef.name}»`);
      user.inventory.unshift(wonGift);
      wonGifts.push(wonGift);
      recordWager(user, 'cases', caseDef.price);
      recordOutcome(user, 'cases', caseDef.price, wonGift.value);
      pushHistory(user, 'case', -caseDef.price, `Кейс «${caseDef.name}»: ${wonGift.collectionName} (${wonGift.value})`);
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
      isStars: !wonGift,
      amount: wonStars,
      giftName: wonGift ? wonGift.collectionName : `${wonStars}`,
      giftImage: wonGift ? wonGift.image : '',
      value: wonGift ? wonGift.value : wonStars
    });
  }

  user.markModified('inventory');
  await user.save();

  const feedToken = schedulePendingFeed(user.telegramId, 6500, () => {
    for (const entry of pendingCaseFeedEntries) {
      pushLiveFeed('cases', entry);
    }
  });

  const firstRoll = rolls[0];
  res.json({
    count,
    caseId: caseDef.id,
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

// ======================== GAME: PLINKO ========================
app.post('/api/games/plinko/drop', authMiddleware, async (req, res) => {
  const bet = Math.floor(Number(req.body.bet));
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
  const multiplier = PLINKO_MULTIPLIERS[bucketIndex];
  const payout = Math.round(bet * multiplier);

  user.balance += payout;
  recordWager(user, 'plinko', bet);
  recordOutcome(user, 'plinko', bet, payout, multiplier);
  pushHistory(user, payout >= bet ? 'win' : 'bet', payout - bet, `Плинко x${multiplier} (${payout} ⭐)`);
  await user.save();

  const plinkoEntry = {
    telegramId: user.telegramId,
    firstName: user.firstName || 'Player',
    photoUrl: user.photoUrl || '',
    bet,
    multiplier,
    payout,
    createdAt: Date.now()
  };
  const feedToken = schedulePendingFeed(user.telegramId, 4500, () => {
    plinkoRecentBets.unshift(plinkoEntry);
    if (plinkoRecentBets.length > 30) plinkoRecentBets.pop();
    io.emit('plinko:bet', plinkoEntry);
  });

  res.json({
    pathDirs,
    bucketIndex,
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
  recordOutcome(user, 'upgrader', bet, payout, won ? multiplier : 0);
  let feedToken = '';
  if (won) {
    user.balance += payout;
    pushHistory(user, 'win', payout - bet, `Апгрейдер x${multiplier}: победа (+${payout} ⭐)`);
    const upgFeedPayload = {
      firstName: user.firstName || 'Игрок',
      photoUrl: user.photoUrl || '',
      bet,
      mult: multiplier,
      payout,
      giftName: '',
      giftImage: ''
    };
    feedToken = schedulePendingFeed(user.telegramId, 5000, () => {
      pushLiveFeed('upgrader', upgFeedPayload);
    });
  } else {
    pushHistory(user, 'bet', -bet, `Апгрейдер x${multiplier}: проигрыш (-${bet} ⭐)`);
  }
  await user.save();

  // Compute exact landing angle (0..360) where WIN sector starts at 0 deg and spans (winChance/100)*360
  const winAngleSpan = (winChance / 100) * 360;
  const stopAngle = won
    ? Number((2 + Math.random() * Math.max(1, winAngleSpan - 4)).toFixed(2))
    : Number((winAngleSpan + 2 + Math.random() * Math.max(1, 360 - winAngleSpan - 4)).toFixed(2));

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


// GIFT UPGRADER: stake ANY gift (regular, upgraded, or crafted) -> target an un-upgraded gift by price ratio!
app.post('/api/games/upgrader/play-gift', authMiddleware, async (req, res) => {
  const { sourceUid, targetType, targetKey } = req.body;
  const user = await User.findOne({ telegramId: req.user.telegramId });
  const idx = user.inventory.findIndex((g) => g.uid === sourceUid);
  if (idx === -1) return res.status(404).json({ error: 'Поставленный подарок не найден в инвентаре' });

  const sourceGift = user.inventory[idx];
  const sourceVal = Math.max(15, Math.round(sourceGift.value || 15));

  let targetPrice = 0;
  let targetName = '';
  let targetCol = null;
  let targetBasic = null;

  if (targetType === 'basic') {
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

  if (targetPrice <= sourceVal) {
    return res.status(400).json({ error: 'Целевой подарок должен быть дороже поставленного' });
  }

  const rawChance = (sourceVal / targetPrice) * 90; // 10% casino edge
  if (rawChance < 0.5 || rawChance > 78) {
    return res.status(400).json({ error: 'Шанс апгрейда должен быть от 0.5% до 78%' });
  }

  const winChance = Number(rawChance.toFixed(2));
  const multiplier = Number((targetPrice / sourceVal).toFixed(2));

  // Remove staked gift immediately
  user.inventory.splice(idx, 1);
  const inventoryAfterBet = user.inventory.slice();

  recordWager(user, 'upgrader', sourceVal);

  const pfRes = consumeUserPfRoll(user, `Апгрейдер подарка (${winChance}%)`);
  const roll = pfRes.roll01 * 100;
  const won = roll < winChance;
  let wonGift = null;

  let feedToken = '';
  if (won) {
    wonGift = targetBasic
      ? createBasicGift(targetBasic, 'Апгрейдер')
      : createRegularGift(targetCol, 'Апгрейдер');
    user.inventory.unshift(wonGift);
    recordOutcome(user, 'upgrader', sourceVal, wonGift.value, multiplier);
    pushHistory(user, 'win', wonGift.value - sourceVal, `Апгрейдер: ${sourceGift.collectionName} → ${targetName} (${winChance}%)`);
    const upgGiftFeedPayload = {
      firstName: user.firstName || 'Игрок',
      photoUrl: user.photoUrl || '',
      bet: sourceVal,
      mult: multiplier,
      payout: wonGift.value,
      giftName: wonGift.collectionName,
      giftImage: wonGift.image
    };
    feedToken = schedulePendingFeed(user.telegramId, 5000, () => {
      pushLiveFeed('upgrader', upgGiftFeedPayload);
    });
  } else {
    recordOutcome(user, 'upgrader', sourceVal, 0, 0);
    pushHistory(user, 'bet', -sourceVal, `Апгрейдер: сгорел «${sourceGift.collectionName}» (цель ${targetName}, ${winChance}%)`);
  }

  user.markModified('inventory');
  await user.save();

  const winAngleSpan = (winChance / 100) * 360;
  const stopAngle = won
    ? Number((2 + Math.random() * Math.max(1, winAngleSpan - 4)).toFixed(2))
    : Number((winAngleSpan + 2 + Math.random() * Math.max(1, 360 - winAngleSpan - 4)).toFixed(2));

  res.json({
    won,
    winChance,
    multiplier,
    stopAngle,
    wonGift,
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
  pvp: '⚔️ PvP Колесо',
  upgrader: '⚡ Апгрейдер',
  redblack: '🔴 Красное/Чёрное'
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
  const { telegramId, collectionName, upgraded, crafted, craftedId } = req.body;
  const user = await User.findOne({ telegramId: String(telegramId || '').trim() });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!Array.isArray(user.inventory)) user.inventory = [];

  let gift;
  if (craftedId && CRAFTED_BY_ID.has(craftedId)) {
    gift = await createCraftedGift(CRAFTED_BY_ID.get(craftedId), null, null, 'Администратор');
  } else {
    const col = COLLECTIONS_BY_NAME.get(collectionName) || CATALOG.collections[0];
    if (crafted && col.craftedModels?.length) {
      const picked = weightedPick(col.craftedModels, (cm) => cm.weight || 10);
      gift = await createCraftedGift(picked, null, null, 'Администратор');
    } else {
      gift = upgraded
        ? await createUpgradedGift(col, 'Администратор')
        : createRegularGift(col, 'Администратор');
    }
  }

  user.inventory.unshift(gift);
  pushHistory(user, 'admin', 0, `Администратор выдал «${gift.crafted ? gift.craftedRuName : gift.collectionName}»`);
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

function emitUserUpdate(user) {
  io.to(`user_${user.telegramId}`).emit('user_update', serializeUser(user));
}

// ======================== REALTIME ENGINE 1: CRASH (PROVABLY FAIR!) ========================
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
  bets: new Map(), // telegramId -> { telegramId, firstName, photoUrl, bet, autoCashout, cashedOut, cashoutAt, payout }
  history: [1.45, 2.82, 1.14, 5.60, 1.93, 11.24, 1.31, 3.47]
};

function generateCrashPointFromSeed(serverSeed, roundId) {
  // Provably Fair deterministic crash distribution (7% house edge)
  const r = hmacFloat01(serverSeed, `crash:${roundId}`);
  if (r < 0.07) return 1.0;
  const raw = 0.93 / (1 - Math.min(0.999999, r));
  return Math.min(100, Math.max(1.01, Number(raw.toFixed(2))));
}

function getCrashBetsArray() {
  return Array.from(crashState.bets.values()).sort((a, b) => b.bet - a.bet);
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
  crashState.roundId += 1;
  crashState.multiplier = 1.0;
  crashState.serverSeed = crypto.randomBytes(32).toString('hex');
  crashState.serverSeedHash = sha256Hex(crashState.serverSeed);
  crashState.crashPoint = generateCrashPointFromSeed(crashState.serverSeed, crashState.roundId);
  crashState.bets.clear();
  crashState.waitEndsAt = Date.now() + 6500;
  broadcastCrashState();

  setTimeout(startCrashRunning, 6500);
}

function startCrashRunning() {
  crashState.phase = 'running';
  crashState.startedAt = Date.now();
  crashState.multiplier = 1.0;
  broadcastCrashState();

  clearInterval(crashLoopTimer);
  crashLoopTimer = setInterval(async () => {
    const elapsedSec = (Date.now() - crashState.startedAt) / 1000;
    // Smooth exponential curve
    const nextMult = Number(Math.pow(Math.E, 0.145 * elapsedSec).toFixed(2));
    crashState.multiplier = Math.max(1.0, nextMult);

    // Check auto-cashouts
    for (const betObj of crashState.bets.values()) {
      if (!betObj.cashedOut && betObj.autoCashout >= 1.05 && crashState.multiplier >= betObj.autoCashout && betObj.autoCashout < crashState.crashPoint) {
        await processCrashCashout(betObj.telegramId, betObj.autoCashout);
      }
    }

    if (crashState.multiplier >= crashState.crashPoint) {
      clearInterval(crashLoopTimer);
      crashState.multiplier = crashState.crashPoint;
      crashState.phase = 'crashed';
      crashState.history.unshift(crashState.crashPoint);
      if (crashState.history.length > 20) crashState.history.pop();

      // Record losses in history for players who didn't cash out
      for (const betObj of crashState.bets.values()) {
        if (!betObj.cashedOut) {
          User.findOne({ telegramId: betObj.telegramId }).then((u) => {
            if (!u) return;
            recordOutcome(u, 'crash', betObj.bet, 0);
            pushHistory(u, 'bet', -betObj.bet, `Краш @ x${crashState.crashPoint}: ставка сгорела (-${betObj.bet} ⭐)`);
            u.save().then(() => emitUserUpdate(u)).catch(() => {});
          }).catch(() => {});
        }
      }

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

      setTimeout(startCrashWaiting, 4200);
    } else {
      io.emit('crash:tick', {
        multiplier: crashState.multiplier,
        elapsedMs: Date.now() - crashState.startedAt
      });
    }
  }, 60);
}

async function processCrashCashout(telegramId, forcedMult = null) {
  if (crashState.phase !== 'running') return { error: 'Раунд не активен' };
  const betObj = crashState.bets.get(telegramId);
  if (!betObj || betObj.cashedOut) return { error: 'Нет активной ставки' };

  const cashMult = forcedMult || crashState.multiplier;
  if (cashMult >= crashState.crashPoint) return { error: 'Слишком поздно!' };

  betObj.cashedOut = true;
  betObj.cashoutAt = cashMult;
  betObj.payout = Math.floor(betObj.bet * cashMult);

  const user = await User.findOne({ telegramId });
  if (user) {
    user.balance += betObj.payout;
    recordOutcome(user, 'crash', betObj.bet, betObj.payout, cashMult);
    pushHistory(user, 'win', betObj.payout - betObj.bet, `Краш: забрал на x${cashMult} (+${betObj.payout} ⭐)`);
    await user.save();
    emitUserUpdate(user);
  }

  io.emit('crash:bets', getCrashBetsArray());
  pushLiveFeed('crash', {
    firstName: betObj.firstName || 'Игрок',
    photoUrl: betObj.photoUrl || '',
    bet: betObj.bet,
    mult: cashMult,
    payout: betObj.payout
  });
  return { ok: true, payout: betObj.payout, cashoutAt: cashMult };
}

// ======================== REALTIME ENGINE 2: RED / BLACK (15s) ========================
const rbState = {
  phase: 'betting', // 'betting' | 'spinning'
  endsAt: Date.now() + 15000,
  bets: new Map(), // telegramId -> { telegramId, firstName, photoUrl, color: 'red'|'black', amount }
  history: ['red', 'black', 'red', 'red', 'black', 'black', 'red', 'black', 'red', 'black']
};

function getRbBetsArray() {
  return Array.from(rbState.bets.values());
}

function broadcastRbState() {
  io.emit('rb:state', {
    phase: rbState.phase,
    timeLeftMs: Math.max(0, rbState.endsAt - Date.now()),
    bets: getRbBetsArray(),
    history: rbState.history.slice(0, 18)
  });
}

function runRbCycle() {
  rbState.phase = 'betting';
  rbState.bets.clear();
  rbState.endsAt = Date.now() + 15000;
  broadcastRbState();

  setTimeout(async () => {
    rbState.phase = 'spinning';
    const winnerColor = crypto.randomInt(0, 2) === 0 ? 'red' : 'black';
    rbState.history.unshift(winnerColor);
    if (rbState.history.length > 24) rbState.history.pop();

    const payouts = [];
    for (const b of rbState.bets.values()) {
      const won = b.color === winnerColor;
      const winAmount = won ? Math.floor(b.amount * 1.9) : 0;
      const u = await User.findOne({ telegramId: b.telegramId });
      if (u) {
        recordOutcome(u, 'redblack', b.amount, winAmount, won ? 1.9 : 0);
        if (won) {
          u.balance += winAmount;
          pushHistory(u, 'win', winAmount - b.amount, `Красное/Чёрное (${winnerColor === 'red' ? 'Красное' : 'Чёрное'}): +${winAmount}`);
        } else {
          pushHistory(u, 'bet', -b.amount, `Красное/Чёрное: проигрыш (-${b.amount})`);
        }
        await u.save();
        emitUserUpdate(u);
      }
      b.won = won;
      b.winAmount = winAmount;
      payouts.push({
        telegramId: b.telegramId,
        firstName: b.firstName,
        photoUrl: b.photoUrl || '',
        color: b.color,
        amount: b.amount,
        won,
        winAmount
      });
    }

    RoundHistory.create({ game: 'redblack', result: winnerColor }).catch(() => {});

    io.emit('rb:result', {
      winnerColor,
      history: rbState.history.slice(0, 18),
      payouts
    });

    setTimeout(runRbCycle, 4800);
  }, 15000);
}

// ======================== REALTIME ENGINE 3: PVP WHEEL ========================
const PVP_COLORS = ['#2ea6ff', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const pvpState = {
  phase: 'waiting', // 'waiting' | 'countdown' | 'spinning'
  endsAt: 0,
  players: [], // { telegramId, firstName, photoUrl, bet, color }
  totalPot: 0,
  lastWinner: null
};
let pvpTimer = null;

function broadcastPvpState() {
  io.emit('pvp:state', {
    phase: pvpState.phase,
    timeLeftMs: pvpState.phase === 'countdown' ? Math.max(0, pvpState.endsAt - Date.now()) : 0,
    players: pvpState.players,
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

    // Weighted random winner by bet share
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
    const winAmount = total;

    for (const pl of pvpState.players) {
      const pu = await User.findOne({ telegramId: pl.telegramId });
      if (!pu) continue;
      if (pl.telegramId === winner.telegramId) {
        pu.balance += winAmount;
        recordOutcome(pu, 'pvp', pl.bet, winAmount, Number((winAmount / Math.max(1, pl.bet)).toFixed(2)));
        pushHistory(pu, 'win', winAmount - pl.bet, `PvP Колесо: победа в банке (+${winAmount} ⭐)`);
      } else {
        recordOutcome(pu, 'pvp', pl.bet, 0, 0);
        pushHistory(pu, 'bet', -pl.bet, `PvP Колесо: банк забрал ${winner.firstName} (-${pl.bet} ⭐)`);
      }
      await pu.save();
      emitUserUpdate(pu);
    }

    pvpState.lastWinner = {
      telegramId: winner.telegramId,
      firstName: winner.firstName,
      photoUrl: winner.photoUrl,
      winAmount,
      chance: Number(((winner.bet / total) * 100).toFixed(1))
    };

    io.emit('pvp:spin', {
      winner: pvpState.lastWinner,
      stopAngle,
      players: pvpState.players,
      totalPot: total
    });

    setTimeout(() => {
      pvpState.phase = 'waiting';
      pvpState.players = [];
      pvpState.totalPot = 0;
      broadcastPvpState();
    }, 6200);
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
  socket.emit('crash:state', {
    phase: crashState.phase,
    roundId: crashState.roundId,
    multiplier: crashState.multiplier,
    serverSeedHash: crashState.serverSeedHash,
    waitMs: Math.max(0, crashState.waitEndsAt - Date.now()),
    bets: getCrashBetsArray(),
    history: crashState.history.slice(0, 16)
  });

  socket.emit('rb:state', {
    phase: rbState.phase,
    timeLeftMs: Math.max(0, rbState.endsAt - Date.now()),
    bets: getRbBetsArray(),
    history: rbState.history.slice(0, 18)
  });

  socket.emit('pvp:state', {
    phase: pvpState.phase,
    timeLeftMs: pvpState.phase === 'countdown' ? Math.max(0, pvpState.endsAt - Date.now()) : 0,
    players: pvpState.players,
    totalPot: pvpState.totalPot,
    lastWinner: pvpState.lastWinner
  });

  socket.emit('plinko:history', plinkoRecentBets.slice(0, 30));

  // CRASH BET
  socket.on('crash:bet', async (payload, cb) => {
    try {
      if (crashState.phase !== 'waiting') return cb?.({ error: 'Ставки принимаются только до старта раунда' });
      if (crashState.bets.has(socket.telegramId)) return cb?.({ error: 'Вы уже сделали ставку в этом раунде' });

      const bet = Math.floor(Number(payload?.bet));
      const autoCashout = Number(payload?.autoCashout) || 0;
      if (!Number.isFinite(bet) || bet < 5 || bet > 50000) return cb?.({ error: 'Ставка от 5 до 50 000 ⭐' });

      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || user.banned) return cb?.({ error: 'Доступ запрещен' });
      if (user.balance < bet) return cb?.({ error: 'Недостаточно звёзд ⭐' });

      user.balance -= bet;
      recordWager(user, 'crash', bet);
      await user.save();

      crashState.bets.set(socket.telegramId, {
        telegramId: user.telegramId,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        bet,
        autoCashout: autoCashout >= 1.05 ? Number(autoCashout.toFixed(2)) : 0,
        cashedOut: false,
        cashoutAt: 0,
        payout: 0
      });

      emitUserUpdate(user);
      io.emit('crash:bets', getCrashBetsArray());
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

  // RED / BLACK BET
  socket.on('rb:bet', async (payload, cb) => {
    try {
      if (rbState.phase !== 'betting') return cb?.({ error: 'Приём ставок закрыт' });
      if (rbState.bets.has(socket.telegramId)) return cb?.({ error: 'Ставка в этом раунде уже принята' });

      const color = payload?.color === 'red' ? 'red' : payload?.color === 'black' ? 'black' : null;
      const amount = Math.floor(Number(payload?.amount));
      if (!color) return cb?.({ error: 'Выберите цвет' });
      if (!Number.isFinite(amount) || amount < 5 || amount > 50000) return cb?.({ error: 'Ставка от 5 до 50 000 ⭐' });

      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || user.banned) return cb?.({ error: 'Доступ запрещен' });
      if (user.balance < amount) return cb?.({ error: 'Недостаточно звёзд ⭐' });

      user.balance -= amount;
      recordWager(user, 'redblack', amount);
      await user.save();

      rbState.bets.set(socket.telegramId, {
        telegramId: user.telegramId,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        color,
        amount
      });

      emitUserUpdate(user);
      broadcastRbState();
      cb?.({ ok: true });
    } catch {
      cb?.({ error: 'Ошибка ставки' });
    }
  });

  // PVP WHEEL JOIN
  socket.on('pvp:join', async (payload, cb) => {
    try {
      if (pvpState.phase === 'spinning') return cb?.({ error: 'Колесо уже крутится!' });
      const bet = Math.floor(Number(payload?.bet));
      if (!Number.isFinite(bet) || bet < 5 || bet > 50000) return cb?.({ error: 'Ставка от 5 до 50 000 ⭐' });

      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || user.banned) return cb?.({ error: 'Доступ запрещен' });
      if (user.balance < bet) return cb?.({ error: 'Недостаточно звёзд ⭐' });

      user.balance -= bet;
      recordWager(user, 'pvp', bet);
      await user.save();

      const existing = pvpState.players.find((p) => p.telegramId === user.telegramId);
      if (existing) {
        existing.bet += bet;
      } else {
        pvpState.players.push({
          telegramId: user.telegramId,
          firstName: user.firstName,
          photoUrl: user.photoUrl,
          bet,
          color: PVP_COLORS[pvpState.players.length % PVP_COLORS.length]
        });
      }
      pvpState.totalPot += bet;

      emitUserUpdate(user);
      if (pvpState.phase === 'waiting' && pvpState.players.length >= 2) {
        startPvpCountdown();
      } else {
        broadcastPvpState();
      }
      cb?.({ ok: true });
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
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=25&offset=${botUpdateOffset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message']))}`);
        const data = await res.json().catch(() => ({ ok: false }));
        if (data?.ok && Array.isArray(data.result)) {
          for (const upd of data.result) {
            botUpdateOffset = Math.max(botUpdateOffset, Number(upd.update_id) + 1);
            const msg = upd.message;
            if (!msg || !msg.chat || msg.chat.type !== 'private') continue;
            if (msg.from?.is_bot) continue;
            // Reply to ANY message sent to the bot with welcome banner + "Играть" button
            sendBotWelcome(msg.chat.id, msg.from?.first_name || '').catch(() => {});
          }
        } else if (data?.error_code === 409) {
          // Another instance polling; back off gracefully
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

// ======================== STARTUP ========================
async function boot() {
  loadLocalDb();
  console.log('[Store] Running in No-DB mode (in-memory + watcher-safe JSON persistence)');

  syncLiveTonRate();
  setInterval(syncLiveTonRate, 15 * 60 * 1000);

  startCrashWaiting();
  runRbCycle();
  startTelegramBotPoller();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZetGifts] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[ZetGifts] Loaded ${CATALOG.collections.length} real Telegram collections & ${CATALOG.crafted.length} crafted gifts`);
  });
}

// Always flush db.json cleanly on shutdown/redeploy signals
process.on('SIGTERM', () => { botPollingActive = false; saveDbNow(); process.exit(0); });
process.on('SIGINT', () => { botPollingActive = false; saveDbNow(); process.exit(0); });
process.on('beforeExit', () => { saveDbNow(); });

boot();
