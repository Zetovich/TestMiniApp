/**
 * ZetGambling - Premium Dark Web3 / TopGift Style Telegram Casino Mini App
 * Server Engine (Node.js + Express + Socket.IO + Mongoose)
 * 
 * Brand: ZetGambling
 * Currency: Only Stars (⭐) - absolutely no TON, GRAM or other tokens.
 * Database: MongoDB via Mongoose (process.env.MONGODB_URI) with in-memory fallback.
 * Security: Strict Telegram WebApp validation (no unauthorized guest access).
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zetgambling';

// ==========================================
// 1. MONGOOSE MODELS & DATABASE SETUP
// ==========================================

// 1.1 Модель User: id, username, first_name, photo_url, balance, best_win, total_games, bet_volume, level
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  username: { type: String, default: '' },
  first_name: { type: String, default: 'Игрок' },
  photo_url: { type: String, default: '' },
  balance: { type: Number, default: 150, min: 0 }, // Баланс исключительно в Звёздах (⭐)
  best_win: { type: Number, default: 0 },
  total_games: { type: Number, default: 0 },
  bet_volume: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

// 1.2 Модель Inventory: id, user_id, item_name, item_emoji, sell_price
const inventorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  item_name: { type: String, required: true },
  item_emoji: { type: String, default: '🎁' },
  sell_price: { type: Number, default: 25 } // Цена продажи исключительно в ⭐
}, { timestamps: true });

// 1.3 Модель PvpGame: состояние текущей PvP игры в MongoDB
const pvpGameSchema = new mongoose.Schema({
  game_id: { type: String, default: 'active_round', unique: true, index: true },
  status: { type: String, enum: ['waiting', 'spinning', 'finished'], default: 'waiting' },
  countdown: { type: Number, default: 15 },
  total_pot: { type: Number, default: 0 },
  bets: [{
    user_id: { type: String, required: true },
    username: { type: String, default: '' },
    first_name: { type: String, default: 'Игрок' },
    photo_url: { type: String, default: '' },
    bet: { type: Number, required: true },
    color: { type: String, default: '#f59e0b' },
    start_angle: { type: Number, default: 0 },
    end_angle: { type: Number, default: 360 },
    percent: { type: Number, default: 100 }
  }],
  winner_id: { type: String, default: null },
  winner_name: { type: String, default: null },
  winning_degree: { type: Number, default: null }
}, { timestamps: true });

// 1.4 Модель BetHistory: история ставок и выигрышей пользователя
const betHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  game_name: { type: String, required: true },
  bet: { type: Number, required: true },
  win: { type: Number, required: true },
  multiplier: { type: Number, default: 1.0 },
  is_win: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);
const InventoryModel = mongoose.model('Inventory', inventorySchema);
const PvpGameModel = mongoose.model('PvpGame', pvpGameSchema);
const BetHistoryModel = mongoose.model('BetHistory', betHistorySchema);

let isMongoConnected = false;

// Fallback in-memory хранилище
const memoryUsers = new Map();
const memoryInventory = new Map();
const memoryHistory = [];
let memPvpState = {
  game_id: 'active_round',
  status: 'waiting',
  countdown: 15,
  total_pot: 0,
  bets: [],
  winner_id: null,
  winner_name: null,
  winning_degree: null
};

// Подключение к MongoDB через process.env.MONGODB_URI
async function initDatabase() {
  console.log(`📡 [ZetGambling] Подключение к MongoDB (${MONGODB_URI ? 'URI задан' : 'по умолчанию'})...`);
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500
    });
    isMongoConnected = true;
    console.log('✅ [ZetGambling] Успешное подключение к MongoDB через Mongoose!');

    const existingPvp = await PvpGameModel.findOne({ game_id: 'active_round' });
    if (!existingPvp) {
      await PvpGameModel.create(memPvpState);
    }
  } catch (err) {
    isMongoConnected = false;
    console.warn('⚠️ [ZetGambling] MongoDB недоступна локально. Включен in-memory fallback для тестов.');
  }
}

// Хелперы работы с БД
async function findUserById(id) {
  const strId = String(id);
  if (isMongoConnected) {
    try {
      const u = await UserModel.findOne({ id: strId });
      if (u) return u.toObject();
    } catch (e) {
      console.warn('Mongo findUserById fallback:', e.message);
    }
  }
  return memoryUsers.get(strId) || null;
}

async function saveOrUpdateUser(tgUser) {
  const strId = String(tgUser.id);
  const updateData = {
    id: strId,
    username: tgUser.username || '',
    first_name: tgUser.first_name || 'Игрок',
    photo_url: tgUser.photo_url || ''
  };

  if (isMongoConnected) {
    try {
      let u = await UserModel.findOne({ id: strId });
      if (!u) {
        u = await UserModel.create({
          ...updateData,
          balance: 150,
          best_win: 0,
          total_games: 0,
          bet_volume: 0,
          level: 1
        });
      } else {
        u.username = updateData.username;
        u.first_name = updateData.first_name;
        if (updateData.photo_url) u.photo_url = updateData.photo_url;
        await u.save();
      }
      return u.toObject();
    } catch (e) {
      console.warn('Mongo saveOrUpdateUser fallback:', e.message);
    }
  }

  let mem = memoryUsers.get(strId);
  if (!mem) {
    mem = {
      ...updateData,
      balance: 150,
      best_win: 0,
      total_games: 0,
      bet_volume: 0,
      level: 1
    };
  } else {
    mem.username = updateData.username;
    mem.first_name = updateData.first_name;
    if (updateData.photo_url) mem.photo_url = updateData.photo_url;
  }
  memoryUsers.set(strId, mem);
  return { ...mem };
}

async function adjustUserBalance(userId, deltaStars) {
  const strId = String(userId);
  if (isMongoConnected) {
    try {
      const u = await UserModel.findOne({ id: strId });
      if (u) {
        u.balance = Math.max(0, Math.floor(u.balance + deltaStars));
        await u.save();
        return u.toObject();
      }
    } catch (e) {
      console.warn('Mongo adjustUserBalance fallback:', e.message);
    }
  }

  const mem = memoryUsers.get(strId);
  if (mem) {
    mem.balance = Math.max(0, Math.floor(mem.balance + deltaStars));
    memoryUsers.set(strId, mem);
    return { ...mem };
  }
  return { id: strId, balance: 0 };
}

async function recordUserGameResult(userId, betStars, winStars, gameName = 'Игра', multiplier = 1.0) {
  const strId = String(userId);
  const isWin = winStars > betStars;

  if (isMongoConnected) {
    try {
      const u = await UserModel.findOne({ id: strId });
      if (u) {
        u.total_games = (u.total_games || 0) + 1;
        u.bet_volume = (u.bet_volume || 0) + Math.max(0, betStars);
        if (winStars > (u.best_win || 0)) {
          u.best_win = winStars;
        }
        // Уровень зависит от объема ставок: каждые 200 звёзд = +1 уровень
        u.level = 1 + Math.floor(u.bet_volume / 200);
        await u.save();
      }

      await BetHistoryModel.create({
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: strId,
        game_name: gameName,
        bet: betStars,
        win: winStars,
        multiplier: Number(multiplier.toFixed(2)),
        is_win: isWin,
        created_at: new Date()
      });
      return;
    } catch (e) {
      console.warn('Mongo recordUserGameResult fallback:', e.message);
    }
  }

  const mem = memoryUsers.get(strId);
  if (mem) {
    mem.total_games = (mem.total_games || 0) + 1;
    mem.bet_volume = (mem.bet_volume || 0) + Math.max(0, betStars);
    if (winStars > (mem.best_win || 0)) {
      mem.best_win = winStars;
    }
    mem.level = 1 + Math.floor(mem.bet_volume / 200);
    memoryUsers.set(strId, mem);
  }

  memoryHistory.unshift({
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: strId,
    game_name: gameName,
    bet: betStars,
    win: winStars,
    multiplier: Number(multiplier.toFixed(2)),
    is_win: isWin,
    created_at: new Date().toISOString()
  });
  if (memoryHistory.length > 100) memoryHistory.pop();
}

async function getUserHistory(userId) {
  const strId = String(userId);
  if (isMongoConnected) {
    try {
      const items = await BetHistoryModel.find({ user_id: strId }).sort({ created_at: -1 }).limit(15);
      return items.map(it => it.toObject());
    } catch (e) {
      console.warn('Mongo getUserHistory fallback:', e.message);
    }
  }
  return memoryHistory.filter(h => h.user_id === strId).slice(0, 15);
}

async function getLeaderboard() {
  if (isMongoConnected) {
    try {
      const top = await UserModel.find().sort({ best_win: -1, bet_volume: -1 }).limit(10);
      return top.map(u => ({
        id: u.id,
        username: u.username,
        first_name: u.first_name,
        photo_url: u.photo_url,
        best_win: u.best_win,
        bet_volume: u.bet_volume,
        level: u.level
      }));
    } catch (e) {
      console.warn('Mongo getLeaderboard fallback:', e.message);
    }
  }

  const list = Array.from(memoryUsers.values());
  list.sort((a, b) => (b.best_win || 0) - (a.best_win || 0));
  return list.slice(0, 10).map(u => ({
    id: u.id,
    username: u.username,
    first_name: u.first_name,
    photo_url: u.photo_url,
    best_win: u.best_win,
    bet_volume: u.bet_volume,
    level: u.level
  }));
}

async function getUserInventory(userId) {
  const strId = String(userId);
  if (isMongoConnected) {
    try {
      const list = await InventoryModel.find({ user_id: strId }).sort({ createdAt: -1 });
      return list.map(item => item.toObject());
    } catch (e) {
      console.warn('Mongo getUserInventory fallback:', e.message);
    }
  }

  const res = [];
  for (const item of memoryInventory.values()) {
    if (item.user_id === strId) res.push({ ...item });
  }
  return res;
}

async function addItemToInventory(userId, itemData) {
  const strId = String(userId);
  const itemId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id: itemId,
    user_id: strId,
    item_name: itemData.name,
    item_emoji: itemData.emoji || '🎁',
    sell_price: itemData.price || 25
  };

  if (isMongoConnected) {
    try {
      const created = await InventoryModel.create(record);
      return created.toObject();
    } catch (e) {
      console.warn('Mongo addItemToInventory fallback:', e.message);
    }
  }

  memoryInventory.set(itemId, record);
  return { ...record };
}

async function removeItemFromInventory(userId, itemId) {
  const strId = String(userId);
  const strItemId = String(itemId);

  if (isMongoConnected) {
    try {
      const deleted = await InventoryModel.findOneAndDelete({ id: strItemId, user_id: strId });
      if (deleted) return deleted.toObject();
    } catch (e) {
      console.warn('Mongo removeItemFromInventory fallback:', e.message);
    }
  }

  const mem = memoryInventory.get(strItemId);
  if (mem && mem.user_id === strId) {
    memoryInventory.delete(strItemId);
    return { ...mem };
  }
  return null;
}

async function syncPvpStateToDb(pvpState) {
  memPvpState = { ...pvpState };
  if (isMongoConnected) {
    try {
      await PvpGameModel.findOneAndUpdate(
        { game_id: 'active_round' },
        {
          status: pvpState.status,
          countdown: pvpState.countdown,
          total_pot: pvpState.total_pot,
          bets: pvpState.bets,
          winner_id: pvpState.winner_id,
          winner_name: pvpState.winner_name,
          winning_degree: pvpState.winning_degree
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('Mongo syncPvpStateToDb fallback:', e.message);
    }
  }
}

// ==========================================
// 2. EXPRESS & STATIC MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 3. КОЛЕСО УДАЧИ (WHEEL OF FORTUNE)
// ==========================================
// Призы исключительно в ⭐ и коллекционные подарки
const WHEEL_SECTORS = [
  { id: 0, text: '⭐ 10', type: 'stars', amount: 10, color: '#1e293b' },
  { id: 1, text: '🎁 Подарок', type: 'item', item: { name: 'Сюрприз Zet', emoji: '🎁', price: 25 }, color: '#312e81' },
  { id: 2, text: '⭐ 25', type: 'stars', amount: 25, color: '#1e293b' },
  { id: 3, text: '⭐ 50', type: 'stars', amount: 50, color: '#065f46' },
  { id: 4, text: '💎 Алмаз Zet', type: 'item', item: { name: 'Алмаз Zet', emoji: '💎', price: 100 }, color: '#1e1b4b' },
  { id: 5, text: '⭐ 5', type: 'stars', amount: 5, color: '#1e293b' },
  { id: 6, text: '⭐ 100', type: 'stars', amount: 100, color: '#b45309' },
  { id: 7, text: '👑 Корона Zet', type: 'item', item: { name: 'Корона Zet', emoji: '👑', price: 250 }, color: '#4c1d95' },
  { id: 8, text: '⭐ 20', type: 'stars', amount: 20, color: '#1e293b' },
  { id: 9, text: '🚀 Ракета Zet', type: 'item', item: { name: 'Ракета Zet', emoji: '🚀', price: 500 }, color: '#701a75' }
];
const SPIN_COST = 20; // 20 ⭐

// ==========================================
// 4. ДВИЖОК ИГРЫ КРАШ (CRASH ENGINE)
// ==========================================
class CrashEngine {
  constructor() {
    this.state = 'betting'; // 'betting', 'active', 'crashed'
    this.multiplier = 1.00;
    this.crashPoint = 1.00;
    this.betCountdown = 5;
    this.timer = null;
    this.startTime = 0;
    this.bets = [];
  }

  generateCrashPoint() {
    const rand = Math.random();
    // 6% мгновенный краш на 1.00x
    if (rand < 0.06) return 1.00;
    const r = Math.random();
    const point = Number((0.95 / (1 - r)).toFixed(2));
    return Math.min(Math.max(point, 1.01), 150.00);
  }

  startBettingPhase() {
    this.state = 'betting';
    this.multiplier = 1.00;
    this.bets = [];
    this.betCountdown = 5;

    io.emit('crash_state', {
      state: 'betting',
      multiplier: 1.00,
      countdown: this.betCountdown,
      bets: this.getPublicBets()
    });

    const interval = setInterval(() => {
      this.betCountdown -= 1;
      if (this.betCountdown > 0) {
        io.emit('crash_countdown', { countdown: this.betCountdown });
      } else {
        clearInterval(interval);
        this.startFlight();
      }
    }, 1000);
  }

  startFlight() {
    this.state = 'active';
    this.multiplier = 1.00;
    this.crashPoint = this.generateCrashPoint();
    this.startTime = Date.now();

    io.emit('crash_state', {
      state: 'active',
      multiplier: 1.00,
      bets: this.getPublicBets()
    });

    this.timer = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.multiplier = Number((1.00 * Math.pow(Math.E, 0.06 * elapsed)).toFixed(2));

      if (this.multiplier >= this.crashPoint) {
        this.triggerCrash();
      } else {
        io.emit('crash_tick', {
          multiplier: this.multiplier,
          elapsed
        });
      }
    }, 100);
  }

  async triggerCrash() {
    clearInterval(this.timer);
    this.state = 'crashed';

    for (const b of this.bets) {
      if (!b.cashedOut) {
        await recordUserGameResult(b.userId, b.bet, 0, 'Краш', this.crashPoint);
      }
    }

    io.emit('crash_state', {
      state: 'crashed',
      multiplier: this.crashPoint,
      bets: this.getPublicBets()
    });

    setTimeout(() => {
      this.startBettingPhase();
    }, 3500);
  }

  getPublicBets() {
    return this.bets.map(b => ({
      userId: b.userId,
      username: b.username,
      firstName: b.firstName,
      photo_url: b.photo_url || b.photoUrl || "",
      photoUrl: b.photo_url || b.photoUrl || "",
      first_name: b.first_name || b.firstName || "Игрок",
      bet: b.bet,
      cashedOut: b.cashedOut,
      cashedMult: b.cashedMult
    }));
  }

  getState() {
    return {
      state: this.state,
      multiplier: this.multiplier,
      countdown: this.betCountdown,
      bets: this.getPublicBets()
    };
  }
}

const crashEngine = new CrashEngine();
crashEngine.startBettingPhase();

// ==========================================
// 5. ДВИЖОК ИГРЫ КРАСНОЕ / ЧЁРНОЕ
// ==========================================
const redBlackEngine = {
  state: 'betting', // 'betting', 'rolling'
  timeLeft: 15,
  bets: [], // { userId, username, firstName, photoUrl, color, bet, socketId }
  lastResult: null,

  getState() {
    const redCount = this.bets.filter(b => b.color === 'red').length;
    const blackCount = this.bets.filter(b => b.color === 'black').length;
    const redTotal = this.bets.filter(b => b.color === 'red').reduce((acc, b) => acc + b.bet, 0);
    const blackTotal = this.bets.filter(b => b.color === 'black').reduce((acc, b) => acc + b.bet, 0);

    return {
      state: this.state,
      timeLeft: this.timeLeft,
      redCount,
      blackCount,
      redTotal,
      blackTotal,
      bets: this.bets.map(b => ({
        userId: b.userId,
        username: b.username,
        firstName: b.firstName,
        photo_url: b.photo_url || b.photoUrl || "",
        photoUrl: b.photo_url || b.photoUrl || "",
        first_name: b.first_name || b.firstName || "Игрок",
        color: b.color,
        bet: b.bet
      }))
    };
  },

  tick() {
    this.timeLeft -= 1;

    if (this.timeLeft > 3) {
      io.emit('red_black_tick', this.getState());
    } else if (this.timeLeft === 3 && this.state === 'betting') {
      this.state = 'rolling';
      const winningColor = Math.random() < 0.5 ? 'red' : 'black';
      this.lastResult = winningColor;

      io.emit('red_black_spin', {
        winningColor,
        timeLeft: this.timeLeft
      });

      setTimeout(async () => {
        for (const b of this.bets) {
          if (b.color === winningColor) {
            const winAmount = b.bet * 2;
            const updated = await adjustUserBalance(b.userId, winAmount);
            await recordUserGameResult(b.userId, b.bet, winAmount, 'Красное/Чёрное', 2.0);
            io.to(b.socketId).emit('balance_updated', { balance: updated.balance });
            io.to(b.socketId).emit('red_black_win', {
              winAmount,
              winningColor
            });
          } else {
            await recordUserGameResult(b.userId, b.bet, 0, 'Красное/Чёрное', 0);
            io.to(b.socketId).emit('red_black_lose', {
              winningColor,
              lostAmount: b.bet
            });
          }
        }
      }, 2800);
    }

    if (this.timeLeft <= 0) {
      this.state = 'betting';
      this.timeLeft = 15;
      this.bets = [];
      io.emit('red_black_tick', this.getState());
    }
  }
};

setInterval(() => redBlackEngine.tick(), 1000);

// ==========================================
// 6. ДВИЖОК PvP КОЛЕСО (С MONGODB СИНХРОНИЗАЦИЕЙ)
// ==========================================
const pvpWheelEngine = {
  state: 'waiting', // waiting, spinning
  countdown: 15,
  bets: [], // { userId, username, firstName, photoUrl, bet, color, startAngle, endAngle, percent, socketId }
  totalPot: 0,
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'],

  getState() {
    return {
      status: this.state,
      countdown: this.countdown,
      totalPot: this.totalPot,
      playersCount: this.bets.length,
      bets: this.bets.map(b => ({
        userId: b.userId,
        username: b.username,
        firstName: b.firstName,
        photo_url: b.photo_url || b.photoUrl || "",
        photoUrl: b.photo_url || b.photoUrl || "",
        first_name: b.first_name || b.firstName || "Игрок",
        bet: b.bet,
        color: b.color,
        percent: b.percent,
        startAngle: b.startAngle,
        endAngle: b.endAngle
      }))
    };
  },

  addBet(user, betAmount, socketId) {
    const existing = this.bets.find(b => b.userId === user.id);
    if (existing) {
      existing.bet += betAmount;
    } else {
      this.bets.push({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        photoUrl: user.photo_url || '',
        bet: betAmount,
        color: '#f59e0b',
        startAngle: 0,
        endAngle: 360,
        percent: 100,
        socketId
      });
    }

    this.totalPot = this.bets.reduce((acc, b) => acc + b.bet, 0);

    let curAngle = 0;
    this.bets.forEach((b, idx) => {
      b.color = this.colors[idx % this.colors.length];
      b.percent = this.totalPot > 0 ? Number(((b.bet / this.totalPot) * 100).toFixed(1)) : 0;
      const sliceSize = this.totalPot > 0 ? (b.bet / this.totalPot) * 360 : 0;
      b.startAngle = curAngle;
      b.endAngle = curAngle + sliceSize;
      curAngle += sliceSize;
    });

    syncPvpStateToDb({
      game_id: 'active_round',
      status: this.state,
      countdown: this.countdown,
      total_pot: this.totalPot,
      bets: this.bets.map(b => ({
        user_id: b.userId,
        username: b.username,
        first_name: b.firstName,
        photo_url: b.photoUrl,
        bet: b.bet,
        color: b.color,
        start_angle: b.startAngle,
        end_angle: b.endAngle,
        percent: b.percent
      })),
      winner_id: null,
      winner_name: null,
      winning_degree: null
    });
  },

  async tick() {
    if (this.state === 'waiting') {
      if (this.bets.length >= 2) {
        this.countdown -= 1;
        io.emit('pvp_tick', this.getState());

        if (this.countdown <= 0) {
          await this.spinWheel();
        }
      } else {
        this.countdown = 15;
        io.emit('pvp_tick', this.getState());
      }
    }
  },

  async spinWheel() {
    this.state = 'spinning';

    const randomDegree = Math.random() * 360;
    let winningPlayer = this.bets[0];

    for (const b of this.bets) {
      if (randomDegree >= b.startAngle && randomDegree < b.endAngle) {
        winningPlayer = b;
        break;
      }
    }

    const targetRotation = 360 * 5 + randomDegree;

    await syncPvpStateToDb({
      game_id: 'active_round',
      status: 'spinning',
      countdown: 0,
      total_pot: this.totalPot,
      bets: this.bets.map(b => ({
        user_id: b.userId,
        username: b.username,
        first_name: b.firstName,
        photo_url: b.photoUrl,
        bet: b.bet,
        color: b.color,
        start_angle: b.startAngle,
        end_angle: b.endAngle,
        percent: b.percent
      })),
      winner_id: winningPlayer.userId,
      winner_name: winningPlayer.firstName,
      winning_degree: randomDegree
    });

    io.emit('pvp_spin_start', {
      targetRotation,
      winningDegree: randomDegree,
      winnerId: winningPlayer.userId,
      winnerName: winningPlayer.firstName,
      totalPot: this.totalPot
    });

    setTimeout(async () => {
      try {
        const winnerId = winningPlayer.userId;
        const prize = this.totalPot;

        const updated = await adjustUserBalance(winnerId, prize);
        await recordUserGameResult(winnerId, winningPlayer.bet, prize, 'PvP Колесо', prize / (winningPlayer.bet || 1));

        for (const b of this.bets) {
          if (b.userId !== winnerId) {
            await recordUserGameResult(b.userId, b.bet, 0, 'PvP Колесо', 0);
          }
        }

        io.emit('pvp_round_end', {
          winnerId,
          winnerName: winningPlayer.firstName,
          prize
        });

        setTimeout(async () => {
          this.state = 'waiting';
          this.countdown = 15;
          this.bets = [];
          this.totalPot = 0;

          await syncPvpStateToDb({
            game_id: 'active_round',
            status: 'waiting',
            countdown: 15,
            total_pot: 0,
            bets: [],
            winner_id: null,
            winner_name: null,
            winning_degree: null
          });

          io.emit('pvp_state', this.getState());
        }, 3000);

      } catch (err) {
        console.error('Ошибка завершения PvP:', err);
      }
    }, 5500);
  }
};

setInterval(() => pvpWheelEngine.tick(), 1000);

// История Plinko для живой ленты
const plinkoFeed = [];

// ==========================================
// 7. WEBSOCKET ОБРАБОТЧИКИ (SOCKET.IO)
// ==========================================
io.on('connection', (socket) => {
  let currentUser = null;

  // 1. АВТОРИЗАЦИЯ ЧЕРЕЗ TELEGRAM WEBAPP
  socket.on('auth', async (data) => {
    try {
      const initData = data?.initData || '';

      if (!initData || typeof initData !== 'string') {
        socket.emit('auth_error', { message: 'Вход разрешён исключительно через Telegram!' });
        return socket.disconnect(true);
      }

      const params = new URLSearchParams(initData);
      const userParam = params.get('user');

      if (!userParam) {
        socket.emit('auth_error', { message: 'Вход разрешён исключительно через Telegram!' });
        return socket.disconnect(true);
      }

      let tgUser;
      try {
        tgUser = JSON.parse(userParam);
      } catch (err) {
        socket.emit('auth_error', { message: 'Ошибка разбора данных профиля Telegram!' });
        return socket.disconnect(true);
      }

      if (!tgUser || !tgUser.id) {
        socket.emit('auth_error', { message: 'Профиль Telegram не распознан!' });
        return socket.disconnect(true);
      }

      currentUser = await saveOrUpdateUser(tgUser);
      socket.userId = currentUser.id;

      const inventory = await getUserInventory(currentUser.id);

      socket.emit('auth_success', {
        user: currentUser,
        inventory,
        wheelSectors: WHEEL_SECTORS,
        spinCost: SPIN_COST,
        plinkoFeed
      });

      socket.emit('crash_state', crashEngine.getState());
      socket.emit('red_black_tick', redBlackEngine.getState());
      socket.emit('pvp_state', pvpWheelEngine.getState());
    } catch (err) {
      console.error('Ошибка в auth:', err);
      socket.emit('auth_error', { message: 'Внутренняя ошибка авторизации' });
    }
  });

  // 2. ПОПОЛНЕНИЕ БАЛАНСА В ЗВЁЗДАХ (⭐)
  socket.on('deposit_stars', async ({ amount }) => {
    if (!currentUser) return;
    try {
      const addVal = parseInt(amount, 10);
      if (isNaN(addVal) || addVal <= 0 || addVal > 100000) {
        return socket.emit('deposit_error', { message: 'Неверная сумма пополнения' });
      }

      const updated = await adjustUserBalance(currentUser.id, addVal);
      currentUser.balance = updated.balance;

      socket.emit('deposit_success', {
        amount: addVal,
        balance: updated.balance
      });
      socket.emit('balance_updated', { balance: updated.balance });
    } catch (err) {
      console.error('Ошибка deposit_stars:', err);
      socket.emit('deposit_error', { message: 'Не удалось пополнить счёт' });
    }
  });

  // 3. КОЛЕСО УДАЧИ: ВРАЩЕНИЕ
  socket.on('spin_wheel', async () => {
    if (!currentUser) return;
    try {
      const user = await findUserById(currentUser.id);
      if (!user || user.balance < SPIN_COST) {
        return socket.emit('wheel_error', { message: `Недостаточно звёзд! Требуется ⭐ ${SPIN_COST}` });
      }

      await adjustUserBalance(user.id, -SPIN_COST);
      const updatedUser = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updatedUser.balance });

      const sectorIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
      const prize = WHEEL_SECTORS[sectorIndex];

      socket.emit('wheel_spin_start', { sectorIndex });

      setTimeout(async () => {
        try {
          if (prize.type === 'stars') {
            const finalUser = await adjustUserBalance(user.id, prize.amount);
            await recordUserGameResult(user.id, SPIN_COST, prize.amount, 'Колесо Удачи', prize.amount / SPIN_COST);
            socket.emit('balance_updated', { balance: finalUser.balance });
            socket.emit('wheel_spin_result', {
              prize,
              balance: finalUser.balance
            });
          } else if (prize.type === 'item') {
            const addedItem = await addItemToInventory(user.id, prize.item);
            await recordUserGameResult(user.id, SPIN_COST, prize.item.price, 'Колесо Удачи', prize.item.price / SPIN_COST);
            const newInv = await getUserInventory(user.id);
            socket.emit('inventory_updated', { inventory: newInv });
            socket.emit('wheel_spin_result', {
              prize,
              item: addedItem
            });
          }
        } catch (e) {
          console.error('Ошибка начисления приза колеса:', e);
        }
      }, 4200);

    } catch (err) {
      console.error('Ошибка spin_wheel:', err);
      socket.emit('wheel_error', { message: 'Ошибка при вращении колеса' });
    }
  });

  // 4. ИНВЕНТАРЬ: ПРОДАТЬ ПРЕДМЕТ ЗА ЗВЁЗДЫ (⭐)
  socket.on('sell_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const removed = await removeItemFromInventory(currentUser.id, itemId);
      if (!removed) {
        return socket.emit('inventory_error', { message: 'Предмет не найден в вашем инвентаре' });
      }

      const sellPrice = removed.sell_price || 25;
      const updatedUser = await adjustUserBalance(currentUser.id, sellPrice);

      const newInv = await getUserInventory(currentUser.id);
      socket.emit('item_sold', {
        itemId,
        starsEarned: sellPrice,
        balance: updatedUser.balance,
        inventory: newInv
      });
      socket.emit('balance_updated', { balance: updatedUser.balance });
    } catch (err) {
      console.error('Ошибка sell_item:', err);
      socket.emit('inventory_error', { message: 'Ошибка продажи предмета' });
    }
  });

  // 5. ИНВЕНТАРЬ: ВЫВОД ПРЕДМЕТА
  socket.on('withdraw_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const removed = await removeItemFromInventory(currentUser.id, itemId);
      if (!removed) {
        return socket.emit('inventory_error', { message: 'Предмет не найден для вывода' });
      }

      const newInv = await getUserInventory(currentUser.id);
      socket.emit('item_withdrawn', {
        itemId,
        itemName: removed.item_name,
        inventory: newInv
      });
    } catch (err) {
      console.error('Ошибка withdraw_item:', err);
      socket.emit('inventory_error', { message: 'Ошибка вывода предмета' });
    }
  });

  // 6. КРАШ: СТАВКА
  const handlePlaceBet = async ({ amount }) => {
    if (!currentUser) return;
    try {
      if (crashEngine.state !== 'betting') {
        return socket.emit('crash_error', { message: 'Раунд уже начался, дождитесь следующего' });
      }

      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('crash_error', { message: 'Неверная сумма ставки' });
      }

      const user = await findUserById(currentUser.id);
      if (!user || user.balance < betVal) {
        return socket.emit('crash_error', { message: 'Недостаточно звёзд на балансе' });
      }

      if (crashEngine.bets.some(b => b.userId === user.id)) {
        return socket.emit('crash_error', { message: 'Вы уже сделали ставку в этом раунде' });
      }

      await adjustUserBalance(user.id, -betVal);
      const updatedUser = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updatedUser.balance });

      crashEngine.bets.push({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        photoUrl: user.photo_url || '',
        bet: betVal,
        cashedOut: false,
        cashedMult: 0,
        socketId: socket.id
      });

      io.emit('crash_bets_update', crashEngine.getPublicBets());
      socket.emit('crash_bet_placed', { bet: betVal, balance: updatedUser.balance });
    } catch (err) {
      console.error('Ошибка crash_bet:', err);
      socket.emit('crash_error', { message: 'Ошибка размещения ставки' });
    }
  };

  socket.on('place_bet', handlePlaceBet);
  socket.on('crash_bet', handlePlaceBet);

  // КРАШ: ЗАБРАТЬ ВЫИГРЫШ (CASHOUT)
  const handleCashout = async () => {
    if (!currentUser) return;
    try {
      if (crashEngine.state !== 'active') {
        return socket.emit('crash_error', { message: 'Нельзя забрать сейчас' });
      }

      const betRecord = crashEngine.bets.find(b => b.userId === currentUser.id && !b.cashedOut);
      if (!betRecord) {
        return socket.emit('crash_error', { message: 'Активная ставка не найдена' });
      }

      betRecord.cashedOut = true;
      betRecord.cashedMult = crashEngine.multiplier;
      const winStars = Math.floor(betRecord.bet * crashEngine.multiplier);

      const updated = await adjustUserBalance(currentUser.id, winStars);
      await recordUserGameResult(currentUser.id, betRecord.bet, winStars, 'Краш', crashEngine.multiplier);

      socket.emit('balance_updated', { balance: updated.balance });
      socket.emit('crash_cashout_success', {
        winAmount: winStars,
        multiplier: crashEngine.multiplier,
        balance: updated.balance
      });

      io.emit('crash_bets_update', crashEngine.getPublicBets());
    } catch (err) {
      console.error('Ошибка cashout:', err);
      socket.emit('crash_error', { message: 'Ошибка cashout' });
    }
  };

  socket.on('cashout', handleCashout);
  socket.on('crash_cashout', handleCashout);

  // 7. МИНЫ: СТАРТ И ИГРА
  const activeMinesGames = new Map();

  socket.on('mines_start', async ({ bet, minesCount = 3 }) => {
    if (!currentUser) return;
    try {
      const betVal = parseInt(bet, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('mines_error', { message: 'Неверная ставка' });
      }

      const user = await findUserById(currentUser.id);
      if (!user || user.balance < betVal) {
        return socket.emit('mines_error', { message: 'Недостаточно звёзд' });
      }

      await adjustUserBalance(user.id, -betVal);
      const updated = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updated.balance });

      const mines = new Set();
      const count = Math.min(Math.max(minesCount, 1), 24);
      while (mines.size < count) {
        mines.add(Math.floor(Math.random() * 25));
      }

      activeMinesGames.set(socket.id, {
        userId: user.id,
        bet: betVal,
        minesCount: count,
        mines: Array.from(mines),
        openedGems: new Set(),
        currentStep: 0,
        isFinished: false
      });

      socket.emit('mines_started', {
        minesCount: count,
        bet: betVal,
        balance: updated.balance
      });
    } catch (err) {
      console.error('Ошибка mines_start:', err);
      socket.emit('mines_error', { message: 'Ошибка старта игры Мины' });
    }
  });

  socket.on('mines_click', async ({ cellIndex }) => {
    const game = activeMinesGames.get(socket.id);
    if (!game || game.isFinished) return;

    const idx = parseInt(cellIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 24 || game.openedGems.has(idx)) return;

    if (game.mines.includes(idx)) {
      game.isFinished = true;
      activeMinesGames.delete(socket.id);
      await recordUserGameResult(game.userId, game.bet, 0, 'Мины', 0);

      socket.emit('mines_boom', {
        cellIndex: idx,
        allMines: game.mines
      });
      return;
    }

    game.openedGems.add(idx);
    game.currentStep += 1;

    const multipliers = [1.15, 1.35, 1.62, 1.98, 2.45, 3.10, 4.00, 5.25, 7.10, 10.0, 14.5, 22.0, 35.0, 60.0, 110.0];
    const currentMultiplier = multipliers[Math.min(game.currentStep - 1, multipliers.length - 1)];
    const nextMultiplier = multipliers[Math.min(game.currentStep, multipliers.length - 1)];
    const currentWin = Math.floor(game.bet * currentMultiplier);

    socket.emit('mines_gem', {
      cellIndex: idx,
      step: game.currentStep,
      currentMultiplier,
      nextMultiplier,
      currentWin
    });
  });

  socket.on('mines_cashout', async () => {
    const game = activeMinesGames.get(socket.id);
    if (!game || game.isFinished || game.currentStep === 0) return;

    game.isFinished = true;
    activeMinesGames.delete(socket.id);

    const multipliers = [1.15, 1.35, 1.62, 1.98, 2.45, 3.10, 4.00, 5.25, 7.10, 10.0, 14.5, 22.0, 35.0, 60.0, 110.0];
    const multiplier = multipliers[Math.min(game.currentStep - 1, multipliers.length - 1)];
    const winAmount = Math.floor(game.bet * multiplier);

    const updated = await adjustUserBalance(game.userId, winAmount);
    await recordUserGameResult(game.userId, game.bet, winAmount, 'Мины', multiplier);

    socket.emit('balance_updated', { balance: updated.balance });
    socket.emit('mines_cashout_success', {
      winAmount,
      multiplier,
      balance: updated.balance,
      allMines: game.mines
    });
  });

  // 8. ПЛИНКО
  socket.on('plinko_drop', async ({ bet }) => {
    if (!currentUser) return;
    try {
      const betVal = parseInt(bet, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('plinko_error', { message: 'Неверная ставка' });
      }

      const user = await findUserById(currentUser.id);
      if (!user || user.balance < betVal) {
        return socket.emit('plinko_error', { message: 'Недостаточно звёзд' });
      }

      await adjustUserBalance(user.id, -betVal);
      const updated = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updated.balance });

      const rows = 6;
      const pathArr = [];
      let rightCount = 0;

      for (let r = 0; r < rows; r++) {
        const dir = Math.random() < 0.5 ? 0 : 1;
        pathArr.push(dir);
        if (dir === 1) rightCount++;
      }

      const slotIndex = rightCount;
      const multipliers = [5.0, 2.0, 1.1, 0.5, 1.1, 2.0, 5.0];
      const multiplier = multipliers[slotIndex] || 1.0;
      const winAmount = Math.floor(betVal * multiplier);

      socket.emit('plinko_ball_start', {
        path: pathArr,
        slotIndex,
        multiplier,
        winAmount
      });

      setTimeout(async () => {
        try {
          let finalUser = updated;
          if (winAmount > 0) {
            finalUser = await adjustUserBalance(user.id, winAmount);
            socket.emit('balance_updated', { balance: finalUser.balance });
          }

          await recordUserGameResult(user.id, betVal, winAmount, 'Плинко', multiplier);

          socket.emit('plinko_finished', {
            slotIndex,
            multiplier,
            winAmount,
            balance: finalUser.balance
          });

          const feedItem = {
            id: `plinko_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId: user.id,
            username: user.username,
            firstName: user.first_name,
            photoUrl: user.photo_url || '',
            bet: betVal,
            multiplier,
            winAmount,
            isWin: winAmount > betVal,
            timestamp: Date.now()
          };

          plinkoFeed.unshift(feedItem);
          if (plinkoFeed.length > 25) plinkoFeed.pop();

          io.emit('plinko_feed_item', feedItem);
        } catch (e) {
          console.error('Ошибка начисления Plinko:', e);
        }
      }, 2100);

    } catch (err) {
      console.error('Ошибка plinko_drop:', err);
      socket.emit('plinko_error', { message: 'Ошибка броска Plinko' });
    }
  });

  // 9. КРАСНОЕ ИЛИ ЧЕРНОЕ
  socket.on('red_black_bet', async ({ color, amount }) => {
    if (!currentUser) return;
    try {
      if (redBlackEngine.state !== 'betting') {
        return socket.emit('red_black_error', { message: 'Раунд крутится, дождитесь завершения' });
      }

      if (color !== 'red' && color !== 'black') {
        return socket.emit('red_black_error', { message: 'Выберите Красное или Чёрное' });
      }

      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('red_black_error', { message: 'Неверная ставка' });
      }

      const user = await findUserById(currentUser.id);
      if (!user || user.balance < betVal) {
        return socket.emit('red_black_error', { message: 'Недостаточно звёзд' });
      }

      await adjustUserBalance(user.id, -betVal);
      const updatedUser = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updatedUser.balance });

      redBlackEngine.bets.push({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        photoUrl: user.photo_url || '',
        color,
        bet: betVal,
        socketId: socket.id
      });

      io.emit('red_black_tick', redBlackEngine.getState());
      socket.emit('red_black_bet_success', { color, amount: betVal });
    } catch (err) {
      console.error('Ошибка red_black_bet:', err);
      socket.emit('red_black_error', { message: 'Ошибка ставки' });
    }
  });

  // 10. PvP КОЛЕСО
  socket.on('pvp_bet', async ({ amount }) => {
    if (!currentUser) return;
    try {
      if (pvpWheelEngine.state !== 'waiting') {
        return socket.emit('pvp_error', { message: 'Раунд уже крутится, подождите завершения' });
      }
      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('pvp_error', { message: 'Неверная сумма ставки' });
      }

      const user = await findUserById(currentUser.id);
      if (!user || user.balance < betVal) {
        return socket.emit('pvp_error', { message: 'Недостаточно звёзд' });
      }

      await adjustUserBalance(user.id, -betVal);
      const updated = await findUserById(user.id);
      socket.emit('balance_updated', { balance: updated.balance });

      pvpWheelEngine.addBet(user, betVal, socket.id);
      io.emit('pvp_state', pvpWheelEngine.getState());
      socket.emit('pvp_bet_success', { amount: betVal });
    } catch (err) {
      console.error('Ошибка pvp_bet:', err);
      socket.emit('pvp_error', { message: 'Ошибка ставки в PvP' });
    }
  });

  // 11. АПГРЕЙДЕР (UPGRADER)
  socket.on('upgrader_spin', async ({ betType, starsAmount, itemId, multiplierKey }) => {
    if (!currentUser) return;
    try {
      const multChances = {
        '1.5': { mult: 1.5, chance: 60 },
        '2.0': { mult: 2.0, chance: 45 },
        '5.0': { mult: 5.0, chance: 20 },
        '10.0': { mult: 10.0, chance: 10 }
      };

      const cfg = multChances[multiplierKey] || multChances['2.0'];
      let baseValue = 0;
      let usedItem = null;

      if (betType === 'stars') {
        baseValue = parseInt(starsAmount, 10);
        if (isNaN(baseValue) || baseValue <= 0) {
          return socket.emit('upgrader_error', { message: 'Неверная ставка звёзд' });
        }
        const user = await findUserById(currentUser.id);
        if (!user || user.balance < baseValue) {
          return socket.emit('upgrader_error', { message: 'Недостаточно звёзд на балансе' });
        }
        await adjustUserBalance(user.id, -baseValue);
        const updated = await findUserById(user.id);
        socket.emit('balance_updated', { balance: updated.balance });
      } else {
        usedItem = await removeItemFromInventory(currentUser.id, itemId);
        if (!usedItem) {
          return socket.emit('upgrader_error', { message: 'Предмет не найден в инвентаре' });
        }
        baseValue = usedItem.sell_price || 25;
        const newInv = await getUserInventory(currentUser.id);
        socket.emit('inventory_updated', { inventory: newInv });
      }

      const roll = Math.random() * 100;
      const isWin = roll <= cfg.chance;
      const potentialWin = Math.floor(baseValue * cfg.mult);

      socket.emit('upgrader_spin_start', {
        isWin,
        roll: Number(roll.toFixed(1)),
        winChance: cfg.chance,
        potentialWin
      });

      setTimeout(async () => {
        try {
          let currentBalance = currentUser.balance;
          if (isWin) {
            const updated = await adjustUserBalance(currentUser.id, potentialWin);
            currentBalance = updated.balance;
            await recordUserGameResult(currentUser.id, baseValue, potentialWin, 'Апгрейдер', cfg.mult);
            socket.emit('balance_updated', { balance: updated.balance });
          } else {
            await recordUserGameResult(currentUser.id, baseValue, 0, 'Апгрейдер', 0);
          }

          socket.emit('upgrader_finished', {
            isWin,
            winStars: isWin ? potentialWin : 0,
            balance: currentBalance
          });
        } catch (e) {
          console.error('Ошибка начисления upgrader:', e);
        }
      }, 3100);

    } catch (err) {
      console.error('Ошибка upgrader_spin:', err);
      socket.emit('upgrader_error', { message: 'Ошибка в апгрейдере' });
    }
  });

  // 12. ИСТОРИЯ И ЛИДЕРЫ
  socket.on('get_history', async () => {
    if (!currentUser) return;
    try {
      const history = await getUserHistory(currentUser.id);
      socket.emit('history_data', { history });
    } catch (e) {
      socket.emit('history_error', { message: 'Не удалось загрузить историю' });
    }
  });

  socket.on('get_leaderboard', async () => {
    try {
      const leaders = await getLeaderboard();
      socket.emit('leaderboard_data', { leaders });
    } catch (e) {
      socket.emit('leaderboard_error', { message: 'Не удалось загрузить лидеров' });
    }
  });

  socket.on('disconnect', () => {
    // Очистка при разрыве соединения
    activeMinesGames.delete(socket.id);
  });
});

// ==========================================
// 8. ЗАПУСК СЕРВЕРА
// ==========================================
async function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🎰 ZetGambling запущен на порту: ${PORT}`);
    console.log(`⭐ Валюта: Только Звёзды (⭐)`);
    console.log(`🗄️ База данных: Mongoose (MongoDB: ${MONGODB_URI})`);
    console.log(`🛡️ Доступ: Строго через Telegram WebApp`);
    console.log(`===============================================`);
  });

  initDatabase().catch(err => {
    console.warn('[ZetGambling] initDatabase catch:', err.message);
  });
}

startServer();
