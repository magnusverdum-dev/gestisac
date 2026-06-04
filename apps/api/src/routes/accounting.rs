use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{
            AccountingPayment, AccountingSummary, AppStore, BankReconciliation, BankTransaction,
            CashMovement, CustomerStatementEntry, Debt, Expense, PaymentAgreement,
            PaymentAgreementInstallment, Quota, Receipt, ReserveFund,
        },
    },
    routes::auth::{
        can_access, current_context, require_delete, require_write, AuthContext, PermissionAction,
        ResourceScope,
    },
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaInput {
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    pub period: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountingPaymentInput {
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub paid_at: String,
    pub method: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebtInput {
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub days_overdue: Option<u16>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptInput {
    pub number: String,
    pub condominium: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub issued_at: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseInput {
    pub condominium: String,
    pub category: String,
    pub supplier: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub due_date: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentAgreementInput {
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    pub debt_id: Option<String>,
    #[serde(with = "rust_decimal::serde::float")]
    pub total_amount: Decimal,
    pub installment_count: u16,
    pub next_due_date: String,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashMovementInput {
    pub condominium: String,
    pub movement_type: String,
    pub account_type: Option<String>,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub occurred_at: String,
    pub source: String,
    pub method: Option<String>,
    pub reference: Option<String>,
    pub status: Option<String>,
    pub linked_entity_type: Option<String>,
    pub linked_entity_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BankTransactionInput {
    pub condominium: String,
    pub occurred_at: String,
    pub description: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub amount: Decimal,
    pub direction: String,
    pub reference: Option<String>,
    pub reconciliation_status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BankReconciliationInput {
    pub bank_transaction_id: String,
    pub target_type: String,
    pub target_id: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountingOverview {
    pub quotas_to_validate: usize,
    pub unreconciled_movements: usize,
    pub oldest_unreconciled_age_days: Option<i64>,
    pub receipts_to_issue: usize,
    pub debts_in_follow_up: usize,
    pub overdue_debt_severity: String,
    pub active_payment_agreements: usize,
    pub broken_payment_agreements: usize,
    pub reserve_fund_status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CondominiumAccountingContext {
    pub condominium_id: String,
    pub condominium: String,
    pub summary: AccountingSummary,
    pub quotas: Vec<Quota>,
    pub payments: Vec<AccountingPayment>,
    pub debts: Vec<Debt>,
    pub receipts: Vec<Receipt>,
    pub expenses: Vec<Expense>,
    pub reserve_funds: Vec<ReserveFund>,
    pub payment_agreements: Vec<PaymentAgreement>,
    pub cash_movements: Vec<CashMovement>,
    pub bank_transactions: Vec<BankTransaction>,
    pub bank_reconciliations: Vec<BankReconciliation>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerStatement {
    pub fraction_id: String,
    pub condominium: String,
    pub fraction: String,
    pub resident: String,
    #[serde(with = "rust_decimal::serde::float")]
    pub balance: Decimal,
    pub entries: Vec<CustomerStatementEntry>,
    pub payment_agreements: Vec<PaymentAgreement>,
}

pub async fn overview(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AccountingOverview>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(accounting_overview(&store)))
}

pub async fn condominium_context(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<CondominiumAccountingContext>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    let condominium = store
        .condominiums
        .iter()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Condominio nao encontrado"))?;
    let name = condominium.name.clone();

    Ok(Json(CondominiumAccountingContext {
        condominium_id: condominium.id.clone(),
        condominium: name.clone(),
        summary: accounting_summary_for(&store, &name),
        quotas: filter_by_condominium(&store.quotas, &name, |item| &item.condominium),
        payments: filter_by_condominium(&store.accounting_payments, &name, |item| {
            &item.condominium
        }),
        debts: filter_by_condominium(&store.debts, &name, |item| &item.condominium),
        receipts: filter_by_condominium(&store.receipts, &name, |item| &item.condominium),
        expenses: filter_by_condominium(&store.expenses, &name, |item| &item.condominium),
        reserve_funds: filter_by_condominium(&store.reserve_funds, &name, |item| &item.condominium),
        payment_agreements: filter_by_condominium(&store.payment_agreements, &name, |item| {
            &item.condominium
        }),
        cash_movements: filter_by_condominium(&store.cash_movements, &name, |item| {
            &item.condominium
        }),
        bank_transactions: filter_by_condominium(&store.bank_transactions, &name, |item| {
            &item.condominium
        }),
        bank_reconciliations: bank_reconciliations_for_condominium(&store, &name),
    }))
}

pub async fn fraction_statement(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(fraction_id): Path<String>,
) -> Result<Json<CustomerStatement>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    let fraction = store
        .fractions
        .iter()
        .find(|item| item.id == fraction_id || item.number == fraction_id)
        .ok_or_else(|| ApiError::not_found("Fracao nao encontrada"))?;
    Ok(Json(customer_statement_for(
        &store,
        &fraction.id,
        &fraction.condominium,
        &fraction.number,
    )))
}

pub async fn summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AccountingSummary>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(store.accounting_summary()))
}

pub async fn quotas(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Quota>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_quotas_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar quotas na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.quotas, &params)))
}

pub async fn create_quota(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<QuotaInput>,
) -> Result<Json<Quota>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_required(&input.period, "Periodo")?;
    validate_positive_amount(input.amount)?;

    let item = Quota {
        id: new_id(),
        condominium: clean(input.condominium),
        fraction: clean(input.fraction),
        resident: clean(input.resident),
        period: clean(input.period),
        amount: input.amount,
        due_date: clean(input.due_date),
        status: input.status.unwrap_or_else(|| "Pendente".to_string()),
    };

    let mut store = state.store.write().await;
    store.quotas.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Quota {} criada para {}", item.period, item.resident),
    );
    drop(store);
    persist_quota_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn delete_quota(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Quota>>, ApiError> {
    let user = require_delete(&headers, &state, "accounting").await?;
    let mut store = state.store.write().await;
    let original_len = store.quotas.len();
    let deleted_name = store
        .quotas
        .iter()
        .find(|item| item.id == id)
        .map(|item| format!("{} {}", item.period, item.resident))
        .unwrap_or_else(|| "Quota".to_string());
    store.quotas.retain(|item| item.id != id);
    if store.quotas.len() == original_len {
        return Err(ApiError::not_found("Quota nao encontrada"));
    }
    store.add_audit(
        &user,
        "accounting",
        "delete",
        &id,
        format!("{deleted_name} apagada"),
    );
    let response = store.quotas.clone();
    drop(store);
    persist_quota_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_quota(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<QuotaInput>,
) -> Result<Json<Quota>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_required(&input.period, "Periodo")?;
    validate_positive_amount(input.amount)?;

    let mut store = state.store.write().await;
    let item = store
        .quotas
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Quota nao encontrada"))?;

    item.condominium = clean(input.condominium);
    item.fraction = clean(input.fraction);
    item.resident = clean(input.resident);
    item.period = clean(input.period);
    item.amount = input.amount;
    item.due_date = clean(input.due_date);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "accounting",
        "update",
        &response.id,
        format!(
            "Quota {} atualizada para {}",
            response.period, response.resident
        ),
    );
    drop(store);
    persist_quota_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn payments(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<AccountingPayment>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_accounting_payments_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar pagamentos na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.accounting_payments, &params)))
}

pub async fn create_payment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<AccountingPaymentInput>,
) -> Result<Json<AccountingPayment>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let item = AccountingPayment {
        id: new_id(),
        condominium: clean(input.condominium),
        fraction: clean(input.fraction),
        resident: clean(input.resident),
        amount: input.amount,
        paid_at: clean(input.paid_at),
        method: input.method.unwrap_or_else(|| "Transferencia".to_string()),
        status: input.status.unwrap_or_else(|| "Confirmado".to_string()),
    };

    let mut store = state.store.write().await;
    store.accounting_payments.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Pagamento de {} registado", item.resident),
    );
    drop(store);
    persist_payment_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn delete_payment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<AccountingPayment>>, ApiError> {
    let user = require_delete(&headers, &state, "accounting").await?;
    let mut store = state.store.write().await;
    let original_len = store.accounting_payments.len();
    let deleted_name = store
        .accounting_payments
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.resident.clone())
        .unwrap_or_else(|| "Pagamento".to_string());
    store.accounting_payments.retain(|item| item.id != id);
    if store.accounting_payments.len() == original_len {
        return Err(ApiError::not_found("Pagamento nao encontrado"));
    }
    store.add_audit(
        &user,
        "accounting",
        "delete",
        &id,
        format!("Pagamento de {deleted_name} apagado"),
    );
    let response = store.accounting_payments.clone();
    drop(store);
    persist_payment_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_payment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<AccountingPaymentInput>,
) -> Result<Json<AccountingPayment>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let mut store = state.store.write().await;
    let item = store
        .accounting_payments
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Pagamento nao encontrado"))?;

    item.condominium = clean(input.condominium);
    item.fraction = clean(input.fraction);
    item.resident = clean(input.resident);
    item.amount = input.amount;
    item.paid_at = clean(input.paid_at);
    item.method = input.method.unwrap_or_else(|| item.method.clone());
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "accounting",
        "update",
        &response.id,
        format!("Pagamento de {} atualizado", response.resident),
    );
    drop(store);
    persist_payment_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn debts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Debt>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_debts_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar dividas na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.debts, &params)))
}

