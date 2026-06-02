use crate::models::{
    api::Paginated,
    store::{
        AccountingPayment, Assembly, AuditLogEntry, BankReconciliation, BankTransaction, Building,
        CalendarEvent, CashMovement, ChatMessage, ComentarioVisibilidade, Condominium, Debt,
        Document, Expense, Fraction, Inspection, MaintenanceItem, Ocorrencia, OcorrenciaAnexo,
        OcorrenciaComentario, PaymentAgreement, PublicUser, Quota, Receipt, Report, ReserveFund,
        Resident, Session, Supplier, Tenant, Ticket, UserAccount,
    },
};
use anyhow::{bail, Context};
use chrono::{DateTime, Utc};
use serde::de::DeserializeOwned;
use serde_json::Value;
use sqlx::{migrate::Migrator, postgres::PgPoolOptions, PgPool, Postgres, QueryBuilder};
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
pub struct PropertyStructureSnapshot {
    pub buildings: Vec<Building>,
    pub fractions: Vec<Fraction>,
    pub residents: Vec<Resident>,
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
    pub payment_agreements: Vec<PaymentAgreement>,
    pub cash_movements: Vec<CashMovement>,
    pub bank_transactions: Vec<BankTransaction>,
    pub bank_reconciliations: Vec<BankReconciliation>,
}

#[derive(Debug, Clone, Copy)]
pub struct FinancialSnapshotRef<'a> {
    pub quotas: &'a [Quota],
    pub accounting_payments: &'a [AccountingPayment],
    pub debts: &'a [Debt],
    pub receipts: &'a [Receipt],
    pub expenses: &'a [Expense],
    pub reserve_funds: &'a [ReserveFund],
    pub payment_agreements: &'a [PaymentAgreement],
    pub cash_movements: &'a [CashMovement],
    pub bank_transactions: &'a [BankTransaction],
    pub bank_reconciliations: &'a [BankReconciliation],
}

#[derive(sqlx::FromRow)]
struct MetadataRow {
    metadata: Value,
}

struct MetadataPageQuery<'a> {
    table: &'static str,
    page: usize,
    page_size: usize,
    search: &'a str,
    order_by: &'static str,
    label: &'static str,
}

struct PayloadPageQuery<'a> {
    table: &'static str,
    page: usize,
    page_size: usize,
    search: &'a str,
    order_by: &'static str,
    label: &'static str,
}

#[derive(sqlx::FromRow)]
struct IdNameRow {
    id: String,
    name: String,
}

#[derive(Debug, Clone, Copy)]
pub struct RelationalCondominiumFilter<'a> {
    pub page: usize,
    pub page_size: usize,
    pub search: &'a str,
    pub status: &'a str,
    pub condominium_type: &'a str,
    pub locality: &'a str,
    pub manager: &'a str,
    pub operational_status: &'a str,
    pub incomplete: bool,
    pub has_plant: Option<bool>,
    pub has_equipment: Option<bool>,
    pub include_archived: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct RelationalOcorrenciaFilter<'a> {
    pub page: usize,
    pub page_size: usize,
    pub search: Option<&'a str>,
    pub tipo: Option<&'a str>,
    pub status: Option<&'a str>,
    pub prioridade: Option<&'a str>,
    pub condominium_id: Option<&'a str>,
    pub equipamento_id: Option<&'a str>,
    pub atribuido_a: Option<&'a str>,
}

