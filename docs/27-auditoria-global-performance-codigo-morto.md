# Auditoria Global De Performance E Codigo Morto

Data: 2026-05-18

## Resumo Executivo

O Gestisac esta funcional e os checks principais passam, mas a meta oficial de navegacao quente `<100ms` ainda nao esta comprovada. A medicao pelo browser interno ficou de forma consistente perto de `295-306ms` por clique entre menus. Esta medicao inclui overhead da automacao de clique, por isso nao deve ser lida como tempo puro de render; mesmo assim confirma a sensacao de atraso acima do alvo.

O backend nao e o gargalo neste volume de dados: os endpoints principais responderam em `~7-11ms`, o carregamento paralelo do workspace ficou em `~2-10ms`, e o `store.json` tem apenas `57 KB`. O risco principal esta no frontend: uma app unica com rota manual, componentes grandes, derivacao de todas as paginas em cada render e chunks ainda pesados para uma PWA simples.

## Baseline Medido

### Browser / Navegacao

Ambiente: build local estatico servido em `http://127.0.0.1:4183`, sessao ja autenticada, clique nos links laterais e espera pelo conteudo principal.

| Menu | Medicao observada |
| --- | ---: |
| Dashboard | ~299-305ms, texto alvo nao confirmado por frase desatualizada na medicao |
| Condominios | 297-303ms |
| Administracao | 300-306ms |
| Contabilidade | 300-304ms |
| Relatorios | 297-302ms |
| Assembleias | 298-302ms |
| Tickets | 296-306ms |
| Documentos | 296-298ms |
| Manutencao | 298-303ms |
| Fornecedores | ~295-299ms, texto alvo nao confirmado por frase desatualizada na medicao |
| Definicoes | 295-298ms |

Nota: a API do browser disponivel para auditoria adiciona overhead de automacao. Proximo passo recomendado: instrumentar temporariamente a app com `performance.now()`/`PerformanceObserver` no proprio handler de navegacao para obter tempo real de `click -> currentPath -> paint`.

### Backend / API

API real em `http://127.0.0.1:3000`, 5 amostras por endpoint apos login.

| Endpoint | Avg | Payload |
| --- | ---: | ---: |
| `/api/health` | 8.43ms | 44 B |
| `/api/me` | 7.37ms | 227 B |
| `/api/dashboard` | 9.43ms | 2.9 KB |
| `/api/condominiums` | 11.42ms | 5.9 KB |
| `/api/buildings` | 6.98ms | 535 B |
| `/api/fractions` | 7.33ms | 664 B |
| `/api/residents` | 7.23ms | 705 B |
| `/api/tickets` | 7.10ms | 747 B |
| `/api/suppliers` | 7.52ms | 493 B |
| `/api/documents` | 7.53ms | 2.5 KB |
| `/api/reports` | 7.52ms | 472 B |
| `/api/maintenance` | 7.28ms | 514 B |
| `/api/assemblies` | 7.37ms | 422 B |
| `/api/accounting/summary` | 8.17ms | 154 B |
| `/api/permissions` | 7.63ms | 393 B |

Carregamento paralelo equivalente a `getResources`: `1.96-9.53ms`, `13.4 KB` total.

### Build / Bundle

Resultado de `pnpm run build:web`:

| Item | Valor |
| --- | ---: |
| Modulos transformados | 201 |
| `q-manifest.json` | 115.85 KB, gzip 14.16 KB |
| CSS global | 50.41 KB, gzip 9.92 KB |
| Maior chunk Qwik core | 66.88 KB, gzip 24.39 KB |
| `PageOverview` chunk | 32.04 KB, gzip 6.54 KB |
| `CondominiumsPage` handlers chunk | 28.35 KB, gzip 7.03 KB |
| `data/pages.ts` chunk | 24.88 KB, gzip 5.85 KB |
| `lib/api.ts` chunk | 21.85 KB, gzip 6.88 KB |

## Achados Priorizados

