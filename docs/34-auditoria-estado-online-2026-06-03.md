# Auditoria de estado online - 2026-06-03

Este documento guarda o estado confirmado antes de desligar o computador.
Nao contem passwords, tokens, connection strings completas nem segredos.

## Retoma - 2026-06-04

Estado revisto ao retomar:

- Supabase MCP esta ativo nesta sessao.
- `supabase` CLI nao esta instalado/disponivel no PATH local.
- `apps/web/.vercelignore` foi criado para impedir envio de ficheiros locais/temporarios no build da web.
- Foi criada a migracao local `apps/api/migrations/202606040012_revoke_public_execute_rls_auto_enable.sql` para espelhar a correcao aplicada no Supabase remoto.
- A funcao interna `public.rls_auto_enable()` ja so tem `EXECUTE` para `postgres` e `service_role`.
- Os avisos Supabase `anon_security_definer_function_executable` e `authenticated_security_definer_function_executable` deixaram de aparecer.
- O advisor de seguranca ainda lista avisos `INFO` de RLS ligado sem policies em tabelas publicas.
- Estes avisos de RLS sem policies nao bloqueiam o fluxo atual, porque a aplicacao usa Postgres via backend/API e nao acesso direto pelo browser.
- Antes de expor a Data API/Supabase client diretamente no frontend, e preciso desenhar policies por tenant/user.
- API `/api/health` revalidada em `2026-06-04`: `200`, `activeBackend: postgresql`.
- Deploy API revalidado: `dpl_7bFJZfxEhGhbqcTaJ44uamLGsDbN`, `Ready`.
- Deploy Web revalidado: `dpl_DamuZoJDKL6oV3U9aEabT5hYo33p`, `Ready`.
- Contagens atuais diferem do snapshot de 2026-06-03 em condominios: agora ha 9 condominios ativos e 9 snapshots de condominios.
- Possiveis residuos ativos com nomes/codigos de teste em `condominiums`: 2. Nao foram apagados durante a auditoria.
- Snapshots criticos continuam sem payload `{}`.
- Advisor de performance indica principalmente FKs sem indice e indices ainda nao usados; isto e otimizacao futura, nao bloqueio funcional imediato.

## Estado confirmado

- API online: `https://gestisac-api.vercel.app`
- Deploy API: `dpl_7bFJZfxEhGhbqcTaJ44uamLGsDbN`
- Web online: `https://gestisac-web.vercel.app`
- Deploy Web: `dpl_DamuZoJDKL6oV3U9aEabT5hYo33p`
- API `/api/health`: `200`
- Backend ativo: `postgresql`
- Ambiente API: `production`
- Demo seed em producao: `false`
- URL da base aparece redigida no health check.
- Frontend publicado contem `gestisac-api.vercel.app`.
- Frontend publicado nao contem `127.0.0.1` no bundle auditado.

## Supabase/Postgres

Estado lido diretamente da base:

- `tenants`: 1
- `users`: 1
- `condominiums_active`: 3
- `condominium_snapshots`: 3
- `tickets_active`: 5
- `ticket_snapshots`: 3
- `maintenance_items_active`: 3
- `inspections_active`: 5
- `calendar_events_active`: 7
- `sessions_active`: 0
- Residuos ativos de smoke/teste: 0

Snapshots criticos sem payloads vazios:

- `calendar_event_snapshots`: 0 vazios
- `chat_message_snapshots`: 0 vazios
- `condominium_snapshots`: 0 vazios
- `inspection_snapshots`: 0 vazios
- `maintenance_snapshots`: 0 vazios
- `ocorrencia_snapshots`: 0 vazios
- `ticket_snapshots`: 0 vazios

## Vercel

Projetos confirmados:

- `gestisac-api`
- `gestisac-web`

Variaveis confirmadas em producao:

