/* =============================================================================
 *  SHADOW VAULT — Telegram Mini App RPG
 *  server.js — единая точка входа: Express + Socket.io + MongoDB (Mongoose)
 *
 *  ВАЖНО: вся боевая математика считается ТОЛЬКО на сервере.
 *  Клиент получает уже готовые числа урона и события боя для анимации.
 *
 *  Разделы:
 *    0. Окружение и конфиг
 *    1. Модели данных (Mongoose) + fallback-хранилище в памяти
 *    2. Игровые данные (герои, предметы, сеты, кампания, босс)
 *    3. Расчёт характеристик (герой + экипировка + сеты)
 *    4. Боевой движок (Turn Meter, скиллы, баффы, стихии)
 *    5. Авторизация Telegram WebApp
 *    6. REST API
 *    7. Socket.io — живые бои
 *    8. Админ-панель
 *    9. Запуск
 * ========================================================================== */

'use strict';

/* =============================== 0. ОКРУЖЕНИЕ ============================= */

const path = require('path');

/* .env ищем рядом с server.js, а не по текущей рабочей папке.
 * Иначе `node Testings/server.js`, запущенный из другого каталога,
 * не находит токен и молча уходит в режим без проверки подписи. */
const ENV_PATH = path.join(__dirname, '.env');
try {
  require('dotenv').config({ path: ENV_PATH });
} catch (_) {
  /* dotenv опционален */
}

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
/**
 * Санитайзер токена. Самая частая причина «BAD_SIGNATURE» — мусор вокруг токена
 * в .env: кавычки, пробел, \r\n из Windows-файла, префикс «bot».
 */
const BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '')
  .replace(/[\r\n\t]/g, '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/^bot/i, '')
  .trim();
const TOKEN_TAIL = BOT_TOKEN ? BOT_TOKEN.slice(-4) : '';
const MONGO_URI = process.env.MONGO_URI || '';
const DB_MODE = (process.env.DB_MODE || (MONGO_URI ? 'mongo' : 'memory')).toLowerCase();
const ADMIN_IDS = (process.env.ADMIN_IDS || '8213153991')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const IS_PROD = process.env.NODE_ENV === 'production';

const CFG = {
  maxEnergy: 50,
  energyRegenMs: 5 * 60 * 1000, // 1 единица за 5 минут
  battleEnergyCost: 6,
  bossAttemptsPerDay: 3,
  maxTeam: 4,
  fusionNeed: 3,
  forgeMaxLevel: 15,
  summonCostStars: 100,
  refillCostStars: 20,
  refillEnergy: 50,
  arenaReward: { win: 350, lose: 90 },
  arenaDelta: { win: 18, lose: 12 },
  logTTL: 30 * 60 * 1000, // время жизни боя в памяти
};

/* ============================ 1. МОДЕЛИ ДАННЫХ =========================== */

/* ---------- Экипировка (встроенный документ) ---------- */
const ItemSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    slot: { type: String, required: true }, // weapon|helmet|shield|gloves|chest|boots
    setId: { type: String, required: true }, // speed|attack|life
    rarity: { type: String, required: true }, // common|rare|epic|legendary
    level: { type: Number, default: 0 },
    main: { stat: String, value: Number },
    subs: [{ stat: String, value: Number }],
    equippedBy: { type: String, default: null }, // uid героя
  },
  { _id: false }
);

/* ---------- Герой (встроенный документ) ---------- */
const HeroSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    key: { type: String, required: true }, // hero_warrior_ember и т.д.
    stars: { type: Number, default: 3 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
  },
  { _id: false }
);

/* ---------- Игрок ---------- */
const UserSchema = new mongoose.Schema(
  {
    tgId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: '' },
    firstName: { type: String, default: 'Безымянный' },
    gold: { type: Number, default: 3000 },
    stars: { type: Number, default: 25 },
    energy: { type: Number, default: CFG.maxEnergy },
    energyTs: { type: Number, default: () => Date.now() },
    rating: { type: Number, default: 1000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    heroes: { type: [HeroSchema], default: [] },
    items: { type: [ItemSchema], default: [] },
    team: { type: [String], default: [] },
    campaign: {
      cleared: { type: Number, default: 0 }, // сколько этапов пройдено
    },
    boss: {
      date: { type: String, default: '' },
      attempts: { type: Number, default: 0 },
      damage: { type: Number, default: 0 },
    },
    lastSeen: { type: Number, default: () => Date.now() },
  },
  { timestamps: true, minimize: false }
);

/* ---------- Ежедневный рейд-босс ---------- */
const BossSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true },
  level: { type: Number, default: 1 },
  maxHp: { type: Number, default: 1 },
  hp: { type: Number, default: 1 },
  damage: { type: Object, default: {} }, // { tgId: totalDamage }
  hits: { type: Number, default: 0 },
});

let User, Boss;
let dbReady = false;

/* ---------- Fallback-хранилище (DB_MODE=memory) ----------
 * Нужно, чтобы проект запускался и тестировался без установленного MongoDB.
 * API полностью идентичен «настоящему» режиму. */
const mem = { users: new Map(), boss: new Map() };

const Store = {
  async findUser(tgId) {
    if (dbReady) return User.findOne({ tgId: String(tgId) });
    return mem.users.get(String(tgId)) || null;
  },
  async createUser(data) {
    if (dbReady) return User.create(data);
    const doc = {
      tgId: String(data.tgId),
      username: '',
      firstName: 'Безымянный',
      gold: 3000,
      stars: 25,
      energy: CFG.maxEnergy,
      energyTs: Date.now(),
      rating: 1000,
      wins: 0,
      losses: 0,
      banned: false,
      banReason: '',
      heroes: [],
      items: [],
      team: [],
      campaign: { cleared: 0 },
      boss: { date: '', attempts: 0, damage: 0 },
      lastSeen: Date.now(),
      ...data,
      tgId: String(data.tgId),
    };
    mem.users.set(doc.tgId, doc);
    return doc;
  },
  async save(user) {
    if (dbReady) {
      await user.save();
      return user;
    }
    mem.users.set(String(user.tgId), user);
    return user;
  },
  async listUsers() {
    if (dbReady) return User.find({}).lean();
    return [...mem.users.values()];
  },
  async getBoss(date, factory) {
    if (dbReady) {
      let doc = await Boss.findOne({ date });
      if (!doc) doc = await Boss.create(factory());
      return doc;
    }
    if (!mem.boss.has(date)) mem.boss.set(date, factory());
    return mem.boss.get(date);
  },
  async saveBoss(doc) {
    if (dbReady) {
      if (typeof doc.save === 'function') await doc.save();
      else await Boss.updateOne({ date: doc.date }, { $set: doc }, { upsert: true });
      return doc;
    }
    mem.boss.set(doc.date, doc);
    return doc;
  },
};

/* =========================== 2. ИГРОВЫЕ ДАННЫЕ =========================== */

/* ---- Стихии: Огонь > Природа > Магия > Огонь (+ Вода бьёт Огонь) ---- */
const AFFINITY = {
  fire: { name: 'Огонь', color: '#B4552F', icon: '🔥', beats: ['nature'], strong: 1.15, weak: 0.65 },
  nature: { name: 'Природа', color: '#5E7A4A', icon: '🌿', beats: ['water', 'magic'], strong: 1.15, weak: 0.65 },
  magic: { name: 'Магия', color: '#6A5B8C', icon: '✦', beats: ['fire'], strong: 1.15, weak: 0.65 },
  water: { name: 'Вода', color: '#3E6E86', icon: '💧', beats: ['fire'], strong: 1.15, weak: 0.65 },
};

/* ---- Классы ---- */
const CLASSES = {
  warrior: {
    name: 'Воин',
    role: 'Танк / Защита',
    base: { hp: 1250, atk: 96, def: 124, speed: 96, crit: 10, critDmg: 50 },
  },
  mage: {
    name: 'Маг',
    role: 'Урон по площади',
    base: { hp: 940, atk: 138, def: 82, speed: 104, crit: 12, critDmg: 55 },
  },
  assassin: {
    name: 'Ассасин',
    role: 'Скорость / Крит',
    base: { hp: 980, atk: 128, def: 74, speed: 124, crit: 26, critDmg: 68 },
  },
};

/* ---- Каталог героев (ключ = имя файла в images/heroes/) ---- */
const HEROES = {
  hero_warrior_ember: {
    name: 'Кармин',
    title: 'Пепельный Страж',
    className: 'warrior',
    affinity: 'fire',
    img: 'images/heroes/hero_warrior_ember.png',
  },
  hero_warrior_bastion: {
    name: 'Торн',
    title: 'Крепость',
    className: 'warrior',
    affinity: 'nature',
    img: 'images/heroes/hero_warrior_bastion.png',
  },
  hero_mage_ember: {
    name: 'Веспер',
    title: 'Уголь',
    className: 'mage',
    affinity: 'fire',
    img: 'images/heroes/hero_mage_ember.png',
  },
  hero_mage_frost: {
    name: 'Илира',
    title: 'Иней',
    className: 'mage',
    affinity: 'water',
    img: 'images/heroes/hero_mage_frost.png',
  },
  hero_assassin_night: {
    name: 'Каин',
    title: 'Тень',
    className: 'assassin',
    affinity: 'magic',
    img: 'images/heroes/hero_assassin_night.png',
  },
  hero_assassin_thorn: {
    name: 'Рэйв',
    title: 'Терн',
    className: 'assassin',
    affinity: 'nature',
    img: 'images/heroes/hero_assassin_thorn.png',
  },
};
const HERO_KEYS = Object.keys(HEROES);