| Prioridade | Achado | Prova | Impacto | Correcao recomendada |
| --- | --- | --- | --- | --- |
| P0 | App unica com rota manual e paginas principais importadas no topo | `apps/web/src/app.tsx` importa `DashboardPage`, `CondominiumsPage`, `PageOverview` e troca por `currentPath` | A navegacao quente re-renderiza a shell e depende do mesmo grafo de codigo, em vez de paginas verdadeiramente isoladas | Migrar gradualmente para rotas Qwik City reais ou lazy boundary por pagina principal |
| P0 | `buildPages` e `buildGlobalSearchResults` correm no render | `apps/web/src/app.tsx:516-518` | Cada navegacao pode reconstruir todas as paginas/listas e pesquisa global, mesmo sem alteracao de dados | Guardar snapshots derivados quando `resources` muda; construir apenas a pagina ativa |
| P0 | Componentes monoliticos | `CondominiumsPage.tsx` 1187 linhas, `PageOverview.tsx` 1027 linhas | Mais codigo por pagina, mais closures/handlers Qwik, chunks maiores e manutencao dificil | Dividir em hubs, lista, detalhe, formularios, importacao, documentos e paineis lazy |
| P1 | `getResources` faz 12 chamadas paralelas no arranque e apos mutacoes | `apps/web/src/lib/api.ts:705-736` | Hoje e rapido, mas escala mal e causa refresh global desnecessario apos qualquer alteracao | Criar snapshot leve `/api/workspace` ou invalidar apenas o recurso alterado |
| P1 | Mutacoes fazem reload completo do workspace | `apps/web/src/app.tsx:229`, `254`, `275`, `296`, `318`, `363` | Criar/editar/apagar documentos ou tickets recarrega tudo | Atualizar estado local com resposta da mutacao ou recarregar so a colecao afetada |
| P1 | JSON store e persistencia escrevem tudo | `apps/api/src/state.rs:95-103` clona `AppStore` completo e escreve JSON inteiro | Nao pesa com 57 KB, mas vai pesar com anexos/dados reais e sessoes | Separar sessoes do store operacional; guardar mutacoes por colecao ou usar repo dedicado |
| P1 | Handlers devolvem colecoes completas apos delete/mutacoes | Ex.: `apps/api/src/routes/resources.rs` devolve clones de `tickets`, `documents`, etc. | Respostas crescem com os dados e forcam o frontend a reconciliar listas grandes | Devolver item alterado, id removido ou snapshot paginado |
| P1 | CSS global unico | `apps/web/src/styles/global.css` 2956 linhas / 50.41 KB | Todas as paginas carregam estilos de todos os modulos | Podar estilos obsoletos e agrupar por padrao; manter tokens globais e mover layouts especificos |
| P2 | Demo API/browser fallback dentro de `lib/api.ts` | `apps/web/src/lib/api.ts` 1909 linhas | Codigo demo, tipos, API real e persistencia local ficam no mesmo chunk logico | Separar `demoApi.ts` e carregar apenas quando a API real falhar ou em modo demo |
| P2 | Resquicios de `activeCondominium` | Modelos e auth ainda mantem `active_condominium` | Pode voltar a contaminar dashboard global e confundir arquitetura | Manter no backend se necessario, mas remover da UI global e documentar como campo legado |

## Codigo Morto Ou Candidatos Seguros

| Candidato | Estado | Acao recomendada |
| --- | --- | --- |
| Bloco antigo de `document-factory` em `PageOverview` apos o `return` especifico de `/documentos` | Provavelmente inacessivel, porque so Documentos usa `documentTemplates` | Remover apos confirmar que nenhuma outra pagina usa `documentTemplates` |
| CRUD antigo de condominios em `apps/api/src/routes/resources.rs` com `#[allow(dead_code)]` | Substituido por `apps/api/src/routes/condominiums.rs` | Remover `CondominiumInput` antigo e handlers antigos se nenhuma rota os expuser |
| `apps/web/src/components/dashboard/AlertCard.tsx` | Nao encontrei importacao ativa | Remover ou religar explicitamente se ainda fizer parte do design |
| `apps/web/src/types/dashboard.ts` | Nao encontrei importacao ativa | Remover se nao for usado por contrato externo |
| Duplicacao conceptual entre `resources.rs` e wrappers `documents.rs`, `reports.rs`, `administration.rs` | Ainda funcional, mas confuso | Dividir `resources.rs` por dominio em vez de reexportar de um ficheiro gigante |

