-- SkyCore — схема PostgreSQL для Minecraft-сервера
-- Выполни один раз: psql -U postgres -d skyforce -f 001_schema.sql

CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    full_name   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    uuid        UUID PRIMARY KEY,
    nickname    TEXT NOT NULL,
    role_id     INTEGER NOT NULL REFERENCES roles(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_nickname_lower ON users (LOWER(nickname));

CREATE TABLE IF NOT EXISTS player_sessions (
    id          BIGSERIAL PRIMARY KEY,
    user_uuid   UUID NOT NULL REFERENCES users(uuid),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_user_uuid ON player_sessions(user_uuid);
CREATE INDEX IF NOT EXISTS idx_player_sessions_open ON player_sessions(user_uuid) WHERE left_at IS NULL;

INSERT INTO roles (name, full_name)
VALUES
    ('user', 'Игрок'),
    ('vip', 'VIP'),
    ('moderator', 'Модератор'),
    ('admin', 'Администратор')
ON CONFLICT (name) DO NOTHING;
