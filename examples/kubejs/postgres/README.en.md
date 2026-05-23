# NetworkJS — PostgreSQL

[Русская версия](README.md)

PostgreSQL from KubeJS (HikariCP pool, async queries).

## Setup

1. Copy `postgres.json.example` → **`<server root>/kubejs/config/networkjs/postgres.json`**  
   (folder with `mods/`, not `world/.../kubejs/`)
2. Set `host`, `database`, `username`, `password`, `"enabled": true`
3. Restart the server or run `/networkjs postgres reload`
4. In singleplayer: `/networkjs enable`

KubeJS scripts using `postgresQuery` may live in server-root `kubejs/server_scripts/` (all worlds) or `<world>/kubejs/server_scripts/` (one world).

## KubeJS API

| Name | Description |
|------|-------------|
| `postgresQuery(sql, params?)` | SELECT → `CompletableFuture<PostgresResult>` |
| `postgresExecute(sql, params?)` | INSERT/UPDATE/DELETE |
| `Postgres.query` / `queryAsync` | Same via class |
| `Postgres.execute` / `executeAsync` | Writes |
| `Postgres.isConnected()` | Pool check |
| `Postgres.reload()` | Reconnect |

```javascript
postgresQuery('SELECT * FROM users WHERE uuid = ?', [uuid]).thenAccept(function (result) {
  if (result.isOk()) {
    var rows = result.getRows()
    var count = result.getRowCount()
  }
})
```

**Important:** `thenAccept` runs in the background — use `server.scheduleInTicks(0, ...)` for chat/world changes.

## Commands

- `/networkjs postgres reload` — reload config and reconnect
- `/networkjs postgres status` — connection status
- `/networkjs status` — registry + postgres

## Security

- Do not commit `postgres.json` with passwords
- Use only `?` (prepared statements); never concatenate SQL from player chat
