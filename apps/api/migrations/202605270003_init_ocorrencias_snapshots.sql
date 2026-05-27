CREATE TABLE IF NOT EXISTS ocorrencia_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'demo',
    tipo TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ocorrencia_snapshots_tenant_idx
    ON ocorrencia_snapshots (tenant_id);

CREATE INDEX IF NOT EXISTS ocorrencia_snapshots_tenant_tipo_status_idx
    ON ocorrencia_snapshots (tenant_id, tipo, status);

CREATE TABLE IF NOT EXISTS ocorrencia_comment_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'demo',
    ocorrencia_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ocorrencia_comment_snapshots_tenant_ocorrencia_idx
    ON ocorrencia_comment_snapshots (tenant_id, ocorrencia_id);

CREATE TABLE IF NOT EXISTS ocorrencia_attachment_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'demo',
    ocorrencia_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ocorrencia_attachment_snapshots_tenant_ocorrencia_idx
    ON ocorrencia_attachment_snapshots (tenant_id, ocorrencia_id);
