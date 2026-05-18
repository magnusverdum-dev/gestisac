use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{
            AppStore, Assembly, AuditLogEntry, Building, Condominium, Document, Fraction,
            MaintenanceItem, Report, Resident, Supplier, Ticket,
        },
    },
    routes::auth::{current_context, current_user, require_delete, require_write},
    state::AppState,
};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct CondominiumInput {
    pub name: String,
    pub location: String,
    pub buildings: Option<u16>,
    pub fractions: Option<u16>,
    pub residents: Option<u16>,
    pub status: Option<String>,
    pub notice: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingInput {
    pub condominium: String,
    pub name: String,
    pub floors: Option<u16>,
    pub fractions: Option<u16>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FractionInput {
    pub condominium: String,
    pub building: String,
    pub number: String,
    pub floor: String,
    pub typology: String,
    pub owner: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResidentInput {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub condominium: String,
    pub fraction: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketInput {
    pub title: String,
    pub condominium: String,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplierInput {
    pub name: String,
    pub category: String,
    pub status: Option<String>,
    pub contact: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInput {
    pub title: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub condominium: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateDocumentInput {
    pub template: String,
    pub condominium: Option<String>,
    pub resident: Option<String>,
    pub fraction: Option<String>,
    pub notes: Option<String>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentTemplate {
    pub id: String,
    pub label: String,
    pub category: String,
    pub description: String,
    pub output: String,
    pub data_sources: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentPreview {
    pub document: Document,
    pub preview_type: String,
    pub content: Option<String>,
    pub download_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportInput {
    pub title: String,
    pub period: String,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPreview {
    pub report: Report,
    pub generated_at: String,
    pub active_condominium: String,
    pub kpis: Vec<ReportKpi>,
    pub sections: Vec<ReportSection>,
    pub recommended_actions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportKpi {
    pub label: String,
    pub value: String,
    pub detail: String,
    pub tone: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSection {
    pub title: String,
    pub rows: Vec<ReportRow>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportRow {
    pub label: String,
    pub value: String,
    pub detail: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceInput {
    pub title: String,
    pub supplier: String,
    pub status: Option<String>,
    pub date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssemblyInput {
    pub title: String,
    pub condominium: String,
    pub date: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveCondominiumInput {
    pub name: String,
}

pub async fn active_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<String>, ApiError> {
    let context = current_context(&headers, &state).await?;
    Ok(Json(context.active_condominium))
}

pub async fn update_active_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ActiveCondominiumInput>,
) -> Result<Json<String>, ApiError> {
    let context = current_context(&headers, &state).await?;
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Condominio")?;
    let requested_name = input.name.trim().to_string();

    let mut store = state.store.write().await;
    let tenant_exists = store
        .tenants
        .iter()
        .any(|item| item.id == context.tenant_id);
    if !tenant_exists {
        return Err(ApiError::unauthorized("Tenant da sessao nao encontrado"));
    }
    let exists = store
        .condominiums
        .iter()
        .any(|item| item.name.eq_ignore_ascii_case(&requested_name));
    if !exists {
        return Err(ApiError::not_found("Condominio nao encontrado"));
    }

    if let Some(session) = store
        .sessions
        .iter_mut()
        .find(|item| item.token == context.token && item.expires_at > Utc::now())
    {
        session.active_condominium = requested_name.clone();
    }
    if let Some(account) = store.users.iter_mut().find(|item| item.id == user.id) {
        account.active_condominium = requested_name.clone();
    }
    store.add_audit(
        &user,
        "condominiums",
        "select",
        &requested_name,
        format!("Condominio ativo alterado para {requested_name}"),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(requested_name))
}

#[allow(dead_code)]
pub async fn condominiums(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Condominium>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.condominiums, &params)))
}

#[allow(dead_code)]
pub async fn create_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    validate_required(&input.location, "Localizacao")?;

    let mut item = Condominium {
        id: new_id(),
        name: input.name.trim().to_string(),
        location: input.location.trim().to_string(),
        buildings: input.buildings.unwrap_or(1),
        fractions: input.fractions.unwrap_or(0),
        residents: input.residents.unwrap_or(0),
        status: input.status.unwrap_or_else(|| "Ativo".to_string()),
        notice: input
            .notice
            .unwrap_or_else(|| "Sem avisos criticos".to_string()),
        ..Default::default()
    };
    item.ensure_profile_defaults();

    let mut store = state.store.write().await;
    store.condominiums.push(item.clone());
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &item.id,
        format!("Condominio {} criado", item.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

#[allow(dead_code)]
pub async fn update_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    validate_required(&input.location, "Localizacao")?;

    let mut store = state.store.write().await;
    let item = store
        .condominiums
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    item.name = input.name.trim().to_string();
    item.location = input.location.trim().to_string();
    item.buildings = input.buildings.unwrap_or(item.buildings);
    item.fractions = input.fractions.unwrap_or(item.fractions);
    item.residents = input.residents.unwrap_or(item.residents);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    item.notice = input.notice.unwrap_or_else(|| item.notice.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "update",
        &response.id,
        format!("Condominio {} atualizado", response.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

#[allow(dead_code)]
pub async fn delete_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Condominium>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let original_len = store.condominiums.len();
    let deleted_name = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.name.clone())
        .unwrap_or_else(|| "Condominio".to_string());
    store.condominiums.retain(|item| item.id != id);
    if store.condominiums.len() == original_len {
        return Err(ApiError::not_found("Condominio nao encontrado"));
    }
    store.add_audit(
        &user,
        "condominiums",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.condominiums.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn buildings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Building>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.buildings, &params)))
}

pub async fn create_building(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<BuildingInput>,
) -> Result<Json<Building>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.name, "Nome do edificio")?;

    let item = Building {
        id: new_id(),
        condominium: input.condominium.trim().to_string(),
        name: input.name.trim().to_string(),
        floors: input.floors.unwrap_or(1),
        fractions: input.fractions.unwrap_or(0),
        status: input.status.unwrap_or_else(|| "Operacional".to_string()),
    };

    let mut store = state.store.write().await;
    store.buildings.insert(0, item.clone());
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &item.id,
        format!("Edificio {} criado", item.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_building(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<BuildingInput>,
) -> Result<Json<Building>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.name, "Nome do edificio")?;

    let mut store = state.store.write().await;
    let item = store
        .buildings
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Edificio nao encontrado"))?;

    item.condominium = input.condominium.trim().to_string();
    item.name = input.name.trim().to_string();
    item.floors = input.floors.unwrap_or(item.floors);
    item.fractions = input.fractions.unwrap_or(item.fractions);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "update",
        &response.id,
        format!("Edificio {} atualizado", response.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_building(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Building>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let original_len = store.buildings.len();
    let deleted_name = store
        .buildings
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.name.clone())
        .unwrap_or_else(|| "Edificio".to_string());
    store.buildings.retain(|item| item.id != id);
    if store.buildings.len() == original_len {
        return Err(ApiError::not_found("Edificio nao encontrado"));
    }
    store.add_audit(
        &user,
        "condominiums",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.buildings.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn fractions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Fraction>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.fractions, &params)))
}

pub async fn create_fraction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<FractionInput>,
) -> Result<Json<Fraction>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.building, "Edificio")?;
    validate_required(&input.number, "Fracao")?;
    validate_required(&input.owner, "Proprietario")?;

    let item = Fraction {
        id: new_id(),
        condominium: input.condominium.trim().to_string(),
        building: input.building.trim().to_string(),
        number: input.number.trim().to_string(),
        floor: input.floor.trim().to_string(),
        typology: input.typology.trim().to_string(),
        owner: input.owner.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Regularizada".to_string()),
    };

    let mut store = state.store.write().await;
    store.fractions.insert(0, item.clone());
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &item.id,
        format!("Fracao {} criada", item.number),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_fraction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<FractionInput>,
) -> Result<Json<Fraction>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.building, "Edificio")?;
    validate_required(&input.number, "Fracao")?;
    validate_required(&input.owner, "Proprietario")?;

    let mut store = state.store.write().await;
    let item = store
        .fractions
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Fracao nao encontrada"))?;

    item.condominium = input.condominium.trim().to_string();
    item.building = input.building.trim().to_string();
    item.number = input.number.trim().to_string();
    item.floor = input.floor.trim().to_string();
    item.typology = input.typology.trim().to_string();
    item.owner = input.owner.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "update",
        &response.id,
        format!("Fracao {} atualizada", response.number),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_fraction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Fraction>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let original_len = store.fractions.len();
    let deleted_name = store
        .fractions
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.number.clone())
        .unwrap_or_else(|| "Fracao".to_string());
    store.fractions.retain(|item| item.id != id);
    if store.fractions.len() == original_len {
        return Err(ApiError::not_found("Fracao nao encontrada"));
    }
    store.add_audit(
        &user,
        "condominiums",
        "delete",
        &id,
        format!("Fracao {deleted_name} apagada"),
    );
    let response = store.fractions.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn residents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Resident>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.residents, &params)))
}

