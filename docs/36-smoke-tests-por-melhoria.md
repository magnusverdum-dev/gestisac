# Smoke Tests por Melhoria

Este documento e a checklist operacional para validar melhorias no GESTISAC.

Regra base: depois de qualquer melhoria, validar primeiro a API publicada. So depois validar a experiencia por utilizador/app. Nao usar localhost para dar uma melhoria como validada em producao.

## Nivel 1: API Primeiro

Usar quando a melhoria altera backend, dados, auth, permissoes, rotas, contratos API, ou frontend que consome dados reais.

Comandos obrigatorios:

```bash
pnpm run check:api
node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check
pnpm run clippy:api
pnpm run test:api
pnpm run check:prod-api
```

Validacoes minimas:

- Login autenticado passa em `hq`, `worker` e `client`.
- Refresh token passa em `hq`, `worker` e `client`.
- `/api/me` passa antes e depois de refresh.
- `/api/shared/me` passa em todos os contextos.
- Endpoints novos ou alterados entram na matriz de `scripts/check-production-api.mjs`.
- Endpoints por contexto devolvem dados do contexto certo.
- Endpoints que nao devem expor dados a clientes devolvem vazio, `403`, ou resposta sanitizada.
- Logout passa no fim de cada contexto.
- Tokens, passwords e connection strings nunca sao impressos.

## Nivel 2: Produção Publicada

Usar sempre que a melhoria mexe em deploy, ambiente, credenciais, CORS, web publicada, auth ou API online.

Comando obrigatorio:

```bash
pnpm run check:prod-readiness
```

Validacoes minimas:

- Projetos Vercel apontam para as root directories certas.
- API publicada responde em `/api/health`.
- API publicada responde em `/api/version`.
- CORS permite login a partir da Web publicada.
- Web publicada nao contem `localhost`, `127.0.0.1`, password demo antiga ou login rapido demo.
- Password demo antiga e rejeitada.
- Smoke autenticado de producao passa.

## Nivel 3: Replicar Utilizador

Usar depois da API estar verde, principalmente quando a melhoria muda UX, menus, permissoes, dados visiveis ou fluxos operacionais.

Contextos obrigatorios:

- HQ/Admin.
- Funcionarios/Worker.
- Cliente.

Fluxo minimo por contexto:

- Abrir login publicado do contexto.
- Entrar com credencial smoke real.
- Confirmar dashboard inicial sem erro visual ou estado demo/local.
- Confirmar menu correto para o contexto.
- Abrir as paginas impactadas pela melhoria.
- Confirmar que dados reais carregam da API publicada.
- Fazer a acao principal da melhoria, se for uma acao segura.
- Confirmar que outro contexto ve a consequencia correta quando aplicavel.
- Confirmar que contexto sem permissao nao ve ou nao consegue executar a acao.
- Fazer logout.

## Nivel 4: Matriz por Tipo de Melhoria

### Menu, navegacao ou rotas

- API: `pnpm run check:prod-api`.
- Replicar HQ, Worker e Cliente.
- Confirmar menu por contexto.
- Confirmar rotas antigas continuam acessiveis por pesquisa, detalhe ou ligacoes internas quando a funcionalidade nao foi removida.
- Confirmar que cliente nao ganha acesso a modulo interno.

### Nova rota API

- Adicionar endpoint novo a `scripts/check-production-api.mjs`.
- Validar resposta autenticada em cada contexto permitido.
- Validar contexto sem permissao.
- Validar shape publico, sem dados sensiveis.
- Validar paginacao quando aplicavel.

### Dados, base de dados ou migrations

- Correr validacoes backend completas.
- Correr auditoria de migrations.
- Correr auditoria de foreign keys/indexes quando a mudanca cria ou altera FKs.
- Validar API publicada depois do deploy.
- Confirmar que nao ha seeds/demo dependentes de localhost.

### Auth, permissoes ou roles

- Testar login, refresh, `/api/me`, `/api/shared/me` e logout nos 3 contextos.
- Validar acesso permitido e negado por role.
- Confirmar que tokens e cookies/sessoes nao aparecem em logs.
- Confirmar que cliente nao recebe dados internos.

### Frontend ou UX com dados reais

- Correr `pnpm run typecheck:apps`.
- Correr `pnpm run build:apps`.
- Correr `pnpm run check:prod-api`.
- Replicar utilizador na Web publicada.
- Confirmar que estados vazios, loading, erro e dados reais ficam legiveis.

### Produção, Vercel, CORS ou credenciais

- Correr `pnpm run check:prod-readiness`.
- Confirmar envs obrigatorias por nome, sem imprimir valores.
- Confirmar API health/version.
- Confirmar CORS login.
- Confirmar smoke autenticado.

## Nivel 5: Fecho

Antes de entregar:

- Dizer quais comandos passaram.
- Dizer quais fluxos por utilizador foram replicados.
- Dizer qualquer aviso residual que nao bloqueia.
- Dizer claramente se algo nao foi validado e por que motivo.
