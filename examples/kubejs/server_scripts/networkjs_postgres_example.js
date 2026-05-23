// NetworkJS PostgreSQL — пример
// 1. Скопируй postgres.json.example → kubejs/config/networkjs/postgres.json
// 2. /networkjs enable  (singleplayer)
// 3. /networkjs postgres reload
// 4. /kubejs reload server

// SELECT (async) — параметры через ? как в JDBC
PlayerEvents.loggedIn(function (event) {
  var mcName = String(event.player.username)
  var mcUuid = String(event.player.uuid)

  PostgresBinding.queryAsync(
    'SELECT uuid, username, role FROM users WHERE username = ? LIMIT 1',
    [mcName]
  ).thenAccept(function (result) {
    event.server.scheduleInTicks(0, function () {
      if (!result.isOk()) {
        Server.sendRawMessageToPlayer(mcName, '&c[DB] ' + result.getError())
        return
      }

      if (result.getRowCount() === 0) {
        Server.sendRawMessageToPlayer(mcName, '&e[DB] Игрок не найден в PostgreSQL')
        return
      }

      var row = result.getRows().get(0)
      Server.sendRawMessageToPlayer(
        mcName,
        '&a[DB] &f' + row.get('username') + ' &8| роль: &e' + row.get('role')
      )
    })
  }).exceptionally(function (err) {
    console.error('[DB] ' + err)
    return null
  })
})

// INSERT/UPDATE пример (раскомментируй при необходимости):
// postgresExecute(
//   'INSERT INTO player_sessions (uuid, username, joined_at) VALUES (?, ?, NOW()) ON CONFLICT (uuid) DO NOTHING',
//   [mcUuid, mcName]
// )
