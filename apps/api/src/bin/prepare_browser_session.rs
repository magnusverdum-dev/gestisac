use anyhow::{bail, Context};
use chrono::{Duration, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{env, fs, path::Path};

const DEFAULT_API_URL: &str = "https://gestisac-api.vercel.app";
const DEFAULT_WEB_URL: &str = "https://gestisac-web.vercel.app";
const DEFAULT_EMAIL: &str = "admin@gestisac.pt";
const DEFAULT_BROWSER_SESSION_LANDING_PATH: &str = "/dashboard";

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginResponse {
    token: String,
    refresh_token: String,
    expires_at: String,
    app_context: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    load_local_envs();

    let email = env::var("GESTISAC_SMOKE_EMAIL")
        .unwrap_or_else(|_| DEFAULT_EMAIL.to_string())
        .trim()
        .to_ascii_lowercase();
    let password = env::var("GESTISAC_SMOKE_PASSWORD").context(
        "GESTISAC_SMOKE_PASSWORD is required in .env.smoke.local or apps/api/.env.smoke.local",
    )?;
    let app_context = normalize_app_context(
        &env::var("GESTISAC_SMOKE_APP_CONTEXT").unwrap_or_else(|_| "hq".to_string()),
    )?;
    let api_url = env::var("GESTISAC_API_URL").unwrap_or_else(|_| DEFAULT_API_URL.to_string());
    let web_url = env::var("GESTISAC_WEB_URL").unwrap_or_else(|_| DEFAULT_WEB_URL.to_string());
    let output_path = env::var("GESTISAC_BROWSER_SESSION_FILE")
        .unwrap_or_else(|_| ".tmp/gestisac-browser-session.json".to_string());

    let login = login_to_public_api(&api_url, &email, &password, &app_context).await?;
    let now = Utc::now();
    let expires_at = chrono::DateTime::parse_from_rfc3339(&login.expires_at)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or(now + Duration::hours(2));
    let refresh_expires_at = now + Duration::days(30);
    let session_file = BrowserSessionFile {
        web_url: web_url.clone(),
        api_url: api_url.clone(),
        app_context: login.app_context.clone(),
        dashboard_path: format!("/{}/dashboard", login.app_context),
        token: login.token,
        refresh_token: login.refresh_token,
        expires_at: expires_at.to_rfc3339(),
        refresh_expires_at: refresh_expires_at.to_rfc3339(),
    };

    write_session_file(&output_path, &session_file)?;

    let browser_url = format!(
        "{}{}?browserSession=1&token={}&refreshToken={}&appContext={}&dashboardPath={}&expiresAt={}",
        web_url.trim_end_matches('/'),
        DEFAULT_BROWSER_SESSION_LANDING_PATH,
        urlencoding::encode(&session_file.token),
        urlencoding::encode(&session_file.refresh_token),
        urlencoding::encode(&session_file.app_context),
        urlencoding::encode(&session_file.dashboard_path),
        urlencoding::encode(&session_file.expires_at)
    );

    println!(
        "Temporary browser session prepared: appContext={}, expiresAt={}, output={}",
        session_file.app_context, session_file.expires_at, output_path
    );
    println!("Open this URL in the embedded browser:");
    println!("{browser_url}");
    println!("No password, token, refresh token or database URL was printed.");

    Ok(())
}

async fn login_to_public_api(
    api_url: &str,
    email: &str,
    password: &str,
    app_context: &str,
) -> anyhow::Result<LoginResponse> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .context("failed to build HTTP client for browser session preparation")?;
    let endpoint = format!("{}/api/auth/login", api_url.trim_end_matches('/'));
    let response = client
        .post(endpoint)
        .json(&serde_json::json!({
            "email": email,
            "password": password,
            "appContext": app_context,
        }))
        .send()
        .await
        .context("failed to reach public API login endpoint")?;

    let status = response.status();
    let body = response
        .text()
        .await
        .context("failed to read login response body")?;
    if !status.is_success() {
        bail!("login request failed with status {}: {}", status, body);
    }

    serde_json::from_str(&body).context("failed to parse login response")
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
