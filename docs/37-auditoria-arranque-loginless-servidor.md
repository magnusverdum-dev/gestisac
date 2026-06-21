# Auditoria: Arranque Loginless e Servidor

Data: 2026-06-21

## Problema

O utilizador conseguia abrir a Web publicada, mas a app ficava demasiado tempo no ecra de entrada ou voltava ao login ao abrir rotas como `/hq/tickets`, `/hq/tarefas` e equivalentes de Worker/Client.

Isto criou o falso diagnostico de "o browser nao abre" ou "o servidor nao inicia", quando o problema real estava entre arranque da API, sessao browser-session, storage da sessao e bloqueio da renderizacao inicial.

## Causas Raiz Confirmadas

1. A sessao loginless era guardada no browser, mas algumas rotas publicadas dependiam de cookie para SSR/SSG. Em reload direto, a pagina podia renderizar login antes da app consolidada retomar a sessao.
2. A shell da app esperava por demasiadas chamadas de dados antes de aparecer. Endpoints lentos ou abortados deixavam o utilizador preso no ecra de login/progresso.
3. Existia retry automatico repetitivo de `browser-session`, criando comportamento de loop em vez de falha recuperavel.
4. A build Web de producao dependia de `VITE_API_BASE_URL`; quando esta env vinha vazia ou mal configurada, a Web publicada nao conseguia falar corretamente com a API.

## Correcoes Aplicadas

- A escrita de `gestisac.sessionToken` sincroniza `localStorage` e cookie para que rotas publicadas, reloads e navegacao direta mantenham a sessao.
- A app marca a sessao como pronta assim que existe token valido e mostra a shell antes de terminar todas as cargas de dados.
- As cargas de dados iniciais usam batching e timeouts curtos para modulos nao criticos.
- O retry por `setInterval` foi removido; falhas recuperaveis param e deixam o utilizador repetir manualmente.
- O build Web valida que `VITE_API_BASE_URL` existe, usa HTTPS e nao aponta para localhost.
- O deploy validado passa a exigir browser smoke publicado e screenshots.

## Invariantes Obrigatorios

- Nunca dizer "passou", "funcional", "pronto" ou equivalente sobre deploy sem `pnpm run test:e2e:prod:headed` ou `pnpm run deploy:prod:verify` com screenshots.
- Loginless em dev/producao-smoke usa `browser-session`; nao escrever email/password manualmente por defeito.
- `browser-session`, warmup da API, storage/cookie da sessao, app switching e `VITE_API_BASE_URL` sao infraestrutura critica. Nao alterar em tarefas visuais ou de menus.
- A shell deve aparecer logo que ha token valido; dados lentos devem degradar dentro da app, nao prender o utilizador no login.
- Rotas diretas publicadas como `/hq/tickets`, `/worker/tarefas` e `/client/documentos` devem sobreviver a reload.
- A Web de producao nunca pode ser buildada com `VITE_API_BASE_URL` vazio, localhost ou HTTP.

## Comandos De Prova

Validacao local:

```bash
pnpm run guard:loginless-dev
pnpm run guard:deploy-contract
pnpm run typecheck:web
pnpm run test:e2e
```

Validacao publicada:

```bash
pnpm run check:prod-readiness
pnpm run test:e2e:prod
pnpm run test:e2e:prod:headed
```

Deploy com prova completa:

```bash
pnpm run deploy:prod:verify
```

## Evidencia Da Correcao

Na validacao de 2026-06-21:

- `pnpm run test:e2e` passou 14/14 localmente.
- `pnpm run check:prod-readiness` passou contra `https://gestisac-api.vercel.app` e `https://gestisac-web.vercel.app`.
- `pnpm run test:e2e:prod` passou 14/14 contra a Web publicada.
- `pnpm run test:e2e:prod:headed` passou 14/14 em Chromium visivel.
- Screenshots de HQ, Worker e Client foram gerados em `.scrutator-screenshots/`.

## Como Diagnosticar Se Voltar

1. Confirmar API:

```bash
pnpm run check:prod-readiness
```

2. Confirmar entrada publicada:

```bash
pnpm run test:e2e:prod:headed
```

3. Se o browser fica em login:

- verificar se `VITE_API_BASE_URL` foi puxado corretamente para o build Web;
- verificar se `gestisac.sessionToken` existe em cookie e storage;
- abrir uma rota direta depois de entrar, por exemplo `/hq/tickets`;
- verificar se `main.app-shell` aparece antes de terminar todas as chamadas de dados.

4. Se a API esta lenta:

- validar `/api/warmup`;
- validar `/api/auth/browser-session?appContext=hq&mode=json`;
- identificar endpoints que bloqueiam a shell e mover para carga degradada.

