# SkyCore

KubeJS-модули сервера: роли, `users`, сессии, чат с префиксом роли (PostgreSQL через NetworkJS).

## Структура репозитория

```
skycore/
├── sql/
│   └── 001_schema.sql          # схема БД
├── kubejs/
│   └── server_scripts/
│       └── skycore/            # ← все скрипты только здесь
│           ├── 00_skycore_lib.js
│           ├── 01_skycore_sessions.js
│           ├── 02_skycore_chat.js
│           ├── 03_skycore_homes.js
│           ├── 04_skycore_permissions.js
│           ├── 05_skycore_permissions_blocks.js
│           ├── 06_skycore_permissions_commands.js
│           ├── 07_skycore_regions.js
│           └── 08_skycore_spawn.js
│   └── startup_scripts/skycore/skycore_roles_config.js
└── README.md
```

## Установка на сервер

### 1. База данных

```bash
psql -U postgres -d skyforce -f 001_schema.sql
```

(файл из `skycore/sql/001_schema.sql`)

### 2. NetworkJS + PostgreSQL

- Моды: **KubeJS**, **NetworkJS**
- `kubejs/config/networkjs/postgres.json` с `"enabled": true`
- `/networkjs enable` (singleplayer)
- `/networkjs postgres reload` → `connected`

### 3. Скрипты SkyCore

Скопируй **папку** `skycore` целиком в `kubejs/server_scripts/`:

```
<сервер>/kubejs/server_scripts/skycore/
  00_skycore_lib.js
  01_skycore_sessions.js
  02_skycore_chat.js
  … (все .js из skycore/kubejs/server_scripts/skycore/)
```

Итоговые пути:

```
kubejs/server_scripts/skycore/*.js
kubejs/startup_scripts/skycore/skycore_roles_config.js
```

После правки startup-конфига: `/kubejs reload startup` и `/kubejs reload server`.

```text
/kubejs reload server
```

В логе: `[SkyCore] Library loaded` и `Bindings: Postgres=true ... connected=true`.

## Поведение

| Событие | Действие |
|---------|----------|
| Вход | запись в `users`, кэш роли, `player_sessions.joined_at` |
| Выход | `player_sessions.left_at`, сброс кэша |
| Чат локальный | `[L] [Админ] Nick · текст` (радиус **100м**) |
| Чат глобальный | `! текст` → `[G] [Админ] Nick · текст` (все) |

## Дома (PostgreSQL)

| Команда | Описание |
|---------|----------|
| `/sethome <имя>` | Сохранить точку (мир, xyz, yaw/pitch) |
| `/home` | Телепорт к последнему дому |
| `/home <имя>` | Телепорт к дому |
| `/home list` | Список домов |
| `/home help` | Справка по командам |
| `/delhome <имя>` | Удалить дом |

Скрипт: `03_skycore_homes.js`. Лимит: `SkyCore.homes.maxHomes` (по умолчанию 10).  
Таблица `homes` — см. `sql/002_homes.sql` (если ещё не создана).

Права: `homes.set`, `homes.teleport`, `homes.list`, `homes.delete` (или wildcard `homes.*`).

## Права

**Списки прав** (что умеет роль) — в `startup_scripts/skycore/skycore_roles_config.js` (`global.SkyCoreRolesConfig`).  
**Кому какая роль** — в PostgreSQL: `users.role_id` → таблица `roles`.

При входе обновляется `users.nickname` и кэшируется роль для чата и `/perm`.

| Команда | Описание |
|---------|----------|
| `/perm myrole` | Ваша локальная роль |
| `/perm list` | Список ролей |
| `/perm info <роль>` | Права роли |
| `/perm role <ник\|uuid> <роль>` | Выдать роль (нужен `permissions.set`) |
| `/perm reload` | Перечитать роли онлайн-игроков из БД |
| `/perm help` | Справка |
| `/permission …` | Алиас `/perm` |

Роли по умолчанию: `admin`, `moderator`, `vip`, `user`.

**Первый админ** (из консоли сервера, игрок должен быть онлайн):

```text
perm role YourNick admin
```

Защита блоков (`05_skycore_permissions_blocks.js`): `blocks.break`, `blocks.place`, `blocks.interact`.

Роль в чате и права `/perm` берутся из одной записи `users.role_id`.

### Миграция nickname (существующая БД)

```bash
psql -U postgres -d skyforce -f sql/004_users_nickname.sql
```

### Роль вручную (SQL)

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE uuid = '401434de-ace3-43c0-9ddd-0ec4a0eda218'::uuid;
```

## Регионы (PostgreSQL)

Схема: `sql/003_regions.sql`

```bash
psql -U postgres -d skyforce -f 003_regions.sql
```

| Команда | Описание |
|---------|----------|
| `/rg` | Справка |
| `/pos1`, `/pos2` | Точки области (текущая позиция) |
| `/wand` | Деревянный топор: ЛКМ — точка 1, ПКМ — точка 2 |
| `/rg create <имя>` | Создать регион в БД |
| `/rg info` / `/rg info <имя>` | Информация |
| `/rg list` | Ваши регионы |
| `/rg add/remove <регион> <ник>` | Участники |
| `/rg delete <имя>` | Удалить |
| `/rg preview` | Контур выбранной области |

Скрипт: `07_skycore_regions.js`. Лимит: `SkyCore.regions.maxPerPlayer` (по умолчанию 3).  
Точки выбора — в NBT игрока; сами регионы — таблицы `regions`, `region_members`.  
Кэш в памяти обновляется при старте и после изменений (для защиты блоков).

Права: `regions.create`, `regions.info`, `regions.manage`, `regions.list`, `regions.delete`, `regions.admin`.

## Спавн (PostgreSQL)

Схема: `sql/005_spawn.sql`

```bash
psql -U postgres -d skyforce -f 005_spawn.sql
```

Скрипт: `08_skycore_spawn.js`. Точка — таблица `server_spawn` (одна строка `id = 1`), кэш в памяти при старте и после `/setspawn`.

| Команда | Описание |
|---------|----------|
| `/setspawn` | Сохранить спавн в БД + `setworldspawn` |
| `/spawn` | Телепорт на спавн |
| `/spawn info` | Координаты спавна |

**Первый вход:** после записи игрока в `users` (сессии): если спавн в БД есть и `users.spawn_intro_done = false`, через 10 тиков телепорт и флаг `true` в БД.

Права: `spawn.set` (админ/модератор), `spawn.use` (все роли с доступом к `/spawn`). Wildcard: `spawn.*`.

Отключить автотелепорт при первом входе: `SkyCore.spawn.firstJoinTeleport = false` в `00_skycore_lib.js`.

## Зависимости

- [NetworkJS](../README.ru.md) — `Postgres`, `postgresQuery`, `Server`
- Схема `sql/001_schema.sql`
