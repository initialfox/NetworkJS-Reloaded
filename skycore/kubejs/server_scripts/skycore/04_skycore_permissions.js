// SkyCore — права: списки прав в конфиге, роль игрока в PostgreSQL (users.role_id)

var SKYCORE_PERMS_DEFAULT_ROLE = 'user'

function skycorePermsReadStartupConfig() {
  try {
    if (typeof global !== 'undefined' && global.SkyCoreRolesConfig) {
      return global.SkyCoreRolesConfig
    }
  } catch (e) {}
  if (SkyCore.rolesConfig) return SkyCore.rolesConfig
  return null
}

var SKYCORE_PERMS_BUILTIN_ROLES = {
  admin: {
    description: 'Администратор — полный доступ',
    permissions: ['permissions.*', 'homes.*', 'blocks.*', 'regions.*', 'spawn.*']
  },
  moderator: {
    description: 'Модератор',
    permissions: [
      'permissions.list',
      'permissions.info',
      'permissions.set',
      'homes.*',
      'blocks.*',
      'regions.*',
      'spawn.set',
      'spawn.use'
    ]
  },
  vip: {
    description: 'VIP',
    permissions: [
      'homes.*',
      'blocks.break',
      'blocks.place',
      'blocks.interact',
      'regions.create',
      'regions.info',
      'regions.manage',
      'regions.list',
      'regions.delete',
      'spawn.use'
    ]
  },
  user: {
    description: 'Игрок',
    permissions: [
      'homes.*',
      'blocks.break',
      'blocks.place',
      'blocks.interact',
      'regions.create',
      'regions.info',
      'regions.manage',
      'regions.list',
      'regions.delete',
      'spawn.use'
    ]
  }
}

var SKYCORE_PERMS_DEFAULT_ROLES = skycorePermsReadStartupConfig() || SKYCORE_PERMS_BUILTIN_ROLES

if (skycorePermsReadStartupConfig()) {
  console.info('[SkyCore/Perms] Конфиг прав из startup_scripts/skycore/skycore_roles_config.js')
} else {
  console.warn('[SkyCore/Perms] SkyCoreRolesConfig не найден, встроенные права по умолчанию')
}

var skycorePermsRolesData = SKYCORE_PERMS_DEFAULT_ROLES
var skycorePermsPlayersCache = {}
var skycorePermsDbRoleNames = []

function skycorePermsPlayerUuid(player) {
  try {
    return String(player.uuid)
  } catch (e1) {}
  try {
    return String(player.getUUID())
  } catch (e2) {}
  return null
}

function skycorePermsRoleExists(role) {
  return skycorePermsRolesData[String(role)] != null
}

function skycorePermsGetRoleList() {
  var out = []
  var seen = {}
  var i
  for (i = 0; i < skycorePermsDbRoleNames.length; i++) {
    var dbName = skycorePermsDbRoleNames[i]
    if (skycorePermsRolesData[dbName] && !seen[dbName]) {
      out.push(dbName)
      seen[dbName] = true
    }
  }
  if (out.length === 0) {
    for (var key in skycorePermsRolesData) {
      if (skycorePermsRolesData.hasOwnProperty(key)) out.push(key)
    }
    out.sort()
  }
  return out
}

function skycorePermsEnsureDbRoleNames(onDone) {
  if (skycorePermsDbRoleNames.length > 0) {
    if (onDone) onDone(true)
    return
  }
  skycorePermsLoadDbRoleNames(onDone)
}

function skycorePermsMatchWildcard(perm, pattern) {
  if (pattern.length < 3 || pattern.substring(pattern.length - 2) !== '.*') {
    return false
  }
  var prefix = pattern.substring(0, pattern.length - 2)
  return perm.indexOf(prefix + '.') === 0 || perm === prefix
}

function skycorePermsHasInList(perms, permission) {
  for (var i = 0; i < perms.length; i++) {
    var p = String(perms[i])
    if (p === permission) return true
    if (skycorePermsMatchWildcard(permission, p)) return true
  }
  return false
}