pub async fn create_debt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<DebtInput>,
) -> Result<Json<Debt>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let item = Debt {
        id: new_id(),
        condominium: clean(input.condominium),
        fraction: clean(input.fraction),
        resident: clean(input.resident),
        amount: input.amount,
        due_date: clean(input.due_date),
        days_overdue: input.days_overdue.unwrap_or(0),
        status: input.status.unwrap_or_else(|| "Em atraso".to_string()),
    };

    let mut store = state.store.write().await;
    store.debts.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Divida de {} registada", item.resident),
    );
    drop(store);
    persist_debt_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn delete_debt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Debt>>, ApiError> {
    let user = require_delete(&headers, &state, "accounting").await?;
    let mut store = state.store.write().await;
    let original_len = store.debts.len();
    let deleted_name = store
        .debts
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.resident.clone())
        .unwrap_or_else(|| "Divida".to_string());
    store.debts.retain(|item| item.id != id);
    if store.debts.len() == original_len {
        return Err(ApiError::not_found("Divida nao encontrada"));
    }
    store.add_audit(
        &user,
        "accounting",
        "delete",
        &id,
        format!("Divida de {deleted_name} apagada"),
    );
    let response = store.debts.clone();
    drop(store);
    persist_debt_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_debt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<DebtInput>,
) -> Result<Json<Debt>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let mut store = state.store.write().await;
    let item = store
        .debts
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Divida nao encontrada"))?;

    item.condominium = clean(input.condominium);
    item.fraction = clean(input.fraction);
    item.resident = clean(input.resident);
    item.amount = input.amount;
    item.due_date = clean(input.due_date);
    item.days_overdue = input.days_overdue.unwrap_or(item.days_overdue);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "accounting",
        "update",
        &response.id,
        format!("Divida de {} atualizada", response.resident),
    );
    drop(store);
    persist_debt_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn receipts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Receipt>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_receipts_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar recibos na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.receipts, &params)))
}

