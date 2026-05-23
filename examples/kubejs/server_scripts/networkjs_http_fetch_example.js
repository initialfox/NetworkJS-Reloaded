// NetworkJS — HTTP (fetch) example
// Copy to: <server>/kubejs/server_scripts/
// Singleplayer: /networkjs enable → /kubejs reload server

const STATUS_URL = 'https://httpbin.org/get'

ServerEvents.loaded(function (event) {
  console.info('[NetworkJS HTTP] Server loaded — async GET ' + STATUS_URL)

  fetchAsync(STATUS_URL).thenAccept(function (response) {
    console.info('[NetworkJS HTTP] Status: ' + response.getStatus() + ' ' + response.getStatusText())
    if (response.isOk()) {
      console.info('[NetworkJS HTTP] Body length: ' + response.text().length)
    }
  }).exceptionally(function (err) {
    console.error('[NetworkJS HTTP] ' + err)
    return null
  })
})

PlayerEvents.loggedIn(function (event) {
  var name = String(event.player.username)

  try {
    var response = fetch('https://api.github.com/repos/initialfox/NetworkJS-Reloaded')
    if (response.isOk()) {
      var json = response.json()
      var stars = json.stargazers_count != null ? json.stargazers_count : '?'
      event.server.scheduleInTicks(0, function () {
        Server.sendRawMessageToPlayer(name, '&a[HTTP] &7NetworkJS Reloaded stars: &e' + stars)
      })
    }
  } catch (e) {
    console.error('[NetworkJS HTTP] sync fetch: ' + e)
  }
})