function skycorePermsCacheRole(uuid, roleName) {
  skycorePermsPlayersCache[String(uuid)] = String(roleName)
}

function skycorePermsClearPlayer(uuid) {
  delete skycorePermsPlayersCache[String(uuid)]
}

function skycorePermsGetPlayerRole(player) {
  var uuid = typeof player === 'string' ? player : skycorePermsPlayerUuid(player)
  if (!uuid) return SKYCORE_PERMS_DEFAULT_ROLE
  return skycorePermsPlayersCache[uuid] || SKYCORE_PERMS_DEFAULT_ROLE
}

function skycorePermsHasPermission(player, permission) {
  var role = skycorePermsGetPlayerRole(player)
  var roleData = skycorePermsRolesData[role]
  if (!roleData) return false
  return skycorePermsHasInList(roleData.permissions || [], permission)
}

function skycorePermsRequire(player, permission) {
  if (skycorePermsHasPermission(player, permission)) return true
  SkyCore.msg.permsErr(player, 'У вас нет прав на использование этой команды')
  return false
}

function skycorePermsLoadDbRoleNames(onDone) {
  if (!SkyCore.isDbReady()) {
    skycorePermsDbRoleNames = []
    if (onDone) onDone(false)
    return
  }
  SkyCore.db.queryAsync('SELECT name FROM roles ORDER BY name', [])
    .thenAccept(function (result) {
      var names = []
      if (result.isOk()) {
        var rows = result.getRows()
        for (var i = 0; i < rows.size(); i++) {
          names.push(String(rows.get(i).get('name')))
        }
      }
      skycorePermsDbRoleNames = names
      if (onDone) onDone(result.isOk())
    })
    .exceptionally(function (err) {
      console.error('[SkyCore/Perms] load role names: ' + err)
      if (onDone) onDone(false)
      return null
    })
}

function skycorePermsLoadPlayerRoleFromDb(uuid, onDone) {
  if (!SkyCore.isDbReady()) {
    if (onDone) onDone(SKYCORE_PERMS_DEFAULT_ROLE)
    return
  }
  SkyCore.db.queryAsync(
    'SELECT r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.uuid = ?::uuid LIMIT 1',
    [String(uuid)]
  )
    .thenAccept(function (result) {
      var role = SKYCORE_PERMS_DEFAULT_ROLE
      if (result.isOk() && result.getRowCount() > 0) {
        role = String(result.getRows().get(0).get('role_name'))
      }
      skycorePermsCacheRole(uuid, role)
      if (onDone) onDone(role)
    })
    .exceptionally(function (err) {
      console.error('[SkyCore/Perms] load player role: ' + err)
      if (onDone) onDone(SKYCORE_PERMS_DEFAULT_ROLE)
      return null
    })
}

function skycorePermsReloadOnline(onDone) {
  skycorePermsLoadDbRoleNames(function () {
    var pending = 0
    var done = false

    function finish() {
      if (done) return
      done = true
      if (onDone) onDone(true)
    }

    SkyCore.forEachOnline(function (player) {
      pending++
      var uuid = skycorePermsPlayerUuid(player)
      skycorePermsLoadPlayerRoleFromDb(uuid, function () {
        pending--
        if (pending <= 0) finish()
      })
    })

    if (pending === 0) finish()
  })
}

function skycorePermsSetPlayerRole(uuid, role, onDone) {
  var roleName = String(role)
  if (!skycorePermsRoleExists(roleName)) {
    if (onDone) {
      onDone(
        false,
        'Роль "' +
          roleName +
          '" не в конфиге. Доступные: ' +
          skycorePermsGetRoleList().join(', ')
      )
    }
    return
  }
  if (!SkyCore.isDbReady()) {
    if (onDone) onDone(false, 'База данных недоступна')
    return
  }

  SkyCore.db.executeAsync(
    'UPDATE users SET role_id = (SELECT id FROM roles WHERE name = ? LIMIT 1) WHERE uuid = ?::uuid',
    [roleName, String(uuid)]
  )
    .thenAccept(function (result) {
      if (!result.isOk() || result.getUpdateCount() === 0) {
        var err = result.isOk() ? 'Пользователь не найден в users' : result.getError()
        if (onDone) onDone(false, err)
        return
      }
      skycorePermsCacheRole(uuid, roleName)
      SkyCore.db.queryAsync('SELECT full_name FROM roles WHERE name = ? LIMIT 1', [roleName])
        .thenAccept(function (r2) {
          if (r2.isOk() && r2.getRowCount() > 0) {
            SkyCore.cacheRole(uuid, roleName, String(r2.getRows().get(0).get('full_name')))
          }
          if (onDone) onDone(true, null)
        })
        .exceptionally(function () {
          if (onDone) onDone(true, null)
          return null
        })
    })
    .exceptionally(function (err) {
      if (onDone) onDone(false, String(err))
      return null
    })
}