pub async fn create_resident(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ResidentInput>,
) -> Result<Json<Resident>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome")?;
    validate_required(&input.email, "Email")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;

    let item = Resident {
        id: new_id(),
        name: input.name.trim().to_string(),
        email: input.email.trim().to_string(),
        phone: input.phone.trim().to_string(),
        condominium: input.condominium.trim().to_string(),
        fraction: input.fraction.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Ativo".to_string()),
    };

    let mut store = state.store.write().await;
    store.residents.insert(0, item.clone());
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &item.id,
        format!("Condomino {} criado", item.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_resident(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<ResidentInput>,
) -> Result<Json<Resident>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome")?;
    validate_required(&input.email, "Email")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;

    let mut store = state.store.write().await;
    let item = store
        .residents
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condomino nao encontrado"))?;

    item.name = input.name.trim().to_string();
    item.email = input.email.trim().to_string();
    item.phone = input.phone.trim().to_string();
    item.condominium = input.condominium.trim().to_string();
    item.fraction = input.fraction.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "update",
        &response.id,
        format!("Condomino {} atualizado", response.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_resident(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Resident>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let original_len = store.residents.len();
    let deleted_name = store
        .residents
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.name.clone())
        .unwrap_or_else(|| "Condomino".to_string());
    store.residents.retain(|item| item.id != id);
    if store.residents.len() == original_len {
        return Err(ApiError::not_found("Condomino nao encontrado"));
    }
    store.add_audit(
        &user,
        "condominiums",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.residents.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn tickets(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Ticket>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.tickets, &params)))
}

pub async fn create_ticket(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<TicketInput>,
) -> Result<Json<Ticket>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.condominium, "Condominio")?;

    let item = Ticket {
        id: new_id(),
        title: input.title.trim().to_string(),
        condominium: input.condominium.trim().to_string(),
        priority: input.priority.unwrap_or_else(|| "Normal".to_string()),
        status: input.status.unwrap_or_else(|| "Aberto".to_string()),
        detail: input
            .detail
            .unwrap_or_else(|| "Ocorrencia registada".to_string()),
        updated_at: "Agora".to_string(),
    };

    let mut store = state.store.write().await;
    store.tickets.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Ticket {} criado", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_ticket(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<TicketInput>,
) -> Result<Json<Ticket>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let item = store
        .tickets
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Ticket nao encontrado"))?;

    item.title = input.title.trim().to_string();
    item.condominium = input.condominium.trim().to_string();
    item.priority = input.priority.unwrap_or_else(|| item.priority.clone());
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    item.detail = input.detail.unwrap_or_else(|| item.detail.clone());
    item.updated_at = "Agora".to_string();
    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Ticket {} atualizado", response.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_ticket(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Ticket>>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.tickets.len();
    let deleted_name = store
        .tickets
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.title.clone())
        .unwrap_or_else(|| "Ticket".to_string());
    store.tickets.retain(|item| item.id != id);
    if store.tickets.len() == original_len {
        return Err(ApiError::not_found("Ticket nao encontrado"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.tickets.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn suppliers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Supplier>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.suppliers, &params)))
}

pub async fn create_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<SupplierInput>,
) -> Result<Json<Supplier>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.name, "Nome")?;
    validate_required(&input.category, "Categoria")?;
    validate_required(&input.contact, "Contacto")?;

    let item = Supplier {
        id: new_id(),
        name: input.name.trim().to_string(),
        category: input.category.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Ativo".to_string()),
        contact: input.contact.trim().to_string(),
    };

    let mut store = state.store.write().await;
    store.suppliers.push(item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Fornecedor {} criado", item.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<SupplierInput>,
) -> Result<Json<Supplier>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.name, "Nome")?;
    validate_required(&input.category, "Categoria")?;
    validate_required(&input.contact, "Contacto")?;

    let mut store = state.store.write().await;
    let item = store
        .suppliers
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Fornecedor nao encontrado"))?;

    item.name = input.name.trim().to_string();
    item.category = input.category.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    item.contact = input.contact.trim().to_string();
    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Fornecedor {} atualizado", response.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Supplier>>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.suppliers.len();
    let deleted_name = store
        .suppliers
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.name.clone())
        .unwrap_or_else(|| "Fornecedor".to_string());
    store.suppliers.retain(|item| item.id != id);
    if store.suppliers.len() == original_len {
        return Err(ApiError::not_found("Fornecedor nao encontrado"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.suppliers.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Document>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.documents, &params)))
}

