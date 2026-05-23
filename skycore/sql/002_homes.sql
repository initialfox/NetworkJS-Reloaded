-- SkyCore — таблица homes (если ещё не создана вручную)
-- psql -U postgres -d skyforce -f 002_homes.sql

CREATE TABLE IF NOT EXISTS homes (
    id          BIGSERIAL PRIMARY KEY,
    user_uuid   UUID NOT NULL REFERENCES users(uuid),
    name        TEXT NOT NULL,
    world       TEXT NOT NULL,
    x           DOUBLE PRECISION NOT NULL,
    y           DOUBLE PRECISION NOT NULL,
    z           DOUBLE PRECISION NOT NULL,
    yaw         REAL NOT NULL DEFAULT 0,
    pitch       REAL NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_homes_user_uuid ON homes(user_uuid);
