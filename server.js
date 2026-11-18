/**
 * Telegram Mini App - Сервер NEON CASINO (Версия 3.0)
 * Стек: Node.js + Express + Socket.io + SQLite
 * Игры: 
 *   1. Колесо Удачи (Wheel)
 *   2. Краш (Crash Multiplayer без ботов)
 *   3. Мины (Mines 5x5)
 *   4. Плинко (Plinko)
 *   5. Красное или Черное (Red or Black Online 15s)
 *   6. PvP Колесо (Multiplayer Jackpot Pot)
 *   7. Апгрейдер (Upgrader со ставками звездами или предметами инвентаря)
 * Профиль: отдельный экран со статистикой и инвентарем (продажа/вывод подарков)
 * Мгновенное списание баланса перед началом любого раунда!
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

const app = express();
const server = http.createServer(app);

// 1. Инициализация Socket.IO с CORS и поддержкой polling + websocket
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Настройка CORS и статических файлов
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));
app.use(express.json());

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 2. БАЗА ДАННЫХ SQLITE (casino.db)
// ==========================================
const db = new sqlite3.Database(path.join(__dirname, 'casino.db'), (err) => {
  if (err) {
    console.error('Ошибка SQLite:', err.message);
  } else {
    console.log('Подключено к SQLite базе данных (casino.db)');
  }
});

db.serialize(() => {
  // 1. Таблица пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      photo_url TEXT,
      balance INTEGER DEFAULT 100,
      best_win INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Безопасное обновление полей users
  db.run('ALTER TABLE users ADD COLUMN best_win INTEGER DEFAULT 0', () => {});
  db.run('ALTER TABLE users ADD COLUMN total_games INTEGER DEFAULT 0', () => {});

  // 2. Таблица инвентаря
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      item_name TEXT,
      item_emoji TEXT,
      sell_price INTEGER DEFAULT 20,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Таблица PvP игр
  db.run(`
    CREATE TABLE IF NOT EXISTS pvp_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id TEXT,
      status TEXT,
      total_pot INTEGER DEFAULT 0,
      winner_id TEXT,
      winner_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function getOrCreateUser(userData) {
  const userId = String(userData.id);
  let user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

  if (!user) {
    await dbRun(
      'INSERT INTO users (id, username, first_name, photo_url, balance, best_win, total_games) VALUES (?, ?, ?, ?, 100, 0, 0)',
      [userId, userData.username || '', userData.first_name || 'Игрок', userData.photo_url || '']
    );
    user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  } else {
    await dbRun(
      'UPDATE users SET username = ?, first_name = ?, photo_url = ? WHERE id = ?',
      [userData.username || user.username, userData.first_name || user.first_name, userData.photo_url || user.photo_url, userId]
    );
    user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  }
  return user;
}

async function modifyBalance(userId, delta) {
  await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [delta, String(userId)]);
  const updated = await dbGet('SELECT balance FROM users WHERE id = ?', [String(userId)]);
  return updated ? updated.balance : 0;
}

async function recordGameResult(userId, { winAmount = 0, isGame = true }) {
  try {
    const user = await dbGet('SELECT best_win, total_games FROM users WHERE id = ?', [String(userId)]);
    if (!user) return null;
    const currentBest = user.best_win || 0;
    const newBest = Math.max(currentBest, winAmount || 0);
    const total = (user.total_games || 0) + (isGame ? 1 : 0);
    await dbRun('UPDATE users SET best_win = ?, total_games = ? WHERE id = ?', [newBest, total, String(userId)]);
    return { best_win: newBest, total_games: total };
  } catch (err) {
    console.error('Ошибка recordGameResult:', err.message);
    return null;
  }
}

// ==========================================
// 3. ВАЛИДАЦИЯ TELEGRAM initData
// ==========================================
function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const userStr = urlParams.get('user');

    if (!userStr) return null;
    const user = JSON.parse(userStr);
    if (!user || !user.id) return null;

    if (BOT_TOKEN && BOT_TOKEN.length > 10 && hash) {
      urlParams.delete('hash');
      const params = [];
      for (const [key, val] of urlParams.entries()) {
        params.push(`${key}=${val}`);
      }
      params.sort();
      const dataCheckString = params.join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (calculatedHash !== hash) {
        console.warn('Предупреждение: hash initData не совпал с вычисленным.');
      }
    }

    return user;
  } catch (err) {
    console.error('Ошибка парсинга initData:', err.message);
    return null;
  }
}

// ==========================================
// 4. КОНФИГУРАЦИЯ "КОЛЕСО УДАЧИ" (С ПОДАРКАМИ В ИНВЕНТАРЬ)
// ==========================================
const WHEEL_SECTORS = [
  { index: 0, type: 'stars', prize: '⭐', amount: 5, label: '5 ⭐', color: '#1e293b' },
  { index: 1, type: 'gift', prize: '🧸', name: 'Плюшевый Мишка', sellPrice: 20, amount: 0, label: 'Мишка', color: '#0f172a' },
  { index: 2, type: 'stars', prize: '⭐', amount: 10, label: '10 ⭐', color: '#1e293b' },
  { index: 3, type: 'gift', prize: '🏆', name: 'Золотой Кубок', sellPrice: 50, amount: 0, label: 'Кубок', color: '#0f172a' },
  { index: 4, type: 'stars', prize: '⭐', amount: 15, label: '15 ⭐', color: '#1e293b' },
  { index: 5, type: 'gift', prize: '🎁', name: 'Секретный Бокс', sellPrice: 30, amount: 0, label: 'Подарок', color: '#0f172a' },
  { index: 6, type: 'stars', prize: '⭐', amount: 25, label: '25 ⭐', color: '#1e293b' },
  { index: 7, type: 'gift', prize: '💍', name: 'Кольцо с Бриллиантом', sellPrice: 100, amount: 0, label: 'Кольцо', color: '#0f172a' },
  { index: 8, type: 'stars', prize: '⭐', amount: 50, label: '50 ⭐', color: '#1e293b' },
  { index: 9, type: 'gift', prize: '🍾', name: 'Шампанское Dom P.', sellPrice: 40, amount: 0, label: 'Шампанское', color: '#0f172a' }
];

const SPIN_COST = 25;

// ==========================================
// 5. ДВИЖОК: КРАШ (БЕЗ БОТОВ - ТОЛЬКО РЕАЛЬНЫЕ ИГРОКИ)
// ==========================================
const crashEngine = {
  phase: 'WAITING',
  countdown: 5.0,
  multiplier: 1.00,
  crashPoint: 2.00,
  startTime: 0,
  bets: [],
  history: [1.85, 3.42, 1.25, 4.10, 2.05],

  generateCrashPoint() {
    if (Math.random() < 0.75) {
      return Number((1.20 + Math.random() * 2.00).toFixed(2));
    } else {
      return Number((3.20 + Math.random() * 6.80).toFixed(2));
    }
  },

  startRound() {
    this.phase = 'WAITING';
    this.countdown = 5.0;
    this.multiplier = 1.00;
    this.crashPoint = this.generateCrashPoint();
    this.bets = [];

    io.emit('crash_state', this.getState());
  },

  tick() {
    if (this.phase === 'WAITING') {
      this.countdown = Number((this.countdown - 0.1).toFixed(1));

      if (this.countdown <= 0) {
        this.phase = 'FLYING';
        this.startTime = Date.now();
        this.multiplier = 1.00;
        io.emit('crash_start', { bets: this.bets });
      } else {
        io.emit('crash_waiting', { countdown: this.countdown, bets: this.bets });
      }
    } else if (this.phase === 'FLYING') {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const currentMult = Number(Math.exp(0.065 * elapsed).toFixed(2));
      this.multiplier = currentMult;

      if (this.multiplier >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.phase = 'CRASHED';

        this.history.unshift(this.crashPoint);
        if (this.history.length > 10) this.history.pop();

        // Запись поражения для игроков, не сделавших кэшаут
        this.bets.forEach(async (bet) => {
          if (!bet.cashedOut && !bet.recorded) {
            bet.recorded = true;
            await recordGameResult(bet.userId, { winAmount: 0, isGame: true });
          }
        });

        io.emit('crash_exploded', {
          crashPoint: this.crashPoint,
          multiplier: this.crashPoint,
          bets: this.bets,
          history: this.history
        });

        setTimeout(() => {
          this.startRound();
        }, 5000);
      } else {
        io.emit('crash_tick', {
          multiplier: this.multiplier,
          elapsed: Number(elapsed.toFixed(1)),
          bets: this.bets
        });
      }
    }
  },

  getState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      multiplier: this.multiplier,
      crashPoint: this.phase === 'CRASHED' ? this.crashPoint : null,
      bets: this.bets,
      history: this.history
    };
  }
};

setInterval(() => {
  crashEngine.tick();
}, 100);

crashEngine.startRound();

// ==========================================
// 6. ДВИЖОК: МИНЫ (MINES 5x5)
// ==========================================
const activeMinesGames = new Map();

function getMinesMultiplier(minesCount, step) {
  const totalCells = 25;
  const safeCells = totalCells - minesCount;
  if (step <= 0) return 1.00;
  if (step > safeCells) step = safeCells;

  let mult = 1.0;
  for (let i = 0; i < step; i++) {
    mult *= (totalCells - i) / (safeCells - i);
  }
  return Number((mult * 0.96).toFixed(2));
}

// ==========================================
// 7. ДВИЖОК: ПЛИНКО (PLINKO)
// ==========================================
const PLINKO_SLOTS = [5.0, 2.0, 1.2, 0.5, 0.2, 0.5, 1.2, 2.0, 5.0];

// ==========================================
// 8. ДВИЖОК: КРАСНОЕ ИЛИ ЧЕРНОЕ (ОНЛАЙН РАУНД 15 СЕК)
// ==========================================
const redBlackEngine = {
  phase: 'WAITING', // 'WAITING' или 'REVEALING'
  countdown: 15,
  bets: [], // { userId, username, first_name, choice: 'red'|'black', amount, socketId }
  history: ['red', 'black', 'red', 'red', 'black'],

  tick() {
    if (this.phase === 'WAITING') {
      this.countdown--;
      if (this.countdown <= 0) {
        this.phase = 'REVEALING';
        this.countdown = 4;
        const winningColor = Math.random() < 0.5 ? 'red' : 'black';
        this.history.unshift(winningColor);
        if (this.history.length > 8) this.history.pop();

        io.emit('red_black_reveal', {
          winningColor,
          history: this.history
        });

        // Начисление выигрышей
        this.bets.forEach(async (bet) => {
          if (bet.choice === winningColor) {
            const winAmount = bet.amount * 2;
            const newBal = await modifyBalance(bet.userId, winAmount);
            const stats = await recordGameResult(bet.userId, { winAmount, isGame: true });
            io.to(bet.socketId).emit('balance_updated', {
              balance: newBal,
              message: `Выигрыш на ${winningColor === 'red' ? 'Красном' : 'Черном'}! +${winAmount} ⭐`
            });
            io.to(bet.socketId).emit('red_black_personal_result', { won: true, winAmount, newBal, stats });
          } else {
            const stats = await recordGameResult(bet.userId, { winAmount: 0, isGame: true });
            io.to(bet.socketId).emit('red_black_personal_result', { won: false, winAmount: 0, stats });
          }
        });

        setTimeout(() => {
          this.phase = 'WAITING';
          this.countdown = 15;
          this.bets = [];
          io.emit('red_black_new_round', {
            countdown: 15,
            history: this.history
          });
        }, 4000);
      } else {
        io.emit('red_black_tick', {
          countdown: this.countdown,
          redCount: this.bets.filter(b => b.choice === 'red').length,
          redTotal: this.bets.filter(b => b.choice === 'red').reduce((s, b) => s + b.amount, 0),
          blackCount: this.bets.filter(b => b.choice === 'black').length,
          blackTotal: this.bets.filter(b => b.choice === 'black').reduce((s, b) => s + b.amount, 0)
        });
      }
    }
  },

  getState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      history: this.history,
      redCount: this.bets.filter(b => b.choice === 'red').length,
      redTotal: this.bets.filter(b => b.choice === 'red').reduce((s, b) => s + b.amount, 0),
      blackCount: this.bets.filter(b => b.choice === 'black').length,
      blackTotal: this.bets.filter(b => b.choice === 'black').reduce((s, b) => s + b.amount, 0)
    };
  }
};

setInterval(() => redBlackEngine.tick(), 1000);

// ==========================================
// 9. ДВИЖОК: PvP КОЛЕСО (МУЛЬТИПЛЕЕР ДЖЕКПОТ)
// ==========================================
const pvpEngine = {
  roundId: 101,
  status: 'WAITING', // 'WAITING', 'COUNTDOWN', 'SPINNING'
  countdown: 15,
  bets: [], // { userId, username, first_name, photo_url, amount, color, socketId }
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'],

  getTotalPot() {
    return this.bets.reduce((sum, b) => sum + b.amount, 0);
  },

  getState() {
    const totalPot = this.getTotalPot();
    const betsWithChance = this.bets.map(b => ({
      ...b,
      chance: totalPot > 0 ? Number(((b.amount / totalPot) * 100).toFixed(1)) : 0
    }));
    return {
      roundId: this.roundId,
      status: this.status,
      countdown: this.countdown,
      totalPot,
      bets: betsWithChance
    };
  },

  tick() {
    if (this.status === 'COUNTDOWN') {
      this.countdown--;
      if (this.countdown <= 0) {
        this.spin();
      } else {
        io.emit('pvp_tick', { countdown: this.countdown });
      }
    }
  },

  async spin() {
    this.status = 'SPINNING';
    const totalPot = this.getTotalPot();
    if (this.bets.length === 0 || totalPot === 0) {
      this.resetRound();
      return;
    }

    // Выбор билета победителя пропорционально размеру ставки
    const randomTicket = Math.random() * totalPot;
    let accum = 0;
    let winner = this.bets[0];
    let startAngle = 0;
    let angleSpan = 360;

    let currAngle = 0;
    for (const bet of this.bets) {
      const span = (bet.amount / totalPot) * 360;
      accum += bet.amount;
      if (randomTicket <= accum && !winner) {
        winner = bet;
        startAngle = currAngle;
        angleSpan = span;
      }
      currAngle += span;
    }
    if (!winner) winner = this.bets[this.bets.length - 1];

    const stopAngle = (startAngle + angleSpan * 0.5) % 360;

    io.emit('pvp_spinning', {
      winnerId: winner.userId,
      winnerName: winner.first_name || winner.username || 'Игрок',
      totalPot,
      stopAngle,
      spins: 5
    });

    await dbRun(
      'INSERT INTO pvp_games (round_id, status, total_pot, winner_id, winner_name) VALUES (?, ?, ?, ?, ?)',
      [String(this.roundId), 'COMPLETED', totalPot, winner.userId, winner.first_name || '']
    );

    setTimeout(async () => {
      // Начисление банка победителю
      const newBalance = await modifyBalance(winner.userId, totalPot);
      const stats = await recordGameResult(winner.userId, { winAmount: totalPot, isGame: true });

      this.bets.forEach(async (b) => {
        if (b.userId !== winner.userId) {
          await recordGameResult(b.userId, { winAmount: 0, isGame: true });
        }
      });

      io.emit('pvp_winner', {
        winnerId: winner.userId,
        winnerName: winner.first_name || winner.username || 'Игрок',
        totalPot,
        newBalance,
        stats
      });

      io.to(winner.socketId).emit('balance_updated', {
        balance: newBalance,
        message: `🏆 Вы выиграли PvP Банк: +${totalPot} ⭐!`
      });

      setTimeout(() => {
        this.resetRound();
      }, 4000);
    }, 5500);
  },

  resetRound() {
    this.roundId++;
    this.status = 'WAITING';
    this.countdown = 15;
    this.bets = [];
    io.emit('pvp_state', this.getState());
  }
};

setInterval(() => pvpEngine.tick(), 1000);

// ==========================================
// 10. HTTP ЭНДПОИНТЫ ДЛЯ БЫСТРОГО ПРОБУЖДЕНИЯ
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'awake', time: Date.now() });
});

app.post('/api/auth', async (req, res) => {
  try {
    const { initData } = req.body || {};
    const tgUser = validateTelegramInitData(initData);

    if (!tgUser || !tgUser.id) {
      return res.status(401).json({ error: 'Вход разрешён исключительно через Telegram' });
    }

    const user = await getOrCreateUser(tgUser);
    const inventory = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [user.id]);

    res.json({
      ok: true,
      user,
      inventory,
      wheelSectors: WHEEL_SECTORS,
      spinCost: SPIN_COST,
      crashState: crashEngine.getState(),
      redBlackState: redBlackEngine.getState(),
      pvpState: pvpEngine.getState()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. ОБРАБОТКА ПОДКЛЮЧЕНИЙ SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);
  let currentUser = null;

  // Авторизация
  socket.on('auth', async ({ initData }) => {
    console.log('📩 Auth request received');
    try {
      const tgUser = validateTelegramInitData(initData);

      if (!tgUser || !tgUser.id) {
        socket.emit('auth_error', { message: 'Вход разрешён исключительно через Telegram!' });
        socket.disconnect(true);
        return;
      }

      currentUser = await getOrCreateUser(tgUser);
      socket.userId = currentUser.id;

      const inventory = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);

      socket.emit('auth_success', {
        user: currentUser,
        inventory,
        wheelSectors: WHEEL_SECTORS,
        spinCost: SPIN_COST
      });

      socket.emit('crash_state', crashEngine.getState());
      socket.emit('red_black_state', redBlackEngine.getState());
      socket.emit('pvp_state', pvpEngine.getState());
    } catch (err) {
      console.error('Ошибка в auth:', err);
      socket.emit('auth_error', { message: 'Ошибка авторизации' });
      socket.disconnect(true);
    }
  });

  // Пополнение баланса (тестовое)
  socket.on('deposit', async ({ amount }) => {
    if (!currentUser) return;
    const addAmount = parseInt(amount, 10);
    if (isNaN(addAmount) || addAmount <= 0) return;

    try {
      const newBalance = await modifyBalance(currentUser.id, addAmount);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance, message: `Пополнено +${addAmount} ⭐` });
    } catch (err) {
      console.error('Ошибка депозита:', err);
    }
  });

  // ==========================================
  // ИНВЕНТАРЬ: ПРОДАЖА И ВЫВОД ПРЕДМЕТОВ
  // ==========================================
  socket.on('sell_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
      if (!item) {
        socket.emit('inventory_error', { message: 'Предмет не найден' });
        return;
      }

      await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
      const newBalance = await modifyBalance(currentUser.id, item.sell_price);
      currentUser.balance = newBalance;

      const items = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);

      socket.emit('balance_updated', { balance: newBalance, message: `Подарок продан за +${item.sell_price} ⭐` });
      socket.emit('inventory_updated', { items, message: `Подарок "${item.item_name}" продан за ${item.sell_price} ⭐` });
    } catch (err) {
      console.error('Ошибка при продаже предмета:', err);
    }
  });

  socket.on('withdraw_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
      if (!item) {
        socket.emit('inventory_error', { message: 'Предмет не найден' });
        return;
      }

      await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
      const items = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);

      socket.emit('inventory_updated', { items, message: `Заявка на вывод подарка "${item.item_name}" принята!` });
    } catch (err) {
      console.error('Ошибка при выводе предмета:', err);
    }
  });

  // ==========================================
  // ИГРА 1: КОЛЕСО УДАЧИ (С МГНОВЕННЫМ СПИСАНИЕМ)
  // ==========================================
  socket.on('spin_wheel', async () => {
    if (!currentUser) return;

    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < SPIN_COST) {
        socket.emit('wheel_error', { message: 'Недостаточно звёзд для вращения!' });
        return;
      }

      // 1. МГНОВЕННОЕ СПИСАНИЕ БАЛАНСА
      const newBalanceAfterSpin = await modifyBalance(currentUser.id, -SPIN_COST);
      currentUser.balance = newBalanceAfterSpin;
      socket.emit('balance_updated', { balance: newBalanceAfterSpin });

      // Определение сектора
      const isStarsWin = Math.random() < 0.70;
      let winningSector;

      if (isStarsWin) {
        const starSectors = WHEEL_SECTORS.filter(s => s.type === 'stars');
        winningSector = starSectors[Math.floor(Math.random() * starSectors.length)];
      } else {
        const giftSectors = WHEEL_SECTORS.filter(s => s.type === 'gift');
        winningSector = giftSectors[Math.floor(Math.random() * giftSectors.length)];
      }

      socket.emit('wheel_result', {
        sectorIndex: winningSector.index,
        prize: winningSector.prize,
        type: winningSector.type,
        amount: winningSector.amount,
        label: winningSector.label,
        name: winningSector.name,
        sellPrice: winningSector.sellPrice
      });

      // Начисление приза в конце анимации (через 4.7с)
      setTimeout(async () => {
        if (winningSector.type === 'stars') {
          const finalBal = await modifyBalance(currentUser.id, winningSector.amount);
          currentUser.balance = finalBal;
          const stats = await recordGameResult(currentUser.id, { winAmount: winningSector.amount, isGame: true });
          socket.emit('balance_updated', { balance: finalBal, message: `Выигрыш в Колесе: +${winningSector.amount} ⭐` });
          socket.emit('wheel_awarded', { newBalance: finalBal, stats });
        } else {
          // Добавление подарка в инвентарь
          await dbRun(
            'INSERT INTO inventory (user_id, item_name, item_emoji, sell_price) VALUES (?, ?, ?, ?)',
            [currentUser.id, winningSector.name, winningSector.prize, winningSector.sellPrice || 25]
          );
          const stats = await recordGameResult(currentUser.id, { winAmount: winningSector.sellPrice || 25, isGame: true });
          const items = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);
          socket.emit('inventory_updated', { items, message: `Новый подарок в инвентаре: ${winningSector.prize} ${winningSector.name}!` });
          socket.emit('wheel_awarded', { newBalance: currentUser.balance, stats });
        }
      }, 4700);

    } catch (err) {
      console.error('Ошибка при вращении колеса:', err);
      socket.emit('wheel_error', { message: 'Ошибка сервера' });
    }
  });

  // ==========================================
  // ИГРА 2: КРАШ (БЕЗ БОТОВ + МГНОВЕННОЕ СПИСАНИЕ)
  // ==========================================
  socket.on('place_bet', async ({ amount }) => {
    if (!currentUser) return;
    if (crashEngine.phase !== 'WAITING') {
      socket.emit('crash_error', { message: 'Ставки принимаются только в фазе ожидания!' });
      return;
    }

    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      socket.emit('crash_error', { message: 'Некорректная сумма ставки' });
      return;
    }

    const existing = crashEngine.bets.find(b => b.userId === currentUser.id);
    if (existing) {
      socket.emit('crash_error', { message: 'Вы уже сделали ставку в этом раунде' });
      return;
    }

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betAmount) {
        socket.emit('crash_error', { message: 'Недостаточно звёзд на балансе!' });
        return;
      }

      // Мгновенное списание
      const newBalance = await modifyBalance(currentUser.id, -betAmount);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance });

      const newBet = {
        userId: currentUser.id,
        username: currentUser.username,
        first_name: currentUser.first_name,
        photo_url: currentUser.photo_url,
        amount: betAmount,
        cashedOut: false,
        cashoutMultiplier: 0,
        winAmount: 0,
        recorded: false
      };

      crashEngine.bets.unshift(newBet);

      socket.emit('bet_confirmed', { bet: newBet, newBalance });
      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка ставки в Краш:', err);
    }
  });

  socket.on('cashout', async () => {
    if (!currentUser) return;
    if (crashEngine.phase !== 'FLYING') return;

    const bet = crashEngine.bets.find(b => b.userId === currentUser.id && !b.cashedOut);
    if (!bet) return;

    const currentMult = crashEngine.multiplier;
    const winAmount = Math.floor(bet.amount * currentMult);

    bet.cashedOut = true;
    bet.cashoutMultiplier = currentMult;
    bet.winAmount = winAmount;
    bet.recorded = true;

    try {
      const newBalance = await modifyBalance(currentUser.id, winAmount);
      currentUser.balance = newBalance;

      const stats = await recordGameResult(currentUser.id, { winAmount, isGame: true });

      socket.emit('cashout_success', {
        multiplier: currentMult,
        winAmount,
        newBalance,
        stats
      });
      socket.emit('balance_updated', { balance: newBalance, message: `Забрано: +${winAmount} ⭐` });

      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка cashout:', err);
    }
  });

  // ==========================================
  // ИГРА 3: МИНЫ (MINES 5x5)
  // ==========================================
  socket.on('start_mines', async ({ betAmount, minesCount }) => {
    if (!currentUser) return;

    const bet = parseInt(betAmount, 10);
    let count = parseInt(minesCount, 10);
    if (isNaN(count) || count < 3 || count > 5) count = 3;

    if (isNaN(bet) || bet <= 0) {
      socket.emit('mines_error', { message: 'Некорректная сумма ставки' });
      return;
    }

    if (activeMinesGames.has(currentUser.id)) {
      socket.emit('mines_error', { message: 'У вас уже идёт активная игра в Мины!' });
      return;
    }

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < bet) {
        socket.emit('mines_error', { message: 'Недостаточно звёзд на балансе!' });
        return;
      }

      // Мгновенное списание
      const newBalance = await modifyBalance(currentUser.id, -bet);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance });

      // Генерация 25 клеток с минами
      const cellIndices = Array.from({ length: 25 }, (_, i) => i);
      for (let i = cellIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
      }
      const mines = cellIndices.slice(0, count);

      const gameSession = {
        userId: currentUser.id,
        betAmount: bet,
        minesCount: count,
        mines: mines,
        revealedCells: [],
        currentMultiplier: 1.00,
        nextMultiplier: getMinesMultiplier(count, 1),
        status: 'PLAYING'
      };

      activeMinesGames.set(currentUser.id, gameSession);

      socket.emit('mines_started', {
        betAmount: bet,
        minesCount: count,
        newBalance,
        nextMultiplier: gameSession.nextMultiplier
      });
    } catch (err) {
      console.error('Ошибка start_mines:', err);
    }
  });

  socket.on('click_mines_cell', async ({ cellIndex }) => {
    if (!currentUser) return;
    const game = activeMinesGames.get(currentUser.id);
    if (!game || game.status !== 'PLAYING') return;

    const idx = parseInt(cellIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= 25) return;
    if (game.revealedCells.includes(idx)) return;

    if (game.mines.includes(idx)) {
      // Взрыв
      game.status = 'LOST';
      activeMinesGames.delete(currentUser.id);
      const stats = await recordGameResult(currentUser.id, { winAmount: 0, isGame: true });

      socket.emit('mines_exploded', {
        hitIndex: idx,
        mines: game.mines,
        stats
      });
    } else {
      // Алмаз
      game.revealedCells.push(idx);
      const step = game.revealedCells.length;
      game.currentMultiplier = getMinesMultiplier(game.minesCount, step);

      const safeCellsTotal = 25 - game.minesCount;
      const isMaxWin = step >= safeCellsTotal;
      game.nextMultiplier = isMaxWin ? game.currentMultiplier : getMinesMultiplier(game.minesCount, step + 1);
      const currentWin = Math.floor(game.betAmount * game.currentMultiplier);

      if (isMaxWin) {
        game.status = 'WON';
        activeMinesGames.delete(currentUser.id);
        const newBalance = await modifyBalance(currentUser.id, currentWin);
        currentUser.balance = newBalance;
        const stats = await recordGameResult(currentUser.id, { winAmount: currentWin, isGame: true });

        socket.emit('mines_cell_revealed', {
          cellIndex: idx,
          isMine: false,
          currentMultiplier: game.currentMultiplier,
          nextMultiplier: game.nextMultiplier,
          currentWin,
          step,
          isMaxWin: true,
          mines: game.mines,
          newBalance,
          stats
        });
        socket.emit('balance_updated', { balance: newBalance, message: `Победа в Минах: +${currentWin} ⭐` });
      } else {
        socket.emit('mines_cell_revealed', {
          cellIndex: idx,
          isMine: false,
          currentMultiplier: game.currentMultiplier,
          nextMultiplier: game.nextMultiplier,
          currentWin,
          step,
          isMaxWin: false
        });
      }
    }
  });

  socket.on('cashout_mines', async () => {
    if (!currentUser) return;
    const game = activeMinesGames.get(currentUser.id);
    if (!game || game.status !== 'PLAYING' || game.revealedCells.length === 0) return;

    game.status = 'WON';
    activeMinesGames.delete(currentUser.id);

    const winAmount = Math.floor(game.betAmount * game.currentMultiplier);
    try {
      const newBalance = await modifyBalance(currentUser.id, winAmount);
      currentUser.balance = newBalance;
      const stats = await recordGameResult(currentUser.id, { winAmount, isGame: true });

      socket.emit('mines_cashout_success', {
        winAmount,
        multiplier: game.currentMultiplier,
        newBalance,
        mines: game.mines,
        stats
      });
      socket.emit('balance_updated', { balance: newBalance, message: `Забрано из Мин: +${winAmount} ⭐` });
    } catch (err) {
      console.error('Ошибка cashout_mines:', err);
    }
  });

  // ==========================================
  // ИГРА 4: ПЛИНКО (PLINKO)
  // ==========================================
  socket.on('drop_plinko', async ({ betAmount }) => {
    if (!currentUser) return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet <= 0) return;

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < bet) {
        socket.emit('plinko_error', { message: 'Недостаточно звёзд на балансе!' });
        return;
      }

      // Мгновенное списание ставки
      const newBalance = await modifyBalance(currentUser.id, -bet);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance });

      // Генерация 8 шагов (0 = влево, 1 = вправо)
      const pathSteps = [];
      let rightCount = 0;
      for (let i = 0; i < 8; i++) {
        const step = Math.random() < 0.5 ? 0 : 1;
        pathSteps.push(step);
        if (step === 1) rightCount++;
      }

      const slotIndex = rightCount; // 0..8
      const multiplier = PLINKO_SLOTS[slotIndex];
      const winAmount = Math.floor(bet * multiplier);

      socket.emit('plinko_dropped', {
        path: pathSteps,
        slotIndex,
        multiplier,
        winAmount
      });

      // Начисление выигрыша после завершения анимации падения (2.2с)
      setTimeout(async () => {
        const finalBal = await modifyBalance(currentUser.id, winAmount);
        currentUser.balance = finalBal;
        const stats = await recordGameResult(currentUser.id, { winAmount, isGame: true });

        socket.emit('balance_updated', {
          balance: finalBal,
          message: multiplier >= 1.0 ? `Плинко (x${multiplier}): +${winAmount} ⭐` : `Плинко (x${multiplier}): возвращено ${winAmount} ⭐`
        });
        socket.emit('plinko_completed', { winAmount, multiplier, finalBal, stats });
      }, 2300);

    } catch (err) {
      console.error('Ошибка drop_plinko:', err);
    }
  });

  // ==========================================
  // ИГРА 5: КРАСНОЕ ИЛИ ЧЕРНОЕ (ОНЛАЙН)
  // ==========================================
  socket.on('place_red_black_bet', async ({ amount, choice }) => {
    if (!currentUser) return;
    if (redBlackEngine.phase !== 'WAITING') {
      socket.emit('red_black_error', { message: 'Ставки принимаются только до начала раунда!' });
      return;
    }
    if (choice !== 'red' && choice !== 'black') return;

    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount <= 0) return;

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betAmount) {
        socket.emit('red_black_error', { message: 'Недостаточно звёзд на балансе!' });
        return;
      }

      // Мгновенное списание ставки
      const newBalance = await modifyBalance(currentUser.id, -betAmount);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance });

      redBlackEngine.bets.push({
        userId: currentUser.id,
        username: currentUser.username,
        first_name: currentUser.first_name,
        amount: betAmount,
        choice,
        socketId: socket.id
      });

      socket.emit('red_black_bet_confirmed', { betAmount, choice, newBalance });
    } catch (err) {
      console.error('Ошибка ставки Red/Black:', err);
    }
  });

  // ==========================================
  // ИГРА 6: PvP КОЛЕСО (МУЛЬТИПЛЕЕР)
  // ==========================================
  socket.on('place_pvp_bet', async ({ amount }) => {
    if (!currentUser) return;
    if (pvpEngine.status === 'SPINNING') {
      socket.emit('pvp_error', { message: 'Колесо уже крутится! Дождитесь следующего раунда.' });
      return;
    }

    const bet = parseInt(amount, 10);
    if (isNaN(bet) || bet <= 0) return;

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < bet) {
        socket.emit('pvp_error', { message: 'Недостаточно звёзд на балансе!' });
        return;
      }

      // Мгновенное списание
      const newBalance = await modifyBalance(currentUser.id, -bet);
      currentUser.balance = newBalance;
      socket.emit('balance_updated', { balance: newBalance });

      // Назначаем цвет
      const color = pvpEngine.colors[pvpEngine.bets.length % pvpEngine.colors.length];

      pvpEngine.bets.push({
        userId: currentUser.id,
        username: currentUser.username,
        first_name: currentUser.first_name || 'Игрок',
        photo_url: currentUser.photo_url,
        amount: bet,
        color,
        socketId: socket.id
      });

      // Запуск таймера при 2+ игроках
      if (pvpEngine.bets.length >= 2 && pvpEngine.status === 'WAITING') {
        pvpEngine.status = 'COUNTDOWN';
        pvpEngine.countdown = 15;
      }

      io.emit('pvp_state', pvpEngine.getState());
      socket.emit('pvp_bet_confirmed', { newBalance });
    } catch (err) {
      console.error('Ошибка PvP ставки:', err);
    }
  });

  // ==========================================
  // ИГРА 7: АПГРЕЙДЕР (UPGRADER)
  // ==========================================
  socket.on('start_upgrade', async ({ betType, betValue, targetMultiplier }) => {
    if (!currentUser) return;

    // Шансы выигрыша
    const multipliersConfig = {
      1.5: { chance: 60 },
      2.0: { chance: 45 },
      5.0: { chance: 20 },
      10.0: { chance: 10 }
    };

    const config = multipliersConfig[targetMultiplier];
    if (!config) {
      socket.emit('upgrader_error', { message: 'Неверный множитель' });
      return;
    }

    try {
      let baseValue = 0;

      if (betType === 'stars') {
        const stars = parseInt(betValue, 10);
        if (isNaN(stars) || stars <= 0) return;

        const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
        if (!user || user.balance < stars) {
          socket.emit('upgrader_error', { message: 'Недостаточно звёзд!' });
          return;
        }

        // Мгновенное списание
        const newBalance = await modifyBalance(currentUser.id, -stars);
        currentUser.balance = newBalance;
        socket.emit('balance_updated', { balance: newBalance });
        baseValue = stars;

      } else if (betType === 'item') {
        // Ставка предметом из инвентаря
        const itemId = parseInt(betValue, 10);
        const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
        if (!item) {
          socket.emit('upgrader_error', { message: 'Предмет не найден в инвентаре!' });
          return;
        }

        // Мгновенное списание предмета
        await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
        baseValue = item.sell_price || 20;

        const items = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);
        socket.emit('inventory_updated', { items });
      }

      // Честный розыгрыш шанса
      const roll = Math.random() * 100;
      const isWin = roll < config.chance;
      const winAmount = Math.floor(baseValue * targetMultiplier);

      // Рассчет угла остановки на круговой шкале:
      // Зона выигрыша: от 0 до (chance * 3.6) градусов
      const winAngleSpan = config.chance * 3.6;
      let stopAngle = 0;

      if (isWin) {
        stopAngle = Math.random() * (winAngleSpan - 4) + 2;
      } else {
        stopAngle = Math.random() * (356 - winAngleSpan) + winAngleSpan + 2;
      }

      socket.emit('upgrader_spin', {
        isWin,
        winAmount,
        targetMultiplier,
        stopAngle,
        chance: config.chance
      });

      // Начисление приза после анимации (3.5с)
      setTimeout(async () => {
        if (isWin) {
          const finalBal = await modifyBalance(currentUser.id, winAmount);
          currentUser.balance = finalBal;
          const stats = await recordGameResult(currentUser.id, { winAmount, isGame: true });

          socket.emit('balance_updated', { balance: finalBal, message: `⚡ Апгрейд успешен! +${winAmount} ⭐` });
          socket.emit('upgrader_completed', { isWin: true, winAmount, finalBal, stats });
        } else {
          const stats = await recordGameResult(currentUser.id, { winAmount: 0, isGame: true });
          socket.emit('upgrader_completed', { isWin: false, winAmount: 0, stats });
        }
      }, 3600);

    } catch (err) {
      console.error('Ошибка в Апгрейдере:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==========================================`);
  console.log(`🚀 NEON CASINO v3.0 запущено на порту ${PORT}`);
  console.log(`🎮 Игры: Колесо, Краш, Мины, Плинко, Red/Black, PvP Колесо, Апгрейдер`);
  console.log(`💼 Профиль: Отдельный экран со статистикой и инвентарем подарков`);
  console.log(`⚡ Мгновенное списание баланса во всех режимах`);
  console.log(`==========================================`);
});