pub async fn document_templates(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<DocumentTemplate>>, ApiError> {
    require_user(&headers, &state).await?;
    Ok(Json(available_document_templates()))
}

pub async fn create_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<DocumentInput>,
) -> Result<Json<Document>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.kind, "Tipo")?;
    validate_required(&input.condominium, "Condominio")?;

    let item = Document {
        id: new_id(),
        title: input.title.trim().to_string(),
        kind: input.kind.trim().to_string(),
        condominium: input.condominium.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Arquivado".to_string()),
        file_name: String::new(),
        mime_type: String::new(),
        size_bytes: 0,
        storage_key: String::new(),
        uploaded_at: None,
    };

    let mut store = state.store.write().await;
    store.documents.push(item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Documento {} criado", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn generate_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<GenerateDocumentInput>,
) -> Result<Json<Document>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.template, "Tipo de documento")?;

    let requested_format = input.format.as_deref().unwrap_or("pdf");
    let output_format = normalize_document_format(requested_format)?;
    let store = state.store.read().await;
    let draft = build_generated_document(&store, &input, &output_format)?;
    drop(store);

    let document_id = new_id();
    let extension = if output_format == "pdf" { "pdf" } else { "txt" };
    let mime_type = if output_format == "pdf" {
        "application/pdf"
    } else {
        "text/plain; charset=utf-8"
    };
    let file_name = format!("gestisac-{}.{}", slugify(&draft.title), extension);
    let storage_key = format!("{document_id}-{file_name}");
    let bytes = if output_format == "pdf" {
        build_simple_pdf(&draft.title, &draft.lines)
    } else {
        draft.lines.join("\n").into_bytes()
    };

    write_document_bytes(&state, &storage_key, &bytes).await?;

    let item = Document {
        id: document_id,
        title: draft.title,
        kind: draft.kind,
        condominium: draft.condominium,
        status: "Gerado automaticamente".to_string(),
        file_name,
        mime_type: mime_type.to_string(),
        size_bytes: bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        uploaded_at: Some(Utc::now()),
    };

    let mut store = state.store.write().await;
    store.documents.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "generate",
        &item.id,
        format!("Documento {} gerado a partir de modelo", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn upload_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<Document>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    let mut title = String::new();
    let mut kind = String::new();
    let mut condominium = String::new();
    let mut status = "Arquivado".to_string();
    let mut uploaded_file: Option<UploadedDocumentFile> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ApiError::validation("Upload invalido"))?
    {
        let field_name = field.name().unwrap_or_default().to_string();

        if field_name == "file" {
            let original_name = field
                .file_name()
                .map(str::to_string)
                .unwrap_or_else(|| "documento.bin".to_string());
            let mime_type = field
                .content_type()
                .map(str::to_string)
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let bytes = field
                .bytes()
                .await
                .map_err(|_| ApiError::validation("Nao foi possivel ler o ficheiro"))?;

            if bytes.is_empty() {
                return Err(ApiError::validation("Seleciona um ficheiro"));
            }

            if bytes.len() > MAX_DOCUMENT_BYTES {
                return Err(ApiError::validation("O ficheiro excede 10 MB"));
            }

            uploaded_file = Some(UploadedDocumentFile {
                original_name,
                mime_type,
                bytes: bytes.to_vec(),
            });
        } else {
            let value = field
                .text()
                .await
                .map_err(|_| ApiError::validation("Campo de upload invalido"))?
                .trim()
                .to_string();

            match field_name.as_str() {
                "title" => title = value,
                "type" => kind = value,
                "condominium" => condominium = value,
                "status" if !value.is_empty() => status = value,
                _ => {}
            }
        }
    }

    validate_required(&title, "Titulo")?;
    validate_required(&kind, "Tipo")?;
    validate_required(&condominium, "Condominio")?;
    let uploaded_file =
        uploaded_file.ok_or_else(|| ApiError::validation("Seleciona um ficheiro"))?;
    let id = new_id();
    let safe_name = safe_file_name(&uploaded_file.original_name);
    let storage_key = format!("{id}-{safe_name}");
    write_document_bytes(&state, &storage_key, &uploaded_file.bytes).await?;

    let item = Document {
        id,
        title,
        kind,
        condominium,
        status,
        file_name: uploaded_file.original_name,
        mime_type: uploaded_file.mime_type,
        size_bytes: uploaded_file.bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        uploaded_at: Some(Utc::now()),
    };

    let mut store = state.store.write().await;
    store.documents.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "upload",
        &item.id,
        format!("Documento {} carregado", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<DocumentInput>,
) -> Result<Json<Document>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.kind, "Tipo")?;
    validate_required(&input.condominium, "Condominio")?;

    let mut store = state.store.write().await;
    let item = store
        .documents
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Documento nao encontrado"))?;

    item.title = input.title.trim().to_string();
    item.kind = input.kind.trim().to_string();
    item.condominium = input.condominium.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Documento {} atualizado", response.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn document_preview(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<DocumentPreview>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    let document = store
        .documents
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Documento nao encontrado"))?;
    drop(store);

    let content = if can_preview_text(&document) {
        read_document_bytes(&state, &document)
            .await
            .ok()
            .and_then(|bytes| String::from_utf8(bytes).ok())
            .map(|value| value.chars().take(16_000).collect())
    } else if document.storage_key.is_empty() {
        Some(format!(
            "Documento sem ficheiro associado ainda.\nTitulo: {}\nTipo: {}\nCondominio: {}\nEstado: {}",
            document.title, document.kind, document.condominium, document.status
        ))
    } else {
        None
    };
    let preview_type = if content.is_some() {
        "text"
    } else if document.storage_key.is_empty() {
        "metadata"
    } else {
        "binary"
    }
    .to_string();

    Ok(Json(DocumentPreview {
        download_url: format!("/api/documents/{}/download", document.id),
        document,
        preview_type,
        content,
    }))
}

pub async fn download_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Response, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    let document = store
        .documents
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Documento nao encontrado"))?;
    drop(store);

    let (bytes, file_name, mime_type) = if document.storage_key.is_empty() {
        (
            format!(
                "GESTISAC Documento\nTitulo: {}\nTipo: {}\nCondominio: {}\nEstado: {}\n",
                document.title, document.kind, document.condominium, document.status
            )
            .into_bytes(),
            format!("gestisac-{}.txt", slugify(&document.title)),
            "text/plain; charset=utf-8".to_string(),
        )
    } else {
        (
            read_document_bytes(&state, &document).await?,
            if document.file_name.is_empty() {
                format!("gestisac-{}", document.storage_key)
            } else {
                document.file_name.clone()
            },
            if document.mime_type.is_empty() {
                "application/octet-stream".to_string()
            } else {
                document.mime_type.clone()
            },
        )
    };

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, mime_type),
            (
                header::CONTENT_DISPOSITION,
                format!(
                    "attachment; filename=\"{}\"",
                    safe_download_name(&file_name)
                ),
            ),
        ],
        bytes,
    )
        .into_response())
}

