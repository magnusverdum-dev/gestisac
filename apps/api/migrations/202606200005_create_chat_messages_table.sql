-- Create relational table for chat messages.
-- This prepares a typed-table path alongside the current
-- chat_message_snapshots flow. Application reads/writes still keep the
-- snapshot table active until the repository layer is fully migrated.
--
-- Chat messages are kept to a maximum of 500 per tenant (trimmed in app code).
-- The created_at column uses TIMESTAMPTZ instead of the legacy TEXT field.

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    sender_id TEXT REFERENCES users(id),
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    source_app TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for foreign keys and common query patterns

CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant
    ON chat_messages(tenant_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_created
    ON chat_messages(tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
    ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_source_app
    ON chat_messages(tenant_id, source_app);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_by
    ON chat_messages(created_by);

CREATE INDEX IF NOT EXISTS idx_chat_messages_updated_by
    ON chat_messages(updated_by);
