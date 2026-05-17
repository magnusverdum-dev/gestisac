# Auditoria PWA e Avarias - 2026-05-17

## Objetivo

Rever o trabalho V1/V2/V3 do modulo de avarias e adaptar a versao PWA instalavel para uma experiencia mais coerente em uso real, especialmente nas rotas operacionais de administrador, tecnico e condomino.

## Findings Corrigidos Nesta Ronda

### P2 - Instalacao PWA visivel apenas no dashboard

O painel de instalacao existia, mas estava preso ao dashboard. Na pratica, um tecnico ou condomino que entrasse diretamente em `/tecnico/avarias` ou `/condomino/avarias` nao tinha uma chamada clara para instalar a app.

Correcao: o `AppShell` passou a expor um painel compacto de instalacao nas rotas fora do dashboard, com copy mais operacional e design adaptado ao contexto.

Arquivos:

- `apps/web/src/components/shell/AppShell.tsx`
- `apps/web/src/components/dashboard/PwaInstallPanel.tsx`
- `apps/web/src/styles/global.css`

### P2 - Apple touch icon apontava para SVG

O iOS tende a esperar um PNG para `apple-touch-icon`. O projeto ja tinha `gestisac-maskable-512.png`, mas o HTML apontava para SVG, o que podia gerar icone incorreto ou inconsistente ao adicionar ao ecra principal.

Correcao: `root.tsx` e `index.html` passaram a usar o PNG 512x512.

Arquivos:

- `apps/web/src/root.tsx`
- `apps/web/index.html`

### P2 - Experiencia instalada nao tinha classes de ambiente

A app nao marcava explicitamente o modo standalone, iOS ou Android no `html`, limitando a capacidade de adaptar layout, safe-area e estados de instalacao.

Correcao: `entry.client.tsx` passou a aplicar classes `pwa-standalone`, `pwa-installed`, `pwa-ios` e `pwa-android`; o CSS usa essas classes para ajustar `100dvh`, safe-area e ocultar o CTA compacto quando a app ja esta aberta como PWA.

Arquivos:

- `apps/web/src/entry.client.tsx`
- `apps/web/src/styles/global.css`

### P2 - Manifest pouco orientado para operacao de avarias

O manifest instalava a app, mas a entrada e shortcuts ainda estavam muito centrados no dashboard/documentos/tickets genericos.

Correcao: `start_url` passou para `/dashboard?source=pwa`, a descricao foi atualizada para o modulo offline-first e foram adicionados shortcuts para tecnico e condomino.

Arquivo:

- `apps/web/public/manifest.webmanifest`

### P3 - Cache PWA podia falhar instalacao por uma rota instavel

O service worker usava `cache.addAll`, que rejeita a instalacao inteira se uma entrada falhar. Isto e fragil para uma shell com varias rotas de aplicacao.

Correcao: a instalacao passou a cachear rotas individualmente com tolerancia a falha, mantendo `skipWaiting`. A lista de rotas principais tambem foi alargada.

Arquivo:

- `apps/web/public/sw.js`

### P3 - Pagina offline demasiado generica

A pagina offline indicava falta de ligacao, mas nao explicava bem a logica operacional da fila de avarias nem dava caminho rapido para a vista tecnica.

Correcao: a pagina offline recebeu visual alinhado com a app, chamada direta para `/tecnico/avarias`, botao de retry e texto sobre sincronizacao.

Arquivo:

- `apps/web/public/offline.html`

## Estado Funcional Auditado

O modulo de avarias V3 tem base funcional para:

- Criacao e detalhe de avarias.
- Timeline auditavel.
- Transicoes de estado.
- Atribuicao tecnica.
- Chat/mensagens.
- Checklist operacional.
- Uploads reais.
- Confirmacao e reabertura.
- Feed incremental.
- QR zones com URLs web.
- Fila offline IndexedDB para acoes e anexos.
- Smoke test dedicado ao fluxo operacional.

## Riscos Ainda Assumidos

### P2 - Persistencia continua em JSON store

A base esta adequada para MVP/V3, mas nao e a persistencia ideal para concorrencia real, auditoria forte e operacao multiutilizador. PostgreSQL/Redis continuam recomendados para V4.

### P2 - Realtime ainda e polling incremental

O feed incremental funciona como quase-realtime, mas SSE/WebSocket com Redis ainda fica fora desta entrega.

### P3 - Tokens continuam no localStorage

O frontend guarda dados de sessao em `localStorage`. Isto e aceitavel para a fase atual, mas em producao aumenta impacto de XSS. Uma versao hardened deve migrar para cookies `HttpOnly`/`Secure` ou outro fluxo de sessao mais forte.

### P3 - Upload offline depende do suporte IndexedDB

Quando IndexedDB nao estiver disponivel, o fallback para `localStorage` e limitado e nao deve ser usado para ficheiros grandes. A UI ja deve tratar falhas, mas o comportamento ideal requer storage browser moderno.

### P3 - Validacao PWA final deve ser feita em HTTPS real

Build local e preview validam compilacao e estrutura. Para instalacao nativa em dispositivos, a verificacao final deve acontecer num ambiente HTTPS real, idealmente com Lighthouse e teste manual em Android/iOS.

## Validacao Executada

- `pnpm run typecheck:web`
- `pnpm run build:web`
- `pnpm run check:api`
- `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- `pnpm run clippy:api`
- `pnpm run test:api`
- `pnpm run smoke:avarias`
- Validacao estatica de manifest/SW: `display=standalone`, `start_url=/dashboard?source=pwa`, shortcuts tecnico/condomino, icones existentes e rotas PWA no service worker.

Nota: a tentativa de abrir `localhost` no browser interno do Codex foi bloqueada pelo proprio browser com `ERR_BLOCKED_BY_CLIENT`; por isso a validacao visual local ficou coberta por build, typecheck, smoke e verificacao estatica, mas a instalacao nativa deve ser revista em HTTPS real.

## Proxima Fase Recomendada

- V4: PostgreSQL para avarias, Redis para feed/realtime e dedupe distribuido.
- V4: SSE/WebSocket para supervisor e tecnico.
- V4: sessao com cookies seguros.
- V4: Lighthouse CI para PWA.
- V4: testes E2E Playwright para instalacao, offline, sync e fluxo tecnico.
