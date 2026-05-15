# Qwik Best Practices Para O Frontend GESTISAC

Este documento define o standard Qwik para `apps/web`. Deve ser usado sempre que forem criadas paginas, componentes, loaders, actions, formularios, endpoints ou integracoes frontend.

## Regras Base

- Qwik nao e React com outro nome; otimizar para resumability e pouco JavaScript inicial.
- Usar `component$()` para componentes.
- Usar eventos com `$`, como `onClick$`, `onInput$` e `onSubmit$`.
- Usar `class`, nao `className`.
- Evitar `useVisibleTask$()` por defeito; usar apenas quando o browser for mesmo necessario.
- Preferir `routeLoader$()` para dados iniciais e `routeAction$()` para mutacoes quando a app estiver em Qwik City completo.
- Manter componentes pequenos, acessiveis e focados.
- Evitar bibliotecas React-only e dependencias que executem `window` ou `document` no import.

## Estado Atual Do Projeto

A app atual usa Qwik com Vite e um routing demo em `src/app.tsx`. Isto foi aceitavel para previsualizacao, mas nao deve ser o destino final.

Direcao para a fase funcional:

- Migrar para Qwik City real com `src/routes/`.
- Usar layouts persistentes para o shell.
- Usar `routeLoader$()` para dados necessarios ao render inicial.
- Usar `routeAction$()` ou endpoints para formularios e mutacoes.
- Evitar manter routing manual com `window.history` quando Qwik City puder resolver.

## Organizacao Recomendada

```text
apps/web/src/
  components/
    dashboard/
    forms/
    layout/
    ui/
  routes/
    index.tsx
    layout.tsx
    login/
      index.tsx
    condominios/
      index.tsx
    tickets/
      index.tsx
  services/
    api/
    auth/
  styles/
  types/
  utils/
```

Responsabilidades:

- `routes/`: paginas, layouts, loaders, actions e endpoints Qwik City.
- `components/`: UI reutilizavel sem dependencias fortes de rota.
- `services/api`: clientes API, parsing e contratos externos.
- `services/auth`: sessao, login/logout e guards.
- `types/`: tipos partilhados no frontend.
- `utils/`: funcoes puras pequenas.

## Data Loading

- Dados de render inicial devem vir de `routeLoader$()` sempre que possivel.
- Dados sensiveis ou dependentes de segredo devem ficar no servidor.
- Evitar fetch no browser para informacao que pode ser renderizada no servidor.
- Tratar erros de API com estados claros de erro, vazio e loading.
- Tipar respostas da API e validar dados externos quando houver risco.

## Formularios E Mutacoes

- Usar `routeAction$()` e `<Form>` para progressive enhancement quando a rota estiver em Qwik City.
- Validar no servidor; validacao no cliente e apenas ajuda de UX.
- Formularios devem ter labels, mensagens de erro e botoes com estados claros.
- Mutações devem retornar mensagens simples e acionaveis.
- Nunca confiar em permissao ou tenant enviados apenas pelo cliente.

## Estado Reativo

- Usar `useSignal()` para valores simples.
- Usar `useStore()` para objetos ou formularios.
- Usar `useComputed$()` para valores derivados.
- Usar `useTask$()` para reagir a mudancas de estado quando adequado.
- Evitar estado global sem necessidade.
- Ler signals apenas nos componentes que precisam deles.

## Performance

Prioridade:

1. Menor JavaScript inicial.
2. HTML util rapidamente.
3. Execucao sob demanda.
4. Componentes divididos por responsabilidade.

Regras:

- Evitar logica pesada no corpo do componente.
- Evitar imports pesados no caminho inicial.
- Isolar bibliotecas browser-only e carregar sob demanda.
- Evitar `useVisibleTask$()` para tarefas que podem ser loaders, actions ou eventos.
- Medir antes de fazer micro-otimizacoes.

## Acessibilidade

- Usar HTML semantico.
- Usar `button` para acoes e `a` para navegacao.
- Associar `label` a inputs.
- Manter navegacao por teclado.
- Garantir contraste adequado no tema escuro.
- Nao remover focus outline sem alternativa visivel.
- Usar `aria-*` apenas quando necessario.

## SEO

- Paginas publicas devem definir `head` com title e description.
- Paginas partilhaveis devem incluir Open Graph.
- `head` pode ser dinamico quando depende de dados de `routeLoader$()`.
- Paginas autenticadas tambem devem ter titles uteis para orientacao do utilizador.

## TypeScript

- Evitar `any`.
- Tipar props publicas.
- Tipar respostas da API.
- Nao assumir que dados externos estao corretos.
- Usar nomes especificos para tipos de dominio, como `CondominiumSummary` ou `CreateTicketInput`.

## Seguranca

- Nunca expor tokens secretos no cliente.
- Nao guardar segredos em variaveis publicas.
- Evitar `dangerouslySetInnerHTML`.
- Sanitizar conteudo vindo de utilizadores quando necessario.
- Proteger endpoints no backend; esconder botoes no frontend nao e seguranca.
- Tratar erros sem expor stack traces ou detalhes internos.

## Dependencias

Antes de adicionar dependencia:

- Confirmar compatibilidade SSR.
- Confirmar que nao usa `window` ou `document` no import.
- Avaliar impacto no bundle.
- Preferir alternativas leves.
- Evitar React-only.
- Preferir carregamento dinamico se so for usada em interacao rara.

Dependencias aceitaveis na base atual:

- `@builder.io/qwik`.
- `@builder.io/qwik-city`.
- `vite`.
- `typescript`.
- `vite-tsconfig-paths`.
- `tailwindcss`, `postcss`, `autoprefixer`.
- `lucide-qwik` para iconografia.
- `clsx` para composicao de classes.

## Checklist Antes De Entregar Qwik

Executar:

```bash
pnpm run typecheck:web
pnpm run build:web
```

Confirmar:

- Componentes usam `component$()`.
- Eventos usam sufixo `$`.
- `className` nao foi introduzido.
- `useVisibleTask$()` foi evitado ou justificado.
- Nao ha acesso desnecessario a `window` ou `document`.
- Dados iniciais usam loader quando a rota ja estiver em Qwik City.
- Mutacoes usam action ou endpoint adequado.
- Formulario e acessivel.
- Estados de loading, erro e vazio existem quando aplicavel.
- Nao ha `any` desnecessario.
- Dependencias novas foram justificadas.

## Revisao De Codigo Qwik

Ao rever Qwik neste projeto, classificar achados como:

- Critico: pode quebrar producao, seguranca ou comportamento essencial.
- Importante: prejudica performance, manutencao ou arquitetura.
- Sugestao: melhoria de estilo, clareza ou ergonomia.

Procurar especialmente:

- Uso excessivo de `useVisibleTask$()`.
- Fetch no cliente que deveria ser loader.
- Estado global desnecessario.
- Componentes grandes demais.
- Imports pesados no caminho inicial.
- Falta de SEO em paginas importantes.
- Falta de acessibilidade em forms/botoes/nav.
- Uso de `className`.
- Event handlers sem `$`.
- Dependencias incompatveis com SSR.
