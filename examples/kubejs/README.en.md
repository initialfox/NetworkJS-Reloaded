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

## Where to put files

| Type | Path |
|------|------|
| **Server-wide** scripts | `<server root>/kubejs/server_scripts/` |
| **World-only** scripts | `<world folder>/kubejs/server_scripts/` |
| **PostgreSQL** (root only) | `<server root>/kubejs/config/networkjs/postgres.json` |

Server root = folder with `mods/`. Do **not** put `postgres.json` inside a world folder.

## Setup

1. Mods: **KubeJS** + **NetworkJS Reloaded** on **NeoForge 1.21.1** (from NeoForge **21.1.200**)
2. Copy `.js` to `kubejs/server_scripts/` (server root and/or world folder)
3. PostgreSQL: `postgres.json.example` → `<server root>/kubejs/config/networkjs/postgres.json`
4. Singleplayer: `/networkjs enable` → `/kubejs reload server`
5. PostgreSQL: `/networkjs postgres reload`
