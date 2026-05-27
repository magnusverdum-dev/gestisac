use crate::{
    error::ApiError,
    models::store::{
        AppStore, Canal, ComentarioVisibilidade, Impacto, Ocorrencia, OcorrenciaAnexo,
        OcorrenciaComentario, OcorrenciaStatus, OcorrenciaTipo, OcorrenciasMetricas, Prioridade,
        Urgencia,
    },
    routes::auth::{current_user, require_delete, require_write},
    state::AppState,
};
use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Input structs ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaQuery {
    #[serde(default)]
    pub page: Option<usize>,
    #[serde(default)]
    pub page_size: Option<usize>,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub prioridade: Option<String>,
    #[serde(default)]
    pub condominium_id: Option<String>,
    #[serde(default)]
    pub equipamento_id: Option<String>,
    #[serde(default)]
    pub atribuido_a: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub data_inicio: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub data_fim: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaInput {
    pub titulo: String,
    #[serde(default, alias = "type")]
    pub tipo: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub prioridade: Option<String>,
    #[serde(default)]
    pub impacto: Option<String>,
    #[serde(default)]
    pub urgencia: Option<String>,
    #[serde(default)]
    pub descricao: Option<String>,
    #[serde(default)]
    pub condominium_id: Option<String>,
    #[serde(default)]
    pub requisitante_nome: Option<String>,
    #[serde(default)]
    pub requisitante_email: Option<String>,
    #[serde(default)]
    pub requisitante_telefone: Option<String>,
    #[serde(default)]
    pub canal: Option<String>,
    #[serde(default)]
    pub categoria: Option<String>,
    #[serde(default)]
    pub atribuido_a: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub bloco_id: Option<String>,
    #[serde(default)]
    pub piso_id: Option<String>,
    #[serde(default)]
    pub zona_id: Option<String>,
    #[serde(default)]
    pub equipamento_id: Option<String>,
    #[serde(default)]
    pub custo_estimado: Option<String>,
    #[serde(default)]
    pub custo_final: Option<String>,
    #[serde(default)]
    pub fornecedor_id: Option<String>,
    #[serde(default)]
    pub origin_channel: Option<String>,
    #[serde(default)]
    pub public_status_text: Option<String>,
    #[serde(default)]
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub assigned_worker_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusTransitionInput {
    pub status: String,
    #[serde(default)]
    pub motivo: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComentarioInput {
    pub texto: String,
    #[serde(default)]
    pub visibilidade: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicaInput {
    pub titulo: String,
    pub descricao: String,
    pub requisitante_nome: String,
    pub requisitante_email: String,
    #[serde(default)]
    pub requisitante_telefone: Option<String>,
    #[serde(default)]
    pub condominium_id: Option<String>,
    #[serde(default)]
    pub equipamento_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicaResponse {
    pub ocorrencia: Ocorrencia,
    pub token_acompanhamento: String,
}

// ── Handlers ──

pub async fn listar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Query(query): Query<OcorrenciaQuery>,
) -> Result<Json<PaginatedOcorrencias>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;

    let mut items: Vec<Ocorrencia> = store.ocorrencias.clone();

    // Filtros
    if let Some(search) = &query.search {
        let s = search.to_lowercase();
        items.retain(|o| {
            o.titulo.to_lowercase().contains(&s) || o.descricao.to_lowercase().contains(&s)
        });
    }
    if let Some(tipo) = &query.tipo {
        items.retain(|o| o.tipo.as_str().eq_ignore_ascii_case(tipo));
    }
    if let Some(status) = &query.status {
        items.retain(|o| o.status.as_str().eq_ignore_ascii_case(status));
    }
    if let Some(prioridade) = &query.prioridade {
        items.retain(|o| o.prioridade.as_str().eq_ignore_ascii_case(prioridade));
    }
    if let Some(condominium_id) = &query.condominium_id {
        items.retain(|o| o.condominium_id.eq_ignore_ascii_case(condominium_id));
    }
    if let Some(equipamento_id) = &query.equipamento_id {
        items.retain(|o| o.equipamento_id.eq_ignore_ascii_case(equipamento_id));
    }
    if let Some(atribuido_a) = &query.atribuido_a {
        items.retain(|o| o.atribuido_a.eq_ignore_ascii_case(atribuido_a));
    }

    let total = items.len();
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let start = (page - 1) * page_size;
    let paged: Vec<Ocorrencia> = items.into_iter().skip(start).take(page_size).collect();

    Ok(Json(PaginatedOcorrencias {
        data: paged,
        total,
        page,
        page_size,
    }))
}

pub async fn detalhe(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<OcorrenciaDetalhe>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;

    let ocorrencia = store
        .ocorrencias
        .iter()
        .find(|o| o.id == id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    let comentarios: Vec<OcorrenciaComentario> = store
        .ocorrencia_comentarios
        .iter()
        .filter(|c| c.ocorrencia_id == id)
        .cloned()
        .collect();

    let anexos: Vec<OcorrenciaAnexo> = store
        .ocorrencia_anexos
        .iter()
        .filter(|a| a.ocorrencia_id == id)
        .cloned()
        .collect();

    let historico: Vec<OcorrenciaHistoricoItem> = store
        .audit_log
        .iter()
        .filter(|a| a.record_id == id)
        .take(50)
        .map(|a| OcorrenciaHistoricoItem {
            timestamp: a.created_at.to_rfc3339(),
            autor: a.user_name.clone(),
            acao: a.action.clone(),
            descricao: a.summary.clone(),
        })
        .collect();

    Ok(Json(OcorrenciaDetalhe {
        ocorrencia,
        comentarios,
        anexos,
        historico,
    }))
}

pub async fn criar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(input): Json<OcorrenciaInput>,
) -> Result<Json<Ocorrencia>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.titulo, "Titulo")?;

    let now = Utc::now().to_rfc3339();
    let item = Ocorrencia {
        id: Uuid::new_v4().to_string(),
        titulo: input.titulo.trim().to_string(),
        tipo: parse_tipo(input.tipo.as_deref()).unwrap_or(OcorrenciaTipo::Pedido),
        status: parse_status(input.status.as_deref()).unwrap_or(OcorrenciaStatus::Nova),
        prioridade: parse_prioridade(input.prioridade.as_deref()).unwrap_or(Prioridade::Normal),
        impacto: parse_impacto(input.impacto.as_deref()).unwrap_or(Impacto::Medio),
        urgencia: parse_urgencia(input.urgencia.as_deref()).unwrap_or(Urgencia::Media),
        descricao: input.descricao.unwrap_or_default(),
        condominium_id: input.condominium_id.unwrap_or_default(),
        requisitante_nome: input.requisitante_nome.unwrap_or_default(),
        requisitante_email: input.requisitante_email.unwrap_or_default(),
        requisitante_telefone: input.requisitante_telefone.unwrap_or_default(),
        canal: parse_canal(input.canal.as_deref()).unwrap_or(Canal::Portal),
        categoria: input.categoria.unwrap_or_else(|| "Operacional".to_string()),
        atribuido_a: input.atribuido_a.unwrap_or_default(),
        tags: input.tags.unwrap_or_default(),
        bloco_id: input.bloco_id.unwrap_or_default(),
        piso_id: input.piso_id.unwrap_or_default(),
        zona_id: input.zona_id.unwrap_or_default(),
        equipamento_id: input.equipamento_id.unwrap_or_default(),
        custo_estimado: input.custo_estimado.unwrap_or_default(),
        custo_final: input.custo_final.unwrap_or_default(),
        fornecedor_id: input.fornecedor_id.unwrap_or_default(),
        origin_channel: normalize_origin_channel(input.origin_channel.as_deref()),
        public_status_text: input
            .public_status_text
            .unwrap_or_else(|| "Avaria recebida".to_string()),
        technical_notes: input.technical_notes.unwrap_or_default(),
        assigned_worker_id: input.assigned_worker_id.unwrap_or_default(),
        sla_resposta_em: String::new(),
        sla_resolucao_em: String::new(),
        referencia_contrato: String::new(),
        media_ids: vec![],
        documento_ids: vec![],
        motivo_resolucao: String::new(),
        respondido_em: String::new(),
        resolvido_em: String::new(),
        fechado_em: String::new(),
        token_acompanhamento: String::new(),
        criado_em: now.clone(),
        atualizado_em: now,
    };

    let mut store = state.store.write().await;
    store.ocorrencias.insert(0, item.clone());
    store.add_audit(
        &user,
        "operations",
        "create",
        &item.id,
        format!("Ocorrencia {} criada", item.titulo),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(item))
}

pub async fn atualizar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<OcorrenciaInput>,
) -> Result<Json<Ocorrencia>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;

    let mut store = state.store.write().await;
    let item = store
        .ocorrencias
        .iter_mut()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    if let Some(v) = non_empty_string(Some(input.titulo)) {
        item.titulo = v;
    }
    if let Some(v) = parse_tipo(input.tipo.as_deref()) {
        item.tipo = v;
    }
    if let Some(v) = parse_prioridade(input.prioridade.as_deref()) {
        item.prioridade = v;
    }
    if let Some(v) = parse_impacto(input.impacto.as_deref()) {
        item.impacto = v;
    }
    if let Some(v) = parse_urgencia(input.urgencia.as_deref()) {
        item.urgencia = v;
    }
    if let Some(v) = non_empty_string(input.descricao) {
        item.descricao = v;
    }
    if let Some(v) = non_empty_string(input.condominium_id) {
        item.condominium_id = v;
    }
    if let Some(v) = non_empty_string(input.requisitante_nome) {
        item.requisitante_nome = v;
    }
    if let Some(v) = non_empty_string(input.requisitante_email) {
        item.requisitante_email = v;
    }
    if let Some(v) = non_empty_string(input.requisitante_telefone) {
        item.requisitante_telefone = v;
    }
    if let Some(v) = parse_canal(input.canal.as_deref()) {
        item.canal = v;
    }
    if let Some(v) = non_empty_string(input.categoria) {
        item.categoria = v;
    }
    if let Some(v) = non_empty_string(input.atribuido_a) {
        item.atribuido_a = v;
    }
    if let Some(tags) = input.tags {
        item.tags = tags;
    }
    if let Some(v) = non_empty_string(input.bloco_id) {
        item.bloco_id = v;
    }
    if let Some(v) = non_empty_string(input.piso_id) {
        item.piso_id = v;
    }
    if let Some(v) = non_empty_string(input.zona_id) {
        item.zona_id = v;
    }
    if let Some(v) = non_empty_string(input.equipamento_id) {
        item.equipamento_id = v;
    }
    if let Some(v) = non_empty_string(input.custo_estimado) {
        item.custo_estimado = v;
    }
    if let Some(v) = non_empty_string(input.custo_final) {
        item.custo_final = v;
    }
    if let Some(v) = non_empty_string(input.fornecedor_id) {
        item.fornecedor_id = v;
    }
    if let Some(v) = non_empty_string(input.origin_channel) {
        item.origin_channel = normalize_origin_channel(Some(&v));
    }
    if let Some(v) = non_empty_string(input.public_status_text) {
        item.public_status_text = v;
    }
    if let Some(v) = non_empty_string(input.technical_notes) {
        item.technical_notes = v;
    }
    if let Some(v) = non_empty_string(input.assigned_worker_id) {
        item.assigned_worker_id = v;
    }
    item.atualizado_em = Utc::now().to_rfc3339();

    let response = item.clone();
    store.add_audit(
        &user,
        "operations",
        "update",
        &response.id,
        format!("Ocorrencia {} atualizada", response.titulo),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn transitar_status(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<StatusTransitionInput>,
) -> Result<Json<Ocorrencia>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    let novo_status =
        parse_status(Some(&input.status)).ok_or_else(|| ApiError::validation("Status invalido"))?;

    let mut store = state.store.write().await;
    let item = store
        .ocorrencias
        .iter_mut()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    if !AppStore::transicao_valida(&item.status, &novo_status) {
        return Err(ApiError::validation(format!(
            "Transicao invalida de {} para {}",
            item.status.as_str(),
            novo_status.as_str()
        )));
    }

    let old_status = item.status.as_str().to_string();
    item.status = novo_status;
    item.atualizado_em = Utc::now().to_rfc3339();

    // Atualizar timestamps específicos
    if item.status == OcorrenciaStatus::Resolvida {
        item.resolvido_em = item.atualizado_em.clone();
    }
    if item.status == OcorrenciaStatus::Fechada {
        item.fechado_em = item.atualizado_em.clone();
    }
    if item.status == OcorrenciaStatus::EmCurso && item.respondido_em.is_empty() {
        item.respondido_em = item.atualizado_em.clone();
    }

    let motivo = input.motivo.as_deref().unwrap_or("").to_string();
    let response = item.clone();
    let transicao_msg = if motivo.is_empty() {
        format!(
            "Status alterado de {} para {}",
            old_status,
            response.status.as_str()
        )
    } else {
        format!(
            "Status alterado de {} para {}: {}",
            old_status,
            response.status.as_str(),
            motivo
        )
    };

    store.add_audit(
        &user,
        "operations",
        "status_transition",
        &response.id,
        transicao_msg,
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn apagar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<()>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let original_len = store.ocorrencias.len();
    let deleted_name = store
        .ocorrencias
        .iter()
        .find(|o| o.id == id)
        .map(|o| o.titulo.clone())
        .unwrap_or_else(|| "Ocorrencia".to_string());
    store.ocorrencias.retain(|o| o.id != id);
    if store.ocorrencias.len() == original_len {
        return Err(ApiError::not_found("Ocorrencia nao encontrada"));
    }
    // Cascade — apagar comentarios
    store
        .ocorrencia_comentarios
        .retain(|c| c.ocorrencia_id != id);
    // Cascade — apagar anexos (metadata + ficheiros)
    let anexos: Vec<OcorrenciaAnexo> = store
        .ocorrencia_anexos
        .iter()
        .filter(|a| a.ocorrencia_id == id)
        .cloned()
        .collect();
    store.ocorrencia_anexos.retain(|a| a.ocorrencia_id != id);
    for anexo in anexos {
        let path = std::path::PathBuf::from("data/ocorrencias").join(&anexo.storage_key);
        if path.exists() {
            let _ = tokio::fs::remove_file(&path).await;
        }
    }
    store.add_audit(
        &user,
        "operations",
        "delete",
        &id,
        format!("{deleted_name} apagada"),
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(()))
}

pub async fn comentarios_listar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Vec<OcorrenciaComentario>>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    store
        .ocorrencias
        .iter()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    let comentarios: Vec<OcorrenciaComentario> = store
        .ocorrencia_comentarios
        .iter()
        .filter(|c| c.ocorrencia_id == id)
        .cloned()
        .collect();
    Ok(Json(comentarios))
}

