-- SkyCore — приватные регионы (PostgreSQL)
-- psql -U postgres -d skyforce -f 003_regions.sql

CREATE TABLE IF NOT EXISTS regions (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    world       TEXT NOT NULL,
    x1          INTEGER NOT NULL,
    y1          INTEGER NOT NULL,
    z1          INTEGER NOT NULL,
    x2          INTEGER NOT NULL,
    y2          INTEGER NOT NULL,
    z2          INTEGER NOT NULL,
    owner_uuid  UUID NOT NULL REFERENCES users(uuid),
    owner_name  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS region_members (
    region_id     BIGINT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    member_name   TEXT NOT NULL,
    member_uuid   UUID REFERENCES users(uuid),
    added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (region_id, member_name)
);

CREATE INDEX IF NOT EXISTS idx_regions_world ON regions(world);
CREATE INDEX IF NOT EXISTS idx_regions_owner_uuid ON regions(owner_uuid);
CREATE INDEX IF NOT EXISTS idx_region_members_region_id ON region_members(region_id);
