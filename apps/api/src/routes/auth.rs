use crate::{
    error::ApiError,
    models::store::{PublicUser, Session},
    state::{
        hash_password, is_modern_password_hash, protect_session_secret, session_secret_matches,
        verify_password, AppState,
    },
};
use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap},
    Json,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const SIGNED_TOKEN_PREFIX: &str = "gestisac:v1";
const ACCESS_TOKEN_KIND: &str = "access";
const REFRESH_TOKEN_KIND: &str = "refresh";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub app_context: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub token: String,
    pub refresh_token: String,
    pub expires_at: String,
    pub user: PublicUser,
    pub app_context: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshRequest {
    pub refresh_token: String,
    #[serde(default)]
    pub app_context: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeResponse {
    pub user: PublicUser,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionsResponse {
    pub role: String,
    pub modules: Vec<PermissionModule>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionModule {
    pub module: String,
    pub can_read: bool,
    pub can_write: bool,
    pub can_delete: bool,
}

pub async fn login(
    State(state): State<AppState>,
    Json(input): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let email = input.email.trim().to_lowercase();
    if email.is_empty() || input.password.is_empty() {
        return Err(ApiError::validation("Email e password sao obrigatorios"));
    }

    let mut store = state.store.write().await;
    let user_index = store
        .users
        .iter()
        .position(|user| user.email.eq_ignore_ascii_case(&email))
        .ok_or_else(|| ApiError::unauthorized("Credenciais invalidas"))?;
    let user = store.users[user_index].clone();

    if !verify_password(&input.password, &user.password_hash) {
        return Err(ApiError::unauthorized("Credenciais invalidas"));
    }

    if !is_modern_password_hash(&user.password_hash) {
        store.users[user_index].password_hash = hash_password(&input.password)
            .map_err(|_| ApiError::internal("Nao foi possivel proteger a password"))?;
    }

    let now = Utc::now();
    let expires_at = now + Duration::hours(2);
    let refresh_expires_at = now + Duration::days(30);
    let token = new_signed_session_token(ACCESS_TOKEN_KIND, &user.id, expires_at);
    let refresh_token = new_signed_session_token(REFRESH_TOKEN_KIND, &user.id, refresh_expires_at);
    let active_condominium = if user.active_condominium.is_empty() {
        store.active_condominium.clone()
    } else {
        user.active_condominium.clone()
    };
    store.sessions.push(Session {
        token: protect_session_secret(&token),
        refresh_token: protect_session_secret(&refresh_token),
        user_id: user.id.clone(),
        tenant_id: user.tenant_id.clone(),
        active_condominium: active_condominium.clone(),
        app_context: normalize_app_context(&input.app_context),
        created_at: now,
        expires_at,
        refresh_expires_at,
    });

    let mut public_user = store
        .public_user(&user.id)
        .ok_or_else(|| ApiError::internal("Utilizador autenticado nao encontrado"))?;
    public_user.active_condominium = active_condominium;
    drop(store);
    persist(&state).await?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        expires_at: expires_at.to_rfc3339(),
        user: public_user,
        app_context: normalize_app_context(&input.app_context),
    }))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(input): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    if input.refresh_token.trim().is_empty() {
        return Err(ApiError::validation("Refresh token em falta"));
    }

    let now = Utc::now();
    let mut store = state.store.write().await;
    store
        .sessions
        .retain(|session| session.refresh_expires_at > now);
    let session_index = store
        .sessions
        .iter()
        .position(|session| session_secret_matches(&session.refresh_token, &input.refresh_token));
    let (user, active_condominium, response_app_context) = if let Some(session_index) =
        session_index
    {
        let current_session = store.sessions[session_index].clone();
        let user = store
            .users
            .iter()
            .find(|user| user.id == current_session.user_id)
            .cloned()
            .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
        let response_app_context = if input.app_context.trim().is_empty() {
            current_session.app_context.clone()
        } else {
            normalize_app_context(&input.app_context)
        };

        (
            user,
            current_session.active_condominium,
            response_app_context,
        )
    } else {
        let signed_token = parse_signed_session_token(&input.refresh_token, REFRESH_TOKEN_KIND)?;
        let user = store
            .users
            .iter()
            .find(|user| user.id == signed_token.user_id)
            .cloned()
            .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
        let active_condominium = if user.active_condominium.is_empty() {
            store.active_condominium.clone()
        } else {
            user.active_condominium.clone()
        };
        let response_app_context = normalize_app_context(&input.app_context);

        (user, active_condominium, response_app_context)
    };

    let expires_at = now + Duration::hours(2);
    let refresh_expires_at = now + Duration::days(30);
    let token = new_signed_session_token(ACCESS_TOKEN_KIND, &user.id, expires_at);
    let refresh_token = new_signed_session_token(REFRESH_TOKEN_KIND, &user.id, refresh_expires_at);
    let replacement_session = Session {
        token: protect_session_secret(&token),
        refresh_token: protect_session_secret(&refresh_token),
        user_id: user.id.clone(),
        tenant_id: user.tenant_id.clone(),
        active_condominium: active_condominium.clone(),
        app_context: response_app_context.clone(),
        created_at: now,
        expires_at,
        refresh_expires_at,
    };
    if let Some(session_index) = session_index {
        store.sessions[session_index] = replacement_session;
    } else {
        store.sessions.push(replacement_session);
    }

    let mut public_user = store
        .public_user(&user.id)
        .ok_or_else(|| ApiError::internal("Utilizador autenticado nao encontrado"))?;
    public_user.active_condominium = active_condominium;
    drop(store);
    persist(&state).await?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        expires_at: expires_at.to_rfc3339(),
        user: public_user,
        app_context: response_app_context,
    }))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, ApiError> {
    let current_user = current_user(&headers, &state).await?;
    let token = bearer_token(&headers)?;

    let mut store = state.store.write().await;
    store
        .sessions
        .retain(|session| !session_secret_matches(&session.token, &token));
    drop(store);
    persist(&state).await?;

    Ok(Json(MeResponse { user: current_user }))
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, ApiError> {
    let user = current_user(&headers, &state).await?;
    Ok(Json(MeResponse { user }))
}

pub async fn permissions(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<PermissionsResponse>, ApiError> {
    let user = current_user(&headers, &state).await?;
    let modules = [
        "condominiums",
        "operations",
        "accounting",
        "reports",
        "settings",
    ]
    .into_iter()
    .map(|module| PermissionModule {
        module: module.to_string(),
        can_read: can_read(&user.role, module),
        can_write: can_write(&user.role, module),
        can_delete: can_delete(&user.role, module),
    })
    .collect();

    Ok(Json(PermissionsResponse {
        role: user.role,
        modules,
    }))
}

pub async fn current_user(headers: &HeaderMap, state: &AppState) -> Result<PublicUser, ApiError> {
    current_context(headers, state)
        .await
        .map(|context| context.user)
}

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub token: String,
    pub user: PublicUser,
    pub tenant_id: String,
    pub active_condominium: String,
    pub app_context: String,
}

pub async fn current_context(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<AuthContext, ApiError> {
    let token = bearer_token(headers)?;
    let store = state.store.read().await;
    if let Some(session) = store
        .sessions
        .iter()
        .find(|session| session_secret_matches(&session.token, &token))
    {
        if session.expires_at <= Utc::now() {
            return Err(ApiError::unauthorized("Sessao expirada"));
        }

        let mut user = store
            .public_user(&session.user_id)
            .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
        user.active_condominium = session.active_condominium.clone();

        return Ok(AuthContext {
            token: session.token.clone(),
            tenant_id: session.tenant_id.clone(),
            active_condominium: session.active_condominium.clone(),
            user,
            app_context: session.app_context.clone(),
        });
    }

    let signed_token = parse_signed_session_token(&token, ACCESS_TOKEN_KIND)?;
    let mut user = store
        .public_user(&signed_token.user_id)
        .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
    let active_condominium = if user.active_condominium.is_empty() {
        store.active_condominium.clone()
    } else {
        user.active_condominium.clone()
    };
    user.active_condominium = active_condominium.clone();

    Ok(AuthContext {
        token,
        tenant_id: user.tenant_id.clone(),
        active_condominium,
        user,
        app_context: "hq".to_string(),
    })
}

fn normalize_app_context(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "worker" => "worker".to_string(),
        "client" => "client".to_string(),
        _ => "hq".to_string(),
    }
}

pub async fn require_write(
    headers: &HeaderMap,
    state: &AppState,
    module: &str,
) -> Result<PublicUser, ApiError> {
    let user = current_user(headers, state).await?;
    if can_write(&user.role, module) {
        Ok(user)
    } else {
        Err(ApiError::forbidden(
            "Sem permissao para alterar este modulo",
        ))
    }
}

pub async fn require_delete(
    headers: &HeaderMap,
    state: &AppState,
    module: &str,
) -> Result<PublicUser, ApiError> {
    let user = current_user(headers, state).await?;
    if can_delete(&user.role, module) {
        Ok(user)
    } else {
        Err(ApiError::forbidden(
            "Sem permissao para apagar neste modulo",
        ))
    }
}

fn can_read(_role: &str, _module: &str) -> bool {
    true
}

fn can_write(role: &str, module: &str) -> bool {
    let normalized = role.to_lowercase();
    normalized.contains("administrador")
        || (normalized.contains("financeiro") && matches!(module, "accounting" | "reports"))
        || (normalized.contains("operador") && matches!(module, "operations" | "condominiums"))
}

fn can_delete(role: &str, module: &str) -> bool {
    let normalized = role.to_lowercase();
    normalized.contains("administrador")
        || (normalized.contains("financeiro") && module == "accounting")
}

fn bearer_token(headers: &HeaderMap) -> Result<String, ApiError> {
    let value = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("Authorization bearer token em falta"))?;

    value
        .strip_prefix("Bearer ")
        .map(str::to_string)
        .ok_or_else(|| ApiError::unauthorized("Authorization bearer token invalido"))
}

