-- Second batch of foreign-key indexes for core production paths.
-- These are intentionally conservative: identity/session lookups, building
-- structure, resident context and high-use accounting relationships.

-- Identity and session cleanup paths.
CREATE INDEX IF NOT EXISTS idx_roles_tenant_fk ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_fk ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_fk ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_fk ON sessions(user_id);

-- Condominium structure and resident navigation.
CREATE INDEX IF NOT EXISTS idx_condominiums_manager_user_fk ON condominiums(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_tenant_fk ON buildings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_buildings_condominium_fk ON buildings(condominium_id);
CREATE INDEX IF NOT EXISTS idx_fractions_condominium_fk ON fractions(condominium_id);
CREATE INDEX IF NOT EXISTS idx_fractions_building_fk ON fractions(building_id);
CREATE INDEX IF NOT EXISTS idx_residents_condominium_fk ON residents(condominium_id);
CREATE INDEX IF NOT EXISTS idx_residents_fraction_fk ON residents(fraction_id);
CREATE INDEX IF NOT EXISTS idx_condominium_zones_tenant_fk ON condominium_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_condominium_zones_condominium_fk ON condominium_zones(condominium_id);
CREATE INDEX IF NOT EXISTS idx_equipment_condominium_fk ON equipment(condominium_id);
CREATE INDEX IF NOT EXISTS idx_equipment_zone_fk ON equipment(zone_id);

-- Accounting context used by dashboard filters and cross-table checks.
CREATE INDEX IF NOT EXISTS idx_quotas_condominium_fk ON quotas(condominium_id);
CREATE INDEX IF NOT EXISTS idx_quotas_fraction_fk ON quotas(fraction_id);
CREATE INDEX IF NOT EXISTS idx_quotas_resident_fk ON quotas(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_condominium_fk ON payments(condominium_id);
CREATE INDEX IF NOT EXISTS idx_payments_fraction_fk ON payments(fraction_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident_fk ON payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_debts_condominium_fk ON debts(condominium_id);
CREATE INDEX IF NOT EXISTS idx_debts_fraction_fk ON debts(fraction_id);
CREATE INDEX IF NOT EXISTS idx_debts_resident_fk ON debts(resident_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_fk ON receipts(payment_id);
