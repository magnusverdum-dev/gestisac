# Componentes UI

## Objetivo

Definir primitivas reutilizaveis para criar uma experiencia premium consistente em toda a plataforma.

## Shell

- AppShell: base visual, fundo, sidebar, topbar e overlays.
- Sidebar: navegacao principal, perfil, estado ativo.
- Topbar: pesquisa, notificacoes, seletor de condominio e perfil.
- MobileNavigation: drawer ou padrao compacto para mobile.

## Dashboard

- DashboardHeader: saudacao, contexto e resumo.
- QuickActionButton: acao com icone, titulo e microcopy.
- ModuleCard: card principal com metricas, estado, CTA e visual identitario.
- MetricBlock: metrica compacta com label, valor e estado.
- AlertStrip: faixa de alertas importantes.
- UrgentNotice: aviso operacional prioritario.
- OperationsSummary: estado do dia com riscos, prazos e atividade.

## Superficies

- GlassPanel: painel base.
- HeroGlassCard: card principal com profundidade maior.
- FloatingPanel: overlay, modal ou drawer.
- DataPanel: secao de detalhe ou tabela.

## Feedback

- Badge: estado ou categoria.
- StatusPill: estado operacional.
- PriorityBadge: urgencia.
- Toast: feedback temporario.
- EmptyState: estado vazio com acao clara.
- Skeleton: loading premium.

## Dados E Gestao

- ResponsiveTable: tabela apenas para detalhe.
- EntityCard: alternativa mobile para tabelas.
- FilterBar: filtros compactos.
- SearchInput: pesquisa com atalho.
- ChartPanel: graficos e analytics.
- UploadDropzone: upload de documentos.

## Modulos

- CondominiumCard
- FractionCard
- ResidentCard
- SupplierCard
- TicketCard
- MaintenanceCard
- ReportCard
- DocumentCard
- AssemblyCard

## Regras De Composicao

- Cards principais: 3 a 4 metricas no maximo.
- Quick actions: titulo curto e microcopy de uma linha.
- Badges: usar pouco e com significado real.
- Icones: sempre consistentes em tamanho e peso.
- CTAs: um principal por card.
- Tabelas: depois de resumo, filtros e indicadores.

## Estados Obrigatorios

Todo componente importante deve prever:

- Default.
- Hover.
- Focus.
- Active.
- Loading.
- Empty.
- Error.
- Disabled quando aplicavel.
