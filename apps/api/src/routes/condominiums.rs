use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{
            AppStore, Condominium, CondominiumAddress, CondominiumBlock, CondominiumContact,
            CondominiumEquipment, CondominiumFloor, CondominiumHistoryEvent,
            CondominiumInternalNote, CondominiumManagedDocument, CondominiumMedia,
            CondominiumOnboardingDraft, CondominiumOperationalStatus, CondominiumPlanMarker,
            CondominiumStructure, CondominiumZone, PublicUser,
        },
    },
    repositories::postgres::RelationalCondominiumFilter,
    routes::auth::{current_context, current_user, require_delete, require_write},
    state::AppState,
    storage::{read_file_object, write_file_object},
};
use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
    Json,
};
use calamine::{Reader, Xlsx};
use chrono::{Duration, NaiveDate, Utc};
use qrcode::render::svg;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, io::Cursor};
use uuid::Uuid;

const MAX_CONDOMINIUM_UPLOAD_BYTES: usize = 10 * 1024 * 1024;

pub use super::resources::{
    active_condominium, buildings, create_building, create_fraction, create_resident,
    delete_building, delete_fraction, delete_resident, fractions, residents,
    update_active_condominium, update_building, update_fraction, update_resident,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumListParams {
    #[serde(default = "default_page")]
    pub page: usize,
    #[serde(default = "default_page_size")]
    pub page_size: usize,
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub condominium_type: String,
    #[serde(default)]
    pub locality: String,
    #[serde(default)]
    pub manager: String,
    #[serde(default)]
    pub operational_status: String,
    #[serde(default)]
    pub incomplete: bool,
    #[serde(default)]
    pub has_plant: Option<bool>,
    #[serde(default)]
    pub has_equipment: Option<bool>,
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCondominiumParams {
    #[serde(default)]
    pub force: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumInput {
    pub name: String,
    pub location: Option<String>,
    pub buildings: Option<u16>,
    pub fractions: Option<u16>,
    pub residents: Option<u16>,
    pub status: Option<String>,
    pub notice: Option<String>,
    pub internal_code: Option<String>,
    pub manager: Option<String>,
    pub condominium_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumIdentificationInput {
    pub name: Option<String>,
    pub internal_code: Option<String>,
    pub external_reference: Option<String>,
    pub condominium_type: Option<String>,
    pub subtype: Option<String>,
    pub status: Option<String>,
    pub management_start_date: Option<String>,
    pub management_end_date: Option<String>,
    pub manager: Option<String>,
    pub team: Option<String>,
    pub management_company: Option<String>,
    pub short_description: Option<String>,
    pub administrative_notes: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumAddressInput {
    pub street: Option<String>,
    pub number: Option<String>,
    pub lot: Option<String>,
    pub address_block: Option<String>,
    pub postal_code: Option<String>,
    pub locality: Option<String>,
    pub parish: Option<String>,
    pub municipality: Option<String>,
    pub district: Option<String>,
    pub country: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub google_maps_url: Option<String>,
    pub apple_maps_url: Option<String>,
    pub access_notes: Option<String>,
    pub main_entry_point: Option<String>,
    pub technical_entry_point: Option<String>,
    pub garage_entry_point: Option<String>,
    pub access_restrictions: Option<String>,
    pub visual_reference: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumStructureInput {
    pub total_fractions: Option<u16>,
    pub residential_fractions: Option<u16>,
    pub commercial_fractions: Option<u16>,
    pub garages_count: Option<u16>,
    pub storage_units_count: Option<u16>,
    pub shops_count: Option<u16>,
    pub blocks_count: Option<u16>,
    pub entrances_count: Option<u16>,
    pub floors_above_ground: Option<u16>,
    pub basements_count: Option<u16>,
    pub technical_floors_count: Option<u16>,
    pub elevators_count: Option<u16>,
    pub stairs_count: Option<u16>,
    pub parking_spaces_count: Option<u16>,
    pub has_garden: Option<bool>,
    pub has_pool: Option<bool>,
    pub has_condominium_room: Option<bool>,
    pub has_trash_house: Option<bool>,
    pub has_accessible_roof: Option<bool>,
    pub has_technical_roof: Option<bool>,
    pub has_solar_panels: Option<bool>,
    pub has_cctv: Option<bool>,
    pub has_porter_desk: Option<bool>,
    pub has_doorman: Option<bool>,
    pub has_security: Option<bool>,
    pub construction_year: Option<u16>,
    pub last_renovation_year: Option<u16>,
    pub common_area_estimate: Option<String>,
    pub structural_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumOperationalStatusInput {
    pub general_status: Option<String>,
    pub alert_level: Option<String>,
    pub summary: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumBlockInput {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub specific_address: Option<String>,
    pub main_entry: Option<String>,
    pub floors_count: Option<u16>,
    pub basements_count: Option<u16>,
    pub fractions_count: Option<u16>,
    pub elevators_count: Option<u16>,
    pub stairs_count: Option<u16>,
    pub garages_count: Option<u16>,
    pub operational_status: Option<String>,
    pub access_notes: Option<String>,
    pub internal_notes: Option<String>,
    pub archived: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumFloorInput {
    pub block_id: Option<String>,
    pub name: String,
    pub number: String,
    pub floor_type: Option<String>,
    pub description: Option<String>,
    pub fractions_count: Option<u16>,
    pub operational_status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumZoneInput {
    pub block_id: Option<String>,
    pub floor_id: Option<String>,
    pub name: String,
    pub zone_type: Option<String>,
    pub description: Option<String>,
    pub operational_status: Option<String>,
    pub alert_level: Option<String>,
    pub qr_code_reference: Option<String>,
    pub internal_location: Option<String>,
    pub access_notes: Option<String>,
    pub technical_notes: Option<String>,
    pub image_url: Option<String>,
    pub plan_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumEquipmentInput {
    pub block_id: Option<String>,
    pub floor_id: Option<String>,
    pub zone_id: Option<String>,
    pub name: String,
    pub equipment_type: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub internal_reference: Option<String>,
    pub supplier: Option<String>,
    pub maintenance_company: Option<String>,
    pub installation_date: Option<String>,
    pub last_maintenance_date: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub maintenance_frequency: Option<String>,
    pub status: Option<String>,
    pub criticality: Option<String>,
    pub warranty_until: Option<String>,
    pub contract_reference: Option<String>,
    pub technical_notes: Option<String>,
    pub document_ids: Option<Vec<String>>,
    pub media_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumContactInput {
    pub contact_type: Option<String>,
    pub name: String,
    pub company: Option<String>,
    pub role: Option<String>,
    pub phone: Option<String>,
    pub alternate_phone: Option<String>,
    pub email: Option<String>,
    pub schedule: Option<String>,
    pub service: Option<String>,
    pub is_emergency: Option<bool>,
    pub priority: Option<String>,
    pub favorite: Option<bool>,
    pub notes: Option<String>,
    pub contract_reference: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumManagedDocumentInput {
    pub title: String,
    pub document_type: Option<String>,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub file_url: Option<String>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub storage_key: Option<String>,
    pub download_url: Option<String>,
    pub block_id: Option<String>,
    pub zone_id: Option<String>,
    pub equipment_id: Option<String>,
    pub document_date: Option<String>,
    pub expiry_date: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumMediaInput {
    pub media_type: Option<String>,
    pub title: String,
    pub file_name: Option<String>,
    pub file_url: Option<String>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub storage_key: Option<String>,
    pub download_url: Option<String>,
    pub block_id: Option<String>,
    pub floor_id: Option<String>,
    pub zone_id: Option<String>,
    pub description: Option<String>,
    pub is_primary: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumNoteInput {
    pub note_type: Option<String>,
    pub title: String,
    pub content: String,
    pub visibility: Option<String>,
    pub priority: Option<String>,
    pub pinned: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumDraftInput {
    pub current_step: Option<u8>,
    pub completed_steps: Option<Vec<u8>>,
    pub is_quick_mode: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumPlanMarkerInput {
    pub label: String,
    pub marker_type: Option<String>,
    pub x_percent: f64,
    pub y_percent: f64,
    pub block_id: Option<String>,
    pub floor_id: Option<String>,
    pub zone_id: Option<String>,
    pub equipment_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewInput {
    pub csv: String,
    pub delimiter: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitInput {
    pub rows: Vec<ImportRowInput>,
    #[serde(default)]
    pub skip_existing: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportMappedPreviewInput {
    pub rows: Vec<HashMap<String, String>>,
    pub mapping: HashMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRowInput {
    pub name: String,
    pub internal_code: String,
    pub condominium_type: String,
    pub status: String,
    pub street: String,
    pub number: String,
    pub postal_code: String,
    pub locality: String,
    pub parish: String,
    pub municipality: String,
    pub district: String,
    pub country: String,
    pub total_fractions: u16,
    pub blocks_count: u16,
    pub elevators_count: u16,
    pub manager: String,
    pub notes: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumDetailResponse {
    pub condominium: Condominium,
    pub completeness: CompletenessReport,
    pub alerts: Vec<CondominiumAlert>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletenessReport {
    pub percentage: u8,
    pub complete: bool,
    pub missing_items: Vec<String>,
    pub categories: Vec<CompletenessCategory>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletenessCategory {
    pub id: String,
    pub label: String,
    pub complete: bool,
    pub missing_items: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub total_rows: usize,
    pub valid_rows: usize,
    pub invalid_rows: usize,
    pub rows: Vec<ImportRowPreview>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRowPreview {
    pub row_number: usize,
    pub valid: bool,
    pub errors: Vec<String>,
    pub values: ImportRowInput,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub created: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
    pub condominiums: Vec<Condominium>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumAlert {
    pub id: String,
    pub severity: String,
    pub category: String,
    pub title: String,
    pub detail: String,
    pub entity_id: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFilePreview {
    pub file_name: String,
    pub headers: Vec<String>,
    pub rows: Vec<HashMap<String, String>>,
    pub suggested_mapping: HashMap<String, String>,
    pub preview: ImportPreview,
}

pub async fn condominiums(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<CondominiumListParams>,
) -> Result<Json<Paginated<Condominium>>, ApiError> {
    let context = current_context(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        let filter = RelationalCondominiumFilter {
            page: params.page,
            page_size: params.page_size,
            search: &params.search,
            status: &params.status,
            condominium_type: &params.condominium_type,
            locality: &params.locality,
            manager: &params.manager,
            operational_status: &params.operational_status,
            incomplete: params.incomplete,
            has_plant: params.has_plant,
            has_equipment: params.has_equipment,
            include_archived: params.include_archived,
        };
        let page = repository
            .list_relational_condominiums_page(&context.tenant_id, &filter)
            .await
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar condominios na base de dados",
                    error,
                )
            })?;
        return Ok(Json(page));
    }

    let store = state.store.read().await;
    let items = filtered_condominiums(&store, &params);
    let pagination = PaginationParams {
        page: params.page,
        page_size: params.page_size,
        search: String::new(),
    };

    Ok(Json(paginate(&items, &pagination)))
}

pub async fn condominium_detail(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<CondominiumDetailResponse>, ApiError> {
    let user = current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let mut condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    let completeness = completeness_for(&condominium);
    let alerts = alerts_for(&store, &condominium);
    condominium.internal_notes_registry =
        visible_notes(&user, &condominium.internal_notes_registry);

    Ok(Json(CondominiumDetailResponse {
        completeness,
        alerts,
        condominium,
    }))
}

pub async fn condominium_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumHistoryEvent>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    Ok(Json(condominium.history.clone()))
}

pub async fn condominium_completeness(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<CompletenessReport>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    Ok(Json(completeness_for(condominium)))
}

pub async fn condominium_alerts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumAlert>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    Ok(Json(alerts_for(&store, condominium)))
}

pub async fn create_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    let mut store = state.store.write().await;
    let internal_code = input.internal_code.unwrap_or_default();
    validate_unique_internal_code(&store, "", &internal_code)?;

    let location = input.location.unwrap_or_default();
    let now = Utc::now().to_rfc3339();
    let mut item = Condominium {
        id: new_id(),
        name: clean(input.name),
        location: clean(location.clone()),
        buildings: input.buildings.unwrap_or(1),
        fractions: input.fractions.unwrap_or(0),
        residents: input.residents.unwrap_or(0),
        status: input.status.unwrap_or_else(|| "em onboarding".to_string()),
        notice: input
            .notice
            .unwrap_or_else(|| "Ficha em onboarding".to_string()),
        internal_code: clean(internal_code),
        condominium_type: input
            .condominium_type
            .unwrap_or_else(|| "residencial".to_string()),
        manager: input.manager.unwrap_or_else(|| user.name.clone()),
        team: "Equipa GESTISAC".to_string(),
        management_company: "GESTISAC".to_string(),
        address: CondominiumAddress {
            locality: clean(location),
            country: "Portugal".to_string(),
            ..Default::default()
        },
        structure: CondominiumStructure {
            total_fractions: input.fractions.unwrap_or(0),
            blocks_count: input.buildings.unwrap_or(1),
            ..Default::default()
        },
        operational_status: CondominiumOperationalStatus {
            updated_by: user.name.clone(),
            updated_at: now.clone(),
            ..Default::default()
        },
        onboarding_draft: Some(CondominiumOnboardingDraft {
            current_step: 1,
            completed_steps: Vec::new(),
            is_quick_mode: true,
            saved_at: now.clone(),
        }),
        created_at: now.clone(),
        updated_at: now,
        ..Default::default()
    };
    item.ensure_profile_defaults();
    validate_active_ready(&item)?;
    item.push_history(
        "created",
        "Condominio criado",
        user.name.clone(),
        "condominium",
        "",
        item.name.clone(),
        "api",
    );
    store.condominiums.push(item.clone());
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &item.id,
        format!("Condominio {} criado", item.name),
    );
    drop(store);
    persist_condominium_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn update_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    let mut store = state.store.write().await;
    let internal_code = input.internal_code.clone().unwrap_or_default();
    validate_unique_internal_code(&store, &id, &internal_code)?;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    item.name = clean(input.name);
    if let Some(location) = input.location {
        item.location = clean(location);
    }
    if let Some(buildings) = input.buildings {
        item.buildings = buildings;
        item.structure.blocks_count = buildings;
    }
    if let Some(fractions) = input.fractions {
        item.fractions = fractions;
        item.structure.total_fractions = fractions;
    }
    if let Some(residents) = input.residents {
        item.residents = residents;
    }
    if let Some(status) = input.status {
        item.status = clean(status);
    }
    if let Some(notice) = input.notice {
        item.notice = clean(notice);
    }
    if let Some(manager) = input.manager {
        item.manager = clean(manager);
    }
    if let Some(condominium_type) = input.condominium_type {
        item.condominium_type = clean(condominium_type);
    }
    if !internal_code.trim().is_empty() {
        item.internal_code = clean(internal_code);
    }
    item.ensure_profile_defaults();
    validate_active_ready(item)?;
    item.push_history(
        "updated",
        "Dados principais alterados",
        user.name.clone(),
        "condominium",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "update",
        &response.id,
        format!("Condominio {} atualizado", response.name),
    );
    drop(store);
    persist_condominium_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn archive_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    item.archived = true;
    item.archived_at = Some(Utc::now().to_rfc3339());
    item.status = "arquivo".to_string();
    item.push_history(
        "archived",
        "Condominio arquivado",
        user.name.clone(),
        "condominium",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    store.add_audit(
        &user,
        "condominiums",
        "archive",
        &response.id,
        format!("Condominio {} arquivado", response.name),
    );
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn delete_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(params): Query<DeleteCondominiumParams>,
) -> Result<Json<Vec<Condominium>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let existing = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    if !params.force && !existing.archived {
        return Err(ApiError::validation(
            "Arquive o condominio antes de apagar definitivamente",
        ));
    }
    if !params.force
        && (!existing.blocks_detailed.is_empty()
            || !existing.floors_detailed.is_empty()
            || !existing.zones.is_empty()
            || !existing.equipment.is_empty())
    {
        return Err(ApiError::validation(
            "Condominio com estrutura operacional exige delete force",
        ));
    }

    store.condominiums.retain(|item| item.id != id);
    store.add_audit(
        &user,
        "condominiums",
        "delete",
        &id,
        format!("Condominio {} apagado", existing.name),
    );
    let response = store.condominiums.clone();
    drop(store);
    persist_condominium_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_identification(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumIdentificationInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    if let Some(code) = input.internal_code.as_deref() {
        validate_unique_internal_code(&store, &id, code)?;
    }
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    let mut next = item.clone();
    if let Some(value) = input.name {
        validate_required(&value, "Nome do condominio")?;
        next.name = clean(value);
    }
    set_string(&mut next.internal_code, input.internal_code);
    set_string(&mut next.external_reference, input.external_reference);
    set_string(&mut next.condominium_type, input.condominium_type);
    set_string(&mut next.subtype, input.subtype);
    set_string(&mut next.status, input.status);
    set_string(&mut next.management_start_date, input.management_start_date);
    set_string(&mut next.management_end_date, input.management_end_date);
    set_string(&mut next.manager, input.manager);
    set_string(&mut next.team, input.team);
    set_string(&mut next.management_company, input.management_company);
    set_string(&mut next.short_description, input.short_description);
    set_string(&mut next.administrative_notes, input.administrative_notes);
    if let Some(tags) = input.tags {
        next.tags = tags
            .into_iter()
            .map(clean)
            .filter(|tag| !tag.is_empty())
            .collect();
    }
    next.ensure_profile_defaults();
    validate_active_ready(&next)?;
    next.push_history(
        "identification-updated",
        "Identificacao alterada",
        user.name.clone(),
        "identification",
        before,
        snapshot(&next),
        "api",
    );
    *item = next;
    let response = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;
    Ok(Json(response))
}

pub async fn update_address(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumAddressInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    let mut next = item.clone();
    let address = &mut next.address;
    set_string(&mut address.street, input.street);
    set_string(&mut address.number, input.number);
    set_string(&mut address.lot, input.lot);
    set_string(&mut address.address_block, input.address_block);
    set_string(&mut address.postal_code, input.postal_code);
    set_string(&mut address.locality, input.locality);
    set_string(&mut address.parish, input.parish);
    set_string(&mut address.municipality, input.municipality);
    set_string(&mut address.district, input.district);
    set_string(&mut address.country, input.country);
    set_string(&mut address.google_maps_url, input.google_maps_url);
    set_string(&mut address.apple_maps_url, input.apple_maps_url);
    set_string(&mut address.access_notes, input.access_notes);
    set_string(&mut address.main_entry_point, input.main_entry_point);
    set_string(
        &mut address.technical_entry_point,
        input.technical_entry_point,
    );
    set_string(&mut address.garage_entry_point, input.garage_entry_point);
    set_string(&mut address.access_restrictions, input.access_restrictions);
    set_string(&mut address.visual_reference, input.visual_reference);
    if input.latitude.is_some() {
        address.latitude = input.latitude;
    }
    if input.longitude.is_some() {
        address.longitude = input.longitude;
    }
    next.location = compact_location(&next.address);
    next.ensure_profile_defaults();
    validate_active_ready(&next)?;
    next.push_history(
        "address-updated",
        "Morada alterada",
        user.name,
        "address",
        before,
        snapshot(&next),
        "api",
    );
    *item = next;
    let response = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;
    Ok(Json(response))
}

pub async fn update_structure(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumStructureInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    let mut next = item.clone();
    let structure = &mut next.structure;
    set_u16(&mut structure.total_fractions, input.total_fractions);
    set_u16(
        &mut structure.residential_fractions,
        input.residential_fractions,
    );
    set_u16(
        &mut structure.commercial_fractions,
        input.commercial_fractions,
    );
    set_u16(&mut structure.garages_count, input.garages_count);
    set_u16(
        &mut structure.storage_units_count,
        input.storage_units_count,
    );
    set_u16(&mut structure.shops_count, input.shops_count);
    set_u16(&mut structure.blocks_count, input.blocks_count);
    set_u16(&mut structure.entrances_count, input.entrances_count);
    set_u16(
        &mut structure.floors_above_ground,
        input.floors_above_ground,
    );
    set_u16(&mut structure.basements_count, input.basements_count);
    set_u16(
        &mut structure.technical_floors_count,
        input.technical_floors_count,
    );
    set_u16(&mut structure.elevators_count, input.elevators_count);
    set_u16(&mut structure.stairs_count, input.stairs_count);
    set_u16(
        &mut structure.parking_spaces_count,
        input.parking_spaces_count,
    );
    set_bool(&mut structure.has_garden, input.has_garden);
    set_bool(&mut structure.has_pool, input.has_pool);
    set_bool(
        &mut structure.has_condominium_room,
        input.has_condominium_room,
    );
    set_bool(&mut structure.has_trash_house, input.has_trash_house);
    set_bool(
        &mut structure.has_accessible_roof,
        input.has_accessible_roof,
    );
    set_bool(&mut structure.has_technical_roof, input.has_technical_roof);
    set_bool(&mut structure.has_solar_panels, input.has_solar_panels);
    set_bool(&mut structure.has_cctv, input.has_cctv);
    set_bool(&mut structure.has_porter_desk, input.has_porter_desk);
    set_bool(&mut structure.has_doorman, input.has_doorman);
    set_bool(&mut structure.has_security, input.has_security);
    if input.construction_year.is_some() {
        structure.construction_year = input.construction_year;
    }
    if input.last_renovation_year.is_some() {
        structure.last_renovation_year = input.last_renovation_year;
    }
    set_string(
        &mut structure.common_area_estimate,
        input.common_area_estimate,
    );
    set_string(&mut structure.structural_notes, input.structural_notes);
    next.fractions = next.structure.total_fractions;
    next.buildings = next.structure.blocks_count;
    next.ensure_profile_defaults();
    validate_active_ready(&next)?;
    next.push_history(
        "structure-updated",
        "Estrutura fisica alterada",
        user.name,
        "structure",
        before,
        snapshot(&next),
        "api",
    );
    *item = next;
    let response = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;
    Ok(Json(response))
}

pub async fn update_operational_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumOperationalStatusInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    set_string(
        &mut item.operational_status.general_status,
        input.general_status,
    );
    set_string(&mut item.operational_status.alert_level, input.alert_level);
    set_string(&mut item.operational_status.summary, input.summary);
    set_string(&mut item.operational_status.reason, input.reason);
    item.operational_status.updated_by = user.name.clone();
    item.operational_status.updated_at = Utc::now().to_rfc3339();
    item.notice = item.operational_status.summary.clone();
    item.push_history(
        "operational-status-updated",
        "Estado operacional alterado",
        user.name,
        "operational-status",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;
    Ok(Json(response))
}

pub async fn save_condominium_draft(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumDraftInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let draft = item
        .onboarding_draft
        .get_or_insert_with(CondominiumOnboardingDraft::default);
    if let Some(current_step) = input.current_step {
        draft.current_step = current_step;
    }
    if let Some(completed_steps) = input.completed_steps {
        draft.completed_steps = completed_steps;
    }
    if let Some(is_quick_mode) = input.is_quick_mode {
        draft.is_quick_mode = is_quick_mode;
    }
    draft.saved_at = Utc::now().to_rfc3339();
    item.push_history(
        "draft-saved",
        "Rascunho de onboarding guardado",
        user.name,
        "onboarding-draft",
        "",
        snapshot(item),
        "api",
    );
    let response = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response).await?;
    Ok(Json(response))
}

pub async fn import_preview(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ImportPreviewInput>,
) -> Result<Json<ImportPreview>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(build_import_preview(&store, &input)?))
}

pub async fn import_commit(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ImportCommitInput>,
) -> Result<Json<ImportReport>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let mut created = Vec::new();
    let mut skipped = 0;
    let mut errors = Vec::new();

    for row in input.rows {
        let row_errors = validate_import_row(&row);
        if !row_errors.is_empty() {
            errors.push(format!("{}: {}", row.name, row_errors.join(", ")));
            continue;
        }
        if !row.internal_code.trim().is_empty()
            && store.condominiums.iter().any(|item| {
                item.internal_code
                    .eq_ignore_ascii_case(row.internal_code.trim())
            })
        {
            if input.skip_existing {
                skipped += 1;
                continue;
            }
            errors.push(format!("{}: codigo interno ja existe", row.name));
            continue;
        }

        let now = Utc::now().to_rfc3339();
        let mut condominium = Condominium {
            id: new_id(),
            name: clean(row.name),
            location: clean(row.locality.clone()),
            buildings: row.blocks_count,
            fractions: row.total_fractions,
            status: clean(row.status),
            notice: "Importado via CSV".to_string(),
            internal_code: clean(row.internal_code),
            condominium_type: clean(row.condominium_type),
            manager: clean(row.manager),
            administrative_notes: clean(row.notes),
            address: CondominiumAddress {
                street: clean(row.street),
                number: clean(row.number),
                postal_code: clean(row.postal_code),
                locality: clean(row.locality),
                parish: clean(row.parish),
                municipality: clean(row.municipality),
                district: clean(row.district),
                country: if row.country.trim().is_empty() {
                    "Portugal".to_string()
                } else {
                    clean(row.country)
                },
                ..Default::default()
            },
            structure: CondominiumStructure {
                total_fractions: row.total_fractions,
                blocks_count: row.blocks_count,
                elevators_count: row.elevators_count,
                ..Default::default()
            },
            operational_status: CondominiumOperationalStatus {
                updated_by: user.name.clone(),
                updated_at: now.clone(),
                summary: "Importado via CSV".to_string(),
                ..Default::default()
            },
            created_at: now.clone(),
            updated_at: now,
            ..Default::default()
        };
        condominium.ensure_profile_defaults();
        condominium.push_history(
            "imported",
            "Condominio importado via CSV",
            user.name.clone(),
            "condominium",
            "",
            condominium.name.clone(),
            "import",
        );
        store.condominiums.push(condominium.clone());
        created.push(condominium);
    }

    store.add_audit(
        &user,
        "condominiums",
        "import",
        "bulk",
        format!(
            "Importacao CSV: {} criados, {} ignorados",
            created.len(),
            skipped
        ),
    );
    drop(store);
    for condominium in &created {
        persist_condominium_upsert(&state, &tenant_id, condominium).await?;
    }

    Ok(Json(ImportReport {
        created: created.len(),
        skipped,
        errors,
        condominiums: created,
    }))
}

pub async fn import_preview_file(
    State(state): State<AppState>,
    headers: HeaderMap,
    multipart: Multipart,
) -> Result<Json<ImportFilePreview>, ApiError> {
    current_user(&headers, &state).await?;
    let (_fields, uploaded_file) = read_multipart_upload(multipart).await?;
    let table = import_table_from_file(&uploaded_file)?;
    let suggested_mapping = suggest_import_mapping(&table.headers);
    let rows = table
        .rows
        .iter()
        .map(|row| row_to_import_input(row, &suggested_mapping))
        .collect::<Vec<_>>();
    let store = state.store.read().await;
    let preview = preview_import_rows(&store, rows);

    Ok(Json(ImportFilePreview {
        file_name: uploaded_file.original_name,
        headers: table.headers,
        rows: table.rows,
        suggested_mapping,
        preview,
    }))
}

pub async fn import_preview_mapped(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ImportMappedPreviewInput>,
) -> Result<Json<ImportPreview>, ApiError> {
    current_user(&headers, &state).await?;
    let rows = input
        .rows
        .iter()
        .map(|row| row_to_import_input(row, &input.mapping))
        .collect::<Vec<_>>();
    let store = state.store.read().await;
    Ok(Json(preview_import_rows(&store, rows)))
}

pub async fn upload_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    multipart: Multipart,
) -> Result<Json<CondominiumManagedDocument>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let (fields, uploaded_file) = read_multipart_upload(multipart).await?;
    let title = field_or_default(&fields, "title", &uploaded_file.original_name);
    validate_required(&title, "Titulo do documento")?;
    let resource_id = new_id();
    let storage_key = condominium_storage_key(&id, &resource_id, &uploaded_file.original_name);
    write_condominium_file(&state, &tenant_id, &storage_key, &uploaded_file.bytes).await?;

    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let document = CondominiumManagedDocument {
        id: resource_id.clone(),
        title: clean(title),
        document_type: field_or_default(&fields, "documentType", "documento"),
        description: field_or_default(&fields, "description", ""),
        file_name: uploaded_file.original_name,
        file_url: format!("/api/condominiums/{id}/documents/{resource_id}/download"),
        mime_type: uploaded_file.mime_type,
        size_bytes: uploaded_file.bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        download_url: format!("/api/condominiums/{id}/documents/{resource_id}/download"),
        block_id: field_or_default(&fields, "blockId", ""),
        zone_id: field_or_default(&fields, "zoneId", ""),
        equipment_id: field_or_default(&fields, "equipmentId", ""),
        document_date: field_or_default(&fields, "documentDate", ""),
        expiry_date: field_or_default(&fields, "expiryDate", ""),
        uploaded_by: user.name.clone(),
        uploaded_at: Utc::now().to_rfc3339(),
        version: field_or_default(&fields, "version", "1"),
        status: field_or_default(&fields, "status", "ativo"),
        notes: field_or_default(&fields, "notes", ""),
    };
    validate_block_reference(item, &document.block_id, "blockId")?;
    validate_zone_reference(item, &document.zone_id, "zoneId")?;
    validate_equipment_reference(item, &document.equipment_id, "equipmentId")?;
    item.managed_documents.push(document.clone());
    item.push_history(
        "document-uploaded",
        "Documento carregado",
        user.name,
        "documento",
        "",
        snapshot(&document),
        "upload",
    );
    let response_condominium = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
    Ok(Json(document))
}

pub async fn upload_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    multipart: Multipart,
) -> Result<Json<CondominiumMedia>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let (fields, uploaded_file) = read_multipart_upload(multipart).await?;
    let title = field_or_default(&fields, "title", &uploaded_file.original_name);
    validate_required(&title, "Titulo da imagem/planta")?;
    let resource_id = new_id();
    let storage_key = condominium_storage_key(&id, &resource_id, &uploaded_file.original_name);
    write_condominium_file(&state, &tenant_id, &storage_key, &uploaded_file.bytes).await?;

    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let is_primary = field_bool(&fields, "isPrimary");
    if is_primary {
        for media in &mut item.media {
            media.is_primary = false;
        }
    }
    let media_type = field_or_default(&fields, "mediaType", "imagem");
    let media = CondominiumMedia {
        id: resource_id.clone(),
        media_type,
        title: clean(title),
        file_name: uploaded_file.original_name,
        file_url: format!("/api/condominiums/{id}/media/{resource_id}/download"),
        mime_type: uploaded_file.mime_type,
        size_bytes: uploaded_file.bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        download_url: format!("/api/condominiums/{id}/media/{resource_id}/download"),
        block_id: field_or_default(&fields, "blockId", ""),
        floor_id: field_or_default(&fields, "floorId", ""),
        zone_id: field_or_default(&fields, "zoneId", ""),
        description: field_or_default(&fields, "description", ""),
        is_primary,
        created_at: Utc::now().to_rfc3339(),
    };
    validate_block_reference(item, &media.block_id, "blockId")?;
    validate_floor_reference(item, &media.floor_id, "floorId")?;
    validate_zone_reference(item, &media.zone_id, "zoneId")?;
    validate_floor_block_consistency(item, &media.floor_id, &media.block_id)?;
    validate_zone_consistency(item, &media.zone_id, &media.floor_id, &media.block_id)?;
    if media.is_primary {
        item.primary_image_url = media.file_url.clone();
    }
    item.media.push(media.clone());
    item.push_history(
        "media-uploaded",
        "Media carregado",
        user.name,
        "media",
        "",
        snapshot(&media),
        "upload",
    );
    let response_condominium = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
    Ok(Json(media))
}

pub async fn download_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, resource_id)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    let context = current_context(&headers, &state).await?;
    let store = state.store.read().await;
    let document = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .and_then(|item| {
            item.managed_documents
                .iter()
                .find(|doc| doc.id == resource_id)
        })
        .cloned()
        .ok_or_else(|| ApiError::not_found("Documento nao encontrado"))?;
    drop(store);

    binary_response(
        read_condominium_file_or_metadata(
            &state,
            &context.tenant_id,
            &document.storage_key,
            format!(
                "GESTISAC Documento\nTitulo: {}\nTipo: {}\nEstado: {}\n",
                document.title, document.document_type, document.status
            )
            .into_bytes(),
        )
        .await?,
        &document.file_name,
        &document.mime_type,
    )
}

pub async fn download_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, resource_id)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    let context = current_context(&headers, &state).await?;
    let store = state.store.read().await;
    let media = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .and_then(|item| item.media.iter().find(|item| item.id == resource_id))
        .cloned()
        .ok_or_else(|| ApiError::not_found("Media nao encontrado"))?;
    drop(store);

    binary_response(
        read_condominium_file_or_metadata(
            &state,
            &context.tenant_id,
            &media.storage_key,
            format!(
                "GESTISAC Media\nTitulo: {}\nTipo: {}\n",
                media.title, media.media_type
            )
            .into_bytes(),
        )
        .await?,
        &media.file_name,
        &media.mime_type,
    )
}

pub async fn condominium_zone_qr_svg(
    State(state): State<AppState>,
    _headers: HeaderMap,
    Path((id, resource_id)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    let store = state.store.read().await;
    let zone = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .and_then(|item| item.zones.iter().find(|zone| zone.id == resource_id))
        .cloned()
        .ok_or_else(|| ApiError::not_found("Zona nao encontrada"))?;
    drop(store);

    let svg = qr_svg_for(&zone.public_qr_url);
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "image/svg+xml; charset=utf-8")
        .body(Body::from(svg))
        .map_err(|_| ApiError::internal("Nao foi possivel gerar QR"))
}

macro_rules! subresource_handlers {
    (
        $list_fn:ident,
        $create_fn:ident,
        $update_fn:ident,
        $delete_fn:ident,
        $input:ty,
        $model:ty,
        $field:ident,
        $make:ident,
        $apply:ident,
        $created_event:literal,
        $updated_event:literal,
        $deleted_event:literal,
        $label:literal
    ) => {
        pub async fn $list_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path(id): Path<String>,
        ) -> Result<Json<Vec<$model>>, ApiError> {
            current_user(&headers, &state).await?;
            let store = state.store.read().await;
            let item = store
                .condominiums
                .iter()
                .find(|item| item.id == id)
                .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
            Ok(Json(item.$field.clone()))
        }

        pub async fn $create_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path(id): Path<String>,
            Json(input): Json<$input>,
        ) -> Result<Json<$model>, ApiError> {
            let user = require_write(&headers, &state, "condominiums").await?;
            let tenant_id = user.tenant_id.clone();
            let mut store = state.store.write().await;
            let item = find_condominium_mut(&mut store, &id)?;
            let resource = $make(input, item)?;
            item.$field.push(resource.clone());
            item.push_history(
                $created_event,
                format!("{} adicionado", $label),
                user.name,
                $label,
                "",
                snapshot(&resource),
                "api",
            );
            let response_condominium = item.clone();
            drop(store);
            persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
            Ok(Json(resource))
        }

        pub async fn $update_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path((id, resource_id)): Path<(String, String)>,
            Json(input): Json<$input>,
        ) -> Result<Json<$model>, ApiError> {
            let user = require_write(&headers, &state, "condominiums").await?;
            let tenant_id = user.tenant_id.clone();
            let mut store = state.store.write().await;
            let item = find_condominium_mut(&mut store, &id)?;
            let index = item
                .$field
                .iter()
                .position(|resource| resource.id == resource_id)
                .ok_or_else(|| ApiError::not_found(format!("{} nao encontrado", $label)))?;
            let condominium_snapshot = item.clone();
            let before = snapshot(&item.$field[index]);
            $apply(&mut item.$field[index], input, &condominium_snapshot)?;
            let response = item.$field[index].clone();
            item.push_history(
                $updated_event,
                format!("{} alterado", $label),
                user.name,
                $label,
                before,
                snapshot(&response),
                "api",
            );
            let response_condominium = item.clone();
            drop(store);
            persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
            Ok(Json(response))
        }

        pub async fn $delete_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path((id, resource_id)): Path<(String, String)>,
        ) -> Result<Json<Vec<$model>>, ApiError> {
            let user = require_delete(&headers, &state, "condominiums").await?;
            let tenant_id = user.tenant_id.clone();
            let mut store = state.store.write().await;
            let item = find_condominium_mut(&mut store, &id)?;
            let original_len = item.$field.len();
            let deleted = item
                .$field
                .iter()
                .find(|resource| resource.id == resource_id)
                .map(snapshot)
                .unwrap_or_default();
            item.$field.retain(|resource| resource.id != resource_id);
            if item.$field.len() == original_len {
                return Err(ApiError::not_found(format!("{} nao encontrado", $label)));
            }
            item.push_history(
                $deleted_event,
                format!("{} removido", $label),
                user.name,
                $label,
                deleted,
                "",
                "api",
            );
            let response = item.$field.clone();
            let response_condominium = item.clone();
            drop(store);
            persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
            Ok(Json(response))
        }
    };
}

subresource_handlers!(
    condominium_blocks,
    create_condominium_block,
    update_condominium_block,
    delete_condominium_block,
    CondominiumBlockInput,
    CondominiumBlock,
    blocks_detailed,
    make_block,
    apply_block,
    "block-created",
    "block-updated",
    "block-deleted",
    "bloco"
);
subresource_handlers!(
    condominium_floors,
    create_condominium_floor,
    update_condominium_floor,
    delete_condominium_floor,
    CondominiumFloorInput,
    CondominiumFloor,
    floors_detailed,
    make_floor,
    apply_floor,
    "floor-created",
    "floor-updated",
    "floor-deleted",
    "piso"
);
subresource_handlers!(
    condominium_zones,
    create_condominium_zone,
    update_condominium_zone,
    delete_condominium_zone,
    CondominiumZoneInput,
    CondominiumZone,
    zones,
    make_zone,
    apply_zone,
    "zone-created",
    "zone-updated",
    "zone-deleted",
    "zona"
);
subresource_handlers!(
    condominium_equipment,
    create_condominium_equipment,
    update_condominium_equipment,
    delete_condominium_equipment,
    CondominiumEquipmentInput,
    CondominiumEquipment,
    equipment,
    make_equipment,
    apply_equipment,
    "equipment-created",
    "equipment-updated",
    "equipment-deleted",
    "equipamento"
);
subresource_handlers!(
    condominium_contacts,
    create_condominium_contact,
    update_condominium_contact,
    delete_condominium_contact,
    CondominiumContactInput,
    CondominiumContact,
    contacts,
    make_contact,
    apply_contact,
    "contact-created",
    "contact-updated",
    "contact-deleted",
    "contacto"
);
subresource_handlers!(
    condominium_documents,
    create_condominium_document,
    update_condominium_document,
    delete_condominium_document,
    CondominiumManagedDocumentInput,
    CondominiumManagedDocument,
    managed_documents,
    make_document,
    apply_document,
    "document-created",
    "document-updated",
    "document-deleted",
    "documento"
);
subresource_handlers!(
    condominium_media,
    create_condominium_media,
    update_condominium_media,
    delete_condominium_media,
    CondominiumMediaInput,
    CondominiumMedia,
    media,
    make_media,
    apply_media,
    "media-created",
    "media-updated",
    "media-deleted",
    "media"
);
subresource_handlers!(
    condominium_plan_markers,
    create_condominium_plan_marker,
    update_condominium_plan_marker,
    delete_condominium_plan_marker,
    CondominiumPlanMarkerInput,
    CondominiumPlanMarker,
    plan_markers,
    make_plan_marker,
    apply_plan_marker,
    "plan-marker-created",
    "plan-marker-updated",
    "plan-marker-deleted",
    "marcador de planta"
);

pub async fn condominium_notes(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumInternalNote>>, ApiError> {
    let user = current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(visible_notes(&user, &item.internal_notes_registry)))
}

pub async fn create_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumNoteInput>,
) -> Result<Json<CondominiumInternalNote>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let mut resource = make_note(input, item)?;
    resource.created_by = user.name.clone();
    item.internal_notes_registry.push(resource.clone());
    item.push_history(
        "note-created",
        "nota adicionada",
        user.name,
        "nota",
        "",
        snapshot(&resource),
        "api",
    );
    let response_condominium = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
    Ok(Json(resource))
}

pub async fn update_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, resource_id)): Path<(String, String)>,
    Json(input): Json<CondominiumNoteInput>,
) -> Result<Json<CondominiumInternalNote>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let index = item
        .internal_notes_registry
        .iter()
        .position(|resource| resource.id == resource_id)
        .ok_or_else(|| ApiError::not_found("nota nao encontrada"))?;
    if !can_see_note(&user, &item.internal_notes_registry[index]) {
        return Err(ApiError::forbidden("Sem permissao para alterar esta nota"));
    }
    let before = snapshot(&item.internal_notes_registry[index]);
    apply_note(
        &mut item.internal_notes_registry[index],
        input,
        &Condominium::default(),
    )?;
    let response = item.internal_notes_registry[index].clone();
    item.push_history(
        "note-updated",
        "nota alterada",
        user.name,
        "nota",
        before,
        snapshot(&response),
        "api",
    );
    let response_condominium = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, resource_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumInternalNote>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let tenant_id = user.tenant_id.clone();
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let deleted_note = item
        .internal_notes_registry
        .iter()
        .find(|resource| resource.id == resource_id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("nota nao encontrada"))?;
    if !can_see_note(&user, &deleted_note) {
        return Err(ApiError::forbidden("Sem permissao para apagar esta nota"));
    }
    item.internal_notes_registry
        .retain(|resource| resource.id != resource_id);
    item.push_history(
        "note-deleted",
        "nota removida",
        user.name.clone(),
        "nota",
        snapshot(&deleted_note),
        "",
        "api",
    );
    let response = visible_notes(&user, &item.internal_notes_registry);
    let response_condominium = item.clone();
    drop(store);
    persist_condominium_upsert(&state, &tenant_id, &response_condominium).await?;
    Ok(Json(response))
}

