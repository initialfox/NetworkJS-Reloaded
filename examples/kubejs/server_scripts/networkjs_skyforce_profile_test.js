// NetworkJS + KubeJS — тест запроса SkyForce public profile
// Скопируй в: <сервер>/kubejs/server_scripts/
//
// Перед тестом:
//   1. Моды: KubeJS + NetworkJS (NeoForge 1.21.1)
//   2. Dedicated: реестр включается сам. Singleplayer: /networkjs enable
//   3. /kubejs reload server  (после enable)

const API_BASE = 'https://skyforce-api.speedly.space/api/auth/public-profile'

// UUID для теста при старте сервера (без дефисов или с — оба варианта ок)
// Пример: '550e8400-e29b-41d4-a716-446655440000'
const TEST_UUID_ON_LOAD = ''

function normalizeUuid(uuid) {
  return String(uuid).trim().toLowerCase()
}

function profileUrl(uuid) {
  return `${API_BASE}/${normalizeUuid(uuid)}`
}

/**
 * @param {string} uuid
 * @returns {FetchResponse|null}
 */
function fetchPublicProfile(uuid) {
  const url = profileUrl(uuid)
  console.info(`[SkyForce Test] GET ${url}`)

  try {
    const response = fetch(url)
    console.info(`[SkyForce Test] HTTP ${response.getStatus()} ${response.getStatusText()}`)

    if (!response.isOk()) {
      console.error(`[SkyForce Test] Error body: ${response.text()}`)
      return response
    }

    const text = response.text()
    console.info(`[SkyForce Test] OK, body length: ${text.length}`)

    try {
      const json = response.json()
      console.info(`[SkyForce Test] JSON: ${json}`)
    } catch (e) {
      console.info(`[SkyForce Test] Raw: ${text}`)
    }

    return response
  } catch (e) {
    console.error(`[SkyForce Test] fetch failed: ${e}`)
    return null
  }
}

/** fetchAsync через FetchBinding (стабильно в KubeJS/Rhino) */
function networkFetchAsync(url, options) {
  const opts = options ?? null
  return opts != null ? FetchBinding.fetchAsync(url, opts) : FetchBinding.fetchAsync(url)
}

function parseProfileBody(responseText) {
  var parsed = JSON.parse(responseText)
  if (!parsed.success || !parsed.data || !parsed.data.user) {
    return null
  }
  return parsed.data.user
}

function roleStyle(roleKey) {
  if (roleKey === 'admin') return '&c&l'
  if (roleKey === 'moderator' || roleKey === 'mod') return '&9&l'
  if (roleKey === 'vip') return '&6&l'
  return '&e'
}

/** Средний формат: читаемо, без гигантских полос и анимации */
function formatProfileChatLines(sfData) {
  var nick = sfData.username || 'Игрок'
  var roleKey = sfData.role || (sfData.roles && sfData.roles[0] && sfData.roles[0].key) || 'player'
  var roleName = (sfData.roles && sfData.roles[0] && sfData.roles[0].name) || sfData.role || 'Игрок'
  var playTime = sfData.play_time_formatted || String(sfData.play_time || '—')
  var roleColor = roleStyle(String(roleKey).toLowerCase())
  var tgLine = sfData.telegram_linked ? '&aпривязан' : '&7не привязан'

  if (sfData.is_banned) {
    return [
      '&8[&c&l SkyForce &8]',
      '&7Добро пожаловать, &f&l' + nick + '&7.',
      '&c&lАккаунт заблокирован &7— вход ограничен.'
    ]
  }

  return [
    '&8[&6&l SkyForce &8] &e✦',
    '&7Добро пожаловать, &f&l' + nick + '&7!',
    '&a&l✓ &r&7Профиль успешно загружен',
    '&8───────────────',
    '&7Роль: ' + roleColor + roleName,
    '&7Наиграно: &b' + playTime + ' &8| &7Статус: &aактивен',
    '&7Telegram: ' + tgLine,
    '&6Удачной игры!'
  ]
}