#[derive(Debug, Clone, Copy)]
pub struct RelationalCalendarEventFilter<'a> {
    pub page: usize,
    pub page_size: usize,
    pub search: &'a str,
    pub condominium: Option<&'a str>,
    pub event_type: Option<&'a str>,
    pub status: Option<&'a str>,
    pub from: Option<&'a str>,
    pub to: Option<&'a str>,
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

    pub async fn load_chat_messages(
        &self,
        tenant_id: &str,
        limit: usize,
    ) -> anyhow::Result<Vec<ChatMessage>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            payload: Value,
        }

        let rows: Vec<Row> = sqlx::query_as(
            r#"
            SELECT payload
            FROM (
                SELECT payload, created_at, inserted_at
                FROM chat_message_snapshots
                WHERE tenant_id = $1
                ORDER BY created_at DESC, inserted_at DESC
                LIMIT $2
            ) latest
            ORDER BY created_at ASC, inserted_at ASC
            "#,
        )
        .bind(tenant_id)
        .bind(i64_from_usize(limit.clamp(1, 500)))
        .fetch_all(&self.pool)
        .await
        .context("failed to load chat messages from postgres")?;

        rows.into_iter()
            .map(|row| {
                serde_json::from_value::<ChatMessage>(row.payload)
                    .context("failed to decode chat message payload")
            })
            .collect()
    }

    pub async fn replace_chat_messages(
        &self,
        tenant_id: &str,
        messages: &[ChatMessage],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for chat messages")?;
        sqlx::query("DELETE FROM chat_message_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear chat messages in postgres")?;

        let now = Utc::now();
        for message in messages {
            upsert_chat_message_rows(&mut tx, tenant_id, message, now).await?;
        }

        trim_chat_messages_rows(&mut tx, tenant_id, 500).await?;
        tx.commit()
            .await
            .context("failed to commit chat messages transaction in postgres")
    }

    pub async fn create_chat_message(
        &self,
        tenant_id: &str,
        message: &ChatMessage,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for chat message")?;
        upsert_chat_message_rows(&mut tx, tenant_id, message, Utc::now()).await?;
        trim_chat_messages_rows(&mut tx, tenant_id, 500).await?;
        tx.commit()
            .await
            .context("failed to commit chat message transaction in postgres")
    }

    pub async fn find_active_session_by_token_hash(
        &self,
        token_hash: &str,
        now: DateTime<Utc>,
    ) -> anyhow::Result<Option<Session>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            tenant_id: String,
            user_id: String,
            token_hash: String,
            refresh_token_hash: String,
            active_condominium: String,
            app_context: String,
            created_at: DateTime<Utc>,
            expires_at: DateTime<Utc>,
            refresh_expires_at: DateTime<Utc>,
        }

        let row: Option<Row> = sqlx::query_as(
            r#"
            SELECT tenant_id, user_id, token_hash, refresh_token_hash,
                   active_condominium, app_context, created_at, expires_at, refresh_expires_at
            FROM app_sessions
            WHERE token_hash = $1 AND expires_at > $2
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(token_hash)
        .bind(now)
        .fetch_optional(&self.pool)
        .await
        .context("failed to find active session in postgres")?;

        Ok(row.map(|row| Session {
            token: row.token_hash,
            refresh_token: row.refresh_token_hash,
            user_id: row.user_id,
            tenant_id: row.tenant_id,
            active_condominium: row.active_condominium,
            app_context: row.app_context,
            created_at: row.created_at,
            expires_at: row.expires_at,
            refresh_expires_at: row.refresh_expires_at,
        }))
    }

    pub async fn find_public_user(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> anyhow::Result<Option<PublicUser>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            id: String,
            tenant_id: String,
            name: String,
            email: String,
            role: String,
            active_condominium_id: String,
        }

        let row: Option<Row> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, name, email, role, active_condominium_id
            FROM users
            WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .context("failed to find relational user in postgres")?;

        let Some(row) = row else {
            return Ok(None);
        };
        let active_condominiums = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)::BIGINT
            FROM condominiums
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .context("failed to count relational user condominiums")?;

        Ok(Some(PublicUser {
            id: row.id,
            tenant_id: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            active_condominium: row.active_condominium_id,
            active_condominiums: usize_from_i64(active_condominiums),
        }))
    }

    pub async fn list_relational_users_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
    ) -> anyhow::Result<Paginated<UserAccount>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            metadata: Value,
        }

        let page = normalized_page(page);
        let page_size = normalized_page_size(page_size);
        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)::BIGINT
            FROM users
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .context("failed to count relational users from postgres")?;

        let rows: Vec<Row> = sqlx::query_as(
            r#"
            SELECT metadata
            FROM users
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY lower(name) ASC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(tenant_id)
        .bind(i64_from_usize(page_size))
        .bind(sql_offset_for(page, page_size))
        .fetch_all(&self.pool)
        .await
        .context("failed to list relational users from postgres")?;

        let items = rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<UserAccount>(row.metadata)
                    .context("failed to decode relational user metadata")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(sql_page(items, page, page_size, total))
    }

    pub async fn list_relational_condominiums_page(
        &self,
        tenant_id: &str,
        filter: &RelationalCondominiumFilter<'_>,
    ) -> anyhow::Result<Paginated<Condominium>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            metadata: Value,
        }

        let page = normalized_page(filter.page);
        let page_size = normalized_page_size(filter.page_size);
        let mut count = QueryBuilder::<Postgres>::new(
            "SELECT COUNT(*)::BIGINT FROM condominiums WHERE tenant_id = ",
        );
        count.push_bind(tenant_id);
        append_condominium_filters(&mut count, filter);
        let total = count
            .build_query_scalar::<i64>()
            .fetch_one(&self.pool)
            .await
            .context("failed to count relational condominiums from postgres")?;

        let mut query =
            QueryBuilder::<Postgres>::new("SELECT metadata FROM condominiums WHERE tenant_id = ");
        query.push_bind(tenant_id);
        append_condominium_filters(&mut query, filter);
        query.push(" ORDER BY lower(name) ASC LIMIT ");
        query.push_bind(i64_from_usize(page_size));
        query.push(" OFFSET ");
        query.push_bind(sql_offset_for(page, page_size));

        let rows: Vec<Row> = query
            .build_query_as()
            .fetch_all(&self.pool)
            .await
            .context("failed to list relational condominiums from postgres")?;

        let items = rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Condominium>(row.metadata)
                    .context("failed to decode relational condominium metadata")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(sql_page(items, page, page_size, total))
    }

    pub async fn list_relational_ocorrencias_page(
        &self,
        tenant_id: &str,
        filter: &RelationalOcorrenciaFilter<'_>,
    ) -> anyhow::Result<Paginated<Ocorrencia>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            metadata: Value,
        }

        let page = normalized_page(filter.page);
        let page_size = normalized_page_size(filter.page_size);
        let mut count = QueryBuilder::<Postgres>::new(
            "SELECT COUNT(*)::BIGINT FROM tickets WHERE tenant_id = ",
        );
        count.push_bind(tenant_id);
        append_ocorrencia_filters(&mut count, filter);
        let total = count
            .build_query_scalar::<i64>()
            .fetch_one(&self.pool)
            .await
            .context("failed to count relational ocorrencias from postgres")?;

        let mut query =
            QueryBuilder::<Postgres>::new("SELECT metadata FROM tickets WHERE tenant_id = ");
        query.push_bind(tenant_id);
        append_ocorrencia_filters(&mut query, filter);
        query.push(" ORDER BY updated_at DESC, created_at DESC LIMIT ");
        query.push_bind(i64_from_usize(page_size));
        query.push(" OFFSET ");
        query.push_bind(sql_offset_for(page, page_size));

        let rows: Vec<Row> = query
            .build_query_as()
            .fetch_all(&self.pool)
            .await
            .context("failed to list relational ocorrencias from postgres")?;

        let items = rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Ocorrencia>(row.metadata)
                    .context("failed to decode relational ocorrencia metadata")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(sql_page(items, page, page_size, total))
    }

    pub async fn list_legacy_tickets_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Ticket>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            payload: Value,
        }

        let page = normalized_page(page);
        let page_size = normalized_page_size(page_size);
        let search = search.trim();

        let mut count = QueryBuilder::<Postgres>::new(
            "SELECT COUNT(*)::BIGINT FROM ticket_snapshots WHERE tenant_id = ",
        );
        count.push_bind(tenant_id);
        if !search.is_empty() {
            count.push(" AND payload::text ILIKE ");
            count.push_bind(like_pattern(search));
        }
        let total = count
            .build_query_scalar::<i64>()
            .fetch_one(&self.pool)
            .await
            .context("failed to count legacy tickets from postgres")?;

        let mut query = QueryBuilder::<Postgres>::new(
            "SELECT payload FROM ticket_snapshots WHERE tenant_id = ",
        );
        query.push_bind(tenant_id);
        if !search.is_empty() {
            query.push(" AND payload::text ILIKE ");
            query.push_bind(like_pattern(search));
        }
        query.push(" ORDER BY updated_at DESC, created_at DESC LIMIT ");
        query.push_bind(i64_from_usize(page_size));
        query.push(" OFFSET ");
        query.push_bind(sql_offset_for(page, page_size));

        let rows: Vec<Row> = query
            .build_query_as()
            .fetch_all(&self.pool)
            .await
            .context("failed to list legacy tickets from postgres")?;

        let items = rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<Ticket>(row.payload)
                    .context("failed to decode legacy ticket payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(sql_page(items, page, page_size, total))
    }

    pub async fn upsert_legacy_ticket(
        &self,
        tenant_id: &str,
        ticket: &Ticket,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for legacy ticket upsert")?;
        upsert_legacy_ticket_snapshot_rows(&mut tx, tenant_id, ticket, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit legacy ticket upsert transaction in postgres")
    }

    pub async fn delete_legacy_ticket(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for legacy ticket delete")?;
        delete_snapshot_by_id(&mut tx, "ticket_snapshots", tenant_id, id, "ticket").await?;
        tx.commit()
            .await
            .context("failed to commit legacy ticket delete transaction in postgres")
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
        sqlx::query(
            r#"
            UPDATE condominiums
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale relational condominiums in postgres")?;

        for condominium in condominiums {
            upsert_condominium_rows(&mut tx, tenant_id, condominium, now).await?;
        }

        tx.commit()
            .await
            .context("failed to commit condominium snapshot transaction in postgres")
    }

    pub async fn upsert_condominium(
        &self,
        tenant_id: &str,
        condominium: &Condominium,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for condominium upsert")?;

        upsert_condominium_rows(&mut tx, tenant_id, condominium, Utc::now()).await?;

        tx.commit()
            .await
            .context("failed to commit condominium upsert transaction in postgres")
    }

    pub async fn delete_condominium(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for condominium delete")?;
        let now = Utc::now();

        sqlx::query("DELETE FROM condominium_snapshots WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(id)
            .execute(&mut *tx)
            .await
            .context("failed to delete condominium snapshot from postgres")?;

        sqlx::query(
            r#"
            UPDATE condominiums
            SET deleted_at = $3, updated_at = $3
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete relational condominium from postgres")?;

        tx.commit()
            .await
            .context("failed to commit condominium delete transaction in postgres")
    }

    pub async fn load_property_structure(
        &self,
        tenant_id: &str,
    ) -> anyhow::Result<PropertyStructureSnapshot> {
        let building_rows: Vec<MetadataRow> = sqlx::query_as(
            r#"
            SELECT metadata
            FROM buildings
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY lower(name) ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load relational buildings from postgres")?;

        let fraction_rows: Vec<MetadataRow> = sqlx::query_as(
            r#"
            SELECT metadata
            FROM fractions
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY lower(code) ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load relational fractions from postgres")?;

        let resident_rows: Vec<MetadataRow> = sqlx::query_as(
            r#"
            SELECT metadata
            FROM residents
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY lower(name) ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load relational residents from postgres")?;

        Ok(PropertyStructureSnapshot {
            buildings: decode_metadata_rows(building_rows, "building")?,
            fractions: decode_metadata_rows(fraction_rows, "fraction")?,
            residents: decode_metadata_rows(resident_rows, "resident")?,
        })
    }

    pub async fn replace_property_structure(
        &self,
        tenant_id: &str,
        buildings: &[Building],
        fractions: &[Fraction],
        residents: &[Resident],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for property structure")?;
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE residents
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale residents in postgres")?;

        sqlx::query(
            r#"
            UPDATE fractions
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale fractions in postgres")?;

        sqlx::query(
            r#"
            UPDATE buildings
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale buildings in postgres")?;

        for building in buildings {
            upsert_building_rows(&mut tx, tenant_id, building, now).await?;
        }
        for fraction in fractions {
            upsert_fraction_rows(&mut tx, tenant_id, fraction, now).await?;
        }
        for resident in residents {
            upsert_resident_rows(&mut tx, tenant_id, resident, now).await?;
        }

        tx.commit()
            .await
            .context("failed to commit property structure transaction in postgres")
    }

    pub async fn list_buildings_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Building>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "buildings",
                page,
                page_size,
                search,
                order_by: "lower(name) ASC",
                label: "building",
            },
        )
        .await
    }

    pub async fn list_fractions_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Fraction>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "fractions",
                page,
                page_size,
                search,
                order_by: "lower(code) ASC",
                label: "fraction",
            },
        )
        .await
    }

    pub async fn list_residents_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Resident>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "residents",
                page,
                page_size,
                search,
                order_by: "lower(name) ASC",
                label: "resident",
            },
        )
        .await
    }

    pub async fn upsert_building(
        &self,
        tenant_id: &str,
        building: &Building,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for building upsert")?;
        upsert_building_rows(&mut tx, tenant_id, building, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit building upsert transaction in postgres")
    }

    pub async fn delete_building(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        soft_delete_by_id(&self.pool, "buildings", tenant_id, id, "building").await
    }

    pub async fn upsert_fraction(
        &self,
        tenant_id: &str,
        fraction: &Fraction,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for fraction upsert")?;
        upsert_fraction_rows(&mut tx, tenant_id, fraction, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit fraction upsert transaction in postgres")
    }

    pub async fn delete_fraction(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        soft_delete_by_id(&self.pool, "fractions", tenant_id, id, "fraction").await
    }

    pub async fn upsert_resident(
        &self,
        tenant_id: &str,
        resident: &Resident,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for resident upsert")?;
        upsert_resident_rows(&mut tx, tenant_id, resident, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit resident upsert transaction in postgres")
    }

    pub async fn delete_resident(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        soft_delete_by_id(&self.pool, "residents", tenant_id, id, "resident").await
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

    pub async fn replace_sessions(
        &self,
        tenant_id: &str,
        sessions: &[Session],
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for sessions")?;

        sqlx::query("DELETE FROM app_sessions WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear tenant sessions in postgres")?;
        sqlx::query("DELETE FROM sessions WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear relational tenant sessions in postgres")?;

        for session in sessions
            .iter()
            .filter(|session| session.tenant_id == tenant_id)
        {
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

            sqlx::query(
                r#"
                INSERT INTO sessions
                    (id, tenant_id, user_id, app_context, token_hash, refresh_token_hash,
                     active_condominium_id, expires_at, refresh_expires_at, created_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&session.tenant_id)
            .bind(&session.user_id)
            .bind(&session.app_context)
            .bind(&session.token)
            .bind(&session.refresh_token)
            .bind(&session.active_condominium)
            .bind(session.expires_at)
            .bind(session.refresh_expires_at)
            .bind(session.created_at)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist relational session for user {} in postgres",
                    session.user_id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit sessions transaction in postgres")
    }

    pub async fn replace_session(
        &self,
        previous: Option<&Session>,
        session: &Session,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for session upsert")?;

        if let Some(previous) = previous {
            sqlx::query(
                r#"
                DELETE FROM app_sessions
                WHERE tenant_id = $1 AND (token_hash = $2 OR refresh_token_hash = $3)
                "#,
            )
            .bind(&previous.tenant_id)
            .bind(&previous.token)
            .bind(&previous.refresh_token)
            .execute(&mut *tx)
            .await
            .context("failed to remove previous app session from postgres")?;

            sqlx::query(
                r#"
                DELETE FROM sessions
                WHERE tenant_id = $1 AND (token_hash = $2 OR refresh_token_hash = $3)
                "#,
            )
            .bind(&previous.tenant_id)
            .bind(&previous.token)
            .bind(&previous.refresh_token)
            .execute(&mut *tx)
            .await
            .context("failed to remove previous relational session from postgres")?;
        }

        sqlx::query(
            r#"
            DELETE FROM app_sessions
            WHERE tenant_id = $1 AND (token_hash = $2 OR refresh_token_hash = $3)
            "#,
        )
        .bind(&session.tenant_id)
        .bind(&session.token)
        .bind(&session.refresh_token)
        .execute(&mut *tx)
        .await
        .context("failed to remove duplicate app session from postgres")?;

        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE tenant_id = $1 AND (token_hash = $2 OR refresh_token_hash = $3)
            "#,
        )
        .bind(&session.tenant_id)
        .bind(&session.token)
        .bind(&session.refresh_token)
        .execute(&mut *tx)
        .await
        .context("failed to remove duplicate relational session from postgres")?;

        insert_session_rows(&mut tx, session).await?;

        tx.commit()
            .await
            .context("failed to commit session upsert transaction in postgres")
    }

    pub async fn delete_session_by_token_hash(
        &self,
        tenant_id: &str,
        token_hash: &str,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for session delete")?;

        sqlx::query("DELETE FROM app_sessions WHERE tenant_id = $1 AND token_hash = $2")
            .bind(tenant_id)
            .bind(token_hash)
            .execute(&mut *tx)
            .await
            .context("failed to delete app session from postgres")?;

        sqlx::query("DELETE FROM sessions WHERE tenant_id = $1 AND token_hash = $2")
            .bind(tenant_id)
            .bind(token_hash)
            .execute(&mut *tx)
            .await
            .context("failed to delete relational session from postgres")?;

        tx.commit()
            .await
            .context("failed to commit session delete transaction in postgres")
    }

    pub async fn update_active_condominium(
        &self,
        tenant_id: &str,
        user_id: &str,
        token_hash: &str,
        active_condominium: &str,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for active condominium update")?;
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE app_sessions
            SET active_condominium = $4
            WHERE tenant_id = $1 AND user_id = $2 AND token_hash = $3
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .bind(token_hash)
        .bind(active_condominium)
        .execute(&mut *tx)
        .await
        .context("failed to update app session active condominium in postgres")?;

        sqlx::query(
            r#"
            UPDATE sessions
            SET active_condominium_id = $4
            WHERE tenant_id = $1 AND user_id = $2 AND token_hash = $3
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .bind(token_hash)
        .bind(active_condominium)
        .execute(&mut *tx)
        .await
        .context("failed to update relational session active condominium in postgres")?;

        let user_result = sqlx::query(
            r#"
            UPDATE users
            SET active_condominium_id = $3, updated_at = $4
            WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .bind(active_condominium)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to update relational user active condominium in postgres")?;
        ensure_changed(
            user_result.rows_affected(),
            "user active condominium",
            user_id,
        )?;

        sqlx::query(
            r#"
            UPDATE user_snapshots
            SET payload = jsonb_set(payload, '{activeCondominium}', to_jsonb($3::text), true),
                updated_at = $4
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .bind(active_condominium)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to update user snapshot active condominium in postgres")?;

        tx.commit()
            .await
            .context("failed to commit active condominium update transaction in postgres")
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
        sqlx::query("DELETE FROM ticket_attachments WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear relational ticket attachments in postgres")?;
        sqlx::query("DELETE FROM ticket_comments WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear relational ticket comments in postgres")?;
        sqlx::query("DELETE FROM ticket_events WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear relational ticket events in postgres")?;
        sqlx::query("DELETE FROM tickets WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear relational tickets in postgres")?;

        let now = Utc::now();
        for ocorrencia in ocorrencias {
            upsert_ocorrencia_rows(&mut tx, tenant_id, ocorrencia, now).await?;
        }

        for comentario in comentarios {
            upsert_ocorrencia_comment_rows(&mut tx, tenant_id, comentario, now).await?;
        }

        for anexo in anexos {
            upsert_ocorrencia_attachment_rows(&mut tx, tenant_id, anexo, now).await?;
        }

        tx.commit()
            .await
            .context("failed to commit ocorrencia snapshot transaction in postgres")
    }

    pub async fn upsert_ocorrencia(
        &self,
        tenant_id: &str,
        ocorrencia: &Ocorrencia,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencia upsert")?;

        upsert_ocorrencia_rows(&mut tx, tenant_id, ocorrencia, Utc::now()).await?;

        tx.commit()
            .await
            .context("failed to commit ocorrencia upsert transaction in postgres")
    }

    pub async fn upsert_ocorrencia_comment(
        &self,
        tenant_id: &str,
        comentario: &OcorrenciaComentario,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencia comment upsert")?;

        upsert_ocorrencia_comment_rows(&mut tx, tenant_id, comentario, Utc::now()).await?;

        tx.commit()
            .await
            .context("failed to commit ocorrencia comment upsert transaction in postgres")
    }

    pub async fn upsert_ocorrencia_attachment(
        &self,
        tenant_id: &str,
        anexo: &OcorrenciaAnexo,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencia attachment upsert")?;

        upsert_ocorrencia_attachment_rows(&mut tx, tenant_id, anexo, Utc::now()).await?;

        tx.commit()
            .await
            .context("failed to commit ocorrencia attachment upsert transaction in postgres")
    }

    pub async fn delete_ocorrencia_attachment(
        &self,
        tenant_id: &str,
        ocorrencia_id: &str,
        attachment_id: &str,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencia attachment delete")?;
        let now = Utc::now();

        sqlx::query(
            r#"
            DELETE FROM ocorrencia_attachment_snapshots
            WHERE tenant_id = $1 AND ocorrencia_id = $2 AND id = $3
            "#,
        )
        .bind(tenant_id)
        .bind(ocorrencia_id)
        .bind(attachment_id)
        .execute(&mut *tx)
        .await
        .context("failed to delete ocorrencia attachment snapshot from postgres")?;

        sqlx::query(
            r#"
            UPDATE ticket_attachments
            SET deleted_at = $4
            WHERE tenant_id = $1 AND ticket_id = $2 AND id = $3
            "#,
        )
        .bind(tenant_id)
        .bind(ocorrencia_id)
        .bind(attachment_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete relational ticket attachment from postgres")?;

        tx.commit()
            .await
            .context("failed to commit ocorrencia attachment delete transaction in postgres")
    }

    pub async fn delete_ocorrencia(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for ocorrencia delete")?;
        let now = Utc::now();

        sqlx::query("DELETE FROM ocorrencia_snapshots WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(id)
            .execute(&mut *tx)
            .await
            .context("failed to delete ocorrencia snapshot from postgres")?;
        sqlx::query(
            "DELETE FROM ocorrencia_comment_snapshots WHERE tenant_id = $1 AND ocorrencia_id = $2",
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&mut *tx)
        .await
        .context("failed to delete ocorrencia comment snapshots from postgres")?;
        sqlx::query("DELETE FROM ocorrencia_attachment_snapshots WHERE tenant_id = $1 AND ocorrencia_id = $2")
            .bind(tenant_id)
            .bind(id)
            .execute(&mut *tx)
            .await
            .context("failed to delete ocorrencia attachment snapshots from postgres")?;

        sqlx::query(
            r#"
            UPDATE tickets
            SET deleted_at = $3, updated_at = $3
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete relational ticket from postgres")?;

        sqlx::query(
            "UPDATE ticket_comments SET deleted_at = $3 WHERE tenant_id = $1 AND ticket_id = $2",
        )
        .bind(tenant_id)
        .bind(id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete relational ticket comments from postgres")?;

        sqlx::query(
            "UPDATE ticket_attachments SET deleted_at = $3 WHERE tenant_id = $1 AND ticket_id = $2",
        )
        .bind(tenant_id)
        .bind(id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete relational ticket attachments from postgres")?;

        tx.commit()
            .await
            .context("failed to commit ocorrencia delete transaction in postgres")
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
            ORDER BY lower(COALESCE(payload->>'name', email)) ASC
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
            sqlx::query(
                r#"
                INSERT INTO tenants
                    (id, name, slug, status, metadata, created_at, updated_at, deleted_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, NULL)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    updated_at = EXCLUDED.updated_at,
                    deleted_at = NULL
                "#,
            )
            .bind(&tenant.id)
            .bind(&tenant.name)
            .bind(&tenant.slug)
            .bind(&tenant.status)
            .bind(
                serde_json::to_value(tenant)
                    .context("failed to encode tenant metadata for relational postgres")?,
            )
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("failed to upsert relational tenant {}", tenant.id))?;
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

            sqlx::query(
                r#"
                INSERT INTO users
                    (id, tenant_id, name, email, role, password_hash, active_condominium_id,
                     metadata, created_at, updated_at, deleted_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)
                ON CONFLICT (id) DO UPDATE SET
                    tenant_id = EXCLUDED.tenant_id,
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    role = EXCLUDED.role,
                    password_hash = EXCLUDED.password_hash,
                    active_condominium_id = EXCLUDED.active_condominium_id,
                    metadata = EXCLUDED.metadata,
                    updated_at = EXCLUDED.updated_at,
                    deleted_at = NULL
                "#,
            )
            .bind(&user.id)
            .bind(&user.tenant_id)
            .bind(&user.name)
            .bind(&user.email)
            .bind(&user.role)
            .bind(&user.password_hash)
            .bind(&user.active_condominium)
            .bind(
                serde_json::to_value(user)
                    .context("failed to encode user metadata for relational postgres")?,
            )
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("failed to upsert relational user {}", user.id))?;
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
        sqlx::query(
            r#"
            UPDATE calendar_events
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale calendar events in postgres")?;
        sqlx::query(
            r#"
            UPDATE inspections
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale inspections in postgres")?;
        sqlx::query(
            r#"
            UPDATE maintenance_items
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale maintenance items in postgres")?;

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
            upsert_maintenance_rows(&mut tx, tenant_id, item, now).await?;
        }

        for inspection in inspections {
            upsert_inspection_rows(&mut tx, tenant_id, inspection, now).await?;
        }

        for event in calendar_events {
            upsert_calendar_event_rows(&mut tx, tenant_id, event, now).await?;
        }

        for assembly in assemblies {
            upsert_assembly_snapshot_rows(&mut tx, tenant_id, assembly, now).await?;
        }

        tx.commit()
            .await
            .context("failed to commit operational snapshot transaction in postgres")
    }

    pub async fn list_assemblies_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Assembly>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "assembly_snapshots",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "assembly",
            },
        )
        .await
    }

    pub async fn list_inspections_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Inspection>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "inspections",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "inspection",
            },
        )
        .await
    }

    pub async fn list_maintenance_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<MaintenanceItem>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "maintenance_items",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "maintenance",
            },
        )
        .await
    }

    pub async fn list_calendar_events_page(
        &self,
        tenant_id: &str,
        filter: RelationalCalendarEventFilter<'_>,
    ) -> anyhow::Result<Paginated<CalendarEvent>> {
        list_calendar_events_filtered(&self.pool, tenant_id, filter).await
    }

    pub async fn upsert_assembly(
        &self,
        tenant_id: &str,
        assembly: &Assembly,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for assembly upsert")?;
        upsert_assembly_snapshot_rows(&mut tx, tenant_id, assembly, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit assembly upsert transaction in postgres")
    }

    pub async fn delete_assembly(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for assembly delete")?;
        delete_snapshot_by_id(&mut tx, "assembly_snapshots", tenant_id, id, "assembly").await?;
        tx.commit()
            .await
            .context("failed to commit assembly delete transaction in postgres")
    }

    pub async fn upsert_inspection(
        &self,
        tenant_id: &str,
        inspection: &Inspection,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for inspection upsert")?;
        upsert_inspection_rows(&mut tx, tenant_id, inspection, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit inspection upsert transaction in postgres")
    }

    pub async fn delete_inspection(
        &self,
        tenant_id: &str,
        id: &str,
        calendar_event_id: Option<&str>,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for inspection delete")?;
        delete_snapshot_by_id(&mut tx, "inspection_snapshots", tenant_id, id, "inspection").await?;
        soft_delete_table_by_id(&mut tx, "inspections", tenant_id, id, "inspection").await?;
        delete_calendar_event_for_inspection(&mut tx, tenant_id, id, calendar_event_id).await?;
        tx.commit()
            .await
            .context("failed to commit inspection delete transaction in postgres")
    }

    pub async fn upsert_maintenance(
        &self,
        tenant_id: &str,
        item: &MaintenanceItem,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for maintenance upsert")?;
        upsert_maintenance_rows(&mut tx, tenant_id, item, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit maintenance upsert transaction in postgres")
    }

    pub async fn delete_maintenance(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for maintenance delete")?;
        delete_snapshot_by_id(
            &mut tx,
            "maintenance_snapshots",
            tenant_id,
            id,
            "maintenance",
        )
        .await?;
        soft_delete_table_by_id(&mut tx, "maintenance_items", tenant_id, id, "maintenance").await?;
        tx.commit()
            .await
            .context("failed to commit maintenance delete transaction in postgres")
    }

    pub async fn upsert_calendar_event(
        &self,
        tenant_id: &str,
        event: &CalendarEvent,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for calendar event upsert")?;
        upsert_calendar_event_rows(&mut tx, tenant_id, event, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit calendar event upsert transaction in postgres")
    }

    pub async fn delete_calendar_event(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for calendar event delete")?;
        delete_snapshot_by_id(
            &mut tx,
            "calendar_event_snapshots",
            tenant_id,
            id,
            "calendar event",
        )
        .await?;
        soft_delete_table_by_id(&mut tx, "calendar_events", tenant_id, id, "calendar event")
            .await?;
        tx.commit()
            .await
            .context("failed to commit calendar event delete transaction in postgres")
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
        sqlx::query(
            r#"
            UPDATE suppliers
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale suppliers in postgres")?;

        sqlx::query(
            r#"
            UPDATE document_links
            SET deleted_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale document links in postgres")?;

        sqlx::query(
            r#"
            UPDATE documents
            SET deleted_at = $2, updated_at = $2
            WHERE tenant_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .context("failed to soft-delete stale documents in postgres")?;

        for supplier in suppliers {
            upsert_supplier_rows(&mut tx, tenant_id, supplier, now).await?;
        }

        for document in documents {
            upsert_document_rows(&mut tx, tenant_id, document, now).await?;
        }

        for report in reports {
            upsert_report_snapshot_rows(&mut tx, tenant_id, report, now).await?;
        }

        tx.commit()
            .await
            .context("failed to commit documental snapshot transaction in postgres")
    }

    pub async fn list_suppliers_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Supplier>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "suppliers",
                page,
                page_size,
                search,
                order_by: "lower(name) ASC",
                label: "supplier",
            },
        )
        .await
    }

    pub async fn list_documents_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Document>> {
        list_metadata_page(
            &self.pool,
            tenant_id,
            MetadataPageQuery {
                table: "documents",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "document",
            },
        )
        .await
    }

    pub async fn list_reports_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Report>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "report_snapshots",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "report",
            },
        )
        .await
    }

    pub async fn upsert_supplier(
        &self,
        tenant_id: &str,
        supplier: &Supplier,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for supplier upsert")?;
        upsert_supplier_rows(&mut tx, tenant_id, supplier, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit supplier upsert transaction in postgres")
    }

    pub async fn delete_supplier(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for supplier delete")?;
        delete_snapshot_by_id(&mut tx, "supplier_snapshots", tenant_id, id, "supplier").await?;
        soft_delete_table_by_id(&mut tx, "suppliers", tenant_id, id, "supplier").await?;
        tx.commit()
            .await
            .context("failed to commit supplier delete transaction in postgres")
    }

    pub async fn upsert_document(
        &self,
        tenant_id: &str,
        document: &Document,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for document upsert")?;
        upsert_document_rows(&mut tx, tenant_id, document, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit document upsert transaction in postgres")
    }

    pub async fn delete_document(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for document delete")?;
        delete_snapshot_by_id(&mut tx, "document_snapshots", tenant_id, id, "document").await?;
        soft_delete_document_rows(&mut tx, tenant_id, id).await?;
        tx.commit()
            .await
            .context("failed to commit document delete transaction in postgres")
    }

    pub async fn upsert_report(&self, tenant_id: &str, report: &Report) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for report upsert")?;
        upsert_report_snapshot_rows(&mut tx, tenant_id, report, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit report upsert transaction in postgres")
    }

    pub async fn delete_report(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for report delete")?;
        delete_snapshot_by_id(&mut tx, "report_snapshots", tenant_id, id, "report").await?;
        tx.commit()
            .await
            .context("failed to commit report delete transaction in postgres")
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

        let payment_agreement_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM payment_agreement_snapshots
            WHERE tenant_id = $1
            ORDER BY next_due_date ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load payment agreement snapshots from postgres")?;

        let cash_movement_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM cash_movement_snapshots
            WHERE tenant_id = $1
            ORDER BY occurred_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load cash movement snapshots from postgres")?;

        let bank_transaction_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM bank_transaction_snapshots
            WHERE tenant_id = $1
            ORDER BY occurred_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load bank transaction snapshots from postgres")?;

        let bank_reconciliation_rows: Vec<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT payload
            FROM bank_reconciliation_snapshots
            WHERE tenant_id = $1
            ORDER BY reconciled_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .context("failed to load bank reconciliation snapshots from postgres")?;

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

        let payment_agreements = payment_agreement_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<PaymentAgreement>(row.payload)
                    .context("failed to decode payment agreement snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let cash_movements = cash_movement_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<CashMovement>(row.payload)
                    .context("failed to decode cash movement snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let bank_transactions = bank_transaction_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<BankTransaction>(row.payload)
                    .context("failed to decode bank transaction snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let bank_reconciliations = bank_reconciliation_rows
            .into_iter()
            .map(|row| {
                serde_json::from_value::<BankReconciliation>(row.payload)
                    .context("failed to decode bank reconciliation snapshot payload")
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(FinancialSnapshot {
            quotas,
            accounting_payments,
            debts,
            receipts,
            expenses,
            reserve_funds,
            payment_agreements,
            cash_movements,
            bank_transactions,
            bank_reconciliations,
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
        sqlx::query("DELETE FROM payment_agreement_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear payment agreement snapshots in postgres")?;
        sqlx::query("DELETE FROM cash_movement_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear cash movement snapshots in postgres")?;
        sqlx::query("DELETE FROM bank_transaction_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear bank transaction snapshots in postgres")?;
        sqlx::query("DELETE FROM bank_reconciliation_snapshots WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .context("failed to clear bank reconciliation snapshots in postgres")?;

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

        for agreement in snapshot.payment_agreements {
            let payload = serde_json::to_value(agreement)
                .context("failed to encode payment agreement payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO payment_agreement_snapshots
                    (id, tenant_id, status, condominium, next_due_date, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&agreement.id)
            .bind(tenant_id)
            .bind(&agreement.status)
            .bind(&agreement.condominium)
            .bind(&agreement.next_due_date)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist payment agreement snapshot {} in postgres",
                    agreement.id
                )
            })?;
        }

        for movement in snapshot.cash_movements {
            let payload = serde_json::to_value(movement)
                .context("failed to encode cash movement payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO cash_movement_snapshots
                    (id, tenant_id, status, condominium, movement_type, account_type, occurred_at, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
            )
            .bind(&movement.id)
            .bind(tenant_id)
            .bind(&movement.status)
            .bind(&movement.condominium)
            .bind(&movement.movement_type)
            .bind(&movement.account_type)
            .bind(&movement.occurred_at)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist cash movement snapshot {} in postgres",
                    movement.id
                )
            })?;
        }

        for transaction in snapshot.bank_transactions {
            let payload = serde_json::to_value(transaction)
                .context("failed to encode bank transaction payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO bank_transaction_snapshots
                    (id, tenant_id, status, condominium, occurred_at, direction, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&transaction.id)
            .bind(tenant_id)
            .bind(&transaction.reconciliation_status)
            .bind(&transaction.condominium)
            .bind(&transaction.occurred_at)
            .bind(&transaction.direction)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist bank transaction snapshot {} in postgres",
                    transaction.id
                )
            })?;
        }

        for reconciliation in snapshot.bank_reconciliations {
            let payload = serde_json::to_value(reconciliation)
                .context("failed to encode bank reconciliation payload for postgres")?;
            sqlx::query(
                r#"
                INSERT INTO bank_reconciliation_snapshots
                    (id, tenant_id, bank_transaction_id, target_type, target_id, reconciled_at, payload, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
            )
            .bind(&reconciliation.id)
            .bind(tenant_id)
            .bind(&reconciliation.bank_transaction_id)
            .bind(&reconciliation.target_type)
            .bind(&reconciliation.target_id)
            .bind(&reconciliation.reconciled_at)
            .bind(payload)
            .bind(now)
            .bind(now)
            .execute(&mut *tx)
            .await
            .with_context(|| {
                format!(
                    "failed to persist bank reconciliation snapshot {} in postgres",
                    reconciliation.id
                )
            })?;
        }

        tx.commit()
            .await
            .context("failed to commit financial snapshot transaction in postgres")
    }

    pub async fn list_quotas_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Quota>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "quota_snapshots",
                page,
                page_size,
                search,
                order_by: "due_date ASC, updated_at DESC",
                label: "quota",
            },
        )
        .await
    }

    pub async fn list_accounting_payments_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<AccountingPayment>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "accounting_payment_snapshots",
                page,
                page_size,
                search,
                order_by: "paid_at DESC, updated_at DESC",
                label: "accounting payment",
            },
        )
        .await
    }

    pub async fn list_debts_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Debt>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "debt_snapshots",
                page,
                page_size,
                search,
                order_by: "due_date ASC, updated_at DESC",
                label: "debt",
            },
        )
        .await
    }

    pub async fn list_receipts_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Receipt>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "receipt_snapshots",
                page,
                page_size,
                search,
                order_by: "issued_at DESC, updated_at DESC",
                label: "receipt",
            },
        )
        .await
    }

    pub async fn list_expenses_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<Expense>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "expense_snapshots",
                page,
                page_size,
                search,
                order_by: "due_date ASC, updated_at DESC",
                label: "expense",
            },
        )
        .await
    }

    pub async fn list_reserve_funds_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<ReserveFund>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "reserve_fund_snapshots",
                page,
                page_size,
                search,
                order_by: "updated_at DESC, created_at DESC",
                label: "reserve fund",
            },
        )
        .await
    }

    pub async fn list_payment_agreements_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<PaymentAgreement>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "payment_agreement_snapshots",
                page,
                page_size,
                search,
                order_by: "next_due_date ASC, updated_at DESC",
                label: "payment agreement",
            },
        )
        .await
    }

    pub async fn list_cash_movements_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<CashMovement>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "cash_movement_snapshots",
                page,
                page_size,
                search,
                order_by: "occurred_at DESC, updated_at DESC",
                label: "cash movement",
            },
        )
        .await
    }

    pub async fn list_bank_transactions_page(
        &self,
        tenant_id: &str,
        page: usize,
        page_size: usize,
        search: &str,
    ) -> anyhow::Result<Paginated<BankTransaction>> {
        list_payload_page(
            &self.pool,
            tenant_id,
            PayloadPageQuery {
                table: "bank_transaction_snapshots",
                page,
                page_size,
                search,
                order_by: "occurred_at DESC, updated_at DESC",
                label: "bank transaction",
            },
        )
        .await
    }

    pub async fn upsert_quota(&self, tenant_id: &str, quota: &Quota) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for quota upsert")?;
        upsert_quota_snapshot_rows(&mut tx, tenant_id, quota, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit quota upsert transaction in postgres")
    }

    pub async fn delete_quota(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        self.delete_financial_snapshot("quota_snapshots", tenant_id, id, "quota")
            .await
    }

    pub async fn upsert_accounting_payment(
        &self,
        tenant_id: &str,
        payment: &AccountingPayment,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for accounting payment upsert")?;
        upsert_accounting_payment_snapshot_rows(&mut tx, tenant_id, payment, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit accounting payment upsert transaction in postgres")
    }

    pub async fn delete_accounting_payment(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        self.delete_financial_snapshot("accounting_payment_snapshots", tenant_id, id, "payment")
            .await
    }

    pub async fn upsert_debt(&self, tenant_id: &str, debt: &Debt) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for debt upsert")?;
        upsert_debt_snapshot_rows(&mut tx, tenant_id, debt, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit debt upsert transaction in postgres")
    }

    pub async fn delete_debt(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        self.delete_financial_snapshot("debt_snapshots", tenant_id, id, "debt")
            .await
    }

    pub async fn upsert_receipt(&self, tenant_id: &str, receipt: &Receipt) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for receipt upsert")?;
        upsert_receipt_snapshot_rows(&mut tx, tenant_id, receipt, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit receipt upsert transaction in postgres")
    }

    pub async fn delete_receipt(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        self.delete_financial_snapshot("receipt_snapshots", tenant_id, id, "receipt")
            .await
    }

    pub async fn upsert_expense(&self, tenant_id: &str, expense: &Expense) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for expense upsert")?;
        upsert_expense_snapshot_rows(&mut tx, tenant_id, expense, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit expense upsert transaction in postgres")
    }

    pub async fn delete_expense(&self, tenant_id: &str, id: &str) -> anyhow::Result<()> {
        self.delete_financial_snapshot("expense_snapshots", tenant_id, id, "expense")
            .await
    }

    pub async fn upsert_payment_agreement(
        &self,
        tenant_id: &str,
        agreement: &PaymentAgreement,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for payment agreement upsert")?;
        upsert_payment_agreement_snapshot_rows(&mut tx, tenant_id, agreement, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit payment agreement upsert transaction in postgres")
    }

    pub async fn upsert_cash_movement(
        &self,
        tenant_id: &str,
        movement: &CashMovement,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for cash movement upsert")?;
        upsert_cash_movement_snapshot_rows(&mut tx, tenant_id, movement, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit cash movement upsert transaction in postgres")
    }

    pub async fn upsert_bank_transaction(
        &self,
        tenant_id: &str,
        transaction: &BankTransaction,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for bank transaction upsert")?;
        upsert_bank_transaction_snapshot_rows(&mut tx, tenant_id, transaction, Utc::now()).await?;
        tx.commit()
            .await
            .context("failed to commit bank transaction upsert transaction in postgres")
    }

    pub async fn create_bank_reconciliation(
        &self,
        tenant_id: &str,
        reconciliation: &BankReconciliation,
        updated_transaction: &BankTransaction,
    ) -> anyhow::Result<()> {
        let mut tx = self
            .pool
            .begin()
            .await
            .context("failed to begin postgres transaction for bank reconciliation")?;

        let existing = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)::BIGINT
            FROM bank_reconciliation_snapshots
            WHERE tenant_id = $1 AND bank_transaction_id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(&reconciliation.bank_transaction_id)
        .fetch_one(&mut *tx)
        .await
        .context("failed to check duplicate bank reconciliation in postgres")?;
        if existing > 0 {
            bail!("bank transaction already reconciled in postgres");
        }

        let now = Utc::now();
        upsert_bank_transaction_snapshot_rows(&mut tx, tenant_id, updated_transaction, now).await?;
        upsert_bank_reconciliation_snapshot_rows(&mut tx, tenant_id, reconciliation, now).await?;

        tx.commit()
            .await
            .context("failed to commit bank reconciliation transaction in postgres")
    }

    async fn delete_financial_snapshot(
        &self,
        table: &'static str,
        tenant_id: &str,
        id: &str,
        label: &'static str,
    ) -> anyhow::Result<()> {
        let mut tx =
            self.pool.begin().await.with_context(|| {
                format!("failed to begin postgres transaction for {label} delete")
            })?;
        delete_snapshot_by_id(&mut tx, table, tenant_id, id, label).await?;
        tx.commit()
            .await
            .with_context(|| format!("failed to commit {label} delete transaction in postgres"))
    }
}

fn timestamp_from_text(value: &str) -> Option<DateTime<Utc>> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    DateTime::parse_from_rfc3339(trimmed)
        .ok()
        .map(|timestamp| timestamp.with_timezone(&Utc))
}

