# Correcao do erro `Converting circular structure to JSON` e plano de operacao

## Contexto

Durante testes de utilizador, o frontend em modo desenvolvimento (`vite dev`) apresentava erro global:

- `Converting circular structure to JSON`
- stack em `@builder.io/qwik/dist/optimizer.mjs` (`getViteDevIndexHtml`)

Este erro bloqueava a renderizacao da app em dev.

## Causa raiz identificada

Foram encontrados dois problemas distintos:

1. Problema de runtime no pipeline de dev do Qwik/Vite
- O erro circular ocorre dentro do overlay de erro do Qwik em dev, ao serializar uma excecao com referencia circular.
- O stack aponta para codigo interno do `optimizer.mjs`.
- Isto afeta o modo dev, mas nao impede build de producao.

2. Bloqueio de CORS em testes com frontend noutra porta
- Ao servir o frontend em porta alternativa (ex.: `5192`) e API noutra origem, a autenticacao falhava com `Failed to fetch`.
- A API nao devolvia `Access-Control-Allow-Origin` para origens locais fora da lista fixa original.

## Correcao aplicada no projeto

Foi aplicada uma correcao no backend (`apps/api`) para CORS local robusto:

- Ficheiro: `apps/api/src/config/mod.rs`
- Mantem lista explicita configuravel (`GESTISAC_CORS_ORIGINS`)
- Passa a aceitar tambem origens locais (`localhost`, `127.0.0.1`, `::1`) com qualquer porta
- Inclui teste unitario novo:
  - `local_dev_origins_allow_arbitrary_ports`

Com isto, testes reais em portas alternativas passam a funcionar.

## Validacao executada

Backend:

- `pnpm run check:api` ok
- `pnpm run clippy:api` ok
- `pnpm run test:api` ok (82 testes, 0 falhas)

Frontend:

- `pnpm run build:web` ok

Teste de utilizador (end-to-end local):

- Frontend servido em `http://127.0.0.1:5192`
- API em `http://127.0.0.1:3000`
- Login executado e navegacao validada para:
  - `/hq/condominios`
  - `/hq/documentos`
  - `/hq/calendario`
  - `/hq/vistorias`
- Resultado gravado em:
  - `.codex-e2e-logs/ux-test-5192-result.json`

## Como correr de forma estavel agora

### 1) API

```powershell
$env:GESTISAC_API_HOST='127.0.0.1'
$env:GESTISAC_API_PORT='3000'
pnpm run dev:api
```

### 2) Build frontend com API alvo

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:3000'
pnpm run build:web
```

### 3) Servir `apps/web/dist` numa porta alternativa

Pode usar qualquer servidor estatico. Exemplo com Node simples na porta `5192`.

## O que falta para eliminar o problema tambem em `vite dev`

O erro circular em dev e consistente com problema no runtime interno do Qwik/Vite (na versao atual usada no projeto). Para fechar definitivamente:

1. Avaliar upgrade conjunto de:
- `@builder.io/qwik`
- `@builder.io/qwik-city`
- `vite`

2. Validar matriz de compatibilidade oficial (Qwik x Vite x Node) antes de fixar versoes.

3. Opcional: pin de versoes no lockfile para evitar regressao intermitente em dev.

## Decisao operacional recomendada

- Para trabalho funcional e validacao de utilizador: usar fluxo `build + servidor estatico` (estavel).
- Para debug de desenvolvimento: manter investigacao de compatibilidade de versoes ate remover o crash de dev overlay.
