# Deploy V4-V6 - Condominios Completo

## Resumo

Este deploy transforma `Condominios` numa area operacional propria, deixando de depender apenas da lista generica de registos. A implementacao mantem o JSON store atual, mas expande o modelo para suportar identificacao, morada, estrutura fisica, blocos, pisos, zonas, equipamentos, contactos, documentos, media, estado operacional, notas internas, historico, completude, onboarding e importacao CSV.

## Backend

- `Condominium` foi expandido com campos estruturados e sub-recursos embutidos, mantendo compatibilidade com dados antigos via `serde(default)`.
- Foram adicionados endpoints de detalhe, seccoes, completude, historico, arquivo protegido, importacao CSV e sub-recursos.
- Documentos e imagens/plantas de condominio suportam upload multipart dedicado e ficam descarregaveis atraves do modulo de documentos existente.
- A validacao cobre nome obrigatorio, codigo interno unico, requisitos minimos para estado ativo e preferencia por arquivar antes de apagar.

## Frontend

- `/condominios` passa a usar uma pagina dedicada, com KPIs, pesquisa, filtros, vista em cards/tabela, detalhe operacional e abas.
- A ficha individual permite editar identificacao, morada, estrutura e estado operacional.
- As abas permitem adicionar blocos, pisos, zonas, equipamentos, contactos, documentos, imagens/plantas e notas internas.
- Importacao CSV inclui preview, erros e importacao apenas das linhas validas.
- A UI mostra completude da ficha, itens em falta, historico e preparacao para mapa, QR, planta 2D e digital twin.

## Validacao

- `pnpm run check:api`
- `pnpm run typecheck:web`
- `pnpm run build:web`

## QA Manual Recomendado

1. Criar condominio rapido em onboarding.
2. Abrir ficha individual e completar identificacao, morada e estrutura.
3. Adicionar bloco, piso, zona, equipamento e contacto de emergencia.
4. Carregar documento e imagem/planta.
5. Importar CSV com uma linha valida e uma linha invalida.
6. Verificar completude, historico, filtros e layout mobile.