## Gargalos Que Exigem Refactor

1. A navegacao deve deixar de depender de `buildPages(resources, dashboard)` para todas as areas. O ideal e `buildPage(path, resources, dashboard)` ou snapshots por dominio.
2. `PageOverview` deve ser partido em pelo menos: `GenericListPage`, `DocumentsHubPage`, `CreatePanel`, `EditPanel`, `RecordActions`, `DocumentFactory`.
3. `CondominiumsPage` deve separar `CondominiumHub`, `CondominiumList`, `CondominiumDetail`, `CondominiumForms`, `CondominiumImport`.
4. `lib/api.ts` deve separar contratos/tipos, cliente HTTP real e demo fallback.
5. O backend deve separar sessoes de utilizador do `AppStore`; login/logout nao deviam serializar o store operacional inteiro.
6. As mutacoes devem devolver respostas pequenas e o frontend deve atualizar so a colecao afetada.

## Plano De Correcao Recomendado

### Fase 1 - Medicao real dentro da app

- Adicionar instrumentacao temporaria, removivel, no `navigate$`: marcar `click`, `currentPath` atualizado e primeiro render do titulo.
- Expor resultados apenas em desenvolvimento por `console.table` ou flag local.
- Confirmar se o atraso de ~300ms e real da app ou overhead do browser/automacao.

### Fase 2 - Ganho rapido no frontend

- Substituir `const pages = buildPages(...)` por derivacao cacheada/sinalizada quando `resources` muda.
- Construir apenas a pagina ativa para `PageOverview`.
- Mover `buildGlobalSearchResults` para derivacao cacheada e recalcular so quando `resources` muda.
- Remover codigo morto claro do `PageOverview` e ficheiros nao importados.

### Fase 3 - Divisao dos componentes pesados

- Extrair Documentos para pagina/componente proprio, deixando `PageOverview` so para listas simples.
- Extrair detalhe e formularios de Condominios em componentes menores.
- Garantir que importacao CSV, gerador documental, previews e formularios longos so montam quando abertos.

### Fase 4 - API e dados

- Criar endpoints/snapshots leves por ecras principais.
- Trocar reload global apos mutacoes por update local ou fetch da colecao alterada.
- Reduzir clones de colecoes completas em mutacoes Rust.
- Separar sessoes de `store.json` ou guardar sessoes em ficheiro/cache proprio.

### Fase 5 - Limpeza estrutural

- Partir `resources.rs` por dominio.
- Partir `api.ts` em `client.ts`, `types.ts`, `demoApi.ts`, `documentsApi.ts`, `condominiumsApi.ts`.
- Podar CSS global e manter uma regra simples: componentes especificos nao devem obrigar todas as paginas a carregar estilos tecnicos.

