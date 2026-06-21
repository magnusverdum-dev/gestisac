-- Create relational table for assemblies (assembleias de condominio).
-- This prepares a typed-table path alongside the current assembly_snapshots
-- flow. Application reads/writes still keep the snapshot table active until
-- the repository layer is fully migrated.

CREATE TABLE IF NOT EXISTS assemblies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    title TEXT NOT NULL,
    date DATE,
    status TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for foreign keys and common query patterns

CREATE INDEX IF NOT EXISTS idx_assemblies_tenant
    ON assemblies(tenant_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_condominium
    ON assemblies(condominium_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_tenant_condominium
    ON assemblies(tenant_id, condominium_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_date
    ON assemblies(date)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_status
    ON assemblies(tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_created_by
    ON assemblies(created_by)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_updated_by
    ON assemblies(updated_by);
