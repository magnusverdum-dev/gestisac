use anyhow::{bail, Context};
use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderValue, Method,
};
use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};
use tower_http::cors::{AllowOrigin, CorsLayer};

const DEFAULT_CORS_ORIGINS: &[&str] = &[
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
];

#[derive(Debug, Clone)]
pub struct ApiConfig {
    pub host: IpAddr,
    pub port: u16,
    pub data_path: PathBuf,
    pub document_storage_path: PathBuf,
    pub cors_allowed_origins: Vec<String>,
    pub database: Option<DatabaseConfig>,
}

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    url: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceStatus {
    pub active_backend: &'static str,
    pub database_configured: bool,
    pub database_url: Option<String>,
    pub json_store_path: String,
}

impl ApiConfig {
    pub fn from_env() -> anyhow::Result<Self> {
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
        let cors_allowed_origins = parse_cors_origins();
        let database = std::env::var("GESTISAC_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .ok()
            .map(DatabaseConfig::new)
            .transpose()?;

        Ok(Self {
            host,
            port,
            data_path,
            document_storage_path,
            cors_allowed_origins,
            database,
        })
    }

    pub fn bind_addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }

    pub fn cors_layer(&self) -> anyhow::Result<CorsLayer> {
        let origins = self
            .cors_allowed_origins
            .iter()
            .map(|origin| {
                HeaderValue::from_str(origin)
                    .with_context(|| format!("invalid CORS origin configured: {origin}"))
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        Ok(CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT]))
    }

    pub fn persistence_status(&self) -> PersistenceStatus {
        PersistenceStatus {
            active_backend: if self.database.is_some() {
                "hybrid-json-postgres"
            } else {
                "json-file"
            },
            database_configured: self.database.is_some(),
            database_url: self.database.as_ref().map(DatabaseConfig::redacted_url),
            json_store_path: self.data_path.display().to_string(),
        }
    }
}

impl DatabaseConfig {
    fn new(url: String) -> anyhow::Result<Self> {
        let trimmed = url.trim();
        if trimmed.is_empty() {
            bail!("GESTISAC_DATABASE_URL cannot be empty when defined");
        }

        Ok(Self {
            url: trimmed.to_string(),
        })
    }

    fn redacted_url(&self) -> String {
        redact_database_url(&self.url)
    }

    pub fn url(&self) -> &str {
        &self.url
    }
}

fn parse_cors_origins() -> Vec<String> {
    std::env::var("GESTISAC_CORS_ORIGINS")
        .ok()
        .map(|value| {
            value
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty() && *origin != "*")
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .filter(|items| !items.is_empty())
        .unwrap_or_else(|| {
            DEFAULT_CORS_ORIGINS
                .iter()
                .map(|origin| origin.to_string())
                .collect()
        })
}

fn redact_database_url(url: &str) -> String {
    let Some((scheme, remainder)) = url.split_once("://") else {
        return "<redacted>".to_string();
    };
    let Some((credentials, host_and_path)) = remainder.split_once('@') else {
        return format!("{scheme}://{remainder}");
    };
    let user = credentials.split(':').next().unwrap_or("user");
    format!("{scheme}://{user}:<redacted>@{host_and_path}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_database_password_from_status() {
        let redacted = redact_database_url("postgres://gestisac:secret@localhost:5432/gestisac");

        assert_eq!(
            redacted,
            "postgres://gestisac:<redacted>@localhost:5432/gestisac"
        );
        assert!(!redacted.contains("secret"));
    }
}
