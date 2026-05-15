use crate::models::api::HealthResponse;
use axum::Json;

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        service: "gestisac-api",
        status: "online",
    })
}
