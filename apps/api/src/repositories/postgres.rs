use crate::models::store::{
    AccountingPayment, Assembly, AuditLogEntry, CalendarEvent, Condominium, Debt, Document,
    Expense, Inspection, MaintenanceItem, Ocorrencia, OcorrenciaAnexo, OcorrenciaComentario, Quota,
    Receipt, Report, ReserveFund, Session, Supplier, Tenant, Ticket, UserAccount,
};
use anyhow::Context;
use chrono::Utc;
use serde_json::Value;
use sqlx::{migrate::Migrator, postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, Clone)]
pub struct PostgresRepository {
    pool: PgPool,
}

#[derive(Debug, Default)]
pub struct OcorrenciasSnapshot {
    pub ocorrencias: Vec<Ocorrencia>,
    pub comentarios: Vec<OcorrenciaComentario>,
    pub anexos: Vec<OcorrenciaAnexo>,
}

#[derive(Debug, Default)]
pub struct IdentitySnapshot {
    pub tenants: Vec<Tenant>,
    pub users: Vec<UserAccount>,
    pub audit_log: Vec<AuditLogEntry>,
}

#[derive(Debug, Default)]
pub struct OperationalSnapshot {
    pub tickets: Vec<Ticket>,
    pub maintenance: Vec<MaintenanceItem>,
    pub inspections: Vec<Inspection>,
    pub calendar_events: Vec<CalendarEvent>,
    pub assemblies: Vec<Assembly>,
}

#[derive(Debug, Default)]
pub struct DocumentalSnapshot {
    pub suppliers: Vec<Supplier>,
    pub documents: Vec<Document>,
    pub reports: Vec<Report>,
}

#[derive(Debug, Default)]
pub struct FinancialSnapshot {
    pub quotas: Vec<Quota>,
    pub accounting_payments: Vec<AccountingPayment>,
    pub debts: Vec<Debt>,
    pub receipts: Vec<Receipt>,
    pub expenses: Vec<Expense>,
    pub reserve_funds: Vec<ReserveFund>,
}

#[derive(Debug, Clone, Copy)]
pub struct FinancialSnapshotRef<'a> {
    pub quotas: &'a [Quota],
    pub accounting_payments: &'a [AccountingPayment],
    pub debts: &'a [Debt],
    pub receipts: &'a [Receipt],
    pub expenses: &'a [Expense],
    pub reserve_funds: &'a [ReserveFund],
}