pub async fn delete_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Document>>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.documents.len();
    let deleted_document = store.documents.iter().find(|item| item.id == id).cloned();
    let deleted_name = deleted_document
        .as_ref()
        .map(|item| item.title.clone())
        .unwrap_or_else(|| "Documento".to_string());
    let deleted_storage_key = deleted_document
        .as_ref()
        .map(|item| item.storage_key.clone())
        .unwrap_or_default();
    store.documents.retain(|item| item.id != id);
    if store.documents.len() == original_len {
        return Err(ApiError::not_found("Documento nao encontrado"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.documents.clone();
    drop(store);
    persist(&state).await?;
    remove_document_file(&state, &deleted_storage_key).await;

    Ok(Json(response))
}

pub async fn reports(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Report>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.reports, &params)))
}

pub async fn create_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ReportInput>,
) -> Result<Json<Report>, ApiError> {
    let user = require_write(&headers, &state, "reports").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.period, "Periodo")?;

    let item = Report {
        id: new_id(),
        title: input.title.trim().to_string(),
        period: input.period.trim().to_string(),
        status: input
            .status
            .unwrap_or_else(|| "Gerado pela API local".to_string()),
    };

    let mut store = state.store.write().await;
    store.reports.insert(0, item.clone());
    store.add_audit(
        &user,
        "reports",
        "create",
        &item.id,
        format!("Relatorio {} criado", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<ReportInput>,
) -> Result<Json<Report>, ApiError> {
    let user = require_write(&headers, &state, "reports").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.period, "Periodo")?;

    let mut store = state.store.write().await;
    let item = store
        .reports
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Relatorio nao encontrado"))?;

    item.title = input.title.trim().to_string();
    item.period = input.period.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "reports",
        "update",
        &response.id,
        format!("Relatorio {} atualizado", response.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn report_preview(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<ReportPreview>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    let report = store
        .reports
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Relatorio nao encontrado"))?;

    Ok(Json(build_report_preview(&store, report)))
}

pub async fn export_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Response, ApiError> {
    let user = require_write(&headers, &state, "reports").await?;
    let store = state.store.read().await;
    let report = store
        .reports
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Relatorio nao encontrado"))?;
    let body = build_report_export(&store, &report);
    let active_condominium = store.active_condominium.clone();
    drop(store);

    let filename = format!("gestisac-{}.csv", slugify(&report.title));
    let document_id = new_id();
    let storage_key = format!("{document_id}-{filename}");
    write_document_bytes(&state, &storage_key, body.as_bytes()).await?;

    let mut store = state.store.write().await;
    if let Some(item) = store.reports.iter_mut().find(|item| item.id == id) {
        item.status = "Exportado".to_string();
    }

    let document = Document {
        id: document_id,
        title: format!("Exportacao - {}", report.title),
        kind: "Relatorio".to_string(),
        condominium: active_condominium,
        status: "Gerado automaticamente".to_string(),
        file_name: filename.clone(),
        mime_type: "text/csv; charset=utf-8".to_string(),
        size_bytes: body.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        uploaded_at: Some(Utc::now()),
    };
    store.documents.insert(0, document.clone());
    store.add_audit(
        &user,
        "reports",
        "export",
        &report.id,
        format!("Relatorio {} exportado", report.title),
    );
    store.add_audit(
        &user,
        "operations",
        "create",
        &document.id,
        format!("Documento {} criado por exportacao", document.title),
    );
    drop(store);
    persist(&state).await?;

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/csv; charset=utf-8".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        body,
    )
        .into_response())
}

pub async fn delete_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Report>>, ApiError> {
    let user = require_delete(&headers, &state, "reports").await?;
    let mut store = state.store.write().await;
    let original_len = store.reports.len();
    let deleted_name = store
        .reports
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.title.clone())
        .unwrap_or_else(|| "Relatorio".to_string());
    store.reports.retain(|item| item.id != id);
    if store.reports.len() == original_len {
        return Err(ApiError::not_found("Relatorio nao encontrado"));
    }
    store.add_audit(
        &user,
        "reports",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.reports.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn assemblies(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Assembly>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.assemblies, &params)))
}

pub async fn create_assembly(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<AssemblyInput>,
) -> Result<Json<Assembly>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.date, "Data")?;

    let item = Assembly {
        id: new_id(),
        title: input.title.trim().to_string(),
        condominium: input.condominium.trim().to_string(),
        date: input.date.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Em preparacao".to_string()),
    };

    let mut store = state.store.write().await;
    store.assemblies.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Assembleia {} criada", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_assembly(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<AssemblyInput>,
) -> Result<Json<Assembly>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.date, "Data")?;

    let mut store = state.store.write().await;
    let item = store
        .assemblies
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Assembleia nao encontrada"))?;

    item.title = input.title.trim().to_string();
    item.condominium = input.condominium.trim().to_string();
    item.date = input.date.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Assembleia {} atualizada", response.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_assembly(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Assembly>>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.assemblies.len();
    let deleted_name = store
        .assemblies
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.title.clone())
        .unwrap_or_else(|| "Assembleia".to_string());
    store.assemblies.retain(|item| item.id != id);
    if store.assemblies.len() == original_len {
        return Err(ApiError::not_found("Assembleia nao encontrada"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagada"),
    );
    let response = store.assemblies.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn maintenance(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<MaintenanceItem>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.maintenance, &params)))
}

pub async fn create_maintenance(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<MaintenanceInput>,
) -> Result<Json<MaintenanceItem>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.supplier, "Fornecedor")?;
    validate_required(&input.date, "Data")?;

    let item = MaintenanceItem {
        id: new_id(),
        title: input.title.trim().to_string(),
        supplier: input.supplier.trim().to_string(),
        status: input.status.unwrap_or_else(|| "Agendado".to_string()),
        date: input.date.trim().to_string(),
    };

    let mut store = state.store.write().await;
    store.maintenance.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Manutencao {} criada", item.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn update_maintenance(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<MaintenanceInput>,
) -> Result<Json<MaintenanceItem>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.title, "Titulo")?;
    validate_required(&input.supplier, "Fornecedor")?;
    validate_required(&input.date, "Data")?;

    let mut store = state.store.write().await;
    let item = store
        .maintenance
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Manutencao nao encontrada"))?;

    item.title = input.title.trim().to_string();
    item.supplier = input.supplier.trim().to_string();
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    item.date = input.date.trim().to_string();
    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Manutencao {} atualizada", response.title),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn delete_maintenance(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<MaintenanceItem>>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.maintenance.len();
    let deleted_name = store
        .maintenance
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.title.clone())
        .unwrap_or_else(|| "Manutencao".to_string());
    store.maintenance.retain(|item| item.id != id);
    if store.maintenance.len() == original_len {
        return Err(ApiError::not_found("Manutencao nao encontrada"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagada"),
    );
    let response = store.maintenance.clone();
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn audit_log(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<AuditLogEntry>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.audit_log, &params)))
}

async fn require_user(headers: &HeaderMap, state: &AppState) -> Result<(), ApiError> {
    current_user(headers, state).await.map(|_| ())
}

