# V2 - Avarias Funcional De Ponta A Ponta

## Objetivo

Transformar a base V1 do modulo de avarias numa experiencia utilizavel ponta a ponta, mantendo o JSON store como ponte temporaria e preparando a evolucao para PostgreSQL, Redis, SSE/WebSocket e push notifications na V3.

## Implementado Nesta V2

- Backend com detalhe completo por `GET /api/tickets/{id}`.
- Upload multipart real em `POST /api/tickets/{id}/attachments/upload`, com ficheiros guardados em `apps/api/data/avarias`.
- Download autenticado de anexos em `GET /api/tickets/{id}/attachments/{attachmentId}/download`.
- Atualizacao de checklist por `PUT /api/tickets/{id}/checklist/{checklistItemId}`.
- Feed operacional incremental por `GET /api/operations/feed?since=<timestamp>`.
- Frontend com funcoes dedicadas para transicao, atribuicao, mensagens, anexos, checklist, confirmacao, reabertura e sincronizacao offline.
- Detalhe operacional em `/tickets` com acoes reais ligadas aos endpoints especificos.
- Vistas PWA focadas em `/tecnico/avarias` e `/condomino/avarias`.
- Fila offline em `localStorage` para acoes JSON de avaria, sincronizada por botao e por polling.
- Polling incremental a cada 15 segundos enquanto nao existir Redis/WebSocket.
- Cache PWA atualizada para incluir as rotas tecnico e condomino.

## Limites Assumidos

- Upload offline de ficheiros nao fica em fila local nesta V2, porque blobs em `localStorage` seriam frageis; quando a API estiver offline a UI pede repeticao do upload.
- O realtime e polling funcional, nao WebSocket/SSE.
- Nao entram PostgreSQL, Redis, push native, IA, OCR, voz ou IoT nesta fase.

## QA Funcional Esperado

1. Criar uma avaria como condomino em `/condomino/avarias`.
2. Abrir a mesma avaria em `/tickets`, atribuir tecnico e mudar estado.
3. Em `/tecnico/avarias`, avancar pelos estados de intervencao.
4. Adicionar mensagem, checklist e anexo visual.
5. Marcar como resolvida.
6. Confirmar ou rejeitar resolucao como condomino.
7. Desligar a API/rede, criar acoes pendentes e confirmar sincronizacao apos religar.
