use crate::{
    error::ApiError,
    models::store::{Ocorrencia, OcorrenciaStatus, PublicUser},
    routes::{
        accounting,
        auth::{can_access, current_context, AuthContext, PermissionAction, ResourceScope},
    },
    state::AppState,
};
use axum::{extract::State, http::HeaderMap, routing::get, Json, Router};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SharedMeResponse {
    pub user: PublicUser,
    pub tenant_id: String,
    pub active_condominium: String,
    pub app_context: String,
    pub permissions: Vec<PermissionModule>,
    pub guardrails: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionModule {
    pub module: String,
    pub can_read: bool,
    pub can_write: bool,
    pub can_delete: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NamespacedDashboardResponse {
    pub app_context: String,
    pub title: String,
    pub subtitle: String,
    pub user: PublicUser,
    pub active_condominium: String,
    pub metrics: Vec<DashboardMetric>,
    pub cards: Vec<DashboardCard>,
    pub guardrails: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMetric {
    pub label: String,
    pub value: String,
    pub tone: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardCard {
    pub title: String,
    pub description: String,
    pub endpoint: String,
    pub action_label: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/shared/me", get(shared_me))
        .route("/api/hq/dashboard", get(hq_dashboard))
        .route("/api/client/dashboard", get(client_dashboard))
        .route("/api/worker/dashboard", get(worker_dashboard))
        .route("/api/hq/tickets", get(hq_tickets))
        .route("/api/client/tickets", get(client_tickets))
        .route("/api/hq/accounting/overview", get(accounting::overview))
        .route(
            "/api/hq/accounting/condominiums/{id}",
            get(accounting::condominium_context),
        )
        .route(
            "/api/hq/accounting/fractions/{fraction_id}/statement",
            get(accounting::fraction_statement),
        )
}

pub async fn shared_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<SharedMeResponse>, ApiError> {
    let context = current_context(&headers, &state).await?;
    let permissions = permissions_for_context(&context);
    Ok(Json(SharedMeResponse {
        user: context.user.clone(),
        tenant_id: context.tenant_id.clone(),
        active_condominium: context.active_condominium.clone(),
        app_context: context.app_context.clone(),
        permissions,
        guardrails: guardrails_for("shared"),
    }))
}

pub async fn hq_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<NamespacedDashboardResponse>, ApiError> {
    let context = require_app_context(&headers, &state, "hq").await?;
    let store = state.store.read().await;
    let open_tickets = store.ocorrencias_abertas().len();
    let validation_pending = store
        .ocorrencias
        .iter()
        .filter(|item| item.hq_validation_status.eq_ignore_ascii_case("pendente"))
        .count();
    let unreconciled = store
        .bank_transactions
        .iter()
        .filter(|item| {
            !item
                .reconciliation_status
                .eq_ignore_ascii_case("reconciled")
        })
        .count();

    Ok(Json(NamespacedDashboardResponse {
        app_context: "hq".to_string(),
        title: "Dashboard HQ".to_string(),
        subtitle: "Backoffice completo com visao operacional e guardrails de privacidade."
            .to_string(),
        user: context.user,
        active_condominium: context.active_condominium,
        metrics: vec![
            metric("Condominios", store.condominiums.len(), "neutral"),
            metric("Tickets abertos", open_tickets, "warning"),
            metric("Resolucao a validar", validation_pending, "info"),
            metric("Movimentos por reconciliar", unreconciled, "danger"),
        ],
        cards: vec![
            card(
                "Triagem de tickets",
                "Novos, por atribuir, atrasados e resolucoes a validar.",
                "/api/hq/tickets",
                "Abrir triagem",
            ),
            card(
                "Contabilidade geral",
                "Apenas estatisticas, avisos e saude do modulo no nivel geral.",
                "/api/hq/accounting/overview",
                "Ver overview",
            ),
            card(
                "Contextos financeiros",
                "Detalhe desbloqueado so por condominio, fracao, fornecedor, banco ou caixa.",
                "/api/hq/accounting/condominiums/{id}",
                "Selecionar contexto",
            ),
        ],
        guardrails: guardrails_for("hq"),
    }))
}

pub async fn client_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<NamespacedDashboardResponse>, ApiError> {
    let context = require_app_context(&headers, &state, "client").await?;
    let store = state.store.read().await;
    let tickets = client_visible_tickets(&store.ocorrencias, &context.user);
    let open_tickets = tickets
        .iter()
        .filter(|item| item.status != OcorrenciaStatus::Fechada)
        .count();

    Ok(Json(NamespacedDashboardResponse {
        app_context: "client".to_string(),
        title: "Dashboard Cliente".to_string(),
        subtitle: "Estado publico, pedidos e documentos permitidos, sem informacao interna."
            .to_string(),
        user: context.user,
        active_condominium: context.active_condominium,
        metrics: vec![
            metric("Tickets visiveis", tickets.len(), "neutral"),
            metric("Em acompanhamento", open_tickets, "warning"),
            metric("Dados internos", 0, "success"),
        ],
        cards: vec![
            card(
                "Criar avaria",
                "Wizard publico com local, descricao, foto e contacto.",
                "/api/ocorrencias/publica",
                "Reportar",
            ),
            card(
                "Acompanhar estado",
                "Timeline publica e comentarios permitidos.",
                "/api/client/tickets",
                "Ver pedidos",
            ),
        ],
        guardrails: guardrails_for("client"),
    }))
}

pub async fn worker_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<NamespacedDashboardResponse>, ApiError> {
    let context = require_app_context(&headers, &state, "worker").await?;
    let store = state.store.read().await;
    let tickets = worker_visible_tickets(&store.ocorrencias, &context.user);
    let urgent = tickets
        .iter()
        .filter(|item| item.prioridade.as_str().eq_ignore_ascii_case("urgente"))
        .count();
    let in_progress = tickets
        .iter()
        .filter(|item| item.status == OcorrenciaStatus::EmCurso)
        .count();
    let awaiting_parts = tickets
        .iter()
        .filter(|item| item.status == OcorrenciaStatus::AguardaPecas)
        .count();

    Ok(Json(NamespacedDashboardResponse {
        app_context: "worker".to_string(),
        title: "Dashboard Worker".to_string(),
        subtitle: "Fila operacional focada em hoje, urgentes, em curso e pecas.".to_string(),
        user: context.user,
        active_condominium: context.active_condominium,
        metrics: vec![
            metric("Atribuidos", tickets.len(), "neutral"),
            metric("Urgentes", urgent, "danger"),
            metric("Em curso", in_progress, "info"),
            metric("Aguardar pecas", awaiting_parts, "warning"),
        ],
        cards: vec![
            card(
                "Fila do funcionario",
                "Tickets atribuidos e ordenados para execucao no terreno.",
                "/api/worker/tickets",
                "Abrir fila",
            ),
            card(
                "Modo execucao",
                "Chegar, iniciar, pausar, pedir pecas e resolver.",
                "/api/ocorrencias/{id}/worker-action",
                "Executar",
            ),
        ],
        guardrails: guardrails_for("worker"),
    }))
}

pub async fn hq_tickets(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Ocorrencia>>, ApiError> {
    require_app_context(&headers, &state, "hq").await?;
    let store = state.store.read().await;
    Ok(Json(store.ocorrencias.clone()))
}

pub async fn client_tickets(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Ocorrencia>>, ApiError> {
    let context = require_app_context(&headers, &state, "client").await?;
    let store = state.store.read().await;
    let tickets = client_visible_tickets(&store.ocorrencias, &context.user)
        .into_iter()
        .map(sanitize_client_ticket)
        .collect();
    Ok(Json(tickets))
}

async fn require_app_context(
    headers: &HeaderMap,
    state: &AppState,
    expected: &str,
) -> Result<AuthContext, ApiError> {
    let context = current_context(headers, state).await?;
    if context.app_context == expected {
        Ok(context)
    } else {
        Err(ApiError::forbidden(format!(
            "Endpoint reservado para a app {expected}"
        )))
    }
}

fn permissions_for_context(context: &AuthContext) -> Vec<PermissionModule> {
    [
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
            context,
            module,
            PermissionAction::Read,
            ResourceScope::default(),
        ),
        can_write: can_access(
            context,
            module,
            PermissionAction::Write,
            ResourceScope::default(),
        ),
        can_delete: can_access(
            context,
            module,
            PermissionAction::Delete,
            ResourceScope::default(),
        ),
    })
    .collect()
}

fn client_visible_tickets(items: &[Ocorrencia], user: &PublicUser) -> Vec<Ocorrencia> {
    let email = user.email.to_lowercase();
    items
        .iter()
        .filter(|item| {
            item.origin_channel.eq_ignore_ascii_case("client")
                || (!email.is_empty() && item.requisitante_email.to_lowercase() == email)
        })
        .cloned()
        .collect()
}

fn worker_visible_tickets(items: &[Ocorrencia], user: &PublicUser) -> Vec<Ocorrencia> {
    let user_id = user.id.to_lowercase();
    let user_name = user.name.to_lowercase();
    let user_email = user.email.to_lowercase();
    items
        .iter()
        .filter(|item| {
            let assigned =
                format!("{} {}", item.assigned_worker_id, item.atribuido_a).to_lowercase();
            assigned.contains(&user_id)
                || assigned.contains(&user_name)
                || assigned.contains(&user_email)
        })
        .cloned()
        .collect()
}

fn sanitize_client_ticket(mut item: Ocorrencia) -> Ocorrencia {
    item.custo_estimado.clear();
    item.custo_final.clear();
    item.fornecedor_id.clear();
    item.referencia_contrato.clear();
    item.technical_notes.clear();
    item.assigned_worker_id.clear();
    item.hq_validation_notes.clear();
    item.hq_validation_status.clear();
    item.requires_hq_validation = false;
    item.worker_time_minutes = 0;
    item
}

fn metric(label: &str, value: impl ToString, tone: &str) -> DashboardMetric {
    DashboardMetric {
        label: label.to_string(),
        value: value.to_string(),
        tone: tone.to_string(),
    }
}

fn card(title: &str, description: &str, endpoint: &str, action_label: &str) -> DashboardCard {
    DashboardCard {
        title: title.to_string(),
        description: description.to_string(),
        endpoint: endpoint.to_string(),
        action_label: action_label.to_string(),
    }
}

fn guardrails_for(app_context: &str) -> Vec<String> {
    match app_context {
        "hq" => vec![
            "Contabilidade geral sem valores individuais.".to_string(),
            "Detalhe financeiro apenas depois de selecionar contexto autorizado.".to_string(),
            "Endpoints legacy continuam disponiveis durante a migracao.".to_string(),
        ],
        "client" => vec![
            "Sem custos internos, notas tecnicas, fornecedor ou validacao HQ.".to_string(),
            "Tickets filtrados por origem cliente ou email do requisitante.".to_string(),
        ],
        "worker" => vec![
            "Funcionario ve apenas trabalho atribuido.".to_string(),
            "Payloads preparados para PWA e app nativa futura.".to_string(),
        ],
        _ => vec![
            "Sessao, tenant e permissoes expostos sem tokens ou segredos.".to_string(),
            "Todas as novas apps devem usar namespaces dedicados.".to_string(),
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn user(email: &str) -> PublicUser {
        PublicUser {
            id: "worker-1".to_string(),
            tenant_id: "demo".to_string(),
            name: "Tecnico Demo".to_string(),
            email: email.to_string(),
            role: "Operador".to_string(),
            active_condominium: "condo-1".to_string(),
            active_condominiums: 1,
        }
    }

    #[test]
    fn client_tickets_are_limited_to_client_origin_or_requester_email() {
        let mut own = Ocorrencia::default();
        own.id = "own".to_string();
        own.requisitante_email = "cliente@example.com".to_string();

        let mut public_origin = Ocorrencia::default();
        public_origin.id = "origin".to_string();
        public_origin.origin_channel = "client".to_string();

        let mut other = Ocorrencia::default();
        other.id = "other".to_string();
        other.requisitante_email = "outra@example.com".to_string();
        other.origin_channel = "hq".to_string();

        let visible =
            client_visible_tickets(&[own, public_origin, other], &user("cliente@example.com"));
        let ids: Vec<String> = visible.into_iter().map(|item| item.id).collect();

        assert_eq!(ids, vec!["own".to_string(), "origin".to_string()]);
    }

    #[test]
    fn client_ticket_payload_removes_internal_fields() {
        let item = Ocorrencia {
            custo_estimado: "120.00".to_string(),
            custo_final: "95.00".to_string(),
            fornecedor_id: "supplier-1".to_string(),
            referencia_contrato: "contract-1".to_string(),
            technical_notes: "nota interna".to_string(),
            assigned_worker_id: "worker-1".to_string(),
            hq_validation_notes: "rever".to_string(),
            hq_validation_status: "pendente".to_string(),
            requires_hq_validation: true,
            worker_time_minutes: 45,
            ..Ocorrencia::default()
        };

        let sanitized = sanitize_client_ticket(item);

        assert!(sanitized.custo_estimado.is_empty());
        assert!(sanitized.custo_final.is_empty());
        assert!(sanitized.fornecedor_id.is_empty());
        assert!(sanitized.referencia_contrato.is_empty());
        assert!(sanitized.technical_notes.is_empty());
        assert!(sanitized.assigned_worker_id.is_empty());
        assert!(sanitized.hq_validation_notes.is_empty());
        assert!(sanitized.hq_validation_status.is_empty());
        assert!(!sanitized.requires_hq_validation);
        assert_eq!(sanitized.worker_time_minutes, 0);
    }

    #[test]
    fn worker_tickets_are_limited_to_assigned_work() {
        let mut assigned = Ocorrencia::default();
        assigned.id = "assigned".to_string();
        assigned.assigned_worker_id = "worker-1".to_string();

        let mut unassigned = Ocorrencia::default();
        unassigned.id = "unassigned".to_string();
        unassigned.assigned_worker_id = "worker-2".to_string();
        unassigned.atribuido_a = "Outra pessoa".to_string();

        let visible = worker_visible_tickets(&[assigned, unassigned], &user("worker@example.com"));
        let ids: Vec<String> = visible.into_iter().map(|item| item.id).collect();

        assert_eq!(ids, vec!["assigned".to_string()]);
    }
}