#[cfg(test)]
fn new_session_secret() -> String {
    use rand_core::{OsRng, RngCore};

    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[derive(Debug, Clone)]
struct SignedSessionToken {
    user_id: String,
}

fn new_signed_session_token(kind: &str, user_id: &str, expires_at: DateTime<Utc>) -> String {
    let unsigned = signed_session_payload(kind, user_id, expires_at.timestamp());
    let signature = sign_session_payload(&unsigned);
    format!("{unsigned}:{signature}")
}

fn parse_signed_session_token(
    token: &str,
    expected_kind: &str,
) -> Result<SignedSessionToken, ApiError> {
    let parts = token.split(':').collect::<Vec<_>>();
    if parts.len() != 6 || parts[0] != "gestisac" || parts[1] != "v1" {
        return Err(ApiError::unauthorized("Sessao invalida ou expirada"));
    }

    let kind = parts[2];
    if kind != expected_kind {
        return Err(ApiError::unauthorized("Sessao invalida ou expirada"));
    }

    let user_id = parts[3];
    let expires_at_timestamp = parts[4]
        .parse::<i64>()
        .map_err(|_| ApiError::unauthorized("Sessao invalida ou expirada"))?;
    let unsigned = signed_session_payload(kind, user_id, expires_at_timestamp);
    let expected_signature = sign_session_payload(&unsigned);
    if expected_signature != parts[5] {
        return Err(ApiError::unauthorized("Sessao invalida ou expirada"));
    }

    let expires_at = DateTime::from_timestamp(expires_at_timestamp, 0)
        .ok_or_else(|| ApiError::unauthorized("Sessao invalida ou expirada"))?;
    if expires_at <= Utc::now() {
        return Err(ApiError::unauthorized("Sessao expirada"));
    }

    Ok(SignedSessionToken {
        user_id: user_id.to_string(),
    })
}

fn signed_session_payload(kind: &str, user_id: &str, expires_at_timestamp: i64) -> String {
    format!("{SIGNED_TOKEN_PREFIX}:{kind}:{user_id}:{expires_at_timestamp}")
}

fn sign_session_payload(payload: &str) -> String {
    let secret = std::env::var("JWT_SECRET")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "gestisac-local-dev-session-secret".to_string());
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(b":");
    hasher.update(payload.as_bytes());
    format!("{:x}", hasher.finalize())
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_secrets_are_high_entropy_hex_strings() {
        let first = new_session_secret();
        let second = new_session_secret();

        assert_eq!(first.len(), 64);
        assert_eq!(second.len(), 64);
        assert_ne!(first, second);
        assert!(first.chars().all(|character| character.is_ascii_hexdigit()));
    }
}
