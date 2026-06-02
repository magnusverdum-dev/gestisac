CREATE TABLE IF NOT EXISTS chat_message_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    source_app TEXT NOT NULL DEFAULT '',
    sender_role TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    payload JSONB NOT NULL,
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_snapshots_tenant_created
    ON chat_message_snapshots (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_message_snapshots_tenant_source
    ON chat_message_snapshots (tenant_id, source_app);
