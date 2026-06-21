-- Extract business fields from metadata JSONB into typed columns.
--
-- Problem:
--   Várias tabelas relacionais armazenam dados de negócio dentro de
--   `metadata jsonb` (serialização completa do struct em camelCase).
--   Isto impede o uso de indexes B-tree simples e causa sequential scans
--   nas queries de filtragem que acedem a `metadata->>'campo'`.
--
-- Solução:
--   1) Adicionar colunas tipadas onde não existem (ex: status em calendar_events).
--   2) Fazer backfill dos valores existentes em metadata para essas colunas.
--   3) Criar indexes nas colunas mais filtradas para permitir index-only scans.
--
-- Nota: tickets já tem as colunas `status`, `priority`, `assigned_worker_id`,
-- `category` e `type`. O backfill copia de metadata para essas colunas onde
-- estejam vazias/default. As tabelas quotas, payments e expenses têm os dados
-- primários em snapshot tables, mas o metadata pode conter dados residuais;
-- as colunas são adicionadas para preparar a migração futura para leitura
-- direta das tabelas relacionais.

-- =============================================================================
-- 1. tickets — backfill typed columns from metadata
-- =============================================================================

-- As colunas já existem (status, priority, assigned_worker_id, category).
-- Apenas backfill para registos onde a coluna está vazia/default.

UPDATE tickets
SET
    status = COALESCE(NULLIF(status, ''), metadata->>'status', status),
    priority = COALESCE(NULLIF(priority, ''), metadata->>'priority', priority),
    assigned_worker_id = COALESCE(NULLIF(assigned_worker_id::text, ''), metadata->>'assignee', assigned_worker_id::text),
    category = COALESCE(NULLIF(category, ''), metadata->>'category', category)
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb
    AND (
        status = '' OR status IS NULL
        OR priority = '' OR priority IS NULL
        OR assigned_worker_id IS NULL
        OR category = '' OR category IS NULL
    );

-- =============================================================================
-- 2. quotas — add month_num, year_num, paid_bool; backfill from metadata
-- =============================================================================

ALTER TABLE quotas ADD COLUMN IF NOT EXISTS month_num integer;
ALTER TABLE quotas ADD COLUMN IF NOT EXISTS year_num integer;
ALTER TABLE quotas ADD COLUMN IF NOT EXISTS paid_bool boolean;

-- Backfill from metadata. O struct Quota em store.rs tem campos camelCase:
--   month, year, paid
-- O periodo também pode estar em `period` (ex: "2026-03") e podemos extrair
-- month/year daí como fallback.
UPDATE quotas
SET
    month_num = COALESCE(
        CASE
            WHEN metadata->>'month' ~ '^\d+$'
            THEN (metadata->>'month')::integer
            ELSE NULL
        END,
        CASE
            WHEN period ~ '^\d{4}-\d{2}$'
            THEN SPLIT_PART(period, '-', 2)::integer
            ELSE NULL
        END,
        month_num
    ),
    year_num = COALESCE(
        CASE
            WHEN metadata->>'year' ~ '^\d+$'
            THEN (metadata->>'year')::integer
            ELSE NULL
        END,
        CASE
            WHEN period ~ '^\d{4}-\d{2}$'
            THEN SPLIT_PART(period, '-', 1)::integer
            ELSE NULL
        END,
        year_num
    ),
    paid_bool = COALESCE(
        CASE
            WHEN lower(metadata->>'paid') IN ('true', 'false')
            THEN (metadata->>'paid')::boolean
            ELSE NULL
        END,
        CASE
            WHEN status IN ('pago', 'paid', 'confirmado', 'recebido') THEN true
            WHEN status IN ('pendente', 'pending', 'vencido', 'overdue') THEN false
            ELSE paid_bool
        END
    )
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_quotas_month_year
    ON quotas(tenant_id, year_num, month_num)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotas_paid
    ON quotas(tenant_id, paid_bool)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. payments — add date_timestamptz; backfill method, date, amount from metadata
-- =============================================================================

-- method, amount já existem como colunas. Adicionar date_timestamptz se não existe.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS date_timestamptz timestamptz;

-- Backfill: campos camelCase do struct AccountingPayment:
--   method, paid_at (date), amount
UPDATE payments
SET
    method = COALESCE(NULLIF(method, ''), metadata->>'method', method),
    date_timestamptz = COALESCE(
        date_timestamptz,
        CASE
            WHEN metadata->>'date' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'date')::timestamptz
            ELSE NULL
        END,
        CASE
            WHEN metadata->>'paidAt' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'paidAt')::timestamptz
            ELSE NULL
        END,
        paid_at,
        date_timestamptz
    ),
    amount = COALESCE(
        NULLIF(amount, 0),
        CASE
            WHEN metadata->>'amount' ~ '^-?\d+([.,]\d+)?$'
            THEN replace(metadata->>'amount', ',', '.')::numeric(12,2)
            ELSE NULL
        END,
        amount
    )
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb
    AND (
        method = '' OR method IS NULL
        OR date_timestamptz IS NULL
        OR amount = 0
    );

