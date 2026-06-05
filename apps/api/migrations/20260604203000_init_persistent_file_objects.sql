CREATE TABLE IF NOT EXISTS file_objects (
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    storage_key TEXT NOT NULL,
    content BYTEA NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_file_objects_tenant_active
    ON file_objects (tenant_id, updated_at DESC)
    WHERE deleted_at IS NULL;
