-- First batch of foreign-key indexes for high-traffic modules.
-- Keep this intentionally small: tickets, documents and accounting are the
-- heaviest UI/API paths and can be rolled out before indexing every FK.

-- Tickets and operational timeline.
CREATE INDEX IF NOT EXISTS idx_tickets_condominium_fk ON tickets(condominium_id);
CREATE INDEX IF NOT EXISTS idx_tickets_fraction_fk ON tickets(fraction_id);
CREATE INDEX IF NOT EXISTS idx_tickets_resident_fk ON tickets(resident_id);
CREATE INDEX IF NOT EXISTS idx_tickets_supplier_fk ON tickets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_zone_fk ON tickets(zone_id);
CREATE INDEX IF NOT EXISTS idx_tickets_equipment_fk ON tickets(equipment_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_worker_fk ON tickets(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_fk ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_fk ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_fk ON ticket_events(ticket_id);

-- Documents and cross-module links.
CREATE INDEX IF NOT EXISTS idx_documents_tenant_fk ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_links_tenant_fk ON document_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_links_document_fk ON document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_expenses_document_fk ON expenses(document_id);

-- Accounting lookups and delete/update checks on referenced rows.
CREATE INDEX IF NOT EXISTS idx_payments_quota_fk ON payments(quota_id);
CREATE INDEX IF NOT EXISTS idx_payments_debt_fk ON payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debts_quota_fk ON debts(quota_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_fk ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_debt_fk ON payment_agreements(debt_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreement_installments_agreement_fk ON payment_agreement_installments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_bank_transaction_fk ON bank_reconciliations(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_payment_fk ON cash_movements(payment_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_expense_fk ON cash_movements(expense_id);
