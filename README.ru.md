# NetworkJS Reloaded

[English version](README.md)

Аддон **KubeJS** для **Minecraft 1.21.1 + NeoForge**: HTTP-запросы, Discord-бот, **PostgreSQL** и утилиты сервера — прямо из `kubejs/server_scripts`.

Форк [SSnowly/NetworkJS](https://github.com/SSnowly/NetworkJS) с добавлением **PostgreSQL** (пул HikariCP, асинхронные запросы).

Репозиторий: [UNFOX2/NetworkJS-Reloaded](https://github.com/UNFOX2/NetworkJS-Reloaded)

### Совместимые версии

| Компонент | Минимум | Собрано / проверено на |
|-----------|---------|------------------------|
| **Minecraft** | 1.21.1 | 1.21.1 |
| **NeoForge** | **21.1.200** | 21.1.200 |
| **KubeJS** | **2101.7.1** | 2101.7.1-build.181 |
| **NetworkJS Reloaded** | — | **1.2.0** |
| **Java** | 21 | 21 |

> Только **NeoForge 1.21.1** (ветка `21.1.x`). Не работает с Forge, Fabric и другими версиями Minecraft.

---

## Возможности

| Область | Что умеет |
|---------|-----------|
| **HTTP** | `fetch` / `fetchAsync` — GET/POST, заголовки, JSON-тело (OkHttp) |
| **PostgreSQL** | `postgresQuery` / `postgresExecute`, класс `Postgres` — prepared statements, async, пул соединений |
| **Discord** | `DiscordBot` — сообщения, embeds, входящие события |
| **KubeJS** | Глобальные функции и классы, `PlayerEvents`, `ServerEvents`, команды |
| **Сервер** | `Server.sendRawMessage`, список игроков, количество онлайн |
| **Безопасность** | В одиночке реестр выключен; на dedicated включается сам |

---

## Требования

Как в таблице выше:

- Minecraft **1.21.1** (строго)
- NeoForge **21.1.200** и новее в линейке `21.1`
- KubeJS **2101.7.1** и новее (в разработке: `2101.7.1-build.181`)
- **Java 21** (идёт с Minecraft 1.21.1)

## Установка

1. Соберите или скачайте JAR (`build/libs/networkjs-1.21.1-*.jar`).
2. Положите в `mods/` вместе с **KubeJS**.
3. Перезапустите сервер.
4. **Одиночка:** `/networkjs enable`, затем `/kubejs reload server`.
5. **Dedicated:** реестр включается автоматически.

## Команды и безопасность

| Команда | Описание |
|---------|----------|
| `/networkjs enable` | Включить биндинги + перезагрузка KubeJS (OP 2) |
| `/networkjs disable` | Отключить сеть |
| `/networkjs reload` | Перезагрузить биндинги |
| `/networkjs status` | Статус реестра и PostgreSQL |
| `/networkjs postgres reload` | Перечитать конфиг БД |
| `/networkjs postgres status` | Подключение к БД |

---

## Быстрый старт

### HTTP

```javascript
// Синхронно
const response = fetch('https://api.example.com/data')
console.log(response.getStatus(), response.text())

// Асинхронно
fetchAsync('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ online: true })
}).thenAccept(r => console.log(r.text()))
```

Пример: [`examples/kubejs/server_scripts/networkjs_http_fetch_example.js`](examples/kubejs/server_scripts/networkjs_http_fetch_example.js)

### PostgreSQL

1. Скопируйте [`examples/kubejs/config/networkjs/postgres.json.example`](examples/kubejs/config/networkjs/postgres.json.example)  
   → `kubejs/config/networkjs/postgres.json`
2. Укажите `"enabled": true`, хост, БД, логин/пароль.
3. `/networkjs postgres reload`
4. В скриптах:

```javascript
postgresQuery('SELECT role FROM users WHERE username = ?', [playerName])
  .thenAccept(function (result) {
    event.server.scheduleInTicks(0, function () {
      if (!result.isOk()) return
      var role = result.getRows().get(0).get('role')
      Server.sendRawMessageToPlayer(playerName, '&aРоль: &e' + role)
    })
  })
```

Пример: [`examples/kubejs/server_scripts/networkjs_postgres_example.js`](examples/kubejs/server_scripts/networkjs_postgres_example.js)  
Подробнее: [`examples/kubejs/postgres/README.ru.md`](examples/kubejs/postgres/README.ru.md)

> **Важно:** колбэк `thenAccept` выполняется не в тике сервера — для чата/мира используйте `server.scheduleInTicks(0, ...)`.

### Discord

```javascript
const bot = new DiscordBot({
  token: 'BOT_TOKEN',
  guild: 'GUILD_ID',
  channels: { chat: 'CHANNEL_ID' },
  sanitizeMessages: true
})

bot.sendMessage('chat', 'Привет с сервера!')
bot.onMessage(function (msg) {
  if (msg.isFromConfiguredChannel() && !msg.isBot()) {
    Server.sendRawMessage('&7[Discord] &f' + msg.getAuthor() + ': ' + msg.getContent())
  }
})
```

---

## API для KubeJS

| Экспорт | Тип | Описание |
|---------|-----|----------|
| `fetch(url, options?)` | Функция | Синхронный HTTP |
| `fetchAsync(url, options?)` | Функция | Асинхронный HTTP |
| `postgresQuery(sql, params?)` | Функция | SELECT (async) |
| `postgresExecute(sql, params?)` | Функция | INSERT/UPDATE/DELETE (async) |
| `FetchBinding` | Класс | HTTP (классовый API) |
| `FetchOptions` | Класс | Параметры запроса |
| `FetchResponse` | Класс | Ответ |
| `Postgres` | Класс | `query`, `execute`, `*Async`, `isConnected`, `reload` |
| `PostgresResult` | Класс | `isOk`, `getRows`, `getRowCount`, `getError` |
| `DiscordBot` | Класс | Discord |
| `Server` | Класс | Сообщения и информация о сервере |

Параметры SQL — массив для плейсхолдеров `?`. Не склеивайте SQL из чата игрока.

---

## Примеры

```
examples/kubejs/
├── config/networkjs/postgres.json.example
├── server_scripts/
│   ├── networkjs_http_fetch_example.js      # HTTP
│   └── networkjs_postgres_example.js        # PostgreSQL
└── postgres/README.ru.md
```

Скопируйте `.js` в `<мир>/kubejs/server_scripts/`.

---

## Сборка

```bash
git clone https://github.com/UNFOX2/NetworkJS-Reloaded.git
cd NetworkJS-Reloaded
./gradlew build
```

Результат: `build/libs/networkjs-1.21.1-1.2.0.jar`

## Лицензия

MIT — см. [LICENSE](LICENSE).

## Авторы

- Оригинал: [SSnowly/NetworkJS](https://github.com/SSnowly/NetworkJS)
- Reloaded: [UNFOX2](https://github.com/UNFOX2) — PostgreSQL, документация RU/EN, примеры KubeJS
