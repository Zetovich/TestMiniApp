require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// ======================== CONFIGURATION ========================
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zetgifts';
const BOT_TOKEN = process.env.BOT_TOKEN || '9043576207:AAG8IGLNGs_NcqHiFXnBGVvmcSyOiTxqtZQ';
const ADMIN_ID = String(process.env.ADMIN_ID || '8213153991');
const UPGRADE_COST = 25;
const WHEEL_COST = 25;
const INIT_DATA_MAX_AGE_SEC = 86400; // 24 hours

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

const CRAFTED_BY_ID = new Map();
for (const col of CATALOG.collections) {
  for (const cm of (col.craftedModels || [])) {
    CRAFTED_BY_ID.set(cm.id, cm);
  }
}
for (const c of (CATALOG.crafted || [])) {
  if (!CRAFTED_BY_ID.has(c.id)) CRAFTED_BY_ID.set(c.id, c);
}

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

// ======================== MONGOOSE SCHEMAS ========================
const GiftItemSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  collectionId: { type: String, required: true },
  collectionName: { type: String, required: true },
  upgraded: { type: Boolean, default: false },
  crafted: { type: Boolean, default: false },
  craftTier: { type: String, default: '' }, // '', 'Uncommon', 'Rare', 'Epic', 'Legendary'
  craftedName: { type: String, default: '' },
  craftedRuName: { type: String, default: '' },
  mintNumber: { type: Number, default: 0 },
  model: {
    name: { type: String, default: '' },
    rarity: { type: Number, default: 0 }
  },
  backdrop: {
    name: { type: String, default: '' },
    rarity: { type: Number, default: 0 },
    center: { type: String, default: '#243447' },
    edge: { type: String, default: '#17212b' },
    pattern: { type: String, default: '#2ea6ff' },
    text: { type: String, default: '#ffffff' }
  },
  symbol: {
    name: { type: String, default: '' },
    rarity: { type: Number, default: 0 },
    image: { type: String, default: '' }
  },
  image: { type: String, required: true },
  lottie: { type: String, default: '' },
  value: { type: Number, default: 50 },
  obtainedFrom: { type: String, default: 'Gift' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const HistoryEntrySchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'win', 'bet', 'upgrade', 'craft', 'sell', 'withdraw', 'topup', 'admin', 'case'
  amount: { type: Number, default: 0 },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true, index: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: 'Telegram User' },
  lastName: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  balance: { type: Number, default: 250 },
  banned: { type: Boolean, default: false },
  inventory: { type: [GiftItemSchema], default: [] },
  history: { type: [HistoryEntrySchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 100 }
});