pub async fn create_receipt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ReceiptInput>,
) -> Result<Json<Receipt>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.number, "Numero do recibo")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let item = Receipt {
        id: new_id(),
        number: clean(input.number),
        condominium: clean(input.condominium),
        resident: clean(input.resident),
        amount: input.amount,
        issued_at: clean(input.issued_at),
        status: input.status.unwrap_or_else(|| "Emitido".to_string()),
    };

    let mut store = state.store.write().await;
    store.receipts.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Recibo {} emitido", item.number),
    );
    drop(store);
    persist_receipt_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn delete_receipt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Receipt>>, ApiError> {
    let user = require_delete(&headers, &state, "accounting").await?;
    let mut store = state.store.write().await;
    let original_len = store.receipts.len();
    let deleted_name = store
        .receipts
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.number.clone())
        .unwrap_or_else(|| "Recibo".to_string());
    store.receipts.retain(|item| item.id != id);
    if store.receipts.len() == original_len {
        return Err(ApiError::not_found("Recibo nao encontrado"));
    }
    store.add_audit(
        &user,
        "accounting",
        "delete",
        &id,
        format!("{deleted_name} apagado"),
    );
    let response = store.receipts.clone();
    drop(store);
    persist_receipt_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_receipt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<ReceiptInput>,
) -> Result<Json<Receipt>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.number, "Numero do recibo")?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.amount)?;

    let mut store = state.store.write().await;
    let item = store
        .receipts
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Recibo nao encontrado"))?;

    item.number = clean(input.number);
    item.condominium = clean(input.condominium);
    item.resident = clean(input.resident);
    item.amount = input.amount;
    item.issued_at = clean(input.issued_at);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "accounting",
        "update",
        &response.id,
        format!("Recibo {} atualizado", response.number),
    );
    drop(store);
    persist_receipt_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

pub async fn expenses(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Expense>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_expenses_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar despesas na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.expenses, &params)))
}

pub async fn reserve_funds(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<ReserveFund>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_reserve_funds_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar fundos de reserva na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.reserve_funds, &params)))
}

pub async fn payment_agreements(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<PaymentAgreement>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_payment_agreements_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar acordos de pagamento na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.payment_agreements, &params)))
}

