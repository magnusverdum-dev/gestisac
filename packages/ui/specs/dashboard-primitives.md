# Dashboard Primitives

## Dashboard Composition API

O dashboard deve ser composto por blocos previsiveis:

```text
DashboardPage
  AppShell
  DashboardTopbar
  DashboardWelcome
  QuickActionGrid
  OperationalModuleGrid
  AlertStrip
```

## OperationalModuleGrid

Desktop:

- 2 colunas.
- 2 linhas.
- Cards com altura consistente.

Tablet:

- 1 ou 2 colunas conforme largura.

Mobile:

- 1 coluna.
- Cards compactos, mantendo metricas essenciais.

## Module Tones

```text
condominiums: blue
accounting: gold-green
administration: purple-blue
reports: gold-orange
```

## Card Anatomy

```text
Header: icon + title + menu
Subtitle: contexto curto
Metrics: 3-4 blocos
Visual: ilustracao/simbolo contextual
Footer: CTA + estado
```

## Priority Rules

- Risco financeiro aparece antes de eventos informativos.
- Alertas urgentes recebem cor rose ou gold.
- Estados positivos nunca devem competir com riscos.
- Modulos com alerta devem sinalizar estado sem quebrar a composicao.

## Data Density

Dashboard:

- 4 quick actions.
- 4 module cards.
- 3 alertas principais.
- 3 a 4 metricas por card.

Pagina de modulo:

- 3 a 5 indicadores.
- 1 area de alerta.
- 1 conjunto de acoes principais.
- Detalhe e tabelas depois.
