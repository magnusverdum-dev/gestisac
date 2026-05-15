# Dependencias E Ambiente

Estado verificado em 14 maio 2026 no Windows deste projeto.

## Diagnostico Local

| Ferramenta | Estado | Observacao |
| --- | --- | --- |
| Git | Instalado | Disponivel em `C:\Program Files\Git\cmd\git.exe`. |
| Node.js | Instalado | Versao atual: `v20.10.0`. Funciona, mas deve ser atualizado para LTS recente antes de producao. |
| npm | Instalado | Versao atual: `10.2.3`. |
| pnpm | Instalado | Versao atual: `10.32.1`. O projeto deve usar `pnpm-workspace.yaml`. |
| Rust toolchain | Instalado parcialmente no ambiente | `cargo`, `rustc` e `rustup` existem em `%USERPROFILE%\.cargo\bin`, mas nao aparecem no PATH deste terminal. Fechar/reabrir terminal ou adicionar esse diretorio ao PATH. |
| rustfmt | Instalado | Componente Rust confirmado. |
| clippy | Instalado | Componente Rust confirmado. |
| Visual Studio Build Tools | Instalado | `vcvars64.bat` existe em Visual Studio 2022 BuildTools. `cl` e `link` so aparecem num Developer Prompt ou depois de carregar `vcvars64.bat`. |
| Docker | Nao encontrado | Necessario apenas quando avancarmos para Postgres/MinIO locais. |

## Decisoes De Stack

- Frontend: Qwik, Qwik City, TypeScript, Vite e Tailwind CSS.
- Package manager: pnpm workspace.
- Backend: Rust, Axum, Tokio, Serde, Tower HTTP, UUID, Chrono, Tracing, Thiserror e Anyhow.
- Evitar bibliotecas React-only, Framer Motion, shadcn e bibliotecas pesadas antes de existir necessidade concreta.
- Nao usar `"latest"` em `package.json`; preferir ranges versionados para builds reproduziveis.

## Dependencias Frontend

Obrigatorias para a base atual:

- `@builder.io/qwik`
- `@builder.io/qwik-city`
- `vite`
- `typescript`
- `vite-tsconfig-paths`
- `tailwindcss`
- `postcss`
- `autoprefixer`

Uteis e leves para a UI:

- `lucide-qwik` para iconografia consistente.
- `clsx` para compor classes sem logica manual repetida.

Nao adicionar por agora:

- Framer Motion.
- shadcn/ui.
- bibliotecas React-only.
- bibliotecas de graficos pesadas.
- bibliotecas complexas de forms.

## Dependencias Backend

Obrigatorias para a API Rust base:

- `axum`
- `tokio`
- `tower-http`
- `serde`
- `serde_json`
- `uuid`
- `chrono`
- `tracing`
- `tracing-subscriber`
- `thiserror`
- `anyhow`

Para a proxima fase com base de dados, autenticacao e documentos reais, adicionar apenas quando a implementacao comecar:

- `sqlx` para PostgreSQL.
- `argon2` para password hashing.
- `jsonwebtoken` para JWT.
- `multer` para upload multipart no Axum.
- SDK S3-compatible ou `object_store` para MinIO/AWS S3/Cloudflare R2.
- `validator` se precisarmos de validacao declarativa em DTOs.

## Scripts Oficiais

Na raiz:

```bash
pnpm install
pnpm run dev:web
pnpm run build:web
pnpm run typecheck:web
pnpm run dev:api
pnpm run check:api
pnpm run fmt:api
pnpm run clippy:api
pnpm run test:api
```

Os scripts `pnpm run check:api`, `pnpm run fmt:api`, `pnpm run clippy:api` e `pnpm run test:api` usam `scripts/run-cargo.mjs`, que procura `cargo` no PATH ou em `%USERPROFILE%\.cargo\bin`.

Se for preciso testar manualmente e `cargo` nao for reconhecido, usar temporariamente:

```powershell
& "$env:USERPROFILE\.cargo\bin\cargo.exe" check --manifest-path apps/api/Cargo.toml
```

## Instalacao Recomendada No Windows

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g pnpm
winget install Rustlang.Rustup
rustup component add rustfmt clippy
winget install Microsoft.VisualStudio.2022.BuildTools
```

Durante a instalacao dos Build Tools, ativar:

- Desktop development with C++.
- MSVC v143 build tools.
- Windows 10/11 SDK.
- C++ CMake tools for Windows.

## Validacao Minima Antes De Funcionalidades

```bash
pnpm install
pnpm run build:web
pnpm run typecheck:web
cargo check --manifest-path apps/api/Cargo.toml
cargo fmt --manifest-path apps/api/Cargo.toml
cargo clippy --manifest-path apps/api/Cargo.toml -- -D warnings
cargo test --manifest-path apps/api/Cargo.toml
```

## Nota Sobre Docker

Docker nao esta instalado neste PC. Para a demo simples com API Rust e dados em memoria/JSON, nao e bloqueio. Para a fase de backend real com PostgreSQL e MinIO, passa a ser obrigatorio instalar Docker Desktop ou configurar Postgres/MinIO por outra via.