pub async fn create_payment_agreement(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<PaymentAgreementInput>,
) -> Result<Json<PaymentAgreement>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.fraction, "Fracao")?;
    validate_required(&input.resident, "Condomino")?;
    validate_positive_amount(input.total_amount)?;
    if input.installment_count == 0 {
        return Err(ApiError::validation(
            "O acordo precisa de pelo menos uma prestacao",
        ));
    }

    let installment_amount = input.total_amount / Decimal::from(input.installment_count);
    let item = PaymentAgreement {
        id: new_id(),
        condominium: clean(input.condominium),
        fraction: clean(input.fraction),
        resident: clean(input.resident),
        debt_id: input.debt_id.unwrap_or_default(),
        total_amount: input.total_amount,
        installment_count: input.installment_count,
        installment_amount,
        next_due_date: clean(input.next_due_date),
        status: input.status.unwrap_or_else(|| "Ativo".to_string()),
        notes: input.notes.unwrap_or_default(),
        installments: (1..=input.installment_count)
            .map(|number| PaymentAgreementInstallment {
                installment_number: number,
                due_date: format!("prestacao-{number}"),
                amount: installment_amount,
                status: "Pendente".to_string(),
                payment_id: String::new(),
            })
            .collect(),
    };

    let mut store = state.store.write().await;
    store.payment_agreements.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Acordo de pagamento criado para {}", item.resident),
    );
    drop(store);
    persist_payment_agreement_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn cash_movements(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<CashMovement>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_cash_movements_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar movimentos de caixa na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.cash_movements, &params)))
}

pub async fn create_cash_movement(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CashMovementInput>,
) -> Result<Json<CashMovement>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.movement_type, "Tipo de movimento")?;
    validate_required(&input.source, "Origem")?;
    validate_positive_amount(input.amount)?;

    let item = CashMovement {
        id: new_id(),
        condominium: clean(input.condominium),
        movement_type: clean(input.movement_type).to_lowercase(),
        account_type: input.account_type.unwrap_or_else(|| "caixa".to_string()),
        amount: input.amount,
        occurred_at: clean(input.occurred_at),
        source: clean(input.source),
        method: input.method.unwrap_or_else(|| "Manual".to_string()),
        reference: input.reference.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "Confirmado".to_string()),
        linked_entity_type: input.linked_entity_type.unwrap_or_default(),
        linked_entity_id: input.linked_entity_id.unwrap_or_default(),
    };

    let mut store = state.store.write().await;
    store.cash_movements.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Movimento de caixa {} registado", item.source),
    );
    drop(store);
    persist_cash_movement_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn bank_transactions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<BankTransaction>>, ApiError> {
    let context = require_user(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .list_bank_transactions_page(
                &context.tenant_id,
                params.page,
                params.page_size,
                &params.search,
            )
            .await
            .map(Json)
            .map_err(|error| {
                ApiError::internal_with_source(
                    "Nao foi possivel listar movimentos bancarios na base de dados",
                    error,
                )
            });
    }

    let store = state.store.read().await;
    Ok(Json(paginate(&store.bank_transactions, &params)))
}

pub async fn create_bank_transaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<BankTransactionInput>,
) -> Result<Json<BankTransaction>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.description, "Descricao")?;
    validate_required(&input.direction, "Direcao")?;
    validate_positive_amount(input.amount)?;

    let item = BankTransaction {
        id: new_id(),
        condominium: clean(input.condominium),
        occurred_at: clean(input.occurred_at),
        description: clean(input.description),
        amount: input.amount,
        direction: clean(input.direction).to_lowercase(),
        reference: input.reference.unwrap_or_default(),
        reconciliation_status: input
            .reconciliation_status
            .unwrap_or_else(|| "por reconciliar".to_string()),
    };

    let mut store = state.store.write().await;
    store.bank_transactions.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Movimento bancario {} importado", item.description),
    );
    drop(store);
    persist_bank_transaction_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn create_reconciliation(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<BankReconciliationInput>,
) -> Result<Json<BankReconciliation>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.bank_transaction_id, "Movimento bancario")?;
    validate_required(&input.target_type, "Tipo de destino")?;
    validate_required(&input.target_id, "Destino")?;

    let mut store = state.store.write().await;
    if store
        .bank_reconciliations
        .iter()
        .any(|item| item.bank_transaction_id == input.bank_transaction_id)
    {
        return Err(ApiError::validation(
            "Este movimento bancario ja foi reconciliado",
        ));
    }
    let transaction = store
        .bank_transactions
        .iter_mut()
        .find(|item| item.id == input.bank_transaction_id)
        .ok_or_else(|| ApiError::not_found("Movimento bancario nao encontrado"))?;
    transaction.reconciliation_status = "reconciliado".to_string();
    let updated_transaction = transaction.clone();

    let item = BankReconciliation {
        id: new_id(),
        bank_transaction_id: input.bank_transaction_id,
        target_type: clean(input.target_type),
        target_id: clean(input.target_id),
        notes: input.notes.unwrap_or_default(),
        reconciled_at: Utc::now().to_rfc3339(),
    };
    store.bank_reconciliations.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Movimento bancario reconciliado com {}", item.target_type),
    );
    drop(store);
    persist_bank_reconciliation_create(&state, &user.tenant_id, &item, &updated_transaction)
        .await?;

    Ok(Json(item))
}

pub async fn reconciliations(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<BankReconciliation>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(store.bank_reconciliations.clone()))
}

