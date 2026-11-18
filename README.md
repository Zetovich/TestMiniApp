# TestMiniApp

Telegram Mini App (Колесо Удачи + Мультиплеер Краш).
Все необходимые файлы собраны в одной папке без вложенных поддиректорий:

```text
TestMiniApp/
├── index.html        # Фронтенд (HTML + CSS + JS в одном файле)
├── server.js         # Сервер (Express, Socket.io, SQLite, валидация initData)
├── package.json      # Конфигурация зависимостей
├── casino.db         # База данных SQLite (создается автоматически)
└── README.md         # Инструкция
```

### Запуск:
```bash
cd TestMiniApp
npm install
npm start
```
Сервер запустится на порту `3000` и будет раздавать `index.html` напрямую из этой же папки.
Вход защищен: доступ разрешен строго через Telegram WebApp.
