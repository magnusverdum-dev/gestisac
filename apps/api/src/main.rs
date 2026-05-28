use gestisac_api::{build_app, init_tracing};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();
    let app = build_app().await?;
    let host = std::env::var("GESTISAC_API_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("GESTISAC_API_PORT").unwrap_or_else(|_| "3000".to_string());
    let bind_addr = format!("{host}:{port}");

    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    tracing::info!("GESTISAC API listening on {}", listener.local_addr()?);

    axum::serve(listener, app).await?;

    Ok(())
}
