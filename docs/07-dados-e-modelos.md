# Dados E Modelos

## Entidades Iniciais

- Tenant
- User
- Role
- Permission
- Condominium
- Building
- Fraction
- Resident
- Supplier
- Ticket
- MaintenanceTask
- InsurancePolicy
- Payment
- Debt
- Receipt
- Expense
- ReserveFund
- Document
- Assembly
- Report
- Notification

## Relacoes Principais

- Tenant tem muitos utilizadores e condominios.
- Condominio tem edificios, fracoes, moradores, documentos e assembleias.
- Fracao pode ter proprietarios, moradores, quotas, dividas e recibos.
- Administracao liga tickets, manutencoes, fornecedores e seguros.
- Contabilidade agrega pagamentos, despesas, dividas e fundo de reserva.

## Regras

- Dados financeiros precisam de rastreabilidade.
- Documentos devem ter origem, tipo, estado e relacao com condominio.
- Notificacoes devem ter prioridade, estado de leitura e destino.
- Relatorios devem guardar periodo, origem dos dados e formato de exportacao.

## Mock Data

O diretorio `mock/` deve conter dados ficticios para:

- Dashboard principal.
- Condominios.
- Utilizadores e roles.
- Alertas.
- Estados financeiros.
- Tickets e manutencoes.

Os mocks devem orientar a experiencia visual antes da API existir.
