use gestisac_api::{build_app, init_tracing};
use tower::ServiceBuilder;
use vercel_runtime::{axum::VercelLayer, Error};

#[tokio::main]
async fn main() -> Result<(), Error> {
    init_tracing();
    let router = build_app().await?;
    let app = ServiceBuilder::new()
        .layer(VercelLayer::new())
        .service(router);

    vercel_runtime::run(app).await
}
