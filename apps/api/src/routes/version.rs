use crate::{models::api::VersionResponse, state::AppState};
use axum::{extract::State, Json};

pub async fn version(State(state): State<AppState>) -> Json<VersionResponse> {
    let store = state.store.read().await;
    Json(VersionResponse {
        name: store.version.name.clone(),
        version: store.version.version.clone(),
        environment: store.version.environment.clone(),
    })
}