fn validate_required(value: &str, label: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::validation(format!("{label} e obrigatorio")));
    }

    Ok(())
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

struct GeneratedDocumentDraft {
    title: String,
    kind: String,
    condominium: String,
    lines: Vec<String>,
}

fn available_document_templates() -> Vec<DocumentTemplate> {
    vec![
        document_template(
            "assembly-notice",
            "Convocatoria de assembleia",
            "Assembleias",
            "Gera a convocatoria com condominio, local, data e ordem de trabalhos.",
            vec!["Condominio", "Assembleias", "Documentos anexos"],
        ),
        document_template(
            "assembly-minutes",
            "Ata de assembleia",
            "Assembleias",
            "Prepara uma minuta de ata com presencas, deliberacoes e resultado das votacoes.",
            vec!["Condominio", "Fracoes", "Assembleias"],
        ),
        document_template(
            "accounts-statement",
            "Prestacao de contas",
            "Contabilidade",
            "Resumo financeiro com saldo, despesas, quotas pagas e fundo de reserva.",
            vec!["Quotas", "Pagamentos", "Despesas", "Fundo de reserva"],
        ),
        document_template(
            "budget-and-quotas",
            "Orcamento e mapa de quotas",
            "Contabilidade",
            "Documento para aprovar orcamento, quotas ordinarias e quotas extraordinarias.",
            vec!["Condominio", "Fracoes", "Despesas", "Quotas"],
        ),
        document_template(
            "debt-notice",
            "Aviso de quota em atraso",
            "Cobranca",
            "Carta de cobranca amigavel com valores em divida por fracao ou condomino.",
            vec!["Dividas", "Quotas", "Condominos"],
        ),
        document_template(
            "receipt",
            "Recibo de pagamento",
            "Cobranca",
            "Recibo simples baseado no ultimo pagamento registado ou nos dados indicados.",
            vec!["Pagamentos", "Condominos", "Fracoes"],
        ),
        document_template(
            "no-debt-declaration",
            "Declaracao de nao divida",
            "Legal",
            "Declaracao para proprietario/fracao quando nao existem dividas ativas registadas.",
            vec!["Dividas", "Fracoes", "Condominos"],
        ),
        document_template(
            "maintenance-notice",
            "Aviso de manutencao ou avaria",
            "Operacao",
            "Comunicacao aos moradores sobre intervencoes, avarias e constrangimentos.",
            vec!["Tickets", "Manutencao", "Fornecedores"],
        ),
        document_template(
            "supplier-work-order",
            "Ordem de servico a fornecedor",
            "Operacao",
            "Pedido formal para fornecedor com descricao, prioridade e condominio.",
            vec!["Fornecedores", "Tickets", "Manutencao"],
        ),
        document_template(
            "insurance-expiry",
            "Aviso de seguro/documento a expirar",
            "Arquivo",
            "Lista documentos ou seguros com estado de expiracao para acompanhamento.",
            vec!["Documentos", "Condominio"],
        ),
        document_template(
            "resident-map",
            "Mapa de fracoes e contactos",
            "Administracao",
            "Mapa interno com fracoes, proprietarios/moradores e contactos registados.",
            vec!["Fracoes", "Condominos"],
        ),
        document_template(
            "condominium-regulation",
            "Minuta de regulamento do condominio",
            "Legal",
            "Base de regulamento para uso, fruicao e conservacao das partes comuns.",
            vec!["Condominio", "Fracoes"],
        ),
    ]
}

fn document_template(
    id: &str,
    label: &str,
    category: &str,
    description: &str,
    data_sources: Vec<&str>,
) -> DocumentTemplate {
    DocumentTemplate {
        id: id.to_string(),
        label: label.to_string(),
        category: category.to_string(),
        description: description.to_string(),
        output: "PDF ou texto".to_string(),
        data_sources: data_sources.into_iter().map(str::to_string).collect(),
    }
}

fn normalize_document_format(value: &str) -> Result<String, ApiError> {
    match value.trim().to_lowercase().as_str() {
        "" | "pdf" => Ok("pdf".to_string()),
        "txt" | "text" | "texto" => Ok("txt".to_string()),
        _ => Err(ApiError::validation("Formato de documento invalido")),
    }
}