pub async fn create_expense(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ExpenseInput>,
) -> Result<Json<Expense>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.category, "Categoria")?;
    validate_required(&input.supplier, "Fornecedor")?;
    validate_positive_amount(input.amount)?;

    let item = Expense {
        id: new_id(),
        condominium: clean(input.condominium),
        category: clean(input.category),
        supplier: clean(input.supplier),
        amount: input.amount,
        due_date: clean(input.due_date),
        status: input.status.unwrap_or_else(|| "Pendente".to_string()),
    };

    let mut store = state.store.write().await;
    store.expenses.insert(0, item.clone());
    store.add_audit(
        &user,
        "accounting",
        "create",
        &item.id,
        format!("Despesa {} criada", item.category),
    );
    drop(store);
    persist_expense_upsert(&state, &user.tenant_id, &item).await?;

    Ok(Json(item))
}

pub async fn delete_expense(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<Expense>>, ApiError> {
    let user = require_delete(&headers, &state, "accounting").await?;
    let mut store = state.store.write().await;
    let original_len = store.expenses.len();
    let deleted_name = store
        .expenses
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.category.clone())
        .unwrap_or_else(|| "Despesa".to_string());
    store.expenses.retain(|item| item.id != id);
    if store.expenses.len() == original_len {
        return Err(ApiError::not_found("Despesa nao encontrada"));
    }
    store.add_audit(
        &user,
        "accounting",
        "delete",
        &id,
        format!("{deleted_name} apagada"),
    );
    let response = store.expenses.clone();
    drop(store);
    persist_expense_delete(&state, &user.tenant_id, &id).await?;

    Ok(Json(response))
}

pub async fn update_expense(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<ExpenseInput>,
) -> Result<Json<Expense>, ApiError> {
    let user = require_write(&headers, &state, "accounting").await?;
    validate_required(&input.condominium, "Condominio")?;
    validate_required(&input.category, "Categoria")?;
    validate_required(&input.supplier, "Fornecedor")?;
    validate_positive_amount(input.amount)?;

    let mut store = state.store.write().await;
    let item = store
        .expenses
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| ApiError::not_found("Despesa nao encontrada"))?;

    item.condominium = clean(input.condominium);
    item.category = clean(input.category);
    item.supplier = clean(input.supplier);
    item.amount = input.amount;
    item.due_date = clean(input.due_date);
    item.status = input.status.unwrap_or_else(|| item.status.clone());
    let response = item.clone();
    store.add_audit(
        &user,
        "accounting",
        "update",
        &response.id,
        format!("Despesa {} atualizada", response.category),
    );
    drop(store);
    persist_expense_upsert(&state, &user.tenant_id, &response).await?;

    Ok(Json(response))
}

async fn require_user(headers: &HeaderMap, state: &AppState) -> Result<AuthContext, ApiError> {
    let context = current_context(headers, state).await?;
    if can_access(
        &context,
        "accounting",
        PermissionAction::Read,
        ResourceScope {
            tenant_id: Some(&context.tenant_id),
            ..ResourceScope::default()
        },
    ) {
        Ok(context)
    } else {
        Err(ApiError::forbidden(
            "Sem permissao para consultar contabilidade",
        ))
    }
}

fn validate_required(value: &str, label: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::validation(format!("{label} e obrigatorio")));
    }

    Ok(())
}

fn validate_positive_amount(amount: Decimal) -> Result<(), ApiError> {
    if amount <= Decimal::ZERO {
        return Err(ApiError::validation("O valor tem de ser superior a zero"));
    }

    Ok(())
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

async fn persist_quota_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &Quota,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_quota(tenant_id, item)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar quota na base de dados"));
    }
    persist(state).await
}

async fn persist_quota_delete(state: &AppState, tenant_id: &str, id: &str) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .delete_quota(tenant_id, id)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel apagar quota na base de dados"));
    }
    persist(state).await
}

async fn persist_payment_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &AccountingPayment,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_accounting_payment(tenant_id, item)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar pagamento na base de dados"));
    }
    persist(state).await
}

async fn persist_payment_delete(
    state: &AppState,
    tenant_id: &str,
    id: &str,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .delete_accounting_payment(tenant_id, id)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel apagar pagamento na base de dados"));
    }
    persist(state).await
}

async fn persist_debt_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &Debt,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_debt(tenant_id, item)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar divida na base de dados"));
    }
    persist(state).await
}

async fn persist_debt_delete(state: &AppState, tenant_id: &str, id: &str) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .delete_debt(tenant_id, id)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel apagar divida na base de dados"));
    }
    persist(state).await
}

async fn persist_receipt_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &Receipt,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_receipt(tenant_id, item)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar recibo na base de dados"));
    }
    persist(state).await
}