/** Все строки сразу, одним тиком (без анимации) */
function tellPlayerOnServer(server, playerName, lines) {
  server.scheduleInTicks(0, function () {
    var chatLines = Array.isArray(lines) ? lines : [lines]
    for (var i = 0; i < chatLines.length; i++) {
      Server.sendRawMessageToPlayer(playerName, chatLines[i])
    }
  })
}

/** Не блокирует тик сервера; ответ игроку — через scheduleInTicks */
function fetchPublicProfileAsync(uuid, playerName, server, onDone) {
  const url = profileUrl(uuid)
  console.info(`[SkyForce Test] GET (async) ${url}`)

  networkFetchAsync(url).thenAccept(function (response) {
    console.info(`[SkyForce Test] HTTP ${response.getStatus()} ${response.getStatusText()}`)

    if (!response.isOk()) {
      console.error(`[SkyForce Test] ${response.text()}`)
      if (playerName && server) {
        tellPlayerOnServer(server, playerName, '&cSkyForce &8| &7Ошибка API &8(HTTP ' + response.getStatus() + ')')
      }
      if (onDone) onDone(response)
      return
    }

    var responseText = response.text()
    console.info('[SkyForce Test] ' + responseText)

    if (playerName && server) {
      try {
        var sfData = parseProfileBody(responseText)
        if (sfData) {
          tellPlayerOnServer(server, playerName, formatProfileChatLines(sfData))
        } else {
          tellPlayerOnServer(server, playerName, '&cSkyForce &8| &7Некорректный ответ API')
        }
      } catch (e) {
        console.error(`[SkyForce Test] JSON parse: ${e}`)
        tellPlayerOnServer(server, playerName, '&cSkyForce &8| &7Не удалось разобрать ответ')
      }
    }

    if (onDone) onDone(response)
  }).exceptionally(function (err) {
    console.error(`[SkyForce Test] async error: ${err}`)
    if (playerName && server) {
      tellPlayerOnServer(server, playerName, '&cSkyForce &8| &7Сбой запроса. Попробуйте позже.')
    }
    return null
  })
}

// --- Тест при загрузке сервера (если задан TEST_UUID_ON_LOAD) ---
ServerEvents.loaded(function (event) {
  if (TEST_UUID_ON_LOAD) {
    console.info('[SkyForce Test] Server loaded — testing fixed UUID')
    fetchPublicProfileAsync(TEST_UUID_ON_LOAD, null, event.server)
  } else {
    console.info('[SkyForce Test] Server loaded — set TEST_UUID_ON_LOAD or use /skyforce_test <uuid>')
  }
})

// --- Тест при входе игрока (UUID из сессии) ---
PlayerEvents.loggedIn(function (event) {
  const player = event.player
  const uuid = String(player.uuid)
  const name = String(player.username)
  console.info(`[SkyForce Test] Player ${name} → ${uuid}`)
  fetchPublicProfileAsync(uuid, name, event.server)
})

// --- Команда: /skyforce_test <uuid> ---
ServerEvents.commandRegistry(function (event) {
  const Commands = event.commands
  const Arguments = event.arguments

  event.register(
    Commands.literal('skyforce_test')
      .requires(function (src) {
        return src.hasPermission(2)
      })
      .then(
        Commands.argument('uuid', Arguments.STRING.create(event))
          .executes(function (ctx) {
            const uuid = Arguments.STRING.getResult(ctx, 'uuid')
            const source = ctx.source

            source.sendSuccess(function () {
              return Text.green(`SkyForce test started for ${uuid} — см. logs/latest.log`)
            }, false)

            const player = source.player
            const playerName = player ? String(player.username) : null

            fetchPublicProfileAsync(uuid, playerName, source.server, function (response) {
              if (response && response.isOk()) {
                source.sendSuccess(function () {
                  return Text.green(`HTTP ${response.getStatus()} — ответ в консоли`)
                }, false)
              } else if (response) {
                source.sendFailure(Text.red(`HTTP ${response.getStatus()}: ${response.text()}`))
              }
            })

            return 1
          })
      )
      .executes(function (ctx) {
        ctx.source.sendFailure(Text.red('Использование: /skyforce_test <uuid>'))
        return 0
      })
  )
})
