CREATE TABLE IF NOT EXISTS condominium_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'demo',
    name TEXT NOT NULL,
    internal_code TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS condominium_snapshots_tenant_code_idx
    ON condominium_snapshots (tenant_id, lower(internal_code))
    WHERE internal_code <> '';

CREATE INDEX IF NOT EXISTS condominium_snapshots_payload_gin_idx
    ON condominium_snapshots USING GIN (payload);

CREATE TABLE IF NOT EXISTS app_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    active_condominium TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_sessions_token_hash_idx
    ON app_sessions (token_hash);

CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx
    ON app_sessions (expires_at);
