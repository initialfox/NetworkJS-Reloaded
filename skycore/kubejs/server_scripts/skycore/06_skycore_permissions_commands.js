// SkyCore — /perm, /permission

var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

function skycorePermGet() {
  if (!SkyCore.perms) {
    console.error('[SkyCore/Perms] SkyCore.perms не инициализирован (04_skycore_permissions.js)')
    return null
  }
  return SkyCore.perms
}

function skycorePermRoleSuggest(ctx, builder) {
  var P = skycorePermGet()
  if (!P) return builder.buildFuture()
  var roles = P.getRoles()
  roles.sort()
  for (var i = 0; i < roles.length; i++) {
    builder.suggest(roles[i])
  }
  return builder.buildFuture()
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  console.info('[SkyCore/Perms] Registering /perm, /permission')

  function registerPermTree(rootLiteral) {
    event.register(
      rootLiteral
        .executes(function (ctx) {
          var player = ctx.source.player
          if (!player) return 0
          SkyCore.msg.permsOk(player, 'Команды прав:')
          SkyCore.tellPlayer(player, '\u00A77/perm myrole \u00A78— ваша роль')
          SkyCore.tellPlayer(player, '\u00A77/perm list \u00A78— список ролей')
          SkyCore.tellPlayer(player, '\u00A77/perm info <роль> \u00A78— права роли')
          SkyCore.tellPlayer(player, '\u00A77/perm role <ник> <роль> \u00A78— выдать роль (БД)')
          SkyCore.tellPlayer(player, '\u00A77/perm reload \u00A78— обновить кэш из БД')
          return 1
        })
        .then(
          Commands.literal('reload').executes(function (ctx) {
            var player = ctx.source.player
            var P = skycorePermGet()
            if (!P) {
              if (player) SkyCore.msg.permsErr(player, 'Система прав не загружена')
              return 0
            }
            if (player && !P.hasPermission(player, 'permissions.reload')) {
              SkyCore.msg.permsErr(player, 'У вас нет прав на использование этой команды')
              return 0
            }
            P.reload(function () {
              if (player) SkyCore.msg.permsOk(player, 'Роли перезагружены из PostgreSQL')
              else console.info('[SkyCore/Perms] Reload OK (console)')
            })
            return 1
          })
        )
        .then(
          Commands.literal('role')
            .then(
              Commands.argument('player', StringArgumentType.word())
                .then(
                  Commands.argument('role', StringArgumentType.word())
                    .suggests(skycorePermRoleSuggest)
                    .executes(function (ctx) {
                      var player = ctx.source.player
                      var targetName = StringArgumentType.getString(ctx, 'player')
                      var role = StringArgumentType.getString(ctx, 'role')
                      var P = skycorePermGet()
                      if (!P) {
                        if (player) SkyCore.msg.permsErr(player, 'Система прав не загружена')
                        return 0
                      }
                      if (player && !P.hasPermission(player, 'permissions.set')) {
                        SkyCore.msg.permsErr(player, 'У вас нет прав на использование этой команды')
                        return 0
                      }

                      function runSetRole() {
                        if (!P.roleExists(role)) {
                          var msg =
                            'Роль "' +
                            role +
                            '" не в конфиге. Доступные: ' +
                            P.getRoles().join(', ')
                          if (player) SkyCore.msg.permsErr(player, msg)
                          else console.error('[SkyCore/Perms] ' + msg)
                          return
                        }

                      var uuidHint =
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetName)
                          ? targetName
                          : null

                      function applyRole(uuid) {
                        if (!uuid) {
                          var err =
                            'Игрок "' +
                            targetName +
                            '" не найден (онлайн, nickname в БД или UUID)'
                          if (player) SkyCore.msg.permsErr(player, err)
                          else console.error('[SkyCore/Perms] ' + err)
                          return
                        }
                        P.setPlayerRole(uuid, role, function (ok, errMsg) {
                          var server = player ? player.server : null
                          var task = function () {
                            if (ok) {
                              var msg = 'Роль "' + role + '" → ' + targetName
                              if (player) SkyCore.msg.permsOk(player, msg)
                              else console.info('[SkyCore/Perms] ' + msg)
                            } else if (player) {
                              SkyCore.msg.permsErr(player, errMsg || 'Не удалось установить роль')
                            }
                          }
                          if (server) SkyCore.runOnServer(server, task)
                          else task()
                        })
                      }

                      if (uuidHint) applyRole(uuidHint)
                      else {
                        P.findUuidByName(ctx, targetName, applyRole)
                      }
                      }

                      P.ensureDbRoleNames(function () {
                        runSetRole()
                      })
                      return 1
                    })
                )
            )
        )
        .then(
          Commands.literal('list').executes(function (ctx) {
            var player = ctx.source.player
            var P = skycorePermGet()
            if (!P) {
              if (player) SkyCore.msg.permsErr(player, 'Система прав не загружена')
              return 0
            }
            if (player && !P.hasPermission(player, 'permissions.list')) {
              SkyCore.msg.permsErr(player, 'У вас нет прав на использование этой команды')
              return 0
            }
            P.ensureDbRoleNames(function () {
              var roles = P.getRoles().join(', ')
              if (player) {
                SkyCore.msg.permsOk(player, 'Роли: ' + roles)
                SkyCore.msg.permsOk(player, 'Ваша роль: ' + P.getPlayerRole(player))
              } else {
                console.info('[SkyCore/Perms] Роли: ' + roles)
              }
            })
            return 1
          })
        )
        .then(
          Commands.literal('info')
            .then(
              Commands.argument('role', StringArgumentType.word())
                .suggests(skycorePermRoleSuggest)
                .executes(function (ctx) {
                  var player = ctx.source.player
                  var role = StringArgumentType.getString(ctx, 'role')
                  var P = skycorePermGet()
                  if (!P) {
                    if (player) SkyCore.msg.permsErr(player, 'Система прав не загружена')
                    return 0
                  }
                  if (player && !P.hasPermission(player, 'permissions.info')) {
                    SkyCore.msg.permsErr(player, 'У вас нет прав на использование этой команды')
                    return 0
                  }
                  P.ensureDbRoleNames(function () {
                    var data = P.getRoleData(role)
                    if (!data) {
                      if (player) SkyCore.msg.permsErr(player, 'Роль "' + role + '" не в конфиге')
                      return
                    }
                    var perms = data.permissions || []
                    if (player) {
                      SkyCore.msg.permsOk(player, 'Роль: ' + role)
                      SkyCore.msg.permsOk(player, 'Описание: ' + (data.description || '—'))
                      SkyCore.tellPlayer(
                        player,
                        SkyCore.msg.permsPrefix +
                          '\u00A77Права (' +
                          perms.length +
                          '): \u00A7f' +
                          perms.join(', ')
                      )
                    } else {
                      console.info('[SkyCore/Perms] ' + role + ': ' + perms.join(', '))
                    }
                  })
                  return 1
                })
            )
        )
        .then(
          Commands.literal('myrole').executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            var P = skycorePermGet()
            if (!P) {
              SkyCore.msg.permsErr(player, 'Система прав не загружена')
              return 0
            }
            var role = P.getPlayerRole(player)
            var data = P.getRoleData(role)
            SkyCore.msg.permsOk(player, 'Ваша роль: ' + role)
            if (data && data.description) {
              SkyCore.msg.permsOk(player, data.description)
            }
            return 1
          })
        )
        .then(
          Commands.literal('help').executes(function (ctx) {
            var player = ctx.source.player
            if (!player) return 0
            SkyCore.msg.permsOk(player, 'Команды прав:')
            SkyCore.tellPlayer(player, '\u00A77/perm myrole \u00A78— ваша роль')
            SkyCore.tellPlayer(player, '\u00A77/perm list \u00A78— список ролей')
            SkyCore.tellPlayer(player, '\u00A77/perm info <роль> \u00A78— права роли')
            SkyCore.tellPlayer(player, '\u00A77/perm role <ник> <роль> \u00A78— выдать роль')
            SkyCore.tellPlayer(player, '\u00A77/perm reload \u00A78— перечитать роли из БД')
            return 1
          })
        )
    )
  }

  registerPermTree(Commands.literal('perm'))

  event.register(
    Commands.literal('permission')
      .then(Commands.literal('reload').executes(function (ctx) {
        if (!ctx.source.player) return 0
        return ctx.source.server.runCommand('perm reload')
      }))
      .then(
        Commands.literal('role')
          .then(
            Commands.argument('player', StringArgumentType.word())
              .then(
                Commands.argument('role', StringArgumentType.word())
                  .executes(function (ctx) {
                    if (!ctx.source.player) return 0
                    var n = StringArgumentType.getString(ctx, 'player')
                    var r = StringArgumentType.getString(ctx, 'role')
                    return ctx.source.server.runCommand('perm role ' + n + ' ' + r)
                  })
              )
          )
      )
      .then(Commands.literal('list').executes(function (ctx) {
        if (!ctx.source.player) return 0
        return ctx.source.server.runCommand('perm list')
      }))
      .then(
        Commands.literal('info')
          .then(
            Commands.argument('role', StringArgumentType.word())
              .executes(function (ctx) {
                if (!ctx.source.player) return 0
                var role = StringArgumentType.getString(ctx, 'role')
                return ctx.source.server.runCommand('perm info ' + role)
              })
          )
      )
      .then(Commands.literal('myrole').executes(function (ctx) {
        if (!ctx.source.player) return 0
        return ctx.source.server.runCommand('perm myrole')
      }))
      .then(Commands.literal('help').executes(function (ctx) {
        if (!ctx.source.player) return 0
        return ctx.source.server.runCommand('perm help')
      }))
  )
})
