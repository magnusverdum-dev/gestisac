use std::{future::Future, pin::Pin};

use anyhow::Result;

use crate::models::store::Condominium;

use super::postgres::PostgresRepository;

type RepositoryFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

pub trait CondominiumPersistenceRepository: Send + Sync {
    fn load_condominiums<'a>(
        &'a self,
        tenant_id: &'a str,
    ) -> RepositoryFuture<'a, Result<Vec<Condominium>>>;

    fn replace_condominiums<'a>(
        &'a self,
        tenant_id: &'a str,
        condominiums: &'a [Condominium],
    ) -> RepositoryFuture<'a, Result<()>>;
}

#[derive(Debug, Clone)]
pub struct PostgresCondominiumRepository {
    inner: PostgresRepository,
}

impl PostgresCondominiumRepository {
    pub fn new(inner: PostgresRepository) -> Self {
        Self { inner }
    }
}

impl CondominiumPersistenceRepository for PostgresCondominiumRepository {
    fn load_condominiums<'a>(
        &'a self,
        tenant_id: &'a str,
    ) -> RepositoryFuture<'a, Result<Vec<Condominium>>> {
        Box::pin(async move { self.inner.load_condominiums(tenant_id).await })
    }

    fn replace_condominiums<'a>(
        &'a self,
        tenant_id: &'a str,
        condominiums: &'a [Condominium],
    ) -> RepositoryFuture<'a, Result<()>> {
        Box::pin(async move {
            self.inner
                .replace_condominiums(tenant_id, condominiums)
                .await
        })
    }
}
