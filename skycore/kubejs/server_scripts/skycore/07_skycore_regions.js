// SkyCore — приватные регионы (PostgreSQL + кэш для защиты блоков)

var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

var SKYCORE_RG_WOODEN_AXE = 'minecraft:wooden_axe'
var SKYCORE_RG_POS1 = 'skycore_rg_pos1'
var SKYCORE_RG_POS2 = 'skycore_rg_pos2'
var SKYCORE_RG_DEBOUNCE_MS = 450
var SKYCORE_RG_PREVIEW_TICKS = 8
var SKYCORE_RG_PREVIEW_DUST = 'minecraft:dust 0.2 0.6 1 1'

var skycoreRgLastClick = { pos1: {}, pos2: {} }
var skycoreRgPreview = {}

var skycoreRgCache = []
var skycoreRgCacheReady = false

function skycoreRgRequireDb(player) {
  if (!SkyCore.isDbReady()) {
    SkyCore.msg.regionsErr(player, 'База недоступна. postgres.json и /networkjs postgres reload')
    return false
  }
  return true
}

function skycoreRgRequirePerm(player, perm) {
  if (!SkyCore.perms) return true
  return SkyCore.perms.require(player, perm)
}

function skycoreRgWithServer(player, task) {
  var server = null
  try {
    server = player.server
  } catch (e) {}
  if (server) SkyCore.runOnServer(server, task)
  else task()
}

function skycoreRgToNum(val) {
  if (val == null) return NaN
  if (typeof val === 'number' && !isNaN(val)) return val
  try {
    if (typeof val.doubleValue === 'function') return val.doubleValue()
    if (typeof val.intValue === 'function') return val.intValue()
  } catch (e) {}
  try {
    var n = parseInt(String(val), 10)
    if (!isNaN(n)) return n
  } catch (e2) {}
  return NaN
}

function skycoreRgBlockPos(block) {
  var x = NaN
  var y = NaN
  var z = NaN
  try {
    if (block.blockX != null) {
      x = skycoreRgToNum(block.blockX)
      y = skycoreRgToNum(block.blockY)
      z = skycoreRgToNum(block.blockZ)
    }
    if (isNaN(x) && block.x != null) {
      x = skycoreRgToNum(block.x)
      y = skycoreRgToNum(block.y)
      z = skycoreRgToNum(block.z)
    }
    if (isNaN(x) && block.getBlockPos) {
      var pos = block.getBlockPos()
      if (pos) {
        x = skycoreRgToNum(pos.getX())
        y = skycoreRgToNum(pos.getY())
        z = skycoreRgToNum(pos.getZ())
      }
    }
  } catch (e) {}
  return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }
}

function skycoreRgNormalizeDim(dim) {
  var s = String(dim == null ? '' : dim).trim()
  if (!s || s === '[object Object]') return 'minecraft:overworld'

  var keyMatch = s.match(/ResourceKey\[[^\]]*?\s([a-z0-9_.-]+:[a-z0-9_./-]+)\s*\]/i)
  if (keyMatch) return keyMatch[1]

  var idMatch = s.match(/([a-z0-9_.-]+:[a-z0-9_./-]+)/i)
  if (idMatch) return idMatch[1]

  if (s.indexOf('the_nether') >= 0 || s === 'nether') return 'minecraft:the_nether'
  if (s.indexOf('the_end') >= 0 || s === 'end') return 'minecraft:the_end'
  if (s.indexOf('overworld') >= 0) return 'minecraft:overworld'

  if (s.indexOf(':') < 0) return 'minecraft:' + s
  return s
}

function skycoreRgDimension(player) {
  try {
    var loc = player.level.dimension.location()
    if (loc != null) {
      if (typeof loc.getNamespace === 'function' && typeof loc.getPath === 'function') {
        return skycoreRgNormalizeDim(loc.getNamespace() + ':' + loc.getPath())
      }
      return skycoreRgNormalizeDim(String(loc))
    }
  } catch (e1) {}
  try {
    return skycoreRgNormalizeDim(String(player.level.dimension))
  } catch (e2) {}
  return 'minecraft:overworld'
}

function skycoreRgSameDimension(dimA, dimB) {
  return skycoreRgNormalizeDim(dimA) === skycoreRgNormalizeDim(dimB)
}

function skycoreRgReadPos(player, key) {
  if (!player.persistentData.contains(key)) return null
  try {
    var pos = player.persistentData.get(key)
    if (!pos) return null
    return {
      x: Math.floor(skycoreRgToNum(pos.x)),
      y: Math.floor(skycoreRgToNum(pos.y)),
      z: Math.floor(skycoreRgToNum(pos.z)),
      dim: skycoreRgNormalizeDim(pos.dim)
    }
  } catch (e) {
    return null
  }
}

function skycoreRgGetServer(ctxOrPlayer) {
  try {
    if (ctxOrPlayer && ctxOrPlayer.source && ctxOrPlayer.source.server) return ctxOrPlayer.source.server
    if (ctxOrPlayer && ctxOrPlayer.server) return ctxOrPlayer.server
    if (typeof Utils !== 'undefined' && Utils.server) return Utils.server
  } catch (e) {}
  return null
}

function skycoreRgNormName(s) {
  return String(s)
    .toLowerCase()
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .trim()
}

