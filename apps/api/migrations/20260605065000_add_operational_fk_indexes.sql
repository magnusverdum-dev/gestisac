-- Third batch of foreign-key indexes for operational and audit paths.
-- This keeps write overhead bounded while covering UI-heavy modules that
-- frequently filter by tenant/condominium/user context.

-- Ticket authorship and attachment/event context.
CREATE INDEX IF NOT EXISTS idx_tickets_created_by_fk ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_by_fk ON tickets(updated_by);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_fk ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_tenant_fk ON ticket_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_by_fk ON ticket_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ticket_events_actor_fk ON ticket_events(actor_id);

-- Document authorship.
CREATE INDEX IF NOT EXISTS idx_documents_created_by_fk ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_updated_by_fk ON documents(updated_by);

-- Maintenance and inspection planning.
CREATE INDEX IF NOT EXISTS idx_maintenance_items_tenant_fk ON maintenance_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_condominium_fk ON maintenance_items(condominium_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_equipment_fk ON maintenance_items(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_created_by_fk ON maintenance_items(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_updated_by_fk ON maintenance_items(updated_by);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_fk ON inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_condominium_fk ON inspections(condominium_id);
CREATE INDEX IF NOT EXISTS idx_inspections_assigned_worker_fk ON inspections(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_by_fk ON inspections(created_by);
CREATE INDEX IF NOT EXISTS idx_inspections_updated_by_fk ON inspections(updated_by);

-- Calendar and audit lookups.
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_fk ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_condominium_fk ON calendar_events(condominium_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by_fk ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_updated_by_fk ON calendar_events(updated_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_fk ON audit_log(user_id);
