# Deploy V3 - Avarias Operacionais Robustas

## Resumo

Este deploy transforma a V2 do modulo de avarias numa base mais robusta para uso real, mantendo o JSON store como persistencia temporaria. O foco foi tornar o fluxo offline mais seguro, evitar duplicacao de acoes sincronizadas, fechar QR zones funcionais e adicionar QA automatizado especifico para avarias.

## Entregue

- Idempotencia por `clientActionId` nas acoes operacionais: transicao, atribuicao, mensagem, checklist, confirmacao, reabertura e upload.
- Eventos de timeline passam a guardar `clientActionId` quando a acao veio da fila offline.
- `GET /api/operations/feed?since=...` inclui `ticketId` e continua ordenado por data.
- QR zones geram URLs web para `/condomino/avarias` com `condominium`, `location` e `template`.
- Fila offline de avarias migrada para IndexedDB, com fallback para localStorage quando necessario.
- Uploads offline ate 8 MB ficam pendentes em IndexedDB e sincronizam quando a API volta.
- UI passa a mostrar contagem de acoes pendentes, uploads em fila e falhas para retry.
- Detalhe operacional foi separado num componente dedicado para estabilizar `/tickets`, `/tecnico/avarias` e `/condomino/avarias`.
- Rota de condomino preenche automaticamente o formulario quando aberta a partir de QR payload.
- Smoke test dedicado em `pnpm run smoke:avarias`.

## Fora Desta Entrega

- PostgreSQL, Redis, WebSocket/SSE e push notifications nativas.
- IA, OCR, voz, IoT e analytics avancado.
- Storage externo tipo S3/MinIO.
- Upload offline acima de 8 MB.

## QA

Validacao obrigatoria antes de considerar o deploy pronto:

```bash
pnpm run check:api
node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check
pnpm run clippy:api
pnpm run test:api
pnpm run typecheck:web
pnpm run build:web
```

Com a API local ativa, validar o fluxo operacional:

```bash
pnpm run dev:api
pnpm run smoke:avarias
```

## Notas Operacionais

- A fila offline usa IndexedDB como caminho principal porque suporta blobs de ficheiros.
- Se IndexedDB falhar, a aplicacao preserva a acao sem ficheiro em localStorage e marca falha amigavel.
- A deduplicacao usa `clientActionId` guardado na timeline; isto e suficiente para a fase JSON store e deve migrar para indice unico em PostgreSQL na V4.
