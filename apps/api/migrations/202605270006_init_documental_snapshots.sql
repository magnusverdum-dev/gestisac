CREATE TABLE IF NOT EXISTS supplier_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_snapshots_tenant
    ON supplier_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_supplier_snapshots_tenant_status
    ON supplier_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS document_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_snapshots_tenant
    ON document_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_document_snapshots_tenant_status
    ON document_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS report_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    period TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_tenant
    ON report_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_tenant_status
    ON report_snapshots(tenant_id, status);
