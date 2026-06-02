CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    active_condominium_id TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email
    ON users(tenant_id, lower(email))
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    app_context TEXT NOT NULL CHECK (app_context IN ('hq', 'client', 'worker')),
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    active_condominium_id TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_user ON sessions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);

CREATE TABLE IF NOT EXISTS condominiums (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    internal_code TEXT NOT NULL DEFAULT '',
    external_reference TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    manager_user_id TEXT REFERENCES users(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_condominiums_tenant_internal_code
    ON condominiums(tenant_id, lower(internal_code))
    WHERE internal_code <> '' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_condominiums_tenant_status
    ON condominiums(tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fractions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    building_id TEXT REFERENCES buildings(id),
    code TEXT NOT NULL,
    floor TEXT NOT NULL DEFAULT '',
    permillage NUMERIC(12,4) NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (tenant_id, condominium_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fractions_tenant_condominium
    ON fractions(tenant_id, condominium_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_residents_tenant_fraction
    ON residents(tenant_id, fraction_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_category
    ON suppliers(tenant_id, category)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS condominium_zones (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '',
    qr_code TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    zone_id TEXT REFERENCES condominium_zones(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '',
    serial_number TEXT NOT NULL DEFAULT '',
    qr_code TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_equipment_tenant_condominium
    ON equipment(tenant_id, condominium_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    supplier_id TEXT REFERENCES suppliers(id),
    zone_id TEXT REFERENCES condominium_zones(id),
    equipment_id TEXT REFERENCES equipment(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'pedido',
    status TEXT NOT NULL DEFAULT 'nova',
    priority TEXT NOT NULL DEFAULT 'normal',
    impact TEXT NOT NULL DEFAULT 'medio',
    urgency TEXT NOT NULL DEFAULT 'media',
    origin_channel TEXT NOT NULL DEFAULT 'hq',
    requester_name TEXT NOT NULL DEFAULT '',
    requester_email TEXT NOT NULL DEFAULT '',
    requester_phone TEXT NOT NULL DEFAULT '',
    assigned_worker_id TEXT REFERENCES users(id),
    public_status_text TEXT NOT NULL DEFAULT '',
    public_timeline_status TEXT NOT NULL DEFAULT '',
    technical_notes TEXT NOT NULL DEFAULT '',
    estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    final_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    work_started_at TIMESTAMPTZ,
    work_paused_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    resolved_by_worker_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    requires_hq_validation BOOLEAN NOT NULL DEFAULT false,
    hq_validation_status TEXT NOT NULL DEFAULT 'nao_requerida',
    hq_validation_notes TEXT NOT NULL DEFAULT '',
    qr_source_type TEXT NOT NULL DEFAULT '',
    qr_source_id TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status
    ON tickets(tenant_id, status, priority)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_worker
    ON tickets(tenant_id, assigned_worker_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_client_visibility
    ON tickets(tenant_id, requester_email, origin_channel)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ticket_comments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    author_id TEXT REFERENCES users(id),
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket
    ON ticket_comments(tenant_id, ticket_id, created_at)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT '',
    storage_key TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    kind TEXT NOT NULL CHECK (kind IN ('before', 'after', 'proof', 'document')),
    visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'public')),
    uploaded_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    actor_id TEXT REFERENCES users(id),
    event_type TEXT NOT NULL,
    public_event BOOLEAN NOT NULL DEFAULT false,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket
    ON ticket_events(tenant_id, ticket_id, created_at);

CREATE TABLE IF NOT EXISTS quotas (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    period TEXT NOT NULL,
    due_date DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pendente',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quotas_context
    ON quotas(tenant_id, condominium_id, fraction_id, period)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    quota_id TEXT REFERENCES quotas(id),
    debt_id TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    method TEXT NOT NULL DEFAULT '',
    reference TEXT NOT NULL DEFAULT '',
    paid_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'registado',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_context
    ON payments(tenant_id, condominium_id, fraction_id, paid_at)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    quota_id TEXT REFERENCES quotas(id),
    origin TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'emAberto',
    priority TEXT NOT NULL DEFAULT 'normal',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_context
    ON debts(tenant_id, condominium_id, fraction_id, status)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_debt'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT fk_payments_debt
            FOREIGN KEY (debt_id) REFERENCES debts(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    payment_id TEXT REFERENCES payments(id),
    number TEXT NOT NULL,
    issued_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    printable_html TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (tenant_id, number)
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    supplier_id TEXT REFERENCES suppliers(id),
    document_id TEXT,
    category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pendente',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_context
    ON expenses(tenant_id, condominium_id, supplier_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS payment_agreements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT NOT NULL REFERENCES condominiums(id),
    fraction_id TEXT REFERENCES fractions(id),
    resident_id TEXT REFERENCES residents(id),
    debt_id TEXT REFERENCES debts(id),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    installments_count INTEGER NOT NULL CHECK (installments_count > 0),
    installment_amount NUMERIC(12,2) NOT NULL CHECK (installment_amount >= 0),
    next_due_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_agreement_installments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    agreement_id TEXT NOT NULL REFERENCES payment_agreements(id),
    payment_id TEXT REFERENCES payments(id),
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_agreements_context
    ON payment_agreements(tenant_id, condominium_id, fraction_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    payment_id TEXT REFERENCES payments(id),
    expense_id TEXT REFERENCES expenses(id),
    account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'bank')),
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    method TEXT NOT NULL DEFAULT '',
    reference TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'registered',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_context
    ON cash_movements(tenant_id, condominium_id, account_type, movement_date)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    bank_account_id TEXT NOT NULL DEFAULT '',
    imported_batch_id TEXT NOT NULL DEFAULT '',
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciliation
    ON bank_transactions(tenant_id, condominium_id, reconciliation_status, transaction_date)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    bank_transaction_id TEXT NOT NULL REFERENCES bank_transactions(id),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    reconciled_by TEXT REFERENCES users(id),
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_reconciliations_one_active_match
    ON bank_reconciliations(tenant_id, bank_transaction_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT '',
    storage_key TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'internal',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_links (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    document_id TEXT NOT NULL REFERENCES documents(id),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_document'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT fk_expenses_document
            FOREIGN KEY (document_id) REFERENCES documents(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS maintenance_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    equipment_id TEXT REFERENCES equipment(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    due_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    assigned_worker_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    scheduled_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    condominium_id TEXT REFERENCES condominiums(id),
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT REFERENCES users(id),
    app_context TEXT NOT NULL DEFAULT 'hq',
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    record_type TEXT NOT NULL DEFAULT '',
    record_id TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_module
    ON audit_log(tenant_id, module, created_at DESC);