fn numeric_text_from_text(value: &str) -> String {
    let normalized = value.trim().replace(',', ".");
    if normalized.parse::<f64>().is_ok() {
        normalized
    } else {
        "0".to_string()
    }
}

fn comment_visibility(visibility: &ComentarioVisibilidade) -> &'static str {
    match visibility {
        ComentarioVisibilidade::Publico => "public",
        ComentarioVisibilidade::Interno => "internal",
    }
}

fn ticket_attachment_kind(kind: &str) -> &'static str {
    match kind.trim().to_lowercase().as_str() {
        "before" => "before",
        "after" => "after",
        "proof" => "proof",
        _ => "document",
    }
}

fn ticket_attachment_visibility(visibility: &str) -> &'static str {
    match visibility.trim().to_lowercase().as_str() {
        "public" | "publico" | "público" => "public",
        _ => "internal",
    }
}

async fn list_metadata_page<T>(
    pool: &PgPool,
    tenant_id: &str,
    params: MetadataPageQuery<'_>,
) -> anyhow::Result<Paginated<T>>
where
    T: DeserializeOwned,
{
    let page = normalized_page(params.page);
    let page_size = normalized_page_size(params.page_size);
    let search = params.search.trim();

    let mut count = QueryBuilder::<Postgres>::new("SELECT COUNT(*)::BIGINT FROM ");
    count.push(params.table);
    count.push(" WHERE tenant_id = ");
    count.push_bind(tenant_id);
    count.push(" AND deleted_at IS NULL");
    if !search.is_empty() {
        count.push(" AND metadata::text ILIKE ");
        count.push_bind(like_pattern(search));
    }
    let total = count
        .build_query_scalar::<i64>()
        .fetch_one(pool)
        .await
        .with_context(|| format!("failed to count relational {}s from postgres", params.label))?;

    let mut query = QueryBuilder::<Postgres>::new("SELECT metadata FROM ");
    query.push(params.table);
    query.push(" WHERE tenant_id = ");
    query.push_bind(tenant_id);
    query.push(" AND deleted_at IS NULL");
    if !search.is_empty() {
        query.push(" AND metadata::text ILIKE ");
        query.push_bind(like_pattern(search));
    }
    query.push(" ORDER BY ");
    query.push(params.order_by);
    query.push(" LIMIT ");
    query.push_bind(i64_from_usize(page_size));
    query.push(" OFFSET ");
    query.push_bind(sql_offset_for(page, page_size));

    let rows: Vec<MetadataRow> = query
        .build_query_as()
        .fetch_all(pool)
        .await
        .with_context(|| format!("failed to list relational {}s from postgres", params.label))?;

    let items = decode_metadata_rows(rows, params.label)?;
    Ok(sql_page(items, page, page_size, total))
}

