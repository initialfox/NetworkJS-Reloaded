// SkyCore — /setspawn, /spawn, первый вход (PostgreSQL: server_spawn, users.spawn_intro_done)

var skycoreSpawnCache = null
var skycoreSpawnCacheReady = false

function skycoreSpawnNormalizeDim(dim) {
  var s = String(dim == null ? '' : dim).trim()
  if (!s || s === '[object Object]') return 'minecraft:overworld'
  var keyMatch = s.match(/ResourceKey\[[^\]]*?\s([a-z0-9_.-]+:[a-z0-9_./-]+)\s*\]/i)
  if (keyMatch) return keyMatch[1]
  var idMatch = s.match(/([a-z0-9_.-]+:[a-z0-9_./-]+)/i)
  if (idMatch) return idMatch[1]
  if (s.indexOf('the_nether') >= 0) return 'minecraft:the_nether'
  if (s.indexOf('the_end') >= 0) return 'minecraft:the_end'
  if (s.indexOf('overworld') >= 0) return 'minecraft:overworld'
  if (s.indexOf(':') < 0) return 'minecraft:' + s
  return s
}

function skycoreSpawnSameDim(a, b) {
  return skycoreSpawnNormalizeDim(a) === skycoreSpawnNormalizeDim(b)
}

function skycoreSpawnPlayerDim(player) {
  try {
    var loc = player.level.dimension.location()
    if (loc != null) {
      if (typeof loc.getNamespace === 'function' && typeof loc.getPath === 'function') {
        return skycoreSpawnNormalizeDim(loc.getNamespace() + ':' + loc.getPath())
      }
      return skycoreSpawnNormalizeDim(String(loc))
    }
  } catch (e1) {}
  try {
    return skycoreSpawnNormalizeDim(String(player.level.dimension))
  } catch (e2) {}
  return 'minecraft:overworld'
}

function skycoreSpawnFromRow(row) {
  if (!row) return null
  return {
    x: Number(row.get('x')),
    y: Number(row.get('y')),
    z: Number(row.get('z')),
    dim: skycoreSpawnNormalizeDim(row.get('world')),
    yaw: Number(row.get('yaw') || 0),
    pitch: Number(row.get('pitch') || 0)
  }
}

function skycoreSpawnFromPlayer(player) {
  var yaw = 0
  var pitch = 0
  try {
    yaw = Number(player.yaw)
  } catch (e1) {}
  try {
    pitch = Number(player.pitch)
  } catch (e2) {}
  return {
    x: Number(player.x),
    y: Number(player.y),
    z: Number(player.z),
    dim: skycoreSpawnPlayerDim(player),
    yaw: yaw,
    pitch: pitch
  }
}

function skycoreSpawnRequireDb(player) {
  if (!SkyCore.isDbReady()) {
    SkyCore.msg.spawnErr(player, 'База данных недоступна. Проверьте postgres.json и /networkjs postgres reload')
    return false
  }
  return true
}

function skycoreSpawnWithServer(player, task) {
  var server = null
  try {
    server = player.server
  } catch (e) {}
  if (server) SkyCore.runOnServer(server, task)
  else task()
}

function skycoreSpawnFinishCacheLoad(spawn, onDone, ok) {
  skycoreSpawnCache = spawn
  skycoreSpawnCacheReady = true
  if (onDone) onDone(ok !== false)
}

function skycoreSpawnRefreshCache(onDone) {
  if (!SkyCore.isDbReady()) {
    skycoreSpawnCache = null
    skycoreSpawnCacheReady = false
    if (onDone) onDone(false)
    return
  }

  SkyCore.db.queryAsync(
    'SELECT world, x, y, z, yaw, pitch FROM server_spawn WHERE id = 1 LIMIT 1',
    []
  )
    .thenAccept(function (result) {
      if (!result.isOk()) {
        console.error('[SkyCore/Spawn] cache load: ' + result.getError())
        skycoreSpawnFinishCacheLoad(null, onDone, false)
        return
      }
      if (result.getRowCount() === 0) {
        skycoreSpawnFinishCacheLoad(null, onDone, true)
        return
      }
      skycoreSpawnFinishCacheLoad(skycoreSpawnFromRow(result.getRows().get(0)), onDone, true)
    })
    .exceptionally(function (err) {
      console.error('[SkyCore/Spawn] cache load: ' + err)
      skycoreSpawnCache = null
      skycoreSpawnCacheReady = false
      if (onDone) onDone(false)
      return null
    })
}

