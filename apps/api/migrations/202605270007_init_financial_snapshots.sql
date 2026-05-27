CREATE TABLE IF NOT EXISTS quota_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    period TEXT NOT NULL,
    due_date TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_snapshots_tenant
    ON quota_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_quota_snapshots_tenant_status
    ON quota_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS accounting_payment_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    paid_at TEXT NOT NULL,
    method TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_payment_snapshots_tenant
    ON accounting_payment_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_accounting_payment_snapshots_tenant_status
    ON accounting_payment_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS debt_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    due_date TEXT NOT NULL,
    days_overdue INTEGER NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_snapshots_tenant
    ON debt_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_debt_snapshots_tenant_status
    ON debt_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS receipt_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    number TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_snapshots_tenant
    ON receipt_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_receipt_snapshots_tenant_status
    ON receipt_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS expense_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    category TEXT NOT NULL,
    due_date TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_snapshots_tenant
    ON expense_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_expense_snapshots_tenant_status
    ON expense_snapshots(tenant_id, status);

CREATE TABLE IF NOT EXISTS reserve_fund_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserve_fund_snapshots_tenant
    ON reserve_fund_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_reserve_fund_snapshots_tenant_status
    ON reserve_fund_snapshots(tenant_id, status);
