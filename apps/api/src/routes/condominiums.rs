use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{
            AppStore, Condominium, CondominiumAddress, CondominiumBlock, CondominiumContact,
            CondominiumEquipment, CondominiumFloor, CondominiumHistoryEvent,
            CondominiumInternalNote, CondominiumManagedDocument, CondominiumMedia,
            CondominiumOnboardingDraft, CondominiumOperationalStatus, CondominiumStructure,
            CondominiumZone, Document,
        },
    },
    routes::auth::{current_user, require_delete, require_write},
    state::AppState,
};
use axum::{
    extract::multipart::Field,
    extract::{Multipart, Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const MAX_CONDOMINIUM_FILE_BYTES: usize = 10 * 1024 * 1024;

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
pub struct CondominiumInput {
    pub name: String,
    pub location: String,
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
pub struct DeleteCondominiumParams {
    #[serde(default)]
    pub force: bool,
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
    pub completed_categories: usize,
    pub total_categories: usize,
    pub missing_items: Vec<String>,
    pub categories: Vec<CompletenessCategory>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletenessCategory {
    pub id: String,
    pub label: String,
    pub complete: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewResponse {
    pub headers: Vec<String>,
    pub rows: Vec<ImportRowPreview>,
    pub valid_rows: usize,
    pub total_rows: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRowPreview {
    pub row: usize,
    pub values: ImportRowInput,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitResponse {
    pub created: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

pub async fn condominiums(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<CondominiumListParams>,
) -> Result<Json<Paginated<Condominium>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;

    let filtered: Vec<Condominium> = store
        .condominiums
        .iter()
        .filter(|item| params.include_archived || !item.archived)
        .filter(|item| {
            params.status.is_empty() || item.status.eq_ignore_ascii_case(params.status.trim())
        })
        .filter(|item| {
            params.condominium_type.is_empty()
                || item
                    .condominium_type
                    .eq_ignore_ascii_case(params.condominium_type.trim())
        })
        .filter(|item| {
            params.locality.is_empty()
                || item
                    .address
                    .locality
                    .eq_ignore_ascii_case(params.locality.trim())
        })
        .filter(|item| {
            params.manager.is_empty() || item.manager.eq_ignore_ascii_case(params.manager.trim())
        })
        .filter(|item| {
            params.operational_status.is_empty()
                || item
                    .operational_status
                    .general_status
                    .eq_ignore_ascii_case(params.operational_status.trim())
        })
        .filter(|item| {
            if !params.incomplete {
                return true;
            }
            let completeness = build_completeness_report(item);
            completeness.percentage < 100
        })
        .filter(|item| match params.has_plant {
            Some(true) => item
                .media
                .iter()
                .any(|media| media.media_type.eq_ignore_ascii_case("planta")),
            Some(false) => item
                .media
                .iter()
                .all(|media| !media.media_type.eq_ignore_ascii_case("planta")),
            None => true,
        })
        .filter(|item| match params.has_equipment {
            Some(true) => !item.equipment.is_empty(),
            Some(false) => item.equipment.is_empty(),
            None => true,
        })
        .cloned()
        .collect();

    let pagination = PaginationParams {
        page: params.page,
        page_size: params.page_size,
        search: params.search,
    };
    Ok(Json(paginate(&filtered, &pagination)))
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
    let completeness = build_completeness_report(&condominium);

    Ok(Json(CondominiumDetailResponse {
        condominium,
        completeness,
    }))
}

pub async fn create_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    validate_required(&input.location, "Localidade")?;

    let internal_code = input.internal_code.unwrap_or_default().trim().to_string();

    let mut store = state.store.write().await;
    if !internal_code.is_empty()
        && store
            .condominiums
            .iter()
            .any(|item| item.internal_code.eq_ignore_ascii_case(&internal_code))
    {
        return Err(ApiError::validation("Codigo interno ja existe"));
    }

    let now = Utc::now().to_rfc3339();
    let mut condominium = Condominium {
        id: Uuid::new_v4().to_string(),
        name: input.name.trim().to_string(),
        location: input.location.trim().to_string(),
        buildings: input.buildings.unwrap_or(1),
        fractions: input.fractions.unwrap_or(0),
        residents: input.residents.unwrap_or(0),
        status: input.status.unwrap_or_else(|| "em onboarding".to_string()),
        notice: input
            .notice
            .unwrap_or_else(|| "Ficha de condominio em preenchimento".to_string()),
        internal_code,
        external_reference: String::new(),
        condominium_type: input
            .condominium_type
            .unwrap_or_else(|| "residencial".to_string()),
        subtype: String::new(),
        management_start_date: String::new(),
        management_end_date: String::new(),
        manager: input.manager.unwrap_or_else(|| user.name.clone()),
        team: String::new(),
        management_company: "GESTISAC".to_string(),
        short_description: String::new(),
        administrative_notes: String::new(),
        tags: Vec::new(),
        archived: false,
        archived_at: None,
        address: CondominiumAddress {
            locality: input.location.trim().to_string(),
            country: "Portugal".to_string(),
            ..Default::default()
        },
        structure: CondominiumStructure {
            total_fractions: input.fractions.unwrap_or(0),
            blocks_count: input.buildings.unwrap_or(1),
            ..Default::default()
        },
        operational_status: CondominiumOperationalStatus {
            general_status: "normal".to_string(),
            alert_level: "verde".to_string(),
            summary: "Condominio criado".to_string(),
            reason: String::new(),
            updated_by: user.name.clone(),
            updated_at: now.clone(),
        },
        primary_image_url: String::new(),
        blocks_detailed: Vec::new(),
        floors_detailed: Vec::new(),
        zones: Vec::new(),
        equipment: Vec::new(),
        contacts: Vec::new(),
        managed_documents: Vec::new(),
        media: Vec::new(),
        internal_notes_registry: Vec::new(),
        history: Vec::new(),
        onboarding_draft: Some(CondominiumOnboardingDraft {
            current_step: 1,
            completed_steps: Vec::new(),
            is_quick_mode: false,
            saved_at: now.clone(),
        }),
        created_at: now.clone(),
        updated_at: now,
    };
    condominium.ensure_profile_defaults();
    validate_active_requirements(&condominium)?;
    condominium.push_history(
        "created",
        format!("Condominio {} criado", condominium.name),
        user.name.clone(),
        "condominium",
        String::new(),
        "created".to_string(),
        "api",
    );

    let response = condominium.clone();
    store.condominiums.insert(0, condominium);
    store.add_audit(
        &user,
        "condominiums",
        "create",
        &response.id,
        format!("Condominio {} criado", response.name),
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn create_condominium_quick(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    create_condominium(State(state), headers, Json(input)).await
}

pub async fn update_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do condominio")?;
    validate_required(&input.location, "Localidade")?;

    let mut store = state.store.write().await;
    if let Some(internal_code) = input.internal_code.as_deref() {
        let internal_code = internal_code.trim();
        if !internal_code.is_empty()
            && store
                .condominiums
                .iter()
                .any(|item| item.id != id && item.internal_code.eq_ignore_ascii_case(internal_code))
        {
            return Err(ApiError::validation("Codigo interno ja existe"));
        }
    }

    let item = find_condominium_mut(&mut store, &id)?;
    let old_name = item.name.clone();
    item.name = input.name.trim().to_string();
    item.location = input.location.trim().to_string();
    item.buildings = input.buildings.unwrap_or(item.buildings);
    item.fractions = input.fractions.unwrap_or(item.fractions);
    item.residents = input.residents.unwrap_or(item.residents);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    item.notice = input.notice.unwrap_or_else(|| item.notice.clone());
    if let Some(code) = input.internal_code {
        item.internal_code = code.trim().to_string();
    }
    if let Some(manager) = input.manager {
        item.manager = manager;
    }
    if let Some(condominium_type) = input.condominium_type {
        item.condominium_type = condominium_type;
    }
    item.address.locality = item.location.clone();
    item.structure.blocks_count = item.buildings;
    item.structure.total_fractions = item.fractions;
    item.ensure_profile_defaults();
    validate_active_requirements(item)?;
    item.push_history(
        "updated",
        format!("Condominio {} atualizado", item.name),
        user.name.clone(),
        "condominium",
        old_name,
        item.name.clone(),
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

pub async fn delete_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(params): Query<DeleteCondominiumParams>,
) -> Result<Json<Vec<Condominium>>, ApiError> {
    let user = require_delete(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let Some(existing) = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .cloned()
    else {
        return Err(ApiError::not_found("Condominio nao encontrado"));
    };

    if !params.force && !existing.archived {
        return Err(ApiError::validation(
            "Acao protegida: arquiva o condominio antes de apagar",
        ));
    }

    if !params.force
        && (!existing.blocks_detailed.is_empty()
            || !existing.floors_detailed.is_empty()
            || !existing.zones.is_empty()
            || !existing.equipment.is_empty())
    {
        return Err(ApiError::validation(
            "Condominio com dados operacionais. Usa force=true para apagar definitivamente.",
        ));
    }

    let original_len = store.condominiums.len();
    store.condominiums.retain(|item| item.id != id);
    if store.condominiums.len() == original_len {
        return Err(ApiError::not_found("Condominio nao encontrado"));
    }

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

pub async fn archive_condominium(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    item.archived = true;
    item.archived_at = Some(Utc::now().to_rfc3339());
    item.status = "arquivo".to_string();
    item.push_history(
        "archived",
        "Condominio arquivado",
        user.name.clone(),
        "condominium",
        String::new(),
        "arquivo".to_string(),
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

pub async fn update_condominium_identification(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumIdentificationInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;

    if let Some(code) = input.internal_code.as_deref() {
        let normalized = code.trim();
        if !normalized.is_empty()
            && store
                .condominiums
                .iter()
                .any(|item| item.id != id && item.internal_code.eq_ignore_ascii_case(normalized))
        {
            return Err(ApiError::validation("Codigo interno ja existe"));
        }
    }

    let item = find_condominium_mut(&mut store, &id)?;
    let previous = serde_json::to_string(&item).unwrap_or_default();
    if let Some(name) = input.name {
        validate_required(&name, "Nome do condominio")?;
        item.name = name.trim().to_string();
    }
    if let Some(internal_code) = input.internal_code {
        item.internal_code = internal_code.trim().to_string();
    }
    if let Some(external_reference) = input.external_reference {
        item.external_reference = external_reference;
    }
    if let Some(condominium_type) = input.condominium_type {
        item.condominium_type = condominium_type;
    }
    if let Some(subtype) = input.subtype {
        item.subtype = subtype;
    }
    if let Some(status) = input.status {
        item.status = status;
    }
    if let Some(management_start_date) = input.management_start_date {
        item.management_start_date = management_start_date;
    }
    if let Some(management_end_date) = input.management_end_date {
        item.management_end_date = management_end_date;
    }
    if let Some(manager) = input.manager {
        item.manager = manager;
    }
    if let Some(team) = input.team {
        item.team = team;
    }
    if let Some(management_company) = input.management_company {
        item.management_company = management_company;
    }
    if let Some(short_description) = input.short_description {
        item.short_description = short_description;
    }
    if let Some(administrative_notes) = input.administrative_notes {
        item.administrative_notes = administrative_notes;
    }
    if let Some(tags) = input.tags {
        item.tags = tags;
    }
    item.ensure_profile_defaults();
    validate_active_requirements(item)?;
    let current = serde_json::to_string(&item).unwrap_or_default();
    item.push_history(
        "identification-updated",
        "Identificacao do condominio atualizada",
        user.name.clone(),
        "identification",
        previous,
        current,
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_address(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumAddressInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let previous = serde_json::to_string(&item.address).unwrap_or_default();
    if let Some(street) = input.street {
        item.address.street = street;
    }
    if let Some(number) = input.number {
        item.address.number = number;
    }
    if let Some(lot) = input.lot {
        item.address.lot = lot;
    }
    if let Some(address_block) = input.address_block {
        item.address.address_block = address_block;
    }
    if let Some(postal_code) = input.postal_code {
        item.address.postal_code = postal_code;
    }
    if let Some(locality) = input.locality {
        item.address.locality = locality.clone();
        item.location = locality;
    }
    if let Some(parish) = input.parish {
        item.address.parish = parish;
    }
    if let Some(municipality) = input.municipality {
        item.address.municipality = municipality;
    }
    if let Some(district) = input.district {
        item.address.district = district;
    }
    if let Some(country) = input.country {
        item.address.country = country;
    }
    if input.latitude.is_some() {
        item.address.latitude = input.latitude;
    }
    if input.longitude.is_some() {
        item.address.longitude = input.longitude;
    }
    if let Some(google_maps_url) = input.google_maps_url {
        item.address.google_maps_url = google_maps_url;
    }
    if let Some(apple_maps_url) = input.apple_maps_url {
        item.address.apple_maps_url = apple_maps_url;
    }
    if let Some(access_notes) = input.access_notes {
        item.address.access_notes = access_notes;
    }
    if let Some(main_entry_point) = input.main_entry_point {
        item.address.main_entry_point = main_entry_point;
    }
    if let Some(technical_entry_point) = input.technical_entry_point {
        item.address.technical_entry_point = technical_entry_point;
    }
    if let Some(garage_entry_point) = input.garage_entry_point {
        item.address.garage_entry_point = garage_entry_point;
    }
    if let Some(access_restrictions) = input.access_restrictions {
        item.address.access_restrictions = access_restrictions;
    }
    if let Some(visual_reference) = input.visual_reference {
        item.address.visual_reference = visual_reference;
    }
    item.ensure_profile_defaults();
    validate_active_requirements(item)?;
    let current = serde_json::to_string(&item.address).unwrap_or_default();
    item.push_history(
        "address-updated",
        "Morada e localizacao atualizadas",
        user.name.clone(),
        "address",
        previous,
        current,
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_structure(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumStructureInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let previous = serde_json::to_string(&item.structure).unwrap_or_default();
    if let Some(value) = input.total_fractions {
        item.structure.total_fractions = value;
        item.fractions = value;
    }
    if let Some(value) = input.residential_fractions {
        item.structure.residential_fractions = value;
    }
    if let Some(value) = input.commercial_fractions {
        item.structure.commercial_fractions = value;
    }
    if let Some(value) = input.garages_count {
        item.structure.garages_count = value;
    }
    if let Some(value) = input.storage_units_count {
        item.structure.storage_units_count = value;
    }
    if let Some(value) = input.shops_count {
        item.structure.shops_count = value;
    }
    if let Some(value) = input.blocks_count {
        item.structure.blocks_count = value;
        item.buildings = value;
    }
    if let Some(value) = input.entrances_count {
        item.structure.entrances_count = value;
    }
    if let Some(value) = input.floors_above_ground {
        item.structure.floors_above_ground = value;
    }
    if let Some(value) = input.basements_count {
        item.structure.basements_count = value;
    }
    if let Some(value) = input.technical_floors_count {
        item.structure.technical_floors_count = value;
    }
    if let Some(value) = input.elevators_count {
        item.structure.elevators_count = value;
    }
    if let Some(value) = input.stairs_count {
        item.structure.stairs_count = value;
    }
    if let Some(value) = input.parking_spaces_count {
        item.structure.parking_spaces_count = value;
    }
    if let Some(value) = input.has_garden {
        item.structure.has_garden = value;
    }
    if let Some(value) = input.has_pool {
        item.structure.has_pool = value;
    }
    if let Some(value) = input.has_condominium_room {
        item.structure.has_condominium_room = value;
    }
    if let Some(value) = input.has_trash_house {
        item.structure.has_trash_house = value;
    }
    if let Some(value) = input.has_accessible_roof {
        item.structure.has_accessible_roof = value;
    }
    if let Some(value) = input.has_technical_roof {
        item.structure.has_technical_roof = value;
    }
    if let Some(value) = input.has_solar_panels {
        item.structure.has_solar_panels = value;
    }
    if let Some(value) = input.has_cctv {
        item.structure.has_cctv = value;
    }
    if let Some(value) = input.has_porter_desk {
        item.structure.has_porter_desk = value;
    }
    if let Some(value) = input.has_doorman {
        item.structure.has_doorman = value;
    }
    if let Some(value) = input.has_security {
        item.structure.has_security = value;
    }
    if input.construction_year.is_some() {
        item.structure.construction_year = input.construction_year;
    }
    if input.last_renovation_year.is_some() {
        item.structure.last_renovation_year = input.last_renovation_year;
    }
    if let Some(common_area_estimate) = input.common_area_estimate {
        item.structure.common_area_estimate = common_area_estimate;
    }
    if let Some(structural_notes) = input.structural_notes {
        item.structure.structural_notes = structural_notes;
    }
    item.ensure_profile_defaults();
    validate_active_requirements(item)?;
    let current = serde_json::to_string(&item.structure).unwrap_or_default();
    item.push_history(
        "structure-updated",
        "Estrutura fisica atualizada",
        user.name.clone(),
        "structure",
        previous,
        current,
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_operational_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumOperationalStatusInput>,
) -> Result<Json<Condominium>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let previous = serde_json::to_string(&item.operational_status).unwrap_or_default();
    if let Some(general_status) = input.general_status {
        item.operational_status.general_status = general_status;
    }
    if let Some(alert_level) = input.alert_level {
        item.operational_status.alert_level = alert_level;
    }
    if let Some(summary) = input.summary {
        item.operational_status.summary = summary;
    }
    if let Some(reason) = input.reason {
        item.operational_status.reason = reason;
    }
    item.operational_status.updated_by = user.name.clone();
    item.operational_status.updated_at = Utc::now().to_rfc3339();
    item.notice = item.operational_status.summary.clone();
    let current = serde_json::to_string(&item.operational_status).unwrap_or_default();
    item.push_history(
        "operational-status-updated",
        "Estado operacional atualizado",
        user.name.clone(),
        "operational-status",
        previous,
        current,
        "api",
    );
    let response = item.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn condominium_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<CondominiumHistoryEvent>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(paginate(&item.history, &params)))
}

pub async fn condominium_completeness(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<CompletenessReport>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(build_completeness_report(item)))
}

pub async fn list_condominium_blocks(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumBlock>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.blocks_detailed.clone()))
}

pub async fn create_condominium_block(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumBlockInput>,
) -> Result<Json<CondominiumBlock>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do bloco")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let block = CondominiumBlock {
        id: Uuid::new_v4().to_string(),
        name: input.name.trim().to_string(),
        code: input.code.unwrap_or_default(),
        description: input.description.unwrap_or_default(),
        specific_address: input.specific_address.unwrap_or_default(),
        main_entry: input.main_entry.unwrap_or_default(),
        floors_count: input.floors_count.unwrap_or(0),
        basements_count: input.basements_count.unwrap_or(0),
        fractions_count: input.fractions_count.unwrap_or(0),
        elevators_count: input.elevators_count.unwrap_or(0),
        stairs_count: input.stairs_count.unwrap_or(0),
        garages_count: input.garages_count.unwrap_or(0),
        operational_status: input
            .operational_status
            .unwrap_or_else(|| "operacional".to_string()),
        access_notes: input.access_notes.unwrap_or_default(),
        internal_notes: input.internal_notes.unwrap_or_default(),
        archived: input.archived.unwrap_or(false),
    };
    item.blocks_detailed.push(block.clone());
    item.structure.blocks_count = u16::try_from(item.blocks_detailed.len()).unwrap_or(u16::MAX);
    item.buildings = item.structure.blocks_count;
    item.push_history(
        "block-created",
        format!("Bloco {} adicionado", block.name),
        user.name.clone(),
        "block",
        String::new(),
        serde_json::to_string(&block).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(block))
}

pub async fn update_condominium_block(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, block_id)): Path<(String, String)>,
    Json(input): Json<CondominiumBlockInput>,
) -> Result<Json<CondominiumBlock>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do bloco")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let block = item
        .blocks_detailed
        .iter_mut()
        .find(|entry| entry.id == block_id)
        .ok_or_else(|| ApiError::not_found("Bloco nao encontrado"))?;
    block.name = input.name.trim().to_string();
    block.code = input.code.unwrap_or_else(|| block.code.clone());
    block.description = input
        .description
        .unwrap_or_else(|| block.description.clone());
    block.specific_address = input
        .specific_address
        .unwrap_or_else(|| block.specific_address.clone());
    block.main_entry = input.main_entry.unwrap_or_else(|| block.main_entry.clone());
    block.floors_count = input.floors_count.unwrap_or(block.floors_count);
    block.basements_count = input.basements_count.unwrap_or(block.basements_count);
    block.fractions_count = input.fractions_count.unwrap_or(block.fractions_count);
    block.elevators_count = input.elevators_count.unwrap_or(block.elevators_count);
    block.stairs_count = input.stairs_count.unwrap_or(block.stairs_count);
    block.garages_count = input.garages_count.unwrap_or(block.garages_count);
    block.operational_status = input
        .operational_status
        .unwrap_or_else(|| block.operational_status.clone());
    block.access_notes = input
        .access_notes
        .unwrap_or_else(|| block.access_notes.clone());
    block.internal_notes = input
        .internal_notes
        .unwrap_or_else(|| block.internal_notes.clone());
    block.archived = input.archived.unwrap_or(block.archived);
    let response = block.clone();
    item.push_history(
        "block-updated",
        format!("Bloco {} atualizado", response.name),
        user.name.clone(),
        "block",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_block(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, block_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumBlock>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.blocks_detailed.len();
    let removed_name = item
        .blocks_detailed
        .iter()
        .find(|entry| entry.id == block_id)
        .map(|entry| entry.name.clone())
        .unwrap_or_default();
    item.blocks_detailed.retain(|entry| entry.id != block_id);
    if item.blocks_detailed.len() == original_len {
        return Err(ApiError::not_found("Bloco nao encontrado"));
    }
    item.structure.blocks_count = u16::try_from(item.blocks_detailed.len()).unwrap_or(u16::MAX);
    item.buildings = item.structure.blocks_count;
    item.push_history(
        "block-deleted",
        format!("Bloco {} removido", removed_name),
        user.name.clone(),
        "block",
        removed_name,
        String::new(),
        "api",
    );
    let response = item.blocks_detailed.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_floors(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumFloor>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.floors_detailed.clone()))
}

pub async fn create_condominium_floor(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumFloorInput>,
) -> Result<Json<CondominiumFloor>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do piso")?;
    validate_required(&input.number, "Numero do piso")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let floor = CondominiumFloor {
        id: Uuid::new_v4().to_string(),
        block_id: input.block_id.unwrap_or_default(),
        name: input.name.trim().to_string(),
        number: input.number.trim().to_string(),
        floor_type: input.floor_type.unwrap_or_else(|| "habitacao".to_string()),
        description: input.description.unwrap_or_default(),
        fractions_count: input.fractions_count.unwrap_or(0),
        operational_status: input
            .operational_status
            .unwrap_or_else(|| "operacional".to_string()),
        notes: input.notes.unwrap_or_default(),
    };
    item.floors_detailed.push(floor.clone());
    item.push_history(
        "floor-created",
        format!("Piso {} adicionado", floor.name),
        user.name.clone(),
        "floor",
        String::new(),
        serde_json::to_string(&floor).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(floor))
}

pub async fn update_condominium_floor(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, floor_id)): Path<(String, String)>,
    Json(input): Json<CondominiumFloorInput>,
) -> Result<Json<CondominiumFloor>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do piso")?;
    validate_required(&input.number, "Numero do piso")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let floor = item
        .floors_detailed
        .iter_mut()
        .find(|entry| entry.id == floor_id)
        .ok_or_else(|| ApiError::not_found("Piso nao encontrado"))?;
    floor.block_id = input.block_id.unwrap_or_else(|| floor.block_id.clone());
    floor.name = input.name.trim().to_string();
    floor.number = input.number.trim().to_string();
    floor.floor_type = input.floor_type.unwrap_or_else(|| floor.floor_type.clone());
    floor.description = input
        .description
        .unwrap_or_else(|| floor.description.clone());
    floor.fractions_count = input.fractions_count.unwrap_or(floor.fractions_count);
    floor.operational_status = input
        .operational_status
        .unwrap_or_else(|| floor.operational_status.clone());
    floor.notes = input.notes.unwrap_or_else(|| floor.notes.clone());
    let response = floor.clone();
    item.push_history(
        "floor-updated",
        format!("Piso {} atualizado", response.name),
        user.name.clone(),
        "floor",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_floor(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, floor_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumFloor>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.floors_detailed.len();
    item.floors_detailed.retain(|entry| entry.id != floor_id);
    if original_len == item.floors_detailed.len() {
        return Err(ApiError::not_found("Piso nao encontrado"));
    }
    item.push_history(
        "floor-deleted",
        "Piso removido",
        user.name.clone(),
        "floor",
        floor_id,
        String::new(),
        "api",
    );
    let response = item.floors_detailed.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_zones(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumZone>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.zones.clone()))
}

pub async fn create_condominium_zone(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumZoneInput>,
) -> Result<Json<CondominiumZone>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome da zona")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let zone_id = Uuid::new_v4().to_string();
    let reference = input
        .qr_code_reference
        .unwrap_or_else(|| format!("zone-{zone_id}"));
    let zone = CondominiumZone {
        id: zone_id,
        block_id: input.block_id.unwrap_or_default(),
        floor_id: input.floor_id.unwrap_or_default(),
        name: input.name.trim().to_string(),
        zone_type: input.zone_type.unwrap_or_else(|| "outro".to_string()),
        description: input.description.unwrap_or_default(),
        operational_status: input
            .operational_status
            .unwrap_or_else(|| "operacional".to_string()),
        alert_level: input.alert_level.unwrap_or_else(|| "verde".to_string()),
        qr_code_reference: reference.clone(),
        public_qr_url: build_zone_qr_url(&item.name, &reference, &input.name),
        internal_location: input.internal_location.unwrap_or_default(),
        access_notes: input.access_notes.unwrap_or_default(),
        technical_notes: input.technical_notes.unwrap_or_default(),
        image_url: input.image_url.unwrap_or_default(),
        plan_url: input.plan_url.unwrap_or_default(),
    };
    item.zones.push(zone.clone());
    item.push_history(
        "zone-created",
        format!("Zona {} adicionada", zone.name),
        user.name.clone(),
        "zone",
        String::new(),
        serde_json::to_string(&zone).unwrap_or_default(),
        "api",
    );
    let response = zone;
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_zone(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, zone_id)): Path<(String, String)>,
    Json(input): Json<CondominiumZoneInput>,
) -> Result<Json<CondominiumZone>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome da zona")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let condominium_name = item.name.clone();
    let zone = item
        .zones
        .iter_mut()
        .find(|entry| entry.id == zone_id)
        .ok_or_else(|| ApiError::not_found("Zona nao encontrada"))?;
    zone.block_id = input.block_id.unwrap_or_else(|| zone.block_id.clone());
    zone.floor_id = input.floor_id.unwrap_or_else(|| zone.floor_id.clone());
    zone.name = input.name.trim().to_string();
    zone.zone_type = input.zone_type.unwrap_or_else(|| zone.zone_type.clone());
    zone.description = input
        .description
        .unwrap_or_else(|| zone.description.clone());
    zone.operational_status = input
        .operational_status
        .unwrap_or_else(|| zone.operational_status.clone());
    zone.alert_level = input
        .alert_level
        .unwrap_or_else(|| zone.alert_level.clone());
    if let Some(qr_code_reference) = input.qr_code_reference {
        zone.qr_code_reference = qr_code_reference;
    }
    zone.public_qr_url = build_zone_qr_url(&condominium_name, &zone.qr_code_reference, &zone.name);
    zone.internal_location = input
        .internal_location
        .unwrap_or_else(|| zone.internal_location.clone());
    zone.access_notes = input
        .access_notes
        .unwrap_or_else(|| zone.access_notes.clone());
    zone.technical_notes = input
        .technical_notes
        .unwrap_or_else(|| zone.technical_notes.clone());
    zone.image_url = input.image_url.unwrap_or_else(|| zone.image_url.clone());
    zone.plan_url = input.plan_url.unwrap_or_else(|| zone.plan_url.clone());
    let response = zone.clone();
    item.push_history(
        "zone-updated",
        format!("Zona {} atualizada", response.name),
        user.name.clone(),
        "zone",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_zone(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, zone_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumZone>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.zones.len();
    item.zones.retain(|entry| entry.id != zone_id);
    if original_len == item.zones.len() {
        return Err(ApiError::not_found("Zona nao encontrada"));
    }
    item.push_history(
        "zone-deleted",
        "Zona removida",
        user.name.clone(),
        "zone",
        zone_id,
        String::new(),
        "api",
    );
    let response = item.zones.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_equipment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumEquipment>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.equipment.clone()))
}

pub async fn create_condominium_equipment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumEquipmentInput>,
) -> Result<Json<CondominiumEquipment>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do equipamento")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let equipment = CondominiumEquipment {
        id: Uuid::new_v4().to_string(),
        block_id: input.block_id.unwrap_or_default(),
        floor_id: input.floor_id.unwrap_or_default(),
        zone_id: input.zone_id.unwrap_or_default(),
        name: input.name.trim().to_string(),
        equipment_type: input.equipment_type.unwrap_or_else(|| "outro".to_string()),
        brand: input.brand.unwrap_or_default(),
        model: input.model.unwrap_or_default(),
        serial_number: input.serial_number.unwrap_or_default(),
        internal_reference: input.internal_reference.unwrap_or_default(),
        supplier: input.supplier.unwrap_or_default(),
        maintenance_company: input.maintenance_company.unwrap_or_default(),
        installation_date: input.installation_date.unwrap_or_default(),
        last_maintenance_date: input.last_maintenance_date.unwrap_or_default(),
        next_maintenance_date: input.next_maintenance_date.unwrap_or_default(),
        maintenance_frequency: input.maintenance_frequency.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "operacional".to_string()),
        criticality: input.criticality.unwrap_or_else(|| "medio".to_string()),
        warranty_until: input.warranty_until.unwrap_or_default(),
        contract_reference: input.contract_reference.unwrap_or_default(),
        technical_notes: input.technical_notes.unwrap_or_default(),
        document_ids: input.document_ids.unwrap_or_default(),
        media_ids: input.media_ids.unwrap_or_default(),
    };
    item.equipment.push(equipment.clone());
    item.push_history(
        "equipment-created",
        format!("Equipamento {} adicionado", equipment.name),
        user.name.clone(),
        "equipment",
        String::new(),
        serde_json::to_string(&equipment).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(equipment))
}

