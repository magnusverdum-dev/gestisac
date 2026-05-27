use crate::{
    config::ApiConfig,
    models::{
        demo::DemoData,
        store::{default_tenant_id, AppStore},
    },
    repositories::postgres::{FinancialSnapshotRef, PostgresRepository},
};
use anyhow::Context;
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::RwLock;

const DEMO_DATA: &str = include_str!("../../../mock/demo-data.json");
const DEFAULT_ADMIN_PASSWORD: &str = "Gestisac2026!";
const SESSION_SECRET_PREFIX: &str = "sha256:";

#[derive(Debug, Clone)]
pub struct AppState {
    pub config: ApiConfig,
    pub store: Arc<RwLock<AppStore>>,
    pub postgres: Option<PostgresRepository>,
}

impl AppState {
    pub async fn load() -> anyhow::Result<Self> {
        let config = ApiConfig::from_env()?;
        let demo: DemoData = serde_json::from_str(DEMO_DATA)?;
        let mut store = if config.data_path.exists() {
            let contents = std::fs::read_to_string(&config.data_path).with_context(|| {
                format!(
                    "failed to read GESTISAC data store at {}",
                    config.data_path.display()
                )
            })?;

            serde_json::from_str(&contents).with_context(|| {
                format!(
                    "failed to parse GESTISAC data store at {}",
                    config.data_path.display()
                )
            })?
        } else {
            AppStore::seed_from_demo(&demo, hash_password(DEFAULT_ADMIN_PASSWORD)?)
        };
        store.ensure_demo_defaults(&demo);
        migrate_legacy_password_hashes(&mut store)?;
        protect_session_secrets(&mut store);
        let postgres = connect_postgres(&config).await?;
        if let Some(repository) = &postgres {
            hydrate_store_from_postgres(repository, &mut store).await?;
            protect_session_secrets(&mut store);
        }

        Ok(Self {
            config,
            store: Arc::new(RwLock::new(store)),
            postgres,
        })
    }

    pub async fn save(&self) -> anyhow::Result<()> {
        let snapshot = self.store.read().await.clone();
        if let Some(parent) = self.config.data_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .context("failed to create json store directory")?;
        }

        let contents = serde_json::to_string_pretty(&snapshot)
            .context("failed to serialize app store snapshot")?;
        let temporary_path = self.config.data_path.with_extension("json.tmp");
        tokio::fs::write(&temporary_path, contents)
            .await
            .context("failed to write temporary json store file")?;
        match tokio::fs::rename(&temporary_path, &self.config.data_path)
            .await
            .map_err(anyhow::Error::from)
        {
            Ok(()) => {}
            Err(_) if self.config.data_path.exists() => {
                tokio::fs::remove_file(&self.config.data_path)
                    .await
                    .context("failed to replace json store file")?;
                tokio::fs::rename(&temporary_path, &self.config.data_path)
                    .await
                    .context("failed to move temporary json store file")?;
            }
            Err(error) => return Err(error.context("failed to persist json store file")),
        }

        if let Some(repository) = &self.postgres {
            let tenant_id = snapshot
                .tenants
                .first()
                .map(|tenant| tenant.id.clone())
                .unwrap_or_else(default_tenant_id);
            repository
                .replace_identity_snapshot(
                    &tenant_id,
                    &snapshot.tenants,
                    &snapshot.users,
                    &snapshot.audit_log,
                )
                .await
                .context("failed to persist identity snapshots in postgres")?;
            repository
                .replace_condominiums(&tenant_id, &snapshot.condominiums)
                .await
                .context("failed to persist condominium snapshots in postgres")?;
            repository
                .replace_sessions(&snapshot.sessions)
                .await
                .context("failed to persist sessions in postgres")?;
            repository
                .replace_ocorrencias_snapshot(
                    &tenant_id,
                    &snapshot.ocorrencias,
                    &snapshot.ocorrencia_comentarios,
                    &snapshot.ocorrencia_anexos,
                )
                .await
                .context("failed to persist ocorrencia snapshots in postgres")?;
            repository
                .replace_operational_snapshot(
                    &tenant_id,
                    &snapshot.tickets,
                    &snapshot.maintenance,
                    &snapshot.calendar_events,
                    &snapshot.assemblies,
                )
                .await
                .context("failed to persist operational snapshots in postgres")?;
            repository
                .replace_documental_snapshot(
                    &tenant_id,
                    &snapshot.suppliers,
                    &snapshot.documents,
                    &snapshot.reports,
                )
                .await
                .context("failed to persist documental snapshots in postgres")?;
            repository
                .replace_financial_snapshot(
                    &tenant_id,
                    FinancialSnapshotRef {
                        quotas: &snapshot.quotas,
                        accounting_payments: &snapshot.accounting_payments,
                        debts: &snapshot.debts,
                        receipts: &snapshot.receipts,
                        expenses: &snapshot.expenses,
                        reserve_funds: &snapshot.reserve_funds,
                    },
                )
                .await
                .context("failed to persist financial snapshots in postgres")?;
        }

