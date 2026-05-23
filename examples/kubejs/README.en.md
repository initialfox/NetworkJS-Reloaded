# KubeJS examples

[Russian / Русский](README.md) · [Mod docs (EN)](../../README.en.md)

## Scripts

| File | Demonstrates |
|------|----------------|
| `server_scripts/networkjs_http_fetch_example.js` | HTTP: `fetch`, `fetchAsync` |
| `server_scripts/networkjs_postgres_example.js` | PostgreSQL: login lookup by username |

## Versions

| | Minimum | Tested |
|--|---------|--------|
| Minecraft | 1.21.1 | 1.21.1 |
| NeoForge | **21.1.200** | 21.1.200 |
| KubeJS | **2101.7.1** | 2101.7.1-build.181 |
| NetworkJS Reloaded | 1.2.0 | 1.2.0 |

## Setup

1. Mods: **KubeJS** + **NetworkJS Reloaded** on **NeoForge 1.21.1** (from NeoForge **21.1.200**)
2. Copy chosen `.js` → `<server>/kubejs/server_scripts/`
3. For PostgreSQL: `config/networkjs/postgres.json.example` → `kubejs/config/networkjs/postgres.json`
4. Singleplayer: `/networkjs enable` → `/kubejs reload server`
5. PostgreSQL: `/networkjs postgres reload`
