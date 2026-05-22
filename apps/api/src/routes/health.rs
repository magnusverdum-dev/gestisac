use crate::{models::api::HealthResponse, state::AppState};
use axum::{extract::State, Json};

pub async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        service: "gestisac-api",
        status: "online",
        persistence: state.config.persistence_status(),
    })
}