/* ---- Скиллы по классам: 1 базовая атака + 1 активный скилл (КД 3 хода) ---- */
const SKILLS = {
  warrior: [
    {
      id: 'basic',
      name: 'Удар щитом',
      target: 'single',
      mult: 1.0,
      desc: 'Базовая атака. Урон равен атаке.',
    },
    {
      id: 'bastion',
      name: 'Клич Бастиона',
      target: 'allies',
      cd: 3,
      shieldPct: 25,
      counter: true,
      desc: 'Щит на 25% HP всей команде на 2 хода, себе — контратаку на 2 хода.',
    },
  ],
  mage: [
    {
      id: 'basic',
      name: 'Искра',
      target: 'single',
      mult: 1.05,
      desc: 'Базовая атака огнём/льдом.',
    },
    {
      id: 'pyro',
      name: 'Волна пламени',
      target: 'all',
      mult: 0.85,
      cd: 3,
      poison: { value: 5, turns: 2, chance: 0.6 },
      desc: 'Урон по всем врагам, 60% шанс яда на 2 хода.',
    },
  ],
  assassin: [
    {
      id: 'basic',
      name: 'Разрез',
      target: 'single',
      mult: 1.0,
      desc: 'Базовая атака клинками.',
    },
    {
      id: 'shadow',
      name: 'Теневой выпад',
      target: 'single',
      mult: 2.2,
      cd: 3,
      critBonus: 30,
      defPen: 0.5,
      defDown: { value: 25, turns: 2 },
      desc: 'Мощный удар: игнорирует 50% защиты, +30% крита, снижает защиту цели на 25%.',
    },
  ],
};

/* ---- Монстры ---- */
const MONSTERS = {
  minion_husk: {
    name: 'Иссохший',
    img: 'images/monsters/minion_husk.png',
    affinity: 'magic',
    stats: { hp: 520, atk: 64, def: 58, speed: 92, crit: 8, critDmg: 45 },
    skills: [
      { id: 'basic', name: 'Ржавый клинок', target: 'single', mult: 1.0 },
      { id: 'sunder', name: 'Раскол брони', target: 'single', mult: 1.15, cd: 3, defDown: { value: 20, turns: 2 } },
    ],
  },
  minion_stalker: {
    name: 'Ловчий Тени',
    img: 'images/monsters/minion_stalker.png',
    affinity: 'nature',
    stats: { hp: 440, atk: 80, def: 40, speed: 116, crit: 18, critDmg: 55 },
    skills: [
      { id: 'basic', name: 'Разрывающий укус', target: 'single', mult: 1.0 },
      { id: 'venom', name: 'Ядовитый шип', target: 'single', mult: 1.1, cd: 3, poison: { value: 6, turns: 2, chance: 1 } },
    ],
  },
  boss_obsidian: {
    name: 'Обсидиановый Владыка',
    img: 'images/monsters/boss_obsidian.png',
    affinity: 'fire',
    isBoss: true,
    stats: { hp: 200000, atk: 240, def: 210, speed: 108, crit: 15, critDmg: 60 },
    skills: [
      { id: 'basic', name: 'Рассекающий клинок', target: 'single', mult: 1.15 },
      { id: 'cataclysm', name: 'Обсидиановый Разлом', target: 'all', mult: 0.9, cd: 3, poison: { value: 6, turns: 2, chance: 0.5 } },
    ],
  },
};

/* ---- Экипировка ---- */
const SLOTS = {
  weapon: { name: 'Оружие', main: 'atk', base: 34, icon: 'images/items/item_weapon.svg' },
  helmet: { name: 'Шлем', main: 'hp', base: 240, icon: 'images/items/item_helmet.svg' },
  shield: { name: 'Щит', main: 'def', base: 28, icon: 'images/items/item_shield.svg' },
  gloves: { name: 'Перчатки', main: 'atk', base: 22, icon: 'images/items/item_gloves.svg' },
  chest: { name: 'Нагрудник', main: 'hp', base: 320, icon: 'images/items/item_chest.svg' },
  boots: { name: 'Сапоги', main: 'speed', base: 7, icon: 'images/items/item_boots.svg' },
};

const RARITIES = {
  common: { name: 'Обычный', mult: 1.0, subs: 2, color: '#8A8F98' },
  rare: { name: 'Редкий', mult: 1.35, subs: 2, color: '#5E86A8' },
  epic: { name: 'Эпический', mult: 1.8, subs: 3, color: '#8A6FB0' },
  legendary: { name: 'Легендарный', mult: 2.4, subs: 4, color: '#C8A55B' },
};

const SETS = {
  speed: {
    name: 'Сет Скорости',
    parts: {
      2: { speed: 12 },
      4: { speed: 25, atk: 10 },
    },
  },
  attack: {
    name: 'Сет Атаки',
    parts: {
      2: { atk: 12 },
      4: { atk: 30, crit: 10 },
    },
  },
  life: {
    name: 'Сет Жизни',
    parts: {
      2: { hp: 15 },
      4: { hp: 35, def: 15 },
    },
  },
};

const STAT_INFO = {
  hp: { name: 'HP', icon: 'images/ui/stat_hp.svg' },
  atk: { name: 'Атака', icon: 'images/ui/stat_attack.svg' },
  def: { name: 'Защита', icon: 'images/ui/stat_defense.svg' },
  speed: { name: 'Скорость', icon: 'images/ui/stat_speed.svg' },
  crit: { name: 'Шанс крита', icon: 'images/ui/stat_crit.svg' },
  critDmg: { name: 'Урон крита', icon: 'images/ui/stat_crit.svg' },
};

/* ---- Кампания: 12 этапов ---- */
function buildCampaign() {
  const titles = [
    'Пепельные Пределы',
    'Кости Предтеч',
    'Затонувший Дозор',
    'Терновый Проход',
    'Кузня Молчания',
    'Стеклянная Пустошь',
    'Чертог Ржавчины',
    'Разлом Стихий',
    'Тень над Шпилем',
    'Врата Обсидиана',
    'Палата Мёртвых Королей',
    'Трон Владыки',
  ];
  return titles.map((title, i) => {
    const stage = i + 1;
    const enemies = [];
    const count = stage < 3 ? 2 : stage < 6 ? 3 : 3;
    for (let k = 0; k < count; k++) {
      const key = (stage + k) % 2 === 0 ? 'minion_stalker' : 'minion_husk';
      enemies.push({ key, level: stage });
    }
    if (stage >= 9) enemies.push({ key: 'minion_stalker', level: stage });
    return {
      id: stage,
      name: `${title}`,
      subtitle: `Этап ${stage}`,
      energy: CFG.battleEnergyCost,
      enemies,
      level: stage,
      rewards: {
        gold: 120 + stage * 65,
        xp: 40 + stage * 22,
        itemChance: 0.35 + stage * 0.02,
      },
      firstClear: { gold: 300 + stage * 120, stars: stage % 3 === 0 ? 5 : 0 },
    };
  });
}
const CAMPAIGN = buildCampaign();

