# Design System

## Direcao

O design system do GESTISAC deve unir elegancia institucional com sensacao futurista. A estetica deve ser premium, mas sempre legivel.

## Paleta Inicial

```text
Navy 950     #030712
Navy 900     #061126
Navy 800     #0A1A36
Blue 500     #2F7DF6
Blue 400     #4BA3FF
Gold 500     #D9A441
Gold 300     #F4D27A
Green 500    #22C55E
Purple 500   #7C3AED
Orange 500   #F59E0B
White Soft   #F8FAFC
Text Muted   #9CA3AF
Border Glass rgba(255,255,255,0.12)
```

## Superficies

- Fundo base: navy profundo com iluminacao radial subtil.
- Cards: glassmorphism com borda clara e blur controlado.
- Modais: glass escuro com foco forte no conteudo.
- Alertas: cor contextual com brilho discreto.

## Componentes Base

- AppShell
- Sidebar
- Topbar
- GlobalSearch
- CondominiumSelector
- QuickActionButton
- ModuleCard
- MetricBlock
- AlertCard
- Badge
- ProgressRing
- XpProgress
- AchievementBadge
- DataPanel
- EmptyState

As regras detalhadas de componentes, glassmorphism, motion e responsividade vivem nos documentos da fase visual:

- `docs/11-arquitetura-visual.md`
- `docs/12-composicao-dashboard.md`
- `docs/13-sistema-glassmorphism.md`
- `docs/14-interacoes-e-motion.md`
- `docs/15-responsive-e-shell.md`
- `docs/16-componentes-ui.md`
- `docs/17-dashboard-psychology.md`

## Tipografia

- Fonte recomendada: Inter ou equivalente moderna.
- Titulos grandes apenas no dashboard e headers de modulo.
- Componentes compactos usam texto menor e sem excesso visual.
- Letter spacing normal.

## Movimento

Usar transicoes suaves para:

- Hover de cards.
- Entrada de paineis.
- Mudanca de estado.
- Progressos e badges.

Evitar animacoes longas, distrativas ou com estetica gaming exagerada.

## Anti-padroes

- UI cinzenta corporate.
- Tabelas como primeira vista.
- Gradientes saturados.
- Neon agressivo.
- Cards aninhados sem necessidade.
- Excesso de badges.
- Texto explicativo visivel a ensinar a usar a app.
