# Примеры KubeJS

[English](README.en.md) · [Документация мода](../../README.md) · [Mod docs (EN)](../../README.en.md)

## Скрипты

| Файл | Назначение |
|------|------------|
| `server_scripts/networkjs_http_fetch_example.js` | HTTP: `fetch`, `fetchAsync` |
| `server_scripts/networkjs_postgres_example.js` | PostgreSQL: поиск игрока по нику |

## Версии

| | Минимум | Проверено |
|--|---------|-----------|
| Minecraft | 1.21.1 | 1.21.1 |
| NeoForge | **21.1.200** | 21.1.200 |
| KubeJS | **2101.7.1** | 2101.7.1-build.181 |
| NetworkJS Reloaded | 1.2.0 | 1.2.0 |

## Куда класть

| Тип | Путь |
|-----|------|
| Скрипты на **весь сервер** | `<корень сервера>/kubejs/server_scripts/` |
| Скрипты на **один мир** | `<папка мира>/kubejs/server_scripts/` |
| **PostgreSQL** (только корень) | `<корень сервера>/kubejs/config/networkjs/postgres.json` |

Корень сервера — папка с `mods/` (dedicated) или instance в одиночке. `postgres.json` в папку мира **не** класть.

## Установка

1. Моды: **KubeJS** + **NetworkJS Reloaded** на **NeoForge 1.21.1** (от NeoForge **21.1.200**)
2. Скопируйте `.js` в `kubejs/server_scripts/` (корень сервера и/или папка мира)
3. PostgreSQL: `postgres.json.example` → `<корень сервера>/kubejs/config/networkjs/postgres.json`
4. Одиночка: `/networkjs enable` → `/kubejs reload server`
5. PostgreSQL: `/networkjs postgres reload`
