# Entrega V4-V6 - Condominios Completo

Data: 2026-05-18

## Resumo

A branch `main` recebeu a implementacao focada na seccao `Condominios`, sem
alterar Avarias, Contabilidade ou Autenticacao.

## Entregue

- Modelo `Condominium` expandido com identificacao, morada, estrutura fisica,
  estado operacional, sub-recursos, media, notas, historico e onboarding.
- Endpoints dedicados para detalhe, seccoes, completude, historico, arquivo,
  sub-recursos e importacao CSV.
- Pagina dedicada `/condominios` com KPIs, pesquisa, filtros, cards/tabela,
  detalhe individual e abas.
- Formularios para identificacao, morada, estrutura, estado operacional,
  blocos, pisos, zonas, equipamentos, contactos, documentos, media e notas.
- Completude da ficha com itens em falta e estados vazios orientados.
- Preparacao funcional para mapa, QR por zona, planta 2D e 3D futuro.
- Importacao CSV MVP com preview, validacao e commit de linhas validas.

## Fora Desta Entrega

- PostgreSQL ou migracao de storage.
- Upload binario dedicado para documentos/media de condominio.
- Excel e mapeamento visual de colunas.
- Mapa embutido, QR visual como imagem, planta 2D interativa e visualizador 3D.
- Permissoes granulares por nota interna.

## QA Manual

1. Entrar na app e abrir `/condominios`.
2. Criar condominio rapido em onboarding.
3. Abrir a ficha e preencher identificacao, morada, estrutura e estado.
4. Adicionar bloco, piso, zona, equipamento, contacto de emergencia, documento,
   media e nota interna.
5. Confirmar completude, historico e estados vazios.
6. Testar importacao CSV com uma linha valida e uma invalida.
7. Confirmar responsividade em mobile.

## Validacao Executada

- `pnpm run check:api`
- `node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check`
- `pnpm run clippy:api`
- `pnpm run test:api`
- `pnpm run typecheck:web`
- `pnpm run build:web`
- Smoke local: login, `/condominios`, menu ativo em Condominios, detalhe com abas,
  troca de condominio no seletor global sem regressar ao Dashboard, API de lista,
  detalhe, completude, historico e preview de importacao CSV.