## Validacao Executada

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck:web` | Passou |
| `pnpm run build:web` | Passou |
| `pnpm run check:api` | Passou |
| `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check` | Passou |
| `pnpm run clippy:api` | Passou |
| `pnpm run test:api` | Passou, 9 testes |

## Conclusao

Nao vejo evidencia de que o backend esteja lento agora. O alvo `<100ms` deve ser atacado primeiro no frontend: reduzir derivacoes globais por render, dividir os componentes grandes, remover codigo morto e garantir que cada clique de menu so troca a pagina ativa sem reconstruir a aplicacao inteira.

O primeiro patch de performance deve ser pequeno mas estrutural: cachear `buildPages`/search por alteracao de dados, construir so a pagina ativa e remover blocos mortos obvios. Depois disso deve-se medir novamente no browser e so entao mexer em API/storage.

## Continuacao Da Auditoria

Data: 2026-05-18, segunda passagem.

Esta continuacao aprofunda a parte que ficou por fechar: mapa de chunks, complexidade por ficheiro, CSS obsoleto, codigo morto provavel e ordem concreta para o primeiro refactor.

### Leitura Importante Sobre A Medicao De 300ms

Os valores de `~295-306ms` apareceram quase iguais em todos os menus, independentemente do tamanho da pagina. Isto e um sinal forte de que parte relevante da medicao vem do mecanismo externo de clique/automacao, nao apenas do render do Gestisac.

Mesmo assim, a percecao de atraso deve ser tratada como real ate prova contraria. A medicao definitiva deve ser feita dentro da propria app, no handler `navigate$`, porque a API disponivel no browser de auditoria nao expoe APIs normais como `performance`, `history`, `setTimeout` ou eventos DOM dentro de `evaluate`.

Conclusao pratica: nao devemos otimizar cegamente para os `300ms` medidos por fora. Devemos primeiro inserir uma metrica interna removivel e medir `click -> currentPath alterado -> titulo principal pintado`.

### Chunks Mais Pesados

| Chunk | Tamanho | Origem dominante | Leitura |
| --- | ---: | --- | --- |
| `q-CftfpLYc.js` | 66.88 KB | Qwik core | Esperado; nao atacar primeiro |
| `q-BNN64iqf.js` | 32.04 KB | `PageOverview.tsx`, 39 origins/handlers | Grande alvo de refactor |
| `q-DacGCwqw.js` | 28.35 KB | `CondominiumsPage.tsx`, 37 origins/handlers | Grande alvo de refactor |
| `q-CTfpUANM.js` | 24.88 KB | `src/data/pages.ts` | Dados/derivacoes demasiado concentrados |
| `q-MiFtc560.js` | 21.85 KB | `src/lib/api.ts` | Cliente API + demo fallback juntos |
| `q-CyUdxfb7.js` | 12.28 KB | `src/app.tsx`, 20 handlers | Shell/app central com responsabilidades demais |

### Complexidade Por Ficheiro

| Ficheiro | Linhas | Signals/tasks | Handlers | Map/filter | Risco |
| --- | ---: | ---: | ---: | ---: | --- |
| `apps/web/src/components/pages/CondominiumsPage.tsx` | 1251 | 17 | 30 | 28 | Alto |
| `apps/web/src/components/pages/PageOverview.tsx` | 1068 | 15 | 40 | 24 | Alto |
| `apps/web/src/lib/api.ts` | 2094 | 0 | 0 | 13 | Alto por tamanho/coesao |
| `apps/web/src/data/pages.ts` | 1343 | 0 | 0 | 35 | Alto por derivacao global |
| `apps/web/src/app.tsx` | 570 | 15 | 16 | 0 | Medio/alto por centralizacao |

Leitura: o custo nao esta num unico bug. E acumulacao: ficheiros grandes, muitos handlers serializados pelo Qwik e derivacoes globais que vivem no caminho principal da app.

### Codigo Morto Confirmado Ou Muito Provavel

| Area | Prova | Recomendacao |
| --- | --- | --- |
| CSS antigo de Condominios | Classes so aparecem em `global.css`: `.condo-create-import`, `.condo-list-card`, `.condo-view-toggle`, `.condo-tabs`, `.condo-table-list`, `.condo-detail-panel` | Remover apos comparacao visual da pagina nova |
| CSS antigo de Dashboard/operacao | Classes so aparecem em `global.css`: `.urgent-notice`, `.operation-list`, `.alert-strip`, `.notice-copy`, `.alert-list` | Confirmar se pertenciam ao dashboard antigo e remover em lote |
| `AlertCard.tsx` | Export com 0 usos noutros ficheiros | Remover ou religar explicitamente |
| `apps/web/src/types/dashboard.ts` | Tipos duplicam conceitos de `lib/api.ts` e nao ha imports ativos | Remover se `typecheck` continuar limpo |
| `SimpleAction` e `ContextDocumentGroup` em `SimpleHub.tsx` | Exportados, 0 usos | Remover |
| Bloco generico de `document-factory` em `PageOverview` | `documentTemplates` so aparece em `/documentos`, mas `/documentos` retorna antes; existe duplicado nas linhas antigas e novas | Remover bloco antigo fora do fluxo de `/documentos` |
| `getDocumentTemplates`, `getCondominiumCompleteness`, `getCondominiumHistory`, `updateCondominiumSubresource`, `deleteCondominiumSubresource` | Exportados e sem chamadas no frontend atual | Manter apenas se forem contrato planeado; senao mover para ficheiro de API futura ou remover temporariamente |

Nota sobre tipos exportados de `lib/api.ts`: muitos aparecem com 0 usos fora do ficheiro, mas isso nao significa que sejam todos lixo. Alguns documentam contratos e sao usados internamente no proprio `api.ts`. A remocao deve ser feita com `typecheck:web` logo a seguir.

### CSS A Podar Primeiro

Classes antigas sem uso direto encontrado no TSX:

- `.condo-create-import`
- `.condo-list-card`
- `.condo-view-toggle`
- `.condo-tabs`
- `.condo-table-list`
- `.condo-detail-panel`
- `.condo-detail-header`
- `.condo-filter-bar`
- `.condo-kpis`
- `.condo-layout`
- `.condo-list-panel`
- `.urgent-notice`
- `.operation-list`
- `.alert-strip`
- `.notice-copy`
- `.alert-list`

Estimativa: esta limpeza nao resolve sozinha a navegacao, mas reduz ruido visual/tecnico e torna mais seguro continuar.

### Backend, Segunda Passagem

| Ficheiro | Linhas | `.clone()` | Locks write/read | Persistencias | Leitura |
| --- | ---: | ---: | ---: | ---: | --- |
| `routes/resources.rs` | 2720 | 71 | 68 / 32 | 36 | Ficheiro gigante, legado e ainda central |
| `routes/condominiums.rs` | 2170 | 49 | 26 / 12 | 15 | Dominio novo muito grande |
| `models/store.rs` | 1780 | 60 | 0 / 0 | 0 | Modelo agregado demais |
| `routes/auth.rs` | 334 | 16 | 6 / 2 | 5 | Login/logout persistem sessoes no store |
| `state.rs` | 184 | 1 | 0 / 2 | 0 | `save()` clona e escreve o store inteiro |

Risco real futuro: quando a app tiver centenas/milhares de condominios, documentos e historicos, o padrao atual de clone + persistencia global + colecoes completas vai ficar caro. Hoje ainda nao e o gargalo medido.

### Duplicacoes Estruturais

- `routes/documents.rs`, `routes/reports.rs` e `routes/administration.rs` sao wrappers/reexports de `resources.rs`.
- `routes/condominiums.rs` ja substituiu parte dos handlers antigos de `resources.rs`, mas os handlers antigos continuam no ficheiro com `#[allow(dead_code)]`.
- `lib/api.ts` tem contratos, cliente HTTP, fallback demo, seeds demo, documentos demo e relatorios demo no mesmo ficheiro.
- `PageOverview.tsx` agora contem dois mundos: a experiencia simplificada de Documentos e o generic overview antigo.