fn build_generated_document(
    store: &AppStore,
    input: &GenerateDocumentInput,
    output_format: &str,
) -> Result<GeneratedDocumentDraft, ApiError> {
    let template = input.template.trim();
    let template_info = available_document_templates()
        .into_iter()
        .find(|item| item.id == template)
        .ok_or_else(|| ApiError::validation("Modelo de documento desconhecido"))?;
    let condominium = input
        .condominium
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&store.active_condominium)
        .to_string();
    let notes = input
        .notes
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let resident = input
        .resident
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let fraction = input
        .fraction
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let condominium_record = store
        .condominiums
        .iter()
        .find(|item| item.name.eq_ignore_ascii_case(&condominium));
    let accounting = store.accounting_summary();

    let mut lines = vec![
        "GESTISAC - Gestao de Condominios".to_string(),
        format!("Documento: {}", template_info.label),
        format!("Condominio: {condominium}"),
        format!("Data de emissao: {}", Utc::now().format("%Y-%m-%d %H:%M")),
        format!("Formato solicitado: {}", output_format.to_uppercase()),
        String::new(),
    ];

    if let Some(item) = condominium_record {
        lines.extend([
            "Dados do condominio".to_string(),
            format!("Localizacao: {}", item.location),
            format!("Edificios: {}", item.buildings),
            format!("Fracoes: {}", item.fractions),
            format!("Moradores registados: {}", item.residents),
            format!("Estado: {}", item.status),
            String::new(),
        ]);
    }

    match template {
        "assembly-notice" => {
            let assembly = store.assemblies.iter().find(|item| {
                item.condominium.eq_ignore_ascii_case(&condominium)
                    && !is_closed_status(&item.status)
            });
            lines.extend([
                "Convocatoria".to_string(),
                format!("Convoca-se a assembleia de condominos do {}.", condominium),
                format!(
                    "Data/hora: {}",
                    assembly
                        .map(|item| item.date.as_str())
                        .unwrap_or("a definir pela administracao")
                ),
                "Ordem de trabalhos proposta:".to_string(),
                "1. Apreciacao e aprovacao das contas.".to_string(),
                "2. Aprovacao do orcamento e quotas.".to_string(),
                "3. Analise de manutencoes, seguros e fornecedores.".to_string(),
                "4. Outros assuntos de interesse do condominio.".to_string(),
            ]);
        }
        "assembly-minutes" => {
            lines.extend([
                "Minuta de ata".to_string(),
                "A assembleia reuniu na data indicada em convocatoria.".to_string(),
                format!("Total de fracoes registadas: {}", store.fractions.len()),
                "Deliberacoes:".to_string(),
                "- Aprovacao das contas e orcamento, se aplicavel.".to_string(),
                "- Registo de votacoes e intervencoes dos condominos.".to_string(),
                "- Assinaturas dos presentes ou assinatura eletronica quando aplicavel."
                    .to_string(),
            ]);
        }
        "accounts-statement" => {
            lines.extend([
                "Prestacao de contas".to_string(),
                format!(
                    "Saldo atual: {}",
                    format_currency(accounting.current_balance)
                ),
                format!(
                    "Quotas regularizadas: {}%",
                    accounting.paid_quota_percentage
                ),
                format!("Dividas ativas: {}", accounting.overdue_count),
                format!(
                    "Valor em atraso: {}",
                    format_currency(accounting.overdue_amount)
                ),
                format!(
                    "Despesas registadas: {}",
                    format_currency(accounting.monthly_expenses)
                ),
                format!(
                    "Fundo de reserva: {}",
                    format_currency(accounting.reserve_fund)
                ),
            ]);
        }
        "budget-and-quotas" => {
            lines.extend([
                "Orcamento e mapa de quotas".to_string(),
                format!(
                    "Despesas previstas/base atual: {}",
                    format_currency(accounting.monthly_expenses)
                ),
                format!(
                    "Fundo de reserva registado: {}",
                    format_currency(accounting.reserve_fund)
                ),
                "Quotas recentes:".to_string(),
            ]);
            lines.extend(store.quotas.iter().take(8).map(|quota| {
                format!(
                    "- {} | {} | {} | {} | {}",
                    quota.period,
                    quota.fraction,
                    quota.resident,
                    format_currency(quota.amount),
                    quota.status
                )
            }));
        }
        "debt-notice" => {
            lines.extend([
                "Aviso de quota em atraso".to_string(),
                target_line(resident, fraction),
                "Solicita-se a regularizacao dos valores vencidos abaixo identificados."
                    .to_string(),
            ]);
            let debts = store.debts.iter().filter(|debt| {
                matches_optional(&debt.condominium, Some(condominium.as_str()))
                    && matches_optional(&debt.resident, resident)
                    && matches_optional(&debt.fraction, fraction)
                    && !is_closed_status(&debt.status)
            });
            lines.extend(debts.take(10).map(|debt| {
                format!(
                    "- {} | Fracao {} | {} | {} dias | {}",
                    debt.resident,
                    debt.fraction,
                    format_currency(debt.amount),
                    debt.days_overdue,
                    debt.status
                )
            }));
        }
        "receipt" => {
            let payment = store.accounting_payments.iter().find(|payment| {
                matches_optional(&payment.condominium, Some(condominium.as_str()))
                    && matches_optional(&payment.resident, resident)
                    && matches_optional(&payment.fraction, fraction)
            });
            lines.extend([
                "Recibo de pagamento".to_string(),
                target_line(resident, fraction),
                format!(
                    "Valor: {}",
                    payment
                        .map(|item| format_currency(item.amount))
                        .unwrap_or_else(|| "a preencher".to_string())
                ),
                format!(
                    "Data de pagamento: {}",
                    payment
                        .map(|item| item.paid_at.as_str())
                        .unwrap_or("a preencher")
                ),
                format!(
                    "Metodo: {}",
                    payment
                        .map(|item| item.method.as_str())
                        .unwrap_or("a preencher")
                ),
            ]);
        }
        "no-debt-declaration" => {
            let debt_count = store
                .debts
                .iter()
                .filter(|debt| {
                    matches_optional(&debt.condominium, Some(condominium.as_str()))
                        && matches_optional(&debt.resident, resident)
                        && matches_optional(&debt.fraction, fraction)
                        && !is_closed_status(&debt.status)
                })
                .count();
            lines.extend([
                "Declaracao de nao divida".to_string(),
                target_line(resident, fraction),
                format!("Dividas ativas encontradas no sistema: {debt_count}"),
                "A presente declaracao e emitida com base nos registos existentes na plataforma."
                    .to_string(),
            ]);
        }
        "maintenance-notice" => {
            lines.extend([
                "Aviso de manutencao ou avaria".to_string(),
                "Ocorrencias e intervencoes ativas:".to_string(),
            ]);
            lines.extend(store.tickets.iter().take(6).map(|ticket| {
                format!(
                    "- {} | {} | {} | {}",
                    ticket.title, ticket.condominium, ticket.priority, ticket.status
                )
            }));
            lines.extend(store.maintenance.iter().take(6).map(|item| {
                format!(
                    "- {} | {} | {} | {}",
                    item.title, item.supplier, item.date, item.status
                )
            }));
        }
        "supplier-work-order" => {
            let supplier = store.suppliers.first();
            lines.extend([
                "Ordem de servico a fornecedor".to_string(),
                format!(
                    "Fornecedor: {}",
                    supplier
                        .map(|item| item.name.as_str())
                        .unwrap_or("a selecionar")
                ),
                format!(
                    "Contacto: {}",
                    supplier
                        .map(|item| item.contact.as_str())
                        .unwrap_or("a preencher")
                ),
                "Descricao do servico:".to_string(),
                notes
                    .unwrap_or("Intervencao solicitada pela administracao do condominio.")
                    .to_string(),
            ]);
        }
        "insurance-expiry" => {
            lines.extend([
                "Aviso de seguro/documento a expirar".to_string(),
                "Documentos que exigem revisao:".to_string(),
            ]);
            lines.extend(
                store
                    .documents
                    .iter()
                    .filter(|document| {
                        document.status.to_lowercase().contains("expirar")
                            || document.kind.to_lowercase().contains("seguro")
                    })
                    .take(10)
                    .map(|document| {
                        format!(
                            "- {} | {} | {}",
                            document.title, document.kind, document.status
                        )
                    }),
            );
        }
        "resident-map" => {
            lines.extend(["Mapa de fracoes e contactos".to_string()]);
            lines.extend(store.residents.iter().take(18).map(|resident| {
                format!(
                    "- {} | {} | Fracao {} | {} | {}",
                    resident.name,
                    resident.condominium,
                    resident.fraction,
                    resident.email,
                    resident.phone
                )
            }));
        }
        "condominium-regulation" => {
            lines.extend([
                "Minuta de regulamento do condominio".to_string(),
                "1. Uso, fruicao e conservacao das partes comuns.".to_string(),
                "2. Regras de ruido, limpeza, seguranca e acesso.".to_string(),
                "3. Comunicacoes entre administracao e condominos.".to_string(),
                "4. Pagamento de quotas, fundo de reserva e despesas comuns.".to_string(),
                "5. Obras, manutencoes e intervencoes urgentes.".to_string(),
            ]);
        }
        _ => unreachable!("template was validated above"),
    }

    if let Some(notes) = notes {
        lines.extend([
            String::new(),
            "Notas adicionais".to_string(),
            notes.to_string(),
        ]);
    }

    Ok(GeneratedDocumentDraft {
        title: format!("{} - {}", template_info.label, condominium),
        kind: template_info.category,
        condominium,
        lines,
    })
}

