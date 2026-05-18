use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{
            AppStore, Condominium, CondominiumAddress, CondominiumBlock, CondominiumContact,
            CondominiumEquipment, CondominiumFloor, CondominiumHistoryEvent,
            CondominiumInternalNote, CondominiumManagedDocument, CondominiumMedia,
            CondominiumOnboardingDraft, CondominiumOperationalStatus, CondominiumStructure,
            CondominiumZone,
        },
    },
    routes::auth::{current_user, require_delete, require_write},
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

pub async fn condominiums(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<CondominiumListParams>,
) -> Result<Json<Paginated<Condominium>>, ApiError> {
    current_user(&headers, &state).await?;
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
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;

    Ok(Json(CondominiumDetailResponse {
        completeness: completeness_for(&condominium),
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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn archive_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn update_identification(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumIdentificationInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    if let Some(code) = input.internal_code.as_deref() {
        validate_unique_internal_code(&store, &id, code)?;
    }
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    if let Some(value) = input.name {
        validate_required(&value, "Nome do condominio")?;
        item.name = clean(value);
    }
    set_string(&mut item.internal_code, input.internal_code);
    set_string(&mut item.external_reference, input.external_reference);
    set_string(&mut item.condominium_type, input.condominium_type);
    set_string(&mut item.subtype, input.subtype);
    set_string(&mut item.status, input.status);
    set_string(&mut item.management_start_date, input.management_start_date);
    set_string(&mut item.management_end_date, input.management_end_date);
    set_string(&mut item.manager, input.manager);
    set_string(&mut item.team, input.team);
    set_string(&mut item.management_company, input.management_company);
    set_string(&mut item.short_description, input.short_description);
    set_string(&mut item.administrative_notes, input.administrative_notes);
    if let Some(tags) = input.tags {
        item.tags = tags
            .into_iter()
            .map(clean)
            .filter(|tag| !tag.is_empty())
            .collect();
    }
    item.ensure_profile_defaults();
    validate_active_ready(item)?;
    item.push_history(
        "identification-updated",
        "Identificacao alterada",
        user.name,
        "identification",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_address(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumAddressInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    let address = &mut item.address;
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
    item.location = compact_location(&item.address);
    item.ensure_profile_defaults();
    validate_active_ready(item)?;
    item.push_history(
        "address-updated",
        "Morada alterada",
        user.name,
        "address",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_structure(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumStructureInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let before = snapshot(item);
    let structure = &mut item.structure;
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
    item.fractions = item.structure.total_fractions;
    item.buildings = item.structure.blocks_count;
    item.ensure_profile_defaults();
    validate_active_ready(item)?;
    item.push_history(
        "structure-updated",
        "Estrutura fisica alterada",
        user.name,
        "structure",
        before,
        snapshot(item),
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_operational_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumOperationalStatusInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
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
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn save_condominium_draft(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumDraftInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
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
    persist(&state).await?;
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
    persist(&state).await?;

    Ok(Json(ImportReport {
        created: created.len(),
        skipped,
        errors,
        condominiums: created,
    }))
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
            drop(store);
            persist(&state).await?;
            Ok(Json(resource))
        }

        pub async fn $update_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path((id, resource_id)): Path<(String, String)>,
            Json(input): Json<$input>,
        ) -> Result<Json<$model>, ApiError> {
            let user = require_write(&headers, &state, "condominiums").await?;
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
            drop(store);
            persist(&state).await?;
            Ok(Json(response))
        }

        pub async fn $delete_fn(
            State(state): State<AppState>,
            headers: HeaderMap,
            Path((id, resource_id)): Path<(String, String)>,
        ) -> Result<Json<Vec<$model>>, ApiError> {
            let user = require_delete(&headers, &state, "condominiums").await?;
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
            drop(store);
            persist(&state).await?;
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
    condominium_notes,
    create_condominium_note,
    update_condominium_note,
    delete_condominium_note,
    CondominiumNoteInput,
    CondominiumInternalNote,
    internal_notes_registry,
    make_note,
    apply_note,
    "note-created",
    "note-updated",
    "note-deleted",
    "nota"
);

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
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do piso")?;
    validate_required(&input.number, "Numero do piso")?;
    set_string(&mut item.block_id, input.block_id);
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
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.name, "Nome do equipamento")?;
    item.name = clean(input.name);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    set_string(&mut item.zone_id, input.zone_id);
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
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.title, "Titulo do documento")?;
    item.title = clean(input.title);
    set_string(&mut item.document_type, input.document_type);
    set_string(&mut item.description, input.description);
    set_string(&mut item.file_name, input.file_name);
    set_string(&mut item.file_url, input.file_url);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.zone_id, input.zone_id);
    set_string(&mut item.equipment_id, input.equipment_id);
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
    _: &Condominium,
) -> Result<(), ApiError> {
    validate_required(&input.title, "Titulo da imagem/planta")?;
    item.title = clean(input.title);
    set_string(&mut item.media_type, input.media_type);
    set_string(&mut item.file_name, input.file_name);
    set_string(&mut item.file_url, input.file_url);
    set_string(&mut item.block_id, input.block_id);
    set_string(&mut item.floor_id, input.floor_id);
    set_string(&mut item.zone_id, input.zone_id);
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