/* ==================== 3. РАСЧЁТ ХАРАКТЕРИСТИК ГЕРОЯ ===================== */

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}
function rnd(a, b) {
  return a + Math.random() * (b - a);
}
function rndInt(a, b) {
  return Math.floor(rnd(a, b + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/* Базовые статы героя с учётом звёзд и уровня */
function heroBaseStats(key, stars, level) {
  const meta = HEROES[key];
  if (!meta) throw new Error(`UNKNOWN_HERO:${key}`);
  const base = CLASSES[meta.className].base;
  const starMult = 1 + 0.28 * (stars - 1);
  const levelMult = 1 + 0.058 * (level - 1);
  const m = starMult * levelMult;
  return {
    hp: Math.round(base.hp * m),
    atk: Math.round(base.atk * m),
    def: Math.round(base.def * m),
    speed: Math.round(base.speed * (1 + 0.015 * (level - 1))),
    crit: Math.round(base.crit + (stars - 3) * 1.5),
    critDmg: Math.round(base.critDmg + (stars - 3) * 4),
  };
}

/* Полный расчёт: база + экипировка + сетовые бонусы */
function computeHero(hero, items) {
  const meta = HEROES[hero.key];
  const base = heroBaseStats(hero.key, hero.stars, hero.level);
  const flat = { hp: 0, atk: 0, def: 0, speed: 0, crit: 0, critDmg: 0 };
  const pct = { hp: 0, atk: 0, def: 0, speed: 0, crit: 0, critDmg: 0 };

  const equipped = (items || []).filter((it) => it.equippedBy === hero.uid);
  const setCount = {};

  for (const it of equipped) {
    if (it.main && flat[it.main.stat] !== undefined) flat[it.main.stat] += it.main.value;
    for (const s of it.subs || []) {
      if (flat[s.stat] !== undefined) flat[s.stat] += s.value;
    }
    setCount[it.setId] = (setCount[it.setId] || 0) + 1;
  }

  const activeSets = [];
  for (const [setId, count] of Object.entries(setCount)) {
    const def = SETS[setId];
    if (!def) continue;
    for (const [needStr, bonus] of Object.entries(def.parts)) {
      const need = Number(needStr);
      if (count >= need) {
        for (const [stat, val] of Object.entries(bonus)) {
          if (pct[stat] !== undefined) pct[stat] += val;
        }
        activeSets.push({ setId, need, bonus, name: def.name });
      }
    }
  }

  const stats = {};
  for (const stat of ['hp', 'atk', 'def', 'speed', 'crit', 'critDmg']) {
    const value = (base[stat] + flat[stat]) * (1 + pct[stat] / 100);
    stats[stat] = Math.round(value);
  }

  const power =
    Math.round(stats.hp / 12 + stats.atk * 2.4 + stats.def * 1.8 + stats.speed * 2.2 + stats.crit * 4 + stats.critDmg * 1.6);

  return {
    uid: hero.uid,
    key: hero.key,
    name: meta.name,
    title: meta.title,
    className: meta.className,
    classNameRu: CLASSES[meta.className].name,
    affinity: meta.affinity,
    affinityRu: AFFINITY[meta.affinity].name,
    img: meta.img,
    stars: hero.stars,
    level: hero.level,
    xp: hero.xp,
    maxLevel: 10 + hero.stars * 10,
    stats,
    base,
    pct,
    power,
    equipped,
    activeSets,
    skills: SKILLS[meta.className],
  };
}

/* Опыт и уровни */
function xpNeeded(level) {
  return Math.round(80 * Math.pow(level, 1.42));
}

function addHeroXp(hero, amount) {
  const maxLevel = 10 + hero.stars * 10;
  let gained = 0;
  hero.xp = (hero.xp || 0) + amount;
  while (hero.level < maxLevel && hero.xp >= xpNeeded(hero.level)) {
    hero.xp -= xpNeeded(hero.level);
    hero.level += 1;
    gained += 1;
  }
  if (hero.level >= maxLevel) hero.xp = 0;
  return gained;
}

/* Генерация предмета */
const SUB_POOL = ['atk', 'hp', 'def', 'speed', 'crit', 'critDmg'];

function rollItem(slot, rarity, opts = {}) {
  const slotDef = SLOTS[slot];
  const rar = RARITIES[rarity];
  const level = opts.level || 0;
  const scale = rar.mult * (1 + 0.08 * level);
  const mainValue = Math.round(slotDef.base * scale * rnd(0.92, 1.08));

  const subs = [];
  const pool = SUB_POOL.filter((s) => s !== slotDef.main);
  for (let i = 0; i < rar.subs; i++) {
    const stat = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (!stat) break;
    const base = { hp: 90, atk: 12, def: 10, speed: 3, crit: 2, critDmg: 6 }[stat];
    subs.push({ stat, value: Math.max(1, Math.round(base * scale * rnd(0.7, 1.15))) });
  }

  return {
    uid: uid('it'),
    slot,
    setId: opts.setId || pick(Object.keys(SETS)),
    rarity,
    level,
    main: { stat: slotDef.main, value: mainValue },
    subs,
    equippedBy: null,
  };
}

function rollRarity(boost = 0) {
  const r = Math.random() * 100 + boost;
  if (r > 96) return 'legendary';
  if (r > 82) return 'epic';
  if (r > 55) return 'rare';
  return 'common';
}

/* ======================= 4. БОЕВОЙ ДВИЖОК =============================== */

/** Коэффициент стихий: 1.15 если бьёт «слабым», 0.65 если бьёт в «сильного». */
function affinityFactor(attackerAff, targetAff) {
  if (!attackerAff || !targetAff) return 1;
  const att = AFFINITY[attackerAff];
  const tgt = AFFINITY[targetAff];
  if (!att || !tgt) return 1;
  if (att.beats.includes(targetAff)) return att.strong;
  if (tgt.beats.includes(attackerAff)) return att.weak;
  return 1;
}

function makeUnit(spec) {
  const stats = spec.stats;
  return {
    uid: spec.uid,
    name: spec.name,
    className: spec.className || 'monster',
    affinity: spec.affinity,
    side: spec.side, // 'player' | 'enemy'
    img: spec.img,
    isBoss: !!spec.isBoss,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    speed: stats.speed,
    crit: stats.crit,
    critDmg: stats.critDmg,
    tm: spec.tm || 0,
    cd: [0, 0],
    buffs: [],
    alive: true,
    skills: spec.skills,
    heroKey: spec.heroKey || null,
  };
}

function unitFromHero(hero, items, side, index) {
  const computed = computeHero(hero, items);
  const unit = makeUnit({
    uid: hero.uid,
    name: `${computed.name} · ${computed.title}`,
    className: computed.className,
    affinity: computed.affinity,
    side,
    img: computed.img,
    stats: computed.stats,
    skills: computed.skills,
    heroKey: hero.key,
    tm: index * 4,
  });
  unit.stars = computed.stars;
  unit.level = computed.level;
  return unit;
}

/** Безопасная сборка юнита: неизвестный ключ героя не роняет бой. */
function safeUnitFromHero(hero, items, side, index) {
  try {
    if (!hero || !HEROES[hero.key]) return null;
    return unitFromHero(hero, items, side, index);
  } catch (e) {
    return null;
  }
}

function unitFromMonster(key, level, side, index, opts = {}) {
  const meta = MONSTERS[key];
  const scale = 1 + (level - 1) * 0.19;
  const stats = {
    hp: Math.round(meta.stats.hp * scale),
    atk: Math.round(meta.stats.atk * scale),
    def: Math.round(meta.stats.def * scale),
    speed: meta.stats.speed,
    crit: meta.stats.crit,
    critDmg: meta.stats.critDmg,
  };
  if (opts.hp) stats.hp = opts.hp; // для босса — остаток HP
  const unit = makeUnit({
    uid: `${key}_${index}_${crypto.randomBytes(2).toString('hex')}`,
    name: opts.name || meta.name,
    className: 'monster',
    affinity: meta.affinity,
    side,
    img: meta.img,
    stats,
    skills: meta.skills,
    isBoss: !!meta.isBoss,
    tm: index * 4,
  });
  unit.monsterKey = key;
  return unit;
}

/* --- Баффы / дебаффы --- */
function addBuff(unit, buff) {
  if (buff.type === 'shield' || buff.type === 'poison') {
    unit.buffs.push(buff); // стакается
  } else {
    const existing = unit.buffs.find((b) => b.type === buff.type);
    if (existing) {
      existing.turns = Math.max(existing.turns, buff.turns);
      existing.value = Math.max(existing.value || 0, buff.value || 0);
    } else {
      unit.buffs.push(buff);
    }
  }
}

function removeBuff(unit, type) {
  unit.buffs = unit.buffs.filter((b) => b.type !== type);
}

function hasBuff(unit, type) {
  return unit.buffs.some((b) => b.type === type);
}

function effDef(unit) {
  let def = unit.def;
  for (const b of unit.buffs) {
    if (b.type === 'defDown') def *= 1 - b.value / 100;
    if (b.type === 'defUp') def *= 1 + b.value / 100;
  }
  return Math.max(1, def);
}

/* --- Урон --- */
function calcDamage(attacker, target, skill) {
  const def = effDef(target) * (1 - (skill.defPen || 0));
  const mitigation = def / (def + 800); // 800 — константа баланса
  let dmg = attacker.atk * (skill.mult || 1) * (1 - mitigation);

  const affFactor = affinityFactor(attacker.affinity, target.affinity);
  dmg *= affFactor;

  const critChance = attacker.crit + (skill.critBonus || 0);
  const crit = Math.random() * 100 < critChance;
  if (crit) dmg *= 1 + attacker.critDmg / 100;

  dmg *= rnd(0.92, 1.08);
  dmg = Math.max(1, Math.round(dmg));

  let affLabel = 'neutral';
  if (affFactor > 1) affLabel = 'strong';
  else if (affFactor < 1) affLabel = 'weak';

  return { dmg, crit, affinity: affLabel };
}

/** Наносит урон с учётом щитов. Возвращает фактически снятое HP. */
function applyDamage(target, amount) {
  let left = amount;
  let absorbed = 0;
  for (const shield of target.buffs.filter((b) => b.type === 'shield')) {
    if (left <= 0) break;
    const take = Math.min(shield.value, left);
    shield.value -= take;
    left -= take;
    absorbed += take;
  }
  target.buffs = target.buffs.filter((b) => b.type !== 'shield' || b.value > 0);

  target.hp = Math.max(0, target.hp - left);
  if (target.hp <= 0) target.alive = false;
  return { dealt: left, absorbed };
}

/* --- Создание боя --- */
function createBattle({ mode, playerUnits, enemyUnits, meta = {} }) {
  return {
    id: uid('bt'),
    mode, // campaign | boss | arena
    units: [...playerUnits, ...enemyUnits],
    actor: null,
    turnNo: 0,
    over: false,
    result: null,
    meta,
    createdAt: Date.now(),
  };
}

function aliveOf(battle, side) {
  return battle.units.filter((u) => u.alive && (side ? u.side === side : true));
}

/** Выбирает следующего актёра по шкале хода (Turn Meter). */
function pickNext(battle) {
  const alive = aliveOf(battle);
  if (!alive.length) return null;
  let best = alive[0];
  let bestTime = Infinity;
  for (const u of alive) {
    const t = (100 - u.tm) / u.speed;
    if (t < bestTime - 1e-9) {
      bestTime = t;
      best = u;
    }
  }
  for (const u of alive) u.tm = Math.min(100, u.tm + u.speed * bestTime);
  best.tm = 0;
  return best;
}

function startTurn(battle, unit, events) {
  battle.turnNo += 1;
  unit.cd = unit.cd.map((c) => Math.max(0, c - 1));
  events.push({ type: 'turn', unit: unit.uid, turnNo: battle.turnNo });

  // Яд тикает в начале хода носителя
  const poisons = unit.buffs.filter((b) => b.type === 'poison');
  for (const p of poisons) {
    const applied = applyDamage(unit, p.value);
    events.push({
      type: 'damage',
      source: 'poison',
      actor: null,
      target: unit.uid,
      dmg: Math.round(applied.dealt),
      absorbed: Math.round(applied.absorbed),
      crit: false,
      affinity: 'neutral',
      hp: Math.round(unit.hp),
      maxHp: unit.maxHp,
    });
    if (!unit.alive) {
      events.push({ type: 'death', unit: unit.uid });
      break;
    }
  }

  // Спад длительности баффов
  unit.buffs = unit.buffs.filter((b) => {
    if (b.type === 'poison') return b.turns > 0;
    b.turns -= 1;
    return b.turns > 0;
  });
}

function getSkills(unit) {
  if (unit.skills) return unit.skills;
  return SKILLS[unit.className] || SKILLS.warrior;
}

function resolveSkill(battle, actor, skillIndex, targetUid, events) {
  const skills = getSkills(actor);
  const skill = skills[skillIndex] || skills[0];
  const idx = skills.indexOf(skill);

  // проверка КД
  if (idx > 0 && actor.cd[idx] > 0) {
    return { error: 'SKILL_ON_COOLDOWN' };
  }

  actor.cd[idx] = skill.cd || 0;

  const foes = aliveOf(battle).filter((u) => u.side !== actor.side);
  const allies = aliveOf(battle).filter((u) => u.side === actor.side);

  if (skill.target === 'allies') {
    events.push({ type: 'skill', actor: actor.uid, skill: skill.name, skillId: skill.id, targets: allies.map((a) => a.uid) });
    for (const ally of allies) {
      if (skill.shieldPct) {
        addBuff(ally, { type: 'shield', value: Math.round((ally.maxHp * skill.shieldPct) / 100), turns: 2 });
      }
    }
    if (skill.counter) addBuff(actor, { type: 'counter', turns: 2 });
    events.push({ type: 'buff', targets: allies.map((a) => a.uid), buff: 'shield', unit: actor.uid });
    if (skill.counter) events.push({ type: 'buff', targets: [actor.uid], buff: 'counter', unit: actor.uid });
    return { ok: true };
  }

  let targets;
  if (skill.target === 'all') {
    targets = foes;
  } else {
    const chosen = foes.find((u) => u.uid === targetUid);
    targets = [chosen || foes[0]];
  }
  if (!targets.length) return { ok: true };

  events.push({ type: 'skill', actor: actor.uid, skill: skill.name, skillId: skill.id, targets: targets.map((t) => t.uid) });

  for (const target of targets) {
    if (!target.alive) continue;
    hit(battle, actor, target, skill, events);
  }
  return { ok: true };
}

function hit(battle, attacker, target, skill, events) {
  const { dmg, crit, affinity } = calcDamage(attacker, target, skill);
  const applied = applyDamage(target, dmg);

  events.push({
    type: 'damage',
    source: skill.id,
    actor: attacker.uid,
    target: target.uid,
    dmg: Math.round(applied.dealt),
    absorbed: Math.round(applied.absorbed),
    crit,
    affinity,
    hp: Math.round(target.hp),
    maxHp: target.maxHp,
  });

  if (!target.alive) {
    events.push({ type: 'death', unit: target.uid });
    return;
  }

  if (skill.poison && Math.random() < (skill.poison.chance ?? 1)) {
    // Яд = % от макс. HP цели, но не больше 75% атаки отравителя:
    // иначе на рейд-боссе с гигантским пулом HP яд превращается в имбу.
    const byHp = (target.maxHp * skill.poison.value) / 100;
    const byAtk = attacker.atk * 0.75;
    addBuff(target, {
      type: 'poison',
      value: Math.max(1, Math.round(Math.min(byHp, byAtk))),
      turns: skill.poison.turns,
    });
    events.push({ type: 'buff', targets: [target.uid], buff: 'poison', unit: target.uid });
  }

  if (skill.defDown) {
    addBuff(target, { type: 'defDown', value: skill.defDown.value, turns: skill.defDown.turns });
    events.push({ type: 'buff', targets: [target.uid], buff: 'defDown', unit: target.uid });
  }

  // Контратака (только в ответ на одиночную атаку и не сама контратака)
  if (!skill.isCounter && skill.target !== 'all' && hasBuff(target, 'counter') && attacker.alive) {
    removeBuff(target, 'counter');
    events.push({ type: 'counter', actor: target.uid, target: attacker.uid });
    const counterSkill = { id: 'counter', name: 'Контратака', mult: 0.6, isCounter: true, target: 'single' };
    const c = calcDamage(target, attacker, counterSkill);
    const cApplied = applyDamage(attacker, c.dmg);
    events.push({
      type: 'damage',
      source: 'counter',
      actor: target.uid,
      target: attacker.uid,
      dmg: Math.round(cApplied.dealt),
      absorbed: Math.round(cApplied.absorbed),
      crit: c.crit,
      affinity: c.affinity,
      hp: Math.round(attacker.hp),
      maxHp: attacker.maxHp,
    });
    if (!attacker.alive) events.push({ type: 'death', unit: attacker.uid });
  }
}

function checkEnd(battle, events) {
  const players = aliveOf(battle, 'player');
  const enemies = aliveOf(battle).filter((u) => u.side !== 'player');
  if (players.length && enemies.length) return false;
  battle.over = true;
  battle.result = { win: players.length > 0 };
  events.push({ type: 'end', win: battle.result.win });
  return true;
}

/** Простая ИИ-логика: скилл, если готов; цель — самый слабый враг. */
function chooseAI(battle, unit) {
  const foes = aliveOf(battle).filter((u) => u.side !== unit.side);
  if (!foes.length) return { index: 0, targetUid: null };
  const skills = getSkills(unit);
  const hasSkill = skills.length > 1 && (unit.cd[1] || 0) === 0;
  const useSkill = hasSkill && (unit.isBoss ? battle.turnNo % 3 !== 0 : Math.random() < 0.62);
  const weakest = [...foes].sort((a, b) => a.hp - b.hp)[0];
  const randomFoe = pick(foes);
  return {
    index: useSkill ? 1 : 0,
    targetUid: useSkill ? (Math.random() < 0.5 ? weakest.uid : randomFoe.uid) : weakest.uid,
  };
}

/** Продвигает бой до момента, когда нужен ввод игрока (или до конца боя). */
function runUntilPlayerInput(battle, events) {
  let guard = 0;
  while (!battle.over && guard++ < 800) {
    if (battle.actor) return;
    const unit = pickNext(battle);
    if (!unit) {
      checkEnd(battle, events);
      return;
    }
    startTurn(battle, unit, events);
    if (checkEnd(battle, events)) return;
    if (!unit.alive) continue;

    if (unit.side === 'player') {
      battle.actor = unit;
      return;
    }
    const decision = chooseAI(battle, unit);
    resolveSkill(battle, unit, decision.index, decision.targetUid, events);
    checkEnd(battle, events);
  }
}

/** Доигрывает бой до конца (авто-бой, арена, тесты). */
function runAutoBattle(battle, events = []) {
  let guard = 0;
  while (!battle.over && guard++ < 2000) {
    if (!battle.actor) {
      const unit = pickNext(battle);
      if (!unit) break;
      startTurn(battle, unit, events);
      if (checkEnd(battle, events)) break;
      if (!unit.alive) continue;
      battle.actor = unit;
    }
    const actor = battle.actor;
    const decision = chooseAI(battle, actor);
    resolveSkill(battle, actor, decision.index, decision.targetUid, events);
    battle.actor = null;
    checkEnd(battle, events);
  }
  if (!battle.over) {
    battle.over = true;
    battle.result = { win: false };
    events.push({ type: 'end', win: false });
  }
  return events;
}

/** Публичное состояние боя для клиента. */
function battleState(battle) {
  return {
    id: battle.id,
    mode: battle.mode,
    units: battle.units.map((u) => ({
      uid: u.uid,
      name: u.name,
      className: u.className,
      affinity: u.affinity,
      side: u.side,
      img: u.img,
      isBoss: u.isBoss,
      hp: Math.round(u.hp),
      maxHp: u.maxHp,
      tm: Math.round(u.tm),
      alive: u.alive,
      buffs: u.buffs.map((b) => ({ type: b.type, turns: b.turns, value: b.value || 0 })),
      cd: u.cd,
      stars: u.stars || 0,
      level: u.level || 0,
    })),
    actor: battle.actor ? battle.actor.uid : null,
    actorSide: battle.actor ? battle.actor.side : null,
    turnNo: battle.turnNo,
    over: battle.over,
    result: battle.result,
  };
}

/* ========================= 5. TELEGRAM АВТОРИЗАЦИЯ ======================= */

/** Ошибка авторизации с машиночитаемым кодом. */
function authError(code, hint) {
  const e = new Error(hint || code);
  e.code = code;
  return e;
}

/**
 * Проверка подписи initData (Telegram WebApp).
 *
 * Важно: современные клиенты (iOS 18+, Desktop 5+, сторонние вроде ayuGram)
 * добавляют в initData поле `signature` (Ed25519). HMAC при этом считается
 * по строке БЕЗ `hash` и БЕЗ `signature`. Старые клиенты `signature` не шлют,
 * и строка собирается только из остальных полей.
 * Поэтому пробуем обе схемы — какая совпадёт, та и верна.
 */
function verifyInitData(initData) {
  if (!initData) throw authError('NO_INIT_DATA', 'Telegram не передал данные авторизации');
  if (!BOT_TOKEN) throw authError('BOT_TOKEN_MISSING', 'На сервере не задан TELEGRAM_BOT_TOKEN');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw authError('NO_HASH', 'В initData нет поля hash');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

  const buildCheckString = (exclude) =>
    [...params.entries()]
      .filter(([k]) => !exclude.includes(k))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

  const candidates = [buildCheckString(['hash'])];
  if (params.has('signature')) candidates.push(buildCheckString(['hash', 'signature']));

  const hashBuf = Buffer.from(hash, 'hex');
  let matched = false;
  for (const checkString of candidates) {
    const calc = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    const calcBuf = Buffer.from(calc, 'hex');
    if (calcBuf.length === hashBuf.length && crypto.timingSafeEqual(calcBuf, hashBuf)) {
      matched = true;
      break;
    }
  }
  if (!matched) {
    throw authError(
      'BAD_SIGNATURE',
      `Подпись не совпала с токеном бота (…${TOKEN_TAIL}). ` +
        'Проверьте, что TELEGRAM_BOT_TOKEN — токен того же бота, из которого открыта игра'
    );
  }

  const authDate = Number(params.get('auth_date') || 0) * 1000;
  if (authDate && Date.now() - authDate > 48 * 3600 * 1000) {
    throw authError('INIT_DATA_EXPIRED', 'Сессия Telegram устарела — закройте и откройте игру заново');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw authError('NO_USER', 'В initData нет данных пользователя');
  try {
    return JSON.parse(rawUser);
  } catch (e) {
    throw authError('BAD_USER_JSON', 'Не удалось разобрать данные пользователя');
  }
}

/** Разбор пользователя из initData БЕЗ проверки подписи (режим без токена). */
function parseInitDataUser(initData) {
  try {
    const raw = new URLSearchParams(initData || '').get('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || !u.id) return null;
    return { id: String(u.id), first_name: u.first_name || 'Игрок', username: u.username || '' };
  } catch (e) {
    return null;
  }
}

/**
 * Достаёт Telegram-профиль из запроса.
 * В dev-режиме (без TELEGRAM_BOT_TOKEN) разрешён вход по x-dev-id — чтобы
 * можно было отлаживать игру в обычном браузере.
 */
function telegramProfile(req) {
  const initData = req.get('x-init-data') || req.query.initData || '';

  // Токен задан — обязательная проверка подписи
  if (BOT_TOKEN) {
    const u = verifyInitData(initData);
    return { id: String(u.id), first_name: u.first_name || 'Игрок', username: u.username || '' };
  }

  // Токена нет — проверять нечем. Берём пользователя из initData как есть.
  // Так игра запускается даже на хостинге, где NODE_ENV=production по умолчанию.
  const fromTg = parseInitDataUser(initData);
  if (fromTg) return fromTg;

  const devId = req.get('x-dev-id') || req.query.devId || '1000001';
  return { id: String(devId), first_name: `Гость ${devId}`, username: `dev_${devId}` };
}

async function getOrCreateUser(profile) {
  let user = await Store.findUser(profile.id);
  if (!user) {
    user = await Store.createUser({
      tgId: String(profile.id),
      firstName: profile.first_name || 'Игрок',
      username: profile.username || '',
    });
    // стартовый набор
    const starters = ['hero_warrior_ember', 'hero_mage_ember', 'hero_assassin_night'];
    user.heroes = starters.map((key) => ({ uid: uid('h'), key, stars: 3, level: 1, xp: 0 }));
    user.team = user.heroes.map((h) => h.uid);
    user.items = [
      rollItem('weapon', 'rare', { setId: 'attack' }),
      rollItem('chest', 'common', { setId: 'life' }),
      rollItem('boots', 'common', { setId: 'speed' }),
    ];
    await Store.save(user);
  }
  return user;
}

/* Энергия: ленивая регенерация 1 ед / 5 мин */
function regenEnergy(user) {
  const now = Date.now();
  const elapsed = now - (user.energyTs || now);
  if (elapsed <= 0) return user;
  const gained = Math.floor(elapsed / CFG.energyRegenMs);
  if (gained > 0) {
    user.energy = Math.min(CFG.maxEnergy, (user.energy || 0) + gained);
    user.energyTs = (user.energyTs || now) + gained * CFG.energyRegenMs;
    if (user.energy >= CFG.maxEnergy) user.energyTs = now;
  }
  return user;
}

function energyNextIn(user) {
  if (user.energy >= CFG.maxEnergy) return 0;
  const nextAt = (user.energyTs || Date.now()) + CFG.energyRegenMs;
  return Math.max(0, nextAt - Date.now());
}

/* ======================= 6. СЕРИАЛИЗАЦИЯ И ХЕЛПЕРЫ ====================== */

function serializeUser(user) {
  regenEnergy(user);
  const heroes = user.heroes.map((h) => computeHero(h, user.items));
  const teamUids = (user.team || []).filter((u) => heroes.some((h) => h.uid === u));
  const team = heroes.filter((h) => teamUids.includes(h.uid));

  return {
    tgId: user.tgId,
    name: user.firstName,
    username: user.username,
    gold: user.gold,
    stars: user.stars,
    energy: user.energy,
    maxEnergy: CFG.maxEnergy,
    energyNextIn: energyNextIn(user),
    rating: user.rating,
    wins: user.wins,
    losses: user.losses,
    banned: user.banned,
    banReason: user.banReason || '',
    isAdmin: ADMIN_IDS.includes(String(user.tgId)),
    campaignCleared: (user.campaign && user.campaign.cleared) || 0,
    team: teamUids,
    power: team.reduce((s, h) => s + h.power, 0),
    heroes,
    items: user.items.map(serializeItem),
    boss: user.boss || { date: '', attempts: 0, damage: 0 },
    limits: {
      maxTeam: CFG.maxTeam,
      fusionNeed: CFG.fusionNeed,
      forgeMaxLevel: CFG.forgeMaxLevel,
      battleEnergyCost: CFG.battleEnergyCost,
      bossAttemptsPerDay: CFG.bossAttemptsPerDay,
      summonCostStars: CFG.summonCostStars,
      refillCostStars: CFG.refillCostStars,
    },
  };
}

function serializeItem(it) {
  return {
    uid: it.uid,
    slot: it.slot,
    slotName: SLOTS[it.slot] ? SLOTS[it.slot].name : it.slot,
    icon: SLOTS[it.slot] ? SLOTS[it.slot].icon : '',
    setId: it.setId,
    setName: SETS[it.setId] ? SETS[it.setId].name : it.setId,
    rarity: it.rarity,
    rarityName: RARITIES[it.rarity] ? RARITIES[it.rarity].name : it.rarity,
    rarityColor: RARITIES[it.rarity] ? RARITIES[it.rarity].color : '#888',
    level: it.level,
    main: it.main,
    subs: it.subs,
    equippedBy: it.equippedBy,
    power: Math.round(
      ((it.main ? it.main.value : 0) + (it.subs || []).reduce((s, x) => s + x.value, 0)) * (1 + it.level * 0.08)
    ),
  };
}

function buildTeamUnits(user) {
  const uids = (user.team || []).slice(0, CFG.maxTeam);
  let heroes = uids.map((u) => user.heroes.find((h) => h.uid === u)).filter(Boolean);
  if (!heroes.length) heroes = user.heroes.slice(0, CFG.maxTeam);
  if (!heroes.length) return [];
  return heroes.map((h, i) => unitFromHero(h, user.items, 'player', i));
}

function buildEnemyUnitsFromStage(stage) {
  return stage.enemies.map((e, i) => unitFromMonster(e.key, e.level || stage.level, 'enemy', i));
}

/* ============================== 7. REST API ============================= */

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e6,
});

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

/* --- Middleware авторизации --- */
async function auth(req, res, next) {
  try {
    const profile = telegramProfile(req);
    const user = await getOrCreateUser(profile);
    if (user.banned) {
      return res.status(403).json({ ok: false, error: 'BANNED', message: user.banReason || 'Аккаунт заблокирован' });
    }
    user.lastSeen = Date.now();
    req.profile = profile;
    req.user = user;
    next();
  } catch (e) {
    console.warn(`[auth] отказ: ${e.code || e.message}`);
    res.status(401).json({
      ok: false,
      error: 'AUTH_FAILED',
      code: e.code || 'AUTH_FAILED',
      message: e.message,
    });
  }
}

function needAdmin(req, res, next) {
  if (!ADMIN_IDS.includes(String(req.profile.id))) {
    return res.status(403).json({ ok: false, error: 'NOT_ADMIN' });
  }
  next();
}

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error('[API]', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR', message: e.message });
  });
};

/* ---- Конфиг игровых данных (статика для UI) ---- */
const PUBLIC_DATA = {
  classes: CLASSES,
  affinities: AFFINITY,
  rarities: RARITIES,
  sets: SETS,
  slots: SLOTS,
  stats: STAT_INFO,
  heroes: HEROES,
  skills: SKILLS,
  cfg: CFG,
  adminIds: ADMIN_IDS,
};

/* ---- Авторизация / стартовый пакет ---- */
app.post(
  '/api/auth',
  auth,
  wrap(async (req, res) => {
    res.json({ ok: true, user: serializeUser(req.user), data: PUBLIC_DATA });
  })
);

/* ---- Полное состояние игрока ---- */
app.get(
  '/api/state',
  auth,
  wrap(async (req, res) => {
    const boss = await getBossState(req.user);
    res.json({
      ok: true,
      user: serializeUser(req.user),
      campaign: CAMPAIGN.map((s) => ({
        ...s,
        locked: s.id > ((req.user.campaign && req.user.campaign.cleared) || 0) + 1,
        cleared: s.id <= ((req.user.campaign && req.user.campaign.cleared) || 0),
      })),
      boss,
      data: PUBLIC_DATA,
    });
  })
);

/* ---- Команда ---- */
app.post(
  '/api/team',
  auth,
  wrap(async (req, res) => {
    const raw = Array.isArray(req.body.team) ? req.body.team : [];
    const valid = raw.filter((u) => req.user.heroes.some((h) => h.uid === u)).slice(0, CFG.maxTeam);
    if (!valid.length) return res.json({ ok: false, error: 'EMPTY_TEAM', message: 'Нужен хотя бы один герой' });
    req.user.team = [...new Set(valid)];
    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user) });
  })
);

