# @gestisac/client-web — Esqueleto para separação futura

> **Nota:** Esta pasta é um resíduo histórico. A aplicação consolidada está em `apps/web`.

## Estado actual

Esta é uma aplicação Qwik City completa que foi construída como prova de conceito para uma separação futura dos contextos HQ, Worker e Client em apps independentes.

A decisão estratégica actual é **manter tudo consolidado em `apps/web`** com as rotas:
- `/hq/*` — Administração e gestão
- `/worker/*` — Operacional e campo
- `/client/*` — Portal do cliente

## Rota para separação futura

Se no futuro a carga ou a arquitectura justificar a separação:

1. Cada app (`hq-web`, `worker-web`, `client-web`) precisa de um `vercel.json` com as rewrites e headers adequados
2. Cada app precisa de um projecto Vercel separado com o seu próprio `VITE_API_BASE_URL`
3. A variável `GESTISAC_CORS_ORIGINS` na API precisa de incluir os novos domínios
4. O roteamento Qwik City com `[...path]` já está preparado para funcionar como SPA

## Desenvolvimento local

```bash
pnpm run dev:client     # http://127.0.0.1:5175
pnpm run build:client
pnpm run typecheck:client
```

## O que está aqui

- `src/app.tsx` — Componente principal com `PortalFrame` que demonstra o dashboard Client
- `src/routes/` — Roteamento Qwik City com catch-all `[...path]`
- `adapters/static/` — Static adapter para build de produção
