use crate::{
    error::ApiError,
    models::{
        api::{paginate, Paginated, PaginationParams},
        store::{AccountingPayment, AccountingSummary, Debt, Expense, Quota, Receipt, ReserveFund},
    },
    routes::auth::{current_user, require_delete, require_write},
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
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
    require_user(&headers, &state).await?;
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
    persist(&state).await?;

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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn payments(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<AccountingPayment>>, ApiError> {
    require_user(&headers, &state).await?;
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
    persist(&state).await?;

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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn debts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Debt>>, ApiError> {
    require_user(&headers, &state).await?;
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
    persist(&state).await?;

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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn receipts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Receipt>>, ApiError> {
    require_user(&headers, &state).await?;
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
    persist(&state).await?;

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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn expenses(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<Expense>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.expenses, &params)))
}

pub async fn reserve_funds(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Paginated<ReserveFund>>, ApiError> {
    require_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(paginate(&store.reserve_funds, &params)))
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
    persist(&state).await?;

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
    persist(&state).await?;

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
    persist(&state).await?;

    Ok(Json(response))
}

async fn require_user(headers: &HeaderMap, state: &AppState) -> Result<(), ApiError> {
    current_user(headers, state).await.map(|_| ())
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

fn clean(value: String) -> String {
    value.trim().to_string()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}
