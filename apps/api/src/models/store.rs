use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::demo::DemoData;

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStore {
    pub version: VersionInfo,
    #[serde(default = "default_tenants")]
    pub tenants: Vec<Tenant>,
    pub users: Vec<UserAccount>,
    pub sessions: Vec<Session>,
    pub active_condominium: String,
    pub condominiums: Vec<Condominium>,
    #[serde(default)]
    pub buildings: Vec<Building>,
    #[serde(default)]
    pub fractions: Vec<Fraction>,
    #[serde(default)]
    pub residents: Vec<Resident>,
    pub tickets: Vec<Ticket>,
    #[serde(default)]
    pub chat_messages: Vec<ChatMessage>,
    #[serde(default)]
    pub ocorrencias: Vec<Ocorrencia>,
    #[serde(default)]
    pub ocorrencia_comentarios: Vec<OcorrenciaComentario>,
    #[serde(default)]
    pub ocorrencia_anexos: Vec<OcorrenciaAnexo>,
    pub suppliers: Vec<Supplier>,
    pub documents: Vec<Document>,
    pub reports: Vec<Report>,
    pub maintenance: Vec<MaintenanceItem>,
    #[serde(default)]
    pub inspections: Vec<Inspection>,
    #[serde(default, rename = "calendarEvents")]
    pub calendar_events: Vec<CalendarEvent>,
    pub assemblies: Vec<Assembly>,
    pub payments: Vec<PaymentSummary>,
    #[serde(default)]
    pub quotas: Vec<Quota>,
    #[serde(default, rename = "accountingPayments")]
    pub accounting_payments: Vec<AccountingPayment>,
    #[serde(default)]
    pub debts: Vec<Debt>,
    #[serde(default)]
    pub receipts: Vec<Receipt>,
    #[serde(default)]
    pub expenses: Vec<Expense>,
    #[serde(default, rename = "reserveFunds")]
    pub reserve_funds: Vec<ReserveFund>,
    #[serde(default, rename = "paymentAgreements")]
    pub payment_agreements: Vec<PaymentAgreement>,
    #[serde(default, rename = "cashMovements")]
    pub cash_movements: Vec<CashMovement>,
    #[serde(default, rename = "bankTransactions")]
    pub bank_transactions: Vec<BankTransaction>,
    #[serde(default, rename = "bankReconciliations")]
    pub bank_reconciliations: Vec<BankReconciliation>,
    #[serde(default, rename = "auditLog")]
    pub audit_log: Vec<AuditLogEntry>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInfo {
    pub name: String,
    pub version: String,
    pub environment: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tenant {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserAccount {
    pub id: String,
    #[serde(default = "default_tenant_id")]
    pub tenant_id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub password_hash: String,
    #[serde(default)]
    pub active_condominium: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub active_condominium: String,
    pub active_condominiums: usize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub token: String,
    #[serde(default)]
    pub refresh_token: String,
    pub user_id: String,
    #[serde(default = "default_tenant_id")]
    pub tenant_id: String,
    #[serde(default)]
    pub active_condominium: String,
    #[serde(default = "default_app_context")]
    pub app_context: String,
    pub created_at: DateTime<Utc>,
    #[serde(default = "now_utc")]
    pub expires_at: DateTime<Utc>,
    #[serde(default = "now_utc")]
    pub refresh_expires_at: DateTime<Utc>,
}

fn default_app_context() -> String {
    "hq".to_string()
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Condominium {
    pub id: String,
    pub name: String,
    pub location: String,
    pub buildings: u16,
    pub fractions: u16,
    pub residents: u16,
    pub status: String,
    pub notice: String,
    #[serde(default)]
    pub internal_code: String,
    #[serde(default)]
    pub external_reference: String,
    #[serde(default)]
    pub condominium_type: String,
    #[serde(default)]
    pub subtype: String,
    #[serde(default)]
    pub management_start_date: String,
    #[serde(default)]
    pub management_end_date: String,
    #[serde(default)]
    pub manager: String,
    #[serde(default)]
    pub team: String,
    #[serde(default)]
    pub management_company: String,
    #[serde(default)]
    pub short_description: String,
    #[serde(default)]
    pub administrative_notes: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub archived_at: Option<String>,
    #[serde(default)]
    pub address: CondominiumAddress,
    #[serde(default)]
    pub structure: CondominiumStructure,
    #[serde(default)]
    pub operational_status: CondominiumOperationalStatus,
    #[serde(default)]
    pub primary_image_url: String,
    #[serde(default)]
    pub blocks_detailed: Vec<CondominiumBlock>,
    #[serde(default)]
    pub floors_detailed: Vec<CondominiumFloor>,
    #[serde(default)]
    pub zones: Vec<CondominiumZone>,
    #[serde(default)]
    pub equipment: Vec<CondominiumEquipment>,
    #[serde(default)]
    pub contacts: Vec<CondominiumContact>,
    #[serde(default)]
    pub managed_documents: Vec<CondominiumManagedDocument>,
    #[serde(default)]
    pub media: Vec<CondominiumMedia>,
    #[serde(default)]
    pub plan_markers: Vec<CondominiumPlanMarker>,
    #[serde(default)]
    pub internal_notes_registry: Vec<CondominiumInternalNote>,
    #[serde(default)]
    pub history: Vec<CondominiumHistoryEvent>,
    #[serde(default)]
    pub onboarding_draft: Option<CondominiumOnboardingDraft>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumAddress {
    #[serde(default)]
    pub street: String,
    #[serde(default)]
    pub number: String,
    #[serde(default)]
    pub lot: String,
    #[serde(default)]
    pub address_block: String,
    #[serde(default)]
    pub postal_code: String,
    #[serde(default)]
    pub locality: String,
    #[serde(default)]
    pub parish: String,
    #[serde(default)]
    pub municipality: String,
    #[serde(default)]
    pub district: String,
    #[serde(default)]
    pub country: String,
    #[serde(default)]
    pub latitude: Option<f64>,
    #[serde(default)]
    pub longitude: Option<f64>,
    #[serde(default)]
    pub google_maps_url: String,
    #[serde(default)]
    pub apple_maps_url: String,
    #[serde(default)]
    pub access_notes: String,
    #[serde(default)]
    pub main_entry_point: String,
    #[serde(default)]
    pub technical_entry_point: String,
    #[serde(default)]
    pub garage_entry_point: String,
    #[serde(default)]
    pub access_restrictions: String,
    #[serde(default)]
    pub visual_reference: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumStructure {
    #[serde(default)]
    pub total_fractions: u16,
    #[serde(default)]
    pub residential_fractions: u16,
    #[serde(default)]
    pub commercial_fractions: u16,
    #[serde(default)]
    pub garages_count: u16,
    #[serde(default)]
    pub storage_units_count: u16,
    #[serde(default)]
    pub shops_count: u16,
    #[serde(default)]
    pub blocks_count: u16,
    #[serde(default)]
    pub entrances_count: u16,
    #[serde(default)]
    pub floors_above_ground: u16,
    #[serde(default)]
    pub basements_count: u16,
    #[serde(default)]
    pub technical_floors_count: u16,
    #[serde(default)]
    pub elevators_count: u16,
    #[serde(default)]
    pub stairs_count: u16,
    #[serde(default)]
    pub parking_spaces_count: u16,
    #[serde(default)]
    pub has_garden: bool,
    #[serde(default)]
    pub has_pool: bool,
    #[serde(default)]
    pub has_condominium_room: bool,
    #[serde(default)]
    pub has_trash_house: bool,
    #[serde(default)]
    pub has_accessible_roof: bool,
    #[serde(default)]
    pub has_technical_roof: bool,
    #[serde(default)]
    pub has_solar_panels: bool,
    #[serde(default)]
    pub has_cctv: bool,
    #[serde(default)]
    pub has_porter_desk: bool,
    #[serde(default)]
    pub has_doorman: bool,
    #[serde(default)]
    pub has_security: bool,
    #[serde(default)]
    pub construction_year: Option<u16>,
    #[serde(default)]
    pub last_renovation_year: Option<u16>,
    #[serde(default)]
    pub common_area_estimate: String,
    #[serde(default)]
    pub structural_notes: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumOperationalStatus {
    pub general_status: String,
    pub alert_level: String,
    pub summary: String,
    pub reason: String,
    pub updated_by: String,
    pub updated_at: String,
}

impl Default for CondominiumOperationalStatus {
    fn default() -> Self {
        Self {
            general_status: "normal".to_string(),
            alert_level: "verde".to_string(),
            summary: "Sem alertas relevantes".to_string(),
            reason: String::new(),
            updated_by: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumBlock {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub code: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub specific_address: String,
    #[serde(default)]
    pub main_entry: String,
    #[serde(default)]
    pub floors_count: u16,
    #[serde(default)]
    pub basements_count: u16,
    #[serde(default)]
    pub fractions_count: u16,
    #[serde(default)]
    pub elevators_count: u16,
    #[serde(default)]
    pub stairs_count: u16,
    #[serde(default)]
    pub garages_count: u16,
    #[serde(default)]
    pub operational_status: String,
    #[serde(default)]
    pub access_notes: String,
    #[serde(default)]
    pub internal_notes: String,
    #[serde(default)]
    pub archived: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumFloor {
    pub id: String,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub number: String,
    #[serde(default)]
    pub floor_type: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub fractions_count: u16,
    #[serde(default)]
    pub operational_status: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumZone {
    pub id: String,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub floor_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub zone_type: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub operational_status: String,
    #[serde(default)]
    pub alert_level: String,
    #[serde(default)]
    pub qr_code_reference: String,
    #[serde(default)]
    pub public_qr_url: String,
    #[serde(default)]
    pub internal_location: String,
    #[serde(default)]
    pub access_notes: String,
    #[serde(default)]
    pub technical_notes: String,
    #[serde(default)]
    pub image_url: String,
    #[serde(default)]
    pub plan_url: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumEquipment {
    pub id: String,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub floor_id: String,
    #[serde(default)]
    pub zone_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub equipment_type: String,
    #[serde(default)]
    pub brand: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub serial_number: String,
    #[serde(default)]
    pub internal_reference: String,
    #[serde(default)]
    pub supplier: String,
    #[serde(default)]
    pub maintenance_company: String,
    #[serde(default)]
    pub installation_date: String,
    #[serde(default)]
    pub last_maintenance_date: String,
    #[serde(default)]
    pub next_maintenance_date: String,
    #[serde(default)]
    pub maintenance_frequency: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub criticality: String,
    #[serde(default)]
    pub warranty_until: String,
    #[serde(default)]
    pub contract_reference: String,
    #[serde(default)]
    pub technical_notes: String,
    #[serde(default)]
    pub document_ids: Vec<String>,
    #[serde(default)]
    pub media_ids: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumContact {
    pub id: String,
    #[serde(default)]
    pub contact_type: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub alternate_phone: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub schedule: String,
    #[serde(default)]
    pub service: String,
    #[serde(default)]
    pub is_emergency: bool,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub favorite: bool,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub contract_reference: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumManagedDocument {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub document_type: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub file_name: String,
    #[serde(default)]
    pub file_url: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub size_bytes: u64,
    #[serde(default)]
    pub storage_key: String,
    #[serde(default)]
    pub download_url: String,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub zone_id: String,
    #[serde(default)]
    pub equipment_id: String,
    #[serde(default)]
    pub document_date: String,
    #[serde(default)]
    pub expiry_date: String,
    #[serde(default)]
    pub uploaded_by: String,
    #[serde(default)]
    pub uploaded_at: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumMedia {
    pub id: String,
    #[serde(default)]
    pub media_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub file_name: String,
    #[serde(default)]
    pub file_url: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub size_bytes: u64,
    #[serde(default)]
    pub storage_key: String,
    #[serde(default)]
    pub download_url: String,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub floor_id: String,
    #[serde(default)]
    pub zone_id: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub is_primary: bool,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumPlanMarker {
    pub id: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub marker_type: String,
    #[serde(default)]
    pub x_percent: f64,
    #[serde(default)]
    pub y_percent: f64,
    #[serde(default)]
    pub block_id: String,
    #[serde(default)]
    pub floor_id: String,
    #[serde(default)]
    pub zone_id: String,
    #[serde(default)]
    pub equipment_id: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumInternalNote {
    pub id: String,
    #[serde(default)]
    pub note_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub created_by: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub visibility: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub pinned: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumHistoryEvent {
    pub id: String,
    #[serde(default)]
    pub event_type: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub user_name: String,
    #[serde(default)]
    pub timestamp: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub old_data: String,
    #[serde(default)]
    pub new_data: String,
    #[serde(default)]
    pub entity: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumOnboardingDraft {
    #[serde(default)]
    pub current_step: u8,
    #[serde(default)]
    pub completed_steps: Vec<u8>,
    #[serde(default)]
    pub is_quick_mode: bool,
    #[serde(default)]
    pub saved_at: String,
}

impl Condominium {
    pub fn ensure_profile_defaults(&mut self) {
        if self.internal_code.trim().is_empty() {
            self.internal_code = generated_condominium_internal_code(&self.name, &self.id);
        }
        if self.condominium_type.trim().is_empty() {
            self.condominium_type = "residencial".to_string();
        }
        if self.status.trim().is_empty() {
            self.status = "ativo".to_string();
        }
        if self.notice.trim().is_empty() {
            self.notice = "Sem avisos criticos".to_string();
        }
        if self.address.locality.trim().is_empty() {
            self.address.locality = self.location.clone();
        }
        if self.address.country.trim().is_empty() {
            self.address.country = "Portugal".to_string();
        }
        if self.operational_status.updated_at.trim().is_empty() {
            self.operational_status.updated_at = Utc::now().to_rfc3339();
        }
        if self.structure.total_fractions == 0 {
            self.structure.total_fractions = self.fractions;
        }
        if self.structure.blocks_count == 0 {
            self.structure.blocks_count = self.buildings;
        }
        if self.created_at.trim().is_empty() {
            self.created_at = Utc::now().to_rfc3339();
        }
        if self.updated_at.trim().is_empty() {
            self.updated_at = self.created_at.clone();
        }
    }

    pub fn touch(&mut self) {
        self.updated_at = Utc::now().to_rfc3339();
    }

    #[allow(clippy::too_many_arguments)]
    pub fn push_history(
        &mut self,
        event_type: impl Into<String>,
        description: impl Into<String>,
        user_name: impl Into<String>,
        entity: impl Into<String>,
        old_data: impl Into<String>,
        new_data: impl Into<String>,
        source: impl Into<String>,
    ) {
        self.history.insert(
            0,
            CondominiumHistoryEvent {
                id: Uuid::new_v4().to_string(),
                event_type: event_type.into(),
                description: description.into(),
                user_name: user_name.into(),
                timestamp: Utc::now().to_rfc3339(),
                source: source.into(),
                old_data: old_data.into(),
                new_data: new_data.into(),
                entity: entity.into(),
            },
        );
        self.history.truncate(300);
        self.touch();
    }
}

fn generated_condominium_internal_code(name: &str, id: &str) -> String {
    let base = internal_code_slug(name);
    let suffix = id
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .take(8)
        .collect::<String>()
        .to_ascii_uppercase();

    match (base.is_empty(), suffix.is_empty()) {
        (false, false) => format!("COND-{base}-{suffix}"),
        (false, true) => format!("COND-{base}"),
        (true, false) => format!("COND-{suffix}"),
        (true, true) => "COND-SEM-CODIGO".to_string(),
    }
}

fn internal_code_slug(value: &str) -> String {
    let mut slug = String::new();

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_uppercase());
        } else if !slug.ends_with('-') && !slug.is_empty() {
            slug.push('-');
        }

        if slug.len() >= 16 {
            break;
        }
    }

    slug.trim_matches('-').to_string()
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Building {
    pub id: String,
    pub condominium: String,
    pub name: String,
    pub floors: u16,
    pub fractions: u16,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fraction {
    pub id: String,
    pub condominium: String,
    pub building: String,
    pub number: String,
    pub floor: String,
    pub typology: String,
    pub owner: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Resident {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub condominium: String,
    pub fraction: String,
    pub status: String,
}

// ── Tipos enumerados para Ocorrencias ──

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum OcorrenciaTipo {
    #[default]
    Avaria,
    Pedido,
    Reclamacao,
    Pergunta,
    TarefaInterna,
}

impl OcorrenciaTipo {
    pub fn as_str(&self) -> &'static str {
        match self {
            OcorrenciaTipo::Avaria => "Avaria",
            OcorrenciaTipo::Pedido => "Pedido",
            OcorrenciaTipo::Reclamacao => "Reclamacao",
            OcorrenciaTipo::Pergunta => "Pergunta",
            OcorrenciaTipo::TarefaInterna => "Tarefa Interna",
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum OcorrenciaStatus {
    #[default]
    Nova,
    EmTriagem,
    AguardaPecas,
    EmCurso,
    Pendente,
    Resolvida,
    Fechada,
    Reaberta,
}

impl OcorrenciaStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OcorrenciaStatus::Nova => "Nova",
            OcorrenciaStatus::EmTriagem => "Em Triagem",
            OcorrenciaStatus::AguardaPecas => "Aguarda Pecas",
            OcorrenciaStatus::EmCurso => "Em Curso",
            OcorrenciaStatus::Pendente => "Pendente",
            OcorrenciaStatus::Resolvida => "Resolvida",
            OcorrenciaStatus::Fechada => "Fechada",
            OcorrenciaStatus::Reaberta => "Reaberta",
        }
    }
    pub fn transicoes_validas(&self) -> Vec<OcorrenciaStatus> {
        match self {
            OcorrenciaStatus::Nova => vec![
                OcorrenciaStatus::EmTriagem,
                OcorrenciaStatus::EmCurso,
                OcorrenciaStatus::Fechada,
            ],
            OcorrenciaStatus::EmTriagem => vec![
                OcorrenciaStatus::EmCurso,
                OcorrenciaStatus::AguardaPecas,
                OcorrenciaStatus::Fechada,
            ],
            OcorrenciaStatus::AguardaPecas => {
                vec![OcorrenciaStatus::EmCurso, OcorrenciaStatus::Pendente]
            }
            OcorrenciaStatus::EmCurso => {
                vec![OcorrenciaStatus::Pendente, OcorrenciaStatus::Resolvida]
            }
            OcorrenciaStatus::Pendente => {
                vec![OcorrenciaStatus::EmCurso, OcorrenciaStatus::Fechada]
            }
            OcorrenciaStatus::Resolvida => {
                vec![OcorrenciaStatus::Fechada, OcorrenciaStatus::Reaberta]
            }
            OcorrenciaStatus::Fechada => vec![OcorrenciaStatus::Reaberta],
            OcorrenciaStatus::Reaberta => {
                vec![OcorrenciaStatus::EmCurso, OcorrenciaStatus::EmTriagem]
            }
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Prioridade {
    Baixa,
    #[default]
    Normal,
    Alta,
    Urgente,
}

impl Prioridade {
    pub fn as_str(&self) -> &'static str {
        match self {
            Prioridade::Baixa => "Baixa",
            Prioridade::Normal => "Normal",
            Prioridade::Alta => "Alta",
            Prioridade::Urgente => "Urgente",
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Impacto {
    Baixo,
    #[default]
    Medio,
    Alto,
    Critico,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Urgencia {
    Baixa,
    #[default]
    Media,
    Alta,
    Imediata,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Canal {
    #[default]
    Portal,
    Email,
    Telefone,
    Presencial,
    Interno,
}

impl Canal {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Canal::Portal => "Portal",
            Canal::Email => "Email",
            Canal::Telefone => "Telefone",
            Canal::Presencial => "Presencial",
            Canal::Interno => "Interno",
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ComentarioVisibilidade {
    #[default]
    Interno,
    Publico,
}

// ── Ocorrencia (unificada: Avaria + Pedido + Reclamacao + Pergunta) ──

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerChecklistItem {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ocorrencia {
    pub id: String,
    pub titulo: String,
    pub tipo: OcorrenciaTipo,
    pub status: OcorrenciaStatus,
    #[serde(default)]
    pub prioridade: Prioridade,
    #[serde(default)]
    pub impacto: Impacto,
    #[serde(default)]
    pub urgencia: Urgencia,
    #[serde(default)]
    pub descricao: String,
    #[serde(default)]
    pub condominium_id: String,
    #[serde(default)]
    pub requisitante_nome: String,
    #[serde(default)]
    pub requisitante_email: String,
    #[serde(default)]
    pub requisitante_telefone: String,
    #[serde(default)]
    pub canal: Canal,
    #[serde(default)]
    pub categoria: String,
    #[serde(default)]
    pub atribuido_a: String,
    #[serde(default)]
    pub tags: Vec<String>,
    // ── Específicos de Avaria ──
    #[serde(default)]
    pub bloco_id: String,
    #[serde(default)]
    pub piso_id: String,
    #[serde(default)]
    pub zona_id: String,
    #[serde(default)]
    pub equipamento_id: String,
    #[serde(default)]
    pub custo_estimado: String,
    #[serde(default)]
    pub custo_final: String,
    #[serde(default)]
    pub fornecedor_id: String,
    #[serde(default)]
    pub referencia_contrato: String,
    #[serde(default)]
    pub media_ids: Vec<String>,
    #[serde(default)]
    pub documento_ids: Vec<String>,
    #[serde(default)]
    pub motivo_resolucao: String,
    // ── SLA ──
    #[serde(default)]
    pub sla_resposta_em: String,
    #[serde(default)]
    pub sla_resolucao_em: String,
    #[serde(default)]
    pub respondido_em: String,
    #[serde(default)]
    pub resolvido_em: String,
    #[serde(default)]
    pub fechado_em: String,
    #[serde(default)]
    pub token_acompanhamento: String,
    #[serde(default = "default_origin_channel")]
    pub origin_channel: String,
    #[serde(default)]
    pub public_status_text: String,
    #[serde(default)]
    pub technical_notes: String,
    #[serde(default)]
    pub assigned_worker_id: String,
    #[serde(default)]
    pub work_started_at: String,
    #[serde(default)]
    pub work_paused_at: String,
    #[serde(default)]
    pub arrived_at: String,
    #[serde(default)]
    pub resolved_by_worker_at: String,
    #[serde(default)]
    pub resolution_summary: String,
    #[serde(default)]
    pub worker_checklist: Vec<WorkerChecklistItem>,
    #[serde(default)]
    pub worker_time_minutes: u32,
    #[serde(default)]
    pub requires_hq_validation: bool,
    #[serde(default)]
    pub hq_validation_status: String,
    #[serde(default)]
    pub hq_validation_notes: String,
    #[serde(default)]
    pub public_timeline_status: String,
    #[serde(default)]
    pub qr_source_type: String,
    #[serde(default)]
    pub qr_source_id: String,
    // ── Timestamps ──
    #[serde(default = "now_utc_string")]
    pub criado_em: String,
    #[serde(default = "now_utc_string")]
    pub atualizado_em: String,
}

fn default_origin_channel() -> String {
    "hq".to_string()
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaComentario {
    pub id: String,
    pub ocorrencia_id: String,
    pub autor_id: String,
    pub autor_nome: String,
    pub texto: String,
    #[serde(default)]
    pub visibilidade: ComentarioVisibilidade,
    #[serde(default = "now_utc_string")]
    pub criado_em: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaAnexo {
    pub id: String,
    pub ocorrencia_id: String,
    pub nome: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub tamanho_bytes: u64,
    #[serde(default)]
    pub storage_key: String,
    #[serde(default)]
    pub uploaded_por: String,
    #[serde(default = "default_attachment_kind")]
    pub kind: String,
    #[serde(default = "default_attachment_visibility")]
    pub visibility: String,
    #[serde(default = "now_utc_string")]
    pub criado_em: String,
}

fn default_attachment_kind() -> String {
    "document".to_string()
}

fn default_attachment_visibility() -> String {
    "internal".to_string()
}

pub fn default_worker_checklist(category: &str) -> Vec<WorkerChecklistItem> {
    let normalized = category.to_lowercase();
    let labels: Vec<&str> = if normalized.contains("elev") {
        vec![
            "Confirmar seguranca do elevador",
            "Verificar quadro/comando",
            "Registar teste final",
        ]
    } else if normalized.contains("infil") || normalized.contains("agua") {
        vec![
            "Identificar origem da infiltracao",
            "Fotografar zona afetada",
            "Indicar reparacao necessaria",
        ]
    } else if normalized.contains("eletr") || normalized.contains("electric") {
        vec![
            "Cortar/validar seguranca eletrica",
            "Testar ponto afetado",
            "Confirmar reposicao de servico",
        ]
    } else if normalized.contains("limp") {
        vec![
            "Confirmar area afetada",
            "Executar limpeza/correcao",
            "Fotografar resultado final",
        ]
    } else {
        vec![
            "Confirmar local e seguranca",
            "Executar intervencao",
            "Registar conclusao e evidencias",
        ]
    };

    labels
        .into_iter()
        .enumerate()
        .map(|(index, label)| WorkerChecklistItem {
            id: format!("step-{}", index + 1),
            label: label.to_string(),
            done: false,
            note: String::new(),
        })
        .collect()
}

// ── Ticket legacy ──

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub condominium: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub requester_name: String,
    #[serde(default)]
    pub requester_email: String,
    #[serde(default)]
    pub channel: String,
    #[serde(default, rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub assignee: String,
    #[serde(default)]
    pub due_at: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub resolved_at: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub linked_maintenance_id: String,
    #[serde(default)]
    pub linked_calendar_event_id: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub text: String,
    pub sender_name: String,
    pub sender_role: String,
    #[serde(default)]
    pub source_app: String,
    #[serde(default = "now_utc_string")]
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Supplier {
    pub id: String,
    pub name: String,
    pub category: String,
    pub status: String,
    pub contact: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub condominium: String,
    pub status: String,
    #[serde(default)]
    pub file_name: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub size_bytes: u64,
    #[serde(default)]
    pub storage_key: String,
    #[serde(default)]
    pub uploaded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub id: String,
    pub title: String,
    pub period: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceItem {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub condominium: String,
    #[serde(default)]
    pub supplier: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub equipment_id: String,
    #[serde(default)]
    pub zone_id: String,
    #[serde(default)]
    pub ticket_id: String,
    #[serde(default)]
    pub calendar_event_id: String,
    #[serde(default, rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub scheduled_start: String,
    #[serde(default)]
    pub scheduled_end: String,
    #[serde(default)]
    pub completed_at: String,
    #[serde(default)]
    pub cost_estimate: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inspection {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub condominium: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub required_date: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub result: String,
    #[serde(default)]
    pub checklist: Vec<String>,
    #[serde(default)]
    pub worker_notes: String,
    #[serde(default)]
    pub hq_notes: String,
    #[serde(default)]
    pub submitted_at: String,
    #[serde(default)]
    pub confirmed_at: String,
    #[serde(default)]
    pub confirmed_by: String,
    #[serde(default)]
    pub calendar_event_id: String,
    #[serde(default)]
    pub assigned_worker_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub event_type: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub start_at: String,
    #[serde(default)]
    pub end_at: String,
    #[serde(default)]
    pub condominium: String,
    #[serde(default)]
    pub linked_entity_type: String,
    #[serde(default)]
    pub linked_entity_id: String,
    #[serde(default)]
    pub attendees: Vec<String>,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Assembly {
    pub id: String,
    pub title: String,
    pub condominium: String,
    pub date: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentSummary {
    pub label: String,
    pub value: String,
    pub detail: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Quota {
    pub id: String,
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    pub period: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountingPayment {
    pub id: String,
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub paid_at: String,
    pub method: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Debt {
    pub id: String,
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub days_overdue: u16,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub id: String,
    pub number: String,
    pub condominium: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub issued_at: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: String,
    pub condominium: String,
    pub category: String,
    pub supplier: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReserveFund {
    pub id: String,
    pub condominium: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub balance: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    pub monthly_change: Decimal,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentAgreementInstallment {
    pub installment_number: u16,
    pub due_date: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub status: String,
    #[serde(default)]
    pub payment_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentAgreement {
    pub id: String,
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    pub debt_id: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub total_amount: Decimal,
    pub installment_count: u16,
    #[serde(with = "rust_decimal::serde::float")]
    pub installment_amount: Decimal,
    pub next_due_date: String,
    pub status: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub installments: Vec<PaymentAgreementInstallment>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashMovement {
    pub id: String,
    pub condominium: String,
    pub movement_type: String,
    pub account_type: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub occurred_at: String,
    pub source: String,
    pub method: String,
    #[serde(default)]
    pub reference: String,
    pub status: String,
    #[serde(default)]
    pub linked_entity_type: String,
    #[serde(default)]
    pub linked_entity_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BankTransaction {
    pub id: String,
    pub condominium: String,
    pub occurred_at: String,
    pub description: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub direction: String,
    #[serde(default)]
    pub reference: String,
    pub reconciliation_status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BankReconciliation {
    pub id: String,
    pub bank_transaction_id: String,
    pub target_type: String,
    pub target_id: String,
    #[serde(default)]
    pub notes: String,
    pub reconciled_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerStatementEntry {
    pub id: String,
    pub entry_type: String,
    pub date: String,
    pub description: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub debit: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    pub credit: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    pub balance: Decimal,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountingSummary {
    #[serde(with = "rust_decimal::serde::float")]
    pub current_balance: Decimal,
    pub paid_quota_percentage: u8,
    #[serde(with = "rust_decimal::serde::float")]
    pub overdue_amount: Decimal,
    pub overdue_count: usize,
    #[serde(with = "rust_decimal::serde::float")]
    pub monthly_expenses: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    pub reserve_fund: Decimal,
    pub currency: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub module: String,
    pub action: String,
    pub record_id: String,
    pub summary: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMetric {
    pub value: String,
    pub label: String,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardModule {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub tone: String,
    pub cta: String,
    pub path: String,
    pub visual: String,
    pub metrics: Vec<DashboardMetric>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardAlert {
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub tone: String,
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationalSummaryItem {
    pub label: String,
    pub tone: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickAction {
    pub title: String,
    pub description: String,
    pub icon: String,
    pub tone: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UrgentNotice {
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub priority: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciasMetricas {
    pub total_abertas: usize,
    pub urgentes: usize,
    pub total_avarias: usize,
    pub mttr_segundos: f64,
    pub aging_max_dias: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardResponse {
    pub user: PublicUser,
    pub active_condominium: String,
    pub urgent_notice: UrgentNotice,
    pub operational_summary: Vec<OperationalSummaryItem>,
    pub quick_actions: Vec<QuickAction>,
    pub dashboard_modules: Vec<DashboardModule>,
    pub alerts: Vec<DashboardAlert>,
}

impl AppStore {
    pub fn seed_from_demo(demo: &DemoData, password_hash: String) -> Self {
        let tenant_id = default_tenant_id();
        Self {
            version: VersionInfo {
                name: demo.version.name.clone(),
                version: demo.version.version.clone(),
                environment: "local-json".to_string(),
            },
            tenants: default_tenants(),
            users: vec![UserAccount {
                id: Uuid::new_v4().to_string(),
                tenant_id: tenant_id.clone(),
                name: demo.user.name.clone(),
                email: "admin@gestisac.pt".to_string(),
                role: demo.user.role.clone(),
                password_hash,
                active_condominium: demo.active_condominium.clone(),
            }],
            sessions: Vec::new(),
            active_condominium: demo.active_condominium.clone(),
            condominiums: demo
                .condominiums
                .iter()
                .map(|item| {
                    let mut condominium = Condominium {
                        id: Uuid::new_v4().to_string(),
                        name: item.name.clone(),
                        location: item.location.clone(),
                        buildings: item.buildings,
                        fractions: item.fractions,
                        residents: item.residents,
                        status: item.status.clone(),
                        notice: item.notice.clone(),
                        manager: demo.user.name.clone(),
                        team: "Equipa GESTISAC".to_string(),
                        management_company: "GESTISAC".to_string(),
                        address: CondominiumAddress {
                            locality: item.location.clone(),
                            country: "Portugal".to_string(),
                            ..Default::default()
                        },
                        structure: CondominiumStructure {
                            total_fractions: item.fractions,
                            blocks_count: item.buildings,
                            ..Default::default()
                        },
                        operational_status: CondominiumOperationalStatus {
                            general_status: "normal".to_string(),
                            alert_level: "verde".to_string(),
                            summary: item.notice.clone(),
                            reason: String::new(),
                            updated_by: demo.user.name.clone(),
                            updated_at: Utc::now().to_rfc3339(),
                        },
                        ..Default::default()
                    };
                    condominium.ensure_profile_defaults();
                    condominium
                })
                .collect(),
            buildings: default_buildings(&demo.active_condominium),
            fractions: default_fractions(&demo.active_condominium),
            residents: default_residents(&demo.active_condominium),
            tickets: demo
                .tickets
                .iter()
                .enumerate()
                .map(|(index, item)| Ticket {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    condominium: item.condominium.clone(),
                    priority: normalize_demo_priority(&item.priority),
                    status: normalize_demo_ticket_status(&item.status),
                    detail: item.status.clone(),
                    requester_name: if index == 0 {
                        "Carlos Almeida".to_string()
                    } else {
                        "Maria Fernandes".to_string()
                    },
                    requester_email: if index == 0 {
                        "carlos.almeida@example.pt".to_string()
                    } else {
                        "maria.fernandes@example.pt".to_string()
                    },
                    channel: "Portal".to_string(),
                    kind: if item.title.to_lowercase().contains("avaria") {
                        "Avaria".to_string()
                    } else {
                        "Pedido".to_string()
                    },
                    category: if item.title.to_lowercase().contains("elevador") {
                        "Elevadores".to_string()
                    } else {
                        "Infraestrutura".to_string()
                    },
                    assignee: demo.user.name.clone(),
                    due_at: "2026-05-22T18:00:00Z".to_string(),
                    created_at: item.updated_at.clone(),
                    resolved_at: if item.status.to_lowercase().contains("resolvido") {
                        item.updated_at.clone()
                    } else {
                        String::new()
                    },
                    tags: vec!["operacional".to_string(), "condominio".to_string()],
                    linked_maintenance_id: String::new(),
                    linked_calendar_event_id: String::new(),
                    updated_at: item.updated_at.clone(),
                })
                .collect(),
            chat_messages: Vec::new(),
            ocorrencias: demo
                .tickets
                .iter()
                .enumerate()
                .map(|(index, item)| {
                    let is_avaria = item.title.to_lowercase().contains("avaria");
                    let prioridade = if item.priority.to_lowercase().contains("urg")
                        || item.priority.to_lowercase().contains("crit")
                    {
                        Prioridade::Urgente
                    } else if item.priority.to_lowercase().contains("alta")
                        || item.priority.to_lowercase().contains("import")
                    {
                        Prioridade::Alta
                    } else if item.priority.to_lowercase().contains("baix") {
                        Prioridade::Baixa
                    } else {
                        Prioridade::Normal
                    };
                    let status = if item.status.to_lowercase().contains("resol")
                        || item.status.to_lowercase().contains("fech")
                    {
                        OcorrenciaStatus::Resolvida
                    } else if item.status.to_lowercase().contains("fornecedor")
                        || item.status.to_lowercase().contains("curso")
                    {
                        OcorrenciaStatus::EmCurso
                    } else if item.status.to_lowercase().contains("analise")
                        || item.status.to_lowercase().contains("pend")
                    {
                        OcorrenciaStatus::Pendente
                    } else {
                        OcorrenciaStatus::Nova
                    };
                    let resolved_at = if item.status.to_lowercase().contains("resolvido") {
                        item.updated_at.clone()
                    } else {
                        String::new()
                    };
                    let impacto = if prioridade == Prioridade::Urgente {
                        Impacto::Critico
                    } else {
                        Impacto::Medio
                    };
                    let urgencia = if prioridade == Prioridade::Urgente {
                        Urgencia::Imediata
                    } else {
                        Urgencia::Media
                    };
                    Ocorrencia {
                        id: Uuid::new_v4().to_string(),
                        titulo: item.title.clone(),
                        tipo: if is_avaria {
                            OcorrenciaTipo::Avaria
                        } else {
                            OcorrenciaTipo::Pedido
                        },
                        status,
                        prioridade,
                        impacto,
                        urgencia,
                        descricao: item.status.clone(),
                        condominium_id: item.condominium.clone(),
                        requisitante_nome: if index == 0 {
                            "Carlos Almeida".to_string()
                        } else {
                            "Maria Fernandes".to_string()
                        },
                        requisitante_email: if index == 0 {
                            "carlos.almeida@example.pt".to_string()
                        } else {
                            "maria.fernandes@example.pt".to_string()
                        },
                        requisitante_telefone: String::new(),
                        canal: Canal::Portal,
                        categoria: if item.title.to_lowercase().contains("elevador") {
                            "Elevadores".to_string()
                        } else {
                            "Infraestrutura".to_string()
                        },
                        atribuido_a: demo.user.name.clone(),
                        tags: vec!["operacional".to_string(), "condominio".to_string()],
                        bloco_id: String::new(),
                        piso_id: String::new(),
                        zona_id: String::new(),
                        equipamento_id: if is_avaria {
                            "elevador-bloco-b".to_string()
                        } else {
                            String::new()
                        },
                        custo_estimado: String::new(),
                        custo_final: String::new(),
                        fornecedor_id: String::new(),
                        referencia_contrato: String::new(),
                        media_ids: vec![],
                        documento_ids: vec![],
                        motivo_resolucao: String::new(),
                        sla_resposta_em: "2026-05-20T18:00:00Z".to_string(),
                        sla_resolucao_em: "2026-05-25T18:00:00Z".to_string(),
                        respondido_em: String::new(),
                        resolvido_em: resolved_at,
                        fechado_em: String::new(),
                        token_acompanhamento: String::new(),
                        origin_channel: "hq".to_string(),
                        public_status_text: "Em analise".to_string(),
                        technical_notes: String::new(),
                        assigned_worker_id: String::new(),
                        work_started_at: String::new(),
                        work_paused_at: String::new(),
                        arrived_at: String::new(),
                        resolved_by_worker_at: String::new(),
                        resolution_summary: String::new(),
                        worker_checklist: default_worker_checklist(&if is_avaria {
                            "Elevadores".to_string()
                        } else {
                            "Infraestrutura".to_string()
                        }),
                        worker_time_minutes: 0,
                        requires_hq_validation: false,
                        hq_validation_status: "nao_requerida".to_string(),
                        hq_validation_notes: String::new(),
                        public_timeline_status: "Recebida".to_string(),
                        qr_source_type: String::new(),
                        qr_source_id: String::new(),
                        criado_em: item.updated_at.clone(),
                        atualizado_em: item.updated_at.clone(),
                    }
                })
                .collect(),
            ocorrencia_comentarios: Vec::new(),
            ocorrencia_anexos: Vec::new(),
            suppliers: demo
                .suppliers
                .iter()
                .map(|item| Supplier {
                    id: Uuid::new_v4().to_string(),
                    name: item.name.clone(),
                    category: item.category.clone(),
                    status: item.status.clone(),
                    contact: item.contact.clone(),
                })
                .collect(),
            documents: demo
                .documents
                .iter()
                .map(|item| Document {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    kind: item.kind.clone(),
                    condominium: item.condominium.clone(),
                    status: item.status.clone(),
                    file_name: String::new(),
                    mime_type: String::new(),
                    size_bytes: 0,
                    storage_key: String::new(),
                    uploaded_at: None,
                })
                .collect(),
            reports: demo
                .reports
                .iter()
                .map(|item| Report {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    period: item.period.clone(),
                    status: item.status.clone(),
                })
                .collect(),
            maintenance: demo
                .maintenance
                .iter()
                .map(|item| MaintenanceItem {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    condominium: demo.active_condominium.clone(),
                    supplier: item.supplier.clone(),
                    status: normalize_demo_maintenance_status(&item.status),
                    date: item.date.clone(),
                    equipment_id: "elevador-bloco-b".to_string(),
                    zone_id: "bloco-b".to_string(),
                    ticket_id: String::new(),
                    calendar_event_id: String::new(),
                    kind: if item.title.to_lowercase().contains("repar") {
                        "Corretiva".to_string()
                    } else {
                        "Preventiva".to_string()
                    },
                    priority: if item.status.to_lowercase().contains("urg") {
                        "Urgente".to_string()
                    } else {
                        "Normal".to_string()
                    },
                    scheduled_start: format!("{}T09:30:00Z", item.date),
                    scheduled_end: format!("{}T11:00:00Z", item.date),
                    completed_at: String::new(),
                    cost_estimate: "420.00".to_string(),
                    notes: "Intervencao operacional ligada a ocorrencias do condominio."
                        .to_string(),
                })
                .collect(),
            inspections: default_inspections(&demo.active_condominium),
            calendar_events: default_calendar_events(&demo.active_condominium),
            assemblies: demo
                .assemblies
                .iter()
                .map(|item| Assembly {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    condominium: item.condominium.clone(),
                    date: item.date.clone(),
                    status: item.status.clone(),
                })
                .collect(),
            payments: demo
                .payments
                .iter()
                .map(|item| PaymentSummary {
                    label: item.label.clone(),
                    value: item.value.clone(),
                    detail: item.detail.clone(),
                })
                .collect(),
            quotas: default_quotas(&demo.active_condominium),
            accounting_payments: default_accounting_payments(&demo.active_condominium),
            debts: default_debts(&demo.active_condominium),
            receipts: default_receipts(&demo.active_condominium),
            expenses: default_expenses(&demo.active_condominium),
            reserve_funds: default_reserve_funds(&demo.active_condominium),
            payment_agreements: default_payment_agreements(&demo.active_condominium),
            cash_movements: default_cash_movements(&demo.active_condominium),
            bank_transactions: default_bank_transactions(&demo.active_condominium),
            bank_reconciliations: Vec::new(),
            audit_log: Vec::new(),
        }
    }

    pub fn ensure_demo_defaults(&mut self, demo: &DemoData) {
        if self.tenants.is_empty() {
            self.tenants = default_tenants();
        }
        for user in &mut self.users {
            if user.tenant_id.is_empty() {
                user.tenant_id = default_tenant_id();
            }
            if user.active_condominium.is_empty() {
                user.active_condominium = self.active_condominium.clone();
            }
        }
        self.sessions
            .retain(|session| session.expires_at > Utc::now());
        for session in &mut self.sessions {
            if session.tenant_id.is_empty() {
                session.tenant_id = default_tenant_id();
            }
            if session.active_condominium.is_empty() {
                session.active_condominium = self.active_condominium.clone();
            }
        }
        for condominium in &mut self.condominiums {
            condominium.ensure_profile_defaults();
        }
        if self.buildings.is_empty() {
            self.buildings = default_buildings(&demo.active_condominium);
        }
        if self.fractions.is_empty() {
            self.fractions = default_fractions(&demo.active_condominium);
        }
        if self.residents.is_empty() {
            self.residents = default_residents(&demo.active_condominium);
        }
        if self.quotas.is_empty() {
            self.quotas = default_quotas(&demo.active_condominium);
        }
        if self.accounting_payments.is_empty() {
            self.accounting_payments = default_accounting_payments(&demo.active_condominium);
        }
        if self.debts.is_empty() {
            self.debts = default_debts(&demo.active_condominium);
        }
        if self.receipts.is_empty() {
            self.receipts = default_receipts(&demo.active_condominium);
        }
        if self.expenses.is_empty() {
            self.expenses = default_expenses(&demo.active_condominium);
        }
        if self.reserve_funds.is_empty() {
            self.reserve_funds = default_reserve_funds(&demo.active_condominium);
        }
        if self.payment_agreements.is_empty() {
            self.payment_agreements = default_payment_agreements(&demo.active_condominium);
        }
        if self.cash_movements.is_empty() {
            self.cash_movements = default_cash_movements(&demo.active_condominium);
        }
        if self.bank_transactions.is_empty() {
            self.bank_transactions = default_bank_transactions(&demo.active_condominium);
        }
        if self.calendar_events.is_empty() {
            self.calendar_events = default_calendar_events(&demo.active_condominium);
        }
        if self.inspections.is_empty() {
            self.inspections = default_inspections(&demo.active_condominium);
        }
    }

    pub fn add_audit(
        &mut self,
        user: &PublicUser,
        module: &str,
        action: &str,
        record_id: &str,
        summary: impl Into<String>,
    ) {
        self.audit_log.insert(
            0,
            AuditLogEntry {
                id: Uuid::new_v4().to_string(),
                user_id: user.id.clone(),
                user_name: user.name.clone(),
                module: module.to_string(),
                action: action.to_string(),
                record_id: record_id.to_string(),
                summary: summary.into(),
                created_at: Utc::now(),
            },
        );

        self.audit_log.truncate(250);
    }

    pub fn public_user(&self, user_id: &str) -> Option<PublicUser> {
        self.users
            .iter()
            .find(|user| user.id == user_id)
            .map(|user| PublicUser {
                id: user.id.clone(),
                tenant_id: user.tenant_id.clone(),
                name: user.name.clone(),
                email: user.email.clone(),
                role: user.role.clone(),
                active_condominium: user.active_condominium.clone(),
                active_condominiums: self.condominiums.len(),
            })
    }

    // ── Ocorrencias helpers ──

    pub fn ocorrencias_abertas(&self) -> Vec<&Ocorrencia> {
        self.ocorrencias
            .iter()
            .filter(|o| {
                o.status != OcorrenciaStatus::Resolvida && o.status != OcorrenciaStatus::Fechada
            })
            .collect()
    }

    pub fn ocorrencias_por_tipo(&self, tipo: &OcorrenciaTipo) -> Vec<&Ocorrencia> {
        self.ocorrencias
            .iter()
            .filter(|o| o.tipo == *tipo)
            .collect()
    }

    pub fn ocorrencias_urgentes(&self) -> Vec<&Ocorrencia> {
        self.ocorrencias
            .iter()
            .filter(|o| {
                o.prioridade == Prioridade::Alta
                    || o.prioridade == Prioridade::Urgente
                    || o.impacto == Impacto::Critico
                    || o.urgencia == Urgencia::Imediata
            })
            .filter(|o| {
                o.status != OcorrenciaStatus::Fechada && o.status != OcorrenciaStatus::Resolvida
            })
            .collect()
    }

    pub fn ocorrencias_mttr_segundos(&self) -> f64 {
        let resolvidas: Vec<&Ocorrencia> = self
            .ocorrencias
            .iter()
            .filter(|o| {
                o.status == OcorrenciaStatus::Resolvida
                    && !o.resolvido_em.is_empty()
                    && !o.criado_em.is_empty()
            })
            .collect();
        if resolvidas.is_empty() {
            return 0.0;
        }
        let total: i64 = resolvidas
            .iter()
            .filter_map(|o| {
                let criado = chrono::DateTime::parse_from_rfc3339(&o.criado_em).ok()?;
                let resolvido = chrono::DateTime::parse_from_rfc3339(&o.resolvido_em).ok()?;
                Some((resolvido - criado).num_seconds())
            })
            .sum();
        total as f64 / resolvidas.len() as f64
    }

    pub fn ocorrencias_metricas(&self) -> OcorrenciasMetricas {
        let abertas = self.ocorrencias_abertas();
        let urgentes = self.ocorrencias_urgentes();
        let avarias = self.ocorrencias_por_tipo(&OcorrenciaTipo::Avaria);
        let avarias_abertas: Vec<&Ocorrencia> = avarias
            .into_iter()
            .filter(|o| {
                o.status != OcorrenciaStatus::Fechada && o.status != OcorrenciaStatus::Resolvida
            })
            .collect();
        OcorrenciasMetricas {
            total_abertas: abertas.len(),
            urgentes: urgentes.len(),
            total_avarias: avarias_abertas.len(),
            mttr_segundos: self.ocorrencias_mttr_segundos(),
            aging_max_dias: abertas
                .iter()
                .filter_map(|o| {
                    let criado = chrono::DateTime::parse_from_rfc3339(&o.criado_em).ok()?;
                    let criado_utc: chrono::DateTime<Utc> = criado.with_timezone(&Utc);
                    let dias = (Utc::now() - criado_utc).num_days();
                    Some(dias.max(0))
                })
                .max()
                .unwrap_or(0),
        }
    }

    pub fn transicao_valida(actual: &OcorrenciaStatus, novo: &OcorrenciaStatus) -> bool {
        actual != novo && actual.transicoes_validas().contains(novo)
    }

    pub fn dashboard(&self, user: PublicUser) -> DashboardResponse {
        let active_condominium = if user.active_condominium.is_empty() {
            self.active_condominium.clone()
        } else {
            user.active_condominium.clone()
        };
        let ocorrencias_metricas = self.ocorrencias_metricas();
        let active_suppliers = self
            .suppliers
            .iter()
            .filter(|supplier| supplier.status.eq_ignore_ascii_case("ativo"))
            .count();
        let total_fractions = self.total_fractions();
        let total_residents = self.total_residents();
        let urgent_notice = self.urgent_notice();

        DashboardResponse {
            user,
            active_condominium,
            urgent_notice: urgent_notice.clone(),
            operational_summary: vec![
                OperationalSummaryItem {
                    label: format!("{} ocorrencias abertas", ocorrencias_metricas.total_abertas),
                    tone: "risk".to_string(),
                },
                OperationalSummaryItem {
                    label: format!("{} urgentes", ocorrencias_metricas.urgentes),
                    tone: "danger".to_string(),
                },
                OperationalSummaryItem {
                    label: "2 prazos proximos".to_string(),
                    tone: "warning".to_string(),
                },
                OperationalSummaryItem {
                    label: format!("{active_suppliers} fornecedores ativos"),
                    tone: "stable".to_string(),
                },
            ],
            quick_actions: vec![
                QuickAction {
                    title: "Extrato de Conta".to_string(),
                    description: "Resumo por fracao".to_string(),
                    icon: "E".to_string(),
                    tone: "blue".to_string(),
                },
                QuickAction {
                    title: "Avarias".to_string(),
                    description: "Ocorrencias do condominio".to_string(),
                    icon: "A".to_string(),
                    tone: "green".to_string(),
                },
                QuickAction {
                    title: "Email".to_string(),
                    description: "Comunicacoes rapidas".to_string(),
                    icon: "@".to_string(),
                    tone: "purple".to_string(),
                },
                QuickAction {
                    title: "Calendario".to_string(),
                    description: "Agenda operacional".to_string(),
                    icon: "C".to_string(),
                    tone: "gold".to_string(),
                },
            ],
            dashboard_modules: self.dashboard_modules(total_fractions, total_residents),
            alerts: self.alerts(urgent_notice),
        }
    }

    fn total_fractions(&self) -> u16 {
        if self.fractions.is_empty() {
            self.condominiums.iter().map(|item| item.fractions).sum()
        } else {
            self.fractions.len().try_into().unwrap_or(u16::MAX)
        }
    }

    fn total_residents(&self) -> u16 {
        if self.residents.is_empty() {
            self.condominiums.iter().map(|item| item.residents).sum()
        } else {
            self.residents.len().try_into().unwrap_or(u16::MAX)
        }
    }

    pub fn accounting_summary(&self) -> AccountingSummary {
        let total_quotas = self.quotas.len();
        let paid_quotas = self
            .quotas
            .iter()
            .filter(|quota| quota.status.eq_ignore_ascii_case("paga"))
            .count();
        let paid_quota_percentage = if total_quotas == 0 {
            0
        } else {
            ((paid_quotas as f64 / total_quotas as f64) * 100.0).round() as u8
        };

        let active_debts: Vec<&Debt> = self
            .debts
            .iter()
            .filter(|debt| !debt.status.eq_ignore_ascii_case("paga"))
            .collect();
        let overdue_amount = active_debts.iter().map(|debt| debt.amount).sum();
        let monthly_expenses = self.expenses.iter().map(|expense| expense.amount).sum();
        let received = self
            .accounting_payments
            .iter()
            .map(|payment| payment.amount)
            .sum::<Decimal>();
        let reserve_fund = self.reserve_funds.iter().map(|fund| fund.balance).sum();

        AccountingSummary {
            current_balance: reserve_fund + received - monthly_expenses,
            paid_quota_percentage,
            overdue_amount,
            overdue_count: active_debts.len(),
            monthly_expenses,
            reserve_fund,
            currency: "EUR".to_string(),
        }
    }

    fn urgent_notice(&self) -> UrgentNotice {
        UrgentNotice {
            kind: "tax".to_string(),
            title: "Imposto municipal a vencer".to_string(),
            detail: "Prazo: 20 maio - 1.840,00 EUR - Contabilidade".to_string(),
            priority: "urgent".to_string(),
        }
    }

    fn dashboard_modules(
        &self,
        total_fractions: u16,
        total_residents: u16,
    ) -> Vec<DashboardModule> {
        let pending_quotas = self
            .quotas
            .iter()
            .filter(|quota| {
                !matches!(
                    quota.status.to_ascii_lowercase().as_str(),
                    "paga" | "pago" | "liquidado"
                )
            })
            .count();
        let unreconciled_bank_movements = self
            .bank_transactions
            .iter()
            .filter(|movement| {
                !matches!(
                    movement.reconciliation_status.to_ascii_lowercase().as_str(),
                    "reconciliado" | "reconciliada"
                )
            })
            .count();
        let receipts_to_issue = self
            .receipts
            .iter()
            .filter(|receipt| receipt.status.to_ascii_lowercase().contains("emitir"))
            .count();
        let active_payment_agreements = self
            .payment_agreements
            .iter()
            .filter(|agreement| agreement.status.to_ascii_lowercase().contains("ativo"))
            .count();
        let ocorrencias_metricas = self.ocorrencias_metricas();
        let ocorrencias_urgentes =
            self.ocorrencias_urgentes().len() + self.ocorrencias_abertas().len();

        vec![
            DashboardModule {
                id: "condominiums".to_string(),
                title: "Condominios".to_string(),
                subtitle: "Gestao de predios e fracoes".to_string(),
                tone: "blue".to_string(),
                cta: "Ver condominios".to_string(),
                path: "/condominios".to_string(),
                visual: "building".to_string(),
                metrics: vec![
                    metric(self.condominiums.len().to_string(), "Predios", None),
                    metric(total_fractions.to_string(), "Fracoes", None),
                    metric(total_residents.to_string(), "Moradores", None),
                    metric(ocorrencias_urgentes.to_string(), "Alertas", Some("urgent")),
                ],
            },
            DashboardModule {
                id: "accounting".to_string(),
                title: "Contabilidade".to_string(),
                subtitle: "Financas e pagamentos".to_string(),
                tone: "green".to_string(),
                cta: "Abrir contabilidade".to_string(),
                path: "/contabilidade".to_string(),
                visual: "wallet".to_string(),
                metrics: vec![
                    metric(
                        pending_quotas.to_string(),
                        "Quotas por validar",
                        Some(if pending_quotas > 0 {
                            "warning"
                        } else {
                            "success"
                        }),
                    ),
                    metric(
                        unreconciled_bank_movements.to_string(),
                        "Por reconciliar",
                        Some(if unreconciled_bank_movements > 0 {
                            "warning"
                        } else {
                            "success"
                        }),
                    ),
                    metric(
                        receipts_to_issue.to_string(),
                        "Recibos por emitir",
                        Some("warning"),
                    ),
                    metric(
                        active_payment_agreements.to_string(),
                        "Acordos ativos",
                        Some("success"),
                    ),
                ],
            },
            DashboardModule {
                id: "administration".to_string(),
                title: "Ocorrencias".to_string(),
                subtitle: "Avarias e pedidos".to_string(),
                tone: "purple".to_string(),
                cta: "Gerir ocorrencias".to_string(),
                path: "/tickets".to_string(),
                visual: "tools".to_string(),
                metrics: vec![
                    metric(
                        ocorrencias_metricas.total_abertas.to_string(),
                        "Abertas",
                        Some("urgent"),
                    ),
                    metric(
                        ocorrencias_metricas.urgentes.to_string(),
                        "Urgentes",
                        Some("danger"),
                    ),
                    metric(
                        self.maintenance.len().to_string(),
                        "Manutencoes",
                        Some("warning"),
                    ),
                    metric(
                        self.suppliers.len().to_string(),
                        "Fornecedores",
                        Some("success"),
                    ),
                ],
            },
            DashboardModule {
                id: "reports".to_string(),
                title: "Relatorios".to_string(),
                subtitle: "Analises e documentos".to_string(),
                tone: "gold".to_string(),
                cta: "Gerar relatorio".to_string(),
                path: "/relatorios".to_string(),
                visual: "chart".to_string(),
                metrics: vec![
                    metric(self.reports.len().to_string(), "Relatorios", None),
                    metric(self.assemblies.len().to_string(), "Atas", None),
                    metric("8", "Exportacoes", Some("new")),
                    metric("0", "Pendentes", Some("success")),
                ],
            },
        ]
    }

    fn alerts(&self, urgent_notice: UrgentNotice) -> Vec<DashboardAlert> {
        let mut alerts = vec![DashboardAlert {
            kind: urgent_notice.kind,
            title: urgent_notice.title,
            detail: urgent_notice.detail,
            tone: "danger".to_string(),
            icon: "EUR".to_string(),
        }];

        alerts.extend(
            self.ocorrencias
                .iter()
                .filter(|o| o.status != OcorrenciaStatus::Fechada)
                .take(3)
                .map(|o| {
                    let tone = if o.prioridade == Prioridade::Urgente {
                        "danger"
                    } else {
                        "gold"
                    };
                    DashboardAlert {
                        kind: "ocorrencia".to_string(),
                        title: o.titulo.clone(),
                        detail: format!("{} - {}", o.tipo.as_str(), o.status.as_str()),
                        tone: tone.to_string(),
                        icon: if o.tipo == OcorrenciaTipo::Avaria {
                            "!"
                        } else {
                            "?"
                        }
                        .to_string(),
                    }
                }),
        );

        alerts
    }
}

fn metric(
    value: impl Into<String>,
    label: impl Into<String>,
    status: Option<&str>,
) -> DashboardMetric {
    DashboardMetric {
        value: value.into(),
        label: label.into(),
        status: status.map(str::to_string),
    }
}

pub fn default_tenant_id() -> String {
    "tenant-gestisac".to_string()
}

fn default_tenants() -> Vec<Tenant> {
    vec![Tenant {
        id: default_tenant_id(),
        name: "GESTISAC".to_string(),
        slug: "gestisac".to_string(),
        status: "Ativo".to_string(),
    }]
}

fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

fn now_utc_string() -> String {
    Utc::now().to_rfc3339()
}

#[allow(dead_code)]
fn is_critical_priority(priority: &str) -> bool {
    let normalized = priority.to_lowercase();
    normalized.contains("crit") || normalized.contains("tic") || normalized.contains("urg")
}

fn default_buildings(condominium: &str) -> Vec<Building> {
    vec![
        Building {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            name: "Bloco A".to_string(),
            floors: 8,
            fractions: 32,
            status: "Operacional".to_string(),
        },
        Building {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            name: "Bloco B".to_string(),
            floors: 8,
            fractions: 32,
            status: "Elevador em intervencao".to_string(),
        },
        Building {
            id: Uuid::new_v4().to_string(),
            condominium: "Edificio Atlantico".to_string(),
            name: "Torre Principal".to_string(),
            floors: 7,
            fractions: 28,
            status: "Acompanhamento".to_string(),
        },
    ]
}

fn default_fractions(condominium: &str) -> Vec<Fraction> {
    vec![
        Fraction {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            building: "Bloco A".to_string(),
            number: "A-1".to_string(),
            floor: "1".to_string(),
            typology: "T2".to_string(),
            owner: "Maria Fernandes".to_string(),
            status: "Regularizada".to_string(),
        },
        Fraction {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            building: "Bloco B".to_string(),
            number: "B-4".to_string(),
            floor: "4".to_string(),
            typology: "T3".to_string(),
            owner: "Carlos Almeida".to_string(),
            status: "Quota em atraso".to_string(),
        },
        Fraction {
            id: Uuid::new_v4().to_string(),
            condominium: "Edificio Atlantico".to_string(),
            building: "Torre Principal".to_string(),
            number: "2-D".to_string(),
            floor: "2".to_string(),
            typology: "T1".to_string(),
            owner: "Sofia Martins".to_string(),
            status: "Regularizada".to_string(),
        },
    ]
}

fn default_residents(condominium: &str) -> Vec<Resident> {
    vec![
        Resident {
            id: Uuid::new_v4().to_string(),
            name: "Maria Fernandes".to_string(),
            email: "maria.fernandes@example.pt".to_string(),
            phone: "+351 910 000 001".to_string(),
            condominium: condominium.to_string(),
            fraction: "A-1".to_string(),
            status: "Proprietaria".to_string(),
        },
        Resident {
            id: Uuid::new_v4().to_string(),
            name: "Carlos Almeida".to_string(),
            email: "carlos.almeida@example.pt".to_string(),
            phone: "+351 910 000 002".to_string(),
            condominium: condominium.to_string(),
            fraction: "B-4".to_string(),
            status: "Condomino com aviso".to_string(),
        },
        Resident {
            id: Uuid::new_v4().to_string(),
            name: "Sofia Martins".to_string(),
            email: "sofia.martins@example.pt".to_string(),
            phone: "+351 910 000 003".to_string(),
            condominium: "Edificio Atlantico".to_string(),
            fraction: "2-D".to_string(),
            status: "Proprietaria".to_string(),
        },
    ]
}

fn default_quotas(condominium: &str) -> Vec<Quota> {
    vec![
        Quota {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            fraction: "A-1".to_string(),
            resident: "Maria Fernandes".to_string(),
            period: "Maio 2026".to_string(),
            amount: Decimal::new(8_500, 2),
            due_date: "2026-05-08".to_string(),
            status: "Paga".to_string(),
        },
        Quota {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            fraction: "B-4".to_string(),
            resident: "Carlos Almeida".to_string(),
            period: "Maio 2026".to_string(),
            amount: Decimal::new(9_500, 2),
            due_date: "2026-05-08".to_string(),
            status: "Em atraso".to_string(),
        },
        Quota {
            id: Uuid::new_v4().to_string(),
            condominium: "Edificio Atlantico".to_string(),
            fraction: "2-D".to_string(),
            resident: "Sofia Martins".to_string(),
            period: "Maio 2026".to_string(),
            amount: Decimal::new(12_000, 2),
            due_date: "2026-05-10".to_string(),
            status: "Paga".to_string(),
        },
    ]
}

fn default_accounting_payments(condominium: &str) -> Vec<AccountingPayment> {
    vec![
        AccountingPayment {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            fraction: "A-1".to_string(),
            resident: "Maria Fernandes".to_string(),
            amount: Decimal::new(8_500, 2),
            paid_at: "2026-05-06".to_string(),
            method: "Transferencia".to_string(),
            status: "Confirmado".to_string(),
        },
        AccountingPayment {
            id: Uuid::new_v4().to_string(),
            condominium: "Edificio Atlantico".to_string(),
            fraction: "2-D".to_string(),
            resident: "Sofia Martins".to_string(),
            amount: Decimal::new(12_000, 2),
            paid_at: "2026-05-07".to_string(),
            method: "MB Way".to_string(),
            status: "Confirmado".to_string(),
        },
    ]
}

fn default_debts(condominium: &str) -> Vec<Debt> {
    vec![
        Debt {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            fraction: "B-4".to_string(),
            resident: "Carlos Almeida".to_string(),
            amount: Decimal::new(9_500, 2),
            due_date: "2026-05-08".to_string(),
            days_overdue: 6,
            status: "Em atraso".to_string(),
        },
        Debt {
            id: Uuid::new_v4().to_string(),
            condominium: "Edificio Atlantico".to_string(),
            fraction: "3-A".to_string(),
            resident: "Rui Matos".to_string(),
            amount: Decimal::new(18_000, 2),
            due_date: "2026-04-10".to_string(),
            days_overdue: 34,
            status: "Em atraso".to_string(),
        },
    ]
}

fn default_receipts(condominium: &str) -> Vec<Receipt> {
    vec![Receipt {
        id: Uuid::new_v4().to_string(),
        number: "REC-2026-001".to_string(),
        condominium: condominium.to_string(),
        resident: "Maria Fernandes".to_string(),
        amount: Decimal::new(8_500, 2),
        issued_at: "2026-05-06".to_string(),
        status: "Emitido".to_string(),
    }]
}

fn default_expenses(condominium: &str) -> Vec<Expense> {
    vec![
        Expense {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            category: "Imposto municipal".to_string(),
            supplier: "Autoridade Tributaria".to_string(),
            amount: Decimal::new(184_000, 2),
            due_date: "2026-05-20".to_string(),
            status: "A vencer".to_string(),
        },
        Expense {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            category: "Manutencao elevador".to_string(),
            supplier: "Elevatec Lisboa".to_string(),
            amount: Decimal::new(51_000, 2),
            due_date: "2026-05-16".to_string(),
            status: "Pendente".to_string(),
        },
    ]
}

fn default_reserve_funds(condominium: &str) -> Vec<ReserveFund> {
    vec![ReserveFund {
        id: Uuid::new_v4().to_string(),
        condominium: condominium.to_string(),
        balance: Decimal::new(1_890_000, 2),
        monthly_change: Decimal::new(42_000, 2),
        status: "Estavel".to_string(),
    }]
}

fn default_payment_agreements(condominium: &str) -> Vec<PaymentAgreement> {
    let total_amount = Decimal::new(9_500, 2);
    let installment_count = 2;
    let installment_amount = total_amount / Decimal::from(installment_count);

    vec![PaymentAgreement {
        id: Uuid::new_v4().to_string(),
        condominium: condominium.to_string(),
        fraction: "B-4".to_string(),
        resident: "Carlos Almeida".to_string(),
        debt_id: "demo-debt-b4".to_string(),
        total_amount,
        installment_count,
        installment_amount,
        next_due_date: "2026-06-08".to_string(),
        status: "Ativo".to_string(),
        notes: "Plano simples para regularizar quota em atraso.".to_string(),
        installments: vec![
            PaymentAgreementInstallment {
                installment_number: 1,
                due_date: "2026-06-08".to_string(),
                amount: installment_amount,
                status: "Pendente".to_string(),
                payment_id: String::new(),
            },
            PaymentAgreementInstallment {
                installment_number: 2,
                due_date: "2026-07-08".to_string(),
                amount: installment_amount,
                status: "Pendente".to_string(),
                payment_id: String::new(),
            },
        ],
    }]
}

fn default_cash_movements(condominium: &str) -> Vec<CashMovement> {
    vec![CashMovement {
        id: Uuid::new_v4().to_string(),
        condominium: condominium.to_string(),
        movement_type: "entrada".to_string(),
        account_type: "caixa".to_string(),
        amount: Decimal::new(8_500, 2),
        occurred_at: "2026-05-06".to_string(),
        source: "Quota A-1".to_string(),
        method: "Transferencia".to_string(),
        reference: "REC-2026-001".to_string(),
        status: "Confirmado".to_string(),
        linked_entity_type: "receipt".to_string(),
        linked_entity_id: String::new(),
    }]
}

fn default_bank_transactions(condominium: &str) -> Vec<BankTransaction> {
    vec![
        BankTransaction {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            occurred_at: "2026-05-06".to_string(),
            description: "TRF Maria Fernandes A-1 Maio".to_string(),
            amount: Decimal::new(8_500, 2),
            direction: "entrada".to_string(),
            reference: "A-1 Maio".to_string(),
            reconciliation_status: "reconciliado".to_string(),
        },
        BankTransaction {
            id: Uuid::new_v4().to_string(),
            condominium: condominium.to_string(),
            occurred_at: "2026-05-18".to_string(),
            description: "TRF Carlos Almeida B-4".to_string(),
            amount: Decimal::new(4_750, 2),
            direction: "entrada".to_string(),
            reference: "B-4 acordo".to_string(),
            reconciliation_status: "por reconciliar".to_string(),
        },
    ]
}

fn default_calendar_events(condominium: &str) -> Vec<CalendarEvent> {
    let now = Utc::now().to_rfc3339();

    vec![
        CalendarEvent {
            id: Uuid::new_v4().to_string(),
            title: "Vistoria aos elevadores".to_string(),
            description: "Verificacao tecnica do elevador do Bloco B.".to_string(),
            event_type: "Vistoria".to_string(),
            status: "Agendado".to_string(),
            start_at: "2026-05-24T10:00:00Z".to_string(),
            end_at: "2026-05-24T11:00:00Z".to_string(),
            condominium: condominium.to_string(),
            linked_entity_type: "maintenance".to_string(),
            linked_entity_id: String::new(),
            attendees: vec![
                "administracao@gestisac.pt".to_string(),
                "assistencia@elevatec.pt".to_string(),
            ],
            location: "Bloco B".to_string(),
            notes: "Confirmar acesso a casa das maquinas antes da chegada do tecnico.".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        CalendarEvent {
            id: Uuid::new_v4().to_string(),
            title: "Reuniao de administracao".to_string(),
            description: "Ponto de situacao de quotas, avarias e documentacao.".to_string(),
            event_type: "Reuniao".to_string(),
            status: "Planeado".to_string(),
            start_at: "2026-05-24T19:00:00Z".to_string(),
            end_at: "2026-05-24T20:00:00Z".to_string(),
            condominium: condominium.to_string(),
            linked_entity_type: "assembly".to_string(),
            linked_entity_id: String::new(),
            attendees: vec!["administracao@gestisac.pt".to_string()],
            location: "Sala do condominio".to_string(),
            notes: "Preparar resumo de tickets e manutencoes abertas.".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        CalendarEvent {
            id: Uuid::new_v4().to_string(),
            title: "Email aos moradores".to_string(),
            description: "Comunicacao planeada sobre manutencao do elevador.".to_string(),
            event_type: "Email".to_string(),
            status: "Rascunho".to_string(),
            start_at: "2026-05-23T09:30:00Z".to_string(),
            end_at: "2026-05-23T09:45:00Z".to_string(),
            condominium: condominium.to_string(),
            linked_entity_type: "ticket".to_string(),
            linked_entity_id: String::new(),
            attendees: vec![
                "moradores@vilaverde.example.pt".to_string(),
                "administracao@gestisac.pt".to_string(),
            ],
            location: "Email planeado".to_string(),
            notes: "Registo de planeamento. Sem envio automatico nesta fase.".to_string(),
            created_at: now.clone(),
            updated_at: now,
        },
    ]
}

fn normalize_demo_priority(priority: &str) -> String {
    let normalized = priority.to_lowercase();
    if normalized.contains("crit") || normalized.contains("tic") || normalized.contains("urg") {
        "Urgente".to_string()
    } else if normalized.contains("import") || normalized.contains("alta") {
        "Alta".to_string()
    } else if normalized.contains("baix") {
        "Baixa".to_string()
    } else {
        "Normal".to_string()
    }
}

fn normalize_demo_ticket_status(status: &str) -> String {
    let normalized = status.to_lowercase();
    if normalized.contains("resol") || normalized.contains("fech") {
        "Resolvido".to_string()
    } else if normalized.contains("fornecedor") || normalized.contains("curso") {
        "Em curso".to_string()
    } else if normalized.contains("analise") || normalized.contains("pend") {
        "Pendente".to_string()
    } else {
        "Aberto".to_string()
    }
}

fn normalize_demo_maintenance_status(status: &str) -> String {
    let normalized = status.to_lowercase();
    if normalized.contains("concl") || normalized.contains("resol") {
        "Concluida".to_string()
    } else if normalized.contains("curso") {
        "Em curso".to_string()
    } else if normalized.contains("fornecedor") {
        "A aguardar fornecedor".to_string()
    } else if normalized.contains("agend") || normalized.contains("urg") {
        "Agendada".to_string()
    } else {
        "Planeada".to_string()
    }
}

fn default_inspections(condominium: &str) -> Vec<Inspection> {
    vec![
        Inspection {
            id: Uuid::new_v4().to_string(),
            title: "Vistoria anual aos extintores".to_string(),
            condominium: condominium.to_string(),
            location: "Garagens e patamares".to_string(),
            required_date: "2026-06-03".to_string(),
            status: "Planeada".to_string(),
            result: "Pendente".to_string(),
            checklist: vec![
                "Validar pressao dos extintores".to_string(),
                "Confirmar sinaletica visivel".to_string(),
                "Registar extintores fora de prazo".to_string(),
            ],
            worker_notes: String::new(),
            hq_notes: String::new(),
            submitted_at: String::new(),
            confirmed_at: String::new(),
            confirmed_by: String::new(),
            calendar_event_id: String::new(),
            assigned_worker_id: "worker-demo-1".to_string(),
        },
        Inspection {
            id: Uuid::new_v4().to_string(),
            title: "Vistoria tecnica ao elevador Bloco B".to_string(),
            condominium: condominium.to_string(),
            location: "Casa das maquinas".to_string(),
            required_date: "2026-06-05".to_string(),
            status: "Submetida".to_string(),
            result: "A rever".to_string(),
            checklist: vec![
                "Testar paragem de emergencia".to_string(),
                "Verificar alarmes e comunicacao".to_string(),
                "Inspecionar ruido e vibracao".to_string(),
            ],
            worker_notes: "Ligacao de alarme intermitente exige validacao HQ.".to_string(),
            hq_notes: String::new(),
            submitted_at: "2026-05-28T09:15:00Z".to_string(),
            confirmed_at: String::new(),
            confirmed_by: String::new(),
            calendar_event_id: String::new(),
            assigned_worker_id: "worker-demo-1".to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded_store() -> AppStore {
        let demo: DemoData = serde_json::from_str(include_str!("../../../../mock/demo-data.json"))
            .expect("demo-data.json must remain valid test fixture JSON");
        AppStore::seed_from_demo(&demo, "password-hash".to_string())
    }

    #[test]
    fn condominium_defaults_generate_unique_internal_codes_from_id() {
        let mut first = Condominium {
            id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee".to_string(),
            name: "Smoke Condominio 1".to_string(),
            ..Default::default()
        };
        let mut second = Condominium {
            id: "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee".to_string(),
            name: "Smoke Condominio 2".to_string(),
            ..Default::default()
        };

        first.ensure_profile_defaults();
        second.ensure_profile_defaults();

        assert_ne!(first.internal_code, second.internal_code);
        assert!(first.internal_code.starts_with("COND-SMOKE-CONDOMIN"));
        assert!(second.internal_code.starts_with("COND-SMOKE-CONDOMIN"));
    }

    #[test]
    fn condominium_defaults_keep_manual_internal_code() {
        let mut condominium = Condominium {
            id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee".to_string(),
            name: "Edificio Manual".to_string(),
            internal_code: "MANUAL-001".to_string(),
            ..Default::default()
        };

        condominium.ensure_profile_defaults();

        assert_eq!(condominium.internal_code, "MANUAL-001");
    }

    // ── Accounting ──

    #[test]
    fn accounting_summary_is_calculated_from_store_records() {
        let store = seeded_store();
        let summary = store.accounting_summary();
        assert_eq!(summary.paid_quota_percentage, 67);
        assert_eq!(summary.overdue_count, 2);
        assert_eq!(summary.overdue_amount, Decimal::new(27_500, 2));
        assert_eq!(summary.monthly_expenses, Decimal::new(235_000, 2));
        assert_eq!(summary.reserve_fund, Decimal::new(1_890_000, 2));
    }

    // ── Dashboard ──

    #[test]
    fn dashboard_counts_accented_critical_priorities() {
        let store = seeded_store();
        let user_id = store.users[0].id.clone();
        let user = store
            .public_user(&user_id)
            .expect("seeded store must include public demo admin");
        let dashboard = store.dashboard(user);
        assert!(dashboard.operational_summary[0]
            .label
            .contains("ocorrencias abertas"));
        assert!(dashboard.operational_summary[1].label.contains("urgentes"));
    }

    #[test]
    fn dashboard_metricas_match_ocorrencias_metricas_direct_call() {
        let store = seeded_store();
        let user_id = store.users[0].id.clone();
        let user = store.public_user(&user_id).unwrap();
        let dashboard = store.dashboard(user);
        let metricas = store.ocorrencias_metricas();
        assert_eq!(
            dashboard.operational_summary[0].label,
            format!("{} ocorrencias abertas", metricas.total_abertas)
        );
        assert_eq!(
            dashboard.operational_summary[1].label,
            format!("{} urgentes", metricas.urgentes)
        );
    }

    // ── State Machine — transition lists ──

    #[test]
    fn every_state_has_non_empty_transitions() {
        for state in &[
            OcorrenciaStatus::Nova,
            OcorrenciaStatus::EmTriagem,
            OcorrenciaStatus::AguardaPecas,
            OcorrenciaStatus::EmCurso,
            OcorrenciaStatus::Pendente,
            OcorrenciaStatus::Resolvida,
            OcorrenciaStatus::Fechada,
            OcorrenciaStatus::Reaberta,
        ] {
            let transitions = state.transicoes_validas();
            assert!(
                !transitions.is_empty(),
                "{:?} must have at least one transition",
                state
            );
            // No duplicate entries
            let mut dedup = transitions.clone();
            dedup.sort();
            dedup.dedup();
            assert_eq!(
                transitions.len(),
                dedup.len(),
                "{:?} transitions contain duplicates",
                state
            );
        }
    }

    #[test]
    fn all_transitions_are_to_different_states() {
        for state in &[
            OcorrenciaStatus::Nova,
            OcorrenciaStatus::EmTriagem,
            OcorrenciaStatus::AguardaPecas,
            OcorrenciaStatus::EmCurso,
            OcorrenciaStatus::Pendente,
            OcorrenciaStatus::Resolvida,
            OcorrenciaStatus::Fechada,
            OcorrenciaStatus::Reaberta,
        ] {
            for target in state.transicoes_validas() {
                assert_ne!(*state, target, "{:?} cannot transition to itself", state);
            }
        }
    }

    // ── State Machine — full 8×8 transition matrix ──

    #[test]
    fn transicao_valida_full_matrix() {
        let states = [
            OcorrenciaStatus::Nova,
            OcorrenciaStatus::EmTriagem,
            OcorrenciaStatus::AguardaPecas,
            OcorrenciaStatus::EmCurso,
            OcorrenciaStatus::Pendente,
            OcorrenciaStatus::Resolvida,
            OcorrenciaStatus::Fechada,
            OcorrenciaStatus::Reaberta,
        ];
        for from in &states {
            for to in &states {
                let valid = AppStore::transicao_valida(from, to);
                let listed = from != to && from.transicoes_validas().contains(to);
                assert_eq!(
                    valid, listed,
                    "transicao {:?} -> {:?}: esperado={}, obtido={}",
                    from, to, listed, valid
                );
            }
        }
    }

    #[test]
    fn transicao_valida_rejects_all_same_status() {
        for state in &[
            OcorrenciaStatus::Nova,
            OcorrenciaStatus::EmTriagem,
            OcorrenciaStatus::AguardaPecas,
            OcorrenciaStatus::EmCurso,
            OcorrenciaStatus::Pendente,
            OcorrenciaStatus::Resolvida,
            OcorrenciaStatus::Fechada,
            OcorrenciaStatus::Reaberta,
        ] {
            assert!(
                !AppStore::transicao_valida(state, state),
                "{:?} -> {:?} must be rejected",
                state,
                state
            );
        }
    }

    // ── OcorrenciasAbertas ──

    #[test]
    fn ocorrencias_abertas_excludes_resolved_and_closed() {
        let mut store = AppStore::default();
        for status in &[
            OcorrenciaStatus::Nova,
            OcorrenciaStatus::EmTriagem,
            OcorrenciaStatus::AguardaPecas,
            OcorrenciaStatus::EmCurso,
            OcorrenciaStatus::Pendente,
            OcorrenciaStatus::Resolvida,
            OcorrenciaStatus::Fechada,
            OcorrenciaStatus::Reaberta,
        ] {
            let mut o = Ocorrencia::default();
            o.status = status.clone();
            store.ocorrencias.push(o);
        }
        let abertas = store.ocorrencias_abertas();
        assert_eq!(abertas.len(), 6); // Todas excepto Resolvida e Fechada
        for o in &abertas {
            assert!(o.status != OcorrenciaStatus::Resolvida);
            assert!(o.status != OcorrenciaStatus::Fechada);
        }
    }

    #[test]
    fn ocorrencias_abertas_empty_when_all_closed_or_resolved() {
        let mut store = AppStore::default();
        for status in &[OcorrenciaStatus::Resolvida, OcorrenciaStatus::Fechada] {
            let mut o = Ocorrencia::default();
            o.status = status.clone();
            store.ocorrencias.push(o);
        }
        assert!(store.ocorrencias_abertas().is_empty());
    }

    #[test]
    fn ocorrencias_abertas_empty_on_empty_store() {
        let store = AppStore::default();
        assert!(store.ocorrencias_abertas().is_empty());
    }

    // ── OcorrenciasUrgentes ──

    #[test]
    fn ocorrencias_urgentes_includes_all_criteria() {
        let mut store = AppStore::default();
        let nova = OcorrenciaStatus::Nova;

        let mut a1 = Ocorrencia::default();
        a1.prioridade = Prioridade::Alta;
        a1.status = nova.clone();
        store.ocorrencias.push(a1);

        let mut a2 = Ocorrencia::default();
        a2.prioridade = Prioridade::Urgente;
        a2.status = nova.clone();
        store.ocorrencias.push(a2);

        let mut a3 = Ocorrencia::default();
        a3.impacto = Impacto::Critico;
        a3.status = nova.clone();
        store.ocorrencias.push(a3);

        let mut a4 = Ocorrencia::default();
        a4.urgencia = Urgencia::Imediata;
        a4.status = nova.clone();
        store.ocorrencias.push(a4);

        assert_eq!(store.ocorrencias_urgentes().len(), 4);
    }

    #[test]
    fn ocorrencias_urgentes_ignores_normal_prioridade() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.prioridade = Prioridade::Normal;
        o.impacto = Impacto::Medio;
        o.urgencia = Urgencia::Media;
        o.status = OcorrenciaStatus::Nova;
        store.ocorrencias.push(o);
        assert!(store.ocorrencias_urgentes().is_empty());
    }

    #[test]
    fn ocorrencias_urgentes_excludes_fechada_and_resolvida() {
        let mut store = AppStore::default();
        for status in &[OcorrenciaStatus::Fechada, OcorrenciaStatus::Resolvida] {
            let mut o = Ocorrencia::default();
            o.prioridade = Prioridade::Urgente;
            o.status = status.clone();
            store.ocorrencias.push(o);
        }
        assert!(store.ocorrencias_urgentes().is_empty());
    }

    #[test]
    fn ocorrencias_urgentes_empty_on_empty_store() {
        let store = AppStore::default();
        assert!(store.ocorrencias_urgentes().is_empty());
    }

    // ── OcorrenciasPorTipo ──

    #[test]
    fn ocorrencias_por_tipo_all_tipos() {
        let mut store = AppStore::default();
        for tipo in &[
            OcorrenciaTipo::Avaria,
            OcorrenciaTipo::Pedido,
            OcorrenciaTipo::Reclamacao,
            OcorrenciaTipo::Pergunta,
            OcorrenciaTipo::TarefaInterna,
        ] {
            let mut o = Ocorrencia::default();
            o.tipo = tipo.clone();
            store.ocorrencias.push(o);
        }
        assert_eq!(store.ocorrencias_por_tipo(&OcorrenciaTipo::Avaria).len(), 1);
        assert_eq!(store.ocorrencias_por_tipo(&OcorrenciaTipo::Pedido).len(), 1);
        assert_eq!(
            store
                .ocorrencias_por_tipo(&OcorrenciaTipo::Reclamacao)
                .len(),
            1
        );
        assert_eq!(
            store.ocorrencias_por_tipo(&OcorrenciaTipo::Pergunta).len(),
            1
        );
        assert_eq!(
            store
                .ocorrencias_por_tipo(&OcorrenciaTipo::TarefaInterna)
                .len(),
            1
        );
    }

    #[test]
    fn ocorrencias_por_tipo_multiple_of_same() {
        let mut store = AppStore::default();
        for _ in 0..5 {
            let mut o = Ocorrencia::default();
            o.tipo = OcorrenciaTipo::Avaria;
            store.ocorrencias.push(o);
        }
        for _ in 0..3 {
            let mut o = Ocorrencia::default();
            o.tipo = OcorrenciaTipo::Pedido;
            store.ocorrencias.push(o);
        }
        assert_eq!(store.ocorrencias_por_tipo(&OcorrenciaTipo::Avaria).len(), 5);
        assert_eq!(store.ocorrencias_por_tipo(&OcorrenciaTipo::Pedido).len(), 3);
        assert_eq!(
            store
                .ocorrencias_por_tipo(&OcorrenciaTipo::Reclamacao)
                .len(),
            0
        );
    }

    #[test]
    fn ocorrencias_por_tipo_empty_on_empty_store() {
        let store = AppStore::default();
        assert!(store
            .ocorrencias_por_tipo(&OcorrenciaTipo::Avaria)
            .is_empty());
    }

    // ── MTTR ──

    #[test]
    fn metricas_mttr_zero_when_no_resolved() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Nova;
        o.criado_em = "2026-01-01T10:00:00+00:00".to_string();
        store.ocorrencias.push(o);
        assert_eq!(store.ocorrencias_mttr_segundos(), 0.0);
    }

    #[test]
    fn metricas_mttr_zero_when_resolved_but_empty_dates() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Resolvida;
        // criado_em e resolvido_em vazios (Default)
        store.ocorrencias.push(o);
        assert_eq!(store.ocorrencias_mttr_segundos(), 0.0);
    }

    #[test]
    fn metricas_mttr_zero_when_resolved_but_empty_criado_em() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Resolvida;
        o.criado_em = "".to_string();
        o.resolvido_em = "2026-01-01T12:00:00+00:00".to_string();
        store.ocorrencias.push(o);
        assert_eq!(store.ocorrencias_mttr_segundos(), 0.0);
    }

    #[test]
    fn metricas_mttr_zero_when_resolved_but_empty_resolvido_em() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Resolvida;
        o.criado_em = "2026-01-01T10:00:00+00:00".to_string();
        o.resolvido_em = "".to_string();
        store.ocorrencias.push(o);
        assert_eq!(store.ocorrencias_mttr_segundos(), 0.0);
    }

    #[test]
    fn metricas_mttr_with_multiple_resolved_filters_bad_dates() {
        let mut store = AppStore::default();

        // Válida: 2h = 7200s
        let mut o1 = Ocorrencia::default();
        o1.status = OcorrenciaStatus::Resolvida;
        o1.criado_em = "2026-01-01T08:00:00+00:00".to_string();
        o1.resolvido_em = "2026-01-01T10:00:00+00:00".to_string();
        store.ocorrencias.push(o1);

        // Inválida (vazia)
        let mut o2 = Ocorrencia::default();
        o2.status = OcorrenciaStatus::Resolvida;
        store.ocorrencias.push(o2);

        assert_eq!(store.ocorrencias_mttr_segundos(), 7200.0);
    }

    // ── Metricas ──

    #[test]
    fn metricas_mixed_states() {
        let mut store = AppStore::default();

        let mut o1 = Ocorrencia::default();
        o1.status = OcorrenciaStatus::Nova;
        o1.tipo = OcorrenciaTipo::Avaria;
        o1.prioridade = Prioridade::Normal;
        store.ocorrencias.push(o1);

        let mut o2 = Ocorrencia::default();
        o2.status = OcorrenciaStatus::EmCurso;
        o2.tipo = OcorrenciaTipo::Pedido;
        o2.prioridade = Prioridade::Alta;
        store.ocorrencias.push(o2);

        let mut o3 = Ocorrencia::default();
        o3.status = OcorrenciaStatus::Resolvida;
        o3.tipo = OcorrenciaTipo::Avaria;
        o3.criado_em = "2026-01-01T08:00:00+00:00".to_string();
        o3.resolvido_em = "2026-01-01T10:00:00+00:00".to_string();
        store.ocorrencias.push(o3);

        let mut o4 = Ocorrencia::default();
        o4.status = OcorrenciaStatus::Fechada;
        o4.tipo = OcorrenciaTipo::Avaria;
        o4.prioridade = Prioridade::Urgente;
        store.ocorrencias.push(o4);

        let metricas = store.ocorrencias_metricas();
        assert_eq!(metricas.total_abertas, 2); // Nova + EmCurso
        assert_eq!(metricas.urgentes, 1); // So EmCurso com Alta
        assert_eq!(metricas.total_avarias, 1); // So Nova (Resolvida e Fechada excluidas)
        assert_eq!(metricas.mttr_segundos, 7200.0); // So o3
    }

    #[test]
    fn metricas_all_closed_non_zero_mttr() {
        let mut store = AppStore::default();

        let mut o1 = Ocorrencia::default();
        o1.status = OcorrenciaStatus::Resolvida;
        o1.criado_em = "2026-01-01T08:00:00+00:00".to_string();
        o1.resolvido_em = "2026-01-01T10:00:00+00:00".to_string();
        store.ocorrencias.push(o1);

        let mut o2 = Ocorrencia::default();
        o2.status = OcorrenciaStatus::Fechada;
        store.ocorrencias.push(o2);

        let metricas = store.ocorrencias_metricas();
        assert_eq!(metricas.total_abertas, 0);
        assert_eq!(metricas.mttr_segundos, 7200.0);
    }

    // ── Aging ──

    #[test]
    fn metricas_aging_with_future_date_returns_zero() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Nova;
        o.criado_em = "2099-01-01T00:00:00+00:00".to_string();
        store.ocorrencias.push(o);
        let metricas = store.ocorrencias_metricas();
        assert_eq!(metricas.aging_max_dias, 0);
    }

    #[test]
    fn metricas_aging_with_invalid_date_is_skipped() {
        let mut store = AppStore::default();
        let mut o = Ocorrencia::default();
        o.status = OcorrenciaStatus::Nova;
        o.criado_em = "not-a-date".to_string();
        store.ocorrencias.push(o);
        let metricas = store.ocorrencias_metricas();
        assert_eq!(metricas.aging_max_dias, 0);
    }

    // ── Seed data ──

    #[test]
    fn seed_cria_ocorrencias_validas() {
        let store = seeded_store();
        assert!(store.ocorrencias.len() >= 2);
        for o in &store.ocorrencias {
            assert!(!o.titulo.is_empty());
            assert!(!o.id.is_empty());
            assert!(!o.criado_em.is_empty());
            assert!(!o.condominium_id.is_empty());
        }
    }

    #[test]
    fn seed_metricas_consistent() {
        let store = seeded_store();
        let metricas = store.ocorrencias_metricas();

        let abertas: usize = store
            .ocorrencias
            .iter()
            .filter(|o| {
                o.status != OcorrenciaStatus::Resolvida && o.status != OcorrenciaStatus::Fechada
            })
            .count();
        let urgentes: usize = store
            .ocorrencias
            .iter()
            .filter(|o| {
                (o.prioridade == Prioridade::Alta
                    || o.prioridade == Prioridade::Urgente
                    || o.impacto == Impacto::Critico
                    || o.urgencia == Urgencia::Imediata)
                    && o.status != OcorrenciaStatus::Fechada
                    && o.status != OcorrenciaStatus::Resolvida
            })
            .count();
        let avarias_abertas: usize = store
            .ocorrencias
            .iter()
            .filter(|o| {
                o.tipo == OcorrenciaTipo::Avaria
                    && o.status != OcorrenciaStatus::Fechada
                    && o.status != OcorrenciaStatus::Resolvida
            })
            .count();

        assert_eq!(metricas.total_abertas, abertas);
        assert_eq!(metricas.urgentes, urgentes);
        assert_eq!(metricas.total_avarias, avarias_abertas);
    }

    // ── PublicUser ──

    #[test]
    fn public_user_returns_none_for_unknown() {
        let store = seeded_store();
        assert!(store.public_user("non-existent-id").is_none());
    }

    #[test]
    fn public_user_returns_user_for_valid_id() {
        let store = seeded_store();
        let id = &store.users[0].id;
        let user = store.public_user(id).unwrap();
        assert_eq!(user.email, "admin@gestisac.pt");
    }

    // ── Ocorrencia status helper ──

    #[test]
    fn ocorrencia_status_as_str_roundtrip() {
        use OcorrenciaStatus::*;
        for (status, expected) in &[
            (Nova, "Nova"),
            (EmTriagem, "Em Triagem"),
            (AguardaPecas, "Aguarda Pecas"),
            (EmCurso, "Em Curso"),
            (Pendente, "Pendente"),
            (Resolvida, "Resolvida"),
            (Fechada, "Fechada"),
            (Reaberta, "Reaberta"),
        ] {
            assert_eq!(status.as_str(), *expected);
        }
    }

    #[test]
    fn ocorrencia_tipo_as_str_roundtrip() {
        use OcorrenciaTipo::*;
        for (tipo, expected) in &[
            (Avaria, "Avaria"),
            (Pedido, "Pedido"),
            (Reclamacao, "Reclamacao"),
            (Pergunta, "Pergunta"),
            (TarefaInterna, "Tarefa Interna"),
        ] {
            assert_eq!(tipo.as_str(), *expected);
        }
    }

    // ── Ocorrencia default values ──

    #[test]
    fn ocorrencia_default_tipo_is_avaria() {
        let o = Ocorrencia::default();
        assert_eq!(o.tipo, OcorrenciaTipo::Avaria);
    }

    #[test]
    fn ocorrencia_default_status_is_nova() {
        let o = Ocorrencia::default();
        assert_eq!(o.status, OcorrenciaStatus::Nova);
    }

    // ── Ensure demo defaults ──

    #[test]
    fn ensure_demo_defaults_does_not_change_seeded_store() {
        let mut store = seeded_store();
        let demo: DemoData =
            serde_json::from_str(include_str!("../../../../mock/demo-data.json")).unwrap();
        let before = store.clone();
        store.ensure_demo_defaults(&demo);
        // Serialize both and compare — they should be identical
        let before_json = serde_json::to_value(&before).unwrap();
        let after_json = serde_json::to_value(&store).unwrap();
        assert_eq!(before_json, after_json);
    }
}