pub async fn update_condominium_equipment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, equipment_id)): Path<(String, String)>,
    Json(input): Json<CondominiumEquipmentInput>,
) -> Result<Json<CondominiumEquipment>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do equipamento")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let equipment = item
        .equipment
        .iter_mut()
        .find(|entry| entry.id == equipment_id)
        .ok_or_else(|| ApiError::not_found("Equipamento nao encontrado"))?;
    equipment.block_id = input.block_id.unwrap_or_else(|| equipment.block_id.clone());
    equipment.floor_id = input.floor_id.unwrap_or_else(|| equipment.floor_id.clone());
    equipment.zone_id = input.zone_id.unwrap_or_else(|| equipment.zone_id.clone());
    equipment.name = input.name.trim().to_string();
    equipment.equipment_type = input
        .equipment_type
        .unwrap_or_else(|| equipment.equipment_type.clone());
    equipment.brand = input.brand.unwrap_or_else(|| equipment.brand.clone());
    equipment.model = input.model.unwrap_or_else(|| equipment.model.clone());
    equipment.serial_number = input
        .serial_number
        .unwrap_or_else(|| equipment.serial_number.clone());
    equipment.internal_reference = input
        .internal_reference
        .unwrap_or_else(|| equipment.internal_reference.clone());
    equipment.supplier = input.supplier.unwrap_or_else(|| equipment.supplier.clone());
    equipment.maintenance_company = input
        .maintenance_company
        .unwrap_or_else(|| equipment.maintenance_company.clone());
    equipment.installation_date = input
        .installation_date
        .unwrap_or_else(|| equipment.installation_date.clone());
    equipment.last_maintenance_date = input
        .last_maintenance_date
        .unwrap_or_else(|| equipment.last_maintenance_date.clone());
    equipment.next_maintenance_date = input
        .next_maintenance_date
        .unwrap_or_else(|| equipment.next_maintenance_date.clone());
    equipment.maintenance_frequency = input
        .maintenance_frequency
        .unwrap_or_else(|| equipment.maintenance_frequency.clone());
    equipment.status = input.status.unwrap_or_else(|| equipment.status.clone());
    equipment.criticality = input
        .criticality
        .unwrap_or_else(|| equipment.criticality.clone());
    equipment.warranty_until = input
        .warranty_until
        .unwrap_or_else(|| equipment.warranty_until.clone());
    equipment.contract_reference = input
        .contract_reference
        .unwrap_or_else(|| equipment.contract_reference.clone());
    equipment.technical_notes = input
        .technical_notes
        .unwrap_or_else(|| equipment.technical_notes.clone());
    equipment.document_ids = input
        .document_ids
        .unwrap_or_else(|| equipment.document_ids.clone());
    equipment.media_ids = input
        .media_ids
        .unwrap_or_else(|| equipment.media_ids.clone());
    let response = equipment.clone();
    item.push_history(
        "equipment-updated",
        format!("Equipamento {} atualizado", response.name),
        user.name.clone(),
        "equipment",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_equipment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, equipment_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumEquipment>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.equipment.len();
    item.equipment.retain(|entry| entry.id != equipment_id);
    if original_len == item.equipment.len() {
        return Err(ApiError::not_found("Equipamento nao encontrado"));
    }
    item.push_history(
        "equipment-deleted",
        "Equipamento removido",
        user.name.clone(),
        "equipment",
        equipment_id,
        String::new(),
        "api",
    );
    let response = item.equipment.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_contacts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumContact>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.contacts.clone()))
}

