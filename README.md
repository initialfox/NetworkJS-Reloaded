# NetworkJS Reloaded

[Русская версия](README.ru.md)

KubeJS addon for **Minecraft 1.21.1 + NeoForge**: HTTP requests, Discord bot, PostgreSQL, and server utilities — directly from your `kubejs/server_scripts`.

Fork of [SSnowly/NetworkJS](https://github.com/SSnowly/NetworkJS), extended with **PostgreSQL** (HikariCP pool, async queries).

Repository: [UNFOX2/NetworkJS-Reloaded](https://github.com/UNFOX2/NetworkJS-Reloaded)

### Compatible versions

| Component | Minimum version | Built / tested with |
|-----------|-----------------|---------------------|
| **Minecraft** | 1.21.1 | 1.21.1 |
| **NeoForge** | **21.1.200** | 21.1.200 |
| **KubeJS** | **2101.7.1** | 2101.7.1-build.181 |
| **NetworkJS Reloaded** | — | **1.2.0** |
| **Java** | 21 | 21 |

> Only **NeoForge 1.21.1** (`21.1.x`). Not compatible with Forge, Fabric, or other Minecraft versions.

---

## What it can do

| Area | Capability |
|------|------------|
| **HTTP** | `fetch` / `fetchAsync` — GET/POST, headers, JSON body (OkHttp) |
| **PostgreSQL** | `postgresQuery` / `postgresExecute`, `Postgres.*` — prepared statements, async, connection pool |
| **Discord** | `DiscordBot` — messages, embeds, inbound events |
| **KubeJS** | Global bindings + classes, works with `PlayerEvents`, `ServerEvents`, commands |
| **Server** | `Server.sendRawMessage`, player list, player count |
| **Safety** | Registry off in singleplayer by default; dedicated server enables automatically |

---

## Requirements

Same as the table above:

- Minecraft **1.21.1** (exact)
- NeoForge **21.1.200** or newer on the `21.1` line
- KubeJS **2101.7.1** or newer (`2101.7.1-build.181` in dev)
- **Java 21** (bundled with Minecraft 1.21.1)

## Installation

1. Build or download the JAR (`build/libs/networkjs-1.21.1-*.jar`).
2. Put it in `mods/` together with **KubeJS**.
3. Restart the server.
4. **Singleplayer:** run `/networkjs enable`, then `/kubejs reload server`.
5. **Dedicated:** registry is enabled automatically.

## Safety & commands

| Command | Description |
|---------|-------------|
| `/networkjs enable` | Enable bindings + reload KubeJS (OP 2) |
| `/networkjs disable` | Disable network access |
| `/networkjs reload` | Reload bindings |
| `/networkjs status` | Registry + PostgreSQL status |
| `/networkjs postgres reload` | Reload DB config |
| `/networkjs postgres status` | DB connection details |

---

## Quick start

### HTTP

```javascript
// Sync
const response = fetch('https://api.example.com/data')
console.log(response.getStatus(), response.text())

// Async
fetchAsync('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ online: true })
}).thenAccept(r => console.log(r.text()))
```

See: [`examples/kubejs/server_scripts/networkjs_http_fetch_example.js`](examples/kubejs/server_scripts/networkjs_http_fetch_example.js)

### PostgreSQL

1. Copy [`examples/kubejs/config/networkjs/postgres.json.example`](examples/kubejs/config/networkjs/postgres.json.example)  
   → `kubejs/config/networkjs/postgres.json`
2. Set `"enabled": true`, host, database, credentials.
3. `/networkjs postgres reload`
4. Use in scripts:

```javascript
postgresQuery('SELECT role FROM users WHERE username = ?', [playerName])
  .thenAccept(function (result) {
    event.server.scheduleInTicks(0, function () {
      if (!result.isOk()) return
      var role = result.getRows().get(0).get('role')
      Server.sendRawMessageToPlayer(playerName, '&aRole: &e' + role)
    })
  })
```

See: [`examples/kubejs/server_scripts/networkjs_postgres_example.js`](examples/kubejs/server_scripts/networkjs_postgres_example.js)  
Docs: [`examples/kubejs/postgres/README.md`](examples/kubejs/postgres/README.md)

> **Important:** `thenAccept` runs off the main thread — use `server.scheduleInTicks(0, ...)` before chat/world changes.

### Discord

```javascript
const bot = new DiscordBot({
  token: 'BOT_TOKEN',
  guild: 'GUILD_ID',
  channels: { chat: 'CHANNEL_ID' },
  sanitizeMessages: true
})

bot.sendMessage('chat', 'Hello from Minecraft!')
bot.onMessage(function (msg) {
  if (msg.isFromConfiguredChannel() && !msg.isBot()) {
    Server.sendRawMessage('&7[Discord] &f' + msg.getAuthor() + ': ' + msg.getContent())
  }
})
```

---

## KubeJS API reference

| Export | Type | Description |
|--------|------|-------------|
| `fetch(url, options?)` | Function | Sync HTTP |
| `fetchAsync(url, options?)` | Function | Async HTTP → `CompletableFuture<FetchResponse>` |
| `postgresQuery(sql, params?)` | Function | SELECT (async) |
| `postgresExecute(sql, params?)` | Function | INSERT/UPDATE/DELETE (async) |
| `FetchBinding` | Class | HTTP (legacy class API) |
| `FetchOptions` | Class | Request options |
| `FetchResponse` | Class | Response (`getStatus`, `text`, `json`, `isOk`) |
| `Postgres` | Class | `query`, `execute`, `*Async`, `isConnected`, `reload` |
| `PostgresResult` | Class | `isOk`, `getRows`, `getRowCount`, `getError`, `getUpdateCount` |
| `DiscordBot` | Class | Discord integration |
| `Server` | Class | `sendRawMessage`, `sendRawMessageToPlayer`, `getPlayerCount`, `getPlayerNames` |

`options` for fetch: `{ method, headers, body }`.

SQL params: JavaScript array for `?` placeholders (JDBC prepared statements).

---

## Examples folder

```
examples/kubejs/
├── config/networkjs/postgres.json.example
├── server_scripts/
│   ├── networkjs_http_fetch_example.js
│   └── networkjs_postgres_example.js
└── postgres/README.md
```

Copy scripts into `<world>/kubejs/server_scripts/` on your server.

---

## Building

```bash
git clone https://github.com/UNFOX2/NetworkJS-Reloaded.git
cd NetworkJS-Reloaded
./gradlew build
```

Output: `build/libs/networkjs-1.21.1-1.2.0.jar`

## License

MIT — see [LICENSE](LICENSE).

## Credits

- Original mod: [SSnowly/NetworkJS](https://github.com/SSnowly/NetworkJS)
- Reloaded fork: [UNFOX2](https://github.com/UNFOX2) — PostgreSQL, bilingual docs, KubeJS examples
