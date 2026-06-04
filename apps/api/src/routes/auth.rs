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

    let password_upgraded = !is_modern_password_hash(&user.password_hash);
    if password_upgraded {
        store.users[user_index].password_hash = hash_password(&input.password)
            .map_err(|_| ApiError::internal("Nao foi possivel proteger a password"))?;
    }

    let now = Utc::now();
    let expires_at = now + Duration::hours(2);
    let refresh_expires_at = now + Duration::days(30);
    let token = new_signed_session_token(ACCESS_TOKEN_KIND, &user.id, expires_at);
    let refresh_token = new_signed_session_token(REFRESH_TOKEN_KIND, &user.id, refresh_expires_at);
    let app_context = normalize_app_context(&input.app_context);
    let active_condominium = if user.active_condominium.is_empty() {
        store.active_condominium.clone()
    } else {
        user.active_condominium.clone()
    };
    let session = Session {
        token: protect_session_secret(&token),
        refresh_token: protect_session_secret(&refresh_token),
        user_id: user.id.clone(),
        tenant_id: user.tenant_id.clone(),
        active_condominium: active_condominium.clone(),
        app_context: app_context.clone(),
        created_at: now,
        expires_at,
        refresh_expires_at,
    };
    store.sessions.push(session.clone());

    let mut public_user = store
        .public_user(&user.id)
        .ok_or_else(|| ApiError::internal("Utilizador autenticado nao encontrado"))?;
    public_user.active_condominium = active_condominium;
    drop(store);
    persist_auth_session(&state, None, &session, password_upgraded).await?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        expires_at: expires_at.to_rfc3339(),
        user: public_user,
        app_context,
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
    let mut previous_session = None;
    let (user, active_condominium, response_app_context) = if let Some(session_index) =
        session_index
    {
        let current_session = store.sessions[session_index].clone();
        previous_session = Some(current_session.clone());
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
        store.sessions[session_index] = replacement_session.clone();
    } else {
        store.sessions.push(replacement_session.clone());
    }

    let mut public_user = store
        .public_user(&user.id)
        .ok_or_else(|| ApiError::internal("Utilizador autenticado nao encontrado"))?;
    public_user.active_condominium = active_condominium;
    drop(store);
    persist_auth_session(
        &state,
        previous_session.as_ref(),
        &replacement_session,
        false,
    )
    .await?;

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
    if let Some(repository) = &state.postgres {
        repository
            .delete_session_by_token_hash(&current_user.tenant_id, &protect_session_secret(&token))
            .await
            .map_err(|_| {
                ApiError::internal("Nao foi possivel terminar a sessao na base de dados")
            })?;
    } else {
        persist(&state).await?;
    }

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
    let context = current_context(&headers, &state).await?;
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
        can_read: can_access(
            &context,
            module,
            PermissionAction::Read,
            ResourceScope::default(),
        ),
        can_write: can_access(
            &context,
            module,
            PermissionAction::Write,
            ResourceScope::default(),
        ),
        can_delete: can_access(
            &context,
            module,
            PermissionAction::Delete,
            ResourceScope::default(),
        ),
    })
    .collect();

    Ok(Json(PermissionsResponse {
        role: context.user.role,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionAction {
    Read,
    Write,
    Delete,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct ResourceScope<'a> {
    pub tenant_id: Option<&'a str>,
    pub app_context: Option<&'a str>,
    pub condominium_id: Option<&'a str>,
    pub resource_id: Option<&'a str>,
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
        if user.tenant_id != session.tenant_id {
            return Err(ApiError::unauthorized(
                "Sessao nao pertence ao tenant do utilizador",
            ));
        }
        user.active_condominium = session.active_condominium.clone();

        return Ok(AuthContext {
            token: session.token.clone(),
            tenant_id: session.tenant_id.clone(),
            active_condominium: session.active_condominium.clone(),
            user,
            app_context: session.app_context.clone(),
        });
    }

    drop(store);
    if let Some(repository) = &state.postgres {
        let token_hash = protect_session_secret(&token);
        let session = repository
            .find_active_session_by_token_hash(&token_hash, Utc::now())
            .await
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel validar sessao na base de dados",
                    error,
                )
            })?;
        if let Some(session) = session {
            let mut user = repository
                .find_public_user(&session.tenant_id, &session.user_id)
                .await
                .map_err(|error| {
                    ApiError::internal_with_source(
                        "Nao foi possivel carregar utilizador da base de dados",
                        error,
                    )
                })?
                .ok_or_else(|| ApiError::unauthorized("Utilizador da sessao nao encontrado"))?;
            let active_condominium = if session.active_condominium.is_empty() {
                user.active_condominium.clone()
            } else {
                session.active_condominium.clone()
            };
            user.active_condominium = active_condominium.clone();

            return Ok(AuthContext {
                token: session.token,
                tenant_id: session.tenant_id,
                active_condominium,
                user,
                app_context: session.app_context,
            });
        }
    }

    let store = state.store.read().await;
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
    let context = current_context(headers, state).await?;
    if can_access(
        &context,
        module,
        PermissionAction::Write,
        ResourceScope {
            tenant_id: Some(&context.tenant_id),
            ..ResourceScope::default()
        },
    ) {
        Ok(context.user)
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
    let context = current_context(headers, state).await?;
    if can_access(
        &context,
        module,
        PermissionAction::Delete,
        ResourceScope {
            tenant_id: Some(&context.tenant_id),
            ..ResourceScope::default()
        },
    ) {
        Ok(context.user)
    } else {
        Err(ApiError::forbidden(
            "Sem permissao para apagar neste modulo",
        ))
    }
}