pub async fn create_condominium_contact(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumContactInput>,
) -> Result<Json<CondominiumContact>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do contacto")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let contact = CondominiumContact {
        id: Uuid::new_v4().to_string(),
        contact_type: input.contact_type.unwrap_or_else(|| "outro".to_string()),
        name: input.name.trim().to_string(),
        company: input.company.unwrap_or_default(),
        role: input.role.unwrap_or_default(),
        phone: input.phone.unwrap_or_default(),
        alternate_phone: input.alternate_phone.unwrap_or_default(),
        email: input.email.unwrap_or_default(),
        schedule: input.schedule.unwrap_or_default(),
        service: input.service.unwrap_or_default(),
        is_emergency: input.is_emergency.unwrap_or(false),
        priority: input.priority.unwrap_or_else(|| "media".to_string()),
        favorite: input.favorite.unwrap_or(false),
        notes: input.notes.unwrap_or_default(),
        contract_reference: input.contract_reference.unwrap_or_default(),
    };
    item.contacts.push(contact.clone());
    item.push_history(
        "contact-created",
        format!("Contacto {} adicionado", contact.name),
        user.name.clone(),
        "contact",
        String::new(),
        serde_json::to_string(&contact).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(contact))
}

pub async fn update_condominium_contact(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, contact_id)): Path<(String, String)>,
    Json(input): Json<CondominiumContactInput>,
) -> Result<Json<CondominiumContact>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.name, "Nome do contacto")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let contact = item
        .contacts
        .iter_mut()
        .find(|entry| entry.id == contact_id)
        .ok_or_else(|| ApiError::not_found("Contacto nao encontrado"))?;
    contact.contact_type = input
        .contact_type
        .unwrap_or_else(|| contact.contact_type.clone());
    contact.name = input.name.trim().to_string();
    contact.company = input.company.unwrap_or_else(|| contact.company.clone());
    contact.role = input.role.unwrap_or_else(|| contact.role.clone());
    contact.phone = input.phone.unwrap_or_else(|| contact.phone.clone());
    contact.alternate_phone = input
        .alternate_phone
        .unwrap_or_else(|| contact.alternate_phone.clone());
    contact.email = input.email.unwrap_or_else(|| contact.email.clone());
    contact.schedule = input.schedule.unwrap_or_else(|| contact.schedule.clone());
    contact.service = input.service.unwrap_or_else(|| contact.service.clone());
    contact.is_emergency = input.is_emergency.unwrap_or(contact.is_emergency);
    contact.priority = input.priority.unwrap_or_else(|| contact.priority.clone());
    contact.favorite = input.favorite.unwrap_or(contact.favorite);
    contact.notes = input.notes.unwrap_or_else(|| contact.notes.clone());
    contact.contract_reference = input
        .contract_reference
        .unwrap_or_else(|| contact.contract_reference.clone());
    let response = contact.clone();
    item.push_history(
        "contact-updated",
        format!("Contacto {} atualizado", response.name),
        user.name.clone(),
        "contact",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_contact(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, contact_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumContact>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.contacts.len();
    item.contacts.retain(|entry| entry.id != contact_id);
    if original_len == item.contacts.len() {
        return Err(ApiError::not_found("Contacto nao encontrado"));
    }
    item.push_history(
        "contact-deleted",
        "Contacto removido",
        user.name.clone(),
        "contact",
        contact_id,
        String::new(),
        "api",
    );
    let response = item.contacts.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumManagedDocument>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.managed_documents.clone()))
}