/* ---- Экипировка ---- */
app.post(
  '/api/item/equip',
  auth,
  wrap(async (req, res) => {
    const { itemUid, heroUid } = req.body;
    const item = req.user.items.find((i) => i.uid === itemUid);
    const hero = req.user.heroes.find((h) => h.uid === heroUid);
    if (!item || !hero) return res.json({ ok: false, error: 'NOT_FOUND' });

    // снимаем предмет с того же слота у этого героя
    const prev = req.user.items.find((i) => i.equippedBy === heroUid && i.slot === item.slot);
    if (prev) prev.equippedBy = null;

    item.equippedBy = heroUid;
    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user) });
  })
);

app.post(
  '/api/item/unequip',
  auth,
  wrap(async (req, res) => {
    const item = req.user.items.find((i) => i.uid === req.body.itemUid);
    if (!item) return res.json({ ok: false, error: 'NOT_FOUND' });
    item.equippedBy = null;
    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user) });
  })
);

/* ---- Кузница: улучшение предмета ---- */
function forgeCost(item) {
  const rar = RARITIES[item.rarity] ? RARITIES[item.rarity].mult : 1;
  return Math.round((260 + item.level * 210) * rar);
}

app.post(
  '/api/forge',
  auth,
  wrap(async (req, res) => {
    const item = req.user.items.find((i) => i.uid === req.body.itemUid);
    if (!item) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Предмет не найден' });
    if (item.level >= CFG.forgeMaxLevel)
      return res.json({ ok: false, error: 'MAX_LEVEL', message: 'Максимальный уровень улучшения' });

    const cost = forgeCost(item);
    if (req.user.gold < cost)
      return res.json({ ok: false, error: 'NO_GOLD', message: `Нужно ${cost} золота` });

    req.user.gold -= cost;
    item.level += 1;
    const growth = item.main.stat === 'hp' ? 1.09 : 1.08;
    item.main.value = Math.round(item.main.value * growth);
    item.subs = (item.subs || []).map((s) => ({ ...s, value: Math.max(1, Math.round(s.value * (s.stat === 'hp' ? 1.09 : 1.06))) }));

    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user), item: serializeItem(item), cost });
  })
);