pub async fn require_context(
    headers: &HeaderMap,
    state: &AppState,
    expected_app_context: &str,
) -> Result<AuthContext, ApiError> {
    let context = current_context(headers, state).await?;
    if context.app_context == expected_app_context {
        Ok(context)
    } else {
        Err(ApiError::forbidden(format!(
            "Endpoint reservado para a app {expected_app_context}"
        )))
    }
}

pub async fn require_context_permission(
    headers: &HeaderMap,
    state: &AppState,
    expected_app_context: &str,
    module: &str,
    action: PermissionAction,
    mut resource: ResourceScope<'_>,
) -> Result<AuthContext, ApiError> {
    let context = require_context(headers, state, expected_app_context).await?;
    if resource.tenant_id.is_none() {
        resource.tenant_id = Some(&context.tenant_id);
    }

    if can_access(&context, module, action, resource) {
        Ok(context)
    } else {
        Err(ApiError::forbidden("Sem permissao para este recurso"))
    }
}

pub fn can_access(
    context: &AuthContext,
    module: &str,
    action: PermissionAction,
    resource: ResourceScope<'_>,
) -> bool {
    if let Some(tenant_id) = resource.tenant_id {
        if tenant_id != context.tenant_id {
            return false;
        }
    }

    if let Some(app_context) = resource.app_context {
        if app_context != context.app_context {
            return false;
        }
    }

    if matches!(resource.condominium_id, Some("")) || matches!(resource.resource_id, Some("")) {
        return false;
    }

    role_allows(&context.user.role, &context.app_context, module, action)
}

fn role_allows(role: &str, app_context: &str, module: &str, action: PermissionAction) -> bool {
    let role = normalize_role(role);
    match app_context {
        "client" => client_role_allows(&role, module, action),
        "worker" => worker_role_allows(&role, module, action),
        _ => hq_role_allows(&role, module, action),
    }
}

fn hq_role_allows(role: &str, module: &str, action: PermissionAction) -> bool {
    if is_admin_role(role) || role.contains("gestor") || role.contains("gestao") {
        return true;
    }

    if role.contains("financeiro") {
        return match action {
            PermissionAction::Read => matches!(
                module,
                "accounting" | "reports" | "condominiums" | "operations"
            ),
            PermissionAction::Write => matches!(module, "accounting" | "reports"),
            PermissionAction::Delete => module == "accounting",
        };
    }

    if is_worker_role(role) || role.contains("operador") {
        return match action {
            PermissionAction::Read => matches!(module, "operations" | "condominiums" | "reports"),
            PermissionAction::Write => matches!(module, "operations" | "condominiums"),
            PermissionAction::Delete => false,
        };
    }

    matches!(action, PermissionAction::Read)
        && matches!(module, "operations" | "condominiums" | "reports")
}

fn worker_role_allows(role: &str, module: &str, action: PermissionAction) -> bool {
    if is_admin_role(role) {
        return true;
    }

    if !(is_worker_role(role) || role.contains("operador")) {
        return false;
    }

    match action {
        PermissionAction::Read => matches!(module, "operations" | "condominiums" | "maintenance"),
        PermissionAction::Write => matches!(module, "operations" | "maintenance"),
        PermissionAction::Delete => false,
    }
}