const RoundHistorySchema = new mongoose.Schema({
  game: { type: String, required: true, index: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Counter = mongoose.model('Counter', CounterSchema);
const RoundHistory = mongoose.model('RoundHistory', RoundHistorySchema);

async function nextMintNumber(collectionId) {
  const doc = await Counter.findOneAndUpdate(
    { key: `mint_${collectionId}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

function pushHistory(user, type, amount, title) {
  user.history.unshift({ type, amount, title, createdAt: new Date() });
  if (user.history.length > 80) user.history = user.history.slice(0, 80);
}

function createRegularGift(col, obtainedFrom = 'Shop') {
  return {
    uid: makeUid(),
    collectionId: col.id,
    collectionName: col.name,
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
    value: Math.max(15, Math.round(col.price)),
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
  // Rarity bonus multiplier for upgraded gift valuation
  const rarityBoost = modelRarity <= 0.5 ? 2.6 : modelRarity <= 1.0 ? 2.0 : modelRarity <= 2.0 ? 1.55 : 1.25;
  const value = Math.round((col.price + UPGRADE_COST) * rarityBoost);

  return {
    mintNumber,
    model: { name: modelName, rarity: modelRarity },
    backdrop: {
      name: bMeta[0],
      rarity: bRef[1],
      center: bMeta[1],
      edge: bMeta[2],
      pattern: bMeta[3],
      text: bMeta[4]
    },
    symbol: {
      name: symName,
      rarity: sRef[1],
      image: getPatternImage(col.name, symName)
    },
    image: getModelImage(col.name, modelName),
    lottie: getModelLottie(col.name, modelName),
    value
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

async function createCraftedGift(craftedSpec, inheritedBackdrop = null, inheritedSymbol = null, obtainedFrom = 'Craft') {
  const baseCol = COLLECTIONS_BY_NAME.get(craftedSpec.baseCollection) || CATALOG.collections[0];
  const mintNumber = await nextMintNumber(craftedSpec.id);

  const backdrop = inheritedBackdrop || {
    name: `${craftedSpec.tier} Forge`,
    rarity: craftedSpec.tier === 'Legendary' ? 0.1 : craftedSpec.tier === 'Epic' ? 0.3 : craftedSpec.tier === 'Rare' ? 0.8 : 1.5,
    center: craftedSpec.center,
    edge: craftedSpec.edge,
    pattern: '#ffffff',
    text: '#ffffff'
  };

  const symbol = inheritedSymbol || {
    name: 'Forge Star',
    rarity: 0.5,
    image: baseCol.symbols.length ? getPatternImage(baseCol.name, CATALOG.symbols[baseCol.symbols[0][0]]) : ''
  };

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
    value: craftedSpec.value,
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
    // Starter welcome gift (regular Homemade Cake so new user can try Upgrade immediately!)
    const starterCol = COLLECTIONS_BY_NAME.get('Homemade Cake') || CATALOG.collections[0];
    user = await User.create({
      telegramId: tgProfile.telegramId,
      username: tgProfile.username,
      firstName: tgProfile.firstName,
      lastName: tgProfile.lastName,
      photoUrl: tgProfile.photoUrl,
      balance: 250,
      inventory: [createRegularGift(starterCol, 'Welcome Bonus')],
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
    history: user.history
  };
}

// ======================== EXPRESS + SOCKET.IO SETUP ========================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Static flat assets from ZetGifts directory
app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'deny'
}));

// Block direct download of server source/config
app.get(['/server.js', '/package.json', '/package-lock.json', '/.env'], (_req, res) => {
  res.status(403).end();
});

// Auth Middleware for ALL /api/* routes
async function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const tgProfile = verifyTelegramInitData(initData);
  if (!tgProfile) {
    return res.status(401).json({ error: 'Ошибка авторизации' });
  }
  try {
    const user = await getOrCreateUser(tgProfile);
    if (user.banned && user.telegramId !== ADMIN_ID) {
      return res.status(403).json({ error: 'Аккаунт заблокирован администратором' });
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

// ======================== CASES & WHEEL DEFINITIONS ========================
const CASES = [
  {
    id: 'starter',
    name: 'Стартовый кейс',
    subtitle: 'Классические подарки Telegram',
    price: 50,
    accent: '#2ea6ff',
    cover: 'gift_cake.png',
    pool: ['Homemade Cake', 'Desk Calendar', 'Jingle Bells', 'Trapped Heart', 'Cookie Heart', 'B-Day Candle', 'Candy Cane', 'Ginger Cookie', 'Hanging Star', 'Snow Mittens', 'Santa Hat', 'Toy Bear']
  },
  {
    id: 'classic',
    name: 'Коллекционный кейс',
    subtitle: 'Популярные подарки с шансом на редкие',
    price: 150,
    accent: '#a855f7',
    cover: 'gift_bear.png',
    pool: ['Toy Bear', 'Eternal Rose', 'Santa Hat', 'Scared Cat', 'Kissed Frog', 'Spiced Wine', 'Magic Potion', 'Vintage Cigar', 'Crystal Ball', 'Genie Lamp', 'Stellar Rocket', 'Signet Ring', 'Perfume Bottle', 'Snoop Dogg']
  },
  {
    id: 'royal',
    name: 'Королевский кейс',
    subtitle: 'Премиальные коллекции и редкие дропы',
    price: 350,
    accent: '#f59e0b',
    cover: 'gift_cap.png',
    pool: ['Signet Ring', 'Perfume Bottle', 'Swiss Watch', 'Mini Oscar', 'Loot Bag', 'Diamond Ring', 'Astral Shard', 'Precious Peach', 'Heart Locket', "Durov's Cap", 'Plush Pepe']
  },
  {
    id: 'mythic',
    name: 'Мифический кейс',
    subtitle: 'Сразу улучшенные NFT-подарки!',
    price: 650,
    accent: '#ef4444',
    cover: 'gift_pepe.png',
    instantUpgrade: true,
    pool: ['Astral Shard', 'Diamond Ring', 'Swiss Watch', 'Mini Oscar', 'Loot Bag', 'Precious Peach', 'Heart Locket', "Durov's Cap", 'Plush Pepe', 'Eternal Rose', 'Crystal Ball']
  }
];

const WHEEL_SEGMENTS = [
  { id: 's1', label: '1 ⭐', type: 'stars', amount: 1, color: '#243447', weight: 22 },
  { id: 's2', label: '3 ⭐', type: 'stars', amount: 3, color: '#1e3a5f', weight: 20 },
  { id: 'g1', label: 'Торт', type: 'gift', collection: 'Homemade Cake', color: '#2ea6ff', weight: 10 },
  { id: 's3', label: '5 ⭐', type: 'stars', amount: 5, color: '#243447', weight: 18 },
  { id: 's4', label: '15 ⭐', type: 'stars', amount: 15, color: '#1e3a5f', weight: 12 },
  { id: 'g2', label: 'Мишка', type: 'gift', collection: 'Toy Bear', color: '#8b5cf6', weight: 7 },
  { id: 's5', label: '50 ⭐', type: 'stars', amount: 50, color: '#d97706', weight: 6 },
  { id: 'g3', label: 'Пепе', type: 'gift', collection: 'Plush Pepe', color: '#16a34a', weight: 5 }
];

const PLINKO_MULTIPLIERS = [5.0, 2.0, 1.1, 0.5, 0.3, 0.5, 1.1, 2.0, 5.0];

// ======================== CORE API ROUTES ========================
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    user: serializeUser(req.user),
    upgradeCost: UPGRADE_COST,
    wheelCost: WHEEL_COST,
    cases: CASES,
    wheelSegments: WHEEL_SEGMENTS.map(({ weight, ...rest }) => rest),
    plinkoMultipliers: PLINKO_MULTIPLIERS,
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
    collections: CATALOG.collections.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
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
  const col = COLLECTIONS_BY_NAME.get(req.body.collectionName) || COLLECTIONS_BY_ID.get(req.body.collectionId);
  if (!col) return res.status(404).json({ error: 'Подарок не найден в каталоге Telegram' });

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < col.price) return res.status(400).json({ error: 'Недостаточно звёзд ⭐' });

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
  if (gift.upgraded) return res.status(400).json({ error: 'Этот подарок уже улучшен' });
  if (user.balance < UPGRADE_COST) return res.status(400).json({ error: `Нужно ${UPGRADE_COST} ⭐ для улучшения` });

  const col = COLLECTIONS_BY_ID.get(gift.collectionId) || COLLECTIONS_BY_NAME.get(gift.collectionName);
  if (!col) return res.status(400).json({ error: 'Коллекция не поддерживает улучшение' });

  user.balance -= UPGRADE_COST;
  const traits = await rollUpgradedTraits(col);

  gift.upgraded = true;
  gift.mintNumber = traits.mintNumber;
  gift.model = traits.model;
  gift.backdrop = traits.backdrop;
  gift.symbol = traits.symbol;
  gift.image = traits.image;
  gift.lottie = traits.lottie;
  gift.value = traits.value;

  pushHistory(user, 'upgrade', -UPGRADE_COST, `Улучшение «${col.name}» #${traits.mintNumber} (${traits.model.name})`);
  user.markModified('inventory');
  await user.save();

  // Provide 14 preview frames (real models & backdrops from this exact collection) for authentic Telegram roulette animation!
  const previewModels = col.models.slice(0, 14).map(([mName]) => ({
    name: mName,
    image: getModelImage(col.name, mName)
  }));
  const previewBackdrops = col.backdrops.slice(0, 10).map(([bIdx]) => {
    const b = CATALOG.backdrops[bIdx];
    return { name: b[0], center: b[1], edge: b[2] };
  });

  res.json({
    gift,
    previewModels,
    previewBackdrops,
    user: serializeUser(user)
  });
});

// CRAFT (1-4 UPGRADED gifts from SAME collection: 1=10%, 2=30%, 3=60%, 4=100%)
const CRAFT_CHANCES = { 1: 10, 2: 30, 3: 60, 4: 100 };

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

  // Attribute inheritance (if multiple inputs share backdrop/symbol, higher chance to preserve!)
  const backdropCounts = {};
  const symbolCounts = {};
  for (const g of selected) {
    if (g.backdrop?.name) backdropCounts[g.backdrop.name] = (backdropCounts[g.backdrop.name] || 0) + 1;
    if (g.symbol?.name) symbolCounts[g.symbol.name] = (symbolCounts[g.symbol.name] || 0) + 1;
  }

  let inheritedBackdrop = null;
  for (const g of selected) {
    if (backdropCounts[g.backdrop.name] >= 2) {
      const keepProb = backdropCounts[g.backdrop.name] === 4 ? 1 : backdropCounts[g.backdrop.name] * 0.25;
      if (Math.random() < keepProb) {
        inheritedBackdrop = { ...g.backdrop.toObject ? g.backdrop.toObject() : g.backdrop };
        break;
      }
    }
  }

  let inheritedSymbol = null;
  for (const g of selected) {
    if (g.symbol?.name && symbolCounts[g.symbol.name] >= 2) {
      if (Math.random() < symbolCounts[g.symbol.name] * 0.25) {
        inheritedSymbol = { ...g.symbol.toObject ? g.symbol.toObject() : g.symbol };
        break;
      }
    }
  }

  // Burn committed gifts
  const uidSet = new Set(uids);
  user.inventory = user.inventory.filter((g) => !uidSet.has(g.uid));

  let resultGift = null;
  const col = COLLECTIONS_BY_NAME.get(collectionName) || CATALOG.collections[0];
  const collectionCraftPool = (col.craftedModels && col.craftedModels.length) ? col.craftedModels : CATALOG.crafted;

  if (success) {
    // Weighted random from THAT EXACT COLLECTION'S 5 crafted models!
    // More input gifts slightly improve Rare/Epic/Legendary odds
    const luckBoost = selected.length === 4 ? { Uncommon: 0.75, Rare: 1.0, Epic: 1.35, Legendary: 2.0 }
      : selected.length === 3 ? { Uncommon: 0.85, Rare: 1.0, Epic: 1.2, Legendary: 1.5 }
        : { Uncommon: 1.0, Rare: 1.0, Epic: 1.0, Legendary: 1.0 };

    const chosenCraft = weightedPick(
      collectionCraftPool,
      (cm) => (cm.weight || 10) * (luckBoost[cm.tier] || 1)
    );

    // If no backdrop/symbol inherited from matching inputs, roll random real backdrop/symbol from this collection (just like Upgrade!)
    let finalBackdrop = inheritedBackdrop;
    if (!finalBackdrop && col.backdrops.length && Math.random() < 0.5) {
      const bRef = weightedPick(col.backdrops, (b) => b[1]);
      const bMeta = CATALOG.backdrops[bRef[0]];
      if (bMeta) {
        finalBackdrop = {
          name: bMeta[0], rarity: bRef[1],
          center: bMeta[1], edge: bMeta[2], pattern: bMeta[3], text: bMeta[4]
        };
      }
    }
    let finalSymbol = inheritedSymbol;
    if (!finalSymbol && col.symbols.length) {
      const sRef = weightedPick(col.symbols, (s) => s[1]);
      const sName = CATALOG.symbols[sRef[0]] || 'Star';
      finalSymbol = { name: sName, rarity: sRef[1], image: getPatternImage(col.name, sName) };
    }

    const totalInputValue = selected.reduce((sum, g) => sum + (g.value || 100), 0);
    resultGift = await createCraftedGift(chosenCraft, finalBackdrop, finalSymbol, 'Craft');
    resultGift.value = Math.max(resultGift.value, Math.round(totalInputValue * 1.45));
    user.inventory.unshift(resultGift);
    pushHistory(user, 'craft', 0, `Успешный крафт (${chance}%): ${resultGift.craftedRuName || resultGift.craftedName}`);
  } else {
    pushHistory(user, 'craft', 0, `Неудачный крафт (${chance}%): сгорело ${selected.length} шт. «${collectionName}»`);
  }

  user.markModified('inventory');
  await user.save();

  res.json({
    success,
    chance,
    burnedCount: selected.length,
    resultGift,
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

// ======================== GAME: LUCKY WHEEL (25 ⭐) ========================
app.post('/api/games/wheel', authMiddleware, async (req, res) => {
  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < WHEEL_COST) return res.status(400).json({ error: `Недостаточно звёзд (нужно ${WHEEL_COST} ⭐)` });

  user.balance -= WHEEL_COST;
  const seg = weightedPick(WHEEL_SEGMENTS, (s) => s.weight);
  const segIndex = WHEEL_SEGMENTS.findIndex((s) => s.id === seg.id);

  let wonGift = null;
  let wonStars = 0;

  if (seg.type === 'stars') {
    wonStars = seg.amount;
    user.balance += wonStars;
    pushHistory(user, 'win', wonStars - WHEEL_COST, `Колесо Удачи: +${wonStars} ⭐`);
  } else {
    const col = COLLECTIONS_BY_NAME.get(seg.collection) || CATALOG.collections[0];
    wonGift = createRegularGift(col, 'Колесо Удачи');
    user.inventory.unshift(wonGift);
    pushHistory(user, 'win', -WHEEL_COST, `Колесо Удачи: подарок «${col.name}»`);
  }

  user.markModified('inventory');
  await user.save();

  res.json({
    segmentIndex: segIndex,
    segment: { id: seg.id, label: seg.label, type: seg.type },
    wonStars,
    wonGift,
    user: serializeUser(user)
  });
});

// ======================== GAME: CASES (ROULETTE TAPE) ========================
app.post('/api/games/case/open', authMiddleware, async (req, res) => {
  const caseDef = CASES.find((c) => c.id === req.body.caseId);
  if (!caseDef) return res.status(404).json({ error: 'Кейс не найден' });

  const user = await User.findOne({ telegramId: req.user.telegramId });
  if (user.balance < caseDef.price) return res.status(400).json({ error: 'Недостаточно звёзд ⭐' });

  user.balance -= caseDef.price;

  // Build pool with real Telegram collections; rarer/pricier items have lower drop weight
  const poolCols = caseDef.pool.map((name) => COLLECTIONS_BY_NAME.get(name)).filter(Boolean);
  const winnerCol = weightedPick(poolCols, (c) => Math.max(4, Math.round(1000 / Math.max(40, c.price))));

  const wonGift = caseDef.instantUpgrade
    ? await createUpgradedGift(winnerCol, `Кейс «${caseDef.name}»`)
    : createRegularGift(winnerCol, `Кейс «${caseDef.name}»`);

  user.inventory.unshift(wonGift);
  pushHistory(user, 'case', -caseDef.price, `Кейс «${caseDef.name}»: ${wonGift.collectionName}${wonGift.upgraded ? ' (NFT)' : ''}`);
  user.markModified('inventory');
  await user.save();

  // Build 42-item roulette strip with winner placed at index 34
  const winnerIndex = 34;
  const strip = [];
  for (let i = 0; i < 42; i++) {
    if (i === winnerIndex) {
      strip.push({
        name: wonGift.collectionName,
        sub: wonGift.upgraded ? wonGift.model.name : `${wonGift.value} ⭐`,
        image: wonGift.image,
        center: wonGift.backdrop.center,
        edge: wonGift.backdrop.edge,
        upgraded: wonGift.upgraded
      });
    } else {
      const randCol = poolCols[crypto.randomInt(0, poolCols.length)];
      strip.push({
        name: randCol.name,
        sub: `${randCol.price} ⭐`,
        image: getOriginalImage(randCol),
        center: '#243447',
        edge: '#17212b',
        upgraded: false
      });
    }
  }

  res.json({
    strip,
    winnerIndex,
    wonGift,
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
  return Number((0.97 / prob).toFixed(2));
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
  pushHistory(user, payout >= bet ? 'win' : 'bet', payout - bet, `Плинко x${multiplier} (${payout} ⭐)`);
  await user.save();

  res.json({
    pathDirs,
    bucketIndex,
    multiplier,
    payout,
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
  const winChance = Number((100 / multiplier).toFixed(2)); // 100% honest chance
  const roll = crypto.randomInt(0, 10000) / 100; // 0.00..99.99
  const won = roll < winChance;
  const payout = won ? Math.floor(bet * multiplier) : 0;

  if (won) {
    user.balance += payout;
    pushHistory(user, 'win', payout - bet, `Апгрейдер x${multiplier}: победа (+${payout} ⭐)`);
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
    user: serializeUser(user)
  });
});

// ======================== ADMIN PANEL API (ID: 8213153991) ========================
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

  emitUserUpdate(user);
  res.json({ user: serializeUser(user) });
});

app.post('/api/admin/give-gift', authMiddleware, adminOnly, async (req, res) => {
  const { telegramId, collectionName, upgraded, crafted, craftedId } = req.body;
  const user = await User.findOne({ telegramId: String(telegramId) });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

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

  emitUserUpdate(user);
  res.json({ gift, user: serializeUser(user) });
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

// ======================== REALTIME ENGINE 1: CRASH ========================
const crashState = {
  phase: 'waiting', // 'waiting' | 'running' | 'crashed'
  roundId: 1,
  multiplier: 1.0,
  crashPoint: 2.0,
  startedAt: 0,
  waitEndsAt: Date.now() + 7000,
  bets: new Map(), // telegramId -> { telegramId, firstName, photoUrl, bet, autoCashout, cashedOut, cashoutAt, payout }
  history: [1.45, 2.82, 1.14, 5.60, 1.93, 11.24, 1.31, 3.47]
};

function generateCrashPoint() {
  // Fair crash distribution with 3% house edge
  const r = crypto.randomInt(1, 1000000) / 1000000;
  if (r < 0.03) return 1.0;
  const raw = 0.97 / (1 - r);
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
  crashState.crashPoint = generateCrashPoint();
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
            pushHistory(u, 'bet', -betObj.bet, `Краш @ x${crashState.crashPoint}: ставка сгорела (-${betObj.bet} ⭐)`);
            u.save().then(() => emitUserUpdate(u)).catch(() => {});
          }).catch(() => {});
        }
      }

      RoundHistory.create({ game: 'crash', result: crashState.crashPoint }).catch(() => {});

      io.emit('crash:boom', {
        crashPoint: crashState.crashPoint,
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
    pushHistory(user, 'win', betObj.payout - betObj.bet, `Краш: забрал на x${cashMult} (+${betObj.payout} ⭐)`);
    await user.save();
    emitUserUpdate(user);
  }

  io.emit('crash:bets', getCrashBetsArray());
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
      const winAmount = won ? b.amount * 2 : 0;
      const u = await User.findOne({ telegramId: b.telegramId });
      if (u) {
        if (won) {
          u.balance += winAmount;
          pushHistory(u, 'win', b.amount, `Красное/Чёрное (${winnerColor === 'red' ? 'Красное' : 'Чёрное'}): +${winAmount} ⭐`);
        } else {
          pushHistory(u, 'bet', -b.amount, `Красное/Чёрное: проигрыш (-${b.amount} ⭐)`);
        }
        await u.save();
        emitUserUpdate(u);
      }
      payouts.push({ telegramId: b.telegramId, firstName: b.firstName, won, winAmount });
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
  if (pvpState.phase !== 'waiting') return;
  pvpState.phase = 'countdown';
  pvpState.endsAt = Date.now() + 12000;
  broadcastPvpState();

  clearTimeout(pvpTimer);
  pvpTimer = setTimeout(async () => {
    pvpState.phase = 'spinning';
    const total = pvpState.totalPot;
    if (!pvpState.players.length || total <= 0) {
      pvpState.phase = 'waiting';
      broadcastPvpState();
      return;
    }

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

    const u = await User.findOne({ telegramId: winner.telegramId });
    if (u) {
      u.balance += winAmount;
      pushHistory(u, 'win', winAmount - winner.bet, `PvP Колесо: победа в банке (+${winAmount} ⭐)`);
      await u.save();
      emitUserUpdate(u);
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

  // Send immediate game snapshots
  socket.emit('crash:state', {
    phase: crashState.phase,
    roundId: crashState.roundId,
    multiplier: crashState.multiplier,
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
      if (pvpState.phase === 'waiting') {
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

// ======================== STARTUP ========================
async function boot() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] Connected:', MONGO_URI);
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  }

  startCrashWaiting();
  runRbCycle();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZetGifts] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[ZetGifts] Loaded ${CATALOG.collections.length} real Telegram collections & ${CATALOG.crafted.length} crafted gifts`);
  });
}

boot();