function skycoreRgPlainRow(row) {
  var members = []
  try {
    var m = row.get('members')
    if (m != null) {
      var s = String(m)
      if (s && s !== '{}' && s !== 'null') {
        if (s.charAt(0) === '{') {
          s = s.substring(1, s.length - 1)
          if (s) members = s.split(',')
        } else {
          members = s.split(',')
        }
      }
    }
  } catch (e) {}
  return {
    id: Number(row.get('id')),
    name: String(row.get('name')),
    world: String(row.get('world')),
    x1: skycoreRgToNum(row.get('x1')),
    y1: skycoreRgToNum(row.get('y1')),
    z1: skycoreRgToNum(row.get('z1')),
    x2: skycoreRgToNum(row.get('x2')),
    y2: skycoreRgToNum(row.get('y2')),
    z2: skycoreRgToNum(row.get('z2')),
    owner_uuid: String(row.get('owner_uuid')),
    owner_name: String(row.get('owner_name')),
    members: members
  }
}

function skycoreRgInBox(reg, x, y, z, world) {
  if (!skycoreRgSameDimension(reg.world, world)) return false
  var x1 = Math.min(reg.x1, reg.x2)
  var x2 = Math.max(reg.x1, reg.x2)
  var y1 = Math.min(reg.y1, reg.y2)
  var y2 = Math.max(reg.y1, reg.y2)
  var z1 = Math.min(reg.z1, reg.z2)
  var z2 = Math.max(reg.z1, reg.z2)
  return x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2
}

function skycoreRgBoxesOverlap(ax1, ay1, az1, ax2, ay2, az2, bx1, by1, bz1, bx2, by2, bz2) {
  if (ax1 > bx2 || ax2 < bx1) return false
  if (ay1 > by2 || ay2 < by1) return false
  if (az1 > bz2 || az2 < bz1) return false
  return true
}

function skycoreRgFindOverlap(world, x1, y1, z1, x2, y2, z2, skipName) {
  var ax1 = Math.min(x1, x2)
  var ax2 = Math.max(x1, x2)
  var ay1 = Math.min(y1, y2)
  var ay2 = Math.max(y1, y2)
  var az1 = Math.min(z1, z2)
  var az2 = Math.max(z1, z2)
  for (var i = 0; i < skycoreRgCache.length; i++) {
    var r = skycoreRgCache[i]
    if (skipName && r.name === skipName) continue
    if (!skycoreRgSameDimension(r.world, world)) continue
    var rx1 = Math.min(r.x1, r.x2)
    var rx2 = Math.max(r.x1, r.x2)
    var ry1 = Math.min(r.y1, r.y2)
    var ry2 = Math.max(r.y1, r.y2)
    var rz1 = Math.min(r.z1, r.z2)
    var rz2 = Math.max(r.z1, r.z2)
    if (skycoreRgBoxesOverlap(ax1, ay1, az1, ax2, ay2, az2, rx1, ry1, rz1, rx2, ry2, rz2)) {
      return r.name
    }
  }
  return null
}

function skycoreRgGetAt(world, x, y, z) {
  for (var i = 0; i < skycoreRgCache.length; i++) {
    if (skycoreRgInBox(skycoreRgCache[i], x, y, z, world)) return skycoreRgCache[i]
  }
  return null
}

function skycoreRgHasMemberName(reg, nick) {
  var name = skycoreRgNormName(nick)
  if (!name) return false
  if (skycoreRgNormName(reg.owner_name) === name) return true
  var list = reg.members || []
  for (var i = 0; i < list.length; i++) {
    if (skycoreRgNormName(list[i]) === name) return true
  }
  return false
}

function skycoreRgIsMember(reg, player) {
  var name = skycoreRgNormName(SkyCore.playerName(player))
  if (skycoreRgNormName(reg.owner_name) === name) return true
  if (String(reg.owner_uuid) === String(player.uuid)) return true
  return skycoreRgHasMemberName(reg, name)
}

function skycoreRgCanManage(reg, player) {
  if (skycoreRgIsMember(reg, player)) return true
  if (SkyCore.perms && SkyCore.perms.hasPermission(player, 'regions.admin')) return true
  return false
}

function skycoreRgCanBuild(player, world, x, y, z) {
  var reg = skycoreRgGetAt(world, x, y, z)
  if (!reg) return true
  return skycoreRgCanManage(reg, player)
}

function skycoreRgPlainRegionRow(row) {
  return {
    id: Number(row.get('id')),
    name: String(row.get('name')),
    world: String(row.get('world')),
    x1: skycoreRgToNum(row.get('x1')),
    y1: skycoreRgToNum(row.get('y1')),
    z1: skycoreRgToNum(row.get('z1')),
    x2: skycoreRgToNum(row.get('x2')),
    y2: skycoreRgToNum(row.get('y2')),
    z2: skycoreRgToNum(row.get('z2')),
    owner_uuid: String(row.get('owner_uuid')),
    owner_name: String(row.get('owner_name')),
    members: []
  }
}

function skycoreRgAttachMembers(regions, memberResult) {
  if (!memberResult.isOk()) return
  var byId = {}
  var i
  for (i = 0; i < regions.length; i++) {
    byId[regions[i].id] = regions[i]
  }
  var rows = memberResult.getRows()
  for (i = 0; i < rows.size(); i++) {
    var row = rows.get(i)
    var rid = Number(row.get('region_id'))
    if (byId[rid]) {
      byId[rid].members.push(String(row.get('member_name')))
    }
  }
}

