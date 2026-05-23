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

## Установка

1. Моды: **KubeJS** + **NetworkJS Reloaded** на **NeoForge 1.21.1** (от NeoForge **21.1.200**)
2. Скопируйте нужный `.js` → `<сервер>/kubejs/server_scripts/`
3. Для PostgreSQL: `config/networkjs/postgres.json.example` → `kubejs/config/networkjs/postgres.json`
4. Одиночка: `/networkjs enable` → `/kubejs reload server`
5. PostgreSQL: `/networkjs postgres reload`