pub async fn comentarios_criar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<ComentarioInput>,
) -> Result<Json<OcorrenciaComentario>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    validate_required(&input.texto, "Texto")?;

    let mut store = state.store.write().await;
    store
        .ocorrencias
        .iter()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    let visibilidade = match input.visibilidade.as_deref() {
        Some("publico") | Some("Publico") => ComentarioVisibilidade::Publico,
        _ => ComentarioVisibilidade::Interno,
    };

    let comentario = OcorrenciaComentario {
        id: Uuid::new_v4().to_string(),
        ocorrencia_id: id,
        autor_id: user.id.clone(),
        autor_nome: user.name.clone(),
        texto: input.texto.trim().to_string(),
        visibilidade,
        criado_em: Utc::now().to_rfc3339(),
    };

    store.ocorrencia_comentarios.push(comentario.clone());
    store.add_audit(
        &user,
        "operations",
        "comment",
        &comentario.ocorrencia_id,
        format!("Comentario adicionado por {}", user.name),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(comentario))
}

pub async fn anexos_upload(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<Vec<OcorrenciaAnexo>>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    store
        .ocorrencias
        .iter()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    let mut anexos = Vec::new();
    while let Ok(Some(field)) = multipart.next_field().await {
        let raw_name = field.file_name().unwrap_or("anexo").to_string();
        let nome = raw_name.replace(['/', '\\', ':'], "_").replace("..", "_");
        let mime_type = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();
        let data = field
            .bytes()
            .await
            .map_err(|e| ApiError::internal(format!("Erro ao ler ficheiro: {e}")))?;
        let tamanho_bytes = data.len() as u64;
        let storage_key = format!("{}/{}-{}", id, Uuid::new_v4(), nome);

        let anexo = OcorrenciaAnexo {
            id: Uuid::new_v4().to_string(),
            ocorrencia_id: id.clone(),
            nome,
            mime_type,
            tamanho_bytes,
            storage_key,
            uploaded_por: user.name.clone(),
            criado_em: Utc::now().to_rfc3339(),
        };

        // Persistir ficheiro em data/ocorrencias/
        let path = std::path::PathBuf::from("data/ocorrencias").join(&anexo.storage_key);
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| ApiError::internal(format!("Erro ao criar diretorio: {e}")))?;
        }
        tokio::fs::write(&path, &data)
            .await
            .map_err(|e| ApiError::internal(format!("Erro ao escrever ficheiro: {e}")))?;

        store.ocorrencia_anexos.push(anexo.clone());
        anexos.push(anexo);
    }

    store.add_audit(
        &user,
        "operations",
        "attachment",
        &id,
        format!("{} anexo(s) carregado(s)", anexos.len()),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(anexos))
}