function skycoreSpawnEnsureCache(onDone) {
  if (skycoreSpawnCacheReady) {
    if (onDone) onDone(true)
    return
  }
  if (!SkyCore.isDbReady()) {
    if (onDone) onDone(false)
    return
  }
  skycoreSpawnRefreshCache(onDone)
}

function skycoreSpawnTryLoadCache() {
  if (!SkyCore.isDbReady()) return
  skycoreSpawnRefreshCache(function (ok) {
    if (!ok) {
      console.warn('[SkyCore/Spawn] Повторная загрузка кэша не удалась')
    } else if (skycoreSpawnCache) {
      console.info(
        '[SkyCore/Spawn] Точка спавна: ' +
          Math.floor(skycoreSpawnCache.x) +
          ', ' +
          Math.floor(skycoreSpawnCache.y) +
          ', ' +
          Math.floor(skycoreSpawnCache.z) +
          ' (' +
          skycoreSpawnCache.dim +
          ')'
      )
    } else {
      console.info('[SkyCore/Spawn] Спавн не задан — используйте /setspawn')
    }
  })
}

function skycoreSpawnGetCached() {
  return skycoreSpawnCache
}

function skycoreSpawnRunCmd(server, cmd) {
  if (!server) return false
  try {
    if (server.runCommandSilent) {
      server.runCommandSilent(cmd)
      return true
    }
  } catch (e1) {}
  try {
    server.runCommand(cmd)
    return true
  } catch (e2) {}
  return false
}

function skycoreSpawnApplyWorldSpawn(server, spawn) {
  if (!server || !spawn) return
  var dim = skycoreSpawnNormalizeDim(spawn.dim)
  var x = Math.floor(Number(spawn.x))
  var y = Math.floor(Number(spawn.y))
  var z = Math.floor(Number(spawn.z))
  skycoreSpawnRunCmd(server, 'execute in ' + dim + ' run setworldspawn ' + x + ' ' + y + ' ' + z)
}

function skycoreSpawnRequirePerm(player, perm) {
  if (!SkyCore.perms) return true
  return SkyCore.perms.require(player, perm)
}

function skycoreSpawnTeleport(player, spawn) {
  if (!player || !spawn) return false

  var px = Number(spawn.x)
  var py = Number(spawn.y)
  var pz = Number(spawn.z)
  var dim = skycoreSpawnNormalizeDim(spawn.dim)
  var cur = skycoreSpawnPlayerDim(player)

  try {
    if (!skycoreSpawnSameDim(cur, dim)) {
      if (typeof player.teleportTo === 'function') {
        try {
          player.teleportTo(dim, px, py, pz)
          return true
        } catch (e1) {}
        try {
          player.teleportTo(dim, px, py, pz, spawn.yaw || 0, spawn.pitch || 0)
          return true
        } catch (e2) {}
      }
    }
    player.teleportTo(px, py, pz)
    return true
  } catch (e) {
    console.error('[SkyCore/Spawn] teleport failed: ' + e)
    return false
  }
}

function skycoreSpawnSaveDb(player, onDone) {
  var spawn = skycoreSpawnFromPlayer(player)
  SkyCore.db.executeAsync(
    'INSERT INTO server_spawn (id, world, x, y, z, yaw, pitch, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, NOW()) ' +
      'ON CONFLICT (id) DO UPDATE SET world = EXCLUDED.world, x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, ' +
      'yaw = EXCLUDED.yaw, pitch = EXCLUDED.pitch, updated_at = NOW()',
    [spawn.dim, spawn.x, spawn.y, spawn.z, spawn.yaw, spawn.pitch]
  )
    .thenAccept(function (result) {
      skycoreSpawnWithServer(player, function () {
        if (!result.isOk()) {
          SkyCore.msg.spawnErr(player, result.getError() || 'Ошибка сохранения спавна')
          onDone(null)
          return
        }
        skycoreSpawnCache = spawn
        skycoreSpawnCacheReady = true
        onDone(spawn)
      })
    })
    .exceptionally(function (err) {
      skycoreSpawnWithServer(player, function () {
        SkyCore.msg.spawnErr(player, String(err))
        onDone(null)
      })
      return null
    })
}

function skycoreSpawnMarkIntroDone(uuid) {
  SkyCore.db.executeAsync('UPDATE users SET spawn_intro_done = TRUE WHERE uuid = ?::uuid', [uuid]).exceptionally(
    function (err) {
      console.error('[SkyCore/Spawn] spawn_intro_done: ' + err)
      return null
    }
  )
}