function skycorePermsFindOnlineUuid(name) {
  var search = String(name).toLowerCase()
  var found = null
  SkyCore.forEachOnline(function (p) {
    if (found) return
    try {
      if (SkyCore.playerName(p).toLowerCase() === search) {
        found = skycorePermsPlayerUuid(p)
      }
    } catch (e) {}
  })
  return found
}

function skycorePermsFindUuidByName(ctx, targetName, onDone) {
  var online = skycorePermsFindOnlineUuid(targetName)
  if (online) {
    if (onDone) onDone(online)
    return
  }
  try {
    if (ctx.source && ctx.source.server) {
      var list = ctx.source.server.getPlayerList()
      if (list) {
        var target = list.getPlayerByName(targetName)
        if (target) {
          if (onDone) onDone(String(target.getUUID().toString()))
          return
        }
      }
    }
  } catch (e) {}

  if (!SkyCore.isDbReady()) {
    if (onDone) onDone(null)
    return
  }

  SkyCore.db.queryAsync('SELECT uuid FROM users WHERE LOWER(nickname) = LOWER(?) LIMIT 1', [targetName])
    .thenAccept(function (result) {
      if (result.isOk() && result.getRowCount() > 0) {
        if (onDone) onDone(String(result.getRows().get(0).get('uuid')))
      } else if (onDone) {
        onDone(null)
      }
    })
    .exceptionally(function () {
      if (onDone) onDone(null)
      return null
    })
}

SkyCore.perms = {
  defaultRole: SKYCORE_PERMS_DEFAULT_ROLE,

  cacheRole: skycorePermsCacheRole,
  clearPlayer: skycorePermsClearPlayer,
  loadDbRoleNames: skycorePermsLoadDbRoleNames,
  ensureDbRoleNames: skycorePermsEnsureDbRoleNames,
  loadPlayerRoleFromDb: skycorePermsLoadPlayerRoleFromDb,

  reload: function (onDone) {
    skycorePermsReloadOnline(onDone)
  },

  getPlayerUUID: skycorePermsPlayerUuid,
  getPlayerRole: skycorePermsGetPlayerRole,
  setPlayerRole: skycorePermsSetPlayerRole,
  hasPermission: skycorePermsHasPermission,
  require: skycorePermsRequire,

  getRoles: skycorePermsGetRoleList,
  getRoleData: function (role) {
    return skycorePermsRolesData[role] || null
  },
  roleExists: skycorePermsRoleExists,
  findUuidByName: skycorePermsFindUuidByName
}

function skycorePermsTryLoadDbRoles() {
  if (!SkyCore.isDbReady()) return
  skycorePermsLoadDbRoleNames(function (ok) {
    if (ok && skycorePermsDbRoleNames.length > 0) {
      console.info('[SkyCore/Perms] Роли из БД: ' + skycorePermsDbRoleNames.join(', '))
    }
  })
}

ServerEvents.loaded(function (event) {
  skycorePermsTryLoadDbRoles()
  event.server.scheduleInTicks(40, function () {
    skycorePermsTryLoadDbRoles()
  })
  event.server.scheduleInTicks(200, function () {
    skycorePermsTryLoadDbRoles()
  })
})

console.info('[SkyCore/Perms] Права: конфиг + роли игроков из PostgreSQL')
