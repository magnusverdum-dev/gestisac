use anyhow::{bail, Context};
use chrono::{Duration, Utc};
use rand_core::{OsRng, RngCore};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, Row};
use std::{env, fs, path::Path};
use uuid::Uuid;

const DEFAULT_API_URL: &str = "https://gestisac-api.vercel.app";
const DEFAULT_WEB_URL: &str = "https://gestisac-web.vercel.app";
const DEFAULT_EMAIL: &str = "admin@gestisac.pt";
const SESSION_SECRET_PREFIX: &str = "sha256:";

#[derive(Debug)]
struct SmokeUser {
    id: String,
    tenant_id: String,
    active_condominium: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserSessionFile {
    web_url: String,
    api_url: String,
    app_context: String,
    dashboard_path: String,
    token: String,
    refresh_token: String,
    expires_at: String,
    refresh_expires_at: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    load_local_envs();

    let database_url = env::var("GESTISAC_DATABASE_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .context("GESTISAC_DATABASE_URL or DATABASE_URL is required in a local env file")?;
    let email = env::var("GESTISAC_SMOKE_EMAIL")
        .unwrap_or_else(|_| DEFAULT_EMAIL.to_string())
        .trim()
        .to_ascii_lowercase();
    let app_context = normalize_app_context(
        &env::var("GESTISAC_SMOKE_APP_CONTEXT").unwrap_or_else(|_| "hq".to_string()),
    )?;
    let api_url = env::var("GESTISAC_API_URL").unwrap_or_else(|_| DEFAULT_API_URL.to_string());
    let web_url = env::var("GESTISAC_WEB_URL").unwrap_or_else(|_| DEFAULT_WEB_URL.to_string());
    let output_path = env::var("GESTISAC_BROWSER_SESSION_FILE")
        .unwrap_or_else(|_| ".tmp/gestisac-browser-session.json".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .context("failed to connect to database for browser session preparation")?;

    let user = find_smoke_user(&pool, &email).await?;
    let now = Utc::now();
    let expires_at = now + Duration::hours(8);
    let refresh_expires_at = now + Duration::hours(8);
    let token = new_session_secret();
    let refresh_token = new_session_secret();
    let token_hash = protect_session_secret(&token);
    let refresh_token_hash = protect_session_secret(&refresh_token);

    let mut tx = pool
        .begin()
        .await
        .context("failed to begin browser session transaction")?;

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
    .bind(&user.tenant_id)
    .bind(&user.id)
    .bind(&token_hash)
    .bind(&refresh_token_hash)
    .bind(&user.active_condominium)
    .bind(&app_context)
    .bind(expires_at)
    .bind(refresh_expires_at)
    .bind(now)
    .execute(&mut *tx)
    .await
    .context("failed to insert temporary app session")?;

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
    .bind(&user.tenant_id)
    .bind(&user.id)
    .bind(&app_context)
    .bind(&token_hash)
    .bind(&refresh_token_hash)
    .bind(&user.active_condominium)
    .bind(expires_at)
    .bind(refresh_expires_at)
    .bind(now)
    .execute(&mut *tx)
    .await
    .context("failed to insert temporary relational session")?;

    tx.commit()
        .await
        .context("failed to commit browser session transaction")?;

    let session_file = BrowserSessionFile {
        web_url,
        api_url,
        app_context: app_context.clone(),
        dashboard_path: format!("/{app_context}/dashboard"),
        token,
        refresh_token,
        expires_at: expires_at.to_rfc3339(),
        refresh_expires_at: refresh_expires_at.to_rfc3339(),
    };
    write_session_file(&output_path, &session_file)?;

    println!(
        "Temporary browser session prepared: appContext={}, expiresAt={}, output={}",
        app_context, session_file.expires_at, output_path
    );
    println!("No password, token, refresh token or database URL was printed.");

    Ok(())
}

async fn find_smoke_user(pool: &sqlx::PgPool, email: &str) -> anyhow::Result<SmokeUser> {
    let row = sqlx::query(
        r#"
        SELECT
            u.id,
            u.tenant_id,
            COALESCE(NULLIF(c.name, ''), NULLIF(u.active_condominium_id, ''), '') AS active_condominium
        FROM users u
        LEFT JOIN condominiums c
            ON c.tenant_id = u.tenant_id
           AND c.id = u.active_condominium_id
           AND c.deleted_at IS NULL
        WHERE lower(u.email) = lower($1)
          AND u.deleted_at IS NULL
        ORDER BY u.updated_at DESC
        LIMIT 1
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .context("failed to query smoke user")?;

    let Some(row) = row else {
        bail!("GESTISAC_SMOKE_EMAIL user was not found in the configured database");
    };

    Ok(SmokeUser {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenant_id")?,
        active_condominium: row.try_get("active_condominium")?,
    })
}

fn normalize_app_context(value: &str) -> anyhow::Result<String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "" | "hq" => Ok("hq".to_string()),
        "worker" => Ok("worker".to_string()),
        "client" => Ok("client".to_string()),
        other => bail!("invalid GESTISAC_SMOKE_APP_CONTEXT: {other}"),
    }
}

fn write_session_file(path: &str, file: &BrowserSessionFile) -> anyhow::Result<()> {
    let path = Path::new(path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| {
            format!(
                "failed to create browser session directory {}",
                parent.display()
            )
        })?;
    }

    let json =
        serde_json::to_string_pretty(file).context("failed to encode browser session file")?;
    fs::write(path, json)
        .with_context(|| format!("failed to write browser session file {}", path.display()))
}

fn load_local_envs() {
    for path in [
        ".env.smoke.local",
        ".env.database.local",
        ".env.local",
        "apps/api/.env.smoke.local",
        "apps/api/.env.database.local",
        "apps/api/.env.local",
    ] {
        if Path::new(path).exists() {
            let _ = dotenvy::from_path(path);
        }
    }
}

fn new_session_secret() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn protect_session_secret(secret: &str) -> String {
    if secret.starts_with(SESSION_SECRET_PREFIX) {
        return secret.to_string();
    }

    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    format!("{SESSION_SECRET_PREFIX}{:x}", hasher.finalize())
}
