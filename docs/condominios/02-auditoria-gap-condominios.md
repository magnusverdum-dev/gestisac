# Auditoria Gap - Condominios

Data: 2026-05-18

Branch auditada: `main`

## Resumo Executivo

A seccao `Condominios` foi evoluida na `main` para uma area operacional propria.
Mantem persistencia JSON e compatibilidade com o CRUD antigo, mas passa a ter
modelo expandido, endpoints dedicados, ficha individual com abas, completude,
historico, sub-recursos, onboarding e importacao CSV MVP.

## Evidencia No Codigo Atual

- Backend: `apps/api/src/models/store.rs` expandiu `Condominium` com
  identificacao, morada, estrutura, estado operacional, blocos, pisos, zonas,
  equipamentos, contactos, documentos, media, notas, historico e onboarding.
- Backend: `apps/api/src/routes/condominiums.rs` passou a ter modulo dedicado de
  dominio, mantendo reexports dos endpoints antigos de edificios/fracoes.
- Backend: `apps/api/src/routes/mod.rs` expoe detalhe, seccoes, sub-recursos,
  historico, completude, arquivo e importacao.
- Frontend: `/condominios` passa a usar `CondominiumsPage.tsx`, com lista
  operacional, ficha individual, abas e formularios por contexto.
- Frontend: `apps/web/src/lib/api.ts` tem tipos e helpers dedicados para os
  novos contratos de Condominios.

## Matriz Por Prompt

| Estado | Prompt | O que existe hoje | O que falta |
|---|---|---|---|
| Implementado | Master - entidade central completa | Entidade expandida e pagina dedicada. | Futuro: persistencia relacional. |
| Implementado | 1 - Lista principal | KPIs, pesquisa, filtros, cards/tabela e acao `Abrir condominio`. | Duplicar fica fora desta ronda. |
| Implementado | 2 - Pagina individual | Cabecalho, imagem, morada, estado, cards e abas. | - |
| Implementado | 3 - Identificacao | Campos principais, gestor, equipa, empresa, tags e completude. | - |
| Implementado | 4 - Morada/localizacao | Morada estruturada, coordenadas, mapas e notas de acesso. | Preview real de mapa fica futuro. |
| Implementado | 5 - Estrutura fisica | Fracoes, blocos, entradas, pisos, caves, elevadores, atributos e notas. | - |
| Implementado | 6 - Blocos/entradas | Sub-recurso de blocos na ficha. | Reordenacao visual fica futuro. |
| Implementado | 7 - Pisos | Sub-recurso de pisos com bloco, tipo, fracoes e estado. | - |
| Implementado | 8 - Zonas | Zonas com bloco/piso, estado, alerta, QR URL e notas. | QR visual fica futuro. |
| Implementado | 9 - Equipamentos | Equipamentos com localizacao, manutencao, estado e criticidade. | - |
| Implementado | 10 - Contactos importantes | Contactos com emergencia, favorito, prioridade e dados de contacto. | Acoes copiar/chamada podem ser refinadas. |
| Implementado | 11 - Documentos | Documentos na ficha com associacao e metadata. | Upload binario dedicado fica futuro; modulo global continua disponivel. |
| Implementado | 12 - Imagens/plantas | Media/plantas com URL, associacoes e imagem principal preparada. | Visualizador avancado fica futuro. |
| Implementado | 13 - Estado operacional | Estado operacional separado, visual e editavel. | Automatizacao por avarias/documentos fica futuro. |
| Implementado | 14 - Notas internas | Notas internas com tipo, prioridade, pin e visibilidade. | Permissoes granulares ficam futuro. |
| Implementado | 15 - Historico | Timeline por condominio com eventos automaticos. | Filtros avancados na timeline ficam futuro. |
| Implementado | 16 - Completude | Percentagem, categorias e itens em falta. | - |
| Parcial | 17 - Formulario por passos | Modo rapido, rascunho e abas por etapa. | Wizard modal de 12 passos fica futuro. |
| Implementado | 18 - Importacao | CSV MVP com preview, validacao e commit. | Excel e mapeamento visual ficam futuro. |
| Implementado | 19 - Relacao com fracoes | Resumo por contagens e compatibilidade com dados existentes. | Analise de proprietario incompleto fica futuro. |
| Implementado | 20 - Mapa/QR/3D | Campos e UI futura para mapa, QR URL, planta e 3D. | Mapa real, QR visual e 3D ficam futuro. |
| Implementado | 21 - UX lista/detalhe | UX dedicada com badges, KPIs, abas e estados vazios. | Skeleton loading pode ser refinado. |
| Implementado | 22 - Modelo conceptual | Modelo JSON cobre os conceitos pedidos. | PostgreSQL fica futuro. |
| Parcial | 23 - Validacoes/regras | Nome, codigo unico, ativo com requisitos, historico e delete protegido. | Alertas automaticos de validade/criticidade ficam futuro. |
| Implementado | 24 - Estados vazios/onboarding | Estados vazios e checklist de completude. | - |
| Implementado | 25 - Correcao do ecra atual | Ecran deixou de ser generico e ganhou ficha operacional. | - |

## Lista Consolidada Do Que Ficou Para Futuro

### Backend

- Migrar JSON store para PostgreSQL quando a aplicacao precisar de concorrencia
  real, indices e relatorios mais fortes.
- Adicionar upload binario dedicado para documentos/media de condominio, se o
  modulo global de documentos deixar de ser suficiente.
- Automatizar alertas de documentos expirados, zonas interditadas e equipamentos
  criticos.
- Adicionar permissoes granulares para notas sensiveis.

### Frontend

- Wizard modal completo de 12 passos, embora as abas e rascunho ja cubram o
  fluxo base.
- Mapa real embutido, QR visual gerado como imagem, planta 2D interativa e
  visualizador 3D/digital twin.
- Importacao Excel e mapeamento visual de colunas.
- Filtros avancados dentro de historico, documentos e contactos.

### QA E Validacao

- Executado: `pnpm run check:api`, fmt check, `pnpm run clippy:api`,
  `pnpm run test:api`, `pnpm run typecheck:web` e `pnpm run build:web`.
- Executado smoke local: login, abertura de `/condominios`, menu ativo em
  Condominios, detalhe com abas, troca de condominio no seletor global sem voltar
  ao Dashboard, lista/detalhe/completude/historico e preview CSV pela API.
- Futuro recomendado: adicionar testes backend mais finos para CRUD completo de
  sub-recursos, validacoes de ativo/codigo unico e arquivo/delete protegido.
- Futuro recomendado: QA manual mobile com criacao completa, documentos/media e
  importacao CSV com linhas validas e invalidas.

## Validacao Recomendada

1. `pnpm run check:api`
2. `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
3. `pnpm run clippy:api`
4. `pnpm run test:api`
5. `pnpm run typecheck:web`
6. `pnpm run build:web`
7. QA manual em `/condominios`.