fn decode_metadata_rows<T>(rows: Vec<MetadataRow>, label: &str) -> anyhow::Result<Vec<T>>
where
    T: DeserializeOwned,
{
    rows.into_iter()
        .map(|row| {
            serde_json::from_value::<T>(row.metadata)
                .with_context(|| format!("failed to decode relational {label} metadata"))
        })
        .collect()
}

async fn list_payload_page<T>(
    pool: &PgPool,
    tenant_id: &str,
    params: PayloadPageQuery<'_>,
) -> anyhow::Result<Paginated<T>>
where
    T: DeserializeOwned,
{
    #[derive(sqlx::FromRow)]
    struct PayloadRow {
        payload: Value,
    }

    let page = normalized_page(params.page);
    let page_size = normalized_page_size(params.page_size);
    let search = params.search.trim();

    let mut count = QueryBuilder::<Postgres>::new("SELECT COUNT(*)::BIGINT FROM ");
    count.push(params.table);
    count.push(" WHERE tenant_id = ");
    count.push_bind(tenant_id);
    if !search.is_empty() {
        count.push(" AND payload::text ILIKE ");
        count.push_bind(like_pattern(search));
    }
    let total = count
        .build_query_scalar::<i64>()
        .fetch_one(pool)
        .await
        .with_context(|| format!("failed to count {} snapshots from postgres", params.label))?;

    let mut query = QueryBuilder::<Postgres>::new("SELECT payload FROM ");
    query.push(params.table);
    query.push(" WHERE tenant_id = ");
    query.push_bind(tenant_id);
    if !search.is_empty() {
        query.push(" AND payload::text ILIKE ");
        query.push_bind(like_pattern(search));
    }
    query.push(" ORDER BY ");
    query.push(params.order_by);
    query.push(" LIMIT ");
    query.push_bind(i64_from_usize(page_size));
    query.push(" OFFSET ");
    query.push_bind(sql_offset_for(page, page_size));

    let rows: Vec<PayloadRow> = query
        .build_query_as()
        .fetch_all(pool)
        .await
        .with_context(|| format!("failed to list {} snapshots from postgres", params.label))?;

    let items = rows
        .into_iter()
        .map(|row| {
            serde_json::from_value::<T>(row.payload)
                .with_context(|| format!("failed to decode {} snapshot payload", params.label))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    Ok(sql_page(items, page, page_size, total))
}

async fn list_calendar_events_filtered(
    pool: &PgPool,
    tenant_id: &str,
    filter: RelationalCalendarEventFilter<'_>,
) -> anyhow::Result<Paginated<CalendarEvent>> {
    let page = normalized_page(filter.page);
    let page_size = normalized_page_size(filter.page_size);
    let mut count = QueryBuilder::<Postgres>::new(
        "SELECT COUNT(*)::BIGINT FROM calendar_events WHERE tenant_id = ",
    );
    count.push_bind(tenant_id);
    append_calendar_event_filters(&mut count, filter);
    let total = count
        .build_query_scalar::<i64>()
        .fetch_one(pool)
        .await
        .context("failed to count relational calendar events from postgres")?;

    let mut query =
        QueryBuilder::<Postgres>::new("SELECT metadata FROM calendar_events WHERE tenant_id = ");
    query.push_bind(tenant_id);
    append_calendar_event_filters(&mut query, filter);
    query.push(" ORDER BY starts_at ASC NULLS LAST, updated_at DESC LIMIT ");
    query.push_bind(i64_from_usize(page_size));
    query.push(" OFFSET ");
    query.push_bind(sql_offset_for(page, page_size));

    let rows: Vec<MetadataRow> = query
        .build_query_as()
        .fetch_all(pool)
        .await
        .context("failed to list relational calendar events from postgres")?;

    let items = decode_metadata_rows(rows, "calendar event")?;
    Ok(sql_page(items, page, page_size, total))
}

fn append_calendar_event_filters<'a>(
    query: &mut QueryBuilder<'a, Postgres>,
    filter: RelationalCalendarEventFilter<'a>,
) {
    query.push(" AND deleted_at IS NULL");
    let search = filter.search.trim();
    if !search.is_empty() {
        query.push(" AND metadata::text ILIKE ");
        query.push_bind(like_pattern(search));
    }
    if let Some(condominium) = filter
        .condominium
        .map(str::trim)
        .filter(|value| !value.is_empty() && !value.eq_ignore_ascii_case("geral"))
    {
        query.push(" AND lower(metadata->>'condominium') = lower(");
        query.push_bind(condominium);
        query.push(")");
    }
    if let Some(event_type) = filter
        .event_type
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        query.push(" AND lower(event_type) = lower(");
        query.push_bind(event_type);
        query.push(")");
    }
    if let Some(status) = filter
        .status
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        query.push(" AND lower(metadata->>'status') = lower(");
        query.push_bind(status);
        query.push(")");
    }
    if let Some(from) = filter.from.map(str::trim).filter(|value| !value.is_empty()) {
        query.push(" AND coalesce(metadata->>'startAt', '') >= ");
        query.push_bind(from);
    }
    if let Some(to) = filter.to.map(str::trim).filter(|value| !value.is_empty()) {
        query.push(" AND coalesce(metadata->>'startAt', '') <= ");
        query.push_bind(to);
    }
}

