-- Final batch of missing leading-column foreign-key indexes.
-- These cover the remaining accounting-heavy tables and keep production reads
-- fast without changing schema behavior or data.

-- Core accounting ownership and lifecycle.
CREATE INDEX IF NOT EXISTS idx_quotas_created_by_fk ON quotas(created_by);
CREATE INDEX IF NOT EXISTS idx_quotas_updated_by_fk ON quotas(updated_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by_fk ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_updated_by_fk ON payments(updated_by);
CREATE INDEX IF NOT EXISTS idx_debts_created_by_fk ON debts(created_by);
CREATE INDEX IF NOT EXISTS idx_debts_updated_by_fk ON debts(updated_by);

-- Receipts and expense context.
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_fk ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_condominium_fk ON receipts(condominium_id);
CREATE INDEX IF NOT EXISTS idx_receipts_fraction_fk ON receipts(fraction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_resident_fk ON receipts(resident_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by_fk ON receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_updated_by_fk ON receipts(updated_by);
CREATE INDEX IF NOT EXISTS idx_expenses_condominium_fk ON expenses(condominium_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by_fk ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_updated_by_fk ON expenses(updated_by);

-- Payment agreements and instalments.
CREATE INDEX IF NOT EXISTS idx_payment_agreements_condominium_fk ON payment_agreements(condominium_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_fraction_fk ON payment_agreements(fraction_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_resident_fk ON payment_agreements(resident_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_created_by_fk ON payment_agreements(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_updated_by_fk ON payment_agreements(updated_by);
CREATE INDEX IF NOT EXISTS idx_payment_agreement_installments_tenant_fk ON payment_agreement_installments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreement_installments_payment_fk ON payment_agreement_installments(payment_id);

-- Cashflow and bank reconciliation lookups.
CREATE INDEX IF NOT EXISTS idx_cash_movements_condominium_fk ON cash_movements(condominium_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_by_fk ON cash_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_cash_movements_updated_by_fk ON cash_movements(updated_by);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_condominium_fk ON bank_transactions(condominium_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_created_by_fk ON bank_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_updated_by_fk ON bank_transactions(updated_by);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_reconciled_by_fk ON bank_reconciliations(reconciled_by);