/* ---- Слияние: 3 героя → 1 герой рангом выше ---- */
app.post(
  '/api/fuse',
  auth,
  wrap(async (req, res) => {
    const uids = Array.isArray(req.body.heroes) ? req.body.heroes : [];
    if (uids.length !== CFG.fusionNeed)
      return res.json({ ok: false, error: 'BAD_COUNT', message: `Нужно ровно ${CFG.fusionNeed} героя` });

    const heroes = uids.map((u) => req.user.heroes.find((h) => h.uid === u));
    if (heroes.some((h) => !h)) return res.json({ ok: false, error: 'NOT_FOUND' });
    if (new Set(heroes.map((h) => h.stars)).size > 1)
      return res.json({ ok: false, error: 'DIFFERENT_STARS', message: 'Герои должны быть одного ранга' });

    const stars = heroes[0].stars;
    if (stars >= 6) return res.json({ ok: false, error: 'MAX_STARS', message: 'Максимальный ранг' });

    const goldCost = 500 * stars;
    if (req.user.gold < goldCost)
      return res.json({ ok: false, error: 'NO_GOLD', message: `Нужно ${goldCost} золота` });

    // нельзя слить героев, стоящих в команде
    if (uids.some((u) => (req.user.team || []).includes(u)))
      return res.json({ ok: false, error: 'IN_TEAM', message: 'Уберите героев из команды перед слиянием' });

    req.user.gold -= goldCost;
    req.user.items.forEach((it) => {
      if (uids.includes(it.equippedBy)) it.equippedBy = null;
    });
    req.user.heroes = req.user.heroes.filter((h) => !uids.includes(h.uid));

    const newHero = { uid: uid('h'), key: pick(HERO_KEYS), stars: stars + 1, level: 1, xp: 0 };
    req.user.heroes.push(newHero);
    await Store.save(req.user);

    res.json({
      ok: true,
      user: serializeUser(req.user),
      hero: computeHero(newHero, req.user.items),
      cost: goldCost,
    });
  })
);

