use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DemoData {
    pub version: Version,
    pub user: User,
    #[serde(rename = "activeCondominium")]
    pub active_condominium: String,
    #[serde(rename = "urgentNotice")]
    pub urgent_notice: UrgentNotice,
    #[serde(rename = "operationalSummary")]
    pub operational_summary: Vec<OperationalSummaryItem>,
    #[serde(rename = "quickActions")]
    pub quick_actions: Vec<QuickAction>,
    #[serde(rename = "dashboardModules")]
    pub dashboard_modules: Vec<DashboardModule>,
    pub alerts: Vec<Alert>,
    pub condominiums: Vec<Condominium>,
    pub tickets: Vec<Ticket>,
    pub payments: Vec<PaymentSummary>,
    pub documents: Vec<Document>,
    pub reports: Vec<Report>,
    pub maintenance: Vec<MaintenanceItem>,
    pub suppliers: Vec<Supplier>,
    pub assemblies: Vec<Assembly>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Version {
    pub name: String,
    pub version: String,
    pub environment: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct User {
    pub name: String,
    pub role: String,
    #[serde(rename = "activeCondominiums")]
    pub active_condominiums: u16,
    #[serde(rename = "lastAccess")]
    pub last_access: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UrgentNotice {
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub priority: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OperationalSummaryItem {
    pub label: String,
    pub tone: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QuickAction {
    pub title: String,
    pub description: String,
    pub icon: String,
    pub tone: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DashboardModule {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub tone: String,
    pub cta: String,
    pub path: String,
    pub visual: String,
    pub metrics: Vec<Metric>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Metric {
    pub value: String,
    pub label: String,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Alert {
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub tone: String,
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Condominium {
    pub name: String,
    pub location: String,
    pub buildings: u16,
    pub fractions: u16,
    pub residents: u16,
    pub status: String,
    pub notice: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Ticket {
    pub title: String,
    pub condominium: String,
    pub priority: String,
    pub status: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PaymentSummary {
    pub label: String,
    pub value: String,
    pub detail: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Document {
    pub title: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub condominium: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Report {
    pub title: String,
    pub period: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MaintenanceItem {
    pub title: String,
    pub supplier: String,
    pub status: String,
    pub date: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Supplier {
    pub name: String,
    pub category: String,
    pub status: String,
    pub contact: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Assembly {
    pub title: String,
    pub condominium: String,
    pub date: String,
    pub status: String,
}
