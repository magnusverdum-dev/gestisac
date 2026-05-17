# Plano De Implementacao - Modulo De Avarias

## Resumo

O modulo de avarias transforma os tickets atuais num sistema operacional completo para manutencao e incidentes em condominios. A primeira implementacao deve manter compatibilidade com `/api/tickets`, mas acrescentar modelo de dominio, timeline, SLA, atribuicao, anexos, chat, confirmacao do morador e vistas especificas para administradores, tecnicos e condominos.

Esta fase deve entregar uma base funcional e extensivel, nao a versao final de realtime/offline/IA. O objetivo e criar contratos e experiencia inicial solidos para evoluir para PostgreSQL, Redis, push notifications, filas e PWAs mais autonomas.

## Implementacao

- Evoluir `Ticket` para uma avaria operacional com prioridade tipada, estado tipado, localizacao, morador, tecnico atribuido, SLA, emergencia, timestamps e campos de contexto.
- Adicionar subrecursos operacionais: timeline auditavel, anexos multimidia, mensagens/chat, checklist, confirmacao digital, QR zones, feed live, metricas operacionais e perfil operacional do cliente.
- Manter `/api/tickets` compativel com a UI atual e acrescentar endpoints especificos para transicoes, atribuicao, timeline, anexos, mensagens, confirmacao, reabertura, metricas, feed e QR zones.
- Criar no frontend uma experiencia mais rica em `/tickets`: cards operacionais, SLA visual, emergencia, timeline, before/after, acoes rapidas, areas de tecnico/condomino e linguagem visual de centro operacional.
- Preparar offline-first no service worker e no modelo de UI com informacao explicita sobre fila local/sincronizacao, deixando a sincronizacao completa para uma fase seguinte.

## Contratos Planeados

Endpoints principais:

- `GET /api/tickets`: lista de avarias/tickets com campos novos e compativeis.
- `POST /api/tickets`: cria avaria operacional.
- `PUT /api/tickets/{id}`: atualiza campos principais.
- `PUT /api/tickets/{id}/transition`: muda estado e cria evento de timeline.
- `PUT /api/tickets/{id}/assign`: atribui tecnico e cria evento.
- `GET /api/tickets/{id}/timeline`: devolve timeline auditavel.
- `POST /api/tickets/{id}/attachments`: regista anexo multimidia.
- `POST /api/tickets/{id}/messages`: regista mensagem operacional.
- `POST /api/tickets/{id}/confirm-resolution`: confirma ou rejeita resolucao com assinatura.
- `POST /api/tickets/{id}/reopen`: reabre ticket resolvido/confirmado.
- `GET /api/operations/feed`: feed operacional live.
- `GET /api/operations/metrics`: metricas de SLA, emergencias e atividade.
- `GET /api/qr-zones`: zonas operacionais com QR code/logica de criacao rapida.

Tipos de dominio:

- `AvariaStatus`: Aberta, EmAnalise, Atribuida, EmDeslocacao, NoLocal, EmReparacao, AguardandoMaterial, Resolvida, Confirmada, Reaberta, Fechada.
- `AvariaPriority`: Baixa, Normal, Alta, Critica, Emergencia.
- `AvariaEventType`: Created, StatusChanged, Assigned, NoteAdded, AttachmentAdded, MessageAdded, ChecklistUpdated, ResolutionConfirmed, ResolutionRejected, Reopened.
- `SlaState`: DentroPrazo, ProximoLimite, EmRisco, Expirado, SemSla.
- `AttachmentKind`: Image, Video, Document, BeforePhoto, AfterPhoto.

## Fases

- Fase 1: Documentar prompts e plano no repositorio.
- Fase 2: Evoluir modelo Rust e persistencia JSON compativel.
- Fase 3: Criar endpoints operacionais e testes de dominio.
- Fase 4: Atualizar tipos TypeScript, cliente API e UI de `/tickets`.
- Fase 5: Reforcar PWA/offline shell e preparar UX tecnico/condomino.
- Fase 6: Validar com checks Rust, typecheck web, build web e smoke funcional.

## Testes E Aceitacao

- Backend cria avaria com defaults operacionais, SLA calculado e timeline inicial.
- Transicao de estado atualiza `status`, `updatedAt` e timeline.
- Atribuicao de tecnico atualiza responsavel e timeline.
- Confirmacao de resolucao marca avaria como confirmada; rejeicao reabre avaria.
- Reabertura cria evento auditavel e muda estado para Reaberta.
- Feed e metricas refletem avarias, emergencias, SLA e tecnicos ativos.
- Frontend renderiza tickets antigos e novos sem quebrar.
- Validacoes finais: `pnpm run check:api`, format check, `pnpm run clippy:api`, `pnpm run test:api`, `pnpm run typecheck:web`, `pnpm run build:web`.

## Assumptions

- A persistencia continua temporariamente em JSON local, mas os contratos devem parecer prontos para PostgreSQL/Redis.
- Realtime verdadeiro, push notifications, upload binario completo e sincronizacao offline profunda ficam preparados, mas nao bloqueiam esta entrega.
- IA, OCR, voz, IoT e manutencao preditiva sao extensoes futuras, nao features obrigatorias desta fase.
- As permissoes existentes de `operations` continuam a governar gestao de avarias nesta primeira iteracao.