pub async fn anexos_apagar(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path((id, anexo_id)): Path<(String, String)>,
) -> Result<Json<()>, ApiError> {
    let user = require_delete(&headers, &state, "operations").await?;
    let mut store = state.store.write().await;
    let anexo = store
        .ocorrencia_anexos
        .iter()
        .find(|a| a.id == anexo_id)
        .cloned();
    if let Some(ref a) = anexo {
        let path = std::path::PathBuf::from("data/ocorrencias").join(&a.storage_key);
        if path.exists() {
            let _ = tokio::fs::remove_file(&path).await;
        }
    }
    let original_len = store.ocorrencia_anexos.len();
    store.ocorrencia_anexos.retain(|a| a.id != anexo_id);
    if store.ocorrencia_anexos.len() == original_len {
        return Err(ApiError::not_found("Anexo nao encontrado"));
    }
    store.add_audit(
        &user,
        "operations",
        "delete_attachment",
        &id,
        "Anexo removido".to_string(),
    );
    drop(store);
    persist(&state).await?;
    Ok(Json(()))
}

pub async fn reabrir(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<StatusTransitionInput>,
) -> Result<Json<Ocorrencia>, ApiError> {
    let user = require_write(&headers, &state, "operations").await?;

    let mut store = state.store.write().await;
    let item = store
        .ocorrencias
        .iter_mut()
        .find(|o| o.id == id)
        .ok_or_else(|| ApiError::not_found("Ocorrencia nao encontrada"))?;

    if item.status != OcorrenciaStatus::Fechada && item.status != OcorrenciaStatus::Resolvida {
        return Err(ApiError::validation(
            "So e possivel reabrir ocorrencias fechadas ou resolvidas",
        ));
    }

    let motivo = input.motivo.as_deref().unwrap_or("Reaberta").to_string();
    item.status = OcorrenciaStatus::Reaberta;
    item.atualizado_em = Utc::now().to_rfc3339();
    let response = item.clone();

    store.add_audit(
        &user,
        "operations",
        "reopen",
        &response.id,
        format!("Ocorrencia reaberta: {motivo}"),
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(response))
}

