# Component Primitives

## Shell

### AppShell

Purpose: cria a camada atmosferica, controla sidebar, topbar, conteudo e overlays.

Required slots:

- sidebar
- topbar
- main
- overlay-root

States:

- desktop
- tablet
- mobile
- navigation-open

### Sidebar

Purpose: navegacao principal elegante e fixa.

Rules:

- Icone e label em desktop.
- Estado ativo com glass highlight.
- Perfil compacto no fundo.
- Mobile usa drawer.

### Topbar

Purpose: orientacao global e acoes persistentes.

Contains:

- GlobalSearch
- ProductivityIndicator
- NotificationsButton
- CondominiumSelector
- UserProfileMenu

## Dashboard

### ModuleCard

Purpose: card principal de modulo.

Required props:

- title
- subtitle
- tone
- metrics
- status
- cta
- visual

Rules:

- Maximo de quatro metricas.
- Um CTA principal.
- Um menu contextual discreto.
- Visual de fundo nao pode competir com texto.

### QuickActionButton

Purpose: acao rapida premium.

Required props:

- icon
- title
- description
- tone
- action

Rules:

- Titulo curto.
- Descricao de uma linha.
- Feedback imediato em hover, focus e click.

### MetricBlock

Purpose: representar um numero com contexto.

Required props:

- value
- label
- trend
- status

Rules:

- Valor sempre mais forte que label.
- Estado nao depende apenas de cor.

## Feedback

### AlertCard

Purpose: comunicar risco, evento ou prioridade.

Required props:

- priority
- title
- detail
- action

Rules:

- Prioridade visivel.
- CTA claro.
- Icone contextual.

### EmptyState

Purpose: orientar quando nao ha dados.

Rules:

- Explicar estado em linguagem simples.
- Oferecer uma acao principal.
- Manter visual premium, sem ilustracoes infantis.