fn filtered_condominiums(store: &AppStore, params: &CondominiumListParams) -> Vec<Condominium> {
    store
        .condominiums
        .iter()
        .filter(|item| params.include_archived || !item.archived)
        .filter(|item| params.status.is_empty() || item.status.eq_ignore_ascii_case(&params.status))
        .filter(|item| {
            params.condominium_type.is_empty()
                || item
                    .condominium_type
                    .eq_ignore_ascii_case(&params.condominium_type)
        })
        .filter(|item| {
            params.locality.is_empty()
                || item
                    .address
                    .locality
                    .to_lowercase()
                    .contains(&params.locality.to_lowercase())
        })
        .filter(|item| {
            params.manager.is_empty()
                || item
                    .manager
                    .to_lowercase()
                    .contains(&params.manager.to_lowercase())
        })
        .filter(|item| {
            params.operational_status.is_empty()
                || item
                    .operational_status
                    .general_status
                    .eq_ignore_ascii_case(&params.operational_status)
        })
        .filter(|item| !params.incomplete || !completeness_for(item).complete)
        .filter(|item| match params.has_plant {
            Some(true) => item
                .media
                .iter()
                .any(|media| media.media_type.contains("planta")),
            Some(false) => !item
                .media
                .iter()
                .any(|media| media.media_type.contains("planta")),
            None => true,
        })
        .filter(|item| match params.has_equipment {
            Some(true) => !item.equipment.is_empty(),
            Some(false) => item.equipment.is_empty(),
            None => true,
        })
        .filter(|item| {
            if params.search.trim().is_empty() {
                return true;
            }
            snapshot(item)
                .to_lowercase()
                .contains(&params.search.trim().to_lowercase())
        })
        .cloned()
        .collect()
}