        Ok(())
    }
}

async fn connect_postgres(config: &ApiConfig) -> anyhow::Result<Option<PostgresRepository>> {
    let Some(database) = &config.database else {
        return Ok(None);
    };

    let repository = PostgresRepository::connect(database.url())
        .await
        .context("failed to connect to postgres")?;

    repository
        .migrate()
        .await
        .context("failed to run postgres migrations")?;

    Ok(Some(repository))
}

async fn hydrate_store_from_postgres(
    repository: &PostgresRepository,
    store: &mut AppStore,
) -> anyhow::Result<()> {
    let tenant_id = store
        .tenants
        .first()
        .map(|tenant| tenant.id.clone())
        .unwrap_or_else(default_tenant_id);

    let identity_snapshot = repository
        .load_identity_snapshot(&tenant_id)
        .await
        .context("failed to load identity snapshots from postgres")?;
    if identity_snapshot.tenants.is_empty()
        && identity_snapshot.users.is_empty()
        && identity_snapshot.audit_log.is_empty()
    {
        repository
            .replace_identity_snapshot(&tenant_id, &store.tenants, &store.users, &store.audit_log)
            .await
            .context("failed to seed identity snapshots in postgres")?;
    } else {
        if !identity_snapshot.tenants.is_empty() {
            store.tenants = identity_snapshot.tenants;
        }
        if !identity_snapshot.users.is_empty() {
            store.users = identity_snapshot.users;
        }
        if !identity_snapshot.audit_log.is_empty() {
            store.audit_log = identity_snapshot.audit_log;
        }
    }

    let loaded_condominiums = repository
        .load_condominiums(&tenant_id)
        .await
        .context("failed to load condominium snapshots from postgres")?;
    if loaded_condominiums.is_empty() {
        repository
            .replace_condominiums(&tenant_id, &store.condominiums)
            .await
            .context("failed to seed condominium snapshots in postgres")?;
    } else {
        store.condominiums = loaded_condominiums;
    }

    let loaded_sessions = repository
        .load_sessions()
        .await
        .context("failed to load sessions from postgres")?;
    if loaded_sessions.is_empty() {
        repository
            .replace_sessions(&store.sessions)
            .await
            .context("failed to seed sessions in postgres")?;
    } else {
        store.sessions = loaded_sessions;
    }

    let ocorrencias_snapshot = repository
        .load_ocorrencias_snapshot(&tenant_id)
        .await
        .context("failed to load ocorrencia snapshots from postgres")?;
    if ocorrencias_snapshot.ocorrencias.is_empty()
        && ocorrencias_snapshot.comentarios.is_empty()
        && ocorrencias_snapshot.anexos.is_empty()
    {
        repository
            .replace_ocorrencias_snapshot(
                &tenant_id,
                &store.ocorrencias,
                &store.ocorrencia_comentarios,
                &store.ocorrencia_anexos,
            )
            .await
            .context("failed to seed ocorrencia snapshots in postgres")?;
    } else {
        store.ocorrencias = ocorrencias_snapshot.ocorrencias;
        store.ocorrencia_comentarios = ocorrencias_snapshot.comentarios;
        store.ocorrencia_anexos = ocorrencias_snapshot.anexos;
    }

    let operational_snapshot = repository
        .load_operational_snapshot(&tenant_id)
        .await
        .context("failed to load operational snapshots from postgres")?;
    if operational_snapshot.tickets.is_empty()
        && operational_snapshot.maintenance.is_empty()
        && operational_snapshot.calendar_events.is_empty()
        && operational_snapshot.assemblies.is_empty()
    {
        repository
            .replace_operational_snapshot(
                &tenant_id,
                &store.tickets,
                &store.maintenance,
                &store.calendar_events,
                &store.assemblies,
            )
            .await
            .context("failed to seed operational snapshots in postgres")?;
    } else {
        store.tickets = operational_snapshot.tickets;
        store.maintenance = operational_snapshot.maintenance;
        store.calendar_events = operational_snapshot.calendar_events;
        store.assemblies = operational_snapshot.assemblies;
    }

    let documental_snapshot = repository
        .load_documental_snapshot(&tenant_id)
        .await
        .context("failed to load documental snapshots from postgres")?;
    if documental_snapshot.suppliers.is_empty()
        && documental_snapshot.documents.is_empty()
        && documental_snapshot.reports.is_empty()
    {
        repository
            .replace_documental_snapshot(
                &tenant_id,
                &store.suppliers,
                &store.documents,
                &store.reports,
            )
            .await
            .context("failed to seed documental snapshots in postgres")?;
    } else {
        store.suppliers = documental_snapshot.suppliers;
        store.documents = documental_snapshot.documents;
        store.reports = documental_snapshot.reports;
    }

    let financial_snapshot = repository
        .load_financial_snapshot(&tenant_id)
        .await
        .context("failed to load financial snapshots from postgres")?;
    if financial_snapshot.quotas.is_empty()
        && financial_snapshot.accounting_payments.is_empty()
        && financial_snapshot.debts.is_empty()
        && financial_snapshot.receipts.is_empty()
        && financial_snapshot.expenses.is_empty()
        && financial_snapshot.reserve_funds.is_empty()
    {
        repository
            .replace_financial_snapshot(
                &tenant_id,
                FinancialSnapshotRef {
                    quotas: &store.quotas,
                    accounting_payments: &store.accounting_payments,
                    debts: &store.debts,
                    receipts: &store.receipts,
                    expenses: &store.expenses,
                    reserve_funds: &store.reserve_funds,
                },
            )
            .await
            .context("failed to seed financial snapshots in postgres")?;
    } else {
        store.quotas = financial_snapshot.quotas;
        store.accounting_payments = financial_snapshot.accounting_payments;
        store.debts = financial_snapshot.debts;
        store.receipts = financial_snapshot.receipts;
        store.expenses = financial_snapshot.expenses;
        store.reserve_funds = financial_snapshot.reserve_funds;
    }

    Ok(())
}