function skycoreRgFinishCacheLoad(list, onDone, ok) {
  skycoreRgCache = list
  skycoreRgCacheReady = true
  console.info('[SkyCore/Regions] Кэш: ' + list.length + ' регионов')
  if (onDone) onDone(ok !== false)
}

function skycoreRgRefreshCache(onDone) {
  if (!SkyCore.isDbReady()) {
    skycoreRgCache = []
    skycoreRgCacheReady = false
    if (onDone) onDone(false)
    return
  }

  SkyCore.db.queryAsync(
    'SELECT id, name, world, x1, y1, z1, x2, y2, z2, owner_uuid, owner_name FROM regions ORDER BY name',
    []
  )
    .thenAccept(function (result) {
      if (!result.isOk()) {
        console.error('[SkyCore/Regions] cache regions: ' + result.getError())
        skycoreRgFinishCacheLoad([], onDone, false)
        return
      }

      var list = []
      var rows = result.getRows()
      for (var i = 0; i < rows.size(); i++) {
        list.push(skycoreRgPlainRegionRow(rows.get(i)))
      }

      SkyCore.db.queryAsync(
        'SELECT region_id, member_name FROM region_members ORDER BY region_id',
        []
      )
        .thenAccept(function (memberResult) {
          if (!memberResult.isOk()) {
            console.warn('[SkyCore/Regions] cache members: ' + memberResult.getError())
          } else {
            skycoreRgAttachMembers(list, memberResult)
          }
          skycoreRgFinishCacheLoad(list, onDone, true)
        })
        .exceptionally(function (err) {
          console.warn('[SkyCore/Regions] cache members: ' + err)
          skycoreRgFinishCacheLoad(list, onDone, true)
          return null
        })
    })
    .exceptionally(function (err) {
      console.error('[SkyCore/Regions] cache regions: ' + err)
      skycoreRgCache = []
      skycoreRgCacheReady = false
      if (onDone) onDone(false)
      return null
    })
}

function skycoreRgEnsureCache(onDone) {
  if (skycoreRgCacheReady) {
    if (onDone) onDone(true)
    return
  }
  if (!SkyCore.isDbReady()) {
    if (onDone) onDone(false)
    return
  }
  skycoreRgRefreshCache(onDone)
}

function skycoreRgTryLoadCache() {
  if (!SkyCore.isDbReady()) return
  skycoreRgRefreshCache(function (ok) {
    if (!ok) {
      console.warn('[SkyCore/Regions] Повторная загрузка кэша не удалась')
    }
  })
}

function skycoreRgCountOwned(uuid, onDone) {
  var n = 0
  for (var i = 0; i < skycoreRgCache.length; i++) {
    if (String(skycoreRgCache[i].owner_uuid) === String(uuid)) n++
  }
  onDone(n)
}

function skycoreRgGetItemId(item) {
  if (!item) return ''
  try {
    if (item.isEmpty && item.isEmpty()) return ''
    if (item.getId) return String(item.getId())
    if (item.id) return String(item.id)
  } catch (e) {}
  return ''
}

function skycoreRgDebounce(player, which) {
  var pid = SkyCore.playerName(player)
  if (!pid) return true
  var now = Date.now()
  var bucket = skycoreRgLastClick[which]
  if (!bucket) bucket = skycoreRgLastClick[which] = {}
  var last = bucket[pid]
  if (last != null && now - last < SKYCORE_RG_DEBOUNCE_MS) return false
  bucket[pid] = now
  return true
}

function skycoreRgEdgePoints(x1, y1, z1, x2, y2, z2) {
  var xMin = Math.min(x1, x2)
  var xMax = Math.max(x1, x2)
  var yMin = Math.min(y1, y2) + 1
  var yMax = Math.max(y1, y2) + 1
  var zMin = Math.min(z1, z2)
  var zMax = Math.max(z1, z2)
  var out = []
  var maxPts = 200

  function line(ax, ay, az, bx, by, bz) {
    var dx = bx - ax
    var dy = by - ay
    var dz = bz - az
    var n = Math.max(1, Math.max(Math.abs(dx), Math.max(Math.abs(dy), Math.abs(dz))))
    for (var i = 0; i <= n && out.length < maxPts; i++) {
      var t = n > 0 ? i / n : 0
      out.push({
        x: Math.round(ax + dx * t),
        y: Math.round(ay + dy * t),
        z: Math.round(az + dz * t)
      })
    }
  }

  line(xMin, yMin, zMin, xMax, yMin, zMin)
  line(xMax, yMin, zMin, xMax, yMin, zMax)
  line(xMax, yMin, zMax, xMin, yMin, zMax)
  line(xMin, yMin, zMax, xMin, yMin, zMin)
  line(xMin, yMax, zMin, xMax, yMax, zMin)
  line(xMax, yMax, zMin, xMax, yMax, zMax)
  line(xMax, yMax, zMax, xMin, yMax, zMax)
  line(xMin, yMax, zMax, xMin, yMax, zMin)
  return out
}