/* ---- Призыв героя за звёзды ---- */
app.post(
  '/api/summon',
  auth,
  wrap(async (req, res) => {
    if (req.user.stars < CFG.summonCostStars)
      return res.json({ ok: false, error: 'NO_STARS', message: `Нужно ${CFG.summonCostStars} ⭐` });

    req.user.stars -= CFG.summonCostStars;
    const stars = Math.random() < 0.12 ? 5 : Math.random() < 0.42 ? 4 : 3;
    const hero = { uid: uid('h'), key: pick(HERO_KEYS), stars, level: 1, xp: 0 };
    req.user.heroes.push(hero);
    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user), hero: computeHero(hero, req.user.items) });
  })
);

/* ---- Восстановление энергии за звёзды ---- */
app.post(
  '/api/energy/refill',
  auth,
  wrap(async (req, res) => {
    if (req.user.stars < CFG.refillCostStars)
      return res.json({ ok: false, error: 'NO_STARS', message: `Нужно ${CFG.refillCostStars} ⭐` });
    if (req.user.energy >= CFG.maxEnergy)
      return res.json({ ok: false, error: 'FULL', message: 'Энергия уже полная' });
    req.user.stars -= CFG.refillCostStars;
    req.user.energy = Math.min(CFG.maxEnergy, req.user.energy + CFG.refillEnergy);
    req.user.energyTs = Date.now();
    await Store.save(req.user);
    res.json({ ok: true, user: serializeUser(req.user) });
  })
);

/* ---- Кампания ---- */
app.get(
  '/api/campaign',
  auth,
  wrap(async (req, res) => {
    const cleared = (req.user.campaign && req.user.campaign.cleared) || 0;
    res.json({
      ok: true,
      stages: CAMPAIGN.map((s) => ({ ...s, locked: s.id > cleared + 1, cleared: s.id <= cleared })),
    });
  })
);

/* ---- Арена: 5 живых соперников ---- */
const BOT_NAMES = [
  'Северин', 'Морвейн', 'Драган', 'Сирша', 'Кальдер', 'Вейл', 'Ноктис', 'Эшер',
  'Тарис', 'Люмен', 'Гримм', 'Оникс', 'Варда', 'Фенрис', 'Солвейг',
];

function botProfile(rating, seed, powerRef = 3600) {
  const tgId = `bot_${Date.now().toString(36)}_${seed}_${rndInt(100, 999)}`;
  const heroes = [];
  const count = rndInt(3, 4);
  // Подгоняем ботов под силу игрока, а не под рейтинг:
  // иначе новичок с 3.7k силы получает соперников на 11k.
  const targetTotal = Math.max(1200, powerRef * rnd(0.82, 1.14));
  const perHero = targetTotal / count;
  const stars = perHero > 2200 ? 5 : perHero > 1650 ? 4 : 3;
  const p0 = 1230 * (1 + 0.28 * (stars - 3));
  const level = clamp(Math.round(1 + (perHero / p0 - 1) / 0.058), 1, 10 + stars * 10);
  for (let i = 0; i < count; i++) {
    heroes.push({
      uid: uid('h'),
      key: pick(HERO_KEYS),
      stars,
      level: clamp(level + rndInt(-1, 1), 1, 10 + stars * 10),
      xp: 0,
    });
  }
  return {
    tgId,
    _createdAt: Date.now(),
    firstName: pick(BOT_NAMES) + ' ' + rndInt(10, 99),
    username: '',
    rating: Math.max(600, Math.round(rating + rnd(-90, 90))),
    heroes,
    items: [],
    team: heroes.map((h) => h.uid),
    isBot: true,
  };
}

app.get(
  '/api/arena',
  auth,
  wrap(async (req, res) => {
    const me = req.user;
    // сила считается той же метрикой, что видит игрок в профиле
    const teamHeroes = (me.team || [])
      .map((u) => (me.heroes || []).find((h) => h.uid === u))
      .filter(Boolean);
    const myPower =
      teamHeroes.reduce((sum, h) => sum + computeHero(h, me.items || []).power, 0) || 3600;
    const all = await Store.listUsers();
    const real = all
      .filter((u) => String(u.tgId) !== String(me.tgId) && !u.banned && (u.heroes || []).length)
      .sort((a, b) => Math.abs(a.rating - me.rating) - Math.abs(b.rating - me.rating))
      .slice(0, 5)
      .map((u) => arenaPreview(u));

    // «Живых» игроков может быть меньше 5 — добиваем ботами и кэшируем их,
    // чтобы бой шёл именно с той командой, которую видел игрок.
    const bots = [];
    while (real.length + bots.length < 5) {
      const bot = botProfile(me.rating, bots.length + 1, myPower);
      arenaBots.set(bot.tgId, bot);
      bots.push(arenaPreview(bot));
    }
    for (const [id, bot] of arenaBots) {
      if (Date.now() - (bot._createdAt || 0) > 15 * 60 * 1000) arenaBots.delete(id);
    }

    res.json({ ok: true, opponents: [...real, ...bots], myRating: me.rating });
  })
);

function previewPower(heroes, items) {
  return heroes.reduce((s, h) => {
    try {
      return s + computeHero(h, items).power;
    } catch (e) {
      return s;
    }
  }, 0);
}

/** Кэш ботов арены: чтобы бой шёл ровно с той командой, что показана в списке. */
const arenaBots = new Map();

function arenaPreview(u) {
  const team = (u.team || []).map((uidv) => (u.heroes || []).find((h) => h.uid === uidv)).filter(Boolean);
  const list = (team.length ? team : (u.heroes || []).slice(0, CFG.maxTeam)).filter((h) => HEROES[h.key]);
  const preview = list.map((h) => {
    const c = computeHero(h, u.items || []);
    return {
      uid: h.uid,
      name: c.name,
      title: c.title,
      img: c.img,
      stars: c.stars,
      level: c.level,
      affinity: c.affinity,
      className: c.className,
      power: c.power,
    };
  });
  return {
    tgId: String(u.tgId),
    name: u.firstName || 'Игрок',
    rating: u.rating,
    isBot: !!u.isBot,
    power: previewPower(list, u.items || []),
    team: preview,
  };
}

app.post(
  '/api/arena/fight',
  auth,
  wrap(async (req, res) => {
    const me = req.user;
    const opponentId = String(req.body.opponentId || '');
    const all = await Store.listUsers();
    let opp = all.find((u) => String(u.tgId) === opponentId) || arenaBots.get(opponentId) || null;

    if (!opp) {
      // бот вне списка (например, истёк кэш) — собираем по рейтингу из запроса
      const seedRating = Number(req.body.rating || me.rating);
      opp = botProfile(seedRating, rndInt(1, 99), undefined);
    }

    const myUnits = buildTeamUnits(me);
    if (!myUnits.length) return res.json({ ok: false, error: 'NO_TEAM', message: 'Соберите команду' });

    const oppHeroes = (opp.team || []).length ? opp.team : (opp.heroes || []).map((h) => h.uid);
    const oppUnits = oppHeroes
      .map((u, i) => {
        const hero = (opp.heroes || []).find((h) => h.uid === u);
        return safeUnitFromHero(hero, opp.items || [], 'enemy', i);
      })
      .filter(Boolean)
      .slice(0, CFG.maxTeam);

    if (!oppUnits.length) return res.json({ ok: false, error: 'BAD_OPPONENT', message: 'У соперника нет команды' });

    const battle = createBattle({ mode: 'arena', playerUnits: myUnits, enemyUnits: oppUnits });
    const events = [];
    runAutoBattle(battle, events);
    const win = !!(battle.result && battle.result.win);

    // Рейтинг по Эло
    const expected = 1 / (1 + Math.pow(10, ((opp.rating || 1000) - me.rating) / 400));
    const K = 28;
    let delta = Math.round(K * ((win ? 1 : 0) - expected));
    delta = clamp(delta, -CFG.arenaDelta.lose, CFG.arenaDelta.win);

    me.rating = Math.max(0, me.rating + delta);
    if (win) {
      me.wins += 1;
      me.gold += CFG.arenaReward.win;
    } else {
      me.losses += 1;
      me.gold += CFG.arenaReward.lose;
    }

    // опыт героям за бой
    for (const h of me.heroes) {
      if ((me.team || []).includes(h.uid)) addHeroXp(h, win ? 45 : 18);
    }

    await Store.save(me);

    res.json({
      ok: true,
      win,
      ratingDelta: delta,
      rewards: { gold: win ? CFG.arenaReward.win : CFG.arenaReward.lose },
      events,
      opponent: { name: opp.firstName || 'Игрок', rating: opp.rating, isBot: !opp.tgId || String(opp.tgId).startsWith('bot_') },
      user: serializeUser(me),
    });
  })
);

/* ---- Рейтинг (лидерборд) ---- */
app.get(
  '/api/leaderboard',
  auth,
  wrap(async (req, res) => {
    const all = await Store.listUsers();
    const top = all
      .filter((u) => !String(u.tgId).startsWith('bot_'))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)
      .map((u, i) => ({ place: i + 1, tgId: String(u.tgId), name: u.firstName, rating: u.rating, wins: u.wins || 0 }));
    res.json({ ok: true, top });
  })
);

