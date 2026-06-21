-- Extract frequently-filtered metadata JSONB fields into typed columns.
--
-- Problem:
--   O endpoint /api/condominiums filtra por archived, condominiumType,
--   address.locality, manager e operationalStatus.generalStatus através de
--   metadata->>'campo' sem indexação B-tree, forçando sequential scans.
--   Além disso, o filtro manager usa metadata->>'manager' quando existe a
--   coluna manager_user_id com FK index.
--
-- Solução:
--   1) Adicionar colunas tipadas para os campos mais filtrados.
--   2) Fazer backfill dos valores existentes em metadata para essas colunas.
--   3) Criar indexes B-tree compostos (tenant_id + coluna) para queries
--      multi-tenant com filtro por coluna.
--
-- Nota: a coluna `manager_user_id` já existe na tabela. O código Rust grava
-- o FK quando o campo manager traz um id de utilizador válido e mantém fallback
-- por metadata para dados antigos ou gestores em texto livre.

-- =============================================================================
-- 1. Adicionar colunas tipadas
-- =============================================================================

ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS archived boolean;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS condominium_type text;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS locality text;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS operational_general_status text;

-- =============================================================================
-- 2. Backfill dos dados existentes a partir da metadata
-- =============================================================================

UPDATE condominiums SET
    archived = CASE
        WHEN lower(metadata->>'archived') IN ('true', 'false')
        THEN (metadata->>'archived')::boolean
        ELSE archived
    END,
    condominium_type = COALESCE(NULLIF(metadata->>'condominiumType', ''), condominium_type),
    locality = COALESCE(NULLIF(metadata #>> '{address,locality}', ''), locality),
    operational_general_status = COALESCE(
        NULLIF(metadata #>> '{operationalStatus,generalStatus}', ''),
        operational_general_status
    )
WHERE
    metadata IS NOT NULL
    AND metadata != '{}'::jsonb;

-- =============================================================================
-- 3. Indexes B-tree nas novas colunas (compostos com tenant_id)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_condominiums_archived
    ON condominiums(tenant_id, archived)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_condominiums_type
    ON condominiums(tenant_id, condominium_type)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_condominiums_locality
    ON condominiums(tenant_id, locality)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_condominiums_operational_status
    ON condominiums(tenant_id, operational_general_status)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 4. Análise: registos atualizados
-- =============================================================================

DO $$
DECLARE
    total_updated INT;
BEGIN
    SELECT COUNT(*) INTO total_updated FROM condominiums
    WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb
      AND (archived IS NOT NULL OR condominium_type IS NOT NULL
           OR locality IS NOT NULL OR operational_general_status IS NOT NULL);

    RAISE NOTICE 'Condominiums backfill: % registos atualizados', total_updated;
END $$;
