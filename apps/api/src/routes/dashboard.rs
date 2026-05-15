use crate::{error::ApiError, routes::auth::current_context, state::AppState};
use axum::{extract::State, http::HeaderMap, Json};

pub async fn dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<crate::models::store::DashboardResponse>, ApiError> {
    let context = current_context(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(store.dashboard(context.user)))
}