pub async fn metricas(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<OcorrenciasMetricas>, ApiError> {
    current_user(&headers, &state).await?;
    let store = state.store.read().await;
    Ok(Json(store.ocorrencias_metricas()))
}

pub async fn criar_publica(
    State(state): State<AppState>,
    Json(input): Json<PublicaInput>,
) -> Result<Json<PublicaResponse>, ApiError> {
    validate_required(&input.titulo, "Titulo")?;
    validate_required(&input.descricao, "Descricao")?;
    validate_required(&input.requisitante_nome, "Nome")?;
    validate_required(&input.requisitante_email, "Email")?;

    let now = Utc::now().to_rfc3339();
    let token = Uuid::new_v4().to_string();

    let ocorrencia = Ocorrencia {
        id: Uuid::new_v4().to_string(),
        titulo: input.titulo.trim().to_string(),
        tipo: OcorrenciaTipo::Avaria,
        status: OcorrenciaStatus::Nova,
        prioridade: Prioridade::Normal,
        impacto: Impacto::Medio,
        urgencia: Urgencia::Media,
        descricao: input.descricao.trim().to_string(),
        condominium_id: input.condominium_id.unwrap_or_default(),
        requisitante_nome: input.requisitante_nome.trim().to_string(),
        requisitante_email: input.requisitante_email.trim().to_string(),
        requisitante_telefone: input.requisitante_telefone.unwrap_or_default(),
        canal: Canal::Portal,
        categoria: "Reportado por morador".to_string(),
        atribuido_a: String::new(),
        tags: vec!["publico".to_string()],
        bloco_id: String::new(),
        piso_id: String::new(),
        zona_id: String::new(),
        equipamento_id: input.equipamento_id.unwrap_or_default(),
        custo_estimado: String::new(),
        custo_final: String::new(),
        fornecedor_id: String::new(),
        origin_channel: "client".to_string(),
        public_status_text: "Avaria recebida".to_string(),
        technical_notes: String::new(),
        assigned_worker_id: String::new(),
        referencia_contrato: String::new(),
        media_ids: vec![],
        documento_ids: vec![],
        motivo_resolucao: String::new(),
        sla_resposta_em: String::new(),
        sla_resolucao_em: String::new(),
        respondido_em: String::new(),
        resolvido_em: String::new(),
        fechado_em: String::new(),
        token_acompanhamento: token.clone(),
        criado_em: now.clone(),
        atualizado_em: now,
    };

    let mut store = state.store.write().await;
    store.ocorrencias.insert(0, ocorrencia.clone());
    // Registar no audit log sem user autenticado — usar nome do requisitante
    let public_id = Uuid::new_v4().to_string();
    store.audit_log.insert(
        0,
        crate::models::store::AuditLogEntry {
            id: public_id,
            user_id: String::new(),
            user_name: ocorrencia.requisitante_nome.clone(),
            module: "operations".to_string(),
            action: "public_create".to_string(),
            record_id: ocorrencia.id.clone(),
            summary: format!(
                "Ocorrencia publica criada por {}: {}",
                ocorrencia.requisitante_nome, ocorrencia.titulo
            ),
            created_at: Utc::now(),
        },
    );
    drop(store);
    persist(&state).await?;

    Ok(Json(PublicaResponse {
        token_acompanhamento: token,
        ocorrencia,
    }))
}

// ── Response types ──

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedOcorrencias {
    pub data: Vec<Ocorrencia>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaDetalhe {
    pub ocorrencia: Ocorrencia,
    pub comentarios: Vec<OcorrenciaComentario>,
    pub anexos: Vec<OcorrenciaAnexo>,
    pub historico: Vec<OcorrenciaHistoricoItem>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcorrenciaHistoricoItem {
    pub timestamp: String,
    pub autor: String,
    pub acao: String,
    pub descricao: String,
}

// ── Helpers ──

fn parse_tipo(value: Option<&str>) -> Option<OcorrenciaTipo> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("avaria") => Some(OcorrenciaTipo::Avaria),
        Some(v) if v.eq_ignore_ascii_case("pedido") => Some(OcorrenciaTipo::Pedido),
        Some(v) if v.eq_ignore_ascii_case("reclamacao") => Some(OcorrenciaTipo::Reclamacao),
        Some(v) if v.eq_ignore_ascii_case("pergunta") => Some(OcorrenciaTipo::Pergunta),
        Some(v)
            if v.eq_ignore_ascii_case("tarefa interna")
                || v.eq_ignore_ascii_case("tarefa_interna")
                || v.eq_ignore_ascii_case("tarefaInterna") =>
        {
            Some(OcorrenciaTipo::TarefaInterna)
        }
        _ => None,
    }
}

fn parse_status(value: Option<&str>) -> Option<OcorrenciaStatus> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("nova") => Some(OcorrenciaStatus::Nova),
        Some(v)
            if v.eq_ignore_ascii_case("em triagem")
                || v.eq_ignore_ascii_case("em_triagem")
                || v.eq_ignore_ascii_case("emTriagem") =>
        {
            Some(OcorrenciaStatus::EmTriagem)
        }
        Some(v)
            if v.eq_ignore_ascii_case("aguarda pecas")
                || v.eq_ignore_ascii_case("aguarda_pecas")
                || v.eq_ignore_ascii_case("aguardaPecas") =>
        {
            Some(OcorrenciaStatus::AguardaPecas)
        }
        Some(v)
            if v.eq_ignore_ascii_case("em curso")
                || v.eq_ignore_ascii_case("em_curso")
                || v.eq_ignore_ascii_case("emCurso") =>
        {
            Some(OcorrenciaStatus::EmCurso)
        }
        Some(v) if v.eq_ignore_ascii_case("pendente") => Some(OcorrenciaStatus::Pendente),
        Some(v) if v.eq_ignore_ascii_case("resolvida") || v.eq_ignore_ascii_case("resolvido") => {
            Some(OcorrenciaStatus::Resolvida)
        }
        Some(v) if v.eq_ignore_ascii_case("fechada") || v.eq_ignore_ascii_case("fechado") => {
            Some(OcorrenciaStatus::Fechada)
        }
        Some(v) if v.eq_ignore_ascii_case("reaberta") || v.eq_ignore_ascii_case("reaberto") => {
            Some(OcorrenciaStatus::Reaberta)
        }
        _ => None,
    }
}