pub async fn create_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumManagedDocumentInput>,
) -> Result<Json<CondominiumManagedDocument>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo do documento")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let document = CondominiumManagedDocument {
        id: Uuid::new_v4().to_string(),
        title: input.title.trim().to_string(),
        document_type: input.document_type.unwrap_or_else(|| "outro".to_string()),
        description: input.description.unwrap_or_default(),
        file_name: input.file_name.unwrap_or_default(),
        file_url: input.file_url.unwrap_or_default(),
        block_id: input.block_id.unwrap_or_default(),
        zone_id: input.zone_id.unwrap_or_default(),
        equipment_id: input.equipment_id.unwrap_or_default(),
        document_date: input.document_date.unwrap_or_default(),
        expiry_date: input.expiry_date.unwrap_or_default(),
        uploaded_by: user.name.clone(),
        uploaded_at: Utc::now().to_rfc3339(),
        version: input.version.unwrap_or_else(|| "1".to_string()),
        status: input.status.unwrap_or_else(|| "valido".to_string()),
        notes: input.notes.unwrap_or_default(),
    };
    item.managed_documents.push(document.clone());
    item.push_history(
        "document-created",
        format!("Documento {} adicionado", document.title),
        user.name.clone(),
        "document",
        String::new(),
        serde_json::to_string(&document).unwrap_or_default(),
        "api",
    );
    let response = document;
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn upload_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<CondominiumManagedDocument>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut title = String::new();
    let mut document_type = "outro".to_string();
    let mut description = String::new();
    let mut status = "valido".to_string();
    let mut expiry_date = String::new();
    let mut notes = String::new();
    let mut uploaded_file: Option<CondominiumUploadedFile> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ApiError::validation("Upload invalido"))?
    {
        let field_name = field.name().unwrap_or_default().to_string();
        if field_name == "file" {
            uploaded_file = Some(read_upload_field(field).await?);
            continue;
        }

        let value = field
            .text()
            .await
            .map_err(|_| ApiError::validation("Campo de upload invalido"))?
            .trim()
            .to_string();
        match field_name.as_str() {
            "title" => title = value,
            "documentType" | "type" => document_type = value,
            "description" => description = value,
            "status" if !value.is_empty() => status = value,
            "expiryDate" => expiry_date = value,
            "notes" => notes = value,
            _ => {}
        }
    }

    validate_required(&title, "Titulo do documento")?;
    let uploaded_file =
        uploaded_file.ok_or_else(|| ApiError::validation("Seleciona um ficheiro"))?;
    let document_id = Uuid::new_v4().to_string();
    let safe_name = safe_file_name(&uploaded_file.original_name);
    let storage_key = format!("{document_id}-{safe_name}");
    write_condominium_file(&state, &storage_key, &uploaded_file.bytes).await?;

    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let condominium_name = item.name.clone();
    let document = CondominiumManagedDocument {
        id: document_id.clone(),
        title,
        document_type: document_type.clone(),
        description,
        file_name: uploaded_file.original_name.clone(),
        file_url: format!("/api/documents/{document_id}/download"),
        block_id: String::new(),
        zone_id: String::new(),
        equipment_id: String::new(),
        document_date: String::new(),
        expiry_date,
        uploaded_by: user.name.clone(),
        uploaded_at: Utc::now().to_rfc3339(),
        version: "1".to_string(),
        status: status.clone(),
        notes,
    };
    item.managed_documents.push(document.clone());
    item.push_history(
        "document-uploaded",
        format!("Documento {} carregado", document.title),
        user.name.clone(),
        "document",
        String::new(),
        serde_json::to_string(&document).unwrap_or_default(),
        "api",
    );

    let global_document = Document {
        id: document_id,
        title: document.title.clone(),
        kind: document_type,
        condominium: condominium_name,
        status,
        file_name: uploaded_file.original_name,
        mime_type: uploaded_file.mime_type,
        size_bytes: uploaded_file.bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        uploaded_at: Some(Utc::now()),
    };
    let response = document;
    store.documents.insert(0, global_document);
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, document_id)): Path<(String, String)>,
    Json(input): Json<CondominiumManagedDocumentInput>,
) -> Result<Json<CondominiumManagedDocument>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo do documento")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let document = item
        .managed_documents
        .iter_mut()
        .find(|entry| entry.id == document_id)
        .ok_or_else(|| ApiError::not_found("Documento nao encontrado"))?;
    document.title = input.title.trim().to_string();
    document.document_type = input
        .document_type
        .unwrap_or_else(|| document.document_type.clone());
    document.description = input
        .description
        .unwrap_or_else(|| document.description.clone());
    document.file_name = input
        .file_name
        .unwrap_or_else(|| document.file_name.clone());
    document.file_url = input.file_url.unwrap_or_else(|| document.file_url.clone());
    document.block_id = input.block_id.unwrap_or_else(|| document.block_id.clone());
    document.zone_id = input.zone_id.unwrap_or_else(|| document.zone_id.clone());
    document.equipment_id = input
        .equipment_id
        .unwrap_or_else(|| document.equipment_id.clone());
    document.document_date = input
        .document_date
        .unwrap_or_else(|| document.document_date.clone());
    document.expiry_date = input
        .expiry_date
        .unwrap_or_else(|| document.expiry_date.clone());
    document.version = input.version.unwrap_or_else(|| document.version.clone());
    document.status = input.status.unwrap_or_else(|| document.status.clone());
    document.notes = input.notes.unwrap_or_else(|| document.notes.clone());
    let response = document.clone();
    item.push_history(
        "document-updated",
        format!("Documento {} atualizado", response.title),
        user.name.clone(),
        "document",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, document_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumManagedDocument>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.managed_documents.len();
    item.managed_documents
        .retain(|entry| entry.id != document_id);
    if original_len == item.managed_documents.len() {
        return Err(ApiError::not_found("Documento nao encontrado"));
    }
    item.push_history(
        "document-deleted",
        "Documento removido",
        user.name.clone(),
        "document",
        document_id,
        String::new(),
        "api",
    );
    let response = item.managed_documents.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumMedia>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.media.clone()))
}

