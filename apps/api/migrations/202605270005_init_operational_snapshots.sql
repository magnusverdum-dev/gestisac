CREATE TABLE IF NOT EXISTS ticket_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    condominium TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_snapshots_tenant
    ON ticket_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ticket_snapshots_tenant_status
    ON ticket_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS maintenance_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    kind TEXT NOT NULL,
    condominium TEXT NOT NULL,
    scheduled_start TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_snapshots_tenant
    ON maintenance_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_snapshots_tenant_status
    ON maintenance_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS calendar_event_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    start_at TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_snapshots_tenant
    ON calendar_event_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_calendar_event_snapshots_tenant_status
    ON calendar_event_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS assembly_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    date TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assembly_snapshots_tenant
    ON assembly_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_assembly_snapshots_tenant_status
    ON assembly_snapshots(tenant_id, status);