### Ordem Recomendada Para O Primeiro Patch Real

1. Remover CSS morto de Condominios/Dashboard antigo.
2. Remover `AlertCard.tsx`, `types/dashboard.ts` e exports mortos de `SimpleHub.tsx`, se `typecheck` confirmar.
3. Remover bloco duplicado antigo de `document-factory`/`document-preview` fora do fluxo novo de `/documentos`.
4. Extrair `DocumentsPage` de `PageOverview`, deixando `PageOverview` apenas para listas simples.
5. Trocar `buildPages(resources, dashboard)` por `buildPageForPath(path, resources, dashboard)` para construir so a pagina ativa.
6. Separar `buildGlobalSearchResults` para cache/sinal recalculado apenas quando `resources` muda.
7. Separar `lib/api.ts` em `api/client.ts`, `api/types.ts`, `api/demo.ts`, `api/documents.ts`, `api/condominiums.ts`.
8. So depois mexer em backend: sessoes fora de `store.json`, respostas pequenas em mutacoes e remocao de handlers legados.

### Resultado Esperado Do Primeiro Patch

O primeiro patch nao deve prometer milagres de backend. O objetivo realista e:

- reduzir chunks de `PageOverview` e `CondominiumsPage`;
- reduzir CSS global;
- reduzir trabalho no render principal;
- tornar a app mais simples de manter;
- preparar uma medicao interna confiavel para validar se a navegacao esta realmente abaixo de `<100ms`.