pub async fn create_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumMediaInput>,
) -> Result<Json<CondominiumMedia>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo do registo visual")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let media = CondominiumMedia {
        id: Uuid::new_v4().to_string(),
        media_type: input.media_type.unwrap_or_else(|| "imagem".to_string()),
        title: input.title.trim().to_string(),
        file_name: input.file_name.unwrap_or_default(),
        file_url: input.file_url.unwrap_or_default(),
        block_id: input.block_id.unwrap_or_default(),
        floor_id: input.floor_id.unwrap_or_default(),
        zone_id: input.zone_id.unwrap_or_default(),
        description: input.description.unwrap_or_default(),
        is_primary: input.is_primary.unwrap_or(false),
        created_at: Utc::now().to_rfc3339(),
    };
    if media.is_primary {
        item.primary_image_url = media.file_url.clone();
        for existing in &mut item.media {
            existing.is_primary = false;
        }
    }
    item.media.push(media.clone());
    item.push_history(
        "media-created",
        format!("Media {} adicionada", media.title),
        user.name.clone(),
        "media",
        String::new(),
        serde_json::to_string(&media).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(media))
}

pub async fn upload_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<CondominiumMedia>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut title = String::new();
    let mut media_type = "imagem".to_string();
    let mut description = String::new();
    let mut is_primary = false;
    let mut uploaded_file: Option<CondominiumUploadedFile> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ApiError::validation("Upload invalido"))?
    {
        let field_name = field.name().unwrap_or_default().to_string();
        if field_name == "file" {
            uploaded_file = Some(read_upload_field(field).await?);
            continue;
        }

        let value = field
            .text()
            .await
            .map_err(|_| ApiError::validation("Campo de upload invalido"))?
            .trim()
            .to_string();
        match field_name.as_str() {
            "title" => title = value,
            "mediaType" | "type" => media_type = value,
            "description" => description = value,
            "isPrimary" => is_primary = matches!(value.as_str(), "true" | "on" | "1" | "sim"),
            _ => {}
        }
    }

    validate_required(&title, "Titulo do registo visual")?;
    let uploaded_file =
        uploaded_file.ok_or_else(|| ApiError::validation("Seleciona um ficheiro"))?;
    let media_id = Uuid::new_v4().to_string();
    let safe_name = safe_file_name(&uploaded_file.original_name);
    let storage_key = format!("{media_id}-{safe_name}");
    write_condominium_file(&state, &storage_key, &uploaded_file.bytes).await?;

    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let condominium_name = item.name.clone();
    if is_primary {
        for existing in &mut item.media {
            existing.is_primary = false;
        }
    }
    let media = CondominiumMedia {
        id: media_id.clone(),
        media_type: media_type.clone(),
        title,
        file_name: uploaded_file.original_name.clone(),
        file_url: format!("/api/documents/{media_id}/download"),
        block_id: String::new(),
        floor_id: String::new(),
        zone_id: String::new(),
        description,
        is_primary,
        created_at: Utc::now().to_rfc3339(),
    };
    if media.is_primary {
        item.primary_image_url = media.file_url.clone();
    }
    item.media.push(media.clone());
    item.push_history(
        "media-uploaded",
        format!("Media {} carregada", media.title),
        user.name.clone(),
        "media",
        String::new(),
        serde_json::to_string(&media).unwrap_or_default(),
        "api",
    );

    let global_document = Document {
        id: media_id,
        title: media.title.clone(),
        kind: media_type,
        condominium: condominium_name,
        status: "Carregado".to_string(),
        file_name: uploaded_file.original_name,
        mime_type: uploaded_file.mime_type,
        size_bytes: uploaded_file.bytes.len().try_into().unwrap_or(u64::MAX),
        storage_key,
        uploaded_at: Some(Utc::now()),
    };
    let response = media;
    store.documents.insert(0, global_document);
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn update_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, media_id)): Path<(String, String)>,
    Json(input): Json<CondominiumMediaInput>,
) -> Result<Json<CondominiumMedia>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo do registo visual")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let index = item
        .media
        .iter()
        .position(|entry| entry.id == media_id)
        .ok_or_else(|| ApiError::not_found("Media nao encontrada"))?;
    let set_primary = input.is_primary.unwrap_or(item.media[index].is_primary);
    if set_primary {
        for existing in &mut item.media {
            existing.is_primary = false;
        }
    }
    let media = item
        .media
        .get_mut(index)
        .ok_or_else(|| ApiError::not_found("Media nao encontrada"))?;
    media.media_type = input.media_type.unwrap_or_else(|| media.media_type.clone());
    media.title = input.title.trim().to_string();
    media.file_name = input.file_name.unwrap_or_else(|| media.file_name.clone());
    media.file_url = input.file_url.unwrap_or_else(|| media.file_url.clone());
    media.block_id = input.block_id.unwrap_or_else(|| media.block_id.clone());
    media.floor_id = input.floor_id.unwrap_or_else(|| media.floor_id.clone());
    media.zone_id = input.zone_id.unwrap_or_else(|| media.zone_id.clone());
    media.description = input
        .description
        .unwrap_or_else(|| media.description.clone());
    media.is_primary = set_primary;
    if media.is_primary {
        item.primary_image_url = media.file_url.clone();
    }
    let response = media.clone();
    item.push_history(
        "media-updated",
        format!("Media {} atualizada", response.title),
        user.name.clone(),
        "media",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_media(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, media_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumMedia>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.media.len();
    let removed_primary = item
        .media
        .iter()
        .find(|entry| entry.id == media_id)
        .is_some_and(|entry| entry.is_primary);
    item.media.retain(|entry| entry.id != media_id);
    if original_len == item.media.len() {
        return Err(ApiError::not_found("Media nao encontrada"));
    }
    if removed_primary {
        item.primary_image_url = item
            .media
            .iter()
            .find(|entry| entry.is_primary)
            .map(|entry| entry.file_url.clone())
            .unwrap_or_default();
    }
    item.push_history(
        "media-deleted",
        "Media removida",
        user.name.clone(),
        "media",
        media_id,
        String::new(),
        "api",
    );
    let response = item.media.clone();
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn list_condominium_notes(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<CondominiumInternalNote>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    let item = store
        .condominiums
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    Ok(Json(item.internal_notes_registry.clone()))
}

pub async fn create_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<CondominiumNoteInput>,
) -> Result<Json<CondominiumInternalNote>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo da nota")?;
    validate_required(&input.content, "Conteudo da nota")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let note = CondominiumInternalNote {
        id: Uuid::new_v4().to_string(),
        note_type: input.note_type.unwrap_or_else(|| "geral".to_string()),
        title: input.title.trim().to_string(),
        content: input.content.trim().to_string(),
        created_by: user.name.clone(),
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
        visibility: input.visibility.unwrap_or_else(|| "internal".to_string()),
        priority: input.priority.unwrap_or_else(|| "media".to_string()),
        pinned: input.pinned.unwrap_or(false),
    };
    item.internal_notes_registry.push(note.clone());
    item.push_history(
        "note-created",
        format!("Nota {} adicionada", note.title),
        user.name.clone(),
        "note",
        String::new(),
        serde_json::to_string(&note).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(note))
}

