// SkyCore — защита блоков (break / place / interact)

if (!SkyCore.perms) {
  console.warn('[SkyCore/Perms] SkyCore.perms не загружен — защита блоков отключена')
} else {
  BlockEvents.broken(function (event) {
    var player = event.player
    if (!player) return
    if (SkyCore.regions && SkyCore.regions.handleBlockBreak(event)) return
    if (!SkyCore.perms.hasPermission(player, 'blocks.break')) {
      SkyCore.msg.permsWarn(player, 'У вас нет прав на ломание блоков')
      event.cancel()
    }
  })

  BlockEvents.placed(function (event) {
    var player = event.player
    if (!player) return
    if (SkyCore.regions && SkyCore.regions.handleBlockPlace(event)) return
    if (!SkyCore.perms.hasPermission(player, 'blocks.place')) {
      SkyCore.msg.permsWarn(player, 'У вас нет прав на установку блоков')
      event.cancel()
    }
  })

  BlockEvents.rightClicked(function (event) {
    var player = event.player
    if (!player) return
    if (!SkyCore.perms.hasPermission(player, 'blocks.interact')) {
      SkyCore.msg.permsWarn(player, 'У вас нет прав на взаимодействие с блоками')
      event.cancel()
    }
  })

  console.info('[SkyCore/Perms] Защита блоков включена')
}
