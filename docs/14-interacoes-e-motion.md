# Interacoes E Motion

## Filosofia

O movimento deve fazer a interface sentir-se viva e responsiva. Nao deve parecer uma animacao decorativa nem atrasar tarefas.

## Timing

- Microinteracoes: 120ms a 180ms.
- Transicoes de cards: 180ms a 240ms.
- Drawers e modais: 220ms a 320ms.
- Mudancas de layout: 240ms a 360ms.

## Easing

Usar curvas suaves com saida natural:

- Standard: cubic-bezier(0.2, 0.8, 0.2, 1)
- Enter: cubic-bezier(0.16, 1, 0.3, 1)
- Exit: cubic-bezier(0.7, 0, 0.84, 0)

## Interacoes Base

### Hover

- Elevar ligeiramente.
- Aumentar borda/glow.
- Revelar affordance discreta.
- Nunca mover conteudo suficiente para causar layout shift.

### Focus

- Ring claro e acessivel.
- Estado visivel por teclado.
- Preservar contraste em fundos glass.

### Click

- Feedback imediato.
- Pequena compressao ou reducao de elevacao.
- Loading state quando a acao for assincrona.

### Loading

- Skeletons escuros com brilho suave.
- Indicadores compactos em botoes.
- Evitar spinners grandes no dashboard.

### Alertas

- Entrada suave.
- Cor contextual.
- Badge de prioridade.
- CTA claro.

## Microinteracoes Premium

- Quick action ganha glow no hover.
- Module card revela seta/CTA com movimento curto.
- Badge de conquista pulsa uma vez ao aparecer.
- Progress bar anima apenas quando valor muda.
- Notificacao entra com pequena deslocacao vertical.

## Reducao De Movimento

Respeitar `prefers-reduced-motion`:

- Remover deslocacoes grandes.
- Manter feedback por cor, borda e opacidade.
- Evitar loops animados.

## Anti-padroes

- Animacoes elasticas exageradas.
- Movimento constante no fundo.
- Hover que desloca toda a grelha.
- Delays longos para tarefas frequentes.
- Efeitos tipo jogo infantil.
