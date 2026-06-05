pub mod config;
pub mod error;
pub mod models;
#[allow(dead_code)]
pub mod repositories;
pub mod routes;
pub mod state;
pub mod storage;

use axum::Router;
use state::AppState;
use std::sync::Once;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_tracing() {
    static INIT: Once = Once::new();
    INIT.call_once(|| {
        let _ = tracing_subscriber::registry()
            .with(tracing_subscriber::EnvFilter::new(
                std::env::var("RUST_LOG")
                    .unwrap_or_else(|_| "gestisac_api=debug,tower_http=debug".into()),
            ))
            .with(tracing_subscriber::fmt::layer())
            .try_init();
    });
}

pub async fn build_app() -> anyhow::Result<Router> {
    let state = AppState::load().await?;
    let cors = state.config.cors_layer()?;
    Ok(routes::router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http()))
}
