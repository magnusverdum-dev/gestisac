use anyhow::Context;
use serde::Serialize;
use sqlx::{
    migrate::Migrator,
    postgres::{PgConnectOptions, PgPoolOptions},
    Row,
};
use std::{collections::BTreeMap, str::FromStr};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, Serialize)]
struct AuditReport {
    connected: bool,
    public_tables: i64,
    rls_enabled_tables: i64,
    tables_without_rls: Vec<String>,
    tables_without_policies: Vec<String>,
    constraints: ConstraintCounts,
    indexes: i64,
    role_table_grants: Vec<RoleTableGrant>,
    role_sequence_grants: Vec<RoleSequenceGrant>,
    public_function_execute_for_api_roles: Vec<FunctionExecuteGrant>,
    views: ViewSecuritySummary,
    functions: FunctionSecuritySummary,
    foreign_key_indexes: ForeignKeyIndexSummary,
    data_counts: DataCounts,
    empty_snapshots: Vec<EmptySnapshot>,
    migrations: MigrationSummary,
}

#[derive(Debug, Default, Serialize)]
struct ConstraintCounts {
    checks: i64,
    foreign_keys: i64,
    primary_keys: i64,
    unique_constraints: i64,
}

#[derive(Debug, Serialize)]
struct RoleTableGrant {
    grantee: String,
    privilege_type: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct FunctionExecuteGrant {
    grantee: String,
    executable_functions: i64,
}

#[derive(Debug, Serialize)]
struct RoleSequenceGrant {
    grantee: String,
    privilege_type: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct ViewSecuritySummary {
    public_views: i64,
    views_without_security_invoker: Vec<String>,
}

#[derive(Debug, Serialize)]
struct FunctionSecuritySummary {
    public_functions: i64,
    security_definer_functions: Vec<String>,
    api_executable_security_definer_functions: Vec<FunctionRoleAccess>,
}

#[derive(Debug, Serialize)]
struct FunctionRoleAccess {
    function_signature: String,
    grantee: String,
}

#[derive(Debug, Serialize)]
struct ForeignKeyIndexSummary {
    foreign_keys: i64,
    missing_leading_indexes: Vec<ForeignKeyIndexGap>,
}

#[derive(Debug, Serialize)]
struct ForeignKeyIndexGap {
    table: String,
    constraint_name: String,
    columns: String,
    references_table: String,
}

#[derive(Debug, Serialize)]
struct DataCounts {
    tenants: i64,
    users_active: i64,
    sessions_active: i64,
    condominiums_active: i64,
    tickets_active: i64,
    documents_active: i64,
    file_objects_active: i64,
    file_objects_size_bytes: i64,
    documents_missing_file_objects: i64,
    possible_test_condominiums: i64,
    possible_test_documents: i64,
}

#[derive(Debug, Serialize)]
struct EmptySnapshot {
    table: String,
    empty_count: i64,
}

#[derive(Debug, Serialize)]
struct MigrationSummary {
    applied_count: i64,
    latest_version: Option<String>,
    local_count: i64,
    local_latest_version: Option<String>,
    missing_local_versions: Vec<String>,
    extra_applied_versions: Vec<String>,
    checksum_mismatches: Vec<String>,
    dirty_versions: Vec<String>,
}

#[derive(Debug)]
struct AppliedMigrationAuditRow {
    version: i64,
    checksum_hex: String,
    success: bool,
}

#[derive(Debug)]
struct TableAuditRow {
    table_name: String,
    rls_enabled: bool,
    policy_count: i64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = std::env::var("GESTISAC_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .context("GESTISAC_DATABASE_URL is required")?;
    let connect_options = PgConnectOptions::from_str(&database_url)?.statement_cache_capacity(0);
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect_with(connect_options)
        .await
        .context("failed to connect to production database")?;

    let table_rows = load_table_audit_rows(&pool).await?;
    let snapshot_tables = table_rows
        .iter()
        .map(|row| row.table_name.as_str())
        .filter(|table| table.ends_with("_snapshots"))
        .collect::<Vec<_>>();

    let report = AuditReport {
        connected: true,
        public_tables: usize_to_i64(table_rows.len()),
        rls_enabled_tables: usize_to_i64(table_rows.iter().filter(|row| row.rls_enabled).count()),
        tables_without_rls: table_rows
            .iter()
            .filter(|row| !row.rls_enabled)
            .map(|row| row.table_name.clone())
            .collect(),
        tables_without_policies: table_rows
            .iter()
            .filter(|row| row.rls_enabled && row.policy_count == 0)
            .map(|row| row.table_name.clone())
            .collect(),
        constraints: load_constraint_counts(&pool).await?,
        indexes: load_index_count(&pool).await?,
        role_table_grants: load_role_table_grants(&pool).await?,
        role_sequence_grants: load_role_sequence_grants(&pool).await?,
        public_function_execute_for_api_roles: load_function_execute_grants(&pool).await?,
        views: load_view_security_summary(&pool).await?,
        functions: load_function_security_summary(&pool).await?,
        foreign_key_indexes: load_foreign_key_index_summary(&pool).await?,
        data_counts: load_data_counts(&pool).await?,
        empty_snapshots: load_empty_snapshots(&pool, &snapshot_tables).await?,
        migrations: load_migration_summary(&pool).await?,
    };

    println!("{}", serde_json::to_string_pretty(&report)?);

    Ok(())
}

fn usize_to_i64(value: usize) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

async fn load_table_audit_rows(pool: &sqlx::PgPool) -> anyhow::Result<Vec<TableAuditRow>> {
    let rows = sqlx::query(
        r#"
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls_enabled,
               COALESCE(p.policy_count, 0)::bigint AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN (
          SELECT schemaname, tablename, count(*) AS policy_count
          FROM pg_policies
          GROUP BY schemaname, tablename
        ) p ON p.schemaname = n.nspname AND p.tablename = c.relname
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit public tables")?;

    Ok(rows
        .into_iter()
        .map(|row| TableAuditRow {
            table_name: row.get("table_name"),
            rls_enabled: row.get("rls_enabled"),
            policy_count: row.get("policy_count"),
        })
        .collect())
}

async fn load_constraint_counts(pool: &sqlx::PgPool) -> anyhow::Result<ConstraintCounts> {
    let rows = sqlx::query(
        r#"
        SELECT contype, count(*)::bigint AS count
        FROM pg_constraint con
        JOIN pg_namespace n ON n.oid = con.connamespace
        WHERE n.nspname = 'public'
        GROUP BY contype
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to count constraints")?;

    let mut counts = ConstraintCounts::default();
    for row in rows {
        let constraint_type: String = row.get("contype");
        let count: i64 = row.get("count");
        match constraint_type.as_str() {
            "c" => counts.checks = count,
            "f" => counts.foreign_keys = count,
            "p" => counts.primary_keys = count,
            "u" => counts.unique_constraints = count,
            _ => {}
        }
    }

    Ok(counts)
}

async fn load_index_count(pool: &sqlx::PgPool) -> anyhow::Result<i64> {
    sqlx::query_scalar("SELECT count(*)::bigint FROM pg_indexes WHERE schemaname = 'public'")
        .fetch_one(pool)
        .await
        .context("failed to count indexes")
}

async fn load_role_table_grants(pool: &sqlx::PgPool) -> anyhow::Result<Vec<RoleTableGrant>> {
    let rows = sqlx::query(
        r#"
        SELECT grantee, privilege_type, count(*)::bigint AS count
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated')
        GROUP BY grantee, privilege_type
        ORDER BY grantee, privilege_type
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit role table grants")?;

    Ok(rows
        .into_iter()
        .map(|row| RoleTableGrant {
            grantee: row.get("grantee"),
            privilege_type: row.get("privilege_type"),
            count: row.get("count"),
        })
        .collect())
}

async fn load_role_sequence_grants(pool: &sqlx::PgPool) -> anyhow::Result<Vec<RoleSequenceGrant>> {
    let rows = sqlx::query(
        r#"
        SELECT roles.rolname AS grantee,
               privileges.privilege_type,
               count(*)::bigint AS count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(rolname)
        CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) AS privileges(privilege_type)
        WHERE n.nspname = 'public'
          AND c.relkind = 'S'
          AND has_sequence_privilege(roles.rolname, c.oid, privileges.privilege_type)
        GROUP BY roles.rolname, privileges.privilege_type
        ORDER BY roles.rolname, privileges.privilege_type
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit public sequence grants")?;

    Ok(rows
        .into_iter()
        .map(|row| RoleSequenceGrant {
            grantee: row.get("grantee"),
            privilege_type: row.get("privilege_type"),
            count: row.get("count"),
        })
        .collect())
}

async fn load_function_execute_grants(
    pool: &sqlx::PgPool,
) -> anyhow::Result<Vec<FunctionExecuteGrant>> {
    let rows = sqlx::query(
        r#"
        SELECT roles.rolname AS grantee, count(*)::bigint AS executable_functions
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(rolname)
        WHERE n.nspname = 'public'
          AND has_function_privilege(roles.rolname, p.oid, 'EXECUTE')
        GROUP BY roles.rolname
        ORDER BY roles.rolname
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit public function execute grants")?;

    Ok(rows
        .into_iter()
        .map(|row| FunctionExecuteGrant {
            grantee: row.get("grantee"),
            executable_functions: row.get("executable_functions"),
        })
        .collect())
}

async fn load_view_security_summary(pool: &sqlx::PgPool) -> anyhow::Result<ViewSecuritySummary> {
    let rows = sqlx::query(
        r#"
        SELECT c.relname AS view_name,
               EXISTS (
                 SELECT 1
                 FROM unnest(COALESCE(c.reloptions, ARRAY[]::text[])) AS options(option)
                 WHERE lower(options.option) IN ('security_invoker=true', 'security_invoker=on')
               ) AS security_invoker
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'v'
        ORDER BY c.relname
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit public view security")?;

    Ok(ViewSecuritySummary {
        public_views: usize_to_i64(rows.len()),
        views_without_security_invoker: rows
            .into_iter()
            .filter(|row| !row.get::<bool, _>("security_invoker"))
            .map(|row| row.get("view_name"))
            .collect(),
    })
}

async fn load_function_security_summary(
    pool: &sqlx::PgPool,
) -> anyhow::Result<FunctionSecuritySummary> {
    let public_functions = sqlx::query_scalar(
        r#"
        SELECT count(*)::bigint
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        "#,
    )
    .fetch_one(pool)
    .await
    .context("failed to count public functions")?;

    let security_definer_rows = sqlx::query(
        r#"
        SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS function_signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
        ORDER BY function_signature
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit public security definer functions")?;

    let api_executable_rows = sqlx::query(
        r#"
        SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS function_signature,
               roles.rolname AS grantee
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(rolname)
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND has_function_privilege(roles.rolname, p.oid, 'EXECUTE')
        ORDER BY function_signature, roles.rolname
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit API-executable security definer functions")?;

    Ok(FunctionSecuritySummary {
        public_functions,
        security_definer_functions: security_definer_rows
            .into_iter()
            .map(|row| row.get("function_signature"))
            .collect(),
        api_executable_security_definer_functions: api_executable_rows
            .into_iter()
            .map(|row| FunctionRoleAccess {
                function_signature: row.get("function_signature"),
                grantee: row.get("grantee"),
            })
            .collect(),
    })
}

async fn load_foreign_key_index_summary(
    pool: &sqlx::PgPool,
) -> anyhow::Result<ForeignKeyIndexSummary> {
    let foreign_keys = sqlx::query_scalar(
        r#"
        SELECT count(*)::bigint
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND con.contype = 'f'
        "#,
    )
    .fetch_one(pool)
    .await
    .context("failed to count foreign keys")?;

    let missing_rows = sqlx::query(
        r#"
        WITH foreign_keys AS (
          SELECT con.oid,
                 con.conname AS constraint_name,
                 con.conrelid,
                 source_table.relname AS table_name,
                 target_table.relname AS references_table,
                 con.conkey
          FROM pg_constraint con
          JOIN pg_class source_table ON source_table.oid = con.conrelid
          JOIN pg_namespace source_namespace ON source_namespace.oid = source_table.relnamespace
          JOIN pg_class target_table ON target_table.oid = con.confrelid
          WHERE source_namespace.nspname = 'public'
            AND con.contype = 'f'
        ),
        foreign_key_columns AS (
          SELECT fk.oid,
                 array_agg(att.attname ORDER BY key_position.ordinality) AS column_names
          FROM foreign_keys fk
          JOIN unnest(fk.conkey) WITH ORDINALITY AS key_position(attnum, ordinality) ON true
          JOIN pg_attribute att ON att.attrelid = fk.conrelid
                                  AND att.attnum = key_position.attnum
          GROUP BY fk.oid
        ),
        index_columns AS (
          SELECT idx.indrelid,
                 idx.indexrelid,
                 array_agg(att.attname ORDER BY key_position.ordinality) AS column_names
          FROM pg_index idx
          JOIN unnest(idx.indkey) WITH ORDINALITY AS key_position(attnum, ordinality)
            ON key_position.attnum > 0
          JOIN pg_attribute att ON att.attrelid = idx.indrelid
                                  AND att.attnum = key_position.attnum
          WHERE idx.indisvalid
            AND idx.indisready
          GROUP BY idx.indrelid, idx.indexrelid
        )
        SELECT fk.table_name,
               fk.constraint_name,
               array_to_string(fkc.column_names, ', ') AS columns,
               fk.references_table
        FROM foreign_keys fk
        JOIN foreign_key_columns fkc ON fkc.oid = fk.oid
        WHERE NOT EXISTS (
          SELECT 1
          FROM index_columns ic
          WHERE ic.indrelid = fk.conrelid
            AND ic.column_names[1:array_length(fkc.column_names, 1)] = fkc.column_names
        )
        ORDER BY fk.table_name, fk.constraint_name
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to audit foreign key leading-column indexes")?;

    Ok(ForeignKeyIndexSummary {
        foreign_keys,
        missing_leading_indexes: missing_rows
            .into_iter()
            .map(|row| ForeignKeyIndexGap {
                table: row.get("table_name"),
                constraint_name: row.get("constraint_name"),
                columns: row.get("columns"),
                references_table: row.get("references_table"),
            })
            .collect(),
    })
}

async fn load_data_counts(pool: &sqlx::PgPool) -> anyhow::Result<DataCounts> {
    let row = sqlx::query(
        r#"
        SELECT
          (SELECT count(*)::bigint FROM tenants) AS tenants,
          (SELECT count(*)::bigint FROM users WHERE deleted_at IS NULL) AS users_active,
          (SELECT count(*)::bigint FROM sessions WHERE revoked_at IS NULL AND expires_at > now()) AS sessions_active,
          (SELECT count(*)::bigint FROM condominiums WHERE deleted_at IS NULL) AS condominiums_active,
          (SELECT count(*)::bigint FROM tickets WHERE deleted_at IS NULL) AS tickets_active,
          (SELECT count(*)::bigint FROM documents WHERE deleted_at IS NULL) AS documents_active,
          (SELECT count(*)::bigint FROM file_objects WHERE deleted_at IS NULL) AS file_objects_active,
          (SELECT COALESCE(sum(size_bytes), 0)::bigint FROM file_objects WHERE deleted_at IS NULL) AS file_objects_size_bytes,
          (
            SELECT count(*)::bigint
            FROM documents d
            WHERE d.deleted_at IS NULL
              AND d.storage_key <> ''
              AND NOT EXISTS (
                SELECT 1
                FROM file_objects f
                WHERE f.tenant_id = d.tenant_id
                  AND f.storage_key = d.storage_key
                  AND f.deleted_at IS NULL
              )
          ) AS documents_missing_file_objects,
          (
            SELECT count(*)::bigint
            FROM condominiums
            WHERE deleted_at IS NULL
              AND (name ILIKE '%test%' OR name ILIKE '%smoke%' OR code ILIKE '%test%' OR code ILIKE '%smoke%')
          ) AS possible_test_condominiums,
          (
            SELECT count(*)::bigint
            FROM documents
            WHERE deleted_at IS NULL
              AND (title ILIKE '%test%' OR title ILIKE '%smoke%' OR title ILIKE '%demo%')
          ) AS possible_test_documents
        "#,
    )
    .fetch_one(pool)
    .await
    .context("failed to load safe data counts")?;

    Ok(DataCounts {
        tenants: row.get("tenants"),
        users_active: row.get("users_active"),
        sessions_active: row.get("sessions_active"),
        condominiums_active: row.get("condominiums_active"),
        tickets_active: row.get("tickets_active"),
        documents_active: row.get("documents_active"),
        file_objects_active: row.get("file_objects_active"),
        file_objects_size_bytes: row.get("file_objects_size_bytes"),
        documents_missing_file_objects: row.get("documents_missing_file_objects"),
        possible_test_condominiums: row.get("possible_test_condominiums"),
        possible_test_documents: row.get("possible_test_documents"),
    })
}

async fn load_empty_snapshots(
    pool: &sqlx::PgPool,
    snapshot_tables: &[&str],
) -> anyhow::Result<Vec<EmptySnapshot>> {
    let mut snapshots = Vec::with_capacity(snapshot_tables.len());
    for table in snapshot_tables {
        if !has_payload_column(pool, table).await? {
            continue;
        }

        let sql = format!(
            r#"SELECT count(*)::bigint AS empty_count FROM "{}" WHERE payload = '{{}}'::jsonb"#,
            table.replace('"', "\"\"")
        );
        let empty_count = sqlx::query_scalar(&sql)
            .fetch_one(pool)
            .await
            .with_context(|| format!("failed to count empty snapshots for {table}"))?;
        snapshots.push(EmptySnapshot {
            table: (*table).to_string(),
            empty_count,
        });
    }

    Ok(snapshots)
}

async fn has_payload_column(pool: &sqlx::PgPool, table: &str) -> anyhow::Result<bool> {
    let exists: Option<i32> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'payload'
        "#,
    )
    .bind(table)
    .fetch_optional(pool)
    .await
    .with_context(|| format!("failed to inspect payload column for {table}"))?;

    Ok(exists.is_some())
}

async fn load_migration_summary(pool: &sqlx::PgPool) -> anyhow::Result<MigrationSummary> {
    let local_migrations = MIGRATOR
        .iter()
        .filter(|migration| migration.migration_type.is_up_migration())
        .collect::<Vec<_>>();
    let local_count = usize_to_i64(local_migrations.len());
    let local_latest_version = local_migrations
        .iter()
        .map(|migration| migration.version)
        .max()
        .map(|version| version.to_string());

    if !has_sqlx_migrations_table(pool).await? {
        return Ok(MigrationSummary {
            applied_count: 0,
            latest_version: None,
            local_count,
            local_latest_version,
            missing_local_versions: local_migrations
                .iter()
                .map(|migration| migration_label(migration.version, migration.description.as_ref()))
                .collect(),
            extra_applied_versions: Vec::new(),
            checksum_mismatches: Vec::new(),
            dirty_versions: Vec::new(),
        });
    }

    let rows = sqlx::query(
        r#"
        SELECT version,
               encode(checksum, 'hex') AS checksum_hex,
               success
        FROM _sqlx_migrations
        ORDER BY version
        "#,
    )
    .fetch_all(pool)
    .await
    .context("failed to load migration summary")?;

    let applied_rows = rows
        .into_iter()
        .map(|row| AppliedMigrationAuditRow {
            version: row.get("version"),
            checksum_hex: row.get("checksum_hex"),
            success: row.get("success"),
        })
        .collect::<Vec<_>>();
    let applied_successful = applied_rows
        .iter()
        .filter(|row| row.success)
        .collect::<Vec<_>>();
    let applied_map = applied_successful
        .iter()
        .map(|row| (row.version, *row))
        .collect::<BTreeMap<_, _>>();
    let local_map = local_migrations
        .iter()
        .map(|migration| (migration.version, *migration))
        .collect::<BTreeMap<_, _>>();

    Ok(MigrationSummary {
        applied_count: usize_to_i64(applied_successful.len()),
        latest_version: applied_successful
            .iter()
            .map(|row| row.version)
            .max()
            .map(|version| version.to_string()),
        local_count,
        local_latest_version,
        missing_local_versions: local_map
            .iter()
            .filter(|(version, _)| !applied_map.contains_key(version))
            .map(|(_, migration)| {
                migration_label(migration.version, migration.description.as_ref())
            })
            .collect(),
        extra_applied_versions: applied_map
            .iter()
            .filter(|(version, _)| !local_map.contains_key(version))
            .map(|(_, row)| row.version.to_string())
            .collect(),
        checksum_mismatches: local_map
            .iter()
            .filter_map(|(version, migration)| {
                let applied = applied_map.get(version)?;
                let local_checksum = bytes_to_hex(migration.checksum.as_ref());
                if applied.checksum_hex.eq_ignore_ascii_case(&local_checksum) {
                    None
                } else {
                    Some(migration_label(
                        migration.version,
                        migration.description.as_ref(),
                    ))
                }
            })
            .collect(),
        dirty_versions: applied_rows
            .iter()
            .filter(|row| !row.success)
            .map(|row| row.version.to_string())
            .collect(),
    })
}

async fn has_sqlx_migrations_table(pool: &sqlx::PgPool) -> anyhow::Result<bool> {
    let exists: bool =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations') IS NOT NULL")
            .fetch_one(pool)
            .await
            .context("failed to inspect _sqlx_migrations table")?;

    Ok(exists)
}

fn migration_label(version: i64, description: &str) -> String {
    format!("{version}_{description}")
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(char::from(HEX[usize::from(byte >> 4)]));
        output.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }
    output
}