fn parse_prioridade(value: Option<&str>) -> Option<Prioridade> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("baixa") => Some(Prioridade::Baixa),
        Some(v) if v.eq_ignore_ascii_case("normal") => Some(Prioridade::Normal),
        Some(v) if v.eq_ignore_ascii_case("alta") => Some(Prioridade::Alta),
        Some(v) if v.eq_ignore_ascii_case("urgente") => Some(Prioridade::Urgente),
        _ => None,
    }
}

fn parse_impacto(value: Option<&str>) -> Option<Impacto> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("baixo") => Some(Impacto::Baixo),
        Some(v) if v.eq_ignore_ascii_case("medio") => Some(Impacto::Medio),
        Some(v) if v.eq_ignore_ascii_case("alto") => Some(Impacto::Alto),
        Some(v) if v.eq_ignore_ascii_case("critico") => Some(Impacto::Critico),
        _ => None,
    }
}

fn parse_urgencia(value: Option<&str>) -> Option<Urgencia> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("baixa") => Some(Urgencia::Baixa),
        Some(v) if v.eq_ignore_ascii_case("media") => Some(Urgencia::Media),
        Some(v) if v.eq_ignore_ascii_case("alta") => Some(Urgencia::Alta),
        Some(v) if v.eq_ignore_ascii_case("imediata") => Some(Urgencia::Imediata),
        _ => None,
    }
}

fn parse_canal(value: Option<&str>) -> Option<Canal> {
    match value {
        Some(v) if v.eq_ignore_ascii_case("portal") => Some(Canal::Portal),
        Some(v) if v.eq_ignore_ascii_case("email") => Some(Canal::Email),
        Some(v) if v.eq_ignore_ascii_case("telefone") => Some(Canal::Telefone),
        Some(v) if v.eq_ignore_ascii_case("presencial") => Some(Canal::Presencial),
        Some(v) if v.eq_ignore_ascii_case("interno") => Some(Canal::Interno),
        _ => None,
    }
}

fn normalize_origin_channel(value: Option<&str>) -> String {
    match value.unwrap_or("hq").trim().to_lowercase().as_str() {
        "worker" => "worker".to_string(),
        "client" => "client".to_string(),
        _ => "hq".to_string(),
    }
}

fn validate_required(value: &str, label: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::validation(format!("{label} e obrigatorio")));
    }
    Ok(())
}

