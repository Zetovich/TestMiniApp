# ZetGifts — Telegram Mini App

Полноценное Telegram Mini App в тёмной теме Telegram с реальным каталогом из **124 коллекций подарков Telegram** (7 942 моделей, 80 фонов, 717 узоров), механикой улучшения подарков (25 ⭐) и крафта (4 ячейки), 8 играми в реальном времени и админ-панелью.

## Структура проекта (плоская папка `ZetGifts`)

Все файлы находятся строго в одной папке `ZetGifts` без вложенных подпапок:

- `package.json` — зависимости Node.js (`express`, `socket.io`, `mongoose`, `cors`, `dotenv`)
- `server.js` — Backend (Express + Socket.io + MongoDB/Mongoose + проверка Telegram `initData` по HMAC-SHA256)
- `index.html` — Frontend разметка Telegram Mini App + экран блокировки при отсутствии авторизации
- `style.css` — точная тёмная тема Telegram (`#17212b`, `#1c2733`, `#2ea6ff`, `#f59e0b`), Liquid Glass нижнее меню, анимации крафта/улучшения/краша
- `app.js` — вся клиентская логика, Canvas/Lottie анимации, все 8 игр, просмотр/улучшение/крафт подарков, админ-панель
- `gifts_catalog.json` — полная база всех 124 реальных коллекций подарков Telegram (7 942 моделей, 80 фонов, 717 узоров) + **620 уникальных скрафченных моделей** (ровно по 5 на каждую коллекцию!)
- `dice.json`, `explosion.json`, `rocket.json` — Lottie-анимации (анимированный кубик 🎲, взрыв 💥, ракета 🚀)
- `gift_*.png` (32 шт.) — реальные прозрачные 3D PNG подарков Telegram
- `craft_<collection>_<1..5>.png` (620 шт.) — 5 уникальных скрафченных моделей на каждую из 124 коллекций (созданы на основе оригинального подарка каждой коллекции: Emerald / Cyber Neon / Obsidian Void / Solar Crimson / Midas Sovereign)

## Установка и запуск

1. Убедитесь, что установлены **Node.js 18+** и **MongoDB** (локально `mongodb://127.0.0.1:27017/zetgifts` или облачный URI).
2. Перейдите в папку проекта и установите зависимости:

```bash
cd ZetGifts
npm install
```

3. (Опционально) Задайте переменные окружения:

```bash
export PORT=3000
export MONGO_URI="mongodb://127.0.0.1:27017/zetgifts"
export BOT_TOKEN="9043576207:AAG8IGLNGs_NcqHiFXnBGVvmcSyOiTxqtZQ"
export ADMIN_ID="8213153991"
```

4. Запустите сервер:

```bash
npm start
```

5. Подключите HTTPS-URL вашего сервера в `@BotFather` → `/mybots` → Bot Settings → Menu Button / Web App.

## Безопасность и авторизация

- Каждый HTTP-запрос (`X-Telegram-Init-Data`) и каждое Socket.io-подключение проверяются на сервере через `HMAC-SHA256` с ключом `WebAppData` и токеном бота.
- При открытии сайта напрямую в браузере (без валидного `initData` из Telegram) приложение не запускается и отображает только экран «Ошибка авторизации» на тёмном фоне Telegram.
- Администратор с Telegram ID `8213153991` автоматически получает доступ к вкладке «Админка» (поиск по ID, управление балансом ⭐, выдача любых подарков, бан/разбан).
