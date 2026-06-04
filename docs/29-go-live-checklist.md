# Go-Live Checklist (Web + API + Supabase)

Data de referencia: 2026-06-03

## 1) Pre-deploy local

- [ ] `pnpm install`
- [ ] `pnpm run typecheck:web`
- [ ] `pnpm run build:web`
- [ ] `pnpm run check:api`
- [ ] `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- [ ] `pnpm run clippy:api`
- [ ] `pnpm run test:api`
- [ ] `pnpm run smoke:api`
- [ ] `pnpm run check:prod-env -- --target api` com variaveis reais de producao carregadas

## 2) Base de dados gerida

### Supabase PostgreSQL

- [ ] Projeto Supabase criado
- [ ] Regiao escolhida
- [ ] Password forte definida
- [ ] Connection string Postgres copiada
- [ ] Connection string pooled escolhida se a API correr em serverless
- [ ] Backups confirmados conforme plano

## 3) Variaveis de ambiente

### Web

- [ ] `VITE_API_BASE_URL=https://<dominio-da-api>`
- [ ] Nao existe `localhost` nem `127.0.0.1` em variaveis de producao

### API

- [ ] `GESTISAC_ENV=production`
- [ ] `GESTISAC_CORS_ORIGINS=https://<dominio-web>`
- [ ] `GESTISAC_DATABASE_URL=<url-supabase-postgres>`
- [ ] `JWT_SECRET=<segredo-forte>`
- [ ] `GESTISAC_ALLOW_DEMO_SEED=false`
- [ ] `GESTISAC_RUN_MIGRATIONS=false` no fluxo normal de producao
- [ ] `GESTISAC_SYNC_ON_STARTUP=false` no fluxo normal de producao
- [ ] `GESTISAC_DOCUMENT_STORAGE_PATH=<path persistente>` ou decisao tomada para storage cloud

## 4) Deploy

- [ ] Migrations aplicadas no Supabase
- [ ] Dados iniciais importados
- [ ] Primeiro admin validado/criado
- [ ] Deploy API
- [ ] Deploy Web
- [ ] Limpar cache/CDN se aplicavel

## 5) Validacao apos deploy

- [ ] `GET https://<dominio-web>/` => `200 text/html`
- [ ] `GET https://<dominio-da-api>/api/health` => JSON da API
- [ ] `POST https://<dominio-da-api>/api/auth/login` => `200/401` JSON
- [ ] `GESTISAC_API_URL=https://<dominio-da-api> pnpm run smoke:api`
- [ ] Login manual nas 3 apps (`/hq`, `/worker`, `/client`)
- [ ] Navegacao principal sem erros JS no console

## 6) Seguranca minima

- [ ] `Strict-Transport-Security` presente
- [ ] `Content-Security-Policy` presente
- [ ] `X-Frame-Options` presente
- [ ] `X-Content-Type-Options` presente
- [ ] `Referrer-Policy` presente
- [ ] `Permissions-Policy` presente

## 7) Observabilidade

- [ ] Logs de API e web ativos
- [ ] Alertas basicos para `5xx`, latencia alta e falhas de login
- [ ] Procedimento de rollback testado
