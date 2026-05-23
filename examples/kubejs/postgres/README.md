# NetworkJS — PostgreSQL

PostgreSQL from KubeJS (HikariCP pool, async queries).

[Русская версия](README.ru.md)

## Установка

1. Скопируй `config/networkjs/postgres.json.example` → `kubejs/config/networkjs/postgres.json`
2. Укажи `host`, `database`, `username`, `password`, `"enabled": true`
3. Перезапусти сервер или `/networkjs postgres reload`
4. В singleplayer: `/networkjs enable`

## KubeJS API

| Имя | Описание |
|-----|----------|
| `postgresQuery(sql, params?)` | SELECT → `CompletableFuture<PostgresResult>` |
| `postgresExecute(sql, params?)` | INSERT/UPDATE/DELETE |
| `Postgres.query` / `queryAsync` | То же через класс |
| `Postgres.execute` / `executeAsync` | Запись |
| `Postgres.isConnected()` | Проверка пула |

Параметры — массив для `?` в SQL:

```javascript
postgresQuery('SELECT * FROM users WHERE uuid = ?', [uuid]).thenAccept(function (result) {
  if (result.isOk()) {
    var rows = result.getRows()
    var count = result.getRowCount()
  }
})
```

**Важно:** колбэк `thenAccept` выполняется в фоне — для чата/мира используй `server.scheduleInTicks(0, ...)`.

## Команды

- `/networkjs postgres reload` — перечитать конфиг и переподключиться
- `/networkjs postgres status` — статус подключения
- `/networkjs status` — реестр + postgres

## Безопасность

- Не коммить `postgres.json` с паролем в git
- Используй только `?` (prepared statements), не склеивай SQL из чата игрока
