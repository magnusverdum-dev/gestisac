use crate::models::{demo::DemoData, store::AppStore};
use anyhow::Context;
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use sha2::{Digest, Sha256};
use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
    sync::Arc,
};
use tokio::sync::RwLock;

const DEMO_DATA: &str = include_str!("../../../mock/demo-data.json");
const DEFAULT_ADMIN_PASSWORD: &str = "Gestisac2026!";

#[derive(Debug, Clone)]
pub struct ApiConfig {
    pub host: IpAddr,
    pub port: u16,
    pub data_path: PathBuf,
    pub document_storage_path: PathBuf,
}

impl ApiConfig {
    pub fn from_env() -> Self {
        let host = std::env::var("GESTISAC_API_HOST")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST));

        let port = std::env::var("GESTISAC_API_PORT")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(3000);

        let data_path = std::env::var("GESTISAC_DATA_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data/store.json"));
        let document_storage_path = std::env::var("GESTISAC_DOCUMENT_STORAGE_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data/documents"));

        Self {
            host,
            port,
            data_path,
            document_storage_path,
        }
    }

    pub fn bind_addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub config: ApiConfig,
    pub store: Arc<RwLock<AppStore>>,
}

impl AppState {
    pub fn load() -> anyhow::Result<Self> {
        let config = ApiConfig::from_env();
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

        Ok(Self {
            config,
            store: Arc::new(RwLock::new(store)),
        })
    }

    pub async fn save(&self) -> std::io::Result<()> {
        let snapshot = self.store.read().await.clone();
        if let Some(parent) = self.config.data_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let contents = serde_json::to_string_pretty(&snapshot).map_err(std::io::Error::other)?;
        let temporary_path = self.config.data_path.with_extension("json.tmp");
        tokio::fs::write(&temporary_path, contents).await?;
        match tokio::fs::rename(&temporary_path, &self.config.data_path).await {
            Ok(()) => Ok(()),
            Err(_) if self.config.data_path.exists() => {
                tokio::fs::remove_file(&self.config.data_path).await?;
                tokio::fs::rename(&temporary_path, &self.config.data_path).await
            }
            Err(error) => Err(error),
        }
    }
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
}
