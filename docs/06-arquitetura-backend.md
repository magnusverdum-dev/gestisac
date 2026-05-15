# Arquitetura Backend

## Stack

- Rust
- Axum
- PostgreSQL
- SQLx
- Redis
- JWT

## Objetivos

- Baixa latencia.
- Baixo consumo de memoria.
- Contratos claros.
- Multi-tenant desde a base.
- Permissoes fortes.
- Preparacao para eventos, automacoes e integracoes.

## Estrutura Planeada

```text
apps/api/
  src/
    main.rs
    config/
    modules/
      auth/
      tenants/
      condominiums/
      accounting/
      administration/
      reports/
      documents/
      users/
    shared/
      db/
      errors/
      http/
      permissions/
      telemetry/
```

## Multi-tenancy

Todas as entidades operacionais devem pertencer a um tenant ou organizacao. Condominios, utilizadores, roles e documentos devem ser sempre consultados com contexto de tenant.

## Autenticacao E Permissoes

- JWT para autenticacao.
- Roles para acesso de alto nivel.
- Permissoes granulares para acoes sensiveis.
- Auditoria futura para operacoes financeiras e documentos.

## Redis

Usos planeados:

- Cache.
- Sessoes ou invalidacao de tokens.
- Eventos leves.
- Rate limiting.
- Preparacao para filas futuras.

## API

Endpoints devem ser orientados por recurso e por modulo. Erros devem ser consistentes, tipados e legiveis para o frontend.
