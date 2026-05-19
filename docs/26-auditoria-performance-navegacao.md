# Auditoria Performance De Navegacao

Data: 2026-05-18

## Problema Observado

Ao clicar em `Condominios` e noutros menus, a aplicacao podia parecer demorar
mais de 1 segundo a carregar. O problema era mais visivel depois da
simplificacao de UX, porque o primeiro ecra devia ser leve e imediato.

## Causas Encontradas

- `CondominiosPage` carregava automaticamente o detalhe do primeiro condominio
  ao entrar na pagina, mesmo quando o utilizador ainda so via os quatro cartoes
  principais.
- Ficou um render antigo e pesado dentro do componente `CondominiosPage` depois
  da simplificacao. Apesar de estar inacessivel no fluxo visual, continuava a
  aumentar o trabalho de compilacao e o peso do modulo.
- A navegacao global fazia `scrollTo` com comportamento `smooth`, criando uma
  sensacao de atraso quando se mudava de pagina.

## Correcoes Aplicadas

- O detalhe do condominio passou a ser carregado apenas quando o utilizador abre
  uma ficha ou entra numa area que precisa desse detalhe.
- O render antigo da pagina de Condominios foi removido.
- A navegacao global passou a usar scroll imediato, evitando atraso visual.
- Foram removidos calculos e sinais que ja nao eram usados no primeiro ecra de
  Condominios.

## Resultado Medido

Medi na build estatica local em `http://127.0.0.1:4183`:

- Dashboard: cerca de 270ms.
- Condominios: cerca de 257ms.
- Documentos: cerca de 291ms.
- Tickets: cerca de 265ms.

## Checks

- `pnpm run typecheck:web`
- `pnpm run build:web`

Ambos passaram.
