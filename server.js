const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Твой токен вставлен сюда
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9043576207:AAG8IGLNGs_NcqHiFXnBGVvmcSyOiTxqtZQ';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.db') || filePath.endsWith('server.js')) {
      res.status(403).end();
    }
  }
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const db = new sqlite3.Database(path.join(__dirname, 'casino.db'), (err) => {
  if (err) {
    console.error('Ошибка SQLite:', err.message);
  } else {
    console.log('Подключено к SQLite базе данных (casino.db)');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      photo_url TEXT,
      balance INTEGER DEFAULT 100,
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
      'INSERT INTO users (id, username, first_name, photo_url, balance) VALUES (?, ?, ?, ?, 100)',
      [userId, userData.username || '', userData.first_name || 'Игрок', userData.photo_url || '']
    );
    user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  } else {
    await dbRun(
      'UPDATE users SET username = ?, first_name = ?, photo_url = ? WHERE id = ?',
      [userData.username || user.username, userData.first_name || user.first_name, userData.photo_url || user.photo_url, userId]
    );
  }
  return user;
}

async function modifyBalance(userId, delta) {
  await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [delta, String(userId)]);
  const updated = await dbGet('SELECT balance FROM users WHERE id = ?', [String(userId)]);
  return updated ? updated.balance : 0;
}

function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const userStr = urlParams.get('user');

    if (!userStr) return null;
    const user = JSON.parse(userStr);
    if (!user || !user.id) return null;

    if (BOT_TOKEN && hash) {
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
        console.warn('Криптографическая проверка подписи не прошла!');
        return null;
      }
    }

    return user;
  } catch (err) {
    console.error('Ошибка парсинга initData:', err.message);
    return null;
  }
}

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

  generateBotBets() {
    const bots = [
      { username: 'Alex_Crypto', first_name: 'Алексей' },
      { username: 'Elena_V', first_name: 'Елена' },
      { username: 'LuckyStrike', first_name: 'Макс' },
      { username: 'MoonRocket', first_name: 'Даниил' }
    ];
    return bots.map((bot, i) => ({
      userId: `bot_${i}_${Date.now()}`,
      username: bot.username,
      first_name: bot.first_name,
      photo_url: '',
      amount: [10, 25, 50, 100][Math.floor(Math.random() * 4)],
      cashedOut: false,
      cashoutMultiplier: 0,
      winAmount: 0,
      isBot: true,
      targetCashout: Number((1.15 + Math.random() * 3.5).toFixed(2))
    }));
  },

  startRound() {
    this.phase = 'WAITING';
    this.countdown = 5.0;
    this.multiplier = 1.00;
    this.crashPoint = this.generateCrashPoint();
    this.bets = this.generateBotBets();

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

      this.bets.forEach(bet => {
        if (bet.isBot && !bet.cashedOut && this.multiplier >= bet.targetCashout && bet.targetCashout < this.crashPoint) {
          bet.cashedOut = true;
          bet.cashoutMultiplier = this.multiplier;
          bet.winAmount = Math.floor(bet.amount * this.multiplier);
        }
      });

      if (this.multiplier >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.phase = 'CRASHED';

        this.history.unshift(this.crashPoint);
        if (this.history.length > 10) this.history.pop();

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

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('auth', async ({ initData }) => {
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

  socket.on('spin_wheel', async () => {
    if (!currentUser) return;

    try {
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
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

      const freshUser = await dbGet('SELECT balance FROM users WHERE id = ?', [currentUser.id]);
      currentUser.balance = freshUser.balance;

      socket.emit('wheel_result', {
        sectorIndex: winningSector.index,
        prize: winningSector.prize,
        type: winningSector.type,
        amount: winningSector.amount,
        label: winningSector.label,
        newBalance: freshUser.balance
      });
    } catch (err) {
      console.error('Ошибка при вращении колеса:', err);
      socket.emit('wheel_error', { message: 'Ошибка сервера' });
    }
  });

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
        isBot: false
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

    try {
      const newBalance = await modifyBalance(currentUser.id, winAmount);
      currentUser.balance = newBalance;

      socket.emit('cashout_success', {
        multiplier: currentMult,
        winAmount,
        newBalance
      });

      io.emit('crash_bets_update', { bets: crashEngine.bets });
    } catch (err) {
      console.error('Ошибка cashout:', err);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==========================================`);
  console.log(`🚀 NEON CASINO запущено на порту ${PORT}`);
  console.log(`🔒 Доступ: исключительно через Telegram`);
  console.log(`==========================================`);
});
