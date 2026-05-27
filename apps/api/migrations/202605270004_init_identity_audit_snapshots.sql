CREATE TABLE IF NOT EXISTS tenant_snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_snapshots_tenant
    ON user_snapshots(tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_snapshots_tenant_email
    ON user_snapshots(tenant_id, email);

CREATE TABLE IF NOT EXISTS audit_log_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_snapshots_tenant_created_at
    ON audit_log_snapshots(tenant_id, created_at DESC);
