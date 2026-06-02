use crate::{
    error::ApiError, models::store::ChatMessage, routes::auth::current_context, state::AppState,
};
use axum::{extract::State, http::HeaderMap, Json};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatMessageInput {
    pub text: String,
}

pub async fn list_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<ChatMessage>>, ApiError> {
    let context = current_context(&headers, &state).await?;
    if let Some(repository) = &state.postgres {
        return repository
            .load_chat_messages(&context.tenant_id, 500)
            .await
            .map(Json)
            .map_err(|_| ApiError::internal("Nao foi possivel listar mensagens na base de dados"));
    }

    let store = state.store.read().await;
    Ok(Json(store.chat_messages.clone()))
}

pub async fn create_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateChatMessageInput>,
) -> Result<Json<ChatMessage>, ApiError> {
    let context = current_context(&headers, &state).await?;
    let text = input.text.trim();
    if text.is_empty() {
        return Err(ApiError::validation("Mensagem vazia"));
    }

    let message = ChatMessage {
        id: Uuid::new_v4().to_string(),
        text: text.to_string(),
        sender_name: context.user.name.clone(),
        sender_role: context.user.role.clone(),
        source_app: context.app_context,
        created_at: Utc::now().to_rfc3339(),
    };

    let mut store = state.store.write().await;
    store.chat_messages.push(message.clone());
    if store.chat_messages.len() > 500 {
        let to_drop = store.chat_messages.len() - 500;
        store.chat_messages.drain(0..to_drop);
    }
    store.add_audit(
        &context.user,
        "operations",
        "chat",
        &message.id,
        "Mensagem enviada no chat de apoio".to_string(),
    );
    drop(store);
    persist_chat_message(&state, &context.user.tenant_id, &message).await?;

    Ok(Json(message))
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

async fn persist_chat_message(
    state: &AppState,
    tenant_id: &str,
    message: &ChatMessage,
) -> Result<(), ApiError> {
    if let Some(repository) = &state.postgres {
        repository
            .create_chat_message(tenant_id, message)
            .await
            .map_err(|_| ApiError::internal("Nao foi possivel gravar mensagem na base de dados"))
    } else {
        persist(state).await
    }
}