- API:
  - `GESTISAC_DATABASE_URL`
  - `GESTISAC_ENV`
  - `JWT_SECRET`
  - `GESTISAC_SYNC_ON_STARTUP`
  - `GESTISAC_RUN_MIGRATIONS`
  - `GESTISAC_ALLOW_DEMO_SEED`
  - `GESTISAC_CORS_ORIGINS`
- Web:
  - `VITE_API_BASE_URL`

Nota importante:

- `gestisac-web` tem Root Directory `apps/web`.
- `gestisac-api` aparece com Root Directory `.`, apesar do deploy funcional ter sido feito apontando para `apps/api`.
- Antes de depender de auto-deploy por Git, confirmar/corrigir esta configuracao.

## Validacoes executadas

Todas passaram:

- `pnpm run check:api`
- `pnpm run typecheck:web`
- `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- `pnpm run clippy:api`
- `pnpm run test:api`

Resultado dos testes API:

- 100 testes passaram.

## Riscos encontrados

1. O repo local esta com muitas alteracoes por commit.
2. O estado online funciona, mas ainda depende de alteracoes locais nao consolidadas.
3. `apps/web/.env.local` existe localmente e aponta para `127.0.0.1:3000`.
4. `.env.local` esta ignorado pelo Git e `apps/web/.vercelignore` foi criado na retoma.
5. Tabelas publicas Supabase estao com RLS ligado, mas ainda sem policies.
6. Sem policies, acesso direto via Data API deve ser tratado como nao pronto ate haver desenho de autorizacao.
7. Supabase MCP esta configurado e ficou ativo depois de reiniciar/retomar a sessao.
8. `supabase` CLI nao esta instalado no PATH local; nesta auditoria foi usado MCP Supabase.

## Proximo passo recomendado

Ao retomar:

1. Rever `git status`.
2. Corrigir Root Directory do projeto `gestisac-api` na Vercel ou documentar workflow CLI oficial.
3. Consolidar alteracoes locais num commit limpo.
4. Planejar RLS/Supabase hardening antes de expor qualquer Data API.
5. Instalar Supabase CLI local se quisermos usar `supabase migration new`, `db pull` e `db diff` no workflow diario.
6. Rever os 2 possiveis residuos de teste antes de limpar dados.

## Estabilizacao aplicada - 2026-06-04

Estado final confirmado depois da auditoria funcional:

- API online: `https://gestisac-api.vercel.app`
- Deploy API ativo: `dpl_Fb9KRULcL8LKU3eGRinywX79Hsok`
- Web online: `https://gestisac-web.vercel.app`
- Deploy Web ativo: `dpl_HzUDwKTXLCW3j4XcTUCLTwRGK26M`
- API `/api/health`: `200`
- Backend ativo: `postgresql`
- `GESTISAC_DATABASE_URL` em producao usa pooler Supabase na porta `5432`.
- Web publicada usa `https://gestisac-api.vercel.app`.
- Upload Web estabilizado: cerca de `1.3MB`.
- Upload API estabilizado: cerca de `185KB`.
- Matriz autenticada `scripts/check-production-api.mjs`: 28 endpoints reais com `200`.
- Logs Vercel API com filtro `500` nos 15 minutos apos testes: sem entradas.
- Browser testado como utilizador em Dashboard, Condominios, Tickets, Contabilidade, Documentos e Relatorios.
- Browser sem `Failed to fetch`, sem banner vermelho persistente, sem redirect indevido para login e sem erros de consola.
- Nome do utilizador corrigido na origem para UTF-8 valido.
- Dados JSON de utilizador em `users.metadata` e `user_snapshots.payload` ficaram sem `passwordHash`/`password_hash`.
- Residuo ativo `Smoke Condominio ...` arquivado e respetivo snapshot removido.
- Residuo ativo `Test Cond` arquivado e respetivo snapshot removido.
- Condominios ativos depois da limpeza: 7.
- Snapshots criticos continuam sem payload `{}`.

Alteracoes preventivas aplicadas:

