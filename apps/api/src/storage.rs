use crate::{config::DocumentStorageBackend, error::ApiError, state::AppState};
use std::path::{Path, PathBuf};

pub async fn write_file_object(
    state: &AppState,
    tenant_id: &str,
    storage_key: &str,
    bytes: &[u8],
) -> Result<(), ApiError> {
    validate_storage_key(storage_key)?;
    match state.config.document_storage_backend {
        DocumentStorageBackend::Postgres => {
            let repository = state
                .postgres
                .as_ref()
                .ok_or_else(|| ApiError::internal("Arquivo persistente indisponivel"))?;
            repository
                .upsert_file_object(tenant_id, storage_key, bytes)
                .await
                .map_err(|error| {
                    ApiError::internal_with_source(
                        "Nao foi possivel guardar o ficheiro persistente",
                        error,
                    )
                })
        }
        DocumentStorageBackend::Filesystem => {
            write_filesystem_object(&state.config.document_storage_path, storage_key, bytes).await
        }
    }
}

pub async fn read_file_object(
    state: &AppState,
    tenant_id: &str,
    storage_key: &str,
) -> Result<Vec<u8>, ApiError> {
    validate_storage_key(storage_key)?;
    match state.config.document_storage_backend {
        DocumentStorageBackend::Postgres => {
            let repository = state
                .postgres
                .as_ref()
                .ok_or_else(|| ApiError::internal("Arquivo persistente indisponivel"))?;
            repository
                .read_file_object(tenant_id, storage_key)
                .await
                .map_err(|error| {
                    ApiError::internal_with_source(
                        "Nao foi possivel ler o ficheiro persistente",
                        error,
                    )
                })?
                .ok_or_else(|| ApiError::not_found("Ficheiro nao encontrado"))
        }
        DocumentStorageBackend::Filesystem => tokio::fs::read(filesystem_path(
            &state.config.document_storage_path,
            storage_key,
        ))
        .await
        .map_err(|_| ApiError::not_found("Ficheiro nao encontrado")),
    }
}

pub async fn remove_file_object(
    state: &AppState,
    tenant_id: &str,
    storage_key: &str,
) -> Result<(), ApiError> {
    if storage_key.trim().is_empty() {
        return Ok(());
    }
    validate_storage_key(storage_key)?;
    match state.config.document_storage_backend {
        DocumentStorageBackend::Postgres => {
            let repository = state
                .postgres
                .as_ref()
                .ok_or_else(|| ApiError::internal("Arquivo persistente indisponivel"))?;
            repository
                .delete_file_object(tenant_id, storage_key)
                .await
                .map_err(|error| {
                    ApiError::internal_with_source(
                        "Nao foi possivel remover o ficheiro persistente",
                        error,
                    )
                })
        }
        DocumentStorageBackend::Filesystem => {
            let _ = tokio::fs::remove_file(filesystem_path(
                &state.config.document_storage_path,
                storage_key,
            ))
            .await;
            Ok(())
        }
    }
}

async fn write_filesystem_object(
    root: &Path,
    storage_key: &str,
    bytes: &[u8],
) -> Result<(), ApiError> {
    let path = filesystem_path(root, storage_key);
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel preparar o arquivo local"))?;
    }
    tokio::fs::write(path, bytes)
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel guardar o ficheiro local"))
}

fn filesystem_path(root: &Path, storage_key: &str) -> PathBuf {
    let mut path = root.to_path_buf();
    for segment in storage_key.split('/') {
        path.push(safe_storage_segment(segment));
    }
    path
}

fn validate_storage_key(storage_key: &str) -> Result<(), ApiError> {
    let trimmed = storage_key.trim();
    if trimmed.is_empty()
        || trimmed
            .split('/')
            .any(|segment| segment == "." || segment == "..")
    {
        return Err(ApiError::validation("Chave de ficheiro invalida"));
    }
    Ok(())
}

fn safe_storage_segment(value: &str) -> String {
    let cleaned = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string();

    if cleaned.is_empty() {
        "file".to_string()
    } else {
        cleaned
    }
}
