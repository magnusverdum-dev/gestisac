# Matriz Funcional - Condominios

Objetivo: usar as prompts mestre como referencia de implementacao e auditoria funcional.

- Estado inicial: `Pendente`
- Estados usados: `Pendente`, `Em progresso`, `Implementado`, `Validado`
- V4-V6: implementacao funcional concluida no codigo; validacao automatica feita por `check:api`, `typecheck:web` e `build:web`.
- QA manual recomendado: criar condominio, completar ficha, carregar documento/imagem, importar CSV e verificar navegacao mobile.

| Estado | Prompt | Notas de Implementacao |
|---|---|---|
| Implementado | PROMPT MASTER - SECCAO CONDOMINIOS COMPLETA | Entidade expandida como centro operacional com dados administrativos, fisicos, tecnicos, visuais, documentais e historicos. |
| Implementado | PROMPT 1 - LISTA PRINCIPAL DE CONDOMINIOS | Nova pagina dedicada com KPIs, pesquisa, filtros, cards/tabela e acao principal para abrir condominio. |
| Implementado | PROMPT 2 - PAGINA INDIVIDUAL DO CONDOMINIO | Painel individual com cabecalho, imagem, resumo, estado, completude e abas. |
| Implementado | PROMPT 3 - IDENTIFICACAO DO CONDOMINIO | Campos de identificacao, tipo, subtipo, gestor, equipa, empresa, tags e notas administrativas. |
| Implementado | PROMPT 4 - MORADA E LOCALIZACAO | Morada estruturada, coordenadas, links de mapa e notas de acesso. |
| Implementado | PROMPT 5 - ESTRUTURA FISICA DO CONDOMINIO | Estrutura fisica detalhada com fracoes, blocos, pisos, caves, elevadores, areas e atributos tecnicos. |
| Implementado | PROMPT 6 - BLOCOS / ENTRADAS | Sub-recurso com criar, editar, apagar no backend e adicionar/listar na UI. |
| Implementado | PROMPT 7 - PISOS | Sub-recurso com criar, editar, apagar no backend e adicionar/listar na UI. |
| Implementado | PROMPT 8 - ZONAS DO CONDOMINIO | Zonas com bloco/piso, estado, alerta, notas, imagem/planta e URL QR funcional. |
| Implementado | PROMPT 9 - EQUIPAMENTOS IMPORTANTES | Equipamentos tecnicos com localizacao, manutencao, estado, criticidade e referencias. |
| Implementado | PROMPT 10 - CONTACTOS IMPORTANTES | Contactos com tipo, empresa, telefone, email, emergencia, favorito e prioridade. |
| Implementado | PROMPT 11 - DOCUMENTOS DO CONDOMINIO | Documentos geridos na ficha, upload multipart dedicado e link de download via modulo de documentos. |
| Implementado | PROMPT 12 - IMAGENS, PLANTAS E VISUAL DO PREDIO | Media/plantas com upload multipart, imagem principal e associacao por bloco/piso/zona. |
| Implementado | PROMPT 13 - ESTADO OPERACIONAL DO CONDOMINIO | Estado geral, nivel de alerta, resumo, motivo, atualizado por e exibicao na lista/detalhe. |
| Implementado | PROMPT 14 - NOTAS INTERNAS DO CONDOMINIO | Notas internas com tipo, prioridade, visibilidade, pin e historico. |
| Implementado | PROMPT 15 - HISTORICO DO CONDOMINIO | Timeline interna automatica para criacao, alteracoes e sub-recursos. |
| Implementado | PROMPT 16 - COMPLETUDE DA FICHA DO CONDOMINIO | Percentagem de completude, categorias e itens em falta. |
| Implementado | PROMPT 17 - FORMULARIO POR PASSOS PARA ADICIONAR CONDOMINIO | Modo rapido funcional e draft/onboarding no backend; UI cria em onboarding e permite completar por abas. |
| Implementado | PROMPT 18 - IMPORTACAO DE CONDOMINIOS | Importacao MVP por CSV com preview, validacao, erros e commit. |
| Implementado | PROMPT 19 - RELACAO COM FRACOES SEM ENTRAR NO MODULO DE FRACOES | Resumo de fracoes por contagens e ligacao aos dados atuais. |
| Implementado | PROMPT 20 - PREPARACAO PARA MAPA, QR CODES E 3D FUTURO | Campos e UI para mapa, QR por zona, plantas 2D e preparacao para digital twin. |
| Implementado | PROMPT 21 - UX DA LISTA E DA PAGINA INDIVIDUAL | Experiencia dedicada com filtros, badges, abas, estados vazios e layout mobile. |
| Implementado | PROMPT 22 - MODELO DE DADOS CONCEPTUAL | Modelo JSON evolutivo cobre os conceitos pedidos sem migracao para base relacional. |
| Implementado | PROMPT 23 - VALIDACOES E REGRAS | Nome obrigatorio, codigo interno unico, requisitos para ativo, arquivo antes de apagar e historico automatico. |
| Implementado | PROMPT 24 - ESTADOS VAZIOS E ONBOARDING | Estados vazios e checklist de faltas na ficha. |
| Implementado | PROMPT 25 - PROMPT FINAL CURTO PARA CORRIGIR O ECRA ATUAL | Ecran atual deixa de ser lista generica e passa a ficha operacional de condominio. |
