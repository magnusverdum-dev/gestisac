# Responsive E Shell

## Objetivo

A plataforma deve preservar a sensacao premium em desktop, tablet e mobile. O layout muda, mas a identidade visual nao desaparece.

## Breakpoints Planeados

```text
mobile:  0 - 639px
tablet:  640 - 1023px
desktop: 1024 - 1439px
wide:    1440px+
```

## Desktop

Comportamento:

- Sidebar fixa com largura confortavel.
- Topbar persistente.
- Dashboard com grid 2x2 para os quatro cards.
- Alertas em faixa horizontal.
- Conteudo com largura maxima para manter composicao premium.

## Wide

Comportamento:

- Aumentar respiro lateral.
- Preservar densidade controlada.
- Permitir cards mais cinematograficos.
- Nao esticar texto indefinidamente.

## Tablet

Comportamento:

- Sidebar pode ficar compacta ou em rail.
- Quick actions em 2 colunas.
- Cards operacionais em 1 ou 2 colunas conforme largura.
- Topbar reduz elementos secundarios.

## Mobile

Comportamento:

- Navegacao vira drawer ou bottom action area.
- Topbar simplificada.
- Saudacao curta.
- Quick actions compactas.
- Cards empilhados.
- Alertas em lista vertical.
- Tabelas substituidas por cards responsivos sempre que possivel.

## Shell

### AppShell

Responsavel por:

- Fundo atmosferico.
- Sidebar.
- Topbar.
- Area principal.
- Camada de overlays.
- Responsividade global.

### Sidebar

Desktop:

- Fixa.
- Logo no topo.
- Navegacao icon + label.
- Perfil compacto no fundo.

Mobile:

- Drawer com overlay.
- Fecho claro.
- Alvos de toque grandes.

### Topbar

Desktop:

- Pesquisa larga.
- Notificacoes.
- Condominio ativo.
- Perfil.

Mobile:

- Pesquisa por icone.
- Condominio ativo abre seletor.
- Perfil em menu compacto.

## Regras

- Nenhum texto deve colidir com icones ou metricas.
- Cards devem ter dimensoes estaveis por breakpoint.
- Scroll vertical deve ser previsivel.
- Elementos fixos nao podem cobrir CTAs ou alertas.
