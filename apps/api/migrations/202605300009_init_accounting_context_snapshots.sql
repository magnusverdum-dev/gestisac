CREATE TABLE IF NOT EXISTS payment_agreement_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    next_due_date TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_agreement_snapshots_tenant
    ON payment_agreement_snapshots (tenant_id, condominium, status);

CREATE TABLE IF NOT EXISTS cash_movement_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    account_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_movement_snapshots_tenant
    ON cash_movement_snapshots (tenant_id, condominium, occurred_at);

CREATE TABLE IF NOT EXISTS bank_transaction_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    condominium TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    direction TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_transaction_snapshots_tenant
    ON bank_transaction_snapshots (tenant_id, condominium, status);

CREATE TABLE IF NOT EXISTS bank_reconciliation_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bank_transaction_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reconciled_at TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_reconciliation_snapshots_transaction
    ON bank_reconciliation_snapshots (tenant_id, bank_transaction_id);
