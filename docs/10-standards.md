# Standards

## Linguagem

- Documentacao e copy de produto: Portugues PT.
- Codigo, pastas, pacotes e identificadores: English.

## Naming

- Componentes: PascalCase.
- Funcoes e variaveis: camelCase.
- Ficheiros frontend: kebab-case ou convencao do framework.
- Modulos backend: snake_case.
- Rotas: kebab-case quando aplicavel.

## UX

- Comecar paginas por contexto, metricas e acoes.
- Evitar interfaces table-first.
- Manter copy curta e orientada a acao.
- Garantir contraste e legibilidade.
- Seguir a ordem cognitiva: overview, clareza, acoes, detalhe.
- Preservar a identidade premium em todos os breakpoints.

## Visual System

- Usar tokens e specs de `packages/ui` como fonte inicial de verdade.
- Glassmorphism deve melhorar hierarquia, nao decorar por decorar.
- Motion deve confirmar estado e reduzir friccao.
- Cards principais devem manter identidade visual distinta por modulo.
- Hover e focus nao podem causar layout shift.
- Evitar componentes que parecam boilerplate Tailwind ou admin generico.

## Frontend

- Componentes pequenos e composaveis.
- UI generica em `packages/ui`.
- Logica de dominio em features.
- Dados via camada API isolada.
- Mobile-first.

## Backend

- Modulos por dominio.
- Erros consistentes.
- Validacao no servidor.
- Permissoes no servidor.
- Queries com contexto de tenant.
- Operacoes financeiras auditaveis.

## Qualidade

- Testes unitarios para logica critica.
- Testes de integracao para API.
- Verificacao visual para dashboard e componentes principais.
- Documentar decisoes arquiteturais relevantes.