async fn soft_delete_by_id(
    pool: &PgPool,
    table: &'static str,
    tenant_id: &str,
    id: &str,
    label: &'static str,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let mut query = QueryBuilder::<Postgres>::new("UPDATE ");
    query.push(table);
    query.push(" SET deleted_at = ");
    query.push_bind(now);
    query.push(", updated_at = ");
    query.push_bind(now);
    query.push(" WHERE tenant_id = ");
    query.push_bind(tenant_id);
    query.push(" AND id = ");
    query.push_bind(id);
    query.push(" AND deleted_at IS NULL");

    let result =
        query.build().execute(pool).await.with_context(|| {
            format!("failed to soft-delete relational {label} {id} in postgres")
        })?;

    if result.rows_affected() == 0 {
        bail!("relational {label} {id} not found in postgres");
    }

    Ok(())
}

async fn resolve_condominium_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    name: &str,
) -> anyhow::Result<String> {
    let rows: Vec<IdNameRow> = sqlx::query_as(
        r#"
        SELECT id, name
        FROM condominiums
        WHERE tenant_id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&mut **tx)
    .await
    .context("failed to resolve condominium relation in postgres")?;

    resolve_id_by_name(rows, name, "condominium")
}

async fn resolve_building_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    condominium_id: &str,
    name: &str,
) -> anyhow::Result<String> {
    let rows: Vec<IdNameRow> = sqlx::query_as(
        r#"
        SELECT id, name
        FROM buildings
        WHERE tenant_id = $1 AND condominium_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(condominium_id)
    .fetch_all(&mut **tx)
    .await
    .context("failed to resolve building relation in postgres")?;

    resolve_id_by_name(rows, name, "building")
}

async fn resolve_fraction_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    condominium_id: &str,
    code: &str,
) -> anyhow::Result<String> {
    #[derive(sqlx::FromRow)]
    struct IdCodeRow {
        id: String,
        code: String,
    }

    let rows: Vec<IdCodeRow> = sqlx::query_as(
        r#"
        SELECT id, code
        FROM fractions
        WHERE tenant_id = $1 AND condominium_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(condominium_id)
    .fetch_all(&mut **tx)
    .await
    .context("failed to resolve fraction relation in postgres")?;

    let target = relation_lookup_key(code);
    rows.into_iter()
        .find(|row| relation_lookup_key(&row.code) == target)
        .map(|row| row.id)
        .ok_or_else(|| anyhow::anyhow!("fraction '{code}' was not found in postgres"))
}

fn resolve_id_by_name(rows: Vec<IdNameRow>, name: &str, label: &str) -> anyhow::Result<String> {
    let target = relation_lookup_key(name);
    rows.into_iter()
        .find(|row| relation_lookup_key(&row.name) == target)
        .map(|row| row.id)
        .ok_or_else(|| anyhow::anyhow!("{label} '{name}' was not found in postgres"))
}

fn relation_lookup_key(value: &str) -> String {
    value
        .chars()
        .filter_map(|character| match character {
            'a'..='z' | '0'..='9' => Some(character),
            'A'..='Z' => Some(character.to_ascii_lowercase()),
            'á' | 'à' | 'â' | 'ã' | 'ä' | 'Á' | 'À' | 'Â' | 'Ã' | 'Ä' => Some('a'),
            'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => Some('e'),
            'í' | 'ì' | 'î' | 'ï' | 'Í' | 'Ì' | 'Î' | 'Ï' => Some('i'),
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' | 'Ó' | 'Ò' | 'Ô' | 'Õ' | 'Ö' => Some('o'),
            'ú' | 'ù' | 'û' | 'ü' | 'Ú' | 'Ù' | 'Û' | 'Ü' => Some('u'),
            'ç' | 'Ç' => Some('c'),
            _ => None,
        })
        .collect()
}

fn ensure_changed(rows_affected: u64, label: &str, id: &str) -> anyhow::Result<()> {
    if rows_affected == 0 {
        bail!("relational {label} {id} was not changed in postgres");
    }
    Ok(())
}

async fn delete_snapshot_by_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    table: &'static str,
    tenant_id: &str,
    id: &str,
    label: &'static str,
) -> anyhow::Result<()> {
    let mut query = QueryBuilder::<Postgres>::new("DELETE FROM ");
    query.push(table);
    query.push(" WHERE tenant_id = ");
    query.push_bind(tenant_id);
    query.push(" AND id = ");
    query.push_bind(id);

    let result = query
        .build()
        .execute(&mut **tx)
        .await
        .with_context(|| format!("failed to delete {label} snapshot {id} from postgres"))?;
    ensure_changed(result.rows_affected(), label, id)
}

async fn soft_delete_table_by_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    table: &'static str,
    tenant_id: &str,
    id: &str,
    label: &'static str,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let mut query = QueryBuilder::<Postgres>::new("UPDATE ");
    query.push(table);
    query.push(" SET deleted_at = ");
    query.push_bind(now);
    query.push(", updated_at = ");
    query.push_bind(now);
    query.push(" WHERE tenant_id = ");
    query.push_bind(tenant_id);
    query.push(" AND id = ");
    query.push_bind(id);
    query.push(" AND deleted_at IS NULL");

    let result =
        query.build().execute(&mut **tx).await.with_context(|| {
            format!("failed to soft-delete relational {label} {id} in postgres")
        })?;

    ensure_changed(result.rows_affected(), label, id)
}