/* ---- Рейд-босс ---- */
async function getBossState(user) {
  const date = dateKey();
  const dayIndex = Math.floor(Date.now() / 86400000);
  const level = 1 + (dayIndex % 30);
  const maxHp = 45000 + level * 3500;

  const boss = await Store.getBoss(date, () => ({
    date,
    level,
    maxHp,
    hp: maxHp,
    damage: {},
    hits: 0,
  }));

  if (user) {
    if (!user.boss || user.boss.date !== date) {
      user.boss = { date, attempts: 0, damage: 0 };
      await Store.save(user);
    }
  }

  const damage = boss.damage || {};
  const myDamage = user ? damage[String(user.tgId)] || 0 : 0;
  const top = Object.entries(damage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tgId, dmg]) => ({ tgId, damage: dmg }));

  return {
    date,
    level,
    name: MONSTERS.boss_obsidian.name,
    img: MONSTERS.boss_obsidian.img,
    affinity: MONSTERS.boss_obsidian.affinity,
    hp: Math.max(0, boss.hp),
    maxHp: boss.maxHp,
    attemptsLeft: user ? Math.max(0, CFG.bossAttemptsPerDay - (user.boss.attempts || 0)) : 0,
    myDamage,
    top,
    hits: boss.hits || 0,
  };
}

app.get(
  '/api/boss',
  auth,
  wrap(async (req, res) => {
    res.json({ ok: true, boss: await getBossState(req.user) });
  })
);

/* ---- Результат боя кампании/босса: награды ---- */
async function grantBattleRewards(user, battle) {
  const mode = battle.mode;
  const win = !!(battle.result && battle.result.win);
  const rewards = { gold: 0, stars: 0, xp: 0, items: [], levelUps: [] };

  if (mode === 'campaign') {
    const stage = CAMPAIGN.find((s) => s.id === battle.meta.stage);
    if (stage && win) {
      const cleared = (user.campaign && user.campaign.cleared) || 0;
      const firstClear = stage.id > cleared;
      rewards.gold = stage.rewards.gold + (firstClear ? stage.firstClear.gold : 0);
      rewards.stars = firstClear ? stage.firstClear.stars : 0;
      rewards.xp = stage.rewards.xp;
      if (firstClear) {
        user.campaign = { cleared: Math.max(cleared, stage.id) };
      }
      user.gold += rewards.gold;
      user.stars += rewards.stars;

      for (const h of user.heroes) {
        if ((user.team || []).includes(h.uid)) {
          const ups = addHeroXp(h, rewards.xp);
          if (ups) rewards.levelUps.push({ uid: h.uid, levels: ups, level: h.level });
        }
      }

      if (Math.random() < stage.rewards.itemChance) {
        const rarity = rollRarity(stage.id * 2.5);
        const item = rollItem(pick(Object.keys(SLOTS)), rarity, { level: Math.floor(stage.id / 4) });
        user.items.push(item);
        rewards.items.push(serializeItem(item));
      }
    } else if (stage) {
      rewards.gold = Math.round(stage.rewards.gold * 0.15);
      user.gold += rewards.gold;
    }
  }

  if (mode === 'boss') {
    const dealt = battle.meta.damage || 0;
    const date = dateKey();
    const boss = await Store.getBoss(date, () => ({
      date,
      level: 1 + (Math.floor(Date.now() / 86400000) % 30),
      maxHp: 45000 + (1 + (Math.floor(Date.now() / 86400000) % 30)) * 3500,
      hp: 45000 + (1 + (Math.floor(Date.now() / 86400000) % 30)) * 3500,
      damage: {},
      hits: 0,
    }));

    boss.damage = boss.damage || {};
    boss.damage[String(user.tgId)] = (boss.damage[String(user.tgId)] || 0) + dealt;
    boss.hp = Math.max(0, boss.hp - dealt);
    boss.hits = (boss.hits || 0) + 1;
    if (typeof boss.markModified === 'function') boss.markModified('damage');
    await Store.saveBoss(boss);

    user.boss = user.boss || { date, attempts: 0, damage: 0 };
    if (user.boss.date !== date) user.boss = { date, attempts: 0, damage: 0 };
    user.boss.attempts += 1;
    user.boss.damage = (user.boss.damage || 0) + dealt;

    rewards.gold = Math.round(dealt / 90) + 150;
    rewards.xp = Math.min(400, 60 + Math.round(dealt / 400));
    rewards.stars = Math.round(dealt / 12000);
    rewards.damage = dealt;
    user.gold += rewards.gold;
    user.stars += rewards.stars;

    for (const h of user.heroes) {
      if ((user.team || []).includes(h.uid)) {
        const ups = addHeroXp(h, rewards.xp);
        if (ups) rewards.levelUps.push({ uid: h.uid, level: h.level, levels: ups });
      }
    }
  }

  await Store.save(user);
  return { win, rewards };
}

/* ---- Досрочный выход/сдача боя (кампания) ---- */
app.post(
  '/api/battle/forfeit',
  auth,
  wrap(async (req, res) => {
    res.json({ ok: true });
  })
);

/* ============================= 8. АДМИН-ПАНЕЛЬ ========================== */

app.get(
  '/api/admin/user/:tgId',
  auth,
  needAdmin,
  wrap(async (req, res) => {
    const target = await Store.findUser(req.params.tgId.trim());
    if (!target) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Игрок не найден' });
    res.json({ ok: true, user: serializeUser(target) });
  })
);

app.post(
  '/api/admin/grant',
  auth,
  needAdmin,
  wrap(async (req, res) => {
    const { tgId, gold = 0, stars = 0, energy = 0, rating = 0 } = req.body;
    const target = await Store.findUser(String(tgId || '').trim());
    if (!target) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Игрок не найден' });

    target.gold = Math.max(0, (target.gold || 0) + Number(gold || 0));
    target.stars = Math.max(0, (target.stars || 0) + Number(stars || 0));
    if (energy) target.energy = clamp((target.energy || 0) + Number(energy || 0), 0, CFG.maxEnergy);
    if (rating) target.rating = Math.max(0, (target.rating || 0) + Number(rating || 0));

    await Store.save(target);
    res.json({ ok: true, user: serializeUser(target), message: 'Ресурсы изменены' });
  })
);

app.post(
  '/api/admin/item',
  auth,
  needAdmin,
  wrap(async (req, res) => {
    const { tgId, slot, rarity, level = 0, setId } = req.body;
    const target = await Store.findUser(String(tgId || '').trim());
    if (!target) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Игрок не найден' });
    if (!SLOTS[slot]) return res.json({ ok: false, error: 'BAD_SLOT', message: 'Неверный слот' });
    if (!RARITIES[rarity]) return res.json({ ok: false, error: 'BAD_RARITY', message: 'Неверная редкость' });

    const item = rollItem(slot, rarity, { level: clamp(Number(level) || 0, 0, CFG.forgeMaxLevel), setId });
    target.items.push(item);
    await Store.save(target);
    res.json({ ok: true, item: serializeItem(item), user: serializeUser(target), message: 'Предмет выдан' });
  })
);

app.post(
  '/api/admin/hero',
  auth,
  needAdmin,
  wrap(async (req, res) => {
    const { tgId, key, stars = 3, level = 1 } = req.body;
    const target = await Store.findUser(String(tgId || '').trim());
    if (!target) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Игрок не найден' });
    if (!HEROES[key]) return res.json({ ok: false, error: 'BAD_HERO', message: 'Неизвестный герой' });

    const hero = {
      uid: uid('h'),
      key,
      stars: clamp(Number(stars) || 3, 1, 6),
      level: clamp(Number(level) || 1, 1, 60),
      xp: 0,
    };
    target.heroes.push(hero);
    await Store.save(target);
    res.json({ ok: true, hero: computeHero(hero, target.items), user: serializeUser(target), message: 'Герой выдан' });
  })
);

app.post(
  '/api/admin/ban',
  auth,
  needAdmin,
  wrap(async (req, res) => {
    const { tgId, banned, reason = '' } = req.body;
    const target = await Store.findUser(String(tgId || '').trim());
    if (!target) return res.json({ ok: false, error: 'NOT_FOUND', message: 'Игрок не найден' });
    if (ADMIN_IDS.includes(String(target.tgId)))
      return res.json({ ok: false, error: 'CANNOT_BAN_ADMIN', message: 'Нельзя забанить администратора' });

    target.banned = !!banned;
    target.banReason = banned ? reason || 'Нарушение правил' : '';
    await Store.save(target);
    res.json({ ok: true, user: serializeUser(target), message: banned ? 'Игрок заблокирован' : 'Игрок разблокирован' });
  })
);

/* ============================ 9. SOCKET.IO ============================= */

const battles = new Map(); // battleId -> battle (in-memory, живёт до конца боя)

setInterval(() => {
  const now = Date.now();
  for (const [id, b] of battles) if (now - b.createdAt > CFG.logTTL) battles.delete(id);
}, 60 * 1000).unref();

io.use(async (socket, next) => {
  try {
    const handshakeAuth = socket.handshake.auth || {};
    const initData = handshakeAuth.initData || '';

    let profile;
    if (BOT_TOKEN) {
      const u = verifyInitData(initData);
      profile = { id: String(u.id), first_name: u.first_name || 'Игрок', username: u.username || '' };
    } else {
      profile = parseInitDataUser(initData) || {
        id: String(handshakeAuth.devId || '1000001'),
        first_name: 'Гость',
        username: '',
      };
    }

    const user = await getOrCreateUser(profile);
    if (user.banned) return next(new Error('BANNED'));
    socket.data.tgId = String(profile.id);
    next();
  } catch (e) {
    console.warn(`[socket] отказ: ${e.code || e.message}`);
    next(new Error(`AUTH_FAILED:${e.code || e.message}`));
  }
});

async function freshUser(socket) {
  const user = await Store.findUser(socket.data.tgId);
  if (!user) throw new Error('NO_USER');
  if (user.banned) throw new Error('BANNED');
  return user;
}

