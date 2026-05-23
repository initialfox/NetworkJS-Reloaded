// SkyCore — kubejs/server_scripts/skycore/00_skycore_lib.js
// Требует: kubejs/config/networkjs/postgres.json, /networkjs enable

var SkyCore = {
  roleCache: {},

  /** Локальный чат: радиус в блоках. Глобальный: префикс в начале сообщения */
  chat: {
    localRange: 100,
    globalPrefix: '!'
  },

  homes: {
    maxHomes: 10
  },

  msg: {
    homesPrefix: '\u00A78[\u00A76SkyCore\u00A78/\u00A7eHomes\u00A78]\u00A7r ',
    permsPrefix: '\u00A78[\u00A76SkyCore\u00A78/\u00A7dPerms\u00A78]\u00A7r ',
    regionsPrefix: '\u00A78[\u00A76SkyCore\u00A78/\u00A7bRegions\u00A78]\u00A7r ',
    ok: function (player, text) {
      SkyCore.tellPlayer(player, this.homesPrefix + '\u00A7a' + text)
    },
    warn: function (player, text) {
      SkyCore.tellPlayer(player, this.homesPrefix + '\u00A7e' + text)
    },
    err: function (player, text) {
      SkyCore.tellPlayer(player, this.homesPrefix + '\u00A7c' + text)
    },
    permsOk: function (player, text) {
      SkyCore.tellPlayer(player, this.permsPrefix + '\u00A7a' + text)
    },
    permsWarn: function (player, text) {
      SkyCore.tellPlayer(player, this.permsPrefix + '\u00A7e' + text)
    },
    permsErr: function (player, text) {
      SkyCore.tellPlayer(player, this.permsPrefix + '\u00A7c' + text)
    },
    regionsOk: function (player, text) {
      SkyCore.tellPlayer(player, this.regionsPrefix + '\u00A7a' + text)
    },
    regionsWarn: function (player, text) {
      SkyCore.tellPlayer(player, this.regionsPrefix + '\u00A7e' + text)
    },
    regionsErr: function (player, text) {
      SkyCore.tellPlayer(player, this.regionsPrefix + '\u00A7c' + text)
    },
    spawnPrefix: '\u00A78[\u00A76SkyCore\u00A78/\u00A7eSpawn\u00A78]\u00A7r ',
    spawnOk: function (player, text) {
      SkyCore.tellPlayer(player, this.spawnPrefix + '\u00A7a' + text)
    },
    spawnWarn: function (player, text) {
      SkyCore.tellPlayer(player, this.spawnPrefix + '\u00A7e' + text)
    },
    spawnErr: function (player, text) {
      SkyCore.tellPlayer(player, this.spawnPrefix + '\u00A7c' + text)
    }
  },

  regions: {
    maxPerPlayer: 3
  },

  spawn: {
    firstJoinTeleport: true
  },

  roleColor: function (roleName) {
    if (roleName === 'admin') return '&c'
    if (roleName === 'moderator') return '&9'
    if (roleName === 'vip') return '&6'
    return '&7'
  },

  /** API Postgres из NetworkJS (класс Postgres, не PostgresBinding) */
  db: {
    queryAsync: function (sql, params) {
      if (typeof postgresQuery === 'function') {
        return params ? postgresQuery(sql, params) : postgresQuery(sql)
      }
      if (typeof Postgres !== 'undefined') {
        return params ? Postgres.queryAsync(sql, params) : Postgres.queryAsync(sql)
      }
      throw new Error('PostgreSQL bindings missing (NetworkJS mod?)')
    },

    executeAsync: function (sql, params) {
      if (typeof postgresExecute === 'function') {
        return params ? postgresExecute(sql, params) : postgresExecute(sql)
      }
      if (typeof Postgres !== 'undefined') {
        return params ? Postgres.executeAsync(sql, params) : Postgres.executeAsync(sql)
      }
      throw new Error('PostgreSQL bindings missing (NetworkJS mod?)')
    },

    isConnected: function () {
      if (typeof Postgres !== 'undefined') {
        return Postgres.isConnected()
      }
      return false
    }
  },

  isDbReady: function () {
    return SkyCore.db.isConnected()
  },

  runOnServer: function (server, task) {
    server.scheduleInTicks(0, task)
  },

  cacheRole: function (uuid, roleName, fullName) {
    SkyCore.roleCache[uuid] = {
      name: roleName,
      fullName: fullName
    }
  },

  getCachedRole: function (uuid) {
    return SkyCore.roleCache[uuid] || null
  },

  clearCache: function (uuid) {
    delete SkyCore.roleCache[uuid]
  },

  playerName: function (player) {
    try {
      return String(player.username)
    } catch (e1) {}
    try {
      return String(player.name.string)
    } catch (e2) {}
    return 'Player'
  },

  getChatText: function (event) {
    try {
      if (typeof event.getMessage === 'function') {
        var fromGetter = event.getMessage()
        if (fromGetter != null) return String(fromGetter)
      }
    } catch (e1) {}
    try {
      if (event.message != null) return String(event.message)
    } catch (e2) {}
    return ''
  },

  playerPos: function (player) {
    return {
      x: Number(player.x),
      y: Number(player.y),
      z: Number(player.z),
      dim: String(player.level.dimension)
    }
  },

  tellPlayer: function (player, msg) {
    try {
      player.tell(msg)
      return true
    } catch (e) {
      return false
    }
  },

  forEachOnline: function (callback) {
    try {
      if (typeof Utils !== 'undefined' && Utils.server && Utils.server.players) {
        var list = Utils.server.players
        for (var i = 0; i < list.length; i++) callback(list[i])
        return true
      }
    } catch (e0) {}
    try {
      if (typeof Server !== 'undefined' && Server.players) {
        var players = Server.players
        for (var j = 0; j < players.length; j++) callback(players[j])
        return true
      }
    } catch (e1) {}
    return false
  },

  /** Локальный чат — только игроки в радиусе, тот же мир */
  broadcastLocalChat: function (sender, msg, range) {
    var src = SkyCore.playerPos(sender)
    var rangeSq = range * range
    var sent = 0

    SkyCore.forEachOnline(function (other) {
      try {
        var dst = SkyCore.playerPos(other)
        if (dst.dim !== src.dim) return

        var dx = dst.x - src.x
        var dy = dst.y - src.y
        var dz = dst.z - src.z
        if (dx * dx + dy * dy + dz * dz > rangeSq) return

        if (SkyCore.tellPlayer(other, msg)) sent++
      } catch (e) {}
    })

    return sent
  },

  /** Глобальный чат — всем онлайн */
  broadcastChat: function (msg) {
    try {
      if (typeof Utils !== 'undefined' && Utils.server && Utils.server.players) {
        var list = Utils.server.players
        for (var i = 0; i < list.length; i++) {
          try {
            list[i].tell(msg)
          } catch (e) {}
        }
        return true
      }
    } catch (e0) {}

    try {
      if (typeof Server !== 'undefined' && Server.players) {
        var players = Server.players
        for (var j = 0; j < players.length; j++) {
          try {
            players[j].tell(msg)
          } catch (e2) {}
        }
        return true
      }
    } catch (e3) {}

    try {
      Server.sendRawMessage(msg)
      return true
    } catch (e4) {
      console.error('[SkyCore] broadcastChat failed: ' + e4)
    }
    return false
  }
}

ServerEvents.loaded(function () {
  var hasPostgres = typeof Postgres !== 'undefined'
  var hasQuery = typeof postgresQuery === 'function'
  console.info(
    '[SkyCore] Bindings: Postgres=' + hasPostgres +
      ', postgresQuery=' + hasQuery +
      ', connected=' + SkyCore.isDbReady()
  )
})

console.info('[SkyCore] Library loaded')