function skycoreSpawnCheckIntroDone(uuid, onDone) {
  SkyCore.db.queryAsync('SELECT spawn_intro_done FROM users WHERE uuid = ?::uuid LIMIT 1', [uuid])
    .thenAccept(function (result) {
      if (!result.isOk() || result.getRowCount() === 0) {
        onDone(false)
        return
      }
      var val = result.getRows().get(0).get('spawn_intro_done')
      onDone(val === true || val === 't' || val === 'true' || val === 1 || val === '1')
    })
    .exceptionally(function (err) {
      console.error('[SkyCore/Spawn] intro check: ' + err)
      onDone(true)
      return null
    })
}

function skycoreSpawnHandleFirstJoin(player, server) {
  if (!SkyCore.spawn.firstJoinTeleport) return
  if (!SkyCore.isDbReady()) return

  var uuid = String(player.uuid)

  skycoreSpawnEnsureCache(function () {
    var spawn = skycoreSpawnGetCached()
    if (!spawn) return

    skycoreSpawnCheckIntroDone(uuid, function (alreadyDone) {
      if (alreadyDone) return

      server.scheduleInTicks(10, function () {
        try {
          if (!player) return
        } catch (e0) {
          return
        }

        if (skycoreSpawnTeleport(player, spawn)) {
          skycoreSpawnMarkIntroDone(uuid)
          SkyCore.msg.spawnOk(player, 'Добро пожаловать! Вы на спавне сервера.')
        }
      })
    })
  })
}

function skycoreSpawnRunWithCache(player, task) {
  skycoreSpawnEnsureCache(function (ok) {
    if (!ok) {
      SkyCore.msg.spawnErr(player, 'Не удалось загрузить спавн из БД')
      return
    }
    task(skycoreSpawnGetCached())
  })
}

SkyCore.spawnApi = {
  getCached: skycoreSpawnGetCached,
  refreshCache: skycoreSpawnRefreshCache,
  ensureCache: skycoreSpawnEnsureCache,
  teleport: skycoreSpawnTeleport
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  event.register(
    Commands.literal('setspawn').executes(function (ctx) {
      var player = ctx.source.player
      if (!player) return 0
      if (!skycoreSpawnRequirePerm(player, 'spawn.set')) return 0
      if (!skycoreSpawnRequireDb(player)) return 0

      skycoreSpawnSaveDb(player, function (spawn) {
        if (!spawn) return

        skycoreSpawnApplyWorldSpawn(ctx.source.server, spawn)
        SkyCore.msg.spawnOk(
          player,
          'Спавн сохранён в БД: \u00A77' +
            Math.floor(spawn.x) +
            ', ' +
            Math.floor(spawn.y) +
            ', ' +
            Math.floor(spawn.z) +
            ' \u00A78(' +
            spawn.dim +
            ')'
        )
      })
      return 1
    })
  )

  event.register(
    Commands.literal('spawn')
      .executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        if (!skycoreSpawnRequirePerm(player, 'spawn.use')) return 0
        if (!skycoreSpawnRequireDb(player)) return 0

        skycoreSpawnRunWithCache(player, function (spawn) {
          if (!spawn) {
            SkyCore.msg.spawnErr(player, 'Спавн не установлен. Админ: /setspawn')
            return
          }
          if (skycoreSpawnTeleport(player, spawn)) {
            SkyCore.msg.spawnOk(player, 'Телепорт на спавн')
          } else {
            SkyCore.msg.spawnErr(player, 'Не удалось телепортироваться')
          }
        })
        return 1
      })
      .then(
        Commands.literal('info').executes(function (ctx) {
          var player = ctx.source.player
          if (!player) return 0
          if (!skycoreSpawnRequireDb(player)) return 0

          skycoreSpawnRunWithCache(player, function (spawn) {
            if (!spawn) {
              SkyCore.msg.spawnWarn(player, 'Спавн ещё не установлен')
              return
            }
            SkyCore.msg.spawnOk(
              player,
              'Спавн: \u00A77' +
                Math.floor(spawn.x) +
                ', ' +
                Math.floor(spawn.y) +
                ', ' +
                Math.floor(spawn.z) +
                ' \u00A78' +
                spawn.dim
            )
          })
          return 1
        })
      )
  )
})

ServerEvents.loaded(function (event) {
  skycoreSpawnTryLoadCache()
  event.server.scheduleInTicks(40, skycoreSpawnTryLoadCache)
  event.server.scheduleInTicks(200, skycoreSpawnTryLoadCache)
})

console.info('[SkyCore/Spawn] Модуль загружен (PostgreSQL)')