async fn upsert_legacy_ticket_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    ticket: &Ticket,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(ticket).context("failed to encode ticket payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO ticket_snapshots
            (id, tenant_id, status, priority, condominium, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            condominium = EXCLUDED.condominium,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert legacy ticket snapshot {} in postgres",
            ticket.id
        )
    })?;

    Ok(())
}

async fn upsert_chat_message_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    message: &ChatMessage,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(message).context("failed to encode chat message payload")?;
    sqlx::query(
        r#"
        INSERT INTO chat_message_snapshots
            (id, tenant_id, source_app, sender_role, created_at, payload, inserted_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            source_app = EXCLUDED.source_app,
            sender_role = EXCLUDED.sender_role,
            created_at = EXCLUDED.created_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&message.id)
    .bind(tenant_id)
    .bind(&message.source_app)
    .bind(&message.sender_role)
    .bind(&message.created_at)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert chat message snapshot {} in postgres",
            message.id
        )
    })?;

    Ok(())
}

async fn trim_chat_messages_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    limit: usize,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        DELETE FROM chat_message_snapshots
        WHERE tenant_id = $1
          AND id IN (
              SELECT id
              FROM chat_message_snapshots
              WHERE tenant_id = $1
              ORDER BY created_at DESC, inserted_at DESC
              OFFSET $2
          )
        "#,
    )
    .bind(tenant_id)
    .bind(i64_from_usize(limit.clamp(1, 500)))
    .execute(&mut **tx)
    .await
    .context("failed to trim old chat messages in postgres")?;

    Ok(())
}

async fn upsert_quota_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    quota: &Quota,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(quota).context("failed to encode quota payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO quota_snapshots
            (id, tenant_id, status, condominium, period, due_date, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            period = EXCLUDED.period,
            due_date = EXCLUDED.due_date,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert quota snapshot {} in postgres", quota.id))?;

    Ok(())
}

async fn upsert_accounting_payment_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    payment: &AccountingPayment,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(payment)
        .context("failed to encode accounting payment payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO accounting_payment_snapshots
            (id, tenant_id, status, condominium, paid_at, method, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            paid_at = EXCLUDED.paid_at,
            method = EXCLUDED.method,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert accounting payment snapshot {} in postgres",
            payment.id
        )
    })?;

    Ok(())
}

async fn upsert_debt_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    debt: &Debt,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(debt).context("failed to encode debt payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO debt_snapshots
            (id, tenant_id, status, condominium, due_date, days_overdue, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            due_date = EXCLUDED.due_date,
            days_overdue = EXCLUDED.days_overdue,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert debt snapshot {} in postgres", debt.id))?;

    Ok(())
}

async fn upsert_receipt_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    receipt: &Receipt,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(receipt).context("failed to encode receipt payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO receipt_snapshots
            (id, tenant_id, status, condominium, number, issued_at, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            number = EXCLUDED.number,
            issued_at = EXCLUDED.issued_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert receipt snapshot {} in postgres",
            receipt.id
        )
    })?;

    Ok(())
}

async fn upsert_expense_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    expense: &Expense,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(expense).context("failed to encode expense payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO expense_snapshots
            (id, tenant_id, status, condominium, category, due_date, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            category = EXCLUDED.category,
            due_date = EXCLUDED.due_date,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert expense snapshot {} in postgres",
            expense.id
        )
    })?;

    Ok(())
}

async fn upsert_payment_agreement_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    agreement: &PaymentAgreement,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(agreement)
        .context("failed to encode payment agreement payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO payment_agreement_snapshots
            (id, tenant_id, status, condominium, next_due_date, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            next_due_date = EXCLUDED.next_due_date,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&agreement.id)
    .bind(tenant_id)
    .bind(&agreement.status)
    .bind(&agreement.condominium)
    .bind(&agreement.next_due_date)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert payment agreement snapshot {} in postgres",
            agreement.id
        )
    })?;

    Ok(())
}

async fn upsert_cash_movement_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    movement: &CashMovement,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(movement)
        .context("failed to encode cash movement payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO cash_movement_snapshots
            (id, tenant_id, status, condominium, movement_type, account_type, occurred_at, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            movement_type = EXCLUDED.movement_type,
            account_type = EXCLUDED.account_type,
            occurred_at = EXCLUDED.occurred_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&movement.id)
    .bind(tenant_id)
    .bind(&movement.status)
    .bind(&movement.condominium)
    .bind(&movement.movement_type)
    .bind(&movement.account_type)
    .bind(&movement.occurred_at)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert cash movement snapshot {} in postgres",
            movement.id
        )
    })?;

    Ok(())
}

async fn upsert_bank_transaction_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    transaction: &BankTransaction,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(transaction)
        .context("failed to encode bank transaction payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO bank_transaction_snapshots
            (id, tenant_id, status, condominium, occurred_at, direction, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            occurred_at = EXCLUDED.occurred_at,
            direction = EXCLUDED.direction,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&transaction.id)
    .bind(tenant_id)
    .bind(&transaction.reconciliation_status)
    .bind(&transaction.condominium)
    .bind(&transaction.occurred_at)
    .bind(&transaction.direction)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert bank transaction snapshot {} in postgres",
            transaction.id
        )
    })?;

    Ok(())
}

async fn upsert_bank_reconciliation_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    reconciliation: &BankReconciliation,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(reconciliation)
        .context("failed to encode bank reconciliation payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO bank_reconciliation_snapshots
            (id, tenant_id, bank_transaction_id, target_type, target_id, reconciled_at, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            bank_transaction_id = EXCLUDED.bank_transaction_id,
            target_type = EXCLUDED.target_type,
            target_id = EXCLUDED.target_id,
            reconciled_at = EXCLUDED.reconciled_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&reconciliation.id)
    .bind(tenant_id)
    .bind(&reconciliation.bank_transaction_id)
    .bind(&reconciliation.target_type)
    .bind(&reconciliation.target_id)
    .bind(&reconciliation.reconciled_at)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert bank reconciliation snapshot {} in postgres",
            reconciliation.id
        )
    })?;

    Ok(())
}

async fn upsert_supplier_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    supplier: &Supplier,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(supplier).context("failed to encode supplier payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO supplier_snapshots
            (id, tenant_id, name, category, status, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            status = EXCLUDED.status,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&supplier.id)
    .bind(tenant_id)
    .bind(&supplier.name)
    .bind(&supplier.category)
    .bind(&supplier.status)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist supplier snapshot {} in postgres",
            supplier.id
        )
    })?;

    let (email, phone) = supplier_contact_parts(&supplier.contact);
    sqlx::query(
        r#"
        INSERT INTO suppliers
            (id, tenant_id, name, tax_id, email, phone, category, metadata,
             created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, '', $4, $5, $6, $7, $8, $9, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            category = EXCLUDED.category,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&supplier.id)
    .bind(tenant_id)
    .bind(&supplier.name)
    .bind(email)
    .bind(phone)
    .bind(&supplier.category)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert supplier {} in postgres", supplier.id))?;

    Ok(())
}

async fn upsert_document_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    document: &Document,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(document).context("failed to encode document payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO document_snapshots
            (id, tenant_id, kind, status, condominium, uploaded_at,
             payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            kind = EXCLUDED.kind,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            uploaded_at = EXCLUDED.uploaded_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&document.id)
    .bind(tenant_id)
    .bind(&document.kind)
    .bind(&document.status)
    .bind(&document.condominium)
    .bind(document.uploaded_at)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist document snapshot {} in postgres",
            document.id
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO documents
            (id, tenant_id, title, document_type, storage_key, visibility,
             metadata, created_by, updated_by, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, 'internal', $6, NULL, NULL, $7, $8, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            title = EXCLUDED.title,
            document_type = EXCLUDED.document_type,
            storage_key = EXCLUDED.storage_key,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&document.id)
    .bind(tenant_id)
    .bind(&document.title)
    .bind(&document.kind)
    .bind(&document.storage_key)
    .bind(payload)
    .bind(document.uploaded_at.unwrap_or(now))
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert document {} in postgres", document.id))?;

    refresh_document_condominium_link(tx, tenant_id, document, now).await
}

async fn upsert_report_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    report: &Report,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(report).context("failed to encode report payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO report_snapshots
            (id, tenant_id, status, period, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            period = EXCLUDED.period,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&report.id)
    .bind(tenant_id)
    .bind(&report.status)
    .bind(&report.period)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist report snapshot {} in postgres",
            report.id
        )
    })?;

    Ok(())
}

