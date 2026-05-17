use chrono::{DateTime, Duration, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use uuid::Uuid;

use super::demo::DemoData;

#[derive(Debug, Clone, Deserialize, Serialize)]
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
    pub suppliers: Vec<Supplier>,
    pub documents: Vec<Document>,
    pub reports: Vec<Report>,
    pub maintenance: Vec<MaintenanceItem>,
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
    #[serde(default, rename = "auditLog")]
    pub audit_log: Vec<AuditLogEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
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
    pub created_at: DateTime<Utc>,
    #[serde(default = "now_utc")]
    pub expires_at: DateTime<Utc>,
    #[serde(default = "now_utc")]
    pub refresh_expires_at: DateTime<Utc>,
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
            self.internal_code = format!(
                "COND-{}",
                self.name.chars().take(6).collect::<String>().to_uppercase()
            );
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

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub id: String,
    pub title: String,
    pub condominium: String,
    pub priority: AvariaPriority,
    pub status: AvariaStatus,
    pub detail: String,
    pub updated_at: String,
    #[serde(default = "default_ticket_category")]
    pub category: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub resident: String,
    #[serde(default)]
    pub reporter_name: String,
    #[serde(default)]
    pub assigned_technician: String,
    #[serde(default)]
    pub sla_due_at: String,
    #[serde(default)]
    pub sla_state: SlaState,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub resolved_at: Option<String>,
    #[serde(default)]
    pub confirmed_at: Option<String>,
    #[serde(default)]
    pub is_emergency: bool,
    #[serde(default)]
    pub timeline: Vec<AvariaEvent>,
    #[serde(default)]
    pub attachments: Vec<AvariaAttachment>,
    #[serde(default)]
    pub messages: Vec<AvariaMessage>,
    #[serde(default)]
    pub checklist: Vec<AvariaChecklistItem>,
    #[serde(default)]
    pub customer_profile: CustomerOperationalProfile,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum AvariaPriority {
    Baixa,
    #[default]
    Normal,
    Alta,
    Critica,
    Emergencia,
}

impl AvariaPriority {
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::Baixa => "Baixa",
            Self::Normal => "Normal",
            Self::Alta => "Alta",
            Self::Critica => "Critica",
            Self::Emergencia => "Emergencia",
        }
    }

    pub fn from_label(value: &str) -> Self {
        let normalized = normalize_domain_text(value);
        if normalized.contains("emerg") {
            Self::Emergencia
        } else if normalized.contains("crit") || normalized.contains("tic") {
            Self::Critica
        } else if normalized.contains("alta") || normalized.contains("urg") {
            Self::Alta
        } else if normalized.contains("baix") {
            Self::Baixa
        } else {
            Self::Normal
        }
    }

    pub fn is_critical(&self) -> bool {
        matches!(self, Self::Critica | Self::Emergencia)
    }

    pub fn sla_hours(&self) -> i64 {
        match self {
            Self::Emergencia => 2,
            Self::Critica => 6,
            Self::Alta => 24,
            Self::Normal => 72,
            Self::Baixa => 120,
        }
    }
}

impl fmt::Display for AvariaPriority {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_label())
    }
}

impl Serialize for AvariaPriority {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_label())
    }
}

