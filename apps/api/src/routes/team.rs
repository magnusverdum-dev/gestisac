use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{AppStore, Ocorrencia, OcorrenciaStatus, PublicUser},
    },
    routes::auth::{can_access, current_context, PermissionAction, ResourceScope},
    state::AppState,
};
use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub active_condominium: String,
    pub active_condominiums: usize,
    pub open_tasks: usize,
    pub in_progress_tasks: usize,
    pub pending_validation: usize,
    pub last_activity_at: String,
}

pub async fn team(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<TeamMember>>, ApiError> {
    let context = current_context(&headers, &state).await?;
    if context.app_context == "client" {
        return Ok(Json(paginate(&Vec::<TeamMember>::new(), &params)));
    }

    let can_read_team = can_access(
        &context,
        "operations",
        PermissionAction::Read,
        ResourceScope::default(),
    ) || can_access(
        &context,
        "settings",
        PermissionAction::Read,
        ResourceScope::default(),
    );

    if !can_read_team {
        return Err(ApiError::forbidden("Sem permissao para consultar equipa"));
    }

    let users = if let Some(repository) = &state.postgres {
        repository
            .list_relational_users_page(&context.tenant_id, 1, 100)
            .await
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar equipa na base de dados",
                    error,
                )
            })?
            .items
    } else {
        let store = state.store.read().await;
        let active_condominiums = store.condominiums.len();
        store
            .users
            .iter()
            .filter(|user| user.tenant_id == context.tenant_id)
            .map(|user| PublicUser {
                id: user.id.clone(),
                tenant_id: user.tenant_id.clone(),
                name: user.name.clone(),
                email: user.email.clone(),
                role: user.role.clone(),
                active_condominium: user.active_condominium.clone(),
                active_condominiums,
            })
            .collect()
    };

    let store = state.store.read().await;
    let members = users
        .into_iter()
        .map(|user| team_member_for_user(user, &store))
        .collect::<Vec<_>>();

    Ok(Json(paginate(&members, &params)))
}

fn team_member_for_user(user: PublicUser, store: &AppStore) -> TeamMember {
    let matching_ocorrencias = store
        .ocorrencias
        .iter()
        .filter(|item| is_assigned_to_user(item, &user))
        .collect::<Vec<_>>();
    let matching_inspections = store
        .inspections
        .iter()
        .filter(|item| matches_user(&item.assigned_worker_id, &user))
        .collect::<Vec<_>>();

    let open_tasks = matching_ocorrencias
        .iter()
        .filter(|item| !is_closed_ocorrencia(&item.status))
        .count()
        + matching_inspections
            .iter()
            .filter(|item| !is_closed_status(&item.status))
            .count();
    let in_progress_tasks = matching_ocorrencias
        .iter()
        .filter(|item| item.status == OcorrenciaStatus::EmCurso)
        .count()
        + matching_inspections
            .iter()
            .filter(|item| normalize(&item.status).contains("curso"))
            .count();
    let pending_validation = matching_ocorrencias
        .iter()
        .filter(|item| item.hq_validation_status.eq_ignore_ascii_case("pendente"))
        .count()
        + matching_inspections
            .iter()
            .filter(|item| normalize(&item.status).contains("submet"))
            .count();
    let last_activity_at = matching_ocorrencias
        .iter()
        .map(|item| item.atualizado_em.as_str())
        .chain(
            matching_inspections
                .iter()
                .map(|item| item.submitted_at.as_str()),
        )
        .chain(
            store
                .calendar_events
                .iter()
                .filter(|item| {
                    item.attendees
                        .iter()
                        .any(|attendee| matches_user(attendee, &user))
                })
                .map(|item| item.updated_at.as_str()),
        )
        .filter(|value| !value.trim().is_empty())
        .max()
        .unwrap_or("")
        .to_string();

    TeamMember {
        id: user.id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        role: user.role,
        active_condominium: user.active_condominium,
        active_condominiums: user.active_condominiums,
        open_tasks,
        in_progress_tasks,
        pending_validation,
        last_activity_at,
    }
}

fn is_assigned_to_user(item: &Ocorrencia, user: &PublicUser) -> bool {
    let assigned = format!("{} {}", item.assigned_worker_id, item.atribuido_a);
    matches_user(&assigned, user)
}

fn matches_user(value: &str, user: &PublicUser) -> bool {
    let value = normalize(value);
    if value.is_empty() {
        return false;
    }

    [user.id.as_str(), user.name.as_str(), user.email.as_str()]
        .into_iter()
        .map(normalize)
        .any(|candidate| !candidate.is_empty() && value.contains(&candidate))
}

fn is_closed_ocorrencia(status: &OcorrenciaStatus) -> bool {
    matches!(
        status,
        OcorrenciaStatus::Resolvida | OcorrenciaStatus::Fechada
    )
}

fn is_closed_status(status: &str) -> bool {
    let status = normalize(status);
    status.contains("conclu")
        || status.contains("confirm")
        || status.contains("fech")
        || status.contains("resolvid")
        || status.contains("cancel")
}

fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn user() -> PublicUser {
        PublicUser {
            id: "worker-demo-1".to_string(),
            tenant_id: "tenant-demo".to_string(),
            name: "Tecnico Demo".to_string(),
            email: "worker@gestisac.pt".to_string(),
            role: "Tecnico".to_string(),
            active_condominium: "Condominio Vila Verde".to_string(),
            active_condominiums: 1,
        }
    }

    #[test]
    fn matches_user_by_id_name_or_email() {
        let user = user();

        assert!(matches_user("worker-demo-1", &user));
        assert!(matches_user("Atribuido a Tecnico Demo", &user));
        assert!(matches_user("worker@gestisac.pt", &user));
        assert!(!matches_user("outra pessoa", &user));
    }

    #[test]
    fn closed_statuses_are_not_open_work() {
        assert!(is_closed_ocorrencia(&OcorrenciaStatus::Resolvida));
        assert!(is_closed_ocorrencia(&OcorrenciaStatus::Fechada));
        assert!(is_closed_status("Confirmada"));
        assert!(is_closed_status("Concluida"));
        assert!(!is_closed_status("Em curso"));
    }
}