io.on('connection', (socket) => {
  const emitErr = (message, code = 'ERROR') => socket.emit('battle:error', { code, message });

  /* --- Старт живого боя (кампания / босс) --- */
  socket.on('battle:start', async (payload = {}, ack) => {
    try {
      const user = await freshUser(socket);
      regenEnergy(user);
      const mode = payload.mode === 'boss' ? 'boss' : 'campaign';

      const playerUnits = buildTeamUnits(user);
      if (!playerUnits.length) {
        emitErr('Соберите команду из героев');
        return ack && ack({ ok: false, error: 'NO_TEAM' });
      }

      if (mode === 'campaign') {
        const stage = CAMPAIGN.find((s) => s.id === Number(payload.stage));
        if (!stage) return emitErr('Этап не найден') || (ack && ack({ ok: false }));
        const cleared = (user.campaign && user.campaign.cleared) || 0;
        if (stage.id > cleared + 1) return emitErr('Этап заблокирован') || (ack && ack({ ok: false }));
        if (user.energy < CFG.battleEnergyCost)
          return emitErr('Не хватает энергии') || (ack && ack({ ok: false, error: 'NO_ENERGY' }));

        user.energy -= CFG.battleEnergyCost;
        user.energyTs = user.energyTs || Date.now();
        await Store.save(user);

        const battle = createBattle({
          mode: 'campaign',
          playerUnits,
          enemyUnits: buildEnemyUnitsFromStage(stage),
          meta: { stage: stage.id, stageName: stage.name },
        });
        battle.ownerTgId = String(user.tgId);
        battles.set(battle.id, battle);

        const events = [];
        runUntilPlayerInput(battle, events);
        socket.emit('battle:update', { battleId: battle.id, state: battleState(battle), events, started: true });
        return ack && ack({ ok: true, battleId: battle.id });
      }

      // --- Босс ---
      const bossInfo = await getBossState(user);
      if (bossInfo.attemptsLeft <= 0) {
        emitErr('Попытки на сегодня закончились');
        return ack && ack({ ok: false, error: 'NO_ATTEMPTS' });
      }
      if (bossInfo.hp <= 0) {
        emitErr('Босс уже повержен сегодня');
        return ack && ack({ ok: false, error: 'BOSS_DEAD' });
      }

      const bossUnit = unitFromMonster('boss_obsidian', 1, 'enemy', 0, {
        hp: bossInfo.hp,
        name: `${MONSTERS.boss_obsidian.name} · ур. ${bossInfo.level}`,
      });
      bossUnit.maxHp = bossInfo.hp; // «остаток» на сегодня
      bossUnit.hp = bossInfo.hp;

      const battle = createBattle({
        mode: 'boss',
        playerUnits,
        enemyUnits: [bossUnit],
        meta: { bossDate: bossInfo.date, bossMaxHp: bossInfo.hp },
      });
      battle.ownerTgId = String(user.tgId);
      battles.set(battle.id, battle);

      const events = [];
      runUntilPlayerInput(battle, events);
      socket.emit('battle:update', { battleId: battle.id, state: battleState(battle), events, started: true });
      return ack && ack({ ok: true, battleId: battle.id });
    } catch (e) {
      console.error('[battle:start]', e);
      emitErr('Не удалось начать бой');
      ack && ack({ ok: false, error: 'SERVER_ERROR' });
    }
  });

  /* --- Действие игрока --- */
  socket.on('battle:action', async (payload = {}, ack) => {
    try {
      const battle = battles.get(payload.battleId);
      if (!battle) return emitErr('Бой не найден') || (ack && ack({ ok: false }));
      if (String(battle.ownerTgId) !== String(socket.data.tgId)) return emitErr('Чужой бой') || (ack && ack({ ok: false }));
      if (battle.over) return ack && ack({ ok: false, error: 'BATTLE_OVER' });
      if (!battle.actor) return ack && ack({ ok: false, error: 'WAIT' });

      const actor = battle.actor;
      if (actor.side !== 'player') return ack && ack({ ok: false, error: 'NOT_YOUR_TURN' });

      const skillIndex = clamp(Number(payload.skillIndex) || 0, 0, getSkills(actor).length - 1);
      const skill = getSkills(actor)[skillIndex];
      if (skillIndex > 0 && actor.cd[skillIndex] > 0) {
        return emitErr(`«${skill.name}» перезаряжается`) || (ack && ack({ ok: false, error: 'COOLDOWN' }));
      }

      const events = [];
      const result = resolveSkill(battle, actor, skillIndex, payload.targetUid, events);
      if (result.error) return ack && ack({ ok: false, error: result.error });

      battle.actor = null;
      checkEnd(battle, events);
      if (!battle.over) runUntilPlayerInput(battle, events);

      let rewards = null;
      if (battle.over) rewards = await finishBattle(socket, battle, events);

      socket.emit('battle:update', { battleId: battle.id, state: battleState(battle), events, rewards });
      return ack && ack({ ok: true });
    } catch (e) {
      console.error('[battle:action]', e);
      emitErr('Ошибка хода');
      ack && ack({ ok: false, error: 'SERVER_ERROR' });
    }
  });

  /* --- Авто-бой до конца --- */
  socket.on('battle:auto', async (payload = {}, ack) => {
    try {
      const battle = battles.get(payload.battleId);
      if (!battle) return ack && ack({ ok: false });
      if (String(battle.ownerTgId) !== String(socket.data.tgId)) return ack && ack({ ok: false });
      if (battle.over) return ack && ack({ ok: false });

      const events = [];
      runAutoBattle(battle, events);
      const rewards = await finishBattle(socket, battle, events);
      socket.emit('battle:update', { battleId: battle.id, state: battleState(battle), events, rewards });
      return ack && ack({ ok: true });
    } catch (e) {
      console.error('[battle:auto]', e);
      ack && ack({ ok: false, error: 'SERVER_ERROR' });
    }
  });

  socket.on('battle:leave', (payload = {}) => {
    if (payload.battleId) battles.delete(payload.battleId);
  });

  socket.on('disconnect', () => {
    /* бои живут в памяти до TTL — игрок может вернуться */
  });
});

/** Завершение боя: награды, запись урона по боссу. */
async function finishBattle(socket, battle, events) {
  try {
    if (battle.rewarded) return battle.rewardedPayload || null;
    battle.rewarded = true;

    if (battle.mode === 'boss') {
      const bossUnit = battle.units.find((u) => u.side !== 'player' && u.isBoss);
      battle.meta.damage = bossUnit ? Math.max(0, bossUnit.maxHp - bossUnit.hp) : 0;
    }

    const user = await Store.findUser(socket.data.tgId);
    if (!user) return null;
    const res = await grantBattleRewards(user, battle);
    battle.rewardedPayload = res.rewards;
    events.push({ type: 'rewards', rewards: res.rewards });
    io.to(socket.id).emit('battle:rewards', { battleId: battle.id, ...res });
    return res.rewards;
  } catch (e) {
    console.error('[finishBattle]', e);
    return null;
  }
}

/* ================================ 10. BOOT ============================== */

app.get('/api/health', (req, res) => res.json({ ok: true, mode: DB_MODE, dbReady, uptime: process.uptime() }));

/**
 * Диагностика авторизации. Без авторизации, без секретов:
 * показывает, задан ли токен, что прислал клиент и чем закончилась проверка.
 * Нужна, чтобы экран ошибки в Mini App мог сказать причину, а не «что-то сломалось».
 */
app.post('/api/diag', (req, res) => {
  const initData = req.get('x-init-data') || '';
  const out = {
    ok: true,
    mode: BOT_TOKEN ? 'signed' : 'unsigned',
    hasToken: !!BOT_TOKEN,
    tokenTail: TOKEN_TAIL || null,
    initDataLength: initData.length,
    hasSignatureField: /(^|&)signature=/.test(initData),
    userFromInitData: !!parseInitDataUser(initData),
    dbMode: DB_MODE,
    nodeEnv: process.env.NODE_ENV || 'development',
    result: 'unknown',
  };

  if (!BOT_TOKEN) {
    out.result = 'ok';
    out.note = 'Токен не задан — подпись не проверяется';
  } else if (!initData) {
    out.result = 'fail';
    out.code = 'NO_INIT_DATA';
  } else {
    try {
      const u = verifyInitData(initData);
      out.result = 'ok';
      out.userId = String(u.id);
    } catch (e) {
      out.result = 'fail';
      out.code = e.code || 'AUTH_FAILED';
      out.message = e.message;
    }
  }
  res.json(out);
});

async function boot() {
  if (DB_MODE === 'mongo' && MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      User = mongoose.model('User', UserSchema);
      Boss = mongoose.model('Boss', BossSchema);
      dbReady = true;
      console.log('✔ MongoDB подключена');
    } catch (e) {
      console.error('✖ MongoDB недоступна:', e.message);
      console.error('  Запускаю игру на встроенном хранилище в памяти (DB_MODE=memory).');
    }
  } else {
    console.log('ℹ DB_MODE=memory — данные живут в памяти процесса (для разработки).');
  }

  if (!BOT_TOKEN) {
    console.warn(`⚠ TELEGRAM_BOT_TOKEN не задан (ожидался файл ${ENV_PATH}).`);
    console.warn('  Подпись initData НЕ проверяется: пользователь берётся из данных Telegram.');
    console.warn('  Для продакшена задайте токен бота в .env — иначе ID можно подделать.');
  } else {
    console.log(`🔑 Токен бота загружен (…${TOKEN_TAIL}), подпись initData проверяется.`);
    if (BOT_TOKEN.length < 40) console.warn('⚠ Токен подозрительно короткий — проверьте значение.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  SHADOW VAULT готов: http://localhost:${PORT}`);
    console.log(`  Режим: ${IS_PROD ? 'production' : 'development'} · БД: ${DB_MODE}`);
    console.log(`  Админы: ${ADMIN_IDS.join(', ')}\n`);
  });
}

if (require.main === module) boot();

module.exports = {
  app,
  server,
  io,
  boot,
  engine: {
    createBattle,
    makeUnit,
    unitFromHero,
    unitFromMonster,
    runAutoBattle,
    runUntilPlayerInput,
    resolveSkill,
    battleState,
    calcDamage,
    affinityFactor,
    pickNext,
    chooseAI,
  },
  data: { HEROES, SKILLS, CAMPAIGN, MONSTERS, SLOTS, RARITIES, SETS, AFFINITY, CLASSES, CFG },
  computeHero,
  rollItem,
};
