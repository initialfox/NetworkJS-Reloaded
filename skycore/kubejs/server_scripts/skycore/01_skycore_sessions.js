// SkyCore — kubejs/server_scripts/skycore/01_skycore_sessions.js

function skycoreEnsureUser(uuid, nickname, onReady) {
  var nick = String(nickname || 'Player')
  SkyCore.db.executeAsync(
    'INSERT INTO users (uuid, nickname, role_id) ' +
      "SELECT ?::uuid, ?, id FROM roles WHERE name = 'user' LIMIT 1 " +
      'ON CONFLICT (uuid) DO UPDATE SET nickname = EXCLUDED.nickname',
    [uuid, nick]
  )
    .thenAccept(function () {
      onReady()
    })
    .exceptionally(function (err) {
      console.error('[SkyCore] ensure user: ' + err)
      return null
    })
}

function skycoreLoadUserRole(uuid, server, nickname) {
  SkyCore.db.queryAsync(
    'SELECT r.name AS role_name, r.full_name AS role_full_name, u.nickname ' +
      'FROM users u JOIN roles r ON r.id = u.role_id WHERE u.uuid = ?::uuid LIMIT 1',
    [uuid]
  )
    .thenAccept(function (result) {
      SkyCore.runOnServer(server, function () {
        if (!result.isOk() || result.getRowCount() === 0) {
          console.warn('[SkyCore] No user/role in DB for ' + uuid)
          return
        }
        var row = result.getRows().get(0)
        var roleName = String(row.get('role_name'))
        var fullName = String(row.get('role_full_name'))
        SkyCore.cacheRole(uuid, roleName, fullName)
        if (SkyCore.perms) {
          SkyCore.perms.cacheRole(uuid, roleName)
        }
        console.info(
          '[SkyCore] ' +
            String(row.get('nickname')) +
            ' → роль ' +
            fullName +
            ' (' +
            roleName +
            ')'
        )
      })
    })
    .exceptionally(function (err) {
      console.error('[SkyCore] load role: ' + err)
      return null
    })
}

function skycoreOpenSession(uuid) {
  SkyCore.db.executeAsync(
    'INSERT INTO player_sessions (user_uuid, joined_at) VALUES (?::uuid, NOW())',
    [uuid]
  )
    .thenAccept(function (result) {
      if (result.isOk()) {
        console.info('[SkyCore] Session opened for ' + uuid)
      } else {
        console.error('[SkyCore] open session: ' + result.getError())
      }
    })
    .exceptionally(function (err) {
      console.error('[SkyCore] open session: ' + err)
      return null
    })
}

function skycoreCloseSession(uuid) {
  SkyCore.db.executeAsync(
    'UPDATE player_sessions SET left_at = NOW() ' +
      'WHERE user_uuid = ?::uuid AND left_at IS NULL',
    [uuid]
  )
    .thenAccept(function (result) {
      if (result.isOk()) {
        console.info('[SkyCore] Session closed for ' + uuid + ', rows=' + result.getUpdateCount())
      } else {
        console.error('[SkyCore] close session: ' + result.getError())
      }
    })
    .exceptionally(function (err) {
      console.error('[SkyCore] close session: ' + err)
      return null
    })
}

PlayerEvents.loggedIn(function (event) {
  if (!SkyCore.isDbReady()) {
    console.warn('[SkyCore] PostgreSQL offline — sessions skipped')
    return
  }

  var player = event.player
  var uuid = String(player.uuid)
  var nick = SkyCore.playerName(player)
  var server = event.server

  skycoreEnsureUser(uuid, nick, function () {
    skycoreLoadUserRole(uuid, server, nick)
    skycoreOpenSession(uuid)
    if (typeof skycoreHomesRefreshNameCache === 'function') {
      skycoreHomesRefreshNameCache(player)
    }
    if (typeof skycoreSpawnHandleFirstJoin === 'function') {
      skycoreSpawnHandleFirstJoin(player, server)
    }
  })
})

PlayerEvents.loggedOut(function (event) {
  if (!SkyCore.isDbReady()) return

  var uuid = String(event.player.uuid)
  SkyCore.clearCache(uuid)
  if (SkyCore.perms) {
    SkyCore.perms.clearPlayer(uuid)
  }
  skycoreCloseSession(uuid)
})