## Implementacao Do Primeiro Patch Frontend

Data: 2026-05-19.

### Alteracoes Aplicadas

| Area | Alteracao | Resultado |
| --- | --- | --- |
| Medicao interna | Adicionada metrica dev-only no handler `navigate$`, com `performance.now()` e log `[gestisac:navigation]` apos dois `requestAnimationFrame` | Permite medir a navegacao dentro da propria app, sem depender apenas do overhead do browser automatizado |
| Derivacao global | `buildPages(...)` e `buildGlobalSearchResults(...)` passaram para snapshots em signals atualizados quando o workspace e carregado | A navegacao deixa de reconstruir paginas e pesquisa global em cada render |
| Codigo morto | Removidos `apps/web/src/components/dashboard/AlertCard.tsx` e `apps/web/src/types/dashboard.ts` | `typecheck:web` confirmou que nao havia imports ativos |
| Exports mortos | Removidos `SimpleAction` e `ContextDocumentGroup` de `SimpleHub.tsx` | Mantem o componente focado no hub simples realmente usado |
| Documentos | Removido o bloco antigo duplicado de Documentos dentro de `PageOverview` | Fica apenas a experiencia simplificada com 4 cartoes |
| CSS antigo | Removidos grupos antigos de Dashboard/operacao e Condominios ja sem uso no TSX | CSS global baixou de cerca de `50.41 KB` para `44.42 KB` no build |

### Build Antes/Depois

| Item | Antes | Depois |
| --- | ---: | ---: |
| Modulos transformados | 201 | 196 |
| CSS global | 50.41 KB | 44.42 KB |
| CSS gzip | 9.92 KB | 8.91 KB |
| `q-manifest.json` | 115.85 KB | 112.62 KB |

Leitura: a melhoria ainda e moderada, mas ja removeu ruido seguro e trabalho desnecessario no caminho de navegacao. O maior ganho restante exige partir os componentes grandes, especialmente `PageOverview`, `CondominiumsPage`, `data/pages.ts` e `lib/api.ts`.

### QA Visual Executada

Ambiente: build local servido em `http://127.0.0.1:4183`, API real em `http://127.0.0.1:3000`.

| Verificacao | Resultado |
| --- | --- |
| Dashboard global sem seletor de condominio | Validado |
| Dashboard mantem acoes rapidas: Novo Ticket, Emitir Recibo, Novo Condominio, Gerar Relatorio | Validado |
| `/condominios` mostra os 4 cartoes simples | Validado |
| `/condominios` ja nao mostra criacao rapida nem importacao CSV no primeiro impacto | Validado |
| `/documentos` mostra os 4 cartoes de contexto | Validado |
| `/tickets` mostra `Abrir` + `Mais` e nao expoe `Apagar` como acao direta | Validado |

### Medicao Externa Apos Patch

| Menu | Medicao via browser automatizado |
| --- | ---: |
| Condominios | ~334ms |
| Documentos | ~332ms |
| Tickets | ~325ms |