fn non_empty_string(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

async fn persist(state: &AppState) -> Result<(), ApiError> {
    state
        .save()
        .await
        .map_err(|_| ApiError::internal("Nao foi possivel persistir os dados"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::demo::DemoData;
    use crate::models::store::{ComentarioVisibilidade, Session};
    use crate::routes;
    use axum::{
        body::Body,
        http::{header::AUTHORIZATION, Method, Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use tower::ServiceExt;

    async fn collect(res: axum::response::Response<Body>) -> (StatusCode, Vec<u8>) {
        let status = res.status();
        let body = res.into_body().collect().await.unwrap().to_bytes().to_vec();
        (status, body)
    }

    fn test_app_state() -> AppState {
        let demo: DemoData =
            serde_json::from_str(include_str!("../../../../mock/demo-data.json")).unwrap();
        let mut store = AppStore::seed_from_demo(&demo, "fake-hash".to_string());

        // Adicionar sessao de teste
        let user_id = store.users[0].id.clone();
        let tenant_id = store.tenants[0].id.clone();
        store.sessions.push(Session {
            user_id,
            tenant_id,
            token: "test-token-raw".to_string(),
            refresh_token: "test-refresh-token".to_string(),
            expires_at: chrono::Utc::now() + chrono::Duration::hours(24),
            created_at: chrono::Utc::now(),
            active_condominium: demo.active_condominium.clone(),
            app_context: "hq".to_string(),
            refresh_expires_at: chrono::Utc::now() + chrono::Duration::hours(48),
        });

        let tmp = std::env::temp_dir().join(format!("gestisac-test-{}.json", Uuid::new_v4()));

        AppState {
            config: crate::config::ApiConfig {
                host: std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST),
                port: 0,
                data_path: tmp,
                document_storage_path: std::env::temp_dir().join("gestisac-test-docs"),
                cors_allowed_origins: vec![],
                database: None,
            },
            store: Arc::new(RwLock::new(store)),
        }
    }

    fn app(state: AppState) -> axum::Router {
        routes::router(state)
    }

    // ── GET /api/ocorrencias ──

    #[tokio::test]
    async fn test_listar_returns_paginated_ocorrencias() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let (status, body) = collect(app.oneshot(req).await.unwrap()).await;
        assert_eq!(status, StatusCode::OK);

        let parsed: PaginatedOcorrencias = serde_json::from_slice(&body).unwrap();
        assert!(!parsed.data.is_empty());
        assert!(parsed.total > 0);
        assert_eq!(parsed.page, 1);
    }

    #[tokio::test]
    async fn test_listar_requires_auth() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_listar_filters_by_tipo() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias?tipo=Avaria")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: PaginatedOcorrencias = serde_json::from_slice(&collect(res).await.1).unwrap();
        for o in &body.data {
            assert_eq!(o.tipo.as_str(), "Avaria");
        }
    }

    #[tokio::test]
    async fn test_listar_filters_by_status() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias?status=Nova")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: PaginatedOcorrencias = serde_json::from_slice(&collect(res).await.1).unwrap();
        for o in &body.data {
            assert_eq!(o.status.as_str(), "Nova");
        }
    }

    #[tokio::test]
    async fn test_listar_pagination_works() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias?page=1&pageSize=1")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let (status, body) = collect(app.oneshot(req).await.unwrap()).await;
        assert_eq!(status, StatusCode::OK);

        let parsed: PaginatedOcorrencias = serde_json::from_slice(&body).unwrap();
        assert_eq!(parsed.data.len(), 1);
        assert_eq!(parsed.page, 1);
        assert_eq!(parsed.page_size, 1);
    }

    // ── GET /api/ocorrencias/{id} ──

    #[tokio::test]
    async fn test_detalhe_returns_ocorrencia_with_comments_and_attachments() {
        let state = test_app_state();
        let first_id = {
            let store = state.store.read().await;
            store.ocorrencias[0].id.clone()
        };

        let app = app(state);
        let req = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/ocorrencias/{}", first_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: OcorrenciaDetalhe = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.ocorrencia.id, first_id);
    }

    #[tokio::test]
    async fn test_detalhe_returns_404_for_missing() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias/non-existent-id")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    // ── POST /api/ocorrencias ──

    #[tokio::test]
    async fn test_criar_creates_ocorrencia() {
        let state = test_app_state();
        let app = app(state);

        let input = serde_json::json!({
            "titulo": "Teste de criacao",
            "tipo": "Avaria",
            "descricao": "Descricao de teste"
        });
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/ocorrencias")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: Ocorrencia = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.titulo, "Teste de criacao");
        assert_eq!(body.tipo, OcorrenciaTipo::Avaria);
        assert!(!body.id.is_empty());
    }

    #[tokio::test]
    async fn test_criar_validates_required_titulo() {
        let state = test_app_state();
        let app = app(state);

        let input = serde_json::json!({
            "titulo": "",
            "tipo": "Avaria"
        });
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/ocorrencias")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    // ── PUT /api/ocorrencias/{id} ──

    #[tokio::test]
    async fn test_atualizar_updates_ocorrencia() {
        let state = test_app_state();
        let first_id = {
            let store = state.store.read().await;
            store.ocorrencias[0].id.clone()
        };

        let app = app(state);
        let input = serde_json::json!({
            "titulo": "Titulo atualizado",
            "descricao": "Nova descricao"
        });
        let req = Request::builder()
            .method(Method::PUT)
            .uri(format!("/api/ocorrencias/{}", first_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: Ocorrencia = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.titulo, "Titulo atualizado");
        assert_eq!(body.descricao, "Nova descricao");
    }

    // ── PATCH /api/ocorrencias/{id}/status ──

    #[tokio::test]
    async fn test_transitar_status_changes_status() {
        let state = test_app_state();
        // Encontrar uma ocorrencia com status Nova
        let target_id = {
            let store = state.store.read().await;
            store
                .ocorrencias
                .iter()
                .find(|o| o.status == OcorrenciaStatus::Nova)
                .map(|o| o.id.clone())
                .expect("deve haver pelo menos uma ocorrencia Nova")
        };

        let app = app(state);
        let input = serde_json::json!({
            "status": "EmTriagem",
            "motivo": "Teste de transicao"
        });
        let req = Request::builder()
            .method(Method::PATCH)
            .uri(format!("/api/ocorrencias/{}/status", target_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: Ocorrencia = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.status, OcorrenciaStatus::EmTriagem);
    }

    #[tokio::test]
    async fn test_transitar_status_rejects_invalid_transition() {
        let state = test_app_state();
        let target_id = {
            let store = state.store.read().await;
            store
                .ocorrencias
                .iter()
                .find(|o| o.status == OcorrenciaStatus::Nova)
                .map(|o| o.id.clone())
                .expect("deve haver pelo menos uma ocorrencia Nova")
        };

        let app = app(state);
        // Nova -> Resolvida e invalida
        let input = serde_json::json!({
            "status": "Resolvida"
        });
        let req = Request::builder()
            .method(Method::PATCH)
            .uri(format!("/api/ocorrencias/{}/status", target_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    // ── DELETE /api/ocorrencias/{id} ──

    #[tokio::test]
    async fn test_apagar_deletes_ocorrencia() {
        let state = test_app_state();
        let target_id = {
            let store = state.store.read().await;
            store.ocorrencias[0].id.clone()
        };

        let app = app(state);
        let req = Request::builder()
            .method(Method::DELETE)
            .uri(format!("/api/ocorrencias/{}", target_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_apagar_returns_404_for_missing() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::DELETE)
            .uri("/api/ocorrencias/non-existent-id")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    // ── GET /api/ocorrencias/{id}/comentarios ──

    #[tokio::test]
    async fn test_comentarios_listar_returns_empty_when_no_comments() {
        let state = test_app_state();
        let first_id = {
            let store = state.store.read().await;
            store.ocorrencias[0].id.clone()
        };

        let app = app(state);
        let req = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/ocorrencias/{}/comentarios", first_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: Vec<OcorrenciaComentario> =
            serde_json::from_slice(&collect(res).await.1).unwrap();
        assert!(body.is_empty());
    }

    // ── POST /api/ocorrencias/{id}/comentarios ──

    #[tokio::test]
    async fn test_comentarios_criar_adds_comment() {
        let state = test_app_state();
        let first_id = {
            let store = state.store.read().await;
            store.ocorrencias[0].id.clone()
        };

        let app = app(state);
        let input = serde_json::json!({
            "texto": "Comentario de teste",
            "visibilidade": "publico"
        });
        let req = Request::builder()
            .method(Method::POST)
            .uri(format!("/api/ocorrencias/{}/comentarios", first_id))
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: OcorrenciaComentario = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.texto, "Comentario de teste");
        assert_eq!(body.visibilidade, ComentarioVisibilidade::Publico);
        assert_eq!(body.ocorrencia_id, first_id);
    }

    // ── GET /api/ocorrencias/metricas ──

    #[tokio::test]
    async fn test_metricas_returns_valid_metrics() {
        let state = test_app_state();
        let app = app(state);

        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/ocorrencias/metricas")
            .header(AUTHORIZATION, "Bearer test-token-raw")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: OcorrenciasMetricas = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert!(body.total_abertas > 0);
    }

    // ── POST /api/ocorrencias/publica ──

    #[tokio::test]
    async fn test_criar_publica_creates_without_auth() {
        let state = test_app_state();
        let app = app(state);

        let input = serde_json::json!({
            "titulo": "Ocorrencia publica",
            "descricao": "Reportada por morador",
            "requisitanteNome": "Joao Teste",
            "requisitanteEmail": "joao@teste.pt"
        });
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/ocorrencias/publica")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body: PublicaResponse = serde_json::from_slice(&collect(res).await.1).unwrap();
        assert_eq!(body.ocorrencia.titulo, "Ocorrencia publica");
        assert!(!body.token_acompanhamento.is_empty());
    }

    #[tokio::test]
    async fn test_criar_publica_validates_required_fields() {
        let state = test_app_state();
        let app = app(state);

        let input = serde_json::json!({
            "titulo": "",
            "descricao": "",
            "requisitanteNome": "",
            "requisitanteEmail": ""
        });
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/ocorrencias/publica")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let (status, _body) = collect(app.oneshot(req).await.unwrap()).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    // ── Authorization: forbids write for readers ──

    #[tokio::test]
    async fn test_criar_requires_write_permission() {
        // Create a session with a non-admin user (no write perms)
        let demo: DemoData =
            serde_json::from_str(include_str!("../../../../mock/demo-data.json")).unwrap();
        let mut store = AppStore::seed_from_demo(&demo, "fake-hash".to_string());
        let user_id = store.users[0].id.clone();
        let tenant_id = store.tenants[0].id.clone();
        // Give user a role without write perms for "operations"
        if let Some(user) = store.users.iter_mut().find(|u| u.id == user_id) {
            user.role = "Leitor".to_string();
        }
        store.sessions.push(Session {
            user_id,
            tenant_id,
            token: "reader-token".to_string(),
            refresh_token: "reader-refresh".to_string(),
            expires_at: chrono::Utc::now() + chrono::Duration::hours(24),
            created_at: chrono::Utc::now(),
            active_condominium: demo.active_condominium.clone(),
            app_context: "hq".to_string(),
            refresh_expires_at: chrono::Utc::now() + chrono::Duration::hours(48),
        });

        let tmp =
            std::env::temp_dir().join(format!("gestisac-test-reader-{}.json", Uuid::new_v4()));

        let state = AppState {
            config: crate::config::ApiConfig {
                host: std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST),
                port: 0,
                data_path: tmp,
                document_storage_path: std::env::temp_dir().join("gestisac-test-docs"),
                cors_allowed_origins: vec![],
                database: None,
            },
            store: Arc::new(RwLock::new(store)),
        };
        let app = app(state);

        let input = serde_json::json!({"titulo": "Teste"});
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/ocorrencias")
            .header(AUTHORIZATION, "Bearer reader-token")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&input).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }

    // ── Helper functions ──

    #[test]
    fn parse_tipo_all_variants() {
        assert_eq!(parse_tipo(Some("avaria")), Some(OcorrenciaTipo::Avaria));
        assert_eq!(parse_tipo(Some("AVARIA")), Some(OcorrenciaTipo::Avaria));
        assert_eq!(parse_tipo(Some("Avaria")), Some(OcorrenciaTipo::Avaria));
        assert_eq!(parse_tipo(Some("pedido")), Some(OcorrenciaTipo::Pedido));
        assert_eq!(
            parse_tipo(Some("reclamacao")),
            Some(OcorrenciaTipo::Reclamacao)
        );
        assert_eq!(parse_tipo(Some("pergunta")), Some(OcorrenciaTipo::Pergunta));
        assert_eq!(
            parse_tipo(Some("tarefa interna")),
            Some(OcorrenciaTipo::TarefaInterna)
        );
        assert_eq!(
            parse_tipo(Some("tarefa_interna")),
            Some(OcorrenciaTipo::TarefaInterna)
        );
        assert_eq!(
            parse_tipo(Some("tarefaInterna")),
            Some(OcorrenciaTipo::TarefaInterna)
        );
        assert_eq!(parse_tipo(Some("invalido")), None);
        assert_eq!(parse_tipo(None), None);
    }

    #[test]
    fn parse_status_all_variants() {
        assert_eq!(parse_status(Some("nova")), Some(OcorrenciaStatus::Nova));
        assert_eq!(
            parse_status(Some("em triagem")),
            Some(OcorrenciaStatus::EmTriagem)
        );
        assert_eq!(
            parse_status(Some("em_triagem")),
            Some(OcorrenciaStatus::EmTriagem)
        );
        assert_eq!(
            parse_status(Some("aguarda pecas")),
            Some(OcorrenciaStatus::AguardaPecas)
        );
        assert_eq!(
            parse_status(Some("em curso")),
            Some(OcorrenciaStatus::EmCurso)
        );
        assert_eq!(
            parse_status(Some("pendente")),
            Some(OcorrenciaStatus::Pendente)
        );
        assert_eq!(
            parse_status(Some("resolvida")),
            Some(OcorrenciaStatus::Resolvida)
        );
        assert_eq!(
            parse_status(Some("resolvido")),
            Some(OcorrenciaStatus::Resolvida)
        );
        assert_eq!(
            parse_status(Some("fechada")),
            Some(OcorrenciaStatus::Fechada)
        );
        assert_eq!(
            parse_status(Some("fechado")),
            Some(OcorrenciaStatus::Fechada)
        );
        assert_eq!(
            parse_status(Some("reaberta")),
            Some(OcorrenciaStatus::Reaberta)
        );
        assert_eq!(
            parse_status(Some("reaberto")),
            Some(OcorrenciaStatus::Reaberta)
        );
        assert_eq!(parse_status(Some("invalido")), None);
        assert_eq!(parse_status(None), None);
    }

    #[test]
    fn parse_prioridade_all_variants() {
        assert_eq!(parse_prioridade(Some("baixa")), Some(Prioridade::Baixa));
        assert_eq!(parse_prioridade(Some("normal")), Some(Prioridade::Normal));
        assert_eq!(parse_prioridade(Some("alta")), Some(Prioridade::Alta));
        assert_eq!(parse_prioridade(Some("urgente")), Some(Prioridade::Urgente));
        assert_eq!(parse_prioridade(Some("invalido")), None);
        assert_eq!(parse_prioridade(None), None);
    }

    #[test]
    fn parse_impacto_all_variants() {
        assert_eq!(parse_impacto(Some("baixo")), Some(Impacto::Baixo));
        assert_eq!(parse_impacto(Some("medio")), Some(Impacto::Medio));
        assert_eq!(parse_impacto(Some("alto")), Some(Impacto::Alto));
        assert_eq!(parse_impacto(Some("critico")), Some(Impacto::Critico));
        assert_eq!(parse_impacto(Some("invalido")), None);
        assert_eq!(parse_impacto(None), None);
    }

    #[test]
    fn parse_urgencia_all_variants() {
        assert_eq!(parse_urgencia(Some("baixa")), Some(Urgencia::Baixa));
        assert_eq!(parse_urgencia(Some("media")), Some(Urgencia::Media));
        assert_eq!(parse_urgencia(Some("alta")), Some(Urgencia::Alta));
        assert_eq!(parse_urgencia(Some("imediata")), Some(Urgencia::Imediata));
        assert_eq!(parse_urgencia(Some("invalido")), None);
        assert_eq!(parse_urgencia(None), None);
    }

    #[test]
    fn parse_canal_all_variants() {
        assert_eq!(parse_canal(Some("portal")), Some(Canal::Portal));
        assert_eq!(parse_canal(Some("email")), Some(Canal::Email));
        assert_eq!(parse_canal(Some("telefone")), Some(Canal::Telefone));
        assert_eq!(parse_canal(Some("presencial")), Some(Canal::Presencial));
        assert_eq!(parse_canal(Some("interno")), Some(Canal::Interno));
        assert_eq!(parse_canal(Some("invalido")), None);
        assert_eq!(parse_canal(None), None);
    }

    #[test]
    fn validate_required_accepts_non_empty() {
        assert!(validate_required("hello", "Campo").is_ok());
    }

    #[test]
    fn validate_required_rejects_empty() {
        assert!(validate_required("", "Campo").is_err());
        assert!(validate_required("  ", "Campo").is_err());
    }

    #[test]
    fn non_empty_string_returns_some_for_non_empty() {
        assert_eq!(
            non_empty_string(Some(" hello ".to_string())),
            Some("hello".to_string())
        );
    }

    #[test]
    fn non_empty_string_returns_none_for_empty() {
        assert_eq!(non_empty_string(Some("".to_string())), None);
        assert_eq!(non_empty_string(Some("  ".to_string())), None);
        assert_eq!(non_empty_string(None), None);
    }
}
