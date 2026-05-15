# UX E Navegacao

## Filosofia

A interface deve reduzir carga cognitiva. O utilizador nao deve sentir que esta a operar software complexo, mas sim que esta a navegar num cockpit claro.

## Regras De UX

- Resumo antes de detalhe.
- Acoes principais sempre visiveis.
- Linguagem simples e direta.
- Estados importantes destacados visualmente.
- Tabelas apenas apos cards, filtros e indicadores.
- Mobile com alvos de toque grandes e hierarquia preservada.

## Arquitetura De Pagina

Cada modulo deve seguir esta ordem:

1. Cabecalho com contexto.
2. Indicadores rapidos.
3. Alertas ou prioridades.
4. Acoes principais.
5. Blocos visuais de gestao.
6. Tabelas e detalhe operacional.

## Rotas Planeadas

```text
/
/dashboard
/condominiums
/condominiums/:id
/accounting
/accounting/payments
/accounting/debts
/accounting/receipts
/accounting/expenses
/administration
/administration/tickets
/administration/maintenance
/administration/suppliers
/reports
/assemblies
/documents
/settings
/settings/users
/settings/permissions
```

## Mobile

No mobile:

- Sidebar passa a navegacao compacta.
- Cartoes principais empilham verticalmente.
- Acoes rapidas mantem toque confortavel.
- Topbar simplifica pesquisa e perfil.
- Alertas aparecem em formato de lista curta.

## Acessibilidade

- Contraste forte em texto.
- Estados nao dependem apenas de cor.
- Fontes legiveis e tamanhos confortaveis.
- Foco de teclado visivel.
- Interacoes previsiveis para utilizadores mais velhos.