fn target_line(resident: Option<&str>, fraction: Option<&str>) -> String {
    match (resident, fraction) {
        (Some(resident), Some(fraction)) => format!("Destinatario: {resident} | Fracao {fraction}"),
        (Some(resident), None) => format!("Destinatario: {resident}"),
        (None, Some(fraction)) => format!("Fracao: {fraction}"),
        (None, None) => "Destinatario/fracao: a selecionar ou confirmar".to_string(),
    }
}

fn matches_optional(value: &str, expected: Option<&str>) -> bool {
    expected
        .map(|expected| value.eq_ignore_ascii_case(expected))
        .unwrap_or(true)
}

fn build_simple_pdf(title: &str, lines: &[String]) -> Vec<u8> {
    let mut commands = vec![
        "BT".to_string(),
        "/F2 17 Tf".to_string(),
        "50 800 Td".to_string(),
        format!("({}) Tj", pdf_escape(title)),
        "/F1 10 Tf".to_string(),
    ];
    for (line_count, line) in lines
        .iter()
        .flat_map(|line| wrap_pdf_line(line, 92))
        .enumerate()
    {
        if line_count >= 48 {
            commands.push("0 -14 Td".to_string());
            commands.push(format!(
                "({}) Tj",
                pdf_escape("Documento truncado para preview PDF.")
            ));
            break;
        }
        commands.push("0 -14 Td".to_string());
        commands.push(format!("({}) Tj", pdf_escape(&line)));
    }

    commands.push("ET".to_string());
    let stream = commands.join("\n");
    let objects = [
        "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(),
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>".to_string(),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string(),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>".to_string(),
        format!("<< /Length {} >>\nstream\n{}\nendstream", stream.len(), stream),
    ];

    let mut pdf = b"%PDF-1.4\n".to_vec();
    let mut offsets = vec![0usize];
    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.extend_from_slice(format!("{} 0 obj\n{}\nendobj\n", index + 1, object).as_bytes());
    }
    let xref_start = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n", objects.len() + 1).as_bytes());
    pdf.extend_from_slice(b"0000000000 65535 f \n");
    for offset in offsets.iter().skip(1) {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer << /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            objects.len() + 1,
            xref_start
        )
        .as_bytes(),
    );

    pdf
}

