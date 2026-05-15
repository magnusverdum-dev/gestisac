# Sistema Glassmorphism

## Objetivo

O glassmorphism do GESTISAC e uma arquitetura de superficie, nao um efeito decorativo. Deve criar profundidade, foco e sensacao premium sem prejudicar legibilidade.

## Niveis De Glass

### Glass 1: Shell

Uso: sidebar, topbar, paineis persistentes.

- Fundo: navy translucido forte.
- Blur: baixo a medio.
- Borda: subtil.
- Sombra: baixa.
- Legibilidade: maxima.

### Glass 2: Panel

Uso: grupos de conteudo, faixas de alertas, cards secundarios.

- Fundo: translucido medio.
- Blur: medio.
- Borda: clara mas discreta.
- Sombra: media.
- Glow: apenas quando ha estado ou foco.

### Glass 3: Hero Card

Uso: quatro cards principais do dashboard.

- Fundo: gradiente escuro do modulo.
- Blur: medio.
- Borda: colorida subtil.
- Sombra: profunda.
- Glow: contextual ao modulo.
- Iluminacao interna: permitida.

### Glass 4: Floating Overlay

Uso: modais, command palette, drawers e menus importantes.

- Fundo: mais opaco.
- Blur: alto.
- Borda: destacada.
- Sombra: elevada.
- Backdrop: escurecido para foco.

## Regras De Readabilidade

- Texto principal nunca deve ficar sobre area de transparencia instavel sem overlay.
- Blur deve ser reduzido em listas densas.
- Metricas precisam de contraste forte.
- Bordas claras devem separar camadas sem parecer linhas brancas duras.
- Em dispositivos com baixa performance, reduzir blur e manter opacidade.

## Reflexos E Luz

Usar reflexos apenas para reforcar a sensacao fisica:

- Pequeno highlight no topo dos cards.
- Radial glow atras de cards principais.
- Brilho contextual perto de icones e badges.
- Nunca usar reflexos sobre texto pequeno.

## Performance

- Limitar backdrop blur a superficies grandes e persistentes.
- Evitar blur em muitos cards pequenos simultaneos.
- Usar gradientes e sombras CSS previsiveis.
- Ter fallback com fundo opaco quando `backdrop-filter` nao estiver disponivel.

## Estados

- Hover: borda mais luminosa, elevacao ligeira, glow controlado.
- Focus: ring visivel e premium, nunca apenas mudanca de cor.
- Active: card parece pressionado com menor elevacao.
- Disabled: opacidade reduzida, sem glow.
- Loading: shimmer discreto ou skeleton escuro.
