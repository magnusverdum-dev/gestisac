pub mod accounting;
pub mod administration;
pub mod app_namespaces;
pub mod auth;
pub mod chat;
pub mod condominiums;
pub mod dashboard;
pub mod documents;
pub mod health;
pub mod ocorrencias;
pub mod reports;
pub mod resources;
pub mod team;
pub mod version;

use crate::{error::ApiError, state::AppState};
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health::health))
        .merge(app_namespaces::router())
        .route("/api/health", get(health::health))
        .route("/api/warmup", get(health::warmup))
        .route("/api/version", get(version::version))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/browser-session", get(auth::browser_session))
        .route("/api/auth/refresh", post(auth::refresh))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/me", get(auth::me))
        .route(
            "/api/chat/messages",
            get(chat::list_messages).post(chat::create_message),
        )
        .route("/api/permissions", get(auth::permissions))
        .route("/api/team", get(team::team))
        .route("/api/dashboard", get(dashboard::dashboard))
        .route(
            "/api/active-condominium",
            get(condominiums::active_condominium).put(condominiums::update_active_condominium),
        )
        .route("/api/accounting/summary", get(accounting::summary))
        .route("/api/accounting/overview", get(accounting::overview))
        .route(
            "/api/accounting/context/condominiums/{id}",
            get(accounting::condominium_context),
        )
        .route(
            "/api/accounting/statements/fractions/{fraction_id}",
            get(accounting::fraction_statement),
        )
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
            "/api/accounting/payment-agreements",
            get(accounting::payment_agreements).post(accounting::create_payment_agreement),
        )
        .route(
            "/api/accounting/cash-movements",
            get(accounting::cash_movements).post(accounting::create_cash_movement),
        )
        .route(
            "/api/accounting/bank-transactions",
            get(accounting::bank_transactions).post(accounting::create_bank_transaction),
        )
        .route(
            "/api/accounting/reconciliations",
            get(accounting::reconciliations).post(accounting::create_reconciliation),
        )
        .route(
            "/api/condominiums",
            get(condominiums::condominiums).post(condominiums::create_condominium),
        )
        .route(
            "/api/condominiums/import/preview",
            post(condominiums::import_preview),
        )
        .route(
            "/api/condominiums/import/commit",
            post(condominiums::import_commit),
        )
        .route(
            "/api/condominiums/import/preview-file",
            post(condominiums::import_preview_file),
        )
        .route(
            "/api/condominiums/import/preview-mapped",
            post(condominiums::import_preview_mapped),
        )
        .route(
            "/api/condominiums/{id}",
            get(condominiums::condominium_detail)
                .put(condominiums::update_condominium)
                .delete(condominiums::delete_condominium),
        )
        .route(
            "/api/condominiums/{id}/archive",
            post(condominiums::archive_condominium),
        )
        .route(
            "/api/condominiums/{id}/history",
            get(condominiums::condominium_history),
        )
        .route(
            "/api/condominiums/{id}/completeness",
            get(condominiums::condominium_completeness),
        )
        .route(
            "/api/condominiums/{id}/alerts",
            get(condominiums::condominium_alerts),
        )
        .route(
            "/api/condominiums/{id}/identification",
            put(condominiums::update_identification),
        )
        .route(
            "/api/condominiums/{id}/address",
            put(condominiums::update_address),
        )
        .route(
            "/api/condominiums/{id}/structure",
            put(condominiums::update_structure),
        )
        .route(
            "/api/condominiums/{id}/operational-status",
            put(condominiums::update_operational_status),
        )
        .route(
            "/api/condominiums/{id}/onboarding-draft",
            put(condominiums::save_condominium_draft),
        )
        .route(
            "/api/condominiums/{id}/blocks",
            get(condominiums::condominium_blocks).post(condominiums::create_condominium_block),
        )
        .route(
            "/api/condominiums/{id}/blocks/{resource_id}",
            put(condominiums::update_condominium_block)
                .delete(condominiums::delete_condominium_block),
        )
        .route(
            "/api/condominiums/{id}/floors",
            get(condominiums::condominium_floors).post(condominiums::create_condominium_floor),
        )
        .route(
            "/api/condominiums/{id}/floors/{resource_id}",
            put(condominiums::update_condominium_floor)
                .delete(condominiums::delete_condominium_floor),
        )
        .route(
            "/api/condominiums/{id}/zones",
            get(condominiums::condominium_zones).post(condominiums::create_condominium_zone),
        )
        .route(
            "/api/condominiums/{id}/zones/{resource_id}",
            put(condominiums::update_condominium_zone)
                .delete(condominiums::delete_condominium_zone),
        )
        .route(
            "/api/condominiums/{id}/zones/{resource_id}/qr.svg",
            get(condominiums::condominium_zone_qr_svg),
        )
        .route(
            "/api/condominiums/{id}/equipment",
            get(condominiums::condominium_equipment)
                .post(condominiums::create_condominium_equipment),
        )
        .route(
            "/api/condominiums/{id}/equipment/{resource_id}",
            put(condominiums::update_condominium_equipment)
                .delete(condominiums::delete_condominium_equipment),
        )
        .route(
            "/api/condominiums/{id}/contacts",
            get(condominiums::condominium_contacts).post(condominiums::create_condominium_contact),
        )
        .route(
            "/api/condominiums/{id}/contacts/{resource_id}",
            put(condominiums::update_condominium_contact)
                .delete(condominiums::delete_condominium_contact),
        )
        .route(
            "/api/condominiums/{id}/documents",
            get(condominiums::condominium_documents)
                .post(condominiums::create_condominium_document),
        )
        .route(
            "/api/condominiums/{id}/documents/upload",
            post(condominiums::upload_condominium_document),
        )
        .route(
            "/api/condominiums/{id}/documents/{resource_id}",
            put(condominiums::update_condominium_document)
                .delete(condominiums::delete_condominium_document),
        )
        .route(
            "/api/condominiums/{id}/documents/{resource_id}/download",
            get(condominiums::download_condominium_document),
        )
        .route(
            "/api/condominiums/{id}/media",
            get(condominiums::condominium_media).post(condominiums::create_condominium_media),
        )
        .route(
            "/api/condominiums/{id}/media/upload",
            post(condominiums::upload_condominium_media),
        )
        .route(
            "/api/condominiums/{id}/media/{resource_id}",
            put(condominiums::update_condominium_media)
                .delete(condominiums::delete_condominium_media),
        )
        .route(
            "/api/condominiums/{id}/media/{resource_id}/download",
            get(condominiums::download_condominium_media),
        )
        .route(
            "/api/condominiums/{id}/plan-markers",
            get(condominiums::condominium_plan_markers)
                .post(condominiums::create_condominium_plan_marker),
        )
        .route(
            "/api/condominiums/{id}/plan-markers/{resource_id}",
            put(condominiums::update_condominium_plan_marker)
                .delete(condominiums::delete_condominium_plan_marker),
        )
        .route(
            "/api/condominiums/{id}/notes",
            get(condominiums::condominium_notes).post(condominiums::create_condominium_note),
        )
        .route(
            "/api/condominiums/{id}/notes/{resource_id}",
            put(condominiums::update_condominium_note)
                .delete(condominiums::delete_condominium_note),
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
            "/api/inspections",
            get(resources::inspections).post(resources::create_inspection),
        )
        .route(
            "/api/inspections/{id}",
            put(resources::update_inspection).delete(resources::delete_inspection),
        )
        .route(
            "/api/calendar-events",
            get(resources::calendar_events).post(resources::create_calendar_event),
        )
        .route(
            "/api/calendar-events/{id}",
            put(resources::update_calendar_event).delete(resources::delete_calendar_event),
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
        // ── Ocorrencias (Tickets & Avarias) ──
        .route("/api/worker/tickets", get(ocorrencias::worker_tickets))
        .route(
            "/api/ocorrencias",
            get(ocorrencias::listar).post(ocorrencias::criar),
        )
        .route("/api/ocorrencias/from-qr", post(ocorrencias::criar_from_qr))
        .route("/api/ocorrencias/publica", post(ocorrencias::criar_publica))
        .route("/api/ocorrencias/metricas", get(ocorrencias::metricas))
        .route(
            "/api/ocorrencias/{id}",
            get(ocorrencias::detalhe)
                .put(ocorrencias::atualizar)
                .delete(ocorrencias::apagar),
        )
        .route(
            "/api/ocorrencias/{id}/status",
            patch(ocorrencias::transitar_status),
        )
        .route(
            "/api/ocorrencias/{id}/worker-action",
            post(ocorrencias::worker_action),
        )
        .route(
            "/api/ocorrencias/{id}/validate-resolution",
            post(ocorrencias::validate_resolution),
        )
        .route(
            "/api/ocorrencias/{id}/comentarios",
            get(ocorrencias::comentarios_listar).post(ocorrencias::comentarios_criar),
        )
        .route(
            "/api/ocorrencias/{id}/anexos",
            post(ocorrencias::anexos_upload),
        )
        .route(
            "/api/ocorrencias/{id}/anexos/{anexo_id}",
            delete(ocorrencias::anexos_apagar),
        )
        .route("/api/ocorrencias/{id}/reabrir", post(ocorrencias::reabrir))
        .fallback(|| async { ApiError::not_found("Route not found") })
        .with_state(state)
}