function skycoreRgRunCmd(server, cmd) {
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

function skycoreRgShowPreview(player, x1, y1, z1, x2, y2, z2, dim, server) {
  if (!server) server = skycoreRgGetServer(player)
  if (!server) return false

  var pname = SkyCore.playerName(player)
  var dimStr = skycoreRgNormalizeDim(dim)
  var points = skycoreRgEdgePoints(
    skycoreRgToNum(x1),
    skycoreRgToNum(y1),
    skycoreRgToNum(z1),
    skycoreRgToNum(x2),
    skycoreRgToNum(y2),
    skycoreRgToNum(z2)
  )

  var particleOk = 0

  try {
    if (typeof Particle !== 'undefined' && player.level) {
      for (var i = 0; i < points.length; i++) {
        var pt = points[i]
        var spawned = false
        try {
          Particle.of('minecraft:dust 0.2 0.6 1 1').spawn(player.level, pt.x + 0.5, pt.y + 0.5, pt.z + 0.5, 0, 0, 0, 1)
          spawned = true
        } catch (e1) {}
        if (!spawned) {
          try {
            Particle.of('minecraft:happy_villager').spawn(player.level, pt.x + 0.5, pt.y + 0.5, pt.z + 0.5, 0, 0, 0, 1)
            spawned = true
          } catch (e2) {}
        }
        if (spawned) particleOk++
      }
      if (particleOk > points.length / 3) return true
    }
  } catch (eApi) {}

  for (var j = 0; j < points.length; j++) {
    var p = points[j]
    var px = p.x + 0.5
    var py = p.y + 0.5
    var pz = p.z + 0.5
    var cmds = [
      'execute in ' + dimStr + ' run particle minecraft:happy_villager ' + px + ' ' + py + ' ' + pz + ' 0 0 0 0 2 force',
      'execute in ' + dimStr + ' run particle ' + SKYCORE_RG_PREVIEW_DUST + ' ' + px + ' ' + py + ' ' + pz + ' 0 0 0 0 2 force',
      'execute as ' + pname + ' in ' + dimStr + ' positioned ' + px + ' ' + py + ' ' + pz + ' run particle minecraft:happy_villager ~ ~ ~ 0 0 0 0 2 normal',
      'execute in ' + dimStr + ' positioned ' + px + ' ' + py + ' ' + pz + ' run particle minecraft:happy_villager ~ ~ ~ 0 0 0 0 2 force'
    ]
    for (var c = 0; c < cmds.length; c++) {
      if (skycoreRgRunCmd(server, cmds[c])) {
        particleOk++
        break
      }
    }
  }

  return particleOk > 0
}

function skycoreRgSetPos(player, which, x, y, z, dim) {
  var key = which === 1 ? SKYCORE_RG_POS1 : SKYCORE_RG_POS2
  player.persistentData.put(key, {
    x: Math.floor(x),
    y: Math.floor(y),
    z: Math.floor(z),
    dim: skycoreRgNormalizeDim(dim)
  })
  delete skycoreRgPreview[SkyCore.playerName(player)]
}

function skycoreRgTryShowSelectionPreview(player, server) {
  var pos1 = skycoreRgReadPos(player, SKYCORE_RG_POS1)
  var pos2 = skycoreRgReadPos(player, SKYCORE_RG_POS2)
  if (!pos1 || !pos2) return false

  if (!skycoreRgSameDimension(pos1.dim, pos2.dim)) {
    SkyCore.msg.regionsWarn(
      player,
      'Точки в разных мирах (' + pos1.dim + ' и ' + pos2.dim + '). Поставьте /pos1 заново здесь.'
    )
    return false
  }

  var dim = skycoreRgNormalizeDim(pos2.dim)
  var ok = skycoreRgShowPreview(player, pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z, dim, server)
  skycoreRgPreview[SkyCore.playerName(player)] = {
    pos1: pos1,
    pos2: pos2,
    dim: dim
  }
  if (!ok) {
    SkyCore.msg.regionsWarn(player, 'Контур не отрисовался. Попробуйте /rg preview')
  }
  return ok
}

function skycoreRgSendGuide(player) {
  SkyCore.msg.regionsOk(player, 'Приватные регионы:')
  SkyCore.tellPlayer(player, '\u00A77/pos1 \u00A78и \u00A77/pos2 \u00A78— точки (или \u00A77/wand\u00A78: ЛКМ/ПКМ)')
  SkyCore.tellPlayer(player, '\u00A77/rg create <имя> \u00A78— создать')
  SkyCore.tellPlayer(player, '\u00A77/rg info \u00A78| \u00A77/rg info <имя> \u00A78| \u00A77/rg list')
  SkyCore.tellPlayer(player, '\u00A77/rg add <регион> <ник> \u00A78— только онлайн-игрок')
  SkyCore.tellPlayer(player, '\u00A77/rg remove <регион> <ник> \u00A78| \u00A77/rg delete <имя>')
  SkyCore.tellPlayer(player, '\u00A77/rg preview \u00A78— контур выбранной области')
}

SkyCore.regions = {
  cacheReady: function () {
    return skycoreRgCacheReady
  },
  refreshCache: skycoreRgRefreshCache,
  ensureCache: skycoreRgEnsureCache,
  getAt: skycoreRgGetAt,
  canBuild: skycoreRgCanBuild,
  canManage: skycoreRgCanManage,

  handleBlockBreak: function (event) {
    if (!skycoreRgCacheReady) return false
    var player = event.player
    if (!player) return false
    var pos = skycoreRgBlockPos(event.block)
    if (isNaN(pos.x)) return false
    var dim = skycoreRgDimension(player)
    if (skycoreRgCanBuild(player, dim, pos.x, pos.y, pos.z)) return false
    var reg = skycoreRgGetAt(dim, pos.x, pos.y, pos.z)
    if (reg) {
      SkyCore.msg.regionsErr(player, 'Блок в регионе \u00A7e' + reg.name)
    }
    event.cancel()
    return true
  },

  handleBlockPlace: function (event) {
    if (!skycoreRgCacheReady) return false
    var player = event.player
    if (!player) return false
    var pos = skycoreRgBlockPos(event.block)
    if (isNaN(pos.x)) return false
    var dim = skycoreRgDimension(player)
    if (skycoreRgCanBuild(player, dim, pos.x, pos.y, pos.z)) return false
    var reg = skycoreRgGetAt(dim, pos.x, pos.y, pos.z)
    if (reg) {
      SkyCore.msg.regionsErr(player, 'Здесь регион \u00A7e' + reg.name)
    }
    event.cancel()
    return true
  }
}

// --- Топор: выбор точек ---
BlockEvents.leftClicked(function (event) {
  var player = event.player
  if (!player) return
  var item = player.getMainHandItem ? player.getMainHandItem() : null
  if (skycoreRgGetItemId(item) !== SKYCORE_RG_WOODEN_AXE) return
  if (SkyCore.perms && !SkyCore.perms.hasPermission(player, 'regions.create')) {
    SkyCore.msg.regionsWarn(player, 'Нет прав на выбор точек')
    return
  }
  if (!skycoreRgDebounce(player, 'pos1')) return
  var pos = skycoreRgBlockPos(event.block)
  if (isNaN(pos.x)) return
  var dim = skycoreRgDimension(player)
  skycoreRgSetPos(player, 1, pos.x, pos.y, pos.z, dim)
  SkyCore.msg.regionsOk(player, 'Точка 1: \u00A77' + pos.x + ', ' + pos.y + ', ' + pos.z)
  event.cancel()
})

BlockEvents.rightClicked(function (event) {
  var player = event.player
  if (!player) return
  var item = player.getMainHandItem ? player.getMainHandItem() : null
  if (skycoreRgGetItemId(item) !== SKYCORE_RG_WOODEN_AXE) return
  if (SkyCore.perms && !SkyCore.perms.hasPermission(player, 'regions.create')) {
    SkyCore.msg.regionsWarn(player, 'Нет прав на выбор точек')
    return
  }
  if (!skycoreRgDebounce(player, 'pos2')) return
  var pos = skycoreRgBlockPos(event.block)
  if (isNaN(pos.x)) return
  var dim = skycoreRgDimension(player)
  skycoreRgSetPos(player, 2, pos.x, pos.y, pos.z, dim)
  SkyCore.msg.regionsOk(player, 'Точка 2: \u00A77' + pos.x + ', ' + pos.y + ', ' + pos.z)
  skycoreRgTryShowSelectionPreview(player, skycoreRgGetServer(player))
  event.cancel()
})

// --- Команды ---
ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  function checkPerm(player, perm) {
    if (!SkyCore.perms) return true
    return SkyCore.perms.hasPermission(player, perm)
  }

  event.register(
    Commands.literal('rg')
      .executes(function (ctx) {
        var p = ctx.source.player
        if (!p) return 0
        skycoreRgSendGuide(p)
        return 1
      })
      .then(
        Commands.literal('create')
          .then(
            Commands.argument('name', StringArgumentType.word()).executes(function (ctx) {
              var p = ctx.source.player
              if (!p) return 0
              if (!skycoreRgRequirePerm(p, 'regions.create')) return 0
              if (!skycoreRgRequireDb(p)) return 0

              var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
              if (!name) {
                SkyCore.msg.regionsErr(p, 'Имя региона не может быть пустым')
                return 0
              }
              if (!p.persistentData.contains(SKYCORE_RG_POS1) || !p.persistentData.contains(SKYCORE_RG_POS2)) {
                SkyCore.msg.regionsErr(p, 'Сначала /pos1 и /pos2 (или топор /wand)')
                return 0
              }

              var pos1 = skycoreRgReadPos(p, SKYCORE_RG_POS1)
              var pos2 = skycoreRgReadPos(p, SKYCORE_RG_POS2)
              var dim = skycoreRgDimension(p)
              if (!pos1 || !pos2) {
                SkyCore.msg.regionsErr(p, 'Сначала /pos1 и /pos2')
                return 0
              }
              if (!skycoreRgSameDimension(pos1.dim, pos2.dim) || !skycoreRgSameDimension(pos1.dim, dim)) {
                SkyCore.msg.regionsErr(
                  p,
                  'Обе точки в одном мире. Сейчас: ' + pos1.dim + ' и ' + pos2.dim + '. Поставьте /pos1 заново.'
                )
                return 0
              }

              var overlap = skycoreRgFindOverlap(
                dim,
                pos1.x,
                pos1.y,
                pos1.z,
                pos2.x,
                pos2.y,
                pos2.z,
                null
              )
              if (overlap) {
                SkyCore.msg.regionsErr(p, 'Пересечение с регионом \u00A7e' + overlap)
                return 0
              }

              var uuid = String(p.uuid)
              var ownerName = SkyCore.playerName(p)

              skycoreRgCountOwned(uuid, function (owned) {
                if (owned >= SkyCore.regions.maxPerPlayer) {
                  SkyCore.msg.regionsWarn(
                    p,
                    'Лимит регионов: ' + SkyCore.regions.maxPerPlayer
                  )
                  return
                }

                for (var i = 0; i < skycoreRgCache.length; i++) {
                  if (skycoreRgCache[i].name === name) {
                    SkyCore.msg.regionsErr(p, 'Регион \u00A7e' + name + '\u00A7c уже есть')
                    return
                  }
                }

                SkyCore.db.executeAsync(
                  'INSERT INTO regions (name, world, x1, y1, z1, x2, y2, z2, owner_uuid, owner_name) ' +
                    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::uuid, ?)',
                  [
                    name,
                    dim,
                    pos1.x,
                    pos1.y,
                    pos1.z,
                    pos2.x,
                    pos2.y,
                    pos2.z,
                    uuid,
                    ownerName
                  ]
                ).thenAccept(function (result) {
                  skycoreRgWithServer(p, function () {
                    if (!result.isOk()) {
                      SkyCore.msg.regionsErr(p, result.getError() || 'Ошибка создания')
                      return
                    }
                    delete skycoreRgPreview[SkyCore.playerName(p)]
                    skycoreRgRefreshCache(function () {
                      SkyCore.msg.regionsOk(p, 'Регион \u00A7e' + name + '\u00A7a создан')
                    })
                  })
                })
              })

              return 1
            })
          )
      )
      .then(
        Commands.literal('info')
          .executes(function (ctx) {
            var p = ctx.source.player
            if (!p) return 0
            if (!skycoreRgRequirePerm(p, 'regions.info')) return 0
            if (!skycoreRgRequireDb(p)) return 0

            skycoreRgEnsureCache(function (ok) {
              skycoreRgWithServer(p, function () {
                if (!ok) {
                  SkyCore.msg.regionsErr(p, 'Не удалось загрузить регионы из БД')
                  return
                }
                var dim = skycoreRgDimension(p)
                var reg = skycoreRgGetAt(dim, Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))
                if (!reg) {
                  SkyCore.msg.regionsWarn(p, 'Вы не в регионе')
                  return
                }
                SkyCore.msg.regionsOk(p, 'Регион: \u00A7f' + reg.name)
                SkyCore.tellPlayer(
                  p,
                  '\u00A77Владелец: \u00A7f' +
                    reg.owner_name +
                    ' \u00A77| Участники: \u00A7f' +
                    (reg.members.length ? reg.members.join(', ') : 'нет')
                )
              })
            })
            return 1
          })
          .then(
            Commands.argument('name', StringArgumentType.word()).executes(function (ctx) {
              var p = ctx.source.player
              if (!p) return 0
              if (!skycoreRgRequirePerm(p, 'regions.info')) return 0
              var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
              var reg = null
              for (var i = 0; i < skycoreRgCache.length; i++) {
                if (skycoreRgCache[i].name === name) {
                  reg = skycoreRgCache[i]
                  break
                }
              }
              if (!reg) {
                SkyCore.msg.regionsErr(p, 'Регион не найден')
                return 0
              }
              if (!skycoreRgCanManage(reg, p)) {
                SkyCore.msg.regionsErr(p, 'Нет доступа к этому региону')
                return 0
              }
              SkyCore.msg.regionsOk(p, '\u00A7e' + name + '\u00A7a | \u00A77' + reg.world)
              SkyCore.tellPlayer(
                p,
                '\u00A77' +
                  Math.min(reg.x1, reg.x2) +
                  ',' +
                  Math.min(reg.y1, reg.y2) +
                  ',' +
                  Math.min(reg.z1, reg.z2) +
                  ' \u00A78— \u00A77' +
                  Math.max(reg.x1, reg.x2) +
                  ',' +
                  Math.max(reg.y1, reg.y2) +
                  ',' +
                  Math.max(reg.z1, reg.z2)
              )
              return 1
            })
          )
      )
      .then(
        Commands.literal('list').executes(function (ctx) {
          var p = ctx.source.player
          if (!p) return 0
          if (!skycoreRgRequirePerm(p, 'regions.list')) return 0
          if (!skycoreRgRequireDb(p)) return 0

          skycoreRgEnsureCache(function (ok) {
            skycoreRgWithServer(p, function () {
              if (!ok) {
                SkyCore.msg.regionsErr(p, 'Не удалось загрузить регионы из БД')
                return
              }
              var list = []
              for (var i = 0; i < skycoreRgCache.length; i++) {
                if (skycoreRgCanManage(skycoreRgCache[i], p)) list.push(skycoreRgCache[i].name)
              }
              if (list.length === 0) {
                SkyCore.msg.regionsWarn(p, 'Нет ваших регионов')
                return
              }
              SkyCore.msg.regionsOk(p, 'Ваши регионы: \u00A77' + list.join(', '))
            })
          })
          return 1
        })
      )
      .then(
        Commands.literal('add')
          .then(
            Commands.argument('name', StringArgumentType.word())
              .then(
                Commands.argument('player', StringArgumentType.word())
                  .executes(function (ctx) {
                    var p = ctx.source.player
                    if (!p) return 0
                    if (!skycoreRgRequirePerm(p, 'regions.manage')) return 0
                    if (!skycoreRgRequireDb(p)) return 0
                    var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
                    var target = StringArgumentType.getString(ctx, 'player')
                    var reg = null
                    for (var i = 0; i < skycoreRgCache.length; i++) {
                      if (skycoreRgCache[i].name === name) {
                        reg = skycoreRgCache[i]
                        break
                      }
                    }
                    if (!reg) {
                      SkyCore.msg.regionsErr(p, 'Регион не найден')
                      return 0
                    }
                    if (!skycoreRgCanManage(reg, p)) {
                      SkyCore.msg.regionsErr(p, 'Нет прав управлять этим регионом')
                      return 0
                    }
                    var online = skycoreRgFindOnlinePlayer(ctx, target)
                    if (!online) {
                      SkyCore.msg.regionsErr(
                        p,
                        'Игрок "' + target + '" не на сервере. Добавлять можно только онлайн-игроков.'
                      )
                      return 0
                    }

                    if (skycoreRgHasMemberName(reg, online.name)) {
                      SkyCore.msg.regionsWarn(p, '\u00A7f' + online.name + '\u00A7e уже в регионе')
                      return 0
                    }

                    SkyCore.db.executeAsync(
                      'INSERT INTO region_members (region_id, member_name, member_uuid) VALUES (?, ?, ?::uuid)',
                      [reg.id, online.name, online.uuid]
                    ).thenAccept(function (result) {
                      skycoreRgWithServer(p, function () {
                        if (!result.isOk()) {
                          SkyCore.msg.regionsErr(p, result.getError())
                          return
                        }
                        skycoreRgRefreshCache(function () {
                          SkyCore.msg.regionsOk(
                            p,
                            '\u00A7f' + online.name + '\u00A7a добавлен в \u00A7e' + name
                          )
                        })
                      })
                    })
                    return 1
                  })
              )
          )
      )
      .then(
        Commands.literal('remove')
          .then(
            Commands.argument('name', StringArgumentType.word())
              .then(
                Commands.argument('player', StringArgumentType.word())
                  .executes(function (ctx) {
                    var p = ctx.source.player
                    if (!p) return 0
                    if (!skycoreRgRequirePerm(p, 'regions.manage')) return 0
                    if (!skycoreRgRequireDb(p)) return 0
                    var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
                    var target = StringArgumentType.getString(ctx, 'player')
                    var reg = null
                    for (var i = 0; i < skycoreRgCache.length; i++) {
                      if (skycoreRgCache[i].name === name) {
                        reg = skycoreRgCache[i]
                        break
                      }
                    }
                    if (!reg || !skycoreRgCanManage(reg, p)) {
                      SkyCore.msg.regionsErr(p, 'Нет доступа')
                      return 0
                    }
                    SkyCore.db.executeAsync(
                      'DELETE FROM region_members WHERE region_id = ? AND LOWER(member_name) = LOWER(?)',
                      [reg.id, target]
                    ).thenAccept(function (result) {
                      skycoreRgWithServer(p, function () {
                        if (!result.isOk() || result.getUpdateCount() === 0) {
                          SkyCore.msg.regionsWarn(p, 'Игрок не в регионе')
                          return
                        }
                        skycoreRgRefreshCache(function () {
                          SkyCore.msg.regionsOk(p, '\u00A7f' + target + '\u00A7a удалён из \u00A7e' + name)
                        })
                      })
                    })
                    return 1
                  })
              )
          )
      )
      .then(
        Commands.literal('delete')
          .then(
            Commands.argument('name', StringArgumentType.word()).executes(function (ctx) {
              var p = ctx.source.player
              if (!p) return 0
              if (!skycoreRgRequirePerm(p, 'regions.delete')) return 0
              if (!skycoreRgRequireDb(p)) return 0
              var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
              var reg = null
              for (var i = 0; i < skycoreRgCache.length; i++) {
                if (skycoreRgCache[i].name === name) {
                  reg = skycoreRgCache[i]
                  break
                }
              }
              if (!reg) {
                SkyCore.msg.regionsErr(p, 'Регион не найден')
                return 0
              }
              if (
                String(reg.owner_uuid) !== String(p.uuid) &&
                !checkPerm(p, 'regions.admin')
              ) {
                SkyCore.msg.regionsErr(p, 'Удалить может только владелец или админ')
                return 0
              }
              SkyCore.db.executeAsync('DELETE FROM regions WHERE id = ?', [reg.id]).thenAccept(
                function (result) {
                  skycoreRgWithServer(p, function () {
                    if (!result.isOk()) {
                      SkyCore.msg.regionsErr(p, result.getError())
                      return
                    }
                    skycoreRgRefreshCache(function () {
                      SkyCore.msg.regionsOk(p, 'Регион \u00A7e' + name + '\u00A7a удалён')
                    })
                  })
                }
              )
              return 1
            })
          )
      )
      .then(
        Commands.literal('preview')
          .executes(function (ctx) {
            var p = ctx.source.player
            if (!p) return 0
            if (!skycoreRgRequirePerm(p, 'regions.info')) return 0
            var pname = SkyCore.playerName(p)
            if (skycoreRgPreview[pname]) {
              delete skycoreRgPreview[pname]
              SkyCore.msg.regionsOk(p, 'Превью скрыто')
              return 1
            }
            if (skycoreRgTryShowSelectionPreview(p, skycoreRgGetServer(ctx))) {
              SkyCore.msg.regionsOk(p, 'Превью включено (/rg preview — выкл)')
            }
            return 1
          })
          .then(
            Commands.argument('name', StringArgumentType.word()).executes(function (ctx) {
              var p = ctx.source.player
              if (!p) return 0
              if (!skycoreRgRequirePerm(p, 'regions.info')) return 0
              var name = skycoreRgNormName(StringArgumentType.getString(ctx, 'name'))
              var reg = null
              for (var i = 0; i < skycoreRgCache.length; i++) {
                if (skycoreRgCache[i].name === name) {
                  reg = skycoreRgCache[i]
                  break
                }
              }
              if (!reg || !skycoreRgCanManage(reg, p)) {
                SkyCore.msg.regionsErr(p, 'Регион не найден или нет доступа')
                return 0
              }
              var server = skycoreRgGetServer(ctx)
              skycoreRgShowPreview(
                p,
                reg.x1,
                reg.y1,
                reg.z1,
                reg.x2,
                reg.y2,
                reg.z2,
                reg.world,
                server
              )
              SkyCore.msg.regionsOk(p, 'Превью региона \u00A7e' + name)
              return 1
            })
          )
      )
  )

  event.register(
    Commands.literal('pos1').executes(function (ctx) {
      var p = ctx.source.player
      if (!p) return 0
      if (!skycoreRgRequirePerm(p, 'regions.create')) return 0
      var dim = skycoreRgDimension(p)
      skycoreRgSetPos(p, 1, Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), dim)
      SkyCore.msg.regionsOk(
        p,
        'Точка 1: \u00A77' + Math.floor(p.x) + ', ' + Math.floor(p.y) + ', ' + Math.floor(p.z)
      )
      return 1
    })
  )

  event.register(
    Commands.literal('pos2').executes(function (ctx) {
      var p = ctx.source.player
      if (!p) return 0
      if (!skycoreRgRequirePerm(p, 'regions.create')) return 0
      var dim = skycoreRgDimension(p)
      var bx = Math.floor(p.x)
      var by = Math.floor(p.y)
      var bz = Math.floor(p.z)
      skycoreRgSetPos(p, 2, bx, by, bz, dim)
      SkyCore.msg.regionsOk(p, 'Точка 2: \u00A77' + bx + ', ' + by + ', ' + bz)
      skycoreRgTryShowSelectionPreview(p, skycoreRgGetServer(ctx))
      return 1
    })
  )

  event.register(
    Commands.literal('wand').executes(function (ctx) {
      var p = ctx.source.player
      if (!p) return 0
      if (!skycoreRgRequirePerm(p, 'regions.create')) return 0
      try {
        if (p.give) {
          p.give(SKYCORE_RG_WOODEN_AXE)
        } else {
          var server = ctx.source.server
          server.runCommand('give ' + SkyCore.playerName(p) + ' ' + SKYCORE_RG_WOODEN_AXE + ' 1')
        }
        SkyCore.msg.regionsOk(p, 'Топор выдан. ЛКМ — точка 1, ПКМ — точка 2')
        return 1
      } catch (e) {
        SkyCore.msg.regionsErr(p, String(e))
        return 0
      }
    })
  )
})