fn wrap_pdf_line(value: &str, max_chars: usize) -> Vec<String> {
    if value.is_empty() {
        return vec![String::new()];
    }

    let mut lines = Vec::new();
    let mut current = String::new();
    for word in value.split_whitespace() {
        if !current.is_empty() && current.len() + word.len() + 1 > max_chars {
            lines.push(current);
            current = String::new();
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }
    if !current.is_empty() {
        lines.push(current);
    }

    lines
}

fn pdf_escape(value: &str) -> String {
    value
        .chars()
        .map(pdf_safe_char)
        .flat_map(|character| match character {
            '\\' => "\\\\".chars().collect::<Vec<_>>(),
            '(' => "\\(".chars().collect::<Vec<_>>(),
            ')' => "\\)".chars().collect::<Vec<_>>(),
            other => vec![other],
        })
        .collect()
}

fn pdf_safe_char(character: char) -> char {
    match character {
        'á' | 'à' | 'ã' | 'â' | 'Á' | 'À' | 'Ã' | 'Â' => 'a',
        'é' | 'ê' | 'É' | 'Ê' => 'e',
        'í' | 'Í' => 'i',
        'ó' | 'õ' | 'ô' | 'Ó' | 'Õ' | 'Ô' => 'o',
        'ú' | 'Ú' => 'u',
        'ç' | 'Ç' => 'c',
        'º' => 'o',
        'ª' => 'a',
        other if other.is_ascii() => other,
        _ => '-',
    }
}

struct UploadedDocumentFile {
    original_name: String,
    mime_type: String,
    bytes: Vec<u8>,
}

async fn write_document_bytes(
    state: &AppState,
    storage_key: &str,
    bytes: &[u8],
) -> Result<(), ApiError> {
    tokio::fs::create_dir_all(&state.config.document_storage_path)
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel preparar o arquivo documental"))?;
    tokio::fs::write(document_path(state, storage_key), bytes)
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel guardar o ficheiro"))
}

async fn read_document_bytes(state: &AppState, document: &Document) -> Result<Vec<u8>, ApiError> {
    if document.storage_key.is_empty() {
        return Err(ApiError::not_found("Documento sem ficheiro associado"));
    }

    tokio::fs::read(document_path(state, &document.storage_key))
        .await
        .map_err(|_| ApiError::not_found("Ficheiro do documento nao encontrado"))
}

async fn remove_document_file(state: &AppState, storage_key: &str) {
    if storage_key.is_empty() {
        return;
    }

    let _ = tokio::fs::remove_file(document_path(state, storage_key)).await;
}

fn document_path(state: &AppState, storage_key: &str) -> PathBuf {
    state
        .config
        .document_storage_path
        .join(safe_file_name(storage_key))
}

fn can_preview_text(document: &Document) -> bool {
    if document.storage_key.is_empty() || document.size_bytes > 128 * 1024 {
        return false;
    }

    let mime_type = document.mime_type.to_lowercase();
    mime_type.starts_with("text/")
        || mime_type.contains("json")
        || mime_type.contains("csv")
        || document.file_name.ends_with(".txt")
        || document.file_name.ends_with(".csv")
}

fn safe_file_name(value: &str) -> String {
    let safe = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_' | '(' | ')')
            {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    if safe.is_empty() {
        "documento.bin".to_string()
    } else {
        safe
    }
}

fn safe_download_name(value: &str) -> String {
    safe_file_name(value)
}

fn build_report_preview(store: &crate::models::store::AppStore, report: Report) -> ReportPreview {
    let accounting = store.accounting_summary();
    let urgent_tickets = store
        .tickets
        .iter()
        .filter(|ticket| is_critical_priority(&ticket.priority))
        .count();
    let open_maintenance = store
        .maintenance
        .iter()
        .filter(|item| !is_closed_status(&item.status))
        .count();
    let overdue_debts = store
        .debts
        .iter()
        .filter(|item| !item.status.eq_ignore_ascii_case("paga"))
        .count();

    ReportPreview {
        report,
        generated_at: Utc::now().to_rfc3339(),
        active_condominium: store.active_condominium.clone(),
        kpis: vec![
            ReportKpi {
                label: "Saldo atual".to_string(),
                value: format_currency(accounting.current_balance),
                detail: "Calculado a partir de pagamentos, despesas e fundo de reserva".to_string(),
                tone: "green".to_string(),
            },
            ReportKpi {
                label: "Dividas ativas".to_string(),
                value: overdue_debts.to_string(),
                detail: format_currency(accounting.overdue_amount),
                tone: if overdue_debts > 0 { "danger" } else { "green" }.to_string(),
            },
            ReportKpi {
                label: "Tickets criticos".to_string(),
                value: urgent_tickets.to_string(),
                detail: "Ocorrencias com prioridade critica".to_string(),
                tone: if urgent_tickets > 0 {
                    "danger"
                } else {
                    "green"
                }
                .to_string(),
            },
            ReportKpi {
                label: "Manutencoes abertas".to_string(),
                value: open_maintenance.to_string(),
                detail: "Intervencoes ainda nao concluidas".to_string(),
                tone: if open_maintenance > 0 {
                    "gold"
                } else {
                    "green"
                }
                .to_string(),
            },
        ],
        sections: vec![
            ReportSection {
                title: "Resumo financeiro".to_string(),
                rows: vec![
                    ReportRow {
                        label: "Quotas regularizadas".to_string(),
                        value: format!("{}%", accounting.paid_quota_percentage),
                        detail: "Percentagem calculada sobre quotas registadas".to_string(),
                    },
                    ReportRow {
                        label: "Despesas do mes".to_string(),
                        value: format_currency(accounting.monthly_expenses),
                        detail: "Soma das despesas registadas".to_string(),
                    },
                    ReportRow {
                        label: "Fundo de reserva".to_string(),
                        value: format_currency(accounting.reserve_fund),
                        detail: "Saldo consolidado dos fundos registados".to_string(),
                    },
                ],
            },
            ReportSection {
                title: "Dividas e cobrancas".to_string(),
                rows: store
                    .debts
                    .iter()
                    .take(8)
                    .map(|item| ReportRow {
                        label: format!("{} - {}", item.resident, item.fraction),
                        value: format_currency(item.amount),
                        detail: format!(
                            "{} - {} dias - {}",
                            item.condominium, item.days_overdue, item.status
                        ),
                    })
                    .collect(),
            },
            ReportSection {
                title: "Operacao e manutencao".to_string(),
                rows: store
                    .tickets
                    .iter()
                    .take(5)
                    .map(|item| ReportRow {
                        label: item.title.clone(),
                        value: item.priority.clone(),
                        detail: format!("{} - {}", item.condominium, item.status),
                    })
                    .chain(store.maintenance.iter().take(5).map(|item| ReportRow {
                        label: item.title.clone(),
                        value: item.status.clone(),
                        detail: format!("{} - {}", item.supplier, item.date),
                    }))
                    .collect(),
            },
            ReportSection {
                title: "Documentos recentes".to_string(),
                rows: store
                    .documents
                    .iter()
                    .take(6)
                    .map(|item| ReportRow {
                        label: item.title.clone(),
                        value: item.kind.clone(),
                        detail: format!("{} - {}", item.condominium, item.status),
                    })
                    .collect(),
            },
        ],
        recommended_actions: recommended_report_actions(store),
    }
}

fn build_report_export(store: &crate::models::store::AppStore, report: &Report) -> String {
    let preview = build_report_preview(store, report.clone());
    let mut rows = vec![
        "GESTISAC;Relatorio;Campo;Valor;Detalhe".to_string(),
        format!(
            "GESTISAC;{};Periodo;{};{}",
            csv_cell(&preview.report.title),
            csv_cell(&preview.report.period),
            csv_cell(&preview.active_condominium)
        ),
        format!(
            "GESTISAC;{};Gerado em;{};API local Rust",
            csv_cell(&preview.report.title),
            csv_cell(&preview.generated_at)
        ),
    ];

    rows.extend(preview.kpis.iter().map(|kpi| {
        format!(
            "KPI;{};{};{};{}",
            csv_cell(&preview.report.title),
            csv_cell(&kpi.label),
            csv_cell(&kpi.value),
            csv_cell(&kpi.detail)
        )
    }));

    for section in &preview.sections {
        rows.extend(section.rows.iter().map(|row| {
            format!(
                "{};{};{};{};{}",
                csv_cell(&section.title),
                csv_cell(&preview.report.title),
                csv_cell(&row.label),
                csv_cell(&row.value),
                csv_cell(&row.detail)
            )
        }));
    }

    rows.extend(preview.recommended_actions.iter().map(|action| {
        format!(
            "Acoes recomendadas;{};Prioridade;{};",
            csv_cell(&preview.report.title),
            csv_cell(action)
        )
    }));

    rows.join("\n")
}

fn recommended_report_actions(store: &crate::models::store::AppStore) -> Vec<String> {
    let mut actions = Vec::new();
    let accounting = store.accounting_summary();

    if accounting.overdue_count > 0 {
        actions.push(format!(
            "Regularizar {} dividas no valor de {}",
            accounting.overdue_count,
            format_currency(accounting.overdue_amount)
        ));
    }

    if store
        .tickets
        .iter()
        .any(|ticket| is_critical_priority(&ticket.priority))
    {
        actions.push("Dar seguimento aos tickets criticos antes do fecho semanal".to_string());
    }

    if store
        .documents
        .iter()
        .any(|document| document.status.to_lowercase().contains("expirar"))
    {
        actions.push("Rever documentos e seguros com prazo a expirar".to_string());
    }

    if actions.is_empty() {
        actions.push("Sem bloqueios criticos. Manter acompanhamento operacional.".to_string());
    }

    actions
}

fn is_critical_priority(priority: &str) -> bool {
    let normalized = priority.to_lowercase();
    normalized.contains("crit") || normalized.contains("tic")
}

fn is_closed_status(status: &str) -> bool {
    let normalized = status.to_lowercase();
    normalized.contains("conclu")
        || normalized.contains("resolvido")
        || normalized.contains("fechado")
}

fn format_currency(value: Decimal) -> String {
    format!("{value:.2} EUR")
}

fn slugify(value: &str) -> String {
    let slug = value
        .chars()
        .map(|character| {
            let folded = fold_slug_char(character);
            if folded.is_ascii_alphanumeric() {
                folded.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    if slug.is_empty() {
        "relatorio".to_string()
    } else {
        slug
    }
}

fn fold_slug_char(character: char) -> char {
    match character {
        'á' | 'à' | 'ã' | 'â' | 'ä' | 'Á' | 'À' | 'Ã' | 'Â' | 'Ä' => 'a',
        'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => 'e',
        'í' | 'ì' | 'î' | 'ï' | 'Í' | 'Ì' | 'Î' | 'Ï' => 'i',
        'ó' | 'ò' | 'õ' | 'ô' | 'ö' | 'Ó' | 'Ò' | 'Õ' | 'Ô' | 'Ö' => 'o',
        'ú' | 'ù' | 'û' | 'ü' | 'Ú' | 'Ù' | 'Û' | 'Ü' => 'u',
        'ç' | 'Ç' => 'c',
        _ => character,
    }
}

fn csv_cell(value: &str) -> String {
    let escaped = value.replace('"', "\"\"");
    format!("\"{escaped}\"")
}
