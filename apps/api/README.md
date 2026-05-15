# API

Futuro backend GESTISAC.

## Stack Planeada

- Rust
- Axum
- PostgreSQL
- SQLx
- Redis
- JWT

## Preview Atual

A API principal e Rust/Axum:

```bash
pnpm run dev:api
```

URL:

```text
http://127.0.0.1:3000/health
```

O mock API em Node continua disponivel apenas como fallback:

```bash
pnpm run dev:api:mock
```

Endpoints principais:

```text
GET /health
GET /api/version
GET /api/dashboard
GET /api/condominiums
GET /api/tickets
GET /api/reports
GET /api/documents
GET /api/maintenance
GET /api/suppliers
```

## Responsabilidade

Esta app sera responsavel por autenticacao, multi-tenancy, permissoes, dados operacionais, contabilidade, documentos, relatorios e integracoes futuras.

## Principios

- Modularidade por dominio.
- Validacao e permissoes no servidor.
- Queries sempre com contexto de tenant.
- Estrutura preparada para auditoria e integracoes.
- Baixa latencia e baixo consumo de memoria.
