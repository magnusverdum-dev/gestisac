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
use chrono::{Duration, Utc};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub token: String,
    pub refresh_token: String,
    pub expires_at: String,
    pub user: PublicUser,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshRequest {
    pub refresh_token: String,
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

    let token = new_session_secret();
    let refresh_token = new_session_secret();
    let now = Utc::now();
    let expires_at = now + Duration::hours(2);
    let refresh_expires_at = now + Duration::days(30);
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
        .position(|session| session_secret_matches(&session.refresh_token, &input.refresh_token))
        .ok_or_else(|| ApiError::unauthorized("Refresh token invalido ou expirado"))?;
    let current_session = store.sessions[session_index].clone();
    let user = store
        .users
        .iter()
        .find(|user| user.id == current_session.user_id)
        .cloned()
        .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;

    let token = new_session_secret();
    let refresh_token = new_session_secret();
    let expires_at = now + Duration::hours(2);
    let refresh_expires_at = now + Duration::days(30);
    store.sessions[session_index] = Session {
        token: protect_session_secret(&token),
        refresh_token: protect_session_secret(&refresh_token),
        user_id: user.id.clone(),
        tenant_id: current_session.tenant_id,
        active_condominium: current_session.active_condominium,
        created_at: now,
        expires_at,
        refresh_expires_at,
    };

    let mut public_user = store
        .public_user(&user.id)
        .ok_or_else(|| ApiError::internal("Utilizador autenticado nao encontrado"))?;
    public_user.active_condominium = store.sessions[session_index].active_condominium.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        expires_at: expires_at.to_rfc3339(),
        user: public_user,
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
}

pub async fn current_context(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<AuthContext, ApiError> {
    let token = bearer_token(headers)?;
    let store = state.store.read().await;
    let session = store
        .sessions
        .iter()
        .find(|session| session_secret_matches(&session.token, &token))
        .ok_or_else(|| ApiError::unauthorized("Sessao invalida ou expirada"))?;
    if session.expires_at <= Utc::now() {
        return Err(ApiError::unauthorized("Sessao expirada"));
    }

    let mut user = store
        .public_user(&session.user_id)
        .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
    user.active_condominium = session.active_condominium.clone();

    Ok(AuthContext {
        token: session.token.clone(),
        tenant_id: session.tenant_id.clone(),
        active_condominium: session.active_condominium.clone(),
        user,
    })
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

fn new_session_secret() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
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
