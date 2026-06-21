-- Create relational table for reserve funds.
-- This prepares a typed-table path alongside the current
-- reserve_fund_snapshots flow. Application reads/writes still keep the
-- snapshot table active until the repository layer is fully migrated.

CREATE TABLE IF NOT EXISTS reserve_funds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0),
    monthly_change NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for foreign keys and common query patterns

CREATE INDEX IF NOT EXISTS idx_reserve_funds_tenant
    ON reserve_funds(tenant_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_funds_condominium
    ON reserve_funds(condominium_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_funds_tenant_condominium
    ON reserve_funds(tenant_id, condominium_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_funds_status
    ON reserve_funds(tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_funds_created_by
    ON reserve_funds(created_by)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_funds_updated_by
    ON reserve_funds(updated_by);