async fn persist_receipt_delete(
    state: &AppState,
    tenant_id: &str,
    id: &str,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .delete_receipt(tenant_id, id)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel apagar recibo na base de dados"));
    }
    persist(state).await
}

async fn persist_expense_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &Expense,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_expense(tenant_id, item)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar despesa na base de dados"));
    }
    persist(state).await
}

async fn persist_expense_delete(
    state: &AppState,
    tenant_id: &str,
    id: &str,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .delete_expense(tenant_id, id)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel apagar despesa na base de dados"));
    }
    persist(state).await
}

async fn persist_payment_agreement_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &PaymentAgreement,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_payment_agreement(tenant_id, item)
            .await
            .map_err(|_| {
                ApiError::internal("Nao foi possivel gravar acordo de pagamento na base de dados")
            });
    }
    persist(state).await
}

async fn persist_cash_movement_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &CashMovement,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_cash_movement(tenant_id, item)
            .await
            .map_err(|_| {
                ApiError::internal("Nao foi possivel gravar movimento de caixa na base de dados")
            });
    }
    persist(state).await
}

async fn persist_bank_transaction_upsert(
    state: &AppState,
    tenant_id: &str,
    item: &BankTransaction,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .upsert_bank_transaction(tenant_id, item)
            .await
            .map_err(|_| {
                ApiError::internal("Nao foi possivel gravar movimento bancario na base de dados")
            });
    }
    persist(state).await
}

async fn persist_bank_reconciliation_create(
    state: &AppState,
    tenant_id: &str,
    reconciliation: &BankReconciliation,
    updated_transaction: &BankTransaction,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        return repository
            .create_bank_reconciliation(tenant_id, reconciliation, updated_transaction)
            .await
            .map_err(|_| {
                ApiError::internal("Nao foi possivel reconciliar movimento na base de dados")
            });
    }
    persist(state).await
}

fn accounting_overview(store: &AppStore) -> AccountingOverview {
    let unreconciled: Vec<&BankTransaction> = store
        .bank_transactions
        .iter()
        .filter(|item| item.reconciliation_status.to_lowercase() != "reconciliado")
        .collect();
    let max_days_overdue = store
        .debts
        .iter()
        .filter(|item| !is_settled_status(&item.status))
        .map(|item| item.days_overdue)
        .max()
        .unwrap_or(0);
    let reserve_total: Decimal = store.reserve_funds.iter().map(|item| item.balance).sum();
    let quota_total: Decimal = store.quotas.iter().map(|item| item.amount).sum();
    let expected_reserve = quota_total / Decimal::from(10);

    AccountingOverview {
        quotas_to_validate: store
            .quotas
            .iter()
            .filter(|item| !is_settled_status(&item.status))
            .count(),
        unreconciled_movements: unreconciled.len(),
        oldest_unreconciled_age_days: unreconciled
            .iter()
            .filter_map(|item| age_days(&item.occurred_at))
            .max(),
        receipts_to_issue: store
            .accounting_payments
            .iter()
            .filter(|payment| {
                !store.receipts.iter().any(|receipt| {
                    receipt.condominium == payment.condominium
                        && receipt.resident == payment.resident
                        && receipt.amount == payment.amount
                })
            })
            .count(),
        debts_in_follow_up: store
            .debts
            .iter()
            .filter(|item| !is_settled_status(&item.status))
            .count(),
        overdue_debt_severity: if max_days_overdue >= 60 {
            "critico"
        } else if max_days_overdue >= 30 {
            "atencao"
        } else {
            "normal"
        }
        .to_string(),
        active_payment_agreements: store
            .payment_agreements
            .iter()
            .filter(|item| item.status.to_lowercase() == "ativo")
            .count(),
        broken_payment_agreements: store
            .payment_agreements
            .iter()
            .filter(|item| agreement_is_broken(item))
            .count(),
        reserve_fund_status: if reserve_total >= expected_reserve {
            "conforme"
        } else {
            "abaixo do minimo recomendado"
        }
        .to_string(),
    }
}

