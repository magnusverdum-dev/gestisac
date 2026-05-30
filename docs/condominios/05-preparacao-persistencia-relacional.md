# Preparacao Persistencia Relacional (JSON -> PostgreSQL)

## Objetivo

Preparar a migracao da persistencia de condominios para PostgreSQL sem quebrar o fluxo atual.

## Estado Atual

- A aplicacao continua funcional com store JSON.
- O backend ja usa Rust com estrutura modular, o que facilita separar repositorio JSON e repositorio SQL.

## Preparacao Definida

1. Criar interface unica de repositorio (`CondominiumRepository`) para isolar o acesso a dados.
2. Implementar duas estrategias:
   - `JsonCondominiumRepository` (atual, default)
   - `PgCondominiumRepository` (novo, ativado por configuracao)
3. Introduzir flag de ambiente:
   - `CONDOMINIUMS_REPOSITORY=json|postgres`
4. Migrar endpoints de leitura primeiro (lista, detalhe), depois escrita (create/update/sub-recursos), por fases.
5. Ativar dual-write opcional temporario em ambiente de staging para validar consistencia.
6. Fechar com cutover para Postgres + testes de regressao.

## Beneficio

- Menos risco de regressao.
- Rollback simples para JSON se necessario.
- Caminho claro para concorrencia real, indices e relatorios mais fortes.
