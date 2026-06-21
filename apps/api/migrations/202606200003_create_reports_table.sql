-- Create relational table for reports.
-- This prepares a typed-table path alongside the current report_snapshots
-- flow. Application reads/writes still keep the snapshot table active until
-- the repository layer is fully migrated.

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL,
    period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for foreign keys and common query patterns

CREATE INDEX IF NOT EXISTS idx_reports_tenant
    ON reports(tenant_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_tenant_period
    ON reports(tenant_id, period)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_tenant_status
    ON reports(tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_created_by
    ON reports(created_by)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_updated_by
    ON reports(updated_by);