fn find_condominium_mut<'a>(
    store: &'a mut AppStore,
    id: &str,
) -> Result<&'a mut Condominium, ApiError> {
    store
        .condominiums
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))
}

fn validate_unique_internal_code(
    store: &AppStore,
    current_id: &str,
    internal_code: &str,
) -> Result<(), ApiError> {
    if internal_code.trim().is_empty() {
        return Ok(());
    }
    if store.condominiums.iter().any(|item| {
        item.id != current_id
            && item
                .internal_code
                .eq_ignore_ascii_case(internal_code.trim())
    }) {
        return Err(ApiError::validation("Codigo interno ja existe"));
    }
    Ok(())
}

fn validate_active_ready(item: &Condominium) -> Result<(), ApiError> {
    if !item.status.eq_ignore_ascii_case("ativo") {
        return Ok(());
    }
    if item.address.street.trim().is_empty()
        || item.address.locality.trim().is_empty()
        || item.structure.total_fractions == 0
    {
        return Err(ApiError::validation(
            "Condominio ativo exige morada, localidade e total de fracoes",
        ));
    }
    Ok(())
}

fn completeness_for(item: &Condominium) -> CompletenessReport {
    let mut categories = Vec::new();
    push_category(
        &mut categories,
        "identification",
        "Identificacao",
        vec![
            missing(item.internal_code.trim().is_empty(), "falta codigo interno"),
            missing(item.manager.trim().is_empty(), "falta gestor responsavel"),
            missing(item.condominium_type.trim().is_empty(), "falta tipo"),
        ],
    );
    push_category(
        &mut categories,
        "address",
        "Morada",
        vec![
            missing(item.address.street.trim().is_empty(), "falta rua"),
            missing(
                item.address.postal_code.trim().is_empty(),
                "falta codigo postal",
            ),
            missing(item.address.locality.trim().is_empty(), "falta localidade"),
        ],
    );
    push_category(
        &mut categories,
        "structure",
        "Estrutura fisica",
        vec![
            missing(
                item.structure.total_fractions == 0,
                "falta total de fracoes",
            ),
            missing(item.structure.blocks_count == 0, "falta numero de blocos"),
        ],
    );
    push_category(
        &mut categories,
        "blocks",
        "Blocos",
        vec![missing(
            item.blocks_detailed.is_empty(),
            "nao existem blocos registados",
        )],
    );
    push_category(
        &mut categories,
        "zones",
        "Zonas",
        vec![missing(
            item.zones.is_empty(),
            "nao existem zonas registadas",
        )],
    );
    push_category(
        &mut categories,
        "equipment",
        "Equipamentos",
        vec![missing(
            item.equipment.is_empty(),
            "nao existem equipamentos registados",
        )],
    );
    push_category(
        &mut categories,
        "contacts",
        "Contactos",
        vec![missing(
            !item.contacts.iter().any(|contact| contact.is_emergency),
            "nao existe contacto de emergencia",
        )],
    );
    push_category(
        &mut categories,
        "documents",
        "Documentos",
        vec![missing(
            item.managed_documents.is_empty(),
            "faltam documentos do condominio",
        )],
    );
    push_category(
        &mut categories,
        "media",
        "Imagens e plantas",
        vec![missing(
            item.primary_image_url.trim().is_empty()
                && !item.media.iter().any(|media| media.is_primary),
            "falta imagem principal ou planta",
        )],
    );
    push_category(
        &mut categories,
        "notes",
        "Notas internas",
        vec![missing(
            item.internal_notes_registry.is_empty(),
            "faltam notas internas operacionais",
        )],
    );

    let complete_count = categories
        .iter()
        .filter(|category| category.complete)
        .count();
    let percentage = ((complete_count * 100) / categories.len().max(1)) as u8;
    let missing_items = categories
        .iter()
        .flat_map(|category| category.missing_items.clone())
        .collect::<Vec<_>>();

    CompletenessReport {
        percentage,
        complete: missing_items.is_empty(),
        missing_items,
        categories,
    }
}

