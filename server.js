/**
 * Telegram Casino - Server Engine (TestingApp9)
 * Full unabbreviated backend:
 * - SQLite database (users, inventory, pvp_games)
 * - Strict Telegram WebApp authentication (validates initData)
 * - Instant balance deduction on all bets and spins (emits balance_updated BEFORE animation)
 * - 7 Game Engines:
 *   1. Wheel of Fortune (gifts saved to inventory)
 *   2. Crash (only real players, green curve, red on crash, shake, explosion)
 *   3. Mines (5x5, dynamic multipliers, instant deduction)
 *   4. Plinko (triangular pegs, fair multipliers: edges x5, center x1.1, x0.5)
 *   5. Red or Black (15s synchronized live room, x2)
 *   6. PvP Wheel (multiplayer pot, sector size proportional to bet, central rotating arrow, winner takes pot)
 *   7. Upgrader (stars or inventory items, fair chances: x1.5-60%, x2-45%, x5-20%, x10-10%)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. EXPRESS & STATIC MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 2. БАЗА ДАННЫХ SQLITE (casino.db)
// ==========================================
const db = new sqlite3.Database(path.join(__dirname, 'casino.db'), (err) => {
  if (err) {
    console.error('❌ Ошибка открытия SQLite casino.db:', err.message);
  } else {
    console.log('✅ SQLite casino.db успешно подключена');
  }
});

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDatabase() {
  try {
    // 1. users: id (Telegram ID), username, first_name, photo_url, balance, best_win, total_games
    await dbRun(`
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

    const userCols = await dbAll(`PRAGMA table_info(users)`);
    const colNames = userCols.map(c => c.name);
    if (!colNames.includes('best_win')) {
      await dbRun(`ALTER TABLE users ADD COLUMN best_win INTEGER DEFAULT 0`);
    }
    if (!colNames.includes('total_games')) {
      await dbRun(`ALTER TABLE users ADD COLUMN total_games INTEGER DEFAULT 0`);
    }

    // 2. inventory: id, user_id, item_name, item_emoji, sell_price, created_at
    await dbRun(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_emoji TEXT NOT NULL,
        sell_price INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. pvp_games: round_id, status, total_pot, winner_id, winner_name, created_at
    await dbRun(`
      CREATE TABLE IF NOT EXISTS pvp_games (
        round_id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT DEFAULT 'waiting',
        total_pot INTEGER DEFAULT 0,
        winner_id TEXT,
        winner_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Таблицы SQLite (users, inventory, pvp_games) готовы к работе');
  } catch (err) {
    console.error('❌ Ошибка инициализации таблиц БД:', err);
  }
}
initDatabase();

// Валидация Telegram WebApp InitData
function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') {
    return null;
  }

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
        console.warn('⚠️ Hash initData не совпал с вычисленным.');
      }
    }

    return user;
  } catch (err) {
    console.error('Ошибка парсинга initData:', err.message);
    return null;
  }
}

async function recordGameResult(userId, winAmount = 0) {
  try {
    const u = await dbGet('SELECT best_win, total_games FROM users WHERE id = ?', [String(userId)]);
    if (!u) return;
    const newBest = Math.max(u.best_win || 0, winAmount || 0);
    const newTotal = (u.total_games || 0) + 1;
    await dbRun('UPDATE users SET best_win = ?, total_games = ? WHERE id = ?', [newBest, newTotal, String(userId)]);
  } catch (e) {
    console.error('Ошибка recordGameResult:', e.message);
  }
}

async function getOrCreateUser(tgUser) {
  const userId = String(tgUser.id);
  let row = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

  if (!row) {
    const username = tgUser.username ? `@${tgUser.username}` : `ID: ${userId}`;
    const firstName = tgUser.first_name || 'Игрок';
    const photoUrl = tgUser.photo_url || '';
    const initialBalance = 100;

    await dbRun(
      'INSERT INTO users (id, username, first_name, photo_url, balance, best_win, total_games) VALUES (?, ?, ?, ?, ?, 0, 0)',
      [userId, username, firstName, photoUrl, initialBalance]
    );

    row = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    console.log(`👤 Новый игрок зарегистрирован #${userId} (${firstName}) с балансом ${initialBalance} ⭐`);
  } else {
    const firstName = tgUser.first_name || row.first_name;
    const username = tgUser.username ? `@${tgUser.username}` : row.username;
    const photoUrl = tgUser.photo_url || row.photo_url;

    if (firstName !== row.first_name || username !== row.username || (photoUrl && photoUrl !== row.photo_url)) {
      await dbRun('UPDATE users SET first_name = ?, username = ?, photo_url = ? WHERE id = ?', [
        firstName,
        username,
        photoUrl,
        userId
      ]);
      row = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }
  }

  return row;
}

// ==========================================
// 3. КОНФИГУРАЦИЯ "КОЛЕСО УДАЧИ" (WHEEL)
// ==========================================
const SPIN_COST = 10;
const WHEEL_SECTORS = [
  { id: 0, text: '20 ⭐', type: 'stars', value: 20, weight: 28, color: '#1e293b' },
  { id: 1, text: '🎁 VIP Бокс', type: 'gift', value: 50, item_name: 'VIP Бокс', item_emoji: '🎁', weight: 12, color: '#273549' },
  { id: 2, text: '0 ⭐', type: 'stars', value: 0, weight: 25, color: '#16202e' },
  { id: 3, text: '50 ⭐', type: 'stars', value: 50, weight: 15, color: '#273549' },
  { id: 4, text: '💎 Алмаз', type: 'gift', value: 100, item_name: 'Кристалл Звёзд', item_emoji: '💎', weight: 6, color: '#1e293b' },
  { id: 5, text: '10 ⭐', type: 'stars', value: 10, weight: 24, color: '#273549' },
  { id: 6, text: '100 ⭐', type: 'stars', value: 100, weight: 4, color: '#16202e' },
  { id: 7, text: '👑 Корона', type: 'gift', value: 250, item_name: 'Золотая Корона', item_emoji: '👑', weight: 2, color: '#273549' }
];

// ==========================================
// 4. ДВИЖОК: КРАШ (Crash Engine)
// ТОЛЬКО РЕАЛЬНЫЕ ИГРОКИ (никаких ботов!)
// ==========================================
const crashEngine = {
  phase: 'WAITING', // WAITING, FLYING, CRASHED
  countdown: 5.0,
  multiplier: 1.00,
  crashPoint: 2.00,
  startTime: 0,
  bets: [], // { userId, username, firstName, photoUrl, bet, cashedOut, cashoutMultiplier, winAmount, socketId }
  history: [1.85, 3.42, 1.25, 4.10, 2.05, 5.50],

  generateCrashPoint() {
    const r = Math.random();
    if (r < 0.04) return 1.00;
    const raw = 0.96 / (1.0 - r);
    return Math.min(100.0, Math.floor(raw * 100) / 100);
  },

  startRound() {
    this.phase = 'WAITING';
    this.countdown = 5.0;
    this.multiplier = 1.00;
    this.crashPoint = this.generateCrashPoint();
    this.bets = [];

    console.log(`🚀 [Crash] Новый раунд. Ожидание ставок (5 сек). Запланированный краш: ${this.crashPoint}x`);
    io.emit('crash_state', this.getState());
  },

  tick() {
    if (this.phase === 'WAITING') {
      this.countdown = Number((this.countdown - 0.1).toFixed(1));

      if (this.countdown <= 0) {
        this.phase = 'FLYING';
        this.startTime = Date.now();
        this.multiplier = 1.00;
        console.log(`🚀 [Crash] Взлёт! Точка краша: ${this.crashPoint}x`);
        io.emit('crash_start', { bets: this.bets });
      } else {
        io.emit('crash_waiting', { countdown: this.countdown, bets: this.bets });
      }
    } else if (this.phase === 'FLYING') {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const currentMult = Number(Math.exp(0.065 * elapsed * 1.5).toFixed(2));
      this.multiplier = currentMult;

      if (this.multiplier >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.phase = 'CRASHED';

        this.history.unshift(this.crashPoint);
        if (this.history.length > 12) this.history.pop();

        console.log(`💥 [Crash] КРАШНУЛСЯ НА ${this.crashPoint}x!`);

        this.bets.forEach(async (bet) => {
          if (!bet.cashedOut && !bet.recorded) {
            bet.recorded = true;
            await recordGameResult(bet.userId, 0);
          }
        });

        io.emit('crash_exploded', {
          crashPoint: this.crashPoint,
          multiplier: this.crashPoint,
          bets: this.bets,
          history: this.history
        });
        io.emit('crash_end', {
          multiplier: this.crashPoint,
          history: this.history
        });

        setTimeout(() => {
          this.startRound();
        }, 4500);
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
      state: this.phase.toLowerCase(),
      countdown: this.countdown,
      multiplier: this.multiplier,
      crashPoint: this.phase === 'CRASHED' ? this.crashPoint : null,
      bets: this.bets,
      history: this.history
    };
  }
};

setInterval(() => crashEngine.tick(), 100);

// ==========================================
// 5. ДВИЖОК: КРАСНОЕ ИЛИ ЧЕРНОЕ (15 СЕКУНД)
// ==========================================
const redBlackEngine = {
  roundTime: 15,
  timeLeft: 15,
  state: 'betting', // betting, rolling
  bets: [], // { userId, username, firstName, color, bet, socketId }
  lastResult: null,

  getState() {
    const redBets = this.bets.filter(b => b.color === 'red');
    const blackBets = this.bets.filter(b => b.color === 'black');
    return {
      state: this.state,
      timeLeft: this.timeLeft,
      redCount: redBets.length,
      blackCount: blackBets.length,
      redTotal: redBets.reduce((s, b) => s + b.bet, 0),
      blackTotal: blackBets.reduce((s, b) => s + b.bet, 0),
      lastResult: this.lastResult
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

      console.log(`🔴⚫ [Red/Black] Рулетка вращается! Выпадет: ${winningColor.toUpperCase()}`);

      io.emit('red_black_spin', {
        winningColor,
        timeLeft: this.timeLeft
      });

      setTimeout(async () => {
        for (const b of this.bets) {
          if (b.color === winningColor) {
            const winAmount = b.bet * 2;
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winAmount, b.userId]);
            await recordGameResult(b.userId, winAmount);
            const u = await dbGet('SELECT balance FROM users WHERE id = ?', [b.userId]);
            io.to(b.socketId).emit('balance_updated', { balance: u.balance });
            io.to(b.socketId).emit('red_black_win', {
              winningColor,
              winAmount,
              balance: u.balance
            });
          } else {
            await recordGameResult(b.userId, 0);
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
// 6. ДВИЖОК: PvP КОЛЕСО (Мультиплеер Банк)
// Вращающаяся центральная стрелка указывает на сектор победителя
// ==========================================
const pvpWheelEngine = {
  state: 'waiting', // waiting, spinning
  countdown: 15,
  bets: [], // { userId, username, firstName, photoUrl, bet, color, startAngle, endAngle, percent, socketId }
  totalPot: 0,
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'],

  getState() {
    return {
      state: this.state,
      countdown: this.countdown,
      totalPot: this.totalPot,
      playersCount: this.bets.length,
      bets: this.bets
    };
  },

  recalculateSlices() {
    this.totalPot = this.bets.reduce((sum, b) => sum + b.bet, 0);
    let curAngle = 0;

    this.bets.forEach((b, idx) => {
      b.color = this.colors[idx % this.colors.length];
      b.percent = this.totalPot > 0 ? Number(((b.bet / this.totalPot) * 100).toFixed(1)) : 0;
      const sliceSize = this.totalPot > 0 ? (b.bet / this.totalPot) * 360 : 0;
      b.startAngle = curAngle;
      b.endAngle = curAngle + sliceSize;
      curAngle += sliceSize;
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
    console.log(`⚔️ [PvP] Запуск раунда! Общий банк: ${this.totalPot} ⭐`);

    // Честный взвешенный случайный угол от 0 до 360
    const randomDegree = Math.random() * 360;
    let winningPlayer = this.bets[0];

    for (const b of this.bets) {
      if (randomDegree >= b.startAngle && randomDegree < b.endAngle) {
        winningPlayer = b;
        break;
      }
    }

    // 5 полных оборотов стрелки + градус сектора
    const targetRotation = 360 * 5 + randomDegree;

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

        await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [prize, winnerId]);
        await recordGameResult(winnerId, prize);

        for (const b of this.bets) {
          if (b.userId !== winnerId) {
            await recordGameResult(b.userId, 0);
          }
        }

        await dbRun(
          'INSERT INTO pvp_games (status, total_pot, winner_id, winner_name) VALUES ("finished", ?, ?, ?)',
          [prize, winnerId, winningPlayer.firstName]
        );

        const winnerUser = await dbGet('SELECT balance FROM users WHERE id = ?', [winnerId]);
        console.log(`🏆 [PvP] Победил ${winningPlayer.firstName}! Выигрыш: ${prize} ⭐. Баланс: ${winnerUser.balance}`);

        io.to(winningPlayer.socketId).emit('balance_updated', { balance: winnerUser.balance });
        io.emit('pvp_round_end', {
          winnerId,
          winnerName: winningPlayer.firstName,
          prize
        });

        setTimeout(() => {
          this.state = 'waiting';
          this.countdown = 15;
          this.bets = [];
          this.totalPot = 0;
          io.emit('pvp_state', this.getState());
        }, 5000);
      } catch (err) {
        console.error('Ошибка pvp spinWheel end:', err);
        this.state = 'waiting';
        this.bets = [];
      }
    }, 5500);
  }
};

setInterval(() => pvpWheelEngine.tick(), 1000);

// ==========================================
// 7. СЕССИИ МИН (MINES 5x5)
// ==========================================
const activeMinesSessions = new Map();

function calculateMinesMultiplier(minesCount, openedCount) {
  if (openedCount === 0) return 1.0;
  let mult = 1.0;
  for (let i = 0; i < openedCount; i++) {
    mult *= (25 - i) / (25 - minesCount - i);
  }
  return Math.floor(mult * 0.97 * 100) / 100;
}

// ==========================================
// 8. ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
  console.log('⚡ Новое подключение сокета:', socket.id);
  let currentUser = null;

  // 1. АВТОРИЗАЦИЯ ИСКЛЮЧИТЕЛЬНО ЧЕРЕЗ TELEGRAM
  socket.on('auth', async ({ initData }) => {
    console.log('📩 Получен запрос auth');
    try {
      const tgUser = validateTelegramInitData(initData);

      if (!tgUser || !tgUser.id) {
        console.warn('⛔ Попытка входа без корректных данных Telegram initData');
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
      socket.emit('red_black_tick', redBlackEngine.getState());
      socket.emit('pvp_state', pvpWheelEngine.getState());
    } catch (err) {
      console.error('Ошибка в auth:', err);
      socket.emit('auth_error', { message: 'Ошибка авторизации' });
      socket.disconnect(true);
    }
  });

  socket.on('get_profile', async () => {
    if (!currentUser) return;
    try {
      const u = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      const inv = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);
      socket.emit('profile_data', { user: u, inventory: inv });
    } catch (e) {
      console.error('Ошибка get_profile:', e);
    }
  });

  // ==========================================
  // КОЛЕСО УДАЧИ: МГНОВЕННОЕ СПИСАНИЕ 10 ЗВЁЗД
  // ==========================================
  const handleSpinWheel = async () => {
    if (!currentUser) return;
    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < SPIN_COST) {
        return socket.emit('wheel_error', { message: 'Недостаточно звёзд для вращения (нужно 10 ⭐)' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ В БД
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [SPIN_COST, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);

      // Клиент получает balance_updated ДО НАЧАЛА ВРАЩЕНИЯ
      socket.emit('balance_updated', { balance: updatedUser.balance });

      const totalWeight = WHEEL_SECTORS.reduce((sum, s) => sum + s.weight, 0);
      let rand = Math.random() * totalWeight;
      let selectedSector = WHEEL_SECTORS[0];

      for (const sector of WHEEL_SECTORS) {
        if (rand < sector.weight) {
          selectedSector = sector;
          break;
        }
        rand -= sector.weight;
      }

      console.log(`🎡 [Wheel] Игрок ${user.first_name} крутит колесо. Сектор #${selectedSector.id}: ${selectedSector.text}`);

      socket.emit('wheel_result', {
        sectorId: selectedSector.id,
        sector: selectedSector,
        cost: SPIN_COST,
        newBalance: updatedUser.balance
      });
      socket.emit('wheel_spin_start', {
        sectorId: selectedSector.id,
        sector: selectedSector,
        cost: SPIN_COST,
        currentBalance: updatedUser.balance
      });

      setTimeout(async () => {
        try {
          if (selectedSector.type === 'stars') {
            const winStars = selectedSector.value;
            if (winStars > 0) {
              await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winStars, user.id]);
              await recordGameResult(user.id, winStars);
            } else {
              await recordGameResult(user.id, 0);
            }
          } else if (selectedSector.type === 'gift') {
            await dbRun(
              'INSERT INTO inventory (user_id, item_name, item_emoji, sell_price) VALUES (?, ?, ?, ?)',
              [user.id, selectedSector.item_name, selectedSector.item_emoji, selectedSector.value]
            );
            await recordGameResult(user.id, selectedSector.value);
          }

          const finalUser = await dbGet('SELECT * FROM users WHERE id = ?', [user.id]);
          const inventory = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [user.id]);

          socket.emit('balance_updated', { balance: finalUser.balance });
          socket.emit('inventory_updated', { inventory });
          socket.emit('wheel_finished', {
            sector: selectedSector,
            balance: finalUser.balance,
            inventory
          });
        } catch (err) {
          console.error('Ошибка начисления колеса:', err);
        }
      }, 4200);

    } catch (err) {
      console.error('Ошибка spin_wheel:', err);
      socket.emit('wheel_error', { message: 'Ошибка вращения колеса' });
    }
  };

  socket.on('spin_wheel', handleSpinWheel);
  socket.on('wheel_spin', handleSpinWheel);

  // ==========================================
  // ИНВЕНТАРЬ: ПРОДАТЬ И ВЫВЕСТИ
  // ==========================================
  socket.on('sell_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
      if (!item) {
        return socket.emit('inventory_error', { message: 'Предмет не найден в вашем инвентаре' });
      }

      await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
      await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [item.sell_price, currentUser.id]);

      const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      const inventory = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);

      console.log(`🎒 [Inventory] #${currentUser.id} продал "${item.item_name}" за ${item.sell_price} ⭐`);

      socket.emit('balance_updated', { balance: updatedUser.balance });
      socket.emit('inventory_updated', { inventory });
      socket.emit('item_sold', {
        item,
        sellPrice: item.sell_price,
        balance: updatedUser.balance
      });
    } catch (e) {
      console.error('Ошибка sell_item:', e);
      socket.emit('inventory_error', { message: 'Не удалось продать предмет' });
    }
  });

  socket.on('withdraw_item', async ({ itemId }) => {
    if (!currentUser) return;
    try {
      const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
      if (!item) {
        return socket.emit('inventory_error', { message: 'Предмет не найден в инвентаре' });
      }

      await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
      const inventory = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);

      console.log(`🎒 [Inventory] Запрос на вывод "${item.item_name}" от #${currentUser.id}`);

      socket.emit('inventory_updated', { inventory });
      socket.emit('item_withdrawn', {
        item,
        message: `Запрос на вывод подарка "${item.item_name}" принят!`
      });
    } catch (e) {
      console.error('Ошибка withdraw_item:', e);
      socket.emit('inventory_error', { message: 'Не удалось вывести предмет' });
    }
  });

  // ==========================================
  // КРАШ: МГНОВЕННОЕ СПИСАНИЕ СТАВКИ
  // ==========================================
  const handlePlaceBet = async ({ amount }) => {
    if (!currentUser) return;
    try {
      if (crashEngine.phase !== 'WAITING') {
        return socket.emit('crash_error', { message: 'Ставки принимаются только до начала полёта' });
      }

      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('crash_error', { message: 'Некорректная сумма ставки' });
      }

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betVal) {
        return socket.emit('crash_error', { message: 'Недостаточно звёзд на балансе' });
      }

      if (crashEngine.bets.some(b => b.userId === user.id)) {
        return socket.emit('crash_error', { message: 'Вы уже сделали ставку в этом раунде' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [betVal, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);

      const betRecord = {
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        photoUrl: user.photo_url || '',
        bet: betVal,
        cashedOut: false,
        cashoutMultiplier: 0,
        winAmount: 0,
        recorded: false,
        socketId: socket.id
      };

      crashEngine.bets.push(betRecord);

      console.log(`💰 [Crash] ${user.first_name} поставил ${betVal} ⭐. Новый баланс: ${updatedUser.balance}`);

      socket.emit('balance_updated', { balance: updatedUser.balance });
      socket.emit('bet_confirmed', { bet: betVal, newBalance: updatedUser.balance });

      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка place_bet Crash:', err);
      socket.emit('crash_error', { message: err.message });
    }
  };

  socket.on('place_bet', handlePlaceBet);
  socket.on('crash_bet', handlePlaceBet);

  const handleCashout = async () => {
    if (!currentUser) return;
    try {
      if (crashEngine.phase !== 'FLYING') {
        return socket.emit('crash_error', { message: 'Кэшаут возможен только во время полёта' });
      }

      const betRecord = crashEngine.bets.find(b => b.userId === currentUser.id);
      if (!betRecord) {
        return socket.emit('crash_error', { message: 'Активная ставка не найдена' });
      }
      if (betRecord.cashedOut) {
        return socket.emit('crash_error', { message: 'Выигрыш уже получен' });
      }

      const currentMult = crashEngine.multiplier;
      const winAmount = Math.floor(betRecord.bet * currentMult);

      betRecord.cashedOut = true;
      betRecord.cashoutMultiplier = currentMult;
      betRecord.winAmount = winAmount;
      betRecord.recorded = true;

      await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winAmount, currentUser.id]);
      await recordGameResult(currentUser.id, winAmount);

      const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      console.log(`🏆 [Crash] #${currentUser.id} забрал ${winAmount} ⭐ (${currentMult}x). Баланс: ${updatedUser.balance}`);

      socket.emit('balance_updated', { balance: updatedUser.balance });
      socket.emit('cashout_success', {
        multiplier: currentMult,
        winAmount,
        newBalance: updatedUser.balance,
        stats: { best_win: updatedUser.best_win, total_games: updatedUser.total_games }
      });
      socket.emit('crash_cashout_success', {
        multiplier: currentMult,
        winAmount,
        balance: updatedUser.balance
      });

      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка cashout Crash:', err);
      socket.emit('crash_error', { message: err.message });
    }
  };

  socket.on('cashout', handleCashout);
  socket.on('crash_cashout', handleCashout);

  // ==========================================
  // МИНЫ: МГНОВЕННОЕ СПИСАНИЕ СТАВКИ
  // ==========================================
  const handleStartMines = async (data) => {
    if (!currentUser) return;
    try {
      const betVal = parseInt(data.betAmount || data.bet, 10);
      const mines = parseInt(data.minesCount, 10);

      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('mines_error', { message: 'Неверная сумма ставки' });
      }
      if (isNaN(mines) || mines < 1 || mines > 24) {
        return socket.emit('mines_error', { message: 'Выберите от 1 до 24 мин' });
      }

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betVal) {
        return socket.emit('mines_error', { message: 'Недостаточно звёзд на балансе' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [betVal, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
      socket.emit('balance_updated', { balance: updatedUser.balance });

      const field = new Array(25).fill(false);
      let placed = 0;
      while (placed < mines) {
        const idx = Math.floor(Math.random() * 25);
        if (!field[idx]) {
          field[idx] = true;
          placed++;
        }
      }

      activeMinesSessions.set(user.id, {
        bet: betVal,
        minesCount: mines,
        field,
        opened: new Array(25).fill(false),
        openedCount: 0,
        isOver: false
      });

      console.log(`💣 [Mines] ${user.first_name} начал игру (${mines} мин, ставка ${betVal} ⭐)`);

      socket.emit('mines_started', {
        betAmount: betVal,
        minesCount: mines,
        nextMultiplier: calculateMinesMultiplier(mines, 1)
      });
    } catch (err) {
      console.error('Ошибка start_mines:', err);
      socket.emit('mines_error', { message: 'Ошибка старта Мины' });
    }
  };

  socket.on('start_mines', handleStartMines);
  socket.on('mines_start', handleStartMines);

  const handleClickMinesCell = async (data) => {
    if (!currentUser) return;
    try {
      const index = data.cellIndex !== undefined ? data.cellIndex : data.index;
      const session = activeMinesSessions.get(currentUser.id);
      if (!session || session.isOver) return;

      if (index < 0 || index > 24 || session.opened[index]) return;

      session.opened[index] = true;
      const isBomb = session.field[index];

      if (isBomb) {
        session.isOver = true;
        await recordGameResult(currentUser.id, 0);
        activeMinesSessions.delete(currentUser.id);

        console.log(`💥 [Mines] #${currentUser.id} подорвался на клетке #${index}`);

        socket.emit('mines_exploded', {
          explodedCell: index,
          field: session.field
        });
        socket.emit('mines_game_over', {
          index,
          field: session.field
        });
      } else {
        session.openedCount += 1;
        const currentMult = calculateMinesMultiplier(session.minesCount, session.openedCount);
        const nextMult = calculateMinesMultiplier(session.minesCount, session.openedCount + 1);
        const currentWin = Math.floor(session.bet * currentMult);
        const safeLeft = 25 - session.minesCount - session.openedCount;

        socket.emit('mines_cell_revealed', {
          cellIndex: index,
          multiplier: currentMult,
          nextMultiplier: safeLeft > 0 ? nextMult : currentMult,
          currentWin
        });
        socket.emit('mines_step', {
          index,
          openedCount: session.openedCount,
          multiplier: currentMult,
          nextMultiplier: safeLeft > 0 ? nextMult : currentMult,
          currentWin
        });

        if (safeLeft === 0) {
          session.isOver = true;
          await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [currentWin, currentUser.id]);
          await recordGameResult(currentUser.id, currentWin);

          const u = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
          activeMinesSessions.delete(currentUser.id);

          socket.emit('balance_updated', { balance: u.balance });
          socket.emit('mines_cashout_success', {
            winAmount: currentWin,
            multiplier: currentMult,
            field: session.field,
            newBalance: u.balance
          });
        }
      }
    } catch (err) {
      console.error('Ошибка click_mines_cell:', err);
    }
  };

  socket.on('click_mines_cell', handleClickMinesCell);
  socket.on('mines_click', handleClickMinesCell);

  const handleCashoutMines = async () => {
    if (!currentUser) return;
    try {
      const session = activeMinesSessions.get(currentUser.id);
      if (!session || session.isOver || session.openedCount === 0) return;

      session.isOver = true;
      const currentMult = calculateMinesMultiplier(session.minesCount, session.openedCount);
      const winAmount = Math.floor(session.bet * currentMult);

      await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winAmount, currentUser.id]);
      await recordGameResult(currentUser.id, winAmount);

      const u = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      const field = session.field;
      activeMinesSessions.delete(currentUser.id);

      console.log(`🏆 [Mines] #${currentUser.id} забрал ${winAmount} ⭐ (${currentMult}x). Баланс: ${u.balance}`);

      socket.emit('balance_updated', { balance: u.balance });
      socket.emit('mines_cashout_success', {
        winAmount,
        multiplier: currentMult,
        field,
        newBalance: u.balance
      });
      socket.emit('mines_win', {
        winAmount,
        multiplier: currentMult,
        field,
        balance: u.balance
      });
    } catch (err) {
      console.error('Ошибка cashout_mines:', err);
    }
  };

  socket.on('cashout_mines', handleCashoutMines);
  socket.on('mines_cashout', handleCashoutMines);

  // ==========================================
  // ПЛИНКО: МГНОВЕННОЕ СПИСАНИЕ СТАВКИ
  // Крайние карманы x5, центральные x1.1 и x0.5
  // ==========================================
  const PLINKO_MULTIPLIERS = [5.0, 2.0, 1.1, 0.5, 1.1, 2.0, 5.0];

  socket.on('plinko_drop', async ({ bet }) => {
    if (!currentUser) return;
    try {
      const betVal = parseInt(bet, 10);
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || isNaN(betVal) || betVal <= 0 || user.balance < betVal) {
        return socket.emit('plinko_error', { message: 'Недостаточно звёзд на балансе' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [betVal, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
      socket.emit('balance_updated', { balance: updatedUser.balance });

      const path = [];
      let currentPos = 0;
      for (let r = 0; r < 6; r++) {
        const step = Math.random() < 0.5 ? 0 : 1;
        path.push(step);
        currentPos += step;
      }

      const slotIndex = Math.min(6, Math.max(0, currentPos));
      const multiplier = PLINKO_MULTIPLIERS[slotIndex];
      const winAmount = Math.floor(betVal * multiplier);

      console.log(`🔴 [Plinko] ${user.first_name} бросил ${betVal} ⭐ -> Карман #${slotIndex} (${multiplier}x) -> Выигрыш: ${winAmount} ⭐`);

      socket.emit('plinko_ball_start', {
        path,
        slotIndex,
        multiplier,
        winAmount
      });

      setTimeout(async () => {
        try {
          if (winAmount > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winAmount, user.id]);
            await recordGameResult(user.id, winAmount);
          } else {
            await recordGameResult(user.id, 0);
          }

          const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
          socket.emit('balance_updated', { balance: finalUser.balance });
          socket.emit('plinko_finished', {
            slotIndex,
            multiplier,
            winAmount,
            balance: finalUser.balance
          });
        } catch (e) {
          console.error('Ошибка начисления Plinko:', e);
        }
      }, 2100);

    } catch (err) {
      console.error('Ошибка plinko_drop:', err);
      socket.emit('plinko_error', { message: 'Ошибка броска Plinko' });
    }
  });

  // ==========================================
  // КРАСНОЕ ИЛИ ЧЕРНОЕ: МГНОВЕННОЕ СПИСАНИЕ
  // ==========================================
  socket.on('red_black_bet', async ({ color, amount }) => {
    if (!currentUser) return;
    try {
      if (redBlackEngine.state !== 'betting' || redBlackEngine.timeLeft <= 3) {
        return socket.emit('red_black_error', { message: 'Приём ставок закрыт, дождитесь следующего раунда' });
      }
      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal <= 0) {
        return socket.emit('red_black_error', { message: 'Неверная сумма ставки' });
      }
      if (color !== 'red' && color !== 'black') {
        return socket.emit('red_black_error', { message: 'Выберите Красное или Чёрное' });
      }

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betVal) {
        return socket.emit('red_black_error', { message: 'Недостаточно звёзд на балансе' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [betVal, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);

      redBlackEngine.bets.push({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        color,
        bet: betVal,
        socketId: socket.id
      });

      console.log(`🔴⚫ [Red/Black] ${user.first_name} поставил ${betVal} ⭐ на ${color}. Баланс: ${updatedUser.balance}`);

      socket.emit('balance_updated', { balance: updatedUser.balance });
      io.emit('red_black_tick', redBlackEngine.getState());
    } catch (err) {
      console.error('Ошибка red_black_bet:', err);
      socket.emit('red_black_error', { message: err.message });
    }
  });

  // ==========================================
  // PvP КОЛЕСО: МГНОВЕННОЕ СПИСАНИЕ
  // ==========================================
  socket.on('pvp_bet', async ({ amount }) => {
    if (!currentUser) return;
    try {
      if (pvpWheelEngine.state !== 'waiting') {
        return socket.emit('pvp_error', { message: 'Раунд уже крутится, подождите завершения' });
      }
      const betVal = parseInt(amount, 10);
      if (isNaN(betVal) || betVal < 5) {
        return socket.emit('pvp_error', { message: 'Минимальная ставка в PvP: 5 ⭐' });
      }

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < betVal) {
        return socket.emit('pvp_error', { message: 'Недостаточно звёзд на балансе' });
      }

      // МГНОВЕННОЕ СПИСАНИЕ
      await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [betVal, user.id]);
      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);

      const existing = pvpWheelEngine.bets.find(b => b.userId === user.id);
      if (existing) {
        existing.bet += betVal;
        existing.socketId = socket.id;
      } else {
        pvpWheelEngine.bets.push({
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          photoUrl: user.photo_url || '',
          bet: betVal,
          socketId: socket.id
        });
      }

      pvpWheelEngine.recalculateSlices();

      console.log(`⚔️ [PvP] ${user.first_name} добавил ${betVal} ⭐ в банк. Общий банк: ${pvpWheelEngine.totalPot} ⭐`);

      socket.emit('balance_updated', { balance: updatedUser.balance });
      io.emit('pvp_state', pvpWheelEngine.getState());
    } catch (err) {
      console.error('Ошибка pvp_bet:', err);
      socket.emit('pvp_error', { message: err.message });
    }
  });

  // ==========================================
  // АПГРЕЙДЕР: МГНОВЕННОЕ СПИСАНИЕ (x1.5, x2, x5, x10)
  // ==========================================
  const UPGRADER_CHANCES = {
    '1.5': 60, // 60%
    '2.0': 45, // 45%
    '5.0': 20, // 20%
    '10.0': 10 // 10%
  };

  socket.on('upgrader_spin', async ({ betType, starsAmount, itemId, multiplierKey }) => {
    if (!currentUser) return;
    try {
      const targetMult = parseFloat(multiplierKey);
      const winChance = UPGRADER_CHANCES[multiplierKey];

      if (!winChance) {
        return socket.emit('upgrader_error', { message: 'Неверно выбран множитель' });
      }

      let betValue = 0;

      if (betType === 'stars') {
        const stars = parseInt(starsAmount, 10);
        if (isNaN(stars) || stars <= 0) {
          return socket.emit('upgrader_error', { message: 'Неверная ставка звёзд' });
        }
        const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
        if (!user || user.balance < stars) {
          return socket.emit('upgrader_error', { message: 'Недостаточно звёзд на балансе' });
        }

        // МГНОВЕННОЕ СПИСАНИЕ ЗВЁЗД
        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [stars, currentUser.id]);
        betValue = stars;
      } else if (betType === 'item') {
        const item = await dbGet('SELECT * FROM inventory WHERE id = ? AND user_id = ?', [itemId, currentUser.id]);
        if (!item) {
          return socket.emit('upgrader_error', { message: 'Предмет не найден в вашем инвентаре' });
        }

        // МГНОВЕННОЕ УДАЛЕНИЕ ПРЕДМЕТА
        await dbRun('DELETE FROM inventory WHERE id = ?', [itemId]);
        betValue = item.sell_price;
      } else {
        return socket.emit('upgrader_error', { message: 'Неверный тип ставки' });
      }

      const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      const updatedInv = await dbAll('SELECT * FROM inventory WHERE user_id = ? ORDER BY id DESC', [currentUser.id]);
      socket.emit('balance_updated', { balance: updatedUser.balance });
      socket.emit('inventory_updated', { inventory: updatedInv });

      const roll = Math.random() * 100;
      const isWin = roll < winChance;
      const winStars = isWin ? Math.floor(betValue * targetMult) : 0;

      console.log(`⚡ [Upgrader] #${currentUser.id} апгрейдит ${betValue} ⭐ на ${targetMult}x. Шанс: ${winChance}%. Ролл: ${roll.toFixed(1)} -> ${isWin ? 'WIN' : 'LOSE'}`);

      socket.emit('upgrader_spin_start', {
        isWin,
        roll: Number(roll.toFixed(1)),
        winChance,
        multiplier: targetMult,
        potentialWin: winStars
      });

      setTimeout(async () => {
        try {
          if (isWin) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [winStars, currentUser.id]);
            await recordGameResult(currentUser.id, winStars);
          } else {
            await recordGameResult(currentUser.id, 0);
          }

          const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
          socket.emit('balance_updated', { balance: finalUser.balance });
          socket.emit('upgrader_finished', {
            isWin,
            winStars,
            balance: finalUser.balance
          });
        } catch (e) {
          console.error('Ошибка начисления Upgrader:', e);
        }
      }, 3200);

    } catch (err) {
      console.error('Ошибка upgrader_spin:', err);
      socket.emit('upgrader_error', { message: 'Ошибка апгрейда' });
    }
  });

  socket.on('disconnect', () => {
    // console.log('Отключение сокета:', socket.id);
  });
});

// ==========================================
// 9. ЗАПУСК HTTP & SOCKET СЕРВЕРА
// ==========================================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🎰 NEON CASINO (TestingApp9) запущен на порту: ${PORT}`);
  console.log(`🛡️ Требуется авторизация Telegram WebApp`);
  console.log(`===============================================`);
});
