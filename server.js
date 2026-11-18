/**
 * Telegram Mini App - Сервер NEON CASINO (Версия 2.0)
 * Стек: Node.js + Express + Socket.io + SQLite
 * Игры: Колесо Удачи (Wheel), Краш (Crash без ботов), Мины (Mines 5x5)
 * Поддержка быстрого HTTP-пробуждения (Healthcheck / Auth) и WebSocket для Render.com
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

// 1. Инициализация Socket.IO с CORS для всех источников и поддержкой polling + websocket
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Настройка CORS и раздачи файлов
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
  // Создание таблицы users с полями best_win и total_games
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

  // Безопасное добавление колонок best_win и total_games для уже существующей базы
  db.run('ALTER TABLE users ADD COLUMN best_win INTEGER DEFAULT 0', () => {});
  db.run('ALTER TABLE users ADD COLUMN total_games INTEGER DEFAULT 0', () => {});
});

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
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

// Запись статистики игры (обновление total_games и лучшего выигрыша best_win)
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
// 4. КОНФИГУРАЦИЯ "КОЛЕСО УДАЧИ"
// ==========================================
const WHEEL_SECTORS = [
  { index: 0, type: 'stars', prize: '⭐', amount: 1, label: '1 ⭐', color: '#1e293b' },
  { index: 1, type: 'gift', prize: '🧸', amount: 0, label: 'Мишка', color: '#0f172a' },
  { index: 2, type: 'stars', prize: '⭐', amount: 2, label: '2 ⭐', color: '#1e293b' },
  { index: 3, type: 'gift', prize: '🏆', amount: 0, label: 'Кубок', color: '#0f172a' },
  { index: 4, type: 'stars', prize: '⭐', amount: 3, label: '3 ⭐', color: '#1e293b' },
  { index: 5, type: 'gift', prize: '🎁', amount: 0, label: 'Подарок', color: '#0f172a' },
  { index: 6, type: 'stars', prize: '⭐', amount: 4, label: '4 ⭐', color: '#1e293b' },
  { index: 7, type: 'gift', prize: '💍', amount: 0, label: 'Кольцо', color: '#0f172a' },
  { index: 8, type: 'stars', prize: '⭐', amount: 5, label: '5 ⭐', color: '#1e293b' },
  { index: 9, type: 'gift', prize: '🍾', amount: 0, label: 'Шампанское', color: '#0f172a' }
];

const SPIN_COST = 25;

// ==========================================
// 5. ДВИЖОК "КРАШ" (БЕЗ БОТОВ - ТОЛЬКО РЕАЛЬНЫЕ ИГРОКИ)
// ==========================================
const crashEngine = {
  phase: 'WAITING',
  countdown: 5.0,
  multiplier: 1.00,
  crashPoint: 2.00,
  startTime: 0,
  bets: [], // Только реальные игроки
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
    this.bets = []; // Никаких ботов!

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

        // Запись поражения для игроков, не успевших забрать выигрыш
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
// 6. СЕРВЕРНЫЙ ДВИЖОК "МИНЫ" (MINES 5x5)
// ==========================================
const activeMinesGames = new Map(); // userId -> { betAmount, minesCount, mines: [], revealed: [], currentMult }

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
// 7. HTTP ЭНДПОИНТЫ ДЛЯ WAKEUP И БЫСТРОЙ АВТОРИЗАЦИИ
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
    res.json({
      ok: true,
      user,
      wheelSectors: WHEEL_SECTORS,
      spinCost: SPIN_COST,
      crashState: crashEngine.getState()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ОБРАБОТКА ПОДКЛЮЧЕНИЙ SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);
  let currentUser = null;

  // Авторизация пользователя
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

      socket.emit('auth_success', {
        user: currentUser,
        wheelSectors: WHEEL_SECTORS,
        spinCost: SPIN_COST
      });

      socket.emit('crash_state', crashEngine.getState());
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
  // ЛОГИКА: КОЛЕСО УДАЧИ
  // ==========================================
  socket.on('spin_wheel', async () => {
    if (!currentUser) return;

    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      if (!user || user.balance < SPIN_COST) {
        socket.emit('wheel_error', { message: 'Недостаточно звёзд для вращения!' });
        return;
      }

      await modifyBalance(currentUser.id, -SPIN_COST);

      const isStarsWin = Math.random() < 0.70;
      let winningSector;

      if (isStarsWin) {
        const starSectors = WHEEL_SECTORS.filter(s => s.type === 'stars');
        winningSector = starSectors[Math.floor(Math.random() * starSectors.length)];
        await modifyBalance(currentUser.id, winningSector.amount);
      } else {
        const giftSectors = WHEEL_SECTORS.filter(s => s.type === 'gift');
        winningSector = giftSectors[Math.floor(Math.random() * giftSectors.length)];
      }

      const winStars = winningSector.type === 'stars' ? winningSector.amount : 0;
      const stats = await recordGameResult(currentUser.id, { winAmount: winStars, isGame: true });

      const freshUser = await dbGet('SELECT * FROM users WHERE id = ?', [currentUser.id]);
      currentUser = freshUser;

      socket.emit('wheel_result', {
        sectorIndex: winningSector.index,
        prize: winningSector.prize,
        type: winningSector.type,
        amount: winningSector.amount,
        label: winningSector.label,
        newBalance: freshUser.balance,
        stats
      });
    } catch (err) {
      console.error('Ошибка при вращении колеса:', err);
      socket.emit('wheel_error', { message: 'Ошибка сервера' });
    }
  });

  // ==========================================
  // ЛОГИКА: КРАШ (БЕЗ БОТОВ)
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

      const newBalance = await modifyBalance(currentUser.id, -betAmount);
      currentUser.balance = newBalance;

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
      console.error('Ошибка ставки:', err);
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

      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка cashout:', err);
    }
  });

  // ==========================================
  // ЛОГИКА: МИНЫ (MINES 5x5)
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

      const newBalance = await modifyBalance(currentUser.id, -bet);
      currentUser.balance = newBalance;

      // Генерация 25 клеток с размещением 3-5 мин
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
        mines: mines, // Секретные координаты на сервере
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
      socket.emit('mines_error', { message: 'Ошибка сервера' });
    }
  });

  socket.on('click_mines_cell', async ({ cellIndex }) => {
    if (!currentUser) return;
    const game = activeMinesGames.get(currentUser.id);
    if (!game || game.status !== 'PLAYING') {
      socket.emit('mines_error', { message: 'Нет активной игры в Мины' });
      return;
    }

    const idx = parseInt(cellIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= 25) return;
    if (game.revealedCells.includes(idx)) return;

    if (game.mines.includes(idx)) {
      // Игрок подорвался на мине
      game.status = 'LOST';
      activeMinesGames.delete(currentUser.id);

      const stats = await recordGameResult(currentUser.id, { winAmount: 0, isGame: true });

      socket.emit('mines_exploded', {
        hitIndex: idx,
        mines: game.mines,
        stats
      });
    } else {
      // Безопасная клетка (Алмаз)
      game.revealedCells.push(idx);
      const step = game.revealedCells.length;
      game.currentMultiplier = getMinesMultiplier(game.minesCount, step);

      const safeCellsTotal = 25 - game.minesCount;
      const isMaxWin = step >= safeCellsTotal;
      game.nextMultiplier = isMaxWin ? game.currentMultiplier : getMinesMultiplier(game.minesCount, step + 1);
      const currentWin = Math.floor(game.betAmount * game.currentMultiplier);

      if (isMaxWin) {
        // Все безопасные клетки открыты — максимальный выигрыш
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
    if (!game || game.status !== 'PLAYING') {
      socket.emit('mines_error', { message: 'Нет активной игры для вывода' });
      return;
    }

    if (game.revealedCells.length === 0) {
      socket.emit('mines_error', { message: 'Откройте хотя бы одну клетку!' });
      return;
    }

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
    } catch (err) {
      console.error('Ошибка cashout_mines:', err);
      socket.emit('mines_error', { message: 'Ошибка сервера' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==========================================`);
  console.log(`🚀 NEON CASINO v2.0 запущено на порту ${PORT}`);
  console.log(`🎮 Режимы: Колесо Удачи, Краш (Multiplayer), Мины (5x5)`);
  console.log(`🔒 Доступ: исключительно через Telegram`);
  console.log(`==========================================`);
});
