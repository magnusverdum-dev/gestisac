# Auditoria De Seguranca, Performance E Preparacao Para BD

Data: 2026-05-22

## Resultado

- Frontend e backend continuam a compilar e os testes da API passam.
- A API deixou de usar CORS permissivo por defeito; as origens passam por `GESTISAC_CORS_ORIGINS`.
- Tokens de sessao e refresh tokens passam a ser gerados com 32 bytes aleatorios e persistidos com hash `sha256:` no store local.
- O `/api/health` expoe um resumo de persistencia sem revelar credenciais.
- A ligacao a BD ficou preparada por configuracao com `GESTISAC_DATABASE_URL` ou `DATABASE_URL`; o backend ativo continua em `json-file` ate existirem migrations/repositorios SQL.
- A arvore JS foi atualizada para `@builder.io/qwik`/`@builder.io/qwik-city` 1.20 e `vite` 6.4.2, com override para evitar regressao para `vite`/`esbuild` vulneraveis.

## Configuracao Preparada

```env
GESTISAC_API_HOST=127.0.0.1
GESTISAC_API_PORT=3000
GESTISAC_DATA_PATH=apps/api/data/store.json
GESTISAC_DOCUMENT_STORAGE_PATH=apps/api/data/documents
GESTISAC_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
GESTISAC_DATABASE_URL=postgres://gestisac:gestisac@127.0.0.1:5432/gestisac
```

O campo `persistence.databaseUrl` em `/api/health` fica redigido, por exemplo:

```json
{
  "activeBackend": "json-file",
  "databaseConfigured": true,
  "databaseUrl": "postgres://gestisac:<redacted>@127.0.0.1:5432/gestisac"
}
```

## Proximos Passos Para BD Real

- Adicionar `sqlx` com PostgreSQL e migrations versionadas.
- Criar repositorios por modulo (`tickets`, `maintenance`, `calendar_events`, `condominiums`, `accounting`).
- Manter `AppStore` como seed/demo e criar migracao JSON -> PostgreSQL.
- Trocar handlers para servicos/repositorios em vez de ler/escrever diretamente o `RwLock<AppStore>`.
- Mover sessoes para tabela propria com expiracao indexada.
- Criar testes de integracao com base de dados efemera.

## Validacoes Executadas

```bash
pnpm run check:api
node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check
pnpm run clippy:api
pnpm run test:api
pnpm run typecheck:web
pnpm run build:web
pnpm audit --audit-level moderate
```

`cargo audit` nao estava instalado neste ambiente; a tentativa falhou com `no such command: audit`.

## Riscos Ainda Conhecidos

- O frontend ainda guarda tokens no `localStorage`; para producao, o ideal e cookie `HttpOnly`/`Secure` emitido pela API.
- A app web ainda usa router manual; a evolucao natural e migrar para Qwik City routes/loaders.
- `AppStore` em memoria com snapshot JSON e adequado para demo/local, mas nao para concorrencia multi-instancia.