fn push_category(
    categories: &mut Vec<CompletenessCategory>,
    id: &str,
    label: &str,
    missing_items: Vec<Option<&str>>,
) {
    let missing_items = missing_items
        .into_iter()
        .flatten()
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    categories.push(CompletenessCategory {
        id: id.to_string(),
        label: label.to_string(),
        complete: missing_items.is_empty(),
        missing_items,
    });
}

fn missing(condition: bool, label: &'static str) -> Option<&'static str> {
    condition.then_some(label)
}

fn make_block(input: CondominiumBlockInput, _: &Condominium) -> Result<CondominiumBlock, ApiError> {
    validate_required(&input.name, "Nome do bloco")?;
    let mut item = CondominiumBlock {
        id: new_id(),
        name: clean(input.name.clone()),
        ..Default::default()
    };
    apply_block(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_block(
    item: &mut CondominiumBlock,
    input: CondominiumBlockInput,
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do bloco")?;
    item.name = clean(input.name);
    set_string(&mut item.code, input.code);
    set_string(&mut item.description, input.description);
    set_string(&mut item.specific_address, input.specific_address);
    set_string(&mut item.main_entry, input.main_entry);
    set_u16(&mut item.floors_count, input.floors_count);
    set_u16(&mut item.basements_count, input.basements_count);
    set_u16(&mut item.fractions_count, input.fractions_count);
    set_u16(&mut item.elevators_count, input.elevators_count);
    set_u16(&mut item.stairs_count, input.stairs_count);
    set_u16(&mut item.garages_count, input.garages_count);
    set_string(&mut item.operational_status, input.operational_status);
    set_string(&mut item.access_notes, input.access_notes);
    set_string(&mut item.internal_notes, input.internal_notes);
    set_bool(&mut item.archived, input.archived);
    Ok(())
}

fn make_floor(input: CondominiumFloorInput, _: &Condominium) -> Result<CondominiumFloor, ApiError> {
    validate_required(&input.name, "Nome do piso")?;
    validate_required(&input.number, "Numero do piso")?;
    let mut item = CondominiumFloor {
        id: new_id(),
        name: clean(input.name.clone()),
        number: clean(input.number.clone()),
        ..Default::default()
    };
    apply_floor(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_floor(
    item: &mut CondominiumFloor,
    input: CondominiumFloorInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do piso")?;
    validate_required(&input.number, "Numero do piso")?;
    set_string(&mut item.block_id, input.block_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    item.name = clean(input.name);
    item.number = clean(input.number);
    set_string(&mut item.floor_type, input.floor_type);
    set_string(&mut item.description, input.description);
    set_u16(&mut item.fractions_count, input.fractions_count);
    set_string(&mut item.operational_status, input.operational_status);
    set_string(&mut item.notes, input.notes);
    Ok(())
}

fn make_zone(
    input: CondominiumZoneInput,
    condominium: &Condominium,
) -> Result<CondominiumZone, ApiError> {
    validate_required(&input.name, "Nome da zona")?;
    let reference = input
        .qr_code_reference
        .clone()
        .unwrap_or_else(|| slugify(&format!("{} {}", condominium.name, input.name)));
    let mut item = CondominiumZone {
        id: new_id(),
        name: clean(input.name.clone()),
        qr_code_reference: reference.clone(),
        public_qr_url: build_zone_qr_url(&condominium.name, &reference, &input.name),
        ..Default::default()
    };
    apply_zone(&mut item, input, condominium)?;
    Ok(item)
}

fn apply_zone(
    item: &mut CondominiumZone,
    input: CondominiumZoneInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome da zona")?;
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    validate_floor_reference(condominium, &item.floor_id, "floorId")?;
    validate_floor_block_consistency(condominium, &item.floor_id, &item.block_id)?;
    item.name = clean(input.name);
    set_string(&mut item.zone_type, input.zone_type);
    set_string(&mut item.description, input.description);
    set_string(&mut item.operational_status, input.operational_status);
    set_string(&mut item.alert_level, input.alert_level);
    set_string(&mut item.qr_code_reference, input.qr_code_reference);
    set_string(&mut item.internal_location, input.internal_location);
    set_string(&mut item.access_notes, input.access_notes);
    set_string(&mut item.technical_notes, input.technical_notes);
    set_string(&mut item.image_url, input.image_url);
    set_string(&mut item.plan_url, input.plan_url);
    if item.qr_code_reference.trim().is_empty() {
        item.qr_code_reference = slugify(&format!("{} {}", condominium.name, item.name));
    }
    item.public_qr_url = build_zone_qr_url(&condominium.name, &item.qr_code_reference, &item.name);
    Ok(())
}

fn make_equipment(
    input: CondominiumEquipmentInput,
    _: &Condominium,
) -> Result<CondominiumEquipment, ApiError> {
    validate_required(&input.name, "Nome do equipamento")?;
    let mut item = CondominiumEquipment {
        id: new_id(),
        name: clean(input.name.clone()),
        ..Default::default()
    };
    apply_equipment(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_equipment(
    item: &mut CondominiumEquipment,
    input: CondominiumEquipmentInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do equipamento")?;
    item.name = clean(input.name);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    set_string(&mut item.zone_id, input.zone_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    validate_floor_reference(condominium, &item.floor_id, "floorId")?;
    validate_zone_reference(condominium, &item.zone_id, "zoneId")?;
    validate_floor_block_consistency(condominium, &item.floor_id, &item.block_id)?;
    validate_zone_consistency(condominium, &item.zone_id, &item.floor_id, &item.block_id)?;
    set_string(&mut item.equipment_type, input.equipment_type);
    set_string(&mut item.brand, input.brand);
    set_string(&mut item.model, input.model);
    set_string(&mut item.serial_number, input.serial_number);
    set_string(&mut item.internal_reference, input.internal_reference);
    set_string(&mut item.supplier, input.supplier);
    set_string(&mut item.maintenance_company, input.maintenance_company);
    set_string(&mut item.installation_date, input.installation_date);
    set_string(&mut item.last_maintenance_date, input.last_maintenance_date);
    set_string(&mut item.next_maintenance_date, input.next_maintenance_date);
    set_string(&mut item.maintenance_frequency, input.maintenance_frequency);
    set_string(&mut item.status, input.status);
    set_string(&mut item.criticality, input.criticality);
    set_string(&mut item.warranty_until, input.warranty_until);
    set_string(&mut item.contract_reference, input.contract_reference);
    set_string(&mut item.technical_notes, input.technical_notes);
    if let Some(document_ids) = input.document_ids {
        item.document_ids = document_ids;
    }
    if let Some(media_ids) = input.media_ids {
        item.media_ids = media_ids;
    }
    Ok(())
}

fn make_contact(
    input: CondominiumContactInput,
    _: &Condominium,
) -> Result<CondominiumContact, ApiError> {
    validate_required(&input.name, "Nome do contacto")?;
    let mut item = CondominiumContact {
        id: new_id(),
        name: clean(input.name.clone()),
        ..Default::default()
    };
    apply_contact(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_contact(
    item: &mut CondominiumContact,
    input: CondominiumContactInput,
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do contacto")?;
    item.name = clean(input.name);
    set_string(&mut item.contact_type, input.contact_type);
    set_string(&mut item.company, input.company);
    set_string(&mut item.role, input.role);
    set_string(&mut item.phone, input.phone);
    set_string(&mut item.alternate_phone, input.alternate_phone);
    set_string(&mut item.email, input.email);
    set_string(&mut item.schedule, input.schedule);
    set_string(&mut item.service, input.service);
    set_bool(&mut item.is_emergency, input.is_emergency);
    set_string(&mut item.priority, input.priority);
    set_bool(&mut item.favorite, input.favorite);
    set_string(&mut item.notes, input.notes);
    set_string(&mut item.contract_reference, input.contract_reference);
    Ok(())
}

fn make_document(
    input: CondominiumManagedDocumentInput,
    _: &Condominium,
) -> Result<CondominiumManagedDocument, ApiError> {
    validate_required(&input.title, "Titulo do documento")?;
    let now = Utc::now().to_rfc3339();
    let mut item = CondominiumManagedDocument {
        id: new_id(),
        title: clean(input.title.clone()),
        uploaded_at: now,
        ..Default::default()
    };
    apply_document(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_document(
    item: &mut CondominiumManagedDocument,
    input: CondominiumManagedDocumentInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.title, "Titulo do documento")?;
    item.title = clean(input.title);
    set_string(&mut item.document_type, input.document_type);
    set_string(&mut item.description, input.description);
    set_string(&mut item.file_name, input.file_name);
    set_string(&mut item.file_url, input.file_url);
    set_string(&mut item.mime_type, input.mime_type);
    set_u64(&mut item.size_bytes, input.size_bytes);
    set_string(&mut item.storage_key, input.storage_key);
    set_string(&mut item.download_url, input.download_url);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.zone_id, input.zone_id);
    set_string(&mut item.equipment_id, input.equipment_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    validate_zone_reference(condominium, &item.zone_id, "zoneId")?;
    validate_equipment_reference(condominium, &item.equipment_id, "equipmentId")?;
    set_string(&mut item.document_date, input.document_date);
    set_string(&mut item.expiry_date, input.expiry_date);
    set_string(&mut item.version, input.version);
    set_string(&mut item.status, input.status);
    set_string(&mut item.notes, input.notes);
    if item.uploaded_at.trim().is_empty() {
        item.uploaded_at = Utc::now().to_rfc3339();
    }
    Ok(())
}

fn make_media(input: CondominiumMediaInput, _: &Condominium) -> Result<CondominiumMedia, ApiError> {
    validate_required(&input.title, "Titulo da imagem/planta")?;
    let mut item = CondominiumMedia {
        id: new_id(),
        title: clean(input.title.clone()),
        created_at: Utc::now().to_rfc3339(),
        ..Default::default()
    };
    apply_media(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_media(
    item: &mut CondominiumMedia,
    input: CondominiumMediaInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.title, "Titulo da imagem/planta")?;
    item.title = clean(input.title);
    set_string(&mut item.media_type, input.media_type);
    set_string(&mut item.file_name, input.file_name);
    set_string(&mut item.file_url, input.file_url);
    set_string(&mut item.mime_type, input.mime_type);
    set_u64(&mut item.size_bytes, input.size_bytes);
    set_string(&mut item.storage_key, input.storage_key);
    set_string(&mut item.download_url, input.download_url);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    set_string(&mut item.zone_id, input.zone_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    validate_floor_reference(condominium, &item.floor_id, "floorId")?;
    validate_zone_reference(condominium, &item.zone_id, "zoneId")?;
    validate_floor_block_consistency(condominium, &item.floor_id, &item.block_id)?;
    validate_zone_consistency(condominium, &item.zone_id, &item.floor_id, &item.block_id)?;
    set_string(&mut item.description, input.description);
    set_bool(&mut item.is_primary, input.is_primary);
    Ok(())
}

fn make_note(
    input: CondominiumNoteInput,
    _: &Condominium,
) -> Result<CondominiumInternalNote, ApiError> {
    validate_required(&input.title, "Titulo da nota")?;
    validate_required(&input.content, "Conteudo da nota")?;
    let now = Utc::now().to_rfc3339();
    let mut item = CondominiumInternalNote {
        id: new_id(),
        title: clean(input.title.clone()),
        content: clean(input.content.clone()),
        created_at: now.clone(),
        updated_at: now,
        ..Default::default()
    };
    apply_note(&mut item, input, &Condominium::default())?;
    Ok(item)
}

fn apply_note(
    item: &mut CondominiumInternalNote,
    input: CondominiumNoteInput,
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.title, "Titulo da nota")?;
    validate_required(&input.content, "Conteudo da nota")?;
    item.title = clean(input.title);
    item.content = clean(input.content);
    set_string(&mut item.note_type, input.note_type);
    set_string(&mut item.visibility, input.visibility);
    set_string(&mut item.priority, input.priority);
    set_bool(&mut item.pinned, input.pinned);
    item.updated_at = Utc::now().to_rfc3339();
    Ok(())
}

fn make_plan_marker(
    input: CondominiumPlanMarkerInput,
    condominium: &Condominium,
) -> Result<CondominiumPlanMarker, ApiError> {
    validate_required(&input.label, "Etiqueta do marcador")?;
    let mut item = CondominiumPlanMarker {
        id: new_id(),
        label: clean(input.label.clone()),
        ..Default::default()
    };
    apply_plan_marker(&mut item, input, condominium)?;
    Ok(item)
}

fn apply_plan_marker(
    item: &mut CondominiumPlanMarker,
    input: CondominiumPlanMarkerInput,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.label, "Etiqueta do marcador")?;
    if !(0.0..=100.0).contains(&input.x_percent) || !(0.0..=100.0).contains(&input.y_percent) {
        return Err(ApiError::validation(
            "Marcador de planta exige coordenadas entre 0 e 100",
        ));
    }
    item.label = clean(input.label);
    set_string(&mut item.marker_type, input.marker_type);
    item.x_percent = input.x_percent;
    item.y_percent = input.y_percent;
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    set_string(&mut item.zone_id, input.zone_id);
    set_string(&mut item.equipment_id, input.equipment_id);
    validate_block_reference(condominium, &item.block_id, "blockId")?;
    validate_floor_reference(condominium, &item.floor_id, "floorId")?;
    validate_zone_reference(condominium, &item.zone_id, "zoneId")?;
    validate_equipment_reference(condominium, &item.equipment_id, "equipmentId")?;
    validate_floor_block_consistency(condominium, &item.floor_id, &item.block_id)?;
    validate_zone_consistency(condominium, &item.zone_id, &item.floor_id, &item.block_id)?;
    set_string(&mut item.notes, input.notes);
    Ok(())
}

fn build_import_preview(
    store: &AppStore,
    input: &ImportPreviewInput,
) -> Result<ImportPreview, ApiError> {
    let delimiter = input
        .delimiter
        .as_deref()
        .and_then(|value| value.chars().next())
        .unwrap_or(',');
    let rows = parse_csv_rows(&input.csv, delimiter)?;
    let previews = rows
        .into_iter()
        .enumerate()
        .map(|(index, values)| {
            let mut errors = validate_import_row(&values);
            if !values.internal_code.trim().is_empty()
                && store.condominiums.iter().any(|item| {
                    item.internal_code
                        .eq_ignore_ascii_case(values.internal_code.trim())
                })
            {
                errors.push("Codigo interno ja existe".to_string());
            }
            ImportRowPreview {
                row_number: index + 2,
                valid: errors.is_empty(),
                errors,
                values,
            }
        })
        .collect::<Vec<_>>();
    let valid_rows = previews.iter().filter(|row| row.valid).count();
    Ok(ImportPreview {
        total_rows: previews.len(),
        valid_rows,
        invalid_rows: previews.len().saturating_sub(valid_rows),
        rows: previews,
    })
}

fn parse_csv_rows(csv: &str, delimiter: char) -> Result<Vec<ImportRowInput>, ApiError> {
    let lines = csv
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return Err(ApiError::validation("CSV vazio"));
    }
    let headers = split_csv_line(lines[0], delimiter)
        .into_iter()
        .map(|header| normalize_header(&header))
        .collect::<Vec<_>>();
    if headers.is_empty() {
        return Err(ApiError::validation("CSV sem cabecalhos"));
    }

    Ok(lines
        .iter()
        .skip(1)
        .map(|line| {
            let cells = split_csv_line(line, delimiter);
            let value = |name: &str| -> String {
                headers
                    .iter()
                    .position(|header| header == name)
                    .and_then(|index| cells.get(index))
                    .cloned()
                    .unwrap_or_default()
            };
            ImportRowInput {
                name: value("nome"),
                internal_code: value("codigo_interno"),
                condominium_type: value("tipo"),
                status: value("estado"),
                street: value("rua"),
                number: value("numero"),
                postal_code: value("codigo_postal"),
                locality: value("localidade"),
                parish: value("freguesia"),
                municipality: value("concelho"),
                district: value("distrito"),
                country: value("pais"),
                total_fractions: value("total_fracoes").parse().unwrap_or(0),
                blocks_count: value("numero_blocos").parse().unwrap_or(0),
                elevators_count: value("numero_elevadores").parse().unwrap_or(0),
                manager: value("gestor_responsavel"),
                notes: value("notas"),
            }
        })
        .collect())
}

fn validate_import_row(row: &ImportRowInput) -> Vec<String> {
    let mut errors = Vec::new();
    if row.name.trim().is_empty() {
        errors.push("nome em falta".to_string());
    }
    if row.locality.trim().is_empty() {
        errors.push("localidade em falta".to_string());
    }
    if row.total_fractions == 0 {
        errors.push("total de fracoes invalido".to_string());
    }
    if row.status.trim().is_empty() {
        errors.push("estado em falta".to_string());
    }
    errors
}

fn preview_import_rows(store: &AppStore, rows: Vec<ImportRowInput>) -> ImportPreview {
    let previews = rows
        .into_iter()
        .enumerate()
        .map(|(index, values)| {
            let mut errors = validate_import_row(&values);
            if !values.internal_code.trim().is_empty()
                && store.condominiums.iter().any(|item| {
                    item.internal_code
                        .eq_ignore_ascii_case(values.internal_code.trim())
                })
            {
                errors.push("Codigo interno ja existe".to_string());
            }
            ImportRowPreview {
                row_number: index + 2,
                valid: errors.is_empty(),
                errors,
                values,
            }
        })
        .collect::<Vec<_>>();
    let valid_rows = previews.iter().filter(|row| row.valid).count();

    ImportPreview {
        total_rows: previews.len(),
        valid_rows,
        invalid_rows: previews.len().saturating_sub(valid_rows),
        rows: previews,
    }
}

#[derive(Debug)]
struct UploadedCondominiumFile {
    original_name: String,
    mime_type: String,
    bytes: Vec<u8>,
}

#[derive(Debug)]
struct ImportTable {
    headers: Vec<String>,
    rows: Vec<HashMap<String, String>>,
}

async fn read_multipart_upload(
    mut multipart: Multipart,
) -> Result<(HashMap<String, String>, UploadedCondominiumFile), ApiError> {
    let mut fields = HashMap::new();
    let mut uploaded_file = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| ApiError::validation(format!("Multipart invalido: {error}")))?
    {
        let name = field.name().unwrap_or_default().to_string();
        if let Some(file_name) = field.file_name().map(str::to_string) {
            let mime_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let bytes = field
                .bytes()
                .await
                .map_err(|error| ApiError::validation(format!("Ficheiro invalido: {error}")))?;
            if bytes.is_empty() {
                return Err(ApiError::validation("Seleciona um ficheiro"));
            }
            if bytes.len() > MAX_CONDOMINIUM_UPLOAD_BYTES {
                return Err(ApiError::validation("O ficheiro excede 10 MB"));
            }
            uploaded_file = Some(UploadedCondominiumFile {
                original_name: safe_file_name(&file_name),
                mime_type,
                bytes: bytes.to_vec(),
            });
        } else {
            let value = field
                .text()
                .await
                .map_err(|error| ApiError::validation(format!("Campo invalido: {error}")))?;
            fields.insert(name, value.trim().to_string());
        }
    }

    let uploaded_file =
        uploaded_file.ok_or_else(|| ApiError::validation("Seleciona um ficheiro"))?;
    Ok((fields, uploaded_file))
}

fn import_table_from_file(file: &UploadedCondominiumFile) -> Result<ImportTable, ApiError> {
    let lower_name = file.original_name.to_lowercase();
    if lower_name.ends_with(".xlsx") {
        return import_table_from_xlsx(&file.bytes);
    }

    let text = String::from_utf8(file.bytes.clone())
        .map_err(|_| ApiError::validation("Ficheiro CSV deve estar em UTF-8"))?;
    let delimiter = if text.lines().next().unwrap_or_default().contains(';') {
        ';'
    } else {
        ','
    };
    import_table_from_csv(&text, delimiter)
}

fn import_table_from_csv(csv: &str, delimiter: char) -> Result<ImportTable, ApiError> {
    let lines = csv
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return Err(ApiError::validation("Ficheiro de importacao vazio"));
    }
    let headers = split_csv_line(lines[0], delimiter);
    let normalized_headers = headers
        .iter()
        .map(|header| normalize_header(header))
        .collect::<Vec<_>>();
    let rows = lines
        .iter()
        .skip(1)
        .map(|line| {
            let cells = split_csv_line(line, delimiter);
            normalized_headers
                .iter()
                .enumerate()
                .map(|(index, header)| {
                    (
                        header.clone(),
                        cells.get(index).cloned().unwrap_or_default(),
                    )
                })
                .collect::<HashMap<_, _>>()
        })
        .collect::<Vec<_>>();

    Ok(ImportTable {
        headers: normalized_headers,
        rows,
    })
}

fn import_table_from_xlsx(bytes: &[u8]) -> Result<ImportTable, ApiError> {
    let cursor = Cursor::new(bytes.to_vec());
    let mut workbook =
        Xlsx::new(cursor).map_err(|_| ApiError::validation("Nao foi possivel ler o Excel"))?;
    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| ApiError::validation("Excel sem folhas"))?;
    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|_| ApiError::validation("Nao foi possivel ler a primeira folha do Excel"))?;
    let mut rows = range.rows();
    let headers = rows
        .next()
        .ok_or_else(|| ApiError::validation("Excel sem cabecalhos"))?
        .iter()
        .map(|cell| normalize_header(&cell.to_string()))
        .collect::<Vec<_>>();
    let data_rows = rows
        .filter(|row| row.iter().any(|cell| !cell.to_string().trim().is_empty()))
        .map(|row| {
            headers
                .iter()
                .enumerate()
                .map(|(index, header)| {
                    (
                        header.clone(),
                        row.get(index)
                            .map(|cell| cell.to_string())
                            .unwrap_or_default(),
                    )
                })
                .collect::<HashMap<_, _>>()
        })
        .collect::<Vec<_>>();

    Ok(ImportTable {
        headers,
        rows: data_rows,
    })
}

fn suggest_import_mapping(headers: &[String]) -> HashMap<String, String> {
    [
        ("name", &["nome", "condominio", "designacao"][..]),
        (
            "internalCode",
            &["codigo_interno", "codigo", "referencia"][..],
        ),
        ("condominiumType", &["tipo", "tipo_condominio"][..]),
        ("status", &["estado", "status"][..]),
        ("street", &["rua", "morada", "endereco"][..]),
        ("number", &["numero", "n_porta", "porta"][..]),
        ("postalCode", &["codigo_postal", "cp"][..]),
        ("locality", &["localidade", "cidade"][..]),
        ("parish", &["freguesia"][..]),
        ("municipality", &["concelho", "municipio"][..]),
        ("district", &["distrito"][..]),
        ("country", &["pais"][..]),
        ("totalFractions", &["total_fracoes", "fracoes"][..]),
        ("blocksCount", &["numero_blocos", "blocos"][..]),
        ("elevatorsCount", &["numero_elevadores", "elevadores"][..]),
        ("manager", &["gestor_responsavel", "gestor"][..]),
        ("notes", &["notas", "observacoes"][..]),
    ]
    .into_iter()
    .filter_map(|(target, candidates)| {
        candidates
            .iter()
            .find(|candidate| headers.iter().any(|header| header == **candidate))
            .map(|candidate| (target.to_string(), (*candidate).to_string()))
    })
    .collect()
}

fn row_to_import_input(
    row: &HashMap<String, String>,
    mapping: &HashMap<String, String>,
) -> ImportRowInput {
    let value = |target: &str| -> String {
        mapping
            .get(target)
            .and_then(|source| row.get(source))
            .cloned()
            .unwrap_or_default()
    };
    ImportRowInput {
        name: value("name"),
        internal_code: value("internalCode"),
        condominium_type: value("condominiumType"),
        status: value("status"),
        street: value("street"),
        number: value("number"),
        postal_code: value("postalCode"),
        locality: value("locality"),
        parish: value("parish"),
        municipality: value("municipality"),
        district: value("district"),
        country: value("country"),
        total_fractions: value("totalFractions").parse().unwrap_or(0),
        blocks_count: value("blocksCount").parse().unwrap_or(0),
        elevators_count: value("elevatorsCount").parse().unwrap_or(0),
        manager: value("manager"),
        notes: value("notes"),
    }
}

fn split_csv_line(line: &str, delimiter: char) -> Vec<String> {
    let mut values = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    for character in line.chars() {
        match character {
            '"' => quoted = !quoted,
            value if value == delimiter && !quoted => {
                values.push(current.trim().trim_matches('"').to_string());
                current.clear();
            }
            value => current.push(value),
        }
    }
    values.push(current.trim().trim_matches('"').to_string());
    values
}

fn normalize_header(header: &str) -> String {
    header
        .trim()
        .to_lowercase()
        .replace([' ', '-'], "_")
        .replace("ç", "c")
        .replace("ã", "a")
        .replace("õ", "o")
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
}

fn field_or_default(fields: &HashMap<String, String>, name: &str, fallback: &str) -> String {
    fields
        .get(name)
        .filter(|value| !value.trim().is_empty())
        .cloned()
        .unwrap_or_else(|| fallback.to_string())
}

fn field_bool(fields: &HashMap<String, String>, name: &str) -> bool {
    fields
        .get(name)
        .map(|value| {
            matches!(
                value.trim().to_lowercase().as_str(),
                "true" | "1" | "sim" | "on"
            )
        })
        .unwrap_or(false)
}

fn condominium_storage_key(condominium_id: &str, resource_id: &str, file_name: &str) -> String {
    format!(
        "condominiums/{}/{resource_id}-{}",
        safe_file_name(condominium_id),
        safe_file_name(file_name)
    )
}

async fn write_condominium_file(
    state: &AppState,
    tenant_id: &str,
    storage_key: &str,
    bytes: &[u8],
) -> Result<(), ApiError> {
    write_file_object(state, tenant_id, storage_key, bytes).await
}

async fn read_condominium_file_or_metadata(
    state: &AppState,
    tenant_id: &str,
    storage_key: &str,
    fallback: Vec<u8>,
) -> Result<Vec<u8>, ApiError> {
    if storage_key.trim().is_empty() {
        return Ok(fallback);
    }

    read_file_object(state, tenant_id, storage_key).await
}

fn binary_response(bytes: Vec<u8>, file_name: &str, mime_type: &str) -> Result<Response, ApiError> {
    let file_name = if file_name.trim().is_empty() {
        "gestisac-ficheiro.bin".to_string()
    } else {
        safe_file_name(file_name)
    };
    let mime_type = if mime_type.trim().is_empty() {
        "application/octet-stream"
    } else {
        mime_type
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{file_name}\""),
        )
        .body(Body::from(bytes))
        .map_err(|_| ApiError::internal("Nao foi possivel preparar o download"))
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
        "ficheiro.bin".to_string()
    } else {
        safe
    }
}

fn alerts_for(store: &AppStore, condominium: &Condominium) -> Vec<CondominiumAlert> {
    let mut alerts = Vec::new();
    let completeness = completeness_for(condominium);
    if !completeness.complete {
        alerts.push(CondominiumAlert {
            id: format!("{}-completeness", condominium.id),
            severity: "warning".to_string(),
            category: "completude".to_string(),
            title: "Ficha incompleta".to_string(),
            detail: completeness
                .missing_items
                .iter()
                .take(3)
                .cloned()
                .collect::<Vec<_>>()
                .join(", "),
            entity_id: condominium.id.clone(),
            due_date: None,
        });
    }

    let today = Utc::now().date_naive();
    for document in &condominium.managed_documents {
        if let Some(date) = parse_date(&document.expiry_date) {
            if date < today {
                alerts.push(alert(
                    "critical",
                    "documentos",
                    "Documento expirado",
                    &document.title,
                    &document.id,
                    Some(date),
                ));
            } else if date <= today + Duration::days(30) {
                alerts.push(alert(
                    "warning",
                    "documentos",
                    "Documento a expirar",
                    &document.title,
                    &document.id,
                    Some(date),
                ));
            }
        }
    }

    for zone in &condominium.zones {
        let status = zone.operational_status.to_lowercase();
        let alert_level = zone.alert_level.to_lowercase();
        if status.contains("interdit") || status.contains("crit") || alert_level.contains("vermel")
        {
            alerts.push(alert(
                "critical",
                "zonas",
                "Zona critica",
                &zone.name,
                &zone.id,
                None,
            ));
        }
    }

    for equipment in &condominium.equipment {
        let criticality = equipment.criticality.to_lowercase();
        let status = equipment.status.to_lowercase();
        if criticality.contains("alta") || criticality.contains("crit") || status.contains("avari")
        {
            alerts.push(alert(
                "critical",
                "equipamentos",
                "Equipamento critico",
                &equipment.name,
                &equipment.id,
                None,
            ));
        }
        if let Some(date) = parse_date(&equipment.next_maintenance_date) {
            if date < today {
                alerts.push(alert(
                    "warning",
                    "manutencao",
                    "Manutencao vencida",
                    &equipment.name,
                    &equipment.id,
                    Some(date),
                ));
            }
        }
    }

    for maintenance in &store.maintenance {
        if !maintenance
            .condominium
            .eq_ignore_ascii_case(&condominium.name)
        {
            continue;
        }
        let status = maintenance.status.to_lowercase();
        if status.contains("conclu") || status.contains("resolvid") {
            continue;
        }
        if let Some(date) = parse_date(&maintenance.date) {
            if date < today {
                alerts.push(alert(
                    "warning",
                    "manutencao",
                    "Intervencao vencida",
                    &maintenance.title,
                    &maintenance.id,
                    Some(date),
                ));
            }
        }
    }

    alerts
}

fn alert(
    severity: &str,
    category: &str,
    title: &str,
    detail: &str,
    entity_id: &str,
    due_date: Option<NaiveDate>,
) -> CondominiumAlert {
    CondominiumAlert {
        id: format!("{}-{}-{}", category, severity, entity_id),
        severity: severity.to_string(),
        category: category.to_string(),
        title: title.to_string(),
        detail: detail.to_string(),
        entity_id: entity_id.to_string(),
        due_date: due_date.map(|date| date.to_string()),
    }
}

fn parse_date(value: &str) -> Option<NaiveDate> {
    let date = value.trim().split('T').next().unwrap_or_default();
    NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()
}

fn visible_notes(
    user: &PublicUser,
    notes: &[CondominiumInternalNote],
) -> Vec<CondominiumInternalNote> {
    notes
        .iter()
        .filter(|note| can_see_note(user, note))
        .cloned()
        .collect()
}

fn can_see_note(user: &PublicUser, note: &CondominiumInternalNote) -> bool {
    let role = user.role.to_lowercase();
    let visibility = note.visibility.to_lowercase();
    role.contains("administrador")
        || visibility.is_empty()
        || visibility == "equipa"
        || (visibility == "gestao" && role.contains("gest"))
        || (visibility == "privada" && note.created_by.eq_ignore_ascii_case(&user.name))
}

fn qr_svg_for(value: &str) -> String {
    match QrCode::new(value.as_bytes()) {
        Ok(code) => code
            .render::<svg::Color>()
            .min_dimensions(220, 220)
            .dark_color(svg::Color("#111827"))
            .light_color(svg::Color("#ffffff"))
            .build(),
        Err(_) => "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"220\" height=\"220\"><rect width=\"220\" height=\"220\" fill=\"#fff\"/><text x=\"20\" y=\"110\" fill=\"#111827\">QR indisponivel</text></svg>".to_string(),
    }
}

fn compact_location(address: &CondominiumAddress) -> String {
    [
        address.street.as_str(),
        address.number.as_str(),
        address.locality.as_str(),
    ]
    .into_iter()
    .filter(|value| !value.trim().is_empty())
    .collect::<Vec<_>>()
    .join(", ")
}

fn build_zone_qr_url(condominium_name: &str, qr_reference: &str, zone_name: &str) -> String {
    format!(
        "/condomino/avarias?condominium={}&location={}&template={}",
        query_component(condominium_name),
        query_component(zone_name),
        query_component(qr_reference)
    )
}

fn query_component(value: &str) -> String {
    value
        .replace(' ', "+")
        .replace('&', "%26")
        .replace('#', "%23")
}

fn slugify(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn set_string(target: &mut String, value: Option<String>) {
    if let Some(value) = value {
        *target = clean(value);
    }
}

fn set_u16(target: &mut u16, value: Option<u16>) {
    if let Some(value) = value {
        *target = value;
    }
}

fn set_u64(target: &mut u64, value: Option<u64>) {
    if let Some(value) = value {
        *target = value;
    }
}

fn set_bool(target: &mut bool, value: Option<bool>) {
    if let Some(value) = value {
        *target = value;
    }
}

fn validate_required(value: &str, label: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::validation(format!("{label} e obrigatorio")));
    }
    Ok(())
}

fn validate_block_reference(
    condominium: &Condominium,
    block_id: &str,
    field: &str,
) -> Result<(), ApiError> {
    if block_id.trim().is_empty() {
        return Ok(());
    }
    if condominium
        .blocks_detailed
        .iter()
        .any(|block| block.id == block_id)
    {
        return Ok(());
    }
    Err(ApiError::validation(format!(
        "{field} invalido para este condominio"
    )))
}

fn validate_floor_reference(
    condominium: &Condominium,
    floor_id: &str,
    field: &str,
) -> Result<(), ApiError> {
    if floor_id.trim().is_empty() {
        return Ok(());
    }
    if condominium
        .floors_detailed
        .iter()
        .any(|floor| floor.id == floor_id)
    {
        return Ok(());
    }
    Err(ApiError::validation(format!(
        "{field} invalido para este condominio"
    )))
}

fn validate_zone_reference(
    condominium: &Condominium,
    zone_id: &str,
    field: &str,
) -> Result<(), ApiError> {
    if zone_id.trim().is_empty() {
        return Ok(());
    }
    if condominium.zones.iter().any(|zone| zone.id == zone_id) {
        return Ok(());
    }
    Err(ApiError::validation(format!(
        "{field} invalido para este condominio"
    )))
}

fn validate_equipment_reference(
    condominium: &Condominium,
    equipment_id: &str,
    field: &str,
) -> Result<(), ApiError> {
    if equipment_id.trim().is_empty() {
        return Ok(());
    }
    if condominium
        .equipment
        .iter()
        .any(|equipment| equipment.id == equipment_id)
    {
        return Ok(());
    }
    Err(ApiError::validation(format!(
        "{field} invalido para este condominio"
    )))
}

fn validate_floor_block_consistency(
    condominium: &Condominium,
    floor_id: &str,
    block_id: &str,
) -> Result<(), ApiError> {
    if floor_id.trim().is_empty() || block_id.trim().is_empty() {
        return Ok(());
    }
    let Some(floor) = condominium
        .floors_detailed
        .iter()
        .find(|floor| floor.id == floor_id)
    else {
        return Ok(());
    };
    if floor.block_id.trim().is_empty() || floor.block_id == block_id {
        return Ok(());
    }
    Err(ApiError::validation(
        "floorId e blockId nao pertencem a mesma estrutura",
    ))
}

fn validate_zone_consistency(
    condominium: &Condominium,
    zone_id: &str,
    floor_id: &str,
    block_id: &str,
) -> Result<(), ApiError> {
    if zone_id.trim().is_empty() {
        return Ok(());
    }
    let Some(zone) = condominium.zones.iter().find(|zone| zone.id == zone_id) else {
        return Ok(());
    };
    if !floor_id.trim().is_empty() && !zone.floor_id.trim().is_empty() && zone.floor_id != floor_id
    {
        return Err(ApiError::validation(
            "zoneId e floorId nao pertencem a mesma estrutura",
        ));
    }
    if !block_id.trim().is_empty() && !zone.block_id.trim().is_empty() && zone.block_id != block_id
    {
        return Err(ApiError::validation(
            "zoneId e blockId nao pertencem a mesma estrutura",
        ));
    }
    Ok(())
}

fn clean(value: impl Into<String>) -> String {
    value.into().trim().to_string()
}

fn snapshot<T: Serialize>(value: &T) -> String {
    serde_json::to_string(value).unwrap_or_default()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

fn default_page() -> usize {
    1
}

fn default_page_size() -> usize {
    50
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|error| ApiError::internal(format!("Falha ao persistir dados: {error}")))
}

async fn persist_condominium_upsert(
    state: &AppState,
    tenant_id: &str,
    condominium: &Condominium,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        repository
            .upsert_condominium(tenant_id, condominium)
            .await
            .map_err(|error| {
                ApiError::internal(format!(
                    "Falha ao persistir condominio na base de dados: {error}"
                ))
            })
    } else {
        persist(state).await
    }
}

async fn persist_condominium_delete(
    state: &AppState,
    tenant_id: &str,
    id: &str,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        repository
            .delete_condominium(tenant_id, id)
            .await
            .map_err(|error| {
                ApiError::internal(format!(
                    "Falha ao apagar condominio na base de dados: {error}"
                ))
            })
    } else {
        persist(state).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{demo::DemoData, store::Session};
    use crate::routes;
    use axum::http::{header::AUTHORIZATION, Method, Request, StatusCode};
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use tower::ServiceExt;

    async fn collect(res: axum::response::Response<Body>) -> (StatusCode, Vec<u8>) {
        let status = res.status();
        let body = res
            .into_body()
            .collect()
            .await
            .expect("response body should collect")
            .to_bytes()
            .to_vec();
        (status, body)
    }

    fn test_app_state() -> AppState {
        let demo: DemoData = serde_json::from_str(include_str!("../../../../mock/demo-data.json"))
            .expect("demo data should parse");
        let mut store = AppStore::seed_from_demo(&demo, "fake-hash".to_string());
        let user_id = store.users[0].id.clone();
        let tenant_id = store.tenants[0].id.clone();
        store.sessions.push(Session {
            user_id,
            tenant_id,
            token: "test-token-raw".to_string(),
            refresh_token: "test-refresh-token".to_string(),
            expires_at: chrono::Utc::now() + chrono::Duration::hours(24),
            created_at: chrono::Utc::now(),
            active_condominium: demo.active_condominium.clone(),
            app_context: "hq".to_string(),
            refresh_expires_at: chrono::Utc::now() + chrono::Duration::hours(48),
        });
        let tmp = std::env::temp_dir().join(format!("gestisac-test-{}.json", Uuid::new_v4()));

        AppState {
            config: crate::config::ApiConfig {
                host: std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST),
                port: 0,
                environment: "test".to_string(),
                jwt_secret: "gestisac-local-dev-session-secret".to_string(),
                data_path: tmp,
                document_storage_path: std::env::temp_dir().join("gestisac-test-docs"),
                document_storage_backend: crate::config::DocumentStorageBackend::Filesystem,
                cors_allowed_origins: vec![],
                database: None,
                allow_demo_seed: true,
            },
            store: Arc::new(RwLock::new(store)),
            postgres: None,
        }
    }

    fn app(state: AppState) -> axum::Router {
        routes::router(state)
    }

    #[test]
    fn completeness_reports_missing_operational_data() {
        let condominium = Condominium {
            name: "Teste".to_string(),
            ..Default::default()
        };

        let report = completeness_for(&condominium);

        assert!(!report.complete);
        assert!(report
            .missing_items
            .iter()
            .any(|item| item.contains("morada") || item.contains("rua")));
    }

    #[tokio::test]
    async fn failed_identification_update_does_not_mutate_store() {
        let state = test_app_state();
        let condominium = {
            let store = state.store.read().await;
            store
                .condominiums
                .first()
                .expect("demo should include condominiums")
                .clone()
        };
        let original_name = condominium.name.clone();
        let original_status = condominium.status.clone();

        let body = serde_json::json!({
            "name": "Nao deve ficar gravado",
            "status": "ativo"
        });
        let req = Request::builder()
            .method(Method::PUT)
            .uri(format!(
                "/api/condominiums/{}/identification",
                condominium.id
            ))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .expect("request should build");
        let (status, _body) = collect(app(state.clone()).oneshot(req).await.unwrap()).await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        let store = state.store.read().await;
        let current = store
            .condominiums
            .iter()
            .find(|item| item.id == condominium.id)
            .expect("condominium should still exist");
        assert_eq!(current.name, original_name);
        assert_eq!(current.status, original_status);
    }

    #[test]
    fn import_preview_reads_basic_csv() {
        let rows = parse_csv_rows(
            "nome,codigo_interno,tipo,estado,localidade,total_fracoes\nCondominio A,A1,residencial,ativo,Lisboa,10",
            ',',
        )
        .expect("csv should parse");

        assert_eq!(rows.len(), 1);
        assert!(validate_import_row(&rows[0]).is_empty());
    }

    #[test]
    fn equipment_validation_rejects_inconsistent_zone_floor() {
        let condominium = Condominium {
            blocks_detailed: vec![CondominiumBlock {
                id: "block-a".to_string(),
                ..Default::default()
            }],
            floors_detailed: vec![CondominiumFloor {
                id: "floor-1".to_string(),
                block_id: "block-a".to_string(),
                ..Default::default()
            }],
            zones: vec![CondominiumZone {
                id: "zone-1".to_string(),
                block_id: "block-a".to_string(),
                floor_id: "floor-1".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        let mut equipment = CondominiumEquipment {
            id: "equip-1".to_string(),
            name: "Bomba".to_string(),
            ..Default::default()
        };

        let result = apply_equipment(
            &mut equipment,
            CondominiumEquipmentInput {
                block_id: Some("block-a".to_string()),
                floor_id: Some("floor-other".to_string()),
                zone_id: Some("zone-1".to_string()),
                name: "Bomba".to_string(),
                equipment_type: None,
                brand: None,
                model: None,
                serial_number: None,
                internal_reference: None,
                supplier: None,
                maintenance_company: None,
                installation_date: None,
                last_maintenance_date: None,
                next_maintenance_date: None,
                maintenance_frequency: None,
                status: None,
                criticality: None,
                warranty_until: None,
                contract_reference: None,
                technical_notes: None,
                document_ids: None,
                media_ids: None,
            },
            &condominium,
        );

        assert!(result.is_err());
    }

    #[test]
    fn zone_validation_accepts_matching_floor_and_block() {
        let condominium = Condominium {
            blocks_detailed: vec![CondominiumBlock {
                id: "block-a".to_string(),
                ..Default::default()
            }],
            floors_detailed: vec![CondominiumFloor {
                id: "floor-1".to_string(),
                block_id: "block-a".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        let mut zone = CondominiumZone {
            id: "zone-1".to_string(),
            name: "Hall".to_string(),
            ..Default::default()
        };

        let result = apply_zone(
            &mut zone,
            CondominiumZoneInput {
                block_id: Some("block-a".to_string()),
                floor_id: Some("floor-1".to_string()),
                name: "Hall".to_string(),
                zone_type: None,
                description: None,
                operational_status: None,
                alert_level: None,
                qr_code_reference: None,
                internal_location: None,
                access_notes: None,
                technical_notes: None,
                image_url: None,
                plan_url: None,
            },
            &condominium,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn mapped_import_preview_uses_selected_columns() {
        let mut row = HashMap::new();
        row.insert("edificio".to_string(), "Torre Norte".to_string());
        row.insert("local".to_string(), "Porto".to_string());
        row.insert("fracoes".to_string(), "18".to_string());
        row.insert("estado".to_string(), "ativo".to_string());
        let mapping = HashMap::from([
            ("name".to_string(), "edificio".to_string()),
            ("locality".to_string(), "local".to_string()),
            ("totalFractions".to_string(), "fracoes".to_string()),
            ("status".to_string(), "estado".to_string()),
        ]);

        let input = row_to_import_input(&row, &mapping);

        assert_eq!(input.name, "Torre Norte");
        assert_eq!(input.locality, "Porto");
        assert_eq!(input.total_fractions, 18);
        assert!(validate_import_row(&input).is_empty());
    }

    #[test]
    fn alerts_include_expired_documents_and_incomplete_profile() {
        let condominium = Condominium {
            id: "condo-1".to_string(),
            managed_documents: vec![CondominiumManagedDocument {
                id: "doc-1".to_string(),
                title: "Seguro".to_string(),
                expiry_date: "2020-01-01".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };
        let store = AppStore::default();

        let alerts = alerts_for(&store, &condominium);

        assert!(alerts.iter().any(|alert| alert.category == "documentos"));
        assert!(alerts.iter().any(|alert| alert.category == "completude"));
    }

    #[test]
    fn note_visibility_limits_private_notes_to_author_or_admin() {
        let note = CondominiumInternalNote {
            id: "note-1".to_string(),
            visibility: "privada".to_string(),
            created_by: "Ana".to_string(),
            ..Default::default()
        };
        let operator = PublicUser {
            id: "user-1".to_string(),
            tenant_id: "demo".to_string(),
            name: "Bruno".to_string(),
            email: "bruno@example.test".to_string(),
            role: "Operador".to_string(),
            active_condominium: String::new(),
            active_condominiums: 1,
        };
        let admin = PublicUser {
            role: "Administrador".to_string(),
            ..operator.clone()
        };

        assert!(!can_see_note(&operator, &note));
        assert!(can_see_note(&admin, &note));
    }

    #[test]
    fn qr_svg_generation_returns_svg_markup() {
        let svg = qr_svg_for("/condomino/avarias?zona=hall");

        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
    }
}
