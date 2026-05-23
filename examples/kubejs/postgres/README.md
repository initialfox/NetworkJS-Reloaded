# NetworkJS — PostgreSQL

[English version](README.en.md)

Подключение к PostgreSQL из KubeJS (пул HikariCP, асинхронные запросы).

## Установка

1. Скопируйте `config/networkjs/postgres.json.example` → `kubejs/config/networkjs/postgres.json`
2. Укажите `host`, `database`, `username`, `password`, `"enabled": true`
3. Перезапустите сервер или `/networkjs postgres reload`
4. В одиночке: `/networkjs enable`

## API

| Имя | Описание |
|-----|----------|
| `postgresQuery(sql, params?)` | SELECT → `CompletableFuture<PostgresResult>` |
| `postgresExecute(sql, params?)` | INSERT/UPDATE/DELETE |
| `Postgres.query` / `queryAsync` | То же через класс |
| `Postgres.execute` / `executeAsync` | Запись |
| `Postgres.isConnected()` | Проверка пула |
| `Postgres.reload()` | Переподключение |

```javascript
postgresQuery('SELECT * FROM users WHERE uuid = ?', [uuid]).thenAccept(function (result) {
  if (result.isOk()) {
    var rows = result.getRows()
    var count = result.getRowCount()
  }
})
```

Для чата/мира после async: `server.scheduleInTicks(0, ...)`.

## Команды

- `/networkjs postgres reload`
- `/networkjs postgres status`
- `/networkjs status`

## Безопасность

- Не коммитьте `postgres.json` с паролем
- Только `?` (prepared statements), не конкатенируйте SQL из ввода игрока