impl<'de> Deserialize<'de> for AvariaPriority {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Ok(Self::from_label(&value))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum AvariaStatus {
    #[default]
    Aberta,
    EmAnalise,
    Atribuida,
    EmDeslocacao,
    NoLocal,
    EmReparacao,
    AguardandoMaterial,
    Resolvida,
    Confirmada,
    Reaberta,
    Fechada,
}

impl AvariaStatus {
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::Aberta => "Aberta",
            Self::EmAnalise => "Em analise",
            Self::Atribuida => "Atribuida",
            Self::EmDeslocacao => "Em deslocacao",
            Self::NoLocal => "No local",
            Self::EmReparacao => "Em reparacao",
            Self::AguardandoMaterial => "Aguardando material",
            Self::Resolvida => "Resolvida",
            Self::Confirmada => "Confirmada",
            Self::Reaberta => "Reaberta",
            Self::Fechada => "Fechada",
        }
    }

    pub fn from_label(value: &str) -> Self {
        let normalized = normalize_domain_text(value);
        if normalized.contains("fech") {
            Self::Fechada
        } else if normalized.contains("reab") {
            Self::Reaberta
        } else if normalized.contains("confirm") {
            Self::Confirmada
        } else if normalized.contains("resolv") || normalized.contains("conclu") {
            Self::Resolvida
        } else if normalized.contains("material")
            || normalized.contains("orc")
            || normalized.contains("aguard")
        {
            Self::AguardandoMaterial
        } else if normalized.contains("repar") || normalized.contains("interv") {
            Self::EmReparacao
        } else if normalized.contains("local") {
            Self::NoLocal
        } else if normalized.contains("desloc") || normalized.contains("caminho") {
            Self::EmDeslocacao
        } else if normalized.contains("atribu")
            || normalized.contains("notific")
            || normalized.contains("agend")
        {
            Self::Atribuida
        } else if normalized.contains("analise") || normalized.contains("anal") {
            Self::EmAnalise
        } else {
            Self::Aberta
        }
    }

    pub fn can_transition_to(&self, target: &Self) -> bool {
        if self == target {
            return true;
        }

        if matches!(self, Self::Fechada) && !matches!(target, Self::Reaberta) {
            return false;
        }

        if matches!(target, Self::Confirmada) && !matches!(self, Self::Resolvida) {
            return false;
        }

        true
    }

    pub fn is_closed(&self) -> bool {
        matches!(self, Self::Resolvida | Self::Confirmada | Self::Fechada)
    }
}

impl fmt::Display for AvariaStatus {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_label())
    }
}

impl Serialize for AvariaStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_label())
    }
}

impl<'de> Deserialize<'de> for AvariaStatus {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Ok(Self::from_label(&value))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum SlaState {
    DentroPrazo,
    ProximoLimite,
    EmRisco,
    Expirado,
    #[default]
    SemSla,
}

impl SlaState {
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::DentroPrazo => "Dentro do prazo",
            Self::ProximoLimite => "Proximo do limite",
            Self::EmRisco => "SLA em risco",
            Self::Expirado => "SLA expirado",
            Self::SemSla => "Sem SLA",
        }
    }

    pub fn from_label(value: &str) -> Self {
        let normalized = normalize_domain_text(value);
        if normalized.contains("expir") {
            Self::Expirado
        } else if normalized.contains("risco") {
            Self::EmRisco
        } else if normalized.contains("proximo") || normalized.contains("limite") {
            Self::ProximoLimite
        } else if normalized.contains("prazo") || normalized.contains("dentro") {
            Self::DentroPrazo
        } else {
            Self::SemSla
        }
    }
}

impl fmt::Display for SlaState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_label())
    }
}

impl Serialize for SlaState {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_label())
    }
}

impl<'de> Deserialize<'de> for SlaState {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Ok(Self::from_label(&value))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum AvariaEventType {
    #[default]
    Created,
    StatusChanged,
    Assigned,
    NoteAdded,
    AttachmentAdded,
    MessageAdded,
    ChecklistUpdated,
    ResolutionConfirmed,
    ResolutionRejected,
    Reopened,
}

impl AvariaEventType {
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::Created => "created",
            Self::StatusChanged => "statusChanged",
            Self::Assigned => "assigned",
            Self::NoteAdded => "noteAdded",
            Self::AttachmentAdded => "attachmentAdded",
            Self::MessageAdded => "messageAdded",
            Self::ChecklistUpdated => "checklistUpdated",
            Self::ResolutionConfirmed => "resolutionConfirmed",
            Self::ResolutionRejected => "resolutionRejected",
            Self::Reopened => "reopened",
        }
    }

    pub fn from_label(value: &str) -> Self {
        match normalize_domain_text(value).as_str() {
            "statuschanged" | "status" => Self::StatusChanged,
            "assigned" | "atribuido" => Self::Assigned,
            "noteadded" | "nota" => Self::NoteAdded,
            "attachmentadded" | "anexo" => Self::AttachmentAdded,
            "messageadded" | "mensagem" => Self::MessageAdded,
            "checklistupdated" | "checklist" => Self::ChecklistUpdated,
            "resolutionconfirmed" | "confirmado" => Self::ResolutionConfirmed,
            "resolutionrejected" | "rejeitado" => Self::ResolutionRejected,
            "reopened" | "reaberto" => Self::Reopened,
            _ => Self::Created,
        }
    }
}