function skycoreRgFindOnlinePlayer(ctx, nick) {
  var search = skycoreRgNormName(nick)
  if (!search) return null

  var found = null
  SkyCore.forEachOnline(function (pl) {
    if (found) return
    if (skycoreRgNormName(SkyCore.playerName(pl)) === search) {
      found = {
        name: SkyCore.playerName(pl),
        uuid: String(pl.uuid)
      }
    }
  })
  if (found) return found

  try {
    if (ctx && ctx.source && ctx.source.server) {
      var list = ctx.source.server.getPlayerList()
      if (list && list.getPlayerByName) {
        var exact = list.getPlayerByName(nick)
        if (exact) {
          return {
            name: SkyCore.playerName(exact),
            uuid: String(exact.getUUID().toString())
          }
        }
      }
    }
  } catch (e0) {}

  return null
}

ServerEvents.loaded(function (event) {
  skycoreRgTryLoadCache()
  event.server.scheduleInTicks(40, skycoreRgTryLoadCache)
  event.server.scheduleInTicks(200, skycoreRgTryLoadCache)
})

PlayerEvents.loggedIn(function () {
  if (!skycoreRgCacheReady && SkyCore.isDbReady()) {
    skycoreRgTryLoadCache()
  }
})

ServerEvents.tick(function (event) {
  var server = event.server
  if (!server || !skycoreRgPreview) return
  var tick = 0
  try {
    tick = typeof server.getTickCount === 'function' ? server.getTickCount() : server.ticks
  } catch (e) {
    return
  }
  if (tick % SKYCORE_RG_PREVIEW_TICKS !== 0) return
  var list = server.getPlayerList ? server.getPlayerList() : null
  if (!list) return
  for (var pname in skycoreRgPreview) {
    if (!skycoreRgPreview.hasOwnProperty(pname)) continue
    var data = skycoreRgPreview[pname]
    if (!data || !data.pos1 || !data.pos2) continue
    try {
      var pl = list.getPlayerByName(pname)
      if (!pl) continue
      skycoreRgShowPreview(
        pl,
        data.pos1.x,
        data.pos1.y,
        data.pos1.z,
        data.pos2.x,
        data.pos2.y,
        data.pos2.z,
        data.dim || data.pos1.dim,
        server
      )
    } catch (e2) {}
  }
})

console.info('[SkyCore/Regions] Модуль загружен (PostgreSQL)')
