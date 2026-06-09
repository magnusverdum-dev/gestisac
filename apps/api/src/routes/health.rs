use crate::{
    models::api::{HealthResponse, WarmupResponse},
    state::AppState,
};
use axum::{extract::State, Json};
use chrono::Utc;

pub async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        service: "gestisac-api",
        status: "online",
        persistence: state.config.persistence_status(),
    })
}

pub async fn warmup(State(state): State<AppState>) -> Json<WarmupResponse> {
    let persistence = state.config.persistence_status();
    Json(WarmupResponse {
        service: "gestisac-api",
        status: "warm",
        environment: persistence.environment,
        active_backend: persistence.active_backend.to_string(),
        checked_at: Utc::now().to_rfc3339(),
    })
}
