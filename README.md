# GESTISAC

Plataforma SaaS premium para gestao de condominios, pensada como um command center moderno, visual e intuitivo.

## Visao

O GESTISAC deve substituir fluxos fragmentados em Excel, WhatsApp, chamadas, PDFs, emails e papel por uma experiencia unificada, elegante e simples. A plataforma deve sentir-se como um cockpit fintech de luxo: escura, clara na hierarquia, rapida, confiavel e preparada para escalar.

## Principios

- Dashboard primeiro: a experiencia nasce num painel central emocional e operacional.
- Simplicidade acima de densidade: resumo visual antes de tabelas e detalhe.
- Premium sem ruido: glassmorphism subtil, profundidade, brilho controlado e grande legibilidade.
- Modularidade real: cada area do produto deve poder evoluir sem contaminar o resto.
- Performance por defeito: Qwik no frontend, Rust no backend e arquitetura preparada para multi-tenant SaaS.

## Areas Principais

1. Condominios
2. Contabilidade
3. Administracao
4. Relatorios

Estas quatro areas devem aparecer no dashboard como grandes cartoes glassmorphism com metricas, alertas, acoes rapidas e identidade visual premium, sem mecanicas de jogo.

## Estrutura

```text
apps/
  web/        # Futuro frontend Qwik City
  api/        # Futuro backend Rust Axum
docs/         # Produto, UX, arquitetura e standards
mock/         # Dados ficticios, personas e estados de dashboard
packages/
  ui/         # Sistema UI partilhado
  config/     # Configuracoes partilhadas
  types/      # Tipos e contratos partilhados
```

## Fase Atual

O projeto ja tem uma demo visual local e entrou na fase de estabilizacao de ambiente, dependencias, scripts e backend Rust. Antes de adicionar novas funcionalidades, os builds e checks devem estar limpos.

## Preview Local

Instalar dependencias:

```bash
pnpm install
```

Arrancar web + API Rust:

```bash
pnpm run dev
```

URLs:

- Web: `http://127.0.0.1:5173`
- API Health: `http://127.0.0.1:3000/health`
- Dashboard API: `http://127.0.0.1:3000/api/dashboard`

Comandos principais:

```bash
pnpm run build:web
pnpm run typecheck:web
pnpm run check:api
pnpm run fmt:api
pnpm run clippy:api
pnpm run test:api
pnpm run smoke:api
```

Nota: o backend Rust/Axum esta estruturado em `apps/api`. O `mock-server.mjs` continua disponivel como fallback rapido em `pnpm run dev:api:mock`.

Login local inicial:

```text
Email: admin@gestisac.pt
Password: configurar localmente ou pedir a credencial ao responsavel
```

Os dados funcionais desta fase ficam persistidos em `apps/api/data/store.json`, gerado automaticamente no primeiro arranque da API Rust. As passwords sao guardadas com Argon2 e as sessoes usam access token curto com refresh token persistido.

## Deploy Online

O caminho recomendado para producao sem servidor proprio e usar Supabase PostgreSQL, API Rust num host gerido e frontend num host gerido.

- `docs/32-managed-cloud-deployment.md`
- `docs/33-operacao-deploy-e-clones.md`
- `docs/29-go-live-checklist.md`
- `.env.production.example`

## Fase Visual

A arquitetura visual esta documentada em:

- `docs/11-arquitetura-visual.md`
- `docs/12-composicao-dashboard.md`
- `docs/13-sistema-glassmorphism.md`
- `docs/14-interacoes-e-motion.md`
- `docs/15-responsive-e-shell.md`
- `docs/16-componentes-ui.md`
- `docs/17-dashboard-psychology.md`

## Ambiente

A lista de dependencias, estado local verificado e comandos de instalacao estao em:

- `docs/18-dependencias-e-ambiente.md`

## Standards Rust

As boas praticas para desenvolvimento Rust no backend estao em:

- `docs/19-rust-best-practices.md`
- `RUST_BEST_PRACTICES_PROMPT.md`
- `AGENTS.md`

## Standards Qwik

As boas praticas para desenvolvimento Qwik no frontend estao em:

- `docs/20-qwik-best-practices.md`
- `QWIK_BEST_PRACTICES_PROMPT.md`
- `AGENTS.md`

O pacote `packages/ui` contem tokens e specs para transformar esta direcao num sistema reutilizavel quando a implementacao comecar.
