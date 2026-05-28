# Go-Live Checklist (Web + API)

Data de referencia: 2026-05-28

## 1) Pre-deploy local

- [ ] `pnpm install`
- [ ] `pnpm run typecheck:web`
- [ ] `pnpm run build:web`
- [ ] `pnpm run check:api`
- [ ] `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- [ ] `pnpm run clippy:api`
- [ ] `pnpm run test:api`
- [ ] `pnpm run smoke:api`

## 2) Variaveis de ambiente

### Web (Vercel)

- [ ] `VITE_API_BASE_URL=https://<dominio-da-api>`

### API

- [ ] `GESTISAC_API_HOST=0.0.0.0` (ou host pretendido)
- [ ] `GESTISAC_API_PORT=<porta>`
- [ ] `GESTISAC_CORS_ORIGINS=https://<dominio-web>`
- [ ] `GESTISAC_DATA_PATH=<path persistente>`
- [ ] `GESTISAC_DOCUMENT_STORAGE_PATH=<path persistente>`
- [ ] `GESTISAC_DATABASE_URL=<url>` (se aplicavel)

## 3) Deploy

- [ ] Deploy API
- [ ] Deploy Web
- [ ] Limpar cache/CDN se aplicavel

## 4) Validacao apos deploy

- [ ] `GET https://<dominio-web>/` => `200 text/html`
- [ ] `GET https://<dominio-web>/api/health` => JSON da API (nao HTML)
- [ ] `POST https://<dominio-web>/api/auth/login` => `200/401` JSON (nao `405` HTML)
- [ ] Login manual nas 3 apps (`/hq`, `/worker`, `/client`)
- [ ] Navegacao principal sem erros JS no console

## 5) Seguranca minima

- [ ] `Strict-Transport-Security` presente
- [ ] `Content-Security-Policy` presente
- [ ] `X-Frame-Options` presente
- [ ] `X-Content-Type-Options` presente
- [ ] `Referrer-Policy` presente
- [ ] `Permissions-Policy` presente

## 6) Observabilidade

- [ ] Logs de API e web ativos
- [ ] Alertas basicos para `5xx`, latencia alta e falhas de login
- [ ] Procedimento de rollback testado
