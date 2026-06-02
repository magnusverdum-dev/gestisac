# Separacao das apps e PostgreSQL real

Este documento regista a fase inicial de implementacao da separacao completa entre HQ, Cliente e Worker.

## Decisao de base de dados

PostgreSQL passa a ser a base canonica recomendada para producao. O modo JSON continua util para demo, seed, import/export e backup temporario, mas nao deve ser a fonte principal quando existirem clientes reais.

Firebase nao fica como base principal porque o dominio e relacional: condominios, fracoes, residentes, quotas, dividas, recibos, pagamentos, fornecedores, documentos, tickets, permissoes e auditoria. Pode ser reavaliado mais tarde para push notifications, analytics ou auth mobile.

## Apps fisicamente separadas

Foram criadas tres apps Qwik independentes:

- `apps/hq-web`: backoffice da empresa.
- `apps/client-web`: portal dos clientes/condominos.
- `apps/worker-web`: PWA dos funcionarios.

A app antiga `apps/web` continua como legacy shell durante a migracao.

Cada nova app tem:

- `package.json` proprio.
- `vite.config.ts` proprio.
- build e preview proprios.
- layout e rotas proprias.
- contexto fixo de app.
- contrato API dedicado.

## Packages partilhados

Foram criados ou ativados os packages:

- `packages/domain-types`: contratos TypeScript partilhados.
- `packages/api-client`: cliente HTTP tipado para namespaces novos.
- `packages/auth`: chaves de sessao, guards e contexto de app.
- `packages/config`: config publica, feature flags e URL da API.
- `packages/ui`: primitivas Qwik partilhadas para apps separadas.

As apps novas nao importam paginas da app legacy.

## Namespaces de API

Foram adicionados endpoints iniciais:

- `GET /api/shared/me`
- `GET /api/hq/dashboard`
- `GET /api/client/dashboard`
- `GET /api/worker/dashboard`
- `GET /api/hq/tickets`
- `GET /api/client/tickets`
- `GET /api/hq/accounting/overview`
- `GET /api/hq/accounting/condominiums/{id}`
- `GET /api/hq/accounting/fractions/{fraction_id}/statement`

Os endpoints legacy continuam ativos para compatibilidade.

## Guardrails por app

HQ:

- Pode ver gestao completa conforme permissoes.
- Contabilidade geral continua sem valores individuais.
- Detalhe financeiro exige contexto autorizado.

Cliente:

- Ve apenas tickets de origem cliente ou associados ao email do requisitante.
- Nao recebe custos internos, fornecedor, notas tecnicas, validacao HQ ou tempo worker.

Worker:

- Ve apenas trabalho atribuido.
- Payloads preparados para PWA e app nativa futura.

## PostgreSQL relacional

A migracao `202606010010_init_relational_core.sql` cria a fundacao relacional:

- identity: tenants, users, roles, sessions.
- condominiums: condominiums, buildings, fractions, residents, suppliers, zones, equipment.
- tickets: tickets, comments, attachments, events.
- accounting: quotas, payments, debts, receipts, expenses, agreements, cash, bank, reconciliation.
- documents: documents, document links.
- maintenance: maintenance, inspections, calendar events.
- audit: audit_log.

Todas as entidades principais incluem `tenant_id` e campos de ciclo de vida como `created_at`, `updated_at` e `deleted_at`.

## Migracao JSON segura

O script `scripts/migrate-json-to-postgres.mjs` faz a primeira etapa segura:

```bash
pnpm run migrate:json-to-postgres
```

Por defeito faz dry-run:

- le `GESTISAC_DATA_PATH` ou `apps/api/data/store.json`.
- cria backup do JSON.
- gera relatorio com contagens e checksums.
- nao escreve na base de dados.

Para gerar um plano SQL revisto manualmente:

```bash
pnpm run migrate:json-to-postgres -- --write-sql
```

Para restaurar um backup:

```bash
node scripts/migrate-json-to-postgres.mjs --restore-backup ".codex-logs/postgres-migration/store.backup.X.json"
```

## Proximas fases tecnicas

1. Substituir gradualmente leituras de `AppStore` por repositories SQL por dominio.
2. Migrar primeiro identity, condominiums e tickets.
3. Migrar accounting apenas depois dos testes anti-fuga e transacoes estarem fechados.
4. Desligar snapshots JSON em producao.
5. Remover `apps/web` quando as tres apps novas tiverem paridade funcional.
