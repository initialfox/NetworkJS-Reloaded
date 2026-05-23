-- SkyCore — nickname в users (для уже существующей БД)
-- psql -U postgres -d skyforce -f 004_users_nickname.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;

UPDATE users SET nickname = 'unknown' WHERE nickname IS NULL;

ALTER TABLE users ALTER COLUMN nickname SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_nickname_lower ON users (LOWER(nickname));

INSERT INTO roles (name, full_name)
VALUES ('vip', 'VIP')
ON CONFLICT (name) DO NOTHING;