impl Serialize for AvariaEventType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_label())
    }
}

impl<'de> Deserialize<'de> for AvariaEventType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Ok(Self::from_label(&value))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum AttachmentKind {
    #[default]
    Image,
    Video,
    Document,
    BeforePhoto,
    AfterPhoto,
}

impl AttachmentKind {
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Video => "video",
            Self::Document => "document",
            Self::BeforePhoto => "beforePhoto",
            Self::AfterPhoto => "afterPhoto",
        }
    }

    pub fn from_label(value: &str) -> Self {
        let normalized = normalize_domain_text(value);
        if normalized.contains("after") || normalized.contains("depois") {
            Self::AfterPhoto
        } else if normalized.contains("before") || normalized.contains("antes") {
            Self::BeforePhoto
        } else if normalized.contains("video") {
            Self::Video
        } else if normalized.contains("doc") || normalized.contains("pdf") {
            Self::Document
        } else {
            Self::Image
        }
    }
}

impl Serialize for AttachmentKind {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_label())
    }
}

impl<'de> Deserialize<'de> for AttachmentKind {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Ok(Self::from_label(&value))
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvariaEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: AvariaEventType,
    pub label: String,
    pub detail: String,
    pub actor: String,
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_action_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvariaAttachment {
    pub id: String,
    pub kind: AttachmentKind,
    pub file_name: String,
    pub mime_type: String,
    pub url: String,
    #[serde(default)]
    pub storage_key: String,
    #[serde(default)]
    pub size_bytes: u64,
    pub caption: String,
    pub uploaded_by: String,
    pub uploaded_at: String,
    pub pending_sync: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvariaMessage {
    pub id: String,
    pub author: String,
    pub role: String,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvariaChecklistItem {
    pub id: String,
    pub label: String,
    pub required: bool,
    pub completed: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerOperationalProfile {
    pub valid_reports: u16,
    pub reopened_reports: u16,
    pub false_alarms: u16,
    pub internal_notes: String,
    pub last_interaction: String,
}

impl Ticket {
    pub fn ensure_operational_defaults(&mut self) {
        if self.category.trim().is_empty() {
            self.category = infer_ticket_category(&self.title);
        }
        if self.location.trim().is_empty() {
            self.location = infer_ticket_location(&self.title);
        }
        if self.reporter_name.trim().is_empty() {
            self.reporter_name = "Morador".to_string();
        }
        if self.created_at.trim().is_empty() {
            self.created_at = if self.updated_at.trim().is_empty() {
                Utc::now().to_rfc3339()
            } else {
                self.updated_at.clone()
            };
        }
        if self.sla_due_at.trim().is_empty() {
            self.sla_due_at =
                (Utc::now() + Duration::hours(self.priority.sla_hours())).to_rfc3339();
        }
        self.is_emergency = self.is_emergency || is_emergency_ticket(&self.title, &self.priority);
        self.refresh_sla_state();
        if self.timeline.is_empty() {
            self.timeline.push(AvariaEvent {
                id: Uuid::new_v4().to_string(),
                kind: AvariaEventType::Created,
                label: "Avaria registada".to_string(),
                detail: self.detail.clone(),
                actor: self.reporter_name.clone(),
                created_at: self.created_at.clone(),
                client_action_id: None,
            });
        }
        if self.checklist.is_empty() {
            self.checklist = default_checklist_for_category(&self.category);
        }
    }

    pub fn add_event(
        &mut self,
        kind: AvariaEventType,
        label: impl Into<String>,
        detail: impl Into<String>,
        actor: impl Into<String>,
    ) {
        self.add_event_with_client_action(kind, label, detail, actor, None);
    }

    pub fn add_event_with_client_action(
        &mut self,
        kind: AvariaEventType,
        label: impl Into<String>,
        detail: impl Into<String>,
        actor: impl Into<String>,
        client_action_id: Option<String>,
    ) {
        self.timeline.insert(
            0,
            AvariaEvent {
                id: Uuid::new_v4().to_string(),
                kind,
                label: label.into(),
                detail: detail.into(),
                actor: actor.into(),
                created_at: Utc::now().to_rfc3339(),
                client_action_id,
            },
        );
        self.timeline.truncate(120);
    }

    pub fn has_client_action(&self, client_action_id: Option<&str>) -> bool {
        client_action_id.is_some_and(|client_action_id| {
            self.timeline
                .iter()
                .any(|event| event.client_action_id.as_deref() == Some(client_action_id))
        })
    }

    pub fn refresh_sla_state(&mut self) {
        self.sla_state = calculate_sla_state(&self.sla_due_at, &self.status);
    }
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
    pub supplier: String,
    pub status: String,
    pub date: String,
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
                .map(|item| Condominium {
                    id: Uuid::new_v4().to_string(),
                    name: item.name.clone(),
                    location: item.location.clone(),
                    buildings: item.buildings,
                    fractions: item.fractions,
                    residents: item.residents,
                    status: item.status.clone(),
                    notice: item.notice.clone(),
                    internal_code: String::new(),
                    external_reference: String::new(),
                    condominium_type: "residencial".to_string(),
                    subtype: String::new(),
                    management_start_date: String::new(),
                    management_end_date: String::new(),
                    manager: demo.user.name.clone(),
                    team: "Equipa GESTISAC".to_string(),
                    management_company: "GESTISAC".to_string(),
                    short_description: String::new(),
                    administrative_notes: String::new(),
                    tags: Vec::new(),
                    archived: false,
                    archived_at: None,
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
                    onboarding_draft: None,
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                })
                .collect(),
            buildings: default_buildings(&demo.active_condominium),
            fractions: default_fractions(&demo.active_condominium),
            residents: default_residents(&demo.active_condominium),
            tickets: demo
                .tickets
                .iter()
                .map(|item| {
                    let mut ticket = Ticket {
                        id: Uuid::new_v4().to_string(),
                        title: item.title.clone(),
                        condominium: item.condominium.clone(),
                        priority: AvariaPriority::from_label(&item.priority),
                        status: AvariaStatus::from_label(&item.status),
                        detail: item.status.clone(),
                        updated_at: item.updated_at.clone(),
                        category: infer_ticket_category(&item.title),
                        location: infer_ticket_location(&item.title),
                        resident: String::new(),
                        reporter_name: "Morador".to_string(),
                        assigned_technician: infer_assigned_technician(&item.title),
                        sla_due_at: String::new(),
                        sla_state: SlaState::SemSla,
                        created_at: item.updated_at.clone(),
                        resolved_at: None,
                        confirmed_at: None,
                        is_emergency: is_emergency_ticket(
                            &item.title,
                            &AvariaPriority::from_label(&item.priority),
                        ),
                        timeline: Vec::new(),
                        attachments: Vec::new(),
                        messages: Vec::new(),
                        checklist: Vec::new(),
                        customer_profile: CustomerOperationalProfile::default(),
                    };
                    ticket.ensure_operational_defaults();
                    ticket
                })
                .collect(),
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
                    supplier: item.supplier.clone(),
                    status: item.status.clone(),
                    date: item.date.clone(),
                })
                .collect(),
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
        for ticket in &mut self.tickets {
            ticket.ensure_operational_defaults();
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

    pub fn dashboard(&self, user: PublicUser) -> DashboardResponse {
        let active_condominium = if user.active_condominium.is_empty() {
            self.active_condominium.clone()
        } else {
            user.active_condominium.clone()
        };
        let urgent_tickets = self
            .tickets
            .iter()
            .filter(|ticket| is_critical_priority(&ticket.priority))
            .count();
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
                    label: format!("{urgent_tickets} avaria critica"),
                    tone: "risk".to_string(),
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
                    title: "Novo Ticket".to_string(),
                    description: "Abrir ocorrencia".to_string(),
                    icon: "+".to_string(),
                    tone: "blue".to_string(),
                },
                QuickAction {
                    title: "Emitir Recibo".to_string(),
                    description: "Gerar recibo".to_string(),
                    icon: "R".to_string(),
                    tone: "green".to_string(),
                },
                QuickAction {
                    title: "Novo Condominio".to_string(),
                    description: "Adicionar predio".to_string(),
                    icon: "B".to_string(),
                    tone: "purple".to_string(),
                },
                QuickAction {
                    title: "Gerar Relatorio".to_string(),
                    description: "Exportar dados".to_string(),
                    icon: "Q".to_string(),
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
        let accounting = self.accounting_summary();

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
                    metric(self.tickets.len().to_string(), "Alertas", Some("urgent")),
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
                        format_currency(accounting.current_balance),
                        "Saldo atual",
                        None,
                    ),
                    metric(
                        format!("{}%", accounting.paid_quota_percentage),
                        "Quotas pagas",
                        None,
                    ),
                    metric(
                        accounting.overdue_count.to_string(),
                        "Em atraso",
                        Some("warning"),
                    ),
                    metric(
                        format_currency(accounting.monthly_expenses),
                        "Despesas do mes",
                        None,
                    ),
                ],
            },
            DashboardModule {
                id: "administration".to_string(),
                title: "Administracao".to_string(),
                subtitle: "Operacoes e manutencao".to_string(),
                tone: "purple".to_string(),
                cta: "Gerir administracao".to_string(),
                path: "/administracao".to_string(),
                visual: "tools".to_string(),
                metrics: vec![
                    metric(
                        self.tickets.len().to_string(),
                        "Tickets abertos",
                        Some("urgent"),
                    ),
                    metric(
                        self.maintenance.len().to_string(),
                        "Manutencoes",
                        Some("warning"),
                    ),
                    metric("2", "Seguros a expirar", Some("warning")),
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

        alerts.extend(self.tickets.iter().take(2).map(|ticket| DashboardAlert {
            kind: "ticket".to_string(),
            title: ticket.title.clone(),
            detail: format!("{} - {}", ticket.condominium, ticket.status),
            tone: "gold".to_string(),
            icon: "!".to_string(),
        }));

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

fn is_critical_priority(priority: &AvariaPriority) -> bool {
    priority.is_critical()
}

fn format_currency(value: Decimal) -> String {
    format!("{value:.2} EUR")
}

fn default_ticket_category() -> String {
    "Operacional".to_string()
}

fn infer_ticket_category(title: &str) -> String {
    let normalized = normalize_domain_text(title);
    if normalized.contains("elevador") {
        "Elevadores".to_string()
    } else if normalized.contains("infiltr") || normalized.contains("agua") {
        "Agua e infiltracoes".to_string()
    } else if normalized.contains("luz")
        || normalized.contains("eletric")
        || normalized.contains("curto")
    {
        "Eletricidade".to_string()
    } else if normalized.contains("incend") || normalized.contains("alarme") {
        "Seguranca".to_string()
    } else {
        default_ticket_category()
    }
}

fn infer_ticket_location(title: &str) -> String {
    let normalized = normalize_domain_text(title);
    if normalized.contains("garagem") {
        "Garagem".to_string()
    } else if normalized.contains("elevador") {
        "Elevador".to_string()
    } else if normalized.contains("hall") {
        "Hall principal".to_string()
    } else if normalized.contains("piscina") {
        "Piscina".to_string()
    } else if normalized.contains("entrada") {
        "Entrada".to_string()
    } else {
        "Zona comum".to_string()
    }
}

fn infer_assigned_technician(title: &str) -> String {
    let normalized = normalize_domain_text(title);
    if normalized.contains("elevador") {
        "Elevatec Lisboa".to_string()
    } else if normalized.contains("incend") || normalized.contains("alarme") {
        "SafeBuilding".to_string()
    } else {
        String::new()
    }
}

fn is_emergency_ticket(title: &str, priority: &AvariaPriority) -> bool {
    let normalized = normalize_domain_text(title);
    priority.is_critical()
        || normalized.contains("incend")
        || normalized.contains("fuga")
        || normalized.contains("curto")
        || normalized.contains("preso")
        || normalized.contains("falha eletrica")
}

fn default_checklist_for_category(category: &str) -> Vec<AvariaChecklistItem> {
    let normalized = normalize_domain_text(category);
    if normalized.contains("eletric") {
        vec![
            checklist_item("Validar seguranca da zona", true),
            checklist_item("Verificar disjuntor/quadro eletrico", true),
            checklist_item("Testar tensao", true),
            checklist_item("Confirmar reparacao com evidencia visual", true),
        ]
    } else if normalized.contains("elevador") {
        vec![
            checklist_item("Confirmar elevador afetado", true),
            checklist_item("Contactar fornecedor certificado", true),
            checklist_item("Sinalizar indisponibilidade aos moradores", true),
            checklist_item("Validar reposicao do servico", true),
        ]
    } else if normalized.contains("agua") || normalized.contains("infiltr") {
        vec![
            checklist_item("Localizar origem provavel", true),
            checklist_item("Registar fotos antes da intervencao", true),
            checklist_item("Avaliar risco de danos adicionais", true),
            checklist_item("Registar fotos depois da intervencao", false),
        ]
    } else {
        vec![
            checklist_item("Validar descricao da avaria", true),
            checklist_item("Registar evidencia visual", false),
            checklist_item("Atualizar estado operacional", true),
        ]
    }
}

fn checklist_item(label: &str, required: bool) -> AvariaChecklistItem {
    AvariaChecklistItem {
        id: Uuid::new_v4().to_string(),
        label: label.to_string(),
        required,
        completed: false,
    }
}

fn calculate_sla_state(sla_due_at: &str, status: &AvariaStatus) -> SlaState {
    if status.is_closed() {
        return SlaState::DentroPrazo;
    }

    let Ok(due_at) = DateTime::parse_from_rfc3339(sla_due_at) else {
        return SlaState::SemSla;
    };
    let remaining = due_at.with_timezone(&Utc) - Utc::now();
    if remaining <= Duration::zero() {
        SlaState::Expirado
    } else if remaining <= Duration::hours(2) {
        SlaState::EmRisco
    } else if remaining <= Duration::hours(8) {
        SlaState::ProximoLimite
    } else {
        SlaState::DentroPrazo
    }
}

fn normalize_domain_text(value: &str) -> String {
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
            other => other,
        })
        .collect()
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

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded_store() -> AppStore {
        let demo: DemoData = serde_json::from_str(include_str!("../../../../mock/demo-data.json"))
            .expect("demo-data.json must remain valid test fixture JSON");
        AppStore::seed_from_demo(&demo, "password-hash".to_string())
    }

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

    #[test]
    fn dashboard_counts_accented_critical_priorities() {
        let store = seeded_store();
        let user_id = store.users[0].id.clone();
        let user = store
            .public_user(&user_id)
            .expect("seeded store must include public demo admin");

        let dashboard = store.dashboard(user);

        assert_eq!(dashboard.operational_summary[0].label, "1 avaria critica");
    }

    #[test]
    fn seeded_tickets_gain_operational_defaults() {
        let store = seeded_store();
        let ticket = &store.tickets[0];

        assert!(ticket.priority.is_critical());
        assert!(!ticket.timeline.is_empty());
        assert!(!ticket.checklist.is_empty());
        assert!(!ticket.sla_due_at.is_empty());
    }

    #[test]
    fn status_confirmation_requires_resolved_ticket() {
        assert!(!AvariaStatus::Aberta.can_transition_to(&AvariaStatus::Confirmada));
        assert!(AvariaStatus::Resolvida.can_transition_to(&AvariaStatus::Confirmada));
        assert!(!AvariaStatus::Fechada.can_transition_to(&AvariaStatus::Atribuida));
        assert!(AvariaStatus::Fechada.can_transition_to(&AvariaStatus::Reaberta));
    }

    #[test]
    fn ticket_detects_replayed_client_actions() {
        let mut store = seeded_store();
        let ticket = &mut store.tickets[0];

        assert!(!ticket.has_client_action(Some("offline-1")));

        ticket.add_event_with_client_action(
            AvariaEventType::MessageAdded,
            "Mensagem adicionada",
            "Teste offline",
            "Tecnico",
            Some("offline-1".to_string()),
        );

        assert!(ticket.has_client_action(Some("offline-1")));
        assert!(!ticket.has_client_action(Some("offline-2")));
    }
}
