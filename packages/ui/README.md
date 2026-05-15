# UI Package

Pacote planeado para componentes e tokens reutilizaveis.

## Conteudo Futuro

- Design tokens.
- Componentes base.
- Primitivas de layout.
- Badges, cards, metric blocks e alertas.
- Avisos operacionais e estados de prioridade.

## Estrutura Atual

```text
tokens/
  gestisac.design-tokens.json
specs/
  component-primitives.md
  dashboard-primitives.md
  glass-surfaces.md
  interaction-states.md
  responsive-rules.md
patterns/
  module-card-anatomy.md
```

## Regra

Este pacote deve conter UI generica. Componentes com logica especifica de condominios, contabilidade ou administracao devem ficar nas features da app web.
