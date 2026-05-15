use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
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

#[derive(Debug, Clone, Deserialize, Serialize)]
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
    pub priority: String,
    pub status: String,
    pub detail: String,
    pub updated_at: String,
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
                })
                .collect(),
            buildings: default_buildings(&demo.active_condominium),
            fractions: default_fractions(&demo.active_condominium),
            residents: default_residents(&demo.active_condominium),
            tickets: demo
                .tickets
                .iter()
                .map(|item| Ticket {
                    id: Uuid::new_v4().to_string(),
                    title: item.title.clone(),
                    condominium: item.condominium.clone(),
                    priority: item.priority.clone(),
                    status: item.status.clone(),
                    detail: item.status.clone(),
                    updated_at: item.updated_at.clone(),
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

fn is_critical_priority(priority: &str) -> bool {
    let normalized = priority.to_lowercase();
    normalized.contains("crit") || normalized.contains("tic")
}

fn format_currency(value: Decimal) -> String {
    format!("{value:.2} EUR")
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
}
