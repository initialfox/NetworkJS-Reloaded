# KubeJS examples / Примеры KubeJS

[Main docs (EN)](../../README.md) · [Документация (RU)](../../README.ru.md)

## Scripts / Скрипты

| File | What it demonstrates |
|------|----------------------|
| `server_scripts/networkjs_http_fetch_example.js` | HTTP: `fetch`, `fetchAsync` |
| `server_scripts/networkjs_postgres_example.js` | PostgreSQL: login lookup by username |
| `server_scripts/networkjs_skyforce_profile_test.js` | HTTP: external REST API + chat formatting |

## Setup / Установка

1. Mods: **KubeJS** + **NetworkJS** (NeoForge 1.21.1)
2. Copy chosen `.js` → `<server>/kubejs/server_scripts/`
3. For PostgreSQL: copy `config/networkjs/postgres.json.example` → `kubejs/config/networkjs/postgres.json`
4. Singleplayer: `/networkjs enable` → `/kubejs reload server`
5. PostgreSQL: `/networkjs postgres reload`

## SkyCore (full server)

See [`../../skycore/README.md`](../../skycore/README.md) — roles, chat, homes, regions, spawn on PostgreSQL.