impl PostgresRepository {
    pub async fn connect(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(8)
            .connect(database_url)
            .await?;
        Ok(Self { pool })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::migrate::MigrateError> {
        MIGRATOR.run(&self.pool).await
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn load_condominiums(&self, tenant_id: &str) -> anyhow::Result<Vec<Condominium>> {
        #[derive(sqlx::FromRow)]
        struct CondominiumSnapshotRow {
            payload: Value,
        }

        let rows: Vec<CondominiumSnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM condominium_snapshots
            WHERE tenant_id = $1
            ORDER BY name ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load condominium snapshots from postgres")?;

        rows.into_iter()
            .map(|row| {
                serde_json::from_value::<Condominium>(row.payload)
                    .context("failed to decode condominium snapshot payload")
            })
            .collect()
    }

    pub async fn replace_condominiums(
        &self,
        tenant_id: &str,
        condominiums: &[Condominium],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for condominiums")?;

        sqlx::query("DELETE FROM condominium_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear condominium snapshots in postgres")?;

        let now = Utc::now();
        for condominium in condominiums {
            let payload = serde_json::to_value(condominium)
                .context("failed to encode condominium payload for postgres")?;

            sqlx::query(
                r#"
                INSERT INTO condominium_snapshots
                    (id, tenant_id, name, internal_code, status, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&condominium.id)
            .bind(tenant_id)
            .bind(&condominium.name)
            .bind(&condominium.internal_code)
            .bind(&condominium.status)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist condominium snapshot {} in postgres",
                    condominium.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit condominium snapshot transaction in postgres")
    }

    pub async fn load_sessions(&self) -> anyhow::Result<Vec<Session>> {
        #[derive(sqlx::FromRow)]
        struct SessionRow {
            tenant_id: String,
            user_id: String,
            token_hash: String,
            refresh_token_hash: String,
            active_condominium: String,
            app_context: String,
            created_at: chrono::DateTime<Utc>,
            expires_at: chrono::DateTime<Utc>,
            refresh_expires_at: chrono::DateTime<Utc>,
        }

        let rows: Vec<SessionRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, user_id, token_hash, refresh_token_hash,
                   active_condominium, app_context, created_at, expires_at, refresh_expires_at
            FROM app_sessions
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .context("failed to load sessions from postgres")?;

        Ok(rows
            .into_iter()
            .map(|row| Session {
                token: row.token_hash,
                refresh_token: row.refresh_token_hash,
                user_id: row.user_id,
                tenant_id: row.tenant_id,
                active_condominium: row.active_condominium,
                app_context: row.app_context,
                created_at: row.created_at,
                expires_at: row.expires_at,
                refresh_expires_at: row.refresh_expires_at,
            })
            .collect())
    }

    pub async fn replace_sessions(&self, sessions: &[Session]) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for sessions")?;

        sqlx::query("DELETE FROM app_sessions")
            .execute(&mut *tx)
            .await
            .context("failed to clear sessions in postgres")?;

        for session in sessions {
            sqlx::query(
                r#"
                INSERT INTO app_sessions
                    (id, tenant_id, user_id, token_hash, refresh_token_hash, active_condominium,
                     app_context, expires_at, refresh_expires_at, created_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&session.tenant_id)
            .bind(&session.user_id)
            .bind(&session.token)
            .bind(&session.refresh_token)
            .bind(&session.active_condominium)
            .bind(&session.app_context)
            .bind(session.expires_at)
            .bind(session.refresh_expires_at)
            .bind(session.created_at)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist session for user {} in postgres",
                    session.user_id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit sessions transaction in postgres")
    }

    pub async fn load_ocorrencias_snapshot(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<OcorrenciasSnapshot> {
        #[derive(sqlx::FromRow)]
        struct SnapshotRow {
            payload: Value,
        }

        let ocorrencias_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM ocorrencia_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load ocorrencia snapshots from postgres")?;

        let comentarios_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM ocorrencia_comment_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load ocorrencia comments from postgres")?;

        let anexos_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM ocorrencia_attachment_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load ocorrencia attachments from postgres")?;

        let ocorrencias = ocorrencias_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Ocorrencia>(row.payload)
                    .context("failed to decode ocorrencia snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let comentarios = comentarios_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<OcorrenciaComentario>(row.payload)
                    .context("failed to decode ocorrencia comment payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let anexos = anexos_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<OcorrenciaAnexo>(row.payload)
                    .context("failed to decode ocorrencia attachment payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(OcorrenciasSnapshot {
            ocorrencias,
            comentarios,
            anexos,
        })
    }

    pub async fn replace_ocorrencias_snapshot(
        &self,
        tenant_id: &str,
        ocorrencias: &[Ocorrencia],
        comentarios: &[OcorrenciaComentario],
        anexos: &[OcorrenciaAnexo],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencias")?;

        sqlx::query("DELETE FROM ocorrencia_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear ocorrencia snapshots in postgres")?;
        sqlx::query("DELETE FROM ocorrencia_comment_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear ocorrencia comments in postgres")?;
        sqlx::query("DELETE FROM ocorrencia_attachment_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear ocorrencia attachments in postgres")?;

        let now = Utc::now();
        for ocorrencia in ocorrencias {
            let payload = serde_json::to_value(ocorrencia)
                .context("failed to encode ocorrencia payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO ocorrencia_snapshots
                    (id, tenant_id, tipo, status, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&ocorrencia.id)
            .bind(tenant_id)
            .bind(ocorrencia.tipo.as_str())
            .bind(ocorrencia.status.as_str())
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist ocorrencia snapshot {} in postgres",
                    ocorrencia.id
                )
            })?;
        }

        for comentario in comentarios {
            let payload = serde_json::to_value(comentario)
                .context("failed to encode ocorrencia comment payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO ocorrencia_comment_snapshots
                    (id, tenant_id, ocorrencia_id, payload, created_at)
                VALUES
                    ($1, $2, $3, $4, $5)
                "#,
            )
            .bind(&comentario.id)
            .bind(tenant_id)
            .bind(&comentario.ocorrencia_id)
            .bind(payload)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist ocorrencia comment {} in postgres",
                    comentario.id
                )
            })?;
        }

        for anexo in anexos {
            let payload = serde_json::to_value(anexo)
                .context("failed to encode ocorrencia attachment payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO ocorrencia_attachment_snapshots
                    (id, tenant_id, ocorrencia_id, payload, created_at)
                VALUES
                    ($1, $2, $3, $4, $5)
                "#,
            )
            .bind(&anexo.id)
            .bind(tenant_id)
            .bind(&anexo.ocorrencia_id)
            .bind(payload)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist ocorrencia attachment {} in postgres",
                    anexo.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit ocorrencia snapshot transaction in postgres")
    }

    pub async fn load_identity_snapshot(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<IdentitySnapshot> {
        #[derive(sqlx::FromRow)]
        struct SnapshotRow {
            payload: Value,
        }

        let tenant_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM tenant_snapshots
            WHERE id = $1
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load tenant snapshots from postgres")?;

        let user_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM user_snapshots
            WHERE tenant_id = $1
            ORDER BY name ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load user snapshots from postgres")?;

        let audit_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM audit_log_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load audit log snapshots from postgres")?;

        let tenants = tenant_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Tenant>(row.payload)
                    .context("failed to decode tenant snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let users = user_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<UserAccount>(row.payload)
                    .context("failed to decode user snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let audit_log = audit_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<AuditLogEntry>(row.payload)
                    .context("failed to decode audit log snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(IdentitySnapshot {
            tenants,
            users,
            audit_log,
        })
    }

    pub async fn replace_identity_snapshot(
        &self,
        tenant_id: &str,
        tenants: &[Tenant],
        users: &[UserAccount],
        audit_log: &[AuditLogEntry],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for identity snapshots")?;

        sqlx::query("DELETE FROM tenant_snapshots WHERE id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear tenant snapshots in postgres")?;
        sqlx::query("DELETE FROM user_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear user snapshots in postgres")?;
        sqlx::query("DELETE FROM audit_log_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear audit log snapshots in postgres")?;

        let now = Utc::now();
        if let Some(tenant) = tenants.iter().find(|candidate| candidate.id == tenant_id) {
            let payload = serde_json::to_value(tenant)
                .context("failed to encode tenant payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO tenant_snapshots
                    (id, name, slug, status, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&tenant.id)
            .bind(&tenant.name)
            .bind(&tenant.slug)
            .bind(&tenant.status)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist tenant snapshot {} in postgres",
                    tenant.id
                )
            })?;
        }

        for user in users
            .iter()
            .filter(|candidate| candidate.tenant_id == tenant_id)
        {
            let payload =
                serde_json::to_value(user).context("failed to encode user payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO user_snapshots
                    (id, tenant_id, email, role, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&user.id)
            .bind(&user.tenant_id)
            .bind(&user.email)
            .bind(&user.role)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("failed to persist user snapshot {} in postgres", user.id))?;
        }

        for entry in audit_log {
            let payload = serde_json::to_value(entry)
                .context("failed to encode audit log payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO audit_log_snapshots
                    (id, tenant_id, module, action, created_at, payload)
                VALUES
                    ($1, $2, $3, $4, $5, $6)
                "#,
            )
            .bind(&entry.id)
            .bind(tenant_id)
            .bind(&entry.module)
            .bind(&entry.action)
            .bind(entry.created_at)
            .bind(payload)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist audit log snapshot {} in postgres",
                    entry.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit identity snapshot transaction in postgres")
    }

    pub async fn load_operational_snapshot(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<OperationalSnapshot> {
        #[derive(sqlx::FromRow)]
        struct SnapshotRow {
            payload: Value,
        }

        let ticket_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM ticket_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load ticket snapshots from postgres")?;

        let maintenance_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM maintenance_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load maintenance snapshots from postgres")?;

        let inspection_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM inspection_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load inspection snapshots from postgres")?;

        let calendar_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM calendar_event_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load calendar event snapshots from postgres")?;

        let assembly_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM assembly_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load assembly snapshots from postgres")?;

        let tickets = ticket_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Ticket>(row.payload)
                    .context("failed to decode ticket snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let maintenance = maintenance_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<MaintenanceItem>(row.payload)
                    .context("failed to decode maintenance snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let inspections = inspection_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Inspection>(row.payload)
                    .context("failed to decode inspection snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let calendar_events = calendar_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<CalendarEvent>(row.payload)
                    .context("failed to decode calendar event snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let assemblies = assembly_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Assembly>(row.payload)
                    .context("failed to decode assembly snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(OperationalSnapshot {
            tickets,
            maintenance,
            inspections,
            calendar_events,
            assemblies,
        })
    }

    pub async fn replace_operational_snapshot(
        &self,
        tenant_id: &str,
        tickets: &[Ticket],
        maintenance: &[MaintenanceItem],
        inspections: &[Inspection],
        calendar_events: &[CalendarEvent],
        assemblies: &[Assembly],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for operational snapshots")?;

        sqlx::query("DELETE FROM ticket_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear ticket snapshots in postgres")?;
        sqlx::query("DELETE FROM maintenance_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear maintenance snapshots in postgres")?;
        sqlx::query("DELETE FROM inspection_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear inspection snapshots in postgres")?;
        sqlx::query("DELETE FROM calendar_event_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear calendar event snapshots in postgres")?;
        sqlx::query("DELETE FROM assembly_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear assembly snapshots in postgres")?;

        let now = Utc::now();
        for ticket in tickets {
            let payload = serde_json::to_value(ticket)
                .context("failed to encode ticket payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO ticket_snapshots
                    (id, tenant_id, status, priority, condominium, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&ticket.id)
            .bind(tenant_id)
            .bind(&ticket.status)
            .bind(&ticket.priority)
            .bind(&ticket.condominium)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist ticket snapshot {} in postgres",
                    ticket.id
                )
            })?;
        }

        for item in maintenance {
            let payload = serde_json::to_value(item)
                .context("failed to encode maintenance payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO maintenance_snapshots
                    (id, tenant_id, status, kind, condominium, scheduled_start,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&item.id)
            .bind(tenant_id)
            .bind(&item.status)
            .bind(&item.kind)
            .bind(&item.condominium)
            .bind(&item.scheduled_start)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist maintenance snapshot {} in postgres",
                    item.id
                )
            })?;
        }

        for inspection in inspections {
            let payload = serde_json::to_value(inspection)
                .context("failed to encode inspection payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO inspection_snapshots
                    (id, tenant_id, status, required_date, condominium,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&inspection.id)
            .bind(tenant_id)
            .bind(&inspection.status)
            .bind(&inspection.required_date)
            .bind(&inspection.condominium)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist inspection snapshot {} in postgres",
                    inspection.id
                )
            })?;
        }

        for event in calendar_events {
            let payload = serde_json::to_value(event)
                .context("failed to encode calendar event payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO calendar_event_snapshots
                    (id, tenant_id, event_type, status, condominium, start_at,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&event.id)
            .bind(tenant_id)
            .bind(&event.event_type)
            .bind(&event.status)
            .bind(&event.condominium)
            .bind(&event.start_at)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist calendar event snapshot {} in postgres",
                    event.id
                )
            })?;
        }

        for assembly in assemblies {
            let payload = serde_json::to_value(assembly)
                .context("failed to encode assembly payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO assembly_snapshots
                    (id, tenant_id, status, condominium, date, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&assembly.id)
            .bind(tenant_id)
            .bind(&assembly.status)
            .bind(&assembly.condominium)
            .bind(&assembly.date)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist assembly snapshot {} in postgres",
                    assembly.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit operational snapshot transaction in postgres")
    }

    pub async fn load_documental_snapshot(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<DocumentalSnapshot> {
        #[derive(sqlx::FromRow)]
        struct SnapshotRow {
            payload: Value,
        }

        let supplier_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM supplier_snapshots
            WHERE tenant_id = $1
            ORDER BY name ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load supplier snapshots from postgres")?;

        let document_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM document_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load document snapshots from postgres")?;

        let report_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM report_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load report snapshots from postgres")?;

        let suppliers = supplier_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Supplier>(row.payload)
                    .context("failed to decode supplier snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let documents = document_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Document>(row.payload)
                    .context("failed to decode document snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let reports = report_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Report>(row.payload)
                    .context("failed to decode report snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(DocumentalSnapshot {
            suppliers,
            documents,
            reports,
        })
    }

    pub async fn replace_documental_snapshot(
        &self,
        tenant_id: &str,
        suppliers: &[Supplier],
        documents: &[Document],
        reports: &[Report],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for documental snapshots")?;

        sqlx::query("DELETE FROM supplier_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear supplier snapshots in postgres")?;
        sqlx::query("DELETE FROM document_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear document snapshots in postgres")?;
        sqlx::query("DELETE FROM report_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear report snapshots in postgres")?;

        let now = Utc::now();
        for supplier in suppliers {
            let payload = serde_json::to_value(supplier)
                .context("failed to encode supplier payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO supplier_snapshots
                    (id, tenant_id, name, category, status, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&supplier.id)
            .bind(tenant_id)
            .bind(&supplier.name)
            .bind(&supplier.category)
            .bind(&supplier.status)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist supplier snapshot {} in postgres",
                    supplier.id
                )
            })?;
        }

        for document in documents {
            let payload = serde_json::to_value(document)
                .context("failed to encode document payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO document_snapshots
                    (id, tenant_id, kind, status, condominium, uploaded_at,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&document.id)
            .bind(tenant_id)
            .bind(&document.kind)
            .bind(&document.status)
            .bind(&document.condominium)
            .bind(document.uploaded_at)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist document snapshot {} in postgres",
                    document.id
                )
            })?;
        }

        for report in reports {
            let payload = serde_json::to_value(report)
                .context("failed to encode report payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO report_snapshots
                    (id, tenant_id, status, period, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&report.id)
            .bind(tenant_id)
            .bind(&report.status)
            .bind(&report.period)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist report snapshot {} in postgres",
                    report.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit documental snapshot transaction in postgres")
    }

    pub async fn load_financial_snapshot(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<FinancialSnapshot> {
        #[derive(sqlx::FromRow)]
        struct SnapshotRow {
            payload: Value,
        }

        let quota_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM quota_snapshots
            WHERE tenant_id = $1
            ORDER BY due_date ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load quota snapshots from postgres")?;

        let payment_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM accounting_payment_snapshots
            WHERE tenant_id = $1
            ORDER BY paid_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load accounting payment snapshots from postgres")?;

        let debt_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM debt_snapshots
            WHERE tenant_id = $1
            ORDER BY due_date ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load debt snapshots from postgres")?;

        let receipt_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM receipt_snapshots
            WHERE tenant_id = $1
            ORDER BY issued_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load receipt snapshots from postgres")?;

        let expense_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM expense_snapshots
            WHERE tenant_id = $1
            ORDER BY due_date ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load expense snapshots from postgres")?;

        let reserve_fund_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM reserve_fund_snapshots
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load reserve fund snapshots from postgres")?;

        let quotas = quota_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Quota>(row.payload)
                    .context("failed to decode quota snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let accounting_payments = payment_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<AccountingPayment>(row.payload)
                    .context("failed to decode accounting payment snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let debts = debt_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Debt>(row.payload)
                    .context("failed to decode debt snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let receipts = receipt_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Receipt>(row.payload)
                    .context("failed to decode receipt snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let expenses = expense_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Expense>(row.payload)
                    .context("failed to decode expense snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let reserve_funds = reserve_fund_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<ReserveFund>(row.payload)
                    .context("failed to decode reserve fund snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(FinancialSnapshot {
            quotas,
            accounting_payments,
            debts,
            receipts,
            expenses,
            reserve_funds,
        })
    }

    pub async fn replace_financial_snapshot(
        &self,
        tenant_id: &str,
        snapshot: FinancialSnapshotRef<'_>,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for financial snapshots")?;

        sqlx::query("DELETE FROM quota_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear quota snapshots in postgres")?;
        sqlx::query("DELETE FROM accounting_payment_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear accounting payment snapshots in postgres")?;
        sqlx::query("DELETE FROM debt_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear debt snapshots in postgres")?;
        sqlx::query("DELETE FROM receipt_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear receipt snapshots in postgres")?;
        sqlx::query("DELETE FROM expense_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear expense snapshots in postgres")?;
        sqlx::query("DELETE FROM reserve_fund_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear reserve fund snapshots in postgres")?;

        let now = Utc::now();
        for quota in snapshot.quotas {
            let payload = serde_json::to_value(quota)
                .context("failed to encode quota payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO quota_snapshots
                    (id, tenant_id, status, condominium, period, due_date, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&quota.id)
            .bind(tenant_id)
            .bind(&quota.status)
            .bind(&quota.condominium)
            .bind(&quota.period)
            .bind(&quota.due_date)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!("failed to persist quota snapshot {} in postgres", quota.id)
            })?;
        }

        for payment in snapshot.accounting_payments {
            let payload = serde_json::to_value(payment)
                .context("failed to encode accounting payment payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO accounting_payment_snapshots
                    (id, tenant_id, status, condominium, paid_at, method,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&payment.id)
            .bind(tenant_id)
            .bind(&payment.status)
            .bind(&payment.condominium)
            .bind(&payment.paid_at)
            .bind(&payment.method)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist accounting payment snapshot {} in postgres",
                    payment.id
                )
            })?;
        }

        for debt in snapshot.debts {
            let payload =
                serde_json::to_value(debt).context("failed to encode debt payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO debt_snapshots
                    (id, tenant_id, status, condominium, due_date, days_overdue,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&debt.id)
            .bind(tenant_id)
            .bind(&debt.status)
            .bind(&debt.condominium)
            .bind(&debt.due_date)
            .bind(i32::from(debt.days_overdue))
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("failed to persist debt snapshot {} in postgres", debt.id))?;
        }

        for receipt in snapshot.receipts {
            let payload = serde_json::to_value(receipt)
                .context("failed to encode receipt payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO receipt_snapshots
                    (id, tenant_id, status, condominium, number, issued_at, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&receipt.id)
            .bind(tenant_id)
            .bind(&receipt.status)
            .bind(&receipt.condominium)
            .bind(&receipt.number)
            .bind(&receipt.issued_at)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist receipt snapshot {} in postgres",
                    receipt.id
                )
            })?;
        }

        for expense in snapshot.expenses {
            let payload = serde_json::to_value(expense)
                .context("failed to encode expense payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO expense_snapshots
                    (id, tenant_id, status, condominium, category, due_date,
                     payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&expense.id)
            .bind(tenant_id)
            .bind(&expense.status)
            .bind(&expense.condominium)
            .bind(&expense.category)
            .bind(&expense.due_date)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist expense snapshot {} in postgres",
                    expense.id
                )
            })?;
        }

        for reserve_fund in snapshot.reserve_funds {
            let payload = serde_json::to_value(reserve_fund)
                .context("failed to encode reserve fund payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO reserve_fund_snapshots
                    (id, tenant_id, status, condominium, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&reserve_fund.id)
            .bind(tenant_id)
            .bind(&reserve_fund.status)
            .bind(&reserve_fund.condominium)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist reserve fund snapshot {} in postgres",
                    reserve_fund.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit financial snapshot transaction in postgres")
    }
}