fn accounting_summary_for(store: &AppStore, condominium: &str) -> AccountingSummary {
    let quotas: Vec<&Quota> = store
        .quotas
        .iter()
        .filter(|item| item.condominium == condominium)
        .collect();
    let paid_quotas = quotas
        .iter()
        .filter(|item| is_settled_status(&item.status))
        .count();
    let active_debts: Vec<&Debt> = store
        .debts
        .iter()
        .filter(|item| item.condominium == condominium && !is_settled_status(&item.status))
        .collect();
    let overdue_amount = active_debts.iter().map(|item| item.amount).sum();
    let monthly_expenses = store
        .expenses
        .iter()
        .filter(|item| item.condominium == condominium)
        .map(|item| item.amount)
        .sum();
    let received: Decimal = store
        .accounting_payments
        .iter()
        .filter(|item| item.condominium == condominium && is_settled_status(&item.status))
        .map(|item| item.amount)
        .sum();
    let reserve_fund = store
        .reserve_funds
        .iter()
        .filter(|item| item.condominium == condominium)
        .map(|item| item.balance)
        .sum();
    let paid_quota_percentage = if quotas.is_empty() {
        0
    } else {
        ((paid_quotas as f64 / quotas.len() as f64) * 100.0).round() as u8
    };

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

fn customer_statement_for(
    store: &AppStore,
    fraction_id: &str,
    condominium: &str,
    fraction: &str,
) -> CustomerStatement {
    let resident = store
        .residents
        .iter()
        .find(|item| item.condominium == condominium && item.fraction == fraction)
        .map(|item| item.name.clone())
        .unwrap_or_else(|| "Condomino por definir".to_string());
    let mut entries = Vec::new();
    let mut balance = Decimal::ZERO;

    for quota in store
        .quotas
        .iter()
        .filter(|item| item.condominium == condominium && item.fraction == fraction)
    {
        balance += quota.amount;
        entries.push(CustomerStatementEntry {
            id: quota.id.clone(),
            entry_type: "quota".to_string(),
            date: quota.due_date.clone(),
            description: quota.period.clone(),
            debit: quota.amount,
            credit: Decimal::ZERO,
            balance,
            status: quota.status.clone(),
        });
    }

    for payment in store
        .accounting_payments
        .iter()
        .filter(|item| item.condominium == condominium && item.fraction == fraction)
    {
        balance -= payment.amount;
        entries.push(CustomerStatementEntry {
            id: payment.id.clone(),
            entry_type: "pagamento".to_string(),
            date: payment.paid_at.clone(),
            description: payment.method.clone(),
            debit: Decimal::ZERO,
            credit: payment.amount,
            balance,
            status: payment.status.clone(),
        });
    }

    entries.sort_by(|a, b| a.date.cmp(&b.date));
    CustomerStatement {
        fraction_id: fraction_id.to_string(),
        condominium: condominium.to_string(),
        fraction: fraction.to_string(),
        resident: resident.clone(),
        balance,
        entries,
        payment_agreements: store
            .payment_agreements
            .iter()
            .filter(|item| {
                item.condominium == condominium
                    && (item.fraction == fraction || item.resident == resident)
            })
            .cloned()
            .collect(),
    }
}

fn filter_by_condominium<T: Clone>(
    items: &[T],
    condominium: &str,
    field: impl Fn(&T) -> &String,
) -> Vec<T> {
    items
        .iter()
        .filter(|item| field(item).as_str() == condominium)
        .cloned()
        .collect()
}

fn bank_reconciliations_for_condominium(
    store: &AppStore,
    condominium: &str,
) -> Vec<BankReconciliation> {
    store
        .bank_reconciliations
        .iter()
        .filter(|reconciliation| {
            store.bank_transactions.iter().any(|transaction| {
                transaction.id == reconciliation.bank_transaction_id
                    && transaction.condominium == condominium
            })
        })
        .cloned()
        .collect()
}

fn is_settled_status(status: &str) -> bool {
    let normalized = status.trim().to_lowercase();
    matches!(
        normalized.as_str(),
        "paga" | "pago" | "confirmado" | "emitido" | "liquidado" | "regularizado"
    )
}

fn agreement_is_broken(agreement: &PaymentAgreement) -> bool {
    agreement.installments.iter().any(|installment| {
        !is_settled_status(&installment.status)
            && age_days(&installment.due_date).is_some_and(|days| days > 0)
    })
}

fn age_days(date: &str) -> Option<i64> {
    let parsed = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
    let today = Utc::now().date_naive();
    Some((today - parsed).num_days())
}

fn clean(value: String) -> String {
    value.trim().to_string()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn accounting_store() -> AppStore {
        AppStore {
            quotas: vec![
                Quota {
                    id: "quota-a".to_string(),
                    condominium: "Condominio A".to_string(),
                    fraction: "A-1".to_string(),
                    resident: "Maria Cliente".to_string(),
                    period: "Maio 2026".to_string(),
                    amount: Decimal::new(10_000, 2),
                    due_date: "2026-05-08".to_string(),
                    status: "Em atraso".to_string(),
                },
                Quota {
                    id: "quota-b".to_string(),
                    condominium: "Condominio B".to_string(),
                    fraction: "B-1".to_string(),
                    resident: "Outro Cliente".to_string(),
                    period: "Maio 2026".to_string(),
                    amount: Decimal::new(20_000, 2),
                    due_date: "2026-05-08".to_string(),
                    status: "Paga".to_string(),
                },
            ],
            accounting_payments: vec![AccountingPayment {
                id: "pay-a".to_string(),
                condominium: "Condominio A".to_string(),
                fraction: "A-1".to_string(),
                resident: "Maria Cliente".to_string(),
                amount: Decimal::new(5_000, 2),
                paid_at: "2026-05-10".to_string(),
                method: "Transferencia".to_string(),
                status: "Confirmado".to_string(),
            }],
            debts: vec![Debt {
                id: "debt-a".to_string(),
                condominium: "Condominio A".to_string(),
                fraction: "A-1".to_string(),
                resident: "Maria Cliente".to_string(),
                amount: Decimal::new(10_000, 2),
                due_date: "2026-05-08".to_string(),
                days_overdue: 65,
                status: "Em atraso".to_string(),
            }],
            reserve_funds: vec![ReserveFund {
                id: "reserve-a".to_string(),
                condominium: "Condominio A".to_string(),
                balance: Decimal::new(1_000, 2),
                monthly_change: Decimal::ZERO,
                status: "Baixo".to_string(),
            }],
            payment_agreements: vec![PaymentAgreement {
                id: "agreement-a".to_string(),
                condominium: "Condominio A".to_string(),
                fraction: "A-1".to_string(),
                resident: "Maria Cliente".to_string(),
                debt_id: "debt-a".to_string(),
                total_amount: Decimal::new(10_000, 2),
                installment_count: 1,
                installment_amount: Decimal::new(10_000, 2),
                next_due_date: "2026-01-01".to_string(),
                status: "Ativo".to_string(),
                notes: String::new(),
                installments: vec![PaymentAgreementInstallment {
                    installment_number: 1,
                    due_date: "2026-01-01".to_string(),
                    amount: Decimal::new(10_000, 2),
                    status: "Pendente".to_string(),
                    payment_id: String::new(),
                }],
            }],
            bank_transactions: vec![
                BankTransaction {
                    id: "bank-a".to_string(),
                    condominium: "Condominio A".to_string(),
                    occurred_at: "2026-05-10".to_string(),
                    description: "TRF Maria Cliente".to_string(),
                    amount: Decimal::new(5_000, 2),
                    direction: "entrada".to_string(),
                    reference: String::new(),
                    reconciliation_status: "por reconciliar".to_string(),
                },
                BankTransaction {
                    id: "bank-b".to_string(),
                    condominium: "Condominio B".to_string(),
                    occurred_at: "2026-05-10".to_string(),
                    description: "TRF Outro Cliente".to_string(),
                    amount: Decimal::new(20_000, 2),
                    direction: "entrada".to_string(),
                    reference: String::new(),
                    reconciliation_status: "reconciliado".to_string(),
                },
            ],
            bank_reconciliations: vec![
                BankReconciliation {
                    id: "reconciliation-a".to_string(),
                    bank_transaction_id: "bank-a".to_string(),
                    target_type: "payment".to_string(),
                    target_id: "pay-a".to_string(),
                    notes: String::new(),
                    reconciled_at: "2026-05-10T10:00:00Z".to_string(),
                },
                BankReconciliation {
                    id: "reconciliation-b".to_string(),
                    bank_transaction_id: "bank-b".to_string(),
                    target_type: "payment".to_string(),
                    target_id: "pay-b".to_string(),
                    notes: String::new(),
                    reconciled_at: "2026-05-10T11:00:00Z".to_string(),
                },
            ],
            ..AppStore::default()
        }
    }

    #[test]
    fn overview_does_not_expose_customer_identifiers() {
        let overview = accounting_overview(&accounting_store());
        let encoded = serde_json::to_string(&overview).expect("overview should serialize");
        assert!(!encoded.contains("Maria Cliente"));
        assert!(!encoded.contains("A-1"));
        assert_eq!(overview.debts_in_follow_up, 1);
        assert_eq!(overview.overdue_debt_severity, "critico");
    }

    #[test]
    fn customer_statement_is_limited_to_fraction_context() {
        let statement =
            customer_statement_for(&accounting_store(), "fraction-a", "Condominio A", "A-1");
        assert_eq!(statement.entries.len(), 2);
        assert!(statement
            .entries
            .iter()
            .all(|entry| entry.id.ends_with("-a")));
        assert_eq!(statement.balance, Decimal::new(5_000, 2));
    }

    #[test]
    fn broken_payment_agreement_is_detected() {
        let overview = accounting_overview(&accounting_store());
        assert_eq!(overview.active_payment_agreements, 1);
        assert_eq!(overview.broken_payment_agreements, 1);
    }

    #[test]
    fn bank_reconciliations_are_limited_to_condominium_context() {
        let reconciliations =
            bank_reconciliations_for_condominium(&accounting_store(), "Condominio A");
        let ids = reconciliations
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>();
        assert_eq!(ids, vec!["reconciliation-a"]);
    }
}
