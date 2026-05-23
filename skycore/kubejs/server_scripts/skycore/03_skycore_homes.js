// SkyCore — /sethome, /home, /delhome (PostgreSQL + SkyCore.perms)

var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

function skycoreHomesRequirePerm(player, permission) {
  if (!SkyCore.perms) return true
  return SkyCore.perms.require(player, permission)
}

function skycoreHomesRequireDb(player) {
  if (!SkyCore.isDbReady()) {
    SkyCore.msg.err(player, 'База данных недоступна. Проверьте postgres.json и /networkjs postgres reload')
    return false
  }
  return true
}

function skycoreHomesPlayerName(player) {
  return SkyCore.playerName(player)
}

function skycoreHomesNormalizeName(raw) {
  return String(raw).toLowerCase().replace(/^["']+|["']+$/g, '').trim()
}

function skycoreHomesWorld(player) {
  try {
    return String(player.level.dimension.location())
  } catch (e1) {}
  try {
    return String(player.level.dimension)
  } catch (e2) {}
  return 'minecraft:overworld'
}

function skycoreHomesRotation(player) {
  var yaw = 0
  var pitch = 0
  try {
    yaw = Number(player.yaw)
  } catch (e1) {}
  try {
    pitch = Number(player.pitch)
  } catch (e2) {}
  return { yaw: yaw, pitch: pitch }
}

function skycoreHomesSetSpawnpoint(player, x, y, z) {
  var name = skycoreHomesPlayerName(player)
  var cmd =
    'spawnpoint ' +
    name +
    ' ' +
    Math.floor(Number(x)) +
    ' ' +
    Math.floor(Number(y)) +
    ' ' +
    Math.floor(Number(z))
  try {
    if (typeof Utils !== 'undefined' && Utils.server && Utils.server.runCommandSilent) {
      Utils.server.runCommandSilent(cmd)
      return true
    }
  } catch (e1) {}
  try {
    if (typeof Utils !== 'undefined' && Utils.server && Utils.server.runCommand) {
      Utils.server.runCommand(cmd)
      return true
    }
  } catch (e2) {}
  return false
}

function skycoreHomesSetLast(player, homeName) {
  try {
    player.persistentData.put('skycore_last_home', homeName)
  } catch (e) {}
}

function skycoreHomesGetLast(player) {
  try {
    if (player.persistentData.contains('skycore_last_home')) {
      return skycoreHomesNormalizeName(player.persistentData.get('skycore_last_home'))
    }
  } catch (e) {}
  return null
}

function skycoreHomesClearLastIfMatch(player, homeName) {
  var last = skycoreHomesGetLast(player)
  if (last && last === homeName) {
    try {
      player.persistentData.remove('skycore_last_home')
    } catch (e) {}
  }
}

function skycoreHomesCoord(home, key) {
  if (home && typeof home.get === 'function') return home.get(key)
  return home ? home[key] : 0
}

function skycoreHomesTeleport(player, home) {
  player.teleportTo(
    Number(skycoreHomesCoord(home, 'x')),
    Number(skycoreHomesCoord(home, 'y')),
    Number(skycoreHomesCoord(home, 'z'))
  )
}

function skycoreHomesWithServer(player, task) {
  var server = null
  try {
    server = player.server
  } catch (e) {}
  if (server) SkyCore.runOnServer(server, task)
  else task()
}

function skycoreHomesRefreshNameCache(player) {
  var uuid = String(player.uuid)
  SkyCore.db.queryAsync('SELECT name FROM homes WHERE user_uuid = ?::uuid ORDER BY name', [uuid])
    .thenAccept(function (result) {
      if (!result.isOk()) return
      var names = []
      var rows = result.getRows()
      for (var i = 0; i < rows.size(); i++) {
        names.push(String(rows.get(i).get('name')))
      }
      try {
        player.persistentData.put('skycore_home_names', names.join(','))
      } catch (e) {}
    })
}

function skycoreHomesSuggestNames(ctx, builder) {
  try {
    var player = ctx.source.player
    if (player && player.persistentData.contains('skycore_home_names')) {
      var list = String(player.persistentData.get('skycore_home_names')).split(',')
      for (var i = 0; i < list.length; i++) {
        if (list[i]) builder.suggest(list[i])
      }
    }
  } catch (e) {}
  return builder.buildFuture()
}

function skycoreHomesUpsert(player, homeName, onDone) {
  var uuid = String(player.uuid)
  var world = skycoreHomesWorld(player)
  var rot = skycoreHomesRotation(player)

  SkyCore.db.executeAsync(
    'INSERT INTO homes (user_uuid, name, world, x, y, z, yaw, pitch) VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT (user_uuid, name) DO UPDATE SET world = EXCLUDED.world, x = EXCLUDED.x, y = EXCLUDED.y, ' +
      'z = EXCLUDED.z, yaw = EXCLUDED.yaw, pitch = EXCLUDED.pitch, created_at = NOW()',
    [uuid, homeName, world, player.x, player.y, player.z, rot.yaw, rot.pitch]
  ).thenAccept(function (result) {
    skycoreHomesWithServer(player, function () {
      if (result.isOk()) onDone(true)
      else {
        SkyCore.msg.err(player, result.getError() || 'Ошибка сохранения дома')
        onDone(false)
      }
    })
  }).exceptionally(function (err) {
    skycoreHomesWithServer(player, function () {
      SkyCore.msg.err(player, String(err))
      onDone(false)
    })
    return null
  })
}

function skycoreHomesFetch(player, homeName, onDone) {
  var uuid = String(player.uuid)
  SkyCore.db.queryAsync(
    'SELECT name, world, x, y, z, yaw, pitch FROM homes WHERE user_uuid = ?::uuid AND name = ? LIMIT 1',
    [uuid, homeName]
  ).thenAccept(function (result) {
    skycoreHomesWithServer(player, function () {
      if (!result.isOk()) {
        SkyCore.msg.err(player, result.getError() || 'Ошибка запроса')
        onDone(null)
        return
      }
      if (result.getRowCount() === 0) onDone(null)
      else onDone(result.getRows().get(0))
    })
  }).exceptionally(function (err) {
    skycoreHomesWithServer(player, function () {
      SkyCore.msg.err(player, String(err))
      onDone(null)
    })
    return null
  })
}

function skycoreHomesCount(player, onDone) {
  SkyCore.db.queryAsync('SELECT COUNT(*) AS cnt FROM homes WHERE user_uuid = ?::uuid', [String(player.uuid)])
    .thenAccept(function (result) {
      var cnt = 0
      if (result.isOk() && result.getRowCount() > 0) {
        cnt = Number(result.getRows().get(0).get('cnt'))
      }
      onDone(cnt)
    })
    .exceptionally(function () {
      onDone(0)
      return null
    })
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  console.info('[SkyCore] Registering homes commands')

  event.register(
    Commands.literal('sethome')
      .then(
        Commands.argument('name', StringArgumentType.word())
          .executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            if (!skycoreHomesRequirePerm(player, 'homes.set')) return 0
            if (!skycoreHomesRequireDb(player)) return 0

            var homeName = skycoreHomesNormalizeName(StringArgumentType.getString(ctx, 'name'))
            if (!homeName) {
              SkyCore.msg.err(player, 'Имя дома не может быть пустым')
              return 0
            }

            skycoreHomesCount(player, function (count) {
              skycoreHomesFetch(player, homeName, function (existing) {
                if (!existing && count >= SkyCore.homes.maxHomes) {
                  SkyCore.msg.warn(player, 'Лимит домов: ' + SkyCore.homes.maxHomes)
                  return
                }

                skycoreHomesUpsert(player, homeName, function (ok) {
                  if (!ok) return
                  skycoreHomesSetLast(player, homeName)
                  skycoreHomesSetSpawnpoint(player, player.x, player.y, player.z)
                  skycoreHomesRefreshNameCache(player)
                  SkyCore.msg.ok(player, 'Дом "' + homeName + '" сохранён')
                })
              })
            })

            return 1
          })
      )
  )

  event.register(
    Commands.literal('home')
      .executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        if (!skycoreHomesRequirePerm(player, 'homes.teleport')) return 0
        if (!skycoreHomesRequireDb(player)) return 0

        var homeName = skycoreHomesGetLast(player)
        if (!homeName) {
          SkyCore.msg.warn(player, 'Дом не выбран. Используйте /sethome <имя> или /home <имя>')
          return 0
        }

        skycoreHomesFetch(player, homeName, function (home) {
          if (!home) {
            SkyCore.msg.warn(player, 'Дом не найден. Используйте /sethome <имя>')
            return
          }
          if (String(home.get('world')) !== skycoreHomesWorld(player)) {
            SkyCore.msg.err(player, 'Дом сохранён в другом мире')
            return
          }
          skycoreHomesTeleport(player, home)
          SkyCore.msg.ok(player, 'Телепорт к дому "' + homeName + '"')
        })

        return 1
      })
      .then(
        Commands.literal('list')
          .executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            if (!skycoreHomesRequirePerm(player, 'homes.list')) return 0
            if (!skycoreHomesRequireDb(player)) return 0

            var uuid = String(player.uuid)
            var last = skycoreHomesGetLast(player)

            SkyCore.db.queryAsync(
              'SELECT name FROM homes WHERE user_uuid = ?::uuid ORDER BY name',
              [uuid]
            ).thenAccept(function (result) {
              skycoreHomesWithServer(player, function () {
                if (!result.isOk()) {
                  SkyCore.msg.err(player, result.getError())
                  return
                }
                if (result.getRowCount() === 0) {
                  SkyCore.msg.warn(player, 'Нет сохранённых домов. /sethome <имя>')
                  return
                }
                var parts = []
                var rows = result.getRows()
                for (var i = 0; i < rows.size(); i++) {
                  var n = String(rows.get(i).get('name'))
                  if (n === last) parts.push('\u00A7a' + n + '\u00A7r \u00A77(последний)')
                  else parts.push('\u00A77' + n)
                }
                SkyCore.msg.ok(player, 'Дома (' + rows.size() + '):')
                SkyCore.tellPlayer(player, '\u00A77' + parts.join('\u00A77, '))
              })
            })

            return 1
          })
      )
      .then(
        Commands.literal('help')
          .executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            if (!skycoreHomesRequirePerm(player, 'homes.list')) return 0

            var max = SkyCore.homes.maxHomes
            SkyCore.msg.ok(player, 'Команды домов:')
            SkyCore.tellPlayer(player, '\u00A77/sethome <имя> \u00A78— сохранить точку здесь')
            SkyCore.tellPlayer(player, '\u00A77/home \u00A78— телепорт к последнему дому')
            SkyCore.tellPlayer(player, '\u00A77/home <имя> \u00A78— телепорт к дому')
            SkyCore.tellPlayer(player, '\u00A77/home list \u00A78— список ваших домов')
            SkyCore.tellPlayer(player, '\u00A77/home help \u00A78— эта справка')
            SkyCore.tellPlayer(player, '\u00A77/delhome <имя> \u00A78— удалить дом')
            SkyCore.tellPlayer(
              player,
              '\u00A78Лимит: \u00A7e' + max + ' \u00A78домов. Телепорт только в том же мире, где сохранён дом.'
            )
            return 1
          })
      )
      .then(
        Commands.argument('name', StringArgumentType.word())
          .suggests(function (ctx, builder) {
            return skycoreHomesSuggestNames(ctx, builder)
          })
          .executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            if (!skycoreHomesRequirePerm(player, 'homes.teleport')) return 0
            if (!skycoreHomesRequireDb(player)) return 0

            var homeName = skycoreHomesNormalizeName(StringArgumentType.getString(ctx, 'name'))

            skycoreHomesFetch(player, homeName, function (home) {
              if (!home) {
                SkyCore.msg.warn(player, 'Дом "' + homeName + '" не найден')
                return
              }
              if (String(home.get('world')) !== skycoreHomesWorld(player)) {
                SkyCore.msg.err(player, 'Дом "' + homeName + '" в другом мире')
                return
              }
              skycoreHomesSetLast(player, homeName)
              skycoreHomesTeleport(player, home)
              SkyCore.msg.ok(player, 'Телепорт к дому "' + homeName + '"')
            })

            return 1
          })
      )
  )

  event.register(
    Commands.literal('delhome')
      .then(
        Commands.argument('name', StringArgumentType.word())
          .suggests(function (ctx, builder) {
            return skycoreHomesSuggestNames(ctx, builder)
          })
          .executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            if (!skycoreHomesRequirePerm(player, 'homes.delete')) return 0
            if (!skycoreHomesRequireDb(player)) return 0

            var homeName = skycoreHomesNormalizeName(StringArgumentType.getString(ctx, 'name'))
            var uuid = String(player.uuid)

            SkyCore.db.executeAsync(
              'DELETE FROM homes WHERE user_uuid = ?::uuid AND name = ?',
              [uuid, homeName]
            ).thenAccept(function (result) {
              skycoreHomesWithServer(player, function () {
                if (!result.isOk()) {
                  SkyCore.msg.err(player, result.getError())
                  return
                }
                if (result.getUpdateCount() === 0) {
                  SkyCore.msg.warn(player, 'Дом "' + homeName + '" не найден')
                  return
                }
                skycoreHomesClearLastIfMatch(player, homeName)
                skycoreHomesRefreshNameCache(player)
                SkyCore.msg.ok(player, 'Дом "' + homeName + '" удалён')
              })
            })

            return 1
          })
      )
  )
})
