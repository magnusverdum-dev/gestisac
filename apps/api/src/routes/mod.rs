pub mod accounting;
pub mod administration;
pub mod auth;
pub mod condominiums;
pub mod dashboard;
pub mod documents;
pub mod health;
pub mod reports;
pub mod resources;
pub mod version;

use crate::{error::ApiError, state::AppState};
use axum::{
    routing::{get, post, put},
    Router,
};

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health::health))
        .route("/api/health", get(health::health))
        .route("/api/version", get(version::version))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/refresh", post(auth::refresh))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/me", get(auth::me))
        .route("/api/permissions", get(auth::permissions))
        .route("/api/dashboard", get(dashboard::dashboard))
        .route(
            "/api/active-condominium",
            get(condominiums::active_condominium).put(condominiums::update_active_condominium),
        )
        .route("/api/accounting/summary", get(accounting::summary))
        .route(
            "/api/accounting/quotas",
            get(accounting::quotas).post(accounting::create_quota),
        )
        .route(
            "/api/accounting/quotas/{id}",
            put(accounting::update_quota).delete(accounting::delete_quota),
        )
        .route(
            "/api/accounting/payments",
            get(accounting::payments).post(accounting::create_payment),
        )
        .route(
            "/api/accounting/payments/{id}",
            put(accounting::update_payment).delete(accounting::delete_payment),
        )
        .route(
            "/api/accounting/debts",
            get(accounting::debts).post(accounting::create_debt),
        )
        .route(
            "/api/accounting/debts/{id}",
            put(accounting::update_debt).delete(accounting::delete_debt),
        )
        .route(
            "/api/accounting/receipts",
            get(accounting::receipts).post(accounting::create_receipt),
        )
        .route(
            "/api/accounting/receipts/{id}",
            put(accounting::update_receipt).delete(accounting::delete_receipt),
        )
        .route(
            "/api/accounting/expenses",
            get(accounting::expenses).post(accounting::create_expense),
        )
        .route(
            "/api/accounting/expenses/{id}",
            put(accounting::update_expense).delete(accounting::delete_expense),
        )
        .route(
            "/api/accounting/reserve-funds",
            get(accounting::reserve_funds),
        )
        .route(
            "/api/condominiums",
            get(condominiums::condominiums).post(condominiums::create_condominium),
        )
        .route(
            "/api/condominiums/{id}",
            put(condominiums::update_condominium).delete(condominiums::delete_condominium),
        )
        .route(
            "/api/buildings",
            get(condominiums::buildings).post(condominiums::create_building),
        )
        .route(
            "/api/buildings/{id}",
            put(condominiums::update_building).delete(condominiums::delete_building),
        )
        .route(
            "/api/fractions",
            get(condominiums::fractions).post(condominiums::create_fraction),
        )
        .route(
            "/api/fractions/{id}",
            put(condominiums::update_fraction).delete(condominiums::delete_fraction),
        )
        .route(
            "/api/residents",
            get(condominiums::residents).post(condominiums::create_resident),
        )
        .route(
            "/api/residents/{id}",
            put(condominiums::update_resident).delete(condominiums::delete_resident),
        )
        .route(
            "/api/tickets",
            get(administration::tickets).post(administration::create_ticket),
        )
        .route(
            "/api/tickets/{id}",
            put(administration::update_ticket).delete(administration::delete_ticket),
        )
        .route(
            "/api/reports",
            get(reports::reports).post(reports::create_report),
        )
        .route("/api/reports/{id}/preview", get(reports::report_preview))
        .route("/api/reports/{id}/export", post(reports::export_report))
        .route(
            "/api/reports/{id}",
            put(reports::update_report).delete(reports::delete_report),
        )
        .route(
            "/api/assemblies",
            get(administration::assemblies).post(administration::create_assembly),
        )
        .route(
            "/api/assemblies/{id}",
            put(administration::update_assembly).delete(administration::delete_assembly),
        )
        .route(
            "/api/documents",
            get(documents::documents).post(documents::create_document),
        )
        .route(
            "/api/documents/templates",
            get(documents::document_templates),
        )
        .route(
            "/api/documents/generate",
            post(documents::generate_document),
        )
        .route("/api/documents/upload", post(documents::upload_document))
        .route(
            "/api/documents/{id}/preview",
            get(documents::document_preview),
        )
        .route(
            "/api/documents/{id}/download",
            get(documents::download_document),
        )
        .route(
            "/api/documents/{id}",
            put(documents::update_document).delete(documents::delete_document),
        )
        .route(
            "/api/maintenance",
            get(administration::maintenance).post(administration::create_maintenance),
        )
        .route(
            "/api/maintenance/{id}",
            put(administration::update_maintenance).delete(administration::delete_maintenance),
        )
        .route(
            "/api/suppliers",
            get(administration::suppliers).post(administration::create_supplier),
        )
        .route(
            "/api/suppliers/{id}",
            put(administration::update_supplier).delete(administration::delete_supplier),
        )
        .route("/api/audit-log", get(administration::audit_log))
        .fallback(|| async { ApiError::not_found("Route not found") })
        .with_state(state)
}
