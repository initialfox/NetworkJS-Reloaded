// SkyCore — [G]/[L] + роль + ник
// Локальный: обычное сообщение | Глобальный: ! в начале

function skycoreRoleKey(player) {
  var cached = SkyCore.getCachedRole(String(player.uuid))
  if (cached && cached.name) return String(cached.name).toLowerCase()
  return 'user'
}

function skycoreChatTag(roleKey) {
  if (roleKey === 'admin') return '\u00A78[\u00A7c\u00A7l\u0410\u0434\u043c\u0438\u043d\u00A78] '
  if (roleKey === 'moderator' || roleKey === 'mod') return '\u00A78[\u00A79\u00A7lMOD\u00A78] '
  if (roleKey === 'vip') return '\u00A78[\u00A76\u00A7lVIP\u00A78] '
  return '\u00A78[\u00A77\u0418\u0433\u0440\u043e\u043a\u00A78] '
}

function skycoreChatName(player, roleKey) {
  var name = SkyCore.playerName(player)
  if (roleKey === 'admin') return '\u00A7c' + name + '\u00A7r'
  if (roleKey === 'moderator' || roleKey === 'mod') return '\u00A79' + name + '\u00A7r'
  if (roleKey === 'vip') return '\u00A76' + name + '\u00A7r'
  return '\u00A7f' + name + '\u00A7r'
}

function skycoreChannelTag(isGlobal) {
  if (isGlobal) return '\u00A78[\u00A7bG\u00A78] '
  return '\u00A78[\u00A7aL\u00A78] '
}

function skycoreFormatChatLine(player, text, isGlobal) {
  var roleKey = skycoreRoleKey(player)
  return (
    skycoreChannelTag(isGlobal) +
    skycoreChatTag(roleKey) +
    skycoreChatName(player, roleKey) +
    '\u00A78 \u00B7 \u00A7f' +
    text
  )
}

function skycoreParseChannel(rawText) {
  var prefix = SkyCore.chat.globalPrefix
  if (prefix && rawText.length > prefix.length && rawText.indexOf(prefix) === 0) {
    return { global: true, text: rawText.substring(prefix.length).trim() }
  }
  return { global: false, text: rawText }
}

PlayerEvents.chat(function (event) {
  var player = event.player
  if (!player) return

  var raw = SkyCore.getChatText(event)
  if (!raw || raw.length === 0) return
  if (raw.charAt(0) === '/') return

  var channel = skycoreParseChannel(raw)
  if (!channel.text || channel.text.length === 0) return

  var formatted = skycoreFormatChatLine(player, channel.text, channel.global)

  if (channel.global) {
    SkyCore.broadcastChat(formatted)
  } else {
    var sent = SkyCore.broadcastLocalChat(player, formatted, SkyCore.chat.localRange)
    if (sent <= 1) {
      SkyCore.tellPlayer(
        player,
        '\u00A77\u0420\u044f\u0434\u043e\u043c \u043d\u0435\u0442 \u0438\u0433\u0440\u043e\u043a\u043e\u0432 (' +
          SkyCore.chat.localRange +
          '\u043c). \u0413\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u044b\u0439: ' +
          SkyCore.chat.globalPrefix +
          ' \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435'
      )
    }
  }

  event.cancel()
})