Nota: esta medicao inclui uma espera artificial de estabilidade e overhead da automacao, por isso nao substitui a metrica dev-only interna. A melhoria estrutural foi aplicada, mas a meta `<100ms` deve ser confirmada pela consola em desenvolvimento com a nova linha `[gestisac:navigation]`.

### Validacao Executada Nesta Vaga

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck:web` | Passou |
| `pnpm run build:web` | Passou |
| `pnpm run check:api` | Passou |

### Proxima Vaga Recomendada

1. Extrair `DocumentsPage` de `PageOverview`.
2. Separar `CondominiumsPage` em hub, lista simples, detalhe e formularios carregados por necessidade.
3. Criar `buildPageForPath(...)` ou snapshots por dominio em vez de manter `data/pages.ts` como agregador grande.
4. Dividir `lib/api.ts` em cliente HTTP, tipos, demo fallback e APIs por dominio.
5. Medir os tempos reais em dev com `[gestisac:navigation]` antes de mexer em backend.

## Segunda Vaga - Separacao De Componentes Pesados

Data: 2026-05-19.

### Alteracoes Aplicadas

| Area | Alteracao | Resultado |
| --- | --- | --- |
| `PageOverview` | Extraida a experiencia de `/documentos` para `DocumentsPage.tsx` | `PageOverview` deixa de carregar a logica documental no componente generico |
| `DocumentsPage` | Criado componente proprio para hub de Documentos, contexto, upload e gerador documental | O modulo documental passa a evoluir sem aumentar o componente generico |
| `data/pages.ts` | Extraida a pesquisa global para `data/search.ts` | `pages.ts` fica menos misturado: paginas de navegacao de um lado, pesquisa global do outro |
| `app.tsx` | Roteamento passa a renderizar `DocumentsPage` diretamente quando `page.path === '/documentos'` | Evita passar Documentos pelo fluxo generico de `PageOverview` |
| `CondominiumsPage` | Extraidos componentes de formulario/detalhe para `CondominiumsParts.tsx` | O ficheiro principal fica mais focado no fluxo/hub e menos em UI repetitiva |

### Build Apos Segunda Vaga

| Item | Depois da primeira vaga | Depois da segunda vaga |
| --- | ---: | ---: |
| Modulos transformados | 196 | 200 |
| CSS global | 44.42 KB | 44.42 KB |
| `q-manifest.json` | 112.62 KB | 113.90 KB |
| Maior chunk nao-core ligado a paginas | ~28.35 KB | Documentos dividido em chunks de ~13-15 KB; Condominios ainda ~28.35 KB |

Leitura: a separacao de Documentos melhorou a composicao dos chunks, embora o manifesto tenha crescido ligeiramente por haver mais boundaries/componentes. Isto e aceitavel: a meta e reduzir mega-componentes e permitir lazy boundaries, nao apenas baixar contagem bruta de ficheiros.

### QA Visual Executada

| Verificacao | Resultado |
| --- | --- |
| Dashboard sem seletor de condominio | Validado |
| Dashboard mantem acoes rapidas | Validado |
| `/condominios` continua com 4 cartoes e sem criacao rapida no primeiro impacto | Validado |
| `/documentos` continua com 4 cartoes e texto de escolha de contexto | Validado |
| `/tickets` continua com `Abrir` + `Mais`, sem `Apagar` exposto | Validado |

### Validacao Executada Nesta Vaga

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck:web` | Passou |
| `pnpm run build:web` | Passou |
| `pnpm run check:api` | Passou |

### O Que Ainda Falta Para O Alvo `<100ms`

1. `CondominiumsPage.tsx` ainda e o maior bloco funcional e continua com detalhe, formularios, importacao e sub-recursos no mesmo ficheiro.
2. `data/pages.ts` ainda constroi todas as paginas quando o workspace muda; esta melhor que construir em cada render, mas o ideal e `buildPageForPath`.
3. `lib/api.ts` continua a concentrar cliente HTTP, tipos, fallback demo e funcoes por dominio.
4. Para obter medicao real, ainda e preciso correr a app em dev e ler os logs `[gestisac:navigation]`, porque a automacao externa continua a adicionar centenas de ms.