- A API passou a carregar utilizadores para autenticacao a partir da tabela relacional `users`, nao de `user_snapshots`.
- `user_snapshots` e `users.metadata` passam a receber JSON sanitizado sem hash de password.
- Scripts de seed/migracao tambem passaram a sanitizar metadata de utilizador.
- Frontend oficial tem fallback seguro para `https://gestisac-api.vercel.app` apenas quando corre em `gestisac-web.vercel.app`, mitigando falha de `VITE_API_BASE_URL` no build sem ligar clones ao ambiente principal.
- `.vercelignore` protege `target`, `.tmp`, logs, screenshots, `.env.local`, `node_modules` e outros artefactos.

Artefactos locais limpos:

- `apps/api/target`
- `.tmp`
- `.codex-logs`
- `.codex-e2e-logs`
- `.codex-audit`

Nota: `node_modules` foi mantido para nao atrasar desenvolvimento local.

Risco residual:

- O repo local continua com muitas alteracoes nao commitadas, algumas anteriores a esta auditoria.
- Existe aviso de performance no build Web por chunk grande; nao bloqueia estabilidade, mas deve ser tratado como melhoria futura.
- A captura de screenshot pelo browser automatizado falhou por timeout, mas a verificacao DOM/consola e os testes API passaram.

## Estabilizacao de login - 2026-06-04

Problema reportado:

- O login publicado ficava por vezes muito tempo em `A entrar...`.
- Algumas tentativas anteriores acabavam em `Failed to fetch`, mesmo com `/api/health` a responder `200`.

Causa confirmada:

- A API na Vercel tinha arranque frio lento.
- Antes desta ronda, medicoes reais mostraram primeiro pedido frio entre cerca de `22s` e `24s`.
- O frontend abortava pedidos normais aos `15s`, por isso podia desistir antes de a API acabar de acordar.

Alteracoes aplicadas:

- API: em producao, depois de carregar identidade, as leituras independentes de snapshots passam a ser feitas em paralelo.
- API: foi adicionado log seguro com `elapsed_ms` e `active_backend` no carregamento do estado.
- Web: `apiRequest` passou a aceitar `timeoutMs` por chamada.
- Web: login e refresh passam a usar timeout de arranque de `40s`.
- Web: durante login, a UI mostra uma nota curta a explicar que a API online pode demorar alguns segundos no primeiro arranque.

Deploys publicados:

- API: `dpl_61PnWP3aHsYV7TZ6mM7pofWK9oS2`
- Web: `dpl_9MSr4uyWRxrhSfvKzbDwrJHKhXq6`
- API oficial: `https://gestisac-api.vercel.app`
- Web oficial: `https://gestisac-web.vercel.app`

Resultados medidos apos deploy:

- Log Vercel: `GESTISAC API state loaded` com `elapsed_ms=9262` e backend `postgresql`.
- `GET /api/health`: entre `132ms` e `428ms` em pedidos quentes medidos.
- `POST /api/auth/login`: cerca de `1.4s` em pedidos quentes medidos.
- Login real no browser depois de terminar sessao: cerca de `2s` ate ao Dashboard.

Validacoes executadas:

- `pnpm run check:api`
- `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- `pnpm run clippy:api`
- `pnpm run test:api`
- `pnpm run typecheck:web`
- `pnpm run build:web`
- `pnpm run check:prod-api`
- Browser: logout, login, Dashboard, Condominios, Tickets, Contabilidade, Documentos e Relatorios.
- Logs Vercel API com filtro `500` nos 10 minutos apos teste: sem entradas.

Risco residual:

- A API continua serverless; se ficar fria, ainda pode ter alguns segundos de arranque.
- O timeout maior evita falso erro no login, mas a solucao estrutural futura e reduzir mais o bootstrap ou mover carga pesada para lazy loading/cache persistente.
- O build Web continua com aviso de chunk grande (`q-BTt32e3U.js`), que deve ser tratado numa ronda propria de performance.