pub fn hash_password(password: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|error| anyhow::anyhow!("failed to hash password: {error}"))?
        .to_string();

    Ok(hash)
}

pub fn verify_password(password: &str, password_hash: &str) -> bool {
    if password_hash.starts_with("$argon2") {
        return PasswordHash::new(password_hash)
            .ok()
            .and_then(|parsed| {
                Argon2::default()
                    .verify_password(password.as_bytes(), &parsed)
                    .ok()
            })
            .is_some();
    }

    legacy_sha256_password(password) == password_hash
}

pub fn is_modern_password_hash(password_hash: &str) -> bool {
    password_hash.starts_with("$argon2")
}

pub fn protect_session_secret(secret: &str) -> String {
    if secret.starts_with(SESSION_SECRET_PREFIX) {
        return secret.to_string();
    }

    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    format!("{SESSION_SECRET_PREFIX}{:x}", hasher.finalize())
}

pub fn session_secret_matches(stored_secret: &str, presented_secret: &str) -> bool {
    stored_secret == presented_secret || stored_secret == protect_session_secret(presented_secret)
}

fn migrate_legacy_password_hashes(store: &mut AppStore) -> anyhow::Result<()> {
    for user in &mut store.users {
        if !is_modern_password_hash(&user.password_hash)
            && verify_password(DEFAULT_ADMIN_PASSWORD, &user.password_hash)
        {
            user.password_hash = hash_password(DEFAULT_ADMIN_PASSWORD)?;
        }
    }

    Ok(())
}

fn protect_session_secrets(store: &mut AppStore) {
    for session in &mut store.sessions {
        session.token = protect_session_secret(&session.token);
        session.refresh_token = protect_session_secret(&session.refresh_token);
    }
}

fn legacy_sha256_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn argon2_hash_verifies_correct_password_and_rejects_wrong_password() {
        let password_hash = hash_password("secret-password")
            .expect("argon2 hashing should work with a system random source");

        assert!(is_modern_password_hash(&password_hash));
        assert!(verify_password("secret-password", &password_hash));
        assert!(!verify_password("wrong-password", &password_hash));
    }

    #[test]
    fn legacy_sha256_hash_is_still_verified_for_migration() {
        let legacy_hash = legacy_sha256_password("Gestisac2026!");

        assert!(verify_password("Gestisac2026!", &legacy_hash));
        assert!(!verify_password("wrong-password", &legacy_hash));
    }

    #[test]
    fn session_secrets_are_hashed_and_still_match_raw_values() {
        let raw = "raw-session-token";
        let protected = protect_session_secret(raw);

        assert_ne!(protected, raw);
        assert!(protected.starts_with(SESSION_SECRET_PREFIX));
        assert!(session_secret_matches(&protected, raw));
        assert!(session_secret_matches(raw, raw));
        assert!(!session_secret_matches(&protected, "other-token"));
    }
}