CREATE INDEX IF NOT EXISTS idx_payments_date
    ON payments(tenant_id, date_timestamptz)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_method
    ON payments(tenant_id, method)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_date_paid_at
    ON payments(tenant_id, paid_at)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 4. expenses — add supplier_id_text, date_timestamptz; backfill from metadata
-- =============================================================================

-- category já existe como coluna. Adicionar supplier_id_text (text, não FK) e
-- date_timestamptz. O struct Expense em store.rs não tem supplierId explícito
-- no modelo actual, mas podemos guardar o nome do supplier como texto.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id_text text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date_timestamptz timestamptz;

UPDATE expenses
SET
    category = COALESCE(NULLIF(category, ''), metadata->>'category', category),
    supplier_id_text = COALESCE(
        supplier_id_text,
        metadata->>'supplierId',
        metadata->>'supplier',
        supplier_id_text
    ),
    date_timestamptz = COALESCE(
        date_timestamptz,
        CASE
            WHEN metadata->>'date' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'date')::timestamptz
            ELSE NULL
        END,
        due_date::timestamptz,
        paid_at,
        date_timestamptz
    )
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb
    AND (
        category = '' OR category IS NULL
        OR supplier_id_text IS NULL
        OR date_timestamptz IS NULL
    );

CREATE INDEX IF NOT EXISTS idx_expenses_category
    ON expenses(tenant_id, category)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_supplier_text
    ON expenses(tenant_id, supplier_id_text)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_date
    ON expenses(tenant_id, date_timestamptz)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 5. calendar_events — add status_text column; backfill event_type, date from metadata
-- =============================================================================

-- event_type já existe. Adicionar status_text (não existe coluna status na tabela).
-- starts_at já existe como coluna, mas o codigo usa metadata->>'startAt' como fallback.
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS status_text text;

UPDATE calendar_events
SET
    event_type = COALESCE(NULLIF(event_type, ''), metadata->>'eventType', event_type),
    status_text = COALESCE(
        status_text,
        metadata->>'status',
        status_text
    ),
    starts_at = COALESCE(
        starts_at,
        CASE
            WHEN metadata->>'startAt' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'startAt')::timestamptz
            ELSE NULL
        END,
        CASE
            WHEN metadata->>'date' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'date')::timestamptz
            ELSE NULL
        END,
        starts_at
    ),
    ends_at = COALESCE(
        ends_at,
        CASE
            WHEN metadata->>'endAt' ~ '^\d{4}-\d{2}-\d{2}'
            THEN (metadata->>'endAt')::timestamptz
            ELSE NULL
        END,
        ends_at
    )
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb
    AND (
        event_type = '' OR event_type IS NULL
        OR status_text IS NULL
        OR starts_at IS NULL
    );

CREATE INDEX IF NOT EXISTS idx_calendar_events_type
    ON calendar_events(tenant_id, event_type)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_status
    ON calendar_events(tenant_id, status_text)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_date
    ON calendar_events(tenant_id, starts_at)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 6. Análise: registos atualizados
-- =============================================================================

-- Tickets atualizados
DO $$
DECLARE
    tickets_updated INT;
    quotas_updated INT;
    payments_updated INT;
    expenses_updated INT;
    calendar_updated INT;
BEGIN
    SELECT COUNT(*) INTO tickets_updated FROM tickets
    WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb
      AND (status <> '' AND priority <> '');

    SELECT COUNT(*) INTO quotas_updated FROM quotas
    WHERE month_num IS NOT NULL OR year_num IS NOT NULL OR paid_bool IS NOT NULL;

    SELECT COUNT(*) INTO payments_updated FROM payments
    WHERE date_timestamptz IS NOT NULL;

    SELECT COUNT(*) INTO expenses_updated FROM expenses
    WHERE supplier_id_text IS NOT NULL OR date_timestamptz IS NOT NULL;

    SELECT COUNT(*) INTO calendar_updated FROM calendar_events
    WHERE status_text IS NOT NULL;

    RAISE NOTICE 'Backfill summary: tickets=% quotas=% payments=% expenses=% calendar_events=%',
        tickets_updated, quotas_updated, payments_updated, expenses_updated, calendar_updated;
END $$;