pub async fn update_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, note_id)): Path<(String, String)>,
    Json(input): Json<CondominiumNoteInput>,
) -> Result<Json<CondominiumInternalNote>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    validate_required(&input.title, "Titulo da nota")?;
    validate_required(&input.content, "Conteudo da nota")?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let note = item
        .internal_notes_registry
        .iter_mut()
        .find(|entry| entry.id == note_id)
        .ok_or_else(|| ApiError::not_found("Nota nao encontrada"))?;
    note.note_type = input.note_type.unwrap_or_else(|| note.note_type.clone());
    note.title = input.title.trim().to_string();
    note.content = input.content.trim().to_string();
    note.updated_at = Utc::now().to_rfc3339();
    note.visibility = input.visibility.unwrap_or_else(|| note.visibility.clone());
    note.priority = input.priority.unwrap_or_else(|| note.priority.clone());
    note.pinned = input.pinned.unwrap_or(note.pinned);
    let response = note.clone();
    item.push_history(
        "note-updated",
        format!("Nota {} atualizada", response.title),
        user.name.clone(),
        "note",
        String::new(),
        serde_json::to_string(&response).unwrap_or_default(),
        "api",
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(response))
}

pub async fn delete_condominium_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((id, note_id)): Path<(String, String)>,
) -> Result<Json<Vec<CondominiumInternalNote>>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let item = find_condominium_mut(&mut store, &id)?;
    let original_len = item.internal_notes_registry.len();
    item.internal_notes_registry
        .retain(|entry| entry.id != note_id);
    if original_len == item.internal_notes_registry.len() {
        return Err(ApiError::not_found("Nota nao encontrada"));
    }
    item.push_history(
        "note-deleted",
        "Nota removida",
        user.name.clone(),
        "note",
        note_id,
        String::new(),
        "api",
    );
    let response = item.internal_notes_registry.clone();
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
    let draft_snapshot = {
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
        serde_json::to_string(draft).unwrap_or_default()
    };
    item.push_history(
        "draft-saved",
        "Rascunho de onboarding guardado",
        user.name.clone(),
        "onboarding-draft",
        String::new(),
        draft_snapshot,
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
) -> Result<Json<ImportPreviewResponse>, ApiError> {
    current_user(&headers, &state).await?;
    let delimiter = input
        .delimiter
        .as_deref()
        .and_then(|value| value.chars().next())
        .unwrap_or(';');
    let parsed = parse_csv_rows(&input.csv, delimiter)?;
    let store = state.store.read().await;

    let mut rows_preview = Vec::new();
    let mut total_errors = Vec::new();
    let mut valid_rows = 0_usize;
    for (index, row) in parsed.rows.into_iter().enumerate() {
        let mut row_errors = validate_import_row(&row);
        if !row.internal_code.trim().is_empty()
            && store.condominiums.iter().any(|item| {
                item.internal_code
                    .eq_ignore_ascii_case(row.internal_code.trim())
            })
        {
            row_errors.push("Codigo interno ja existe".to_string());
        }
        if row_errors.is_empty() {
            valid_rows += 1;
        } else {
            total_errors.extend(
                row_errors
                    .iter()
                    .map(|message| format!("Linha {}: {message}", index + 2)),
            );
        }
        rows_preview.push(ImportRowPreview {
            row: index + 2,
            values: row,
            errors: row_errors,
        });
    }

    Ok(Json(ImportPreviewResponse {
        headers: parsed.headers,
        rows: rows_preview,
        valid_rows,
        total_rows: parsed.total_rows,
        errors: total_errors,
    }))
}