async fn soft_delete_document_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    id: &str,
) -> anyhow::Result<()> {
    let now = Utc::now();
    sqlx::query(
        r#"
        UPDATE document_links
        SET deleted_at = $3
        WHERE tenant_id = $1 AND document_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(id)
    .bind(now)
    .execute(&mut **tx)
    .await
    .context("failed to soft-delete document links in postgres")?;

    let result = sqlx::query(
        r#"
        UPDATE documents
        SET deleted_at = $3, updated_at = $3
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(id)
    .bind(now)
    .execute(&mut **tx)
    .await
    .context("failed to soft-delete document in postgres")?;

    ensure_changed(result.rows_affected(), "document", id)
}

async fn refresh_document_condominium_link(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    document: &Document,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        UPDATE document_links
        SET deleted_at = $3
        WHERE tenant_id = $1 AND document_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(&document.id)
    .bind(now)
    .execute(&mut **tx)
    .await
    .context("failed to clear document links in postgres")?;

    let Some(condominium_id) =
        resolve_optional_condominium_id(tx, tenant_id, &document.condominium).await?
    else {
        return Ok(());
    };
    let link_id = format!("{}:condominium", document.id);

    sqlx::query(
        r#"
        INSERT INTO document_links
            (id, tenant_id, document_id, target_type, target_id, created_at, deleted_at)
        VALUES
            ($1, $2, $3, 'condominium', $4, $5, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            document_id = EXCLUDED.document_id,
            target_type = EXCLUDED.target_type,
            target_id = EXCLUDED.target_id,
            deleted_at = NULL
        "#,
    )
    .bind(link_id)
    .bind(tenant_id)
    .bind(&document.id)
    .bind(condominium_id)
    .bind(now)
    .execute(&mut **tx)
    .await
    .context("failed to upsert document condominium link in postgres")?;

    Ok(())
}

async fn resolve_optional_condominium_id(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    name: &str,
) -> anyhow::Result<Option<String>> {
    if name.trim().is_empty() || name.trim().eq_ignore_ascii_case("geral") {
        return Ok(None);
    }

    match resolve_condominium_id(tx, tenant_id, name).await {
        Ok(id) => Ok(Some(id)),
        Err(_) => Ok(None),
    }
}

fn supplier_contact_parts(contact: &str) -> (String, String) {
    let trimmed = contact.trim();
    if trimmed.contains('@') {
        (trimmed.to_string(), String::new())
    } else {
        (String::new(), trimmed.to_string())
    }
}

async fn upsert_maintenance_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    item: &MaintenanceItem,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(item).context("failed to encode maintenance payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO maintenance_snapshots
            (id, tenant_id, status, kind, condominium, scheduled_start,
             payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            kind = EXCLUDED.kind,
            condominium = EXCLUDED.condominium,
            scheduled_start = EXCLUDED.scheduled_start,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&item.id)
    .bind(tenant_id)
    .bind(&item.status)
    .bind(&item.kind)
    .bind(&item.condominium)
    .bind(&item.scheduled_start)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist maintenance snapshot {} in postgres",
            item.id
        )
    })?;

    let condominium_id = resolve_optional_condominium_id(tx, tenant_id, &item.condominium).await?;
    sqlx::query(
        r#"
        INSERT INTO maintenance_items
            (id, tenant_id, condominium_id, equipment_id, title, status, due_at,
             metadata, created_by, updated_by, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3,
             (SELECT id FROM equipment WHERE tenant_id = $2 AND id = $4 AND deleted_at IS NULL),
             $5, $6, $7, $8, NULL, NULL, $9, $10, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            equipment_id = EXCLUDED.equipment_id,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            due_at = EXCLUDED.due_at,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&item.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(&item.equipment_id)
    .bind(&item.title)
    .bind(&item.status)
    .bind(timestamp_from_text(&item.scheduled_start).or_else(|| timestamp_from_text(&item.date)))
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert maintenance item {} in postgres", item.id))?;

    Ok(())
}

async fn upsert_inspection_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    inspection: &Inspection,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(inspection)
        .context("failed to encode inspection payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO inspection_snapshots
            (id, tenant_id, status, required_date, condominium,
             payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            required_date = EXCLUDED.required_date,
            condominium = EXCLUDED.condominium,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&inspection.id)
    .bind(tenant_id)
    .bind(&inspection.status)
    .bind(&inspection.required_date)
    .bind(&inspection.condominium)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist inspection snapshot {} in postgres",
            inspection.id
        )
    })?;

    let condominium_id =
        resolve_optional_condominium_id(tx, tenant_id, &inspection.condominium).await?;
    sqlx::query(
        r#"
        INSERT INTO inspections
            (id, tenant_id, condominium_id, assigned_worker_id, title, status,
             scheduled_at, metadata, created_by, updated_by, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3,
             (SELECT id FROM users WHERE tenant_id = $2 AND id = $4 AND deleted_at IS NULL),
             $5, $6, $7, $8, NULL, NULL, $9, $10, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            assigned_worker_id = EXCLUDED.assigned_worker_id,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            scheduled_at = EXCLUDED.scheduled_at,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&inspection.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(&inspection.assigned_worker_id)
    .bind(&inspection.title)
    .bind(&inspection.status)
    .bind(timestamp_from_text(&inspection.required_date))
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert inspection {} in postgres", inspection.id))?;

    Ok(())
}

async fn upsert_calendar_event_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    event: &CalendarEvent,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(event)
        .context("failed to encode calendar event payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO calendar_event_snapshots
            (id, tenant_id, event_type, status, condominium, start_at,
             payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            event_type = EXCLUDED.event_type,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            start_at = EXCLUDED.start_at,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&event.id)
    .bind(tenant_id)
    .bind(&event.event_type)
    .bind(&event.status)
    .bind(&event.condominium)
    .bind(&event.start_at)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist calendar event snapshot {} in postgres",
            event.id
        )
    })?;

    let condominium_id = resolve_optional_condominium_id(tx, tenant_id, &event.condominium).await?;
    sqlx::query(
        r#"
        INSERT INTO calendar_events
            (id, tenant_id, condominium_id, title, event_type, starts_at, ends_at,
             metadata, created_by, updated_by, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, $9, $10, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            title = EXCLUDED.title,
            event_type = EXCLUDED.event_type,
            starts_at = EXCLUDED.starts_at,
            ends_at = EXCLUDED.ends_at,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&event.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(&event.title)
    .bind(&event.event_type)
    .bind(timestamp_from_text(&event.start_at))
    .bind(timestamp_from_text(&event.end_at))
    .bind(payload)
    .bind(timestamp_from_text(&event.created_at).unwrap_or(now))
    .bind(timestamp_from_text(&event.updated_at).unwrap_or(now))
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert calendar event {} in postgres", event.id))?;

    Ok(())
}

async fn upsert_assembly_snapshot_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    assembly: &Assembly,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(assembly).context("failed to encode assembly payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO assembly_snapshots
            (id, tenant_id, status, condominium, date, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            condominium = EXCLUDED.condominium,
            date = EXCLUDED.date,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist assembly snapshot {} in postgres",
            assembly.id
        )
    })?;

    Ok(())
}

async fn delete_calendar_event_for_inspection(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    inspection_id: &str,
    calendar_event_id: Option<&str>,
) -> anyhow::Result<()> {
    if let Some(event_id) = calendar_event_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        delete_calendar_event_rows(tx, tenant_id, event_id).await?;
        return Ok(());
    }

    let event_ids: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM calendar_events
        WHERE tenant_id = $1
          AND metadata->>'linkedEntityType' = 'inspection'
          AND metadata->>'linkedEntityId' = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(inspection_id)
    .fetch_all(&mut **tx)
    .await
    .context("failed to find calendar events for inspection in postgres")?;

    for event_id in event_ids {
        delete_calendar_event_rows(tx, tenant_id, &event_id).await?;
    }

    Ok(())
}

async fn delete_calendar_event_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    id: &str,
) -> anyhow::Result<()> {
    delete_snapshot_by_id(
        tx,
        "calendar_event_snapshots",
        tenant_id,
        id,
        "calendar event",
    )
    .await?;
    soft_delete_table_by_id(tx, "calendar_events", tenant_id, id, "calendar event").await
}

async fn upsert_condominium_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    condominium: &Condominium,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(condominium)
        .context("failed to encode condominium payload for postgres")?;

    sqlx::query(
        r#"
        INSERT INTO condominium_snapshots
            (id, tenant_id, name, internal_code, status, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            name = EXCLUDED.name,
            internal_code = EXCLUDED.internal_code,
            status = EXCLUDED.status,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&condominium.id)
    .bind(tenant_id)
    .bind(&condominium.name)
    .bind(&condominium.internal_code)
    .bind(&condominium.status)
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist condominium snapshot {} in postgres",
            condominium.id
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO condominiums
            (id, tenant_id, name, internal_code, external_reference, status, location,
             manager_user_id, metadata, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            name = EXCLUDED.name,
            internal_code = EXCLUDED.internal_code,
            external_reference = EXCLUDED.external_reference,
            status = EXCLUDED.status,
            location = EXCLUDED.location,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&condominium.id)
    .bind(tenant_id)
    .bind(&condominium.name)
    .bind(&condominium.internal_code)
    .bind(&condominium.external_reference)
    .bind(&condominium.status)
    .bind(&condominium.location)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to upsert relational condominium {} in postgres",
            condominium.id
        )
    })?;

    Ok(())
}

async fn upsert_building_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    building: &Building,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(building).context("failed to encode building payload for postgres")?;
    let condominium_id = resolve_condominium_id(tx, tenant_id, &building.condominium).await?;
    let result = sqlx::query(
        r#"
        INSERT INTO buildings
            (id, tenant_id, condominium_id, name, metadata, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            name = EXCLUDED.name,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&building.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(&building.name)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert building {} in postgres", building.id))?;

    ensure_changed(result.rows_affected(), "building", &building.id)?;

    Ok(())
}

async fn upsert_fraction_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    fraction: &Fraction,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(fraction).context("failed to encode fraction payload for postgres")?;
    let condominium_id = resolve_condominium_id(tx, tenant_id, &fraction.condominium).await?;
    let building_id =
        resolve_building_id(tx, tenant_id, &condominium_id, &fraction.building).await?;
    let result = sqlx::query(
        r#"
        INSERT INTO fractions
            (id, tenant_id, condominium_id, building_id, code, floor, permillage,
             metadata, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            building_id = EXCLUDED.building_id,
            code = EXCLUDED.code,
            floor = EXCLUDED.floor,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&fraction.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(building_id)
    .bind(&fraction.number)
    .bind(&fraction.floor)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert fraction {} in postgres", fraction.id))?;

    ensure_changed(result.rows_affected(), "fraction", &fraction.id)?;

    Ok(())
}

async fn upsert_resident_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    resident: &Resident,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload =
        serde_json::to_value(resident).context("failed to encode resident payload for postgres")?;
    let condominium_id = resolve_condominium_id(tx, tenant_id, &resident.condominium).await?;
    let fraction_id =
        resolve_fraction_id(tx, tenant_id, &condominium_id, &resident.fraction).await?;
    let result = sqlx::query(
        r#"
        INSERT INTO residents
            (id, tenant_id, condominium_id, fraction_id, name, email, phone, role,
             metadata, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            fraction_id = EXCLUDED.fraction_id,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&resident.id)
    .bind(tenant_id)
    .bind(condominium_id)
    .bind(fraction_id)
    .bind(&resident.name)
    .bind(&resident.email)
    .bind(&resident.phone)
    .bind(&resident.status)
    .bind(payload)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| format!("failed to upsert resident {} in postgres", resident.id))?;

    ensure_changed(result.rows_affected(), "resident", &resident.id)?;

    Ok(())
}

async fn upsert_ocorrencia_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    ocorrencia: &Ocorrencia,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(ocorrencia)
        .context("failed to encode ocorrencia payload for postgres")?;
    sqlx::query(
        r#"
        INSERT INTO ocorrencia_snapshots
            (id, tenant_id, tipo, status, payload, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            tipo = EXCLUDED.tipo,
            status = EXCLUDED.status,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&ocorrencia.id)
    .bind(tenant_id)
    .bind(ocorrencia.tipo.as_str())
    .bind(ocorrencia.status.as_str())
    .bind(payload.clone())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist ocorrencia snapshot {} in postgres",
            ocorrencia.id
        )
    })?;

    let created_at = timestamp_from_text(&ocorrencia.criado_em).unwrap_or(now);
    let updated_at = timestamp_from_text(&ocorrencia.atualizado_em).unwrap_or(now);
    sqlx::query(
        r#"
        INSERT INTO tickets
            (id, tenant_id, condominium_id, fraction_id, resident_id, supplier_id,
             zone_id, equipment_id, title, description, category, "type", status,
             priority, impact, urgency, origin_channel, requester_name, requester_email,
             requester_phone, assigned_worker_id, public_status_text,
             public_timeline_status, technical_notes, estimated_cost, final_cost,
             work_started_at, work_paused_at, arrived_at, resolved_by_worker_at,
             resolved_at, closed_at, requires_hq_validation, hq_validation_status,
             hq_validation_notes, qr_source_type, qr_source_id, metadata,
             created_by, updated_by, created_at, updated_at, deleted_at)
        VALUES
            ($1, $2,
             (SELECT id FROM condominiums WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL),
             NULL, NULL, NULL, NULL, NULL, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15,
             (SELECT id FROM users WHERE tenant_id = $2 AND id = $16 AND deleted_at IS NULL),
             $17, $18, $19, $20::numeric, $21::numeric,
             $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
             NULL, NULL, $34, $35, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            condominium_id = EXCLUDED.condominium_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            "type" = EXCLUDED."type",
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            impact = EXCLUDED.impact,
            urgency = EXCLUDED.urgency,
            origin_channel = EXCLUDED.origin_channel,
            requester_name = EXCLUDED.requester_name,
            requester_email = EXCLUDED.requester_email,
            requester_phone = EXCLUDED.requester_phone,
            assigned_worker_id = EXCLUDED.assigned_worker_id,
            public_status_text = EXCLUDED.public_status_text,
            public_timeline_status = EXCLUDED.public_timeline_status,
            technical_notes = EXCLUDED.technical_notes,
            estimated_cost = EXCLUDED.estimated_cost,
            final_cost = EXCLUDED.final_cost,
            work_started_at = EXCLUDED.work_started_at,
            work_paused_at = EXCLUDED.work_paused_at,
            arrived_at = EXCLUDED.arrived_at,
            resolved_by_worker_at = EXCLUDED.resolved_by_worker_at,
            resolved_at = EXCLUDED.resolved_at,
            closed_at = EXCLUDED.closed_at,
            requires_hq_validation = EXCLUDED.requires_hq_validation,
            hq_validation_status = EXCLUDED.hq_validation_status,
            hq_validation_notes = EXCLUDED.hq_validation_notes,
            qr_source_type = EXCLUDED.qr_source_type,
            qr_source_id = EXCLUDED.qr_source_id,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        "#,
    )
    .bind(&ocorrencia.id)
    .bind(tenant_id)
    .bind(&ocorrencia.condominium_id)
    .bind(&ocorrencia.titulo)
    .bind(&ocorrencia.descricao)
    .bind(&ocorrencia.categoria)
    .bind(ocorrencia.tipo.as_str())
    .bind(ocorrencia.status.as_str())
    .bind(ocorrencia.prioridade.as_str())
    .bind(format!("{:?}", ocorrencia.impacto))
    .bind(format!("{:?}", ocorrencia.urgencia))
    .bind(&ocorrencia.origin_channel)
    .bind(&ocorrencia.requisitante_nome)
    .bind(&ocorrencia.requisitante_email)
    .bind(&ocorrencia.requisitante_telefone)
    .bind(&ocorrencia.assigned_worker_id)
    .bind(&ocorrencia.public_status_text)
    .bind(&ocorrencia.public_timeline_status)
    .bind(&ocorrencia.technical_notes)
    .bind(numeric_text_from_text(&ocorrencia.custo_estimado))
    .bind(numeric_text_from_text(&ocorrencia.custo_final))
    .bind(timestamp_from_text(&ocorrencia.work_started_at))
    .bind(timestamp_from_text(&ocorrencia.work_paused_at))
    .bind(timestamp_from_text(&ocorrencia.arrived_at))
    .bind(timestamp_from_text(&ocorrencia.resolved_by_worker_at))
    .bind(timestamp_from_text(&ocorrencia.resolvido_em))
    .bind(timestamp_from_text(&ocorrencia.fechado_em))
    .bind(ocorrencia.requires_hq_validation)
    .bind(&ocorrencia.hq_validation_status)
    .bind(&ocorrencia.hq_validation_notes)
    .bind(&ocorrencia.qr_source_type)
    .bind(&ocorrencia.qr_source_id)
    .bind(payload)
    .bind(created_at)
    .bind(updated_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist relational ticket {} in postgres",
            ocorrencia.id
        )
    })?;

    Ok(())
}

