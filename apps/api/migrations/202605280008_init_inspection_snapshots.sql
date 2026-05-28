CREATE TABLE IF NOT EXISTS inspection_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    required_date TEXT NOT NULL,
    condominium TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_snapshots_tenant
    ON inspection_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inspection_snapshots_tenant_status
    ON inspection_snapshots(tenant_id, status);