pub async fn import_commit(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ImportCommitInput>,
) -> Result<Json<ImportCommitResponse>, ApiError> {
    let user = require_write(&headers, &state, "condominiums").await?;
    let mut store = state.store.write().await;
    let mut created = 0_usize;
    let mut skipped = 0_usize;
    let mut errors = Vec::new();

    for (index, row) in input.rows.iter().enumerate() {
        let row_errors = validate_import_row(row);
        if !row_errors.is_empty() {
            errors.push(format!(
                "Linha {} invalida: {}",
                index + 1,
                row_errors.join(", ")
            ));
            continue;
        }

        if store.condominiums.iter().any(|item| {
            item.internal_code
                .eq_ignore_ascii_case(row.internal_code.trim())
        }) {
            if input.skip_existing {
                skipped += 1;
                continue;
            }
            errors.push(format!(
                "Linha {}: codigo interno {} ja existe",
                index + 1,
                row.internal_code
            ));
            continue;
        }

        let mut condominium = Condominium {
            id: Uuid::new_v4().to_string(),
            name: row.name.trim().to_string(),
            location: row.locality.trim().to_string(),
            buildings: row.blocks_count,
            fractions: row.total_fractions,
            residents: 0,
            status: row.status.trim().to_string(),
            notice: "Importado via CSV".to_string(),
            internal_code: row.internal_code.trim().to_string(),
            external_reference: String::new(),
            condominium_type: row.condominium_type.trim().to_string(),
            subtype: String::new(),
            management_start_date: String::new(),
            management_end_date: String::new(),
            manager: row.manager.trim().to_string(),
            team: String::new(),
            management_company: "GESTISAC".to_string(),
            short_description: String::new(),
            administrative_notes: row.notes.clone(),
            tags: vec!["importado".to_string()],
            archived: false,
            archived_at: None,
            address: CondominiumAddress {
                street: row.street.clone(),
                number: row.number.clone(),
                postal_code: row.postal_code.clone(),
                locality: row.locality.clone(),
                parish: row.parish.clone(),
                municipality: row.municipality.clone(),
                district: row.district.clone(),
                country: if row.country.trim().is_empty() {
                    "Portugal".to_string()
                } else {
                    row.country.clone()
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
                general_status: "normal".to_string(),
                alert_level: "verde".to_string(),
                summary: "Importado via CSV".to_string(),
                reason: String::new(),
                updated_by: user.name.clone(),
                updated_at: Utc::now().to_rfc3339(),
            },
            primary_image_url: String::new(),
            blocks_detailed: Vec::new(),
            floors_detailed: Vec::new(),
            zones: Vec::new(),
            equipment: Vec::new(),
            contacts: Vec::new(),
            managed_documents: Vec::new(),
            media: Vec::new(),
            internal_notes_registry: Vec::new(),
            history: Vec::new(),
            onboarding_draft: Some(CondominiumOnboardingDraft {
                current_step: 2,
                completed_steps: vec![1],
                is_quick_mode: false,
                saved_at: Utc::now().to_rfc3339(),
            }),
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        condominium.ensure_profile_defaults();
        if let Err(error) = validate_active_requirements(&condominium) {
            errors.push(format!("Linha {}: {}", index + 1, error.message));
            continue;
        }
        condominium.push_history(
            "imported",
            "Condominio importado via CSV",
            user.name.clone(),
            "condominium",
            String::new(),
            serde_json::to_string(&condominium).unwrap_or_default(),
            "csv-import",
        );
        store.condominiums.push(condominium);
        created += 1;
    }

    store.add_audit(
        &user,
        "condominiums",
        "import",
        "csv",
        format!(
            "Importacao CSV concluida: {} criados, {} ignorados, {} erros",
            created,
            skipped,
            errors.len()
        ),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(ImportCommitResponse {
        created,
        skipped,
        errors,
    }))
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

fn validate_required(value: &str, field: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::validation(format!("{field} e obrigatorio")));
    }

    Ok(())
}

fn validate_active_requirements(condominium: &Condominium) -> Result<(), ApiError> {
    if !is_active_status(&condominium.status) {
        return Ok(());
    }

    if condominium.address.street.trim().is_empty()
        || condominium.address.locality.trim().is_empty()
    {
        return Err(ApiError::validation(
            "Condominio ativo exige morada e localidade",
        ));
    }
    if condominium.structure.total_fractions == 0 && condominium.fractions == 0 {
        return Err(ApiError::validation(
            "Condominio ativo exige numero total de fracoes",
        ));
    }
    if condominium.manager.trim().is_empty() {
        return Err(ApiError::validation(
            "Condominio ativo exige gestor responsavel",
        ));
    }

    Ok(())
}

fn is_active_status(status: &str) -> bool {
    status.trim().to_lowercase().contains("ativ")
}

fn build_completeness_report(condominium: &Condominium) -> CompletenessReport {
    let mut categories = Vec::new();
    let mut missing_items = Vec::new();

    let identification_complete = !condominium.name.trim().is_empty()
        && !condominium.internal_code.trim().is_empty()
        && !condominium.manager.trim().is_empty();
    categories.push(CompletenessCategory {
        id: "identification".to_string(),
        label: "Identificacao".to_string(),
        complete: identification_complete,
    });
    if !identification_complete {
        if condominium.internal_code.trim().is_empty() {
            missing_items.push("falta codigo interno".to_string());
        }
        if condominium.manager.trim().is_empty() {
            missing_items.push("falta gestor responsavel".to_string());
        }
    }

    let address_complete = !condominium.address.street.trim().is_empty()
        && !condominium.address.postal_code.trim().is_empty()
        && !condominium.address.locality.trim().is_empty();
    categories.push(CompletenessCategory {
        id: "address".to_string(),
        label: "Morada".to_string(),
        complete: address_complete,
    });
    if !address_complete {
        missing_items.push("falta morada completa".to_string());
    }

    let structure_complete =
        condominium.structure.total_fractions > 0 && condominium.structure.blocks_count > 0;
    categories.push(CompletenessCategory {
        id: "structure".to_string(),
        label: "Estrutura fisica".to_string(),
        complete: structure_complete,
    });
    if !structure_complete {
        missing_items.push("falta estrutura fisica detalhada".to_string());
    }

    let blocks_complete = !condominium.blocks_detailed.is_empty();
    categories.push(CompletenessCategory {
        id: "blocks".to_string(),
        label: "Blocos".to_string(),
        complete: blocks_complete,
    });
    if !blocks_complete {
        missing_items.push("nao existem blocos registados".to_string());
    }

    let zones_complete = !condominium.zones.is_empty();
    categories.push(CompletenessCategory {
        id: "zones".to_string(),
        label: "Zonas".to_string(),
        complete: zones_complete,
    });
    if !zones_complete {
        missing_items.push("nao existem zonas registadas".to_string());
    }

    let equipment_complete = !condominium.equipment.is_empty();
    categories.push(CompletenessCategory {
        id: "equipment".to_string(),
        label: "Equipamentos".to_string(),
        complete: equipment_complete,
    });
    if !equipment_complete {
        missing_items.push("nao existem equipamentos registados".to_string());
    }

    let contacts_complete = condominium
        .contacts
        .iter()
        .any(|contact| contact.is_emergency);
    categories.push(CompletenessCategory {
        id: "contacts".to_string(),
        label: "Contactos".to_string(),
        complete: contacts_complete,
    });
    if !contacts_complete {
        missing_items.push("nao existem contactos de emergencia".to_string());
    }

    let documents_complete = !condominium.managed_documents.is_empty();
    categories.push(CompletenessCategory {
        id: "documents".to_string(),
        label: "Documentos".to_string(),
        complete: documents_complete,
    });
    if !documents_complete {
        missing_items.push("faltam documentos do condominio".to_string());
    }

    let media_complete = condominium
        .media
        .iter()
        .any(|media| media.is_primary || media.media_type.eq_ignore_ascii_case("planta"));
    categories.push(CompletenessCategory {
        id: "media".to_string(),
        label: "Imagens e plantas".to_string(),
        complete: media_complete,
    });
    if !media_complete {
        missing_items.push("falta imagem principal ou planta".to_string());
    }

    let notes_complete = !condominium.internal_notes_registry.is_empty();
    categories.push(CompletenessCategory {
        id: "notes".to_string(),
        label: "Notas internas".to_string(),
        complete: notes_complete,
    });
    if !notes_complete {
        missing_items.push("faltam notas internas operacionais".to_string());
    }

    let completed_categories = categories
        .iter()
        .filter(|category| category.complete)
        .count();
    let total_categories = categories.len();
    let percentage = if total_categories == 0 {
        0
    } else {
        ((completed_categories as f64 / total_categories as f64) * 100.0).round() as u8
    };

    CompletenessReport {
        percentage,
        completed_categories,
        total_categories,
        missing_items,
        categories,
    }
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
        .trim()
        .replace(['&', '=', '?', '#'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("+")
}

struct ParsedImportRows {
    headers: Vec<String>,
    rows: Vec<ImportRowInput>,
    total_rows: usize,
}

fn parse_csv_rows(raw: &str, delimiter: char) -> Result<ParsedImportRows, ApiError> {
    let mut lines = raw
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return Err(ApiError::validation("CSV vazio"));
    }

    let headers = lines
        .remove(0)
        .split(delimiter)
        .map(|value| value.trim().to_string())
        .collect::<Vec<_>>();
    if headers.is_empty() {
        return Err(ApiError::validation("CSV sem cabecalhos"));
    }
    let normalized_headers = headers
        .iter()
        .map(|value| normalize_header(value))
        .collect::<Vec<_>>();

    let mut rows = Vec::new();
    for line in lines {
        let values = line
            .split(delimiter)
            .map(|value| value.trim())
            .collect::<Vec<_>>();
        let value_for = |names: &[&str]| -> String {
            names
                .iter()
                .find_map(|name| {
                    normalized_headers
                        .iter()
                        .position(|header| header == name)
                        .and_then(|index| values.get(index).copied())
                        .map(str::to_string)
                })
                .unwrap_or_default()
        };

        let numeric_for = |names: &[&str]| -> u16 { value_for(names).parse::<u16>().unwrap_or(0) };

        rows.push(ImportRowInput {
            name: value_for(&["name", "nome"]),
            internal_code: value_for(&["internalcode", "internal_code", "codigo", "codigointerno"]),
            condominium_type: value_for(&["type", "tipo"]),
            status: value_for(&["status", "estado"]),
            street: value_for(&["street", "rua"]),
            number: value_for(&["number", "numero"]),
            postal_code: value_for(&["postalcode", "postal_code", "codigopostal"]),
            locality: value_for(&["locality", "localidade"]),
            parish: value_for(&["parish", "freguesia"]),
            municipality: value_for(&["municipality", "concelho"]),
            district: value_for(&["district", "distrito"]),
            country: value_for(&["country", "pais"]),
            total_fractions: numeric_for(&[
                "totalfractions",
                "total_fractions",
                "fracoes",
                "fractions",
            ]),
            blocks_count: numeric_for(&["blockscount", "blocks_count", "blocos"]),
            elevators_count: numeric_for(&["elevatorscount", "elevators_count", "elevadores"]),
            manager: value_for(&["manager", "gestor"]),
            notes: value_for(&["notes", "notas"]),
        });
    }

    Ok(ParsedImportRows {
        headers,
        total_rows: rows.len(),
        rows,
    })
}

fn normalize_header(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .map(|character| match character {
            'á' | 'à' | 'ã' | 'â' => 'a',
            'é' | 'ê' => 'e',
            'í' => 'i',
            'ó' | 'õ' | 'ô' => 'o',
            'ú' => 'u',
            'ç' => 'c',
            ' ' | '-' => '_',
            other => other,
        })
        .collect::<String>()
        .replace("__", "_")
}

fn validate_import_row(row: &ImportRowInput) -> Vec<String> {
    let mut errors = Vec::new();
    if row.name.trim().is_empty() {
        errors.push("nome em falta".to_string());
    }
    if row.internal_code.trim().is_empty() {
        errors.push("codigo interno em falta".to_string());
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

struct CondominiumUploadedFile {
    original_name: String,
    mime_type: String,
    bytes: Vec<u8>,
}

async fn read_upload_field(field: Field<'_>) -> Result<CondominiumUploadedFile, ApiError> {
    let original_name = field
        .file_name()
        .map(str::to_string)
        .unwrap_or_else(|| "ficheiro.bin".to_string());
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
    if bytes.len() > MAX_CONDOMINIUM_FILE_BYTES {
        return Err(ApiError::validation("O ficheiro excede 10 MB"));
    }

    Ok(CondominiumUploadedFile {
        original_name,
        mime_type,
        bytes: bytes.to_vec(),
    })
}

async fn write_condominium_file(
    state: &AppState,
    storage_key: &str,
    bytes: &[u8],
) -> Result<(), ApiError> {
    let directory = state.config.document_storage_path.clone();
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel preparar armazenamento"))?;
    tokio::fs::write(directory.join(storage_key), bytes)
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel guardar o ficheiro"))
}

fn safe_file_name(value: &str) -> String {
    let normalized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_') {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();

    if normalized.is_empty() {
        "ficheiro.bin".to_string()
    } else {
        normalized
    }
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

fn default_page() -> usize {
    1
}

fn default_page_size() -> usize {
    50
}