async fn upsert_ocorrencia_comment_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    comentario: &OcorrenciaComentario,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(comentario)
        .context("failed to encode ocorrencia comment payload for postgres")?;
    let created_at = timestamp_from_text(&comentario.criado_em).unwrap_or(now);

    sqlx::query(
        r#"
        INSERT INTO ocorrencia_comment_snapshots
            (id, tenant_id, ocorrencia_id, payload, created_at)
        VALUES
            ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            ocorrencia_id = EXCLUDED.ocorrencia_id,
            payload = EXCLUDED.payload,
            created_at = EXCLUDED.created_at
        "#,
    )
    .bind(&comentario.id)
    .bind(tenant_id)
    .bind(&comentario.ocorrencia_id)
    .bind(payload)
    .bind(created_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist ocorrencia comment {} in postgres",
            comentario.id
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO ticket_comments
            (id, tenant_id, ticket_id, author_id, author_name, body, visibility, created_at, deleted_at)
        VALUES
            ($1, $2, $3,
             (SELECT id FROM users WHERE tenant_id = $2 AND id = $4 AND deleted_at IS NULL),
             $5, $6, $7, $8, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            ticket_id = EXCLUDED.ticket_id,
            author_id = EXCLUDED.author_id,
            author_name = EXCLUDED.author_name,
            body = EXCLUDED.body,
            visibility = EXCLUDED.visibility,
            created_at = EXCLUDED.created_at,
            deleted_at = NULL
        "#,
    )
    .bind(&comentario.id)
    .bind(tenant_id)
    .bind(&comentario.ocorrencia_id)
    .bind(&comentario.autor_id)
    .bind(&comentario.autor_nome)
    .bind(&comentario.texto)
    .bind(comment_visibility(&comentario.visibilidade))
    .bind(created_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist relational ticket comment {} in postgres",
            comentario.id
        )
    })?;

    Ok(())
}

async fn upsert_ocorrencia_attachment_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    tenant_id: &str,
    anexo: &OcorrenciaAnexo,
    now: DateTime<Utc>,
) -> anyhow::Result<()> {
    let payload = serde_json::to_value(anexo)
        .context("failed to encode ocorrencia attachment payload for postgres")?;
    let created_at = timestamp_from_text(&anexo.criado_em).unwrap_or(now);

    sqlx::query(
        r#"
        INSERT INTO ocorrencia_attachment_snapshots
            (id, tenant_id, ocorrencia_id, payload, created_at)
        VALUES
            ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            ocorrencia_id = EXCLUDED.ocorrencia_id,
            payload = EXCLUDED.payload,
            created_at = EXCLUDED.created_at
        "#,
    )
    .bind(&anexo.id)
    .bind(tenant_id)
    .bind(&anexo.ocorrencia_id)
    .bind(payload)
    .bind(created_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist ocorrencia attachment {} in postgres",
            anexo.id
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO ticket_attachments
            (id, tenant_id, ticket_id, file_name, mime_type, storage_key, size_bytes,
             kind, visibility, uploaded_by, created_at, deleted_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, NULL)
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            ticket_id = EXCLUDED.ticket_id,
            file_name = EXCLUDED.file_name,
            mime_type = EXCLUDED.mime_type,
            storage_key = EXCLUDED.storage_key,
            size_bytes = EXCLUDED.size_bytes,
            kind = EXCLUDED.kind,
            visibility = EXCLUDED.visibility,
            created_at = EXCLUDED.created_at,
            deleted_at = NULL
        "#,
    )
    .bind(&anexo.id)
    .bind(tenant_id)
    .bind(&anexo.ocorrencia_id)
    .bind(&anexo.nome)
    .bind(&anexo.mime_type)
    .bind(&anexo.storage_key)
    .bind(i64::try_from(anexo.tamanho_bytes).unwrap_or(i64::MAX))
    .bind(ticket_attachment_kind(&anexo.kind))
    .bind(ticket_attachment_visibility(&anexo.visibility))
    .bind(created_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist relational ticket attachment {} in postgres",
            anexo.id
        )
    })?;

    Ok(())
}

async fn insert_session_rows(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    session: &Session,
) -> anyhow::Result<()> {
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
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist session for user {} in postgres",
            session.user_id
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO sessions
            (id, tenant_id, user_id, app_context, token_hash, refresh_token_hash,
             active_condominium_id, expires_at, refresh_expires_at, created_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&session.tenant_id)
    .bind(&session.user_id)
    .bind(&session.app_context)
    .bind(&session.token)
    .bind(&session.refresh_token)
    .bind(&session.active_condominium)
    .bind(session.expires_at)
    .bind(session.refresh_expires_at)
    .bind(session.created_at)
    .execute(&mut **tx)
    .await
    .with_context(|| {
        format!(
            "failed to persist relational session for user {} in postgres",
            session.user_id
        )
    })?;

    Ok(())
}

fn append_condominium_filters(
    query: &mut QueryBuilder<'_, Postgres>,
    filter: &RelationalCondominiumFilter<'_>,
) {
    query.push(" AND deleted_at IS NULL");

    if !filter.include_archived {
        query.push(" AND COALESCE((metadata->>'archived')::boolean, false) = false");
    }
    if !filter.status.trim().is_empty() {
        query.push(" AND lower(status) = lower(");
        query.push_bind(filter.status.trim().to_string());
        query.push(")");
    }
    if !filter.condominium_type.trim().is_empty() {
        query.push(" AND lower(COALESCE(metadata->>'condominiumType', '')) = lower(");
        query.push_bind(filter.condominium_type.trim().to_string());
        query.push(")");
    }
    if !filter.locality.trim().is_empty() {
        query.push(
            " AND lower(COALESCE(metadata #>> '{address,locality}', location, '')) LIKE lower(",
        );
        query.push_bind(like_pattern(filter.locality));
        query.push(")");
    }
    if !filter.manager.trim().is_empty() {
        query.push(" AND lower(COALESCE(metadata->>'manager', '')) LIKE lower(");
        query.push_bind(like_pattern(filter.manager));
        query.push(")");
    }
    if !filter.operational_status.trim().is_empty() {
        query.push(
            " AND lower(COALESCE(metadata #>> '{operationalStatus,generalStatus}', '')) = lower(",
        );
        query.push_bind(filter.operational_status.trim().to_string());
        query.push(")");
    }
    if filter.incomplete {
        query.push(
            " AND (COALESCE(metadata #>> '{address,street}', '') = '' \
             OR COALESCE(metadata #>> '{address,locality}', location, '') = '' \
             OR COALESCE(metadata->>'internalCode', '') = '')",
        );
    }
    match filter.has_plant {
        Some(true) => {
            query.push(
                " AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(metadata->'media', '[]'::jsonb)) media \
                 WHERE lower(COALESCE(media->>'mediaType', '')) LIKE '%planta%')",
            );
        }
        Some(false) => {
            query.push(
                " AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(metadata->'media', '[]'::jsonb)) media \
                 WHERE lower(COALESCE(media->>'mediaType', '')) LIKE '%planta%')",
            );
        }
        None => {}
    }
    match filter.has_equipment {
        Some(true) => {
            query.push(" AND jsonb_array_length(COALESCE(metadata->'equipment', '[]'::jsonb)) > 0");
        }
        Some(false) => {
            query.push(" AND jsonb_array_length(COALESCE(metadata->'equipment', '[]'::jsonb)) = 0");
        }
        None => {}
    }
    if !filter.search.trim().is_empty() {
        let pattern = like_pattern(filter.search);
        query.push(" AND (name ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR internal_code ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR location ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR metadata::text ILIKE ");
        query.push_bind(pattern);
        query.push(")");
    }
}

fn append_ocorrencia_filters(
    query: &mut QueryBuilder<'_, Postgres>,
    filter: &RelationalOcorrenciaFilter<'_>,
) {
    query.push(" AND deleted_at IS NULL");

    if let Some(search) = trimmed_filter(filter.search) {
        let pattern = like_pattern(search);
        query.push(" AND (title ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR description ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR requester_name ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR requester_email ILIKE ");
        query.push_bind(pattern.clone());
        query.push(" OR metadata::text ILIKE ");
        query.push_bind(pattern);
        query.push(")");
    }
    if let Some(tipo) = trimmed_filter(filter.tipo) {
        query.push(" AND lower(\"type\") = lower(");
        query.push_bind(tipo.to_string());
        query.push(")");
    }
    if let Some(status) = trimmed_filter(filter.status) {
        query.push(" AND lower(status) = lower(");
        query.push_bind(status.to_string());
        query.push(")");
    }
    if let Some(prioridade) = trimmed_filter(filter.prioridade) {
        query.push(" AND lower(priority) = lower(");
        query.push_bind(prioridade.to_string());
        query.push(")");
    }
    if let Some(condominium_id) = trimmed_filter(filter.condominium_id) {
        query.push(" AND (condominium_id = ");
        query.push_bind(condominium_id.to_string());
        query.push(" OR metadata->>'condominiumId' = ");
        query.push_bind(condominium_id.to_string());
        query.push(")");
    }
    if let Some(equipamento_id) = trimmed_filter(filter.equipamento_id) {
        query.push(" AND (equipment_id = ");
        query.push_bind(equipamento_id.to_string());
        query.push(" OR metadata->>'equipamentoId' = ");
        query.push_bind(equipamento_id.to_string());
        query.push(")");
    }
    if let Some(atribuido_a) = trimmed_filter(filter.atribuido_a) {
        let pattern = like_pattern(atribuido_a);
        query.push(" AND (assigned_worker_id = ");
        query.push_bind(atribuido_a.to_string());
        query.push(" OR metadata->>'assignedWorkerId' = ");
        query.push_bind(atribuido_a.to_string());
        query.push(" OR metadata->>'atribuidoA' ILIKE ");
        query.push_bind(pattern);
        query.push(")");
    }
}

fn trimmed_filter(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn like_pattern(value: &str) -> String {
    format!("%{}%", value.trim())
}

fn normalized_page(page: usize) -> usize {
    page.max(1)
}

fn normalized_page_size(page_size: usize) -> usize {
    page_size.clamp(1, 100)
}

fn sql_offset_for(page: usize, page_size: usize) -> i64 {
    i64_from_usize(page.saturating_sub(1).saturating_mul(page_size))
}

fn i64_from_usize(value: usize) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

fn usize_from_i64(value: i64) -> usize {
    usize::try_from(value.max(0)).unwrap_or(usize::MAX)
}

fn sql_page<T>(items: Vec<T>, page: usize, page_size: usize, total: i64) -> Paginated<T> {
    let total = usize_from_i64(total);
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(page_size)
    };

    Paginated {
        items,
        page,
        page_size,
        total,
        total_pages,
    }
}
