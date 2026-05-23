-- SkyCore — серверный спавн + флаг первого телепорта
-- psql -U postgres -d skyforce -f 005_spawn.sql

CREATE TABLE IF NOT EXISTS server_spawn (
    id          SMALLINT PRIMARY KEY DEFAULT 1,
    world       TEXT NOT NULL,
    x           DOUBLE PRECISION NOT NULL,
    y           DOUBLE PRECISION NOT NULL,
    z           DOUBLE PRECISION NOT NULL,
    yaw         REAL NOT NULL DEFAULT 0,
    pitch       REAL NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT server_spawn_singleton CHECK (id = 1)
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS spawn_intro_done BOOLEAN NOT NULL DEFAULT FALSE;
