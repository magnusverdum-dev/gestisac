-- Add GIN index on condominiums.metadata for JSONB filtering performance.
--
-- Problem:
--   O endpoint /api/condominiums faz 8+ filtros sobre metadata JSONB
--   (archived, condominiumType, address.locality, manager, operationalStatus.generalStatus,
--    media, equipment, etc.) sem qualquer index GIN, forçando sequential scans.
--
-- Solução:
--   GIN index com jsonb_path_ops (mais compacto e rápido para operações @>, ?, ?|)
--   que acelera as queries com filtros JSONB. O operador ->>, #>>, @> tiram partido
--   deste index.

CREATE INDEX IF NOT EXISTS idx_condominiums_metadata_gin
    ON condominiums USING GIN (metadata jsonb_path_ops);