## Terceira Vaga - Refactor De `lib/api.ts`

Data: 2026-05-19.

### Alteracoes Aplicadas

| Area | Alteracao | Resultado |
| --- | --- | --- |
| Tipos API | Criado `apps/web/src/lib/api/types.ts` | Contratos TypeScript sairam da fachada principal |
| Cliente HTTP | Criado `apps/web/src/lib/api/http.ts` | `apiRequest`, `resolveApiUrl` e fallback HTML ficam isolados |
| Demo/fallback browser | Criado `apps/web/src/lib/api/demo.ts` | Store demo, seeds, previews e downloads demo deixam de poluir a API real |
| Fachada compatível | `apps/web/src/lib/api.ts` continua a exportar os mesmos tipos/funcoes | A app nao precisou de trocar imports existentes |

### Tamanho Dos Ficheiros Apos Refactor

| Ficheiro | Linhas |
| --- | ---: |
| `apps/web/src/lib/api.ts` | 528 |
| `apps/web/src/lib/api/types.ts` | 668 |
| `apps/web/src/lib/api/http.ts` | 85 |
| `apps/web/src/lib/api/demo.ts` | 992 |

Leitura: o peso total de codigo nao desaparece, mas deixa de estar num unico ficheiro de mais de 2000 linhas. A separacao tambem abre caminho para importar dominios/API de forma mais fina numa proxima fase.

### Validacao Executada Nesta Vaga

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck:web` | Passou |
| `pnpm run build:web` | Passou |
| `pnpm run check:api` | Passou |

### Proximo Passo Tecnico

O refactor ainda preserva `api.ts` como fachada unica para compatibilidade. O proximo ganho sera dividir as funcoes de dominio em `api/resources.ts`, `api/condominiums.ts`, `api/documents.ts`, `api/reports.ts` e `api/accounting.ts`, e depois trocar os imports da UI gradualmente para esses modulos especificos.

## Quarta Vaga - Fachada API Por Dominio

Data: 2026-05-19.

### Alteracoes Aplicadas

| Modulo | Responsabilidade |
| --- | --- |
| `apps/web/src/lib/api/auth.ts` | Sessao, login, refresh, `me`, logout, dashboard e condominio ativo legado |
| `apps/web/src/lib/api/accounting.ts` | Snapshot de contabilidade e colecoes financeiras |
| `apps/web/src/lib/api/condominiums.ts` | Detalhe, completude, historico, secoes, sub-recursos, arquivo e importacao CSV |
| `apps/web/src/lib/api/documents.ts` | Upload, templates, geracao, preview e download documental |
| `apps/web/src/lib/api/reports.ts` | Preview e exportacao de relatorios |
| `apps/web/src/lib/api/resources.ts` | Snapshot global `getResources` |
| `apps/web/src/lib/api/pagination.ts` | Paginacao generica e CRUD generico |
| `apps/web/src/lib/api.ts` | Fachada publica com reexports compativeis |

### Resultado

O `api.ts` deixou de ser o ficheiro onde tudo vive. Agora e apenas a camada de compatibilidade para os imports existentes. Isto permite que, numa fase seguinte, cada pagina importe diretamente so o dominio que precisa, sem arrastar toda a fachada.

### Validacao Executada Nesta Vaga

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck:web` | Passou |
| `pnpm run build:web` | Passou |
| `pnpm run check:api` | Passou |

### Leitura De Performance

Esta alteracao e principalmente organizacional e desbloqueadora. O build passou a transformar mais modulos porque ha mais ficheiros pequenos, mas a estrutura fica pronta para reduzir importacoes por pagina e para evoluir para lazy boundaries reais por dominio.