fn client_role_allows(role: &str, module: &str, action: PermissionAction) -> bool {
    if is_admin_role(role) {
        return true;
    }

    let client_like = role.contains("cliente")
        || role.contains("condomino")
        || role.contains("condómino")
        || role.contains("residente")
        || role.contains("morador");
    if !client_like {
        return false;
    }

    match action {
        PermissionAction::Read => matches!(module, "operations" | "condominiums" | "documents"),
        PermissionAction::Write => module == "operations",
        PermissionAction::Delete => false,
    }
}

fn is_admin_role(role: &str) -> bool {
    role.contains("administrador") || role.contains("admin")
}

fn is_worker_role(role: &str) -> bool {
    role.contains("worker")
        || role.contains("funcionario")
        || role.contains("funcionário")
        || role.contains("tecnico")
        || role.contains("técnico")
}

fn normalize_role(role: &str) -> String {
    role.trim().to_lowercase()
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
    let nonce = new_session_secret();
    let unsigned = signed_session_payload(kind, user_id, expires_at.timestamp(), Some(&nonce));
    let signature = sign_session_payload(&unsigned);
    format!("{unsigned}:{signature}")
}

fn parse_signed_session_token(
    token: &str,
    expected_kind: &str,
) -> Result<SignedSessionToken, ApiError> {
    let parts = token.split(':').collect::<Vec<_>>();
    if !matches!(parts.len(), 6 | 7) || parts[0] != "gestisac" || parts[1] != "v1" {
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
    let (unsigned, signature) = if parts.len() == 7 {
        (
            signed_session_payload(kind, user_id, expires_at_timestamp, Some(parts[5])),
            parts[6],
        )
    } else {
        (
            signed_session_payload(kind, user_id, expires_at_timestamp, None),
            parts[5],
        )
    };
    let expected_signature = sign_session_payload(&unsigned);
    if expected_signature != signature {
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

fn signed_session_payload(
    kind: &str,
    user_id: &str,
    expires_at_timestamp: i64,
    nonce: Option<&str>,
) -> String {
    match nonce {
        Some(nonce) => {
            format!("{SIGNED_TOKEN_PREFIX}:{kind}:{user_id}:{expires_at_timestamp}:{nonce}")
        }
        None => format!("{SIGNED_TOKEN_PREFIX}:{kind}:{user_id}:{expires_at_timestamp}"),
    }
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

async fn persist_auth_session(
    state: &AppState,
    previous: Option<&Session>,
    session: &Session,
    requires_full_persist: bool,
) -> Result<(), ApiError> {
    if requires_full_persist {
        return persist(state).await;
    }

    if let Some(repository) = &state.postgres {
        repository
            .replace_session(previous, session)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel persistir a sessao na base de dados"))
    } else {
        persist(state).await
    }
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

    #[test]
    fn signed_session_tokens_are_unique_for_parallel_app_logins() {
        let expires_at = Utc::now() + Duration::hours(2);

        let first = new_signed_session_token(ACCESS_TOKEN_KIND, "user-1", expires_at);
        let second = new_signed_session_token(ACCESS_TOKEN_KIND, "user-1", expires_at);

        assert_ne!(first, second);
        assert_eq!(
            parse_signed_session_token(&first, ACCESS_TOKEN_KIND)
                .expect("generated access token should parse")
                .user_id,
            "user-1"
        );
        assert_eq!(
            parse_signed_session_token(&second, ACCESS_TOKEN_KIND)
                .expect("generated access token should parse")
                .user_id,
            "user-1"
        );
    }

    #[test]
    fn legacy_signed_session_tokens_still_parse() {
        let expires_at = Utc::now() + Duration::hours(2);
        let unsigned = signed_session_payload(
            ACCESS_TOKEN_KIND,
            "legacy-user",
            expires_at.timestamp(),
            None,
        );
        let legacy_token = format!("{}:{}", unsigned, sign_session_payload(&unsigned));

        let parsed = parse_signed_session_token(&legacy_token, ACCESS_TOKEN_KIND)
            .expect("legacy signed token should remain valid");

        assert_eq!(parsed.user_id, "legacy-user");
    }
}
