# Prompts Originais - Modulo Condominios

- Fonte: `C:\Users\josefeio\Desktop\prompts\Gestisac_Condominios_Prompts_Completas.pdf`
- Paginas extraidas: `23`

> Extracao automatica do PDF para Markdown, sem alterar o texto funcional de origem.


## Pagina 1

Gestisac - Condominios - Prompts completas
Tens razão. A versão anterior ficou demasiado resumida. Aqui vai uma versão **completa**, focada **apenas na
entidade Condomínio**, com praticamente tudo o que faz sentido guardar e pedir ao Codex 5.3.
Podes copiar isto diretamente para o Codex.
PROMPT MASTER — SECÇÃO CONDOMÍNIOS COMPLETA
Estamos a trabalhar numa plataforma existente chamada Gestisac, usada para gestão de condomínios.
Quero melhorar apenas a secção “Condomínios”.
Neste momento a página de condomínios está demasiado genérica. Parece uma lista de registos simples e não 
permite compreender, visualizar, organizar nem gerir verdadeiramente a informação de cada condomínio.
O objetivo é transformar cada condomínio numa entidade central completa do sistema.
Um condomínio não deve ser apenas:
- nome
- número de frações
- botões de editar/apagar
Um condomínio deve representar um prédio real ou conjunto de prédios, com informação administrativa, física, 
operacional, técnica, visual, documental e histórica.
Não reconstruir o sistema todo.
Não recriar autenticação.
Não mexer na contabilidade de forma profunda.
Não criar o módulo de avarias agora.
Focar apenas na estrutura, informação, visualização e gestão da entidade Condomínio.
A secção de Condomínios deve permitir:
- listar condomínios de forma útil
- pesquisar condomínios
- filtrar condomínios
- abrir uma página individual de cada condomínio
- editar informação completa do condomínio
- adicionar dados físicos, técnicos e operacionais
- guardar documentos e plantas
- guardar contactos importantes
- guardar imagens do prédio
- preparar o sistema para mapa, planta 2D, QR codes por zona e 3D/digital twin no futuro
PROMPT 1 — LISTA PRINCIPAL DE CONDOMÍNIOS
Reformular a página principal de Condomínios. 
 
A página atual não permite perceber bem a informação dos condomínios. Quero que a lista principal seja útil 
para gestão real. 
 
A página deve ter: 
- título “Condomínios” 
- subtítulo explicativo 
- botão “Adicionar condomínio” 
- pesquisa global 
- filtros 
- cards/resumo no topo 
- lista moderna de condomínios 
 
Cards de resumo no topo: 
- total de condomínios ativos 
- total de frações


## Pagina 2

- condomínios com alertas 
- condomínios em manutenção 
- condomínios incompletos/falta informação 
 
Cada condomínio na lista deve mostrar: 
- nome do condomínio 
- código interno 
- morada curta 
- localidade 
- número total de frações 
- número de blocos 
- número de elevadores 
- gestor responsável 
- estado operacional 
- nível de alerta 
- último evento registado 
- se tem documentos principais carregados ou não 
- se tem morada completa ou não 
- se tem estrutura física completa ou não 
- botão principal “Abrir condomínio” 
 
Não quero que “Detalhes”, “Editar” e “Apagar” sejam as ações principais. 
 
A ação principal deve ser: 
- Abrir condomínio 
 
Ações secundárias: 
- Editar 
- Duplicar 
- Arquivar 
- Apagar apenas se fizer sentido 
 
A lista deve permitir alternar entre: 
- vista em cards 
- vista em tabela 
 
Filtros necessários: 
- estado: ativo, inativo, onboarding, suspenso, arquivo 
- tipo: residencial, comercial, misto, garagens, empreendimento 
- localidade 
- gestor responsável 
- estado operacional: normal, com alertas, manutenção, crítico 
- dados incompletos 
- com/sem planta 
- com/sem equipamentos registados 
 
Pesquisa deve encontrar por: 
- nome 
- código interno 
- rua 
- localidade 
- código postal 
- gestor 
- notas
PROMPT 2 — PÁGINA INDIVIDUAL DO CONDOMÍNIO
Criar página individual completa para cada condomínio. 
 
Ao clicar em “Abrir condomínio”, o utilizador deve entrar numa página dedicada ao condomínio. 
 
Esta página deve ser o centro de controlo daquele prédio. 
 
A página individual deve ter: 
 
1. Cabeçalho principal 
- nome do condomínio 
- código interno 
- morada completa curta


## Pagina 3

- estado operacional 
- nível de alerta 
- gestor responsável 
- imagem principal do edifício, se existir 
- botão editar 
- botão adicionar informação 
- botão ver mapa 
- botão carregar documento 
- botão adicionar zona 
- botão adicionar equipamento 
 
2. Cards de resumo 
- total de frações 
- blocos 
- entradas 
- pisos 
- caves 
- elevadores 
- zonas registadas 
- equipamentos críticos 
- documentos 
- contactos importantes 
- estado operacional 
 
3. Abas organizadas 
- Visão geral 
- Identificação 
- Morada 
- Estrutura física 
- Blocos 
- Pisos 
- Zonas 
- Equipamentos 
- Contactos 
- Documentos 
- Imagens e plantas 
- Histórico 
- Estado operacional 
- Notas internas 
- Preparação 3D / digital twin 
 
A experiência deve ser moderna, limpa e fácil de navegar. 
 
O gestor deve conseguir abrir um condomínio e perceber em poucos segundos: 
- onde fica 
- como está organizado 
- quantas frações tem 
- quantos blocos tem 
- que zonas existem 
- que equipamentos críticos existem 
- que documentos existem 
- que contactos são importantes 
- se falta informação importante
PROMPT 3 — IDENTIFICAÇÃO DO CONDOMÍNIO
Criar secção de identificação básica do condomínio. 
 
Campos necessários: 
 
- nome do condomínio 
- código interno 
- referência externa, se existir 
- tipo de condomínio 
- subtipo 
- estado do condomínio 
- data de início da gestão 
- data de fim da gestão, se aplicável 
- gestor responsável


## Pagina 4

- equipa responsável 
- empresa gestora 
- descrição curta 
- notas administrativas 
- tags internas 
 
Tipos possíveis: 
- residencial 
- comercial 
- misto 
- garagens 
- lojas 
- empreendimento 
- moradias em banda 
- condomínio fechado 
- edifício único 
- vários blocos 
- outro 
 
Estados possíveis: 
- ativo 
- inativo 
- em onboarding 
- suspenso 
- em transição 
- arquivo 
 
Subtipos úteis: 
- prédio urbano 
- empreendimento privado 
- condomínio com piscina 
- condomínio com garagem 
- condomínio com elevadores 
- condomínio com lojas 
- condomínio com segurança 
- condomínio com jardim 
- condomínio com equipamentos técnicos críticos 
 
Tags internas: 
- cliente premium 
- urgente 
- dados incompletos 
- precisa revisão 
- sensível a comunicação 
- manutenção recorrente 
- prédio antigo 
- prédio novo 
- condomínio grande 
- condomínio pequeno 
 
A página deve indicar claramente se a ficha do condomínio está completa ou incompleta.
PROMPT 4 — MORADA E LOCALIZAÇÃO
Criar secção completa de morada e localização do condomínio. 
 
Campos necessários: 
 
- rua 
- número 
- lote 
- bloco de morada, se existir 
- código postal 
- localidade 
- freguesia 
- concelho 
- distrito 
- país 
- latitude


## Pagina 5

- longitude 
- link Google Maps 
- link Apple Maps, opcional 
- notas de acesso 
- ponto de entrada principal 
- ponto de entrada para técnicos 
- ponto de entrada para garagem 
- restrições de acesso 
- referência visual do local 
 
A morada deve ser estruturada, não apenas texto livre. 
 
Notas de acesso devem permitir informação prática como: 
- entrar pela rua lateral 
- tocar no porteiro 
- usar portão da garagem 
- acesso técnico pela cave 
- chave no escritório 
- chamar administrador antes de entrar 
- zona sem estacionamento 
- estacionamento permitido junto ao bloco B 
 
A página deve ter: 
- botão abrir no Google Maps 
- botão copiar morada 
- botão copiar coordenadas 
- preview simples de mapa, se já existir suporte 
 
Preparar para uso futuro em: 
- rotas de técnicos 
- mapa operacional 
- cálculo de proximidade 
- geolocalização de tarefas 
- check-in no local
PROMPT 5 — ESTRUTURA FÍSICA DO CONDOMÍNIO
Criar secção de estrutura física do condomínio. 
 
Esta secção deve descrever como o prédio ou conjunto de prédios está organizado. 
 
Campos gerais: 
 
- número total de frações 
- número de frações habitacionais 
- número de frações comerciais 
- número de garagens 
- número de arrecadações 
- número de lojas 
- número de blocos 
- número de entradas 
- número de pisos acima do solo 
- número de caves 
- número de pisos técnicos 
- número de elevadores 
- número de escadas 
- número de lugares de estacionamento 
- existência de jardim 
- existência de piscina 
- existência de sala de condomínio 
- existência de casa do lixo 
- existência de cobertura acessível 
- existência de telhado técnico 
- existência de painéis solares 
- existência de CCTV 
- existência de portaria 
- existência de porteiro 
- existência de segurança 
- ano de construção


## Pagina 6

- ano de última reabilitação 
- área comum aproximada 
- observações estruturais 
 
A página deve permitir perceber rapidamente a dimensão do condomínio. 
 
Exemplo de resumo: 
“2 blocos · 8 pisos · 2 caves · 48 frações · 2 elevadores · garagem comum” 
 
Esta informação deve ser usada depois para criar zonas, pisos, equipamentos e localização de ocorrências.
PROMPT 6 — BLOCOS / ENTRADAS
Criar gestão de blocos e entradas dentro do condomínio.
Um condomínio pode ter um ou vários blocos.
Cada bloco deve ter:
- nome do bloco
- código do bloco
- descrição
- morada específica, se diferente da morada principal
- entrada principal
- número de pisos
- número de caves
- número de frações
- número de elevadores
- número de escadas
- número de garagens associadas
- estado operacional do bloco
- notas de acesso
- notas internas
Exemplos:
- Bloco A
- Bloco B
- Entrada 25A
- Entrada 25B
- Torre Norte
- Torre Sul
- Garagem comum
- Edifício comercial
Cada bloco deve poder ser clicado para ver a sua informação.
O sistema deve permitir adicionar, editar, arquivar e reorganizar blocos.
O bloco deve poder estar ligado a:
- pisos
- zonas
- equipamentos
- documentos
- imagens
- notas
PROMPT 7 — PISOS
Criar gestão de pisos do condomínio. 
 
Cada condomínio ou bloco pode ter vários pisos. 
 
Campos por piso: 
 
- nome do piso


## Pagina 7

- número do piso 
- bloco associado 
- tipo de piso 
- descrição 
- número de frações nesse piso 
- zonas nesse piso 
- estado operacional 
- notas internas 
 
Tipos de piso: 
- habitação 
- garagem 
- arrecadações 
- comercial 
- técnico 
- cobertura 
- telhado 
- exterior 
- cave 
- rés do chão 
- outro 
 
Exemplos: 
- Piso -2 — Garagem 
- Piso -1 — Garagem e arrecadações 
- Piso 0 — Entrada, hall e lojas 
- Piso 1 — Habitação 
- Piso 8 — Habitação 
- Cobertura — Área técnica 
 
O objetivo é permitir associar zonas, equipamentos, documentos e futuras avarias ao local físico correto.
PROMPT 8 — ZONAS DO CONDOMÍNIO
Criar gestão de zonas do condomínio. 
 
As zonas são áreas específicas do prédio, muito importantes para gestão operacional. 
 
Cada zona deve ter: 
 
- nome da zona 
- tipo de zona 
- condomínio associado 
- bloco associado, se existir 
- piso associado, se existir 
- descrição 
- estado operacional 
- nível de alerta 
- QR code associado, preparado para futuro 
- localização interna 
- notas de acesso 
- notas técnicas 
- imagem da zona, opcional 
- planta associada, opcional 
 
Tipos de zona: 
- entrada principal 
- hall 
- escadas 
- corredor 
- elevador 
- garagem 
- arrecadações 
- sala de condomínio 
- casa do lixo 
- jardim 
- piscina 
- cobertura 
- telhado


## Pagina 8

- quadro elétrico 
- casa das máquinas 
- portão 
- intercomunicador 
- CCTV 
- zona técnica 
- exterior 
- estacionamento 
- portaria 
- outro 
 
Estados da zona: 
- operacional 
- com alerta 
- em manutenção 
- interditada 
- inativa 
 
Exemplos: 
- Garagem Piso -1 
- Elevador Bloco B 
- Quadro elétrico principal 
- Casa das máquinas 
- Portão automático da garagem 
- Hall Bloco A 
- Jardim exterior 
- Sala de condomínio 
 
A página do condomínio deve mostrar uma lista de zonas e permitir filtrar por: 
- bloco 
- piso 
- tipo 
- estado operacional 
 
Preparar cada zona para no futuro: 
- ter QR code físico 
- ser clicável numa planta 2D 
- ser clicável num modelo 3D 
- receber avarias associadas
PROMPT 9 — EQUIPAMENTOS IMPORTANTES
Criar gestão de equipamentos importantes do condomínio. 
 
Equipamentos são elementos técnicos ou operacionais que precisam de histórico, manutenção e documentação. 
 
Cada equipamento deve ter: 
 
- nome do equipamento 
- tipo de equipamento 
- condomínio associado 
- bloco associado 
- piso associado 
- zona associada 
- marca 
- modelo 
- número de série 
- referência interna 
- fornecedor associado 
- empresa de manutenção 
- data de instalação 
- data da última manutenção 
- data da próxima manutenção 
- periodicidade de manutenção 
- estado atual 
- nível crítico 
- notas técnicas 
- documentos associados 
- imagens associadas


## Pagina 9

- garantia até 
- contrato associado, se existir 
 
Tipos de equipamento: 
- elevador 
- bomba de água 
- portão automático 
- quadro elétrico 
- sistema de incêndio 
- CCTV 
- intercomunicador 
- iluminação comum 
- painel solar 
- sistema de rega 
- piscina 
- caldeira 
- ventilação 
- exaustão 
- porta automática 
- antena 
- rede informática 
- contador geral 
- sistema de acesso 
- outro 
 
Estados: 
- operacional 
- em manutenção 
- com avaria 
- desativado 
- substituição recomendada 
- desconhecido 
 
Nível crítico: 
- baixo 
- médio 
- alto 
- crítico 
 
Exemplos: 
- Elevador Bloco B 
- Bomba de água principal 
- Quadro elétrico garagem 
- Portão automático principal 
- Sistema CCTV garagem 
 
A página do condomínio deve mostrar equipamentos críticos de forma clara. 
 
O objetivo é que a empresa saiba exatamente que equipamentos existem no prédio, onde estão, quem os mantém e 
qual o seu estado.
PROMPT 10 — CONTACTOS IMPORTANTES
Criar secção de contactos importantes do condomínio. 
 
Cada condomínio deve ter contactos úteis associados. 
 
Cada contacto deve ter: 
 
- tipo de contacto 
- nome 
- empresa 
- cargo/função 
- telefone principal 
- telefone alternativo 
- email 
- horário de contacto 
- serviço associado 
- é contacto de emergência?


## Pagina 10

- prioridade 
- notas internas 
- documentos ou contrato associado 
 
Tipos de contacto: 
- gestor interno 
- administrador do condomínio 
- representante dos condóminos 
- porteiro 
- limpeza 
- elevadores 
- eletricista 
- canalizador 
- jardinagem 
- segurança 
- seguro 
- bombeiros 
- emergência técnica 
- fornecedor 
- empresa de manutenção 
- outro 
 
A secção deve permitir: 
- pesquisar contacto 
- filtrar por tipo 
- marcar favoritos 
- marcar emergência 
- copiar telefone 
- copiar email 
- abrir chamada em mobile 
- abrir email 
 
Exemplo: 
Tipo: Elevadores 
Empresa: Elevadores XPTO 
Telefone: 910000000 
Horário: 24h 
Emergência: Sim 
 
Esta informação é crítica para gestão rápida e para apoio futuro aos técnicos.
PROMPT 11 — DOCUMENTOS DO CONDOMÍNIO
Criar gestão de documentos do condomínio. 
 
Cada documento deve estar ligado ao condomínio. 
 
Campos: 
 
- título 
- tipo de documento 
- descrição 
- ficheiro 
- condomínio associado 
- bloco associado, opcional 
- zona associada, opcional 
- equipamento associado, opcional 
- data do documento 
- data de validade 
- carregado por 
- data de upload 
- versão 
- estado do documento 
- notas 
 
Tipos de documento: 
- ata 
- regulamento interno 
- seguro


## Pagina 11

- contrato 
- fatura 
- orçamento 
- planta 
- certificado 
- relatório técnico 
- fotografia 
- licença 
- garantia 
- manual técnico 
- inspeção 
- manutenção 
- outro 
 
Estados: 
- válido 
- expirado 
- em revisão 
- arquivado 
- substituído 
 
Funcionalidades: 
- upload de ficheiros 
- pesquisa 
- filtros por tipo 
- alerta para documentos expirados 
- preview quando possível 
- download 
- associação a equipamentos ou zonas 
 
Exemplos: 
- Seguro do Condomínio 2026 
- Planta da Garagem Piso -1 
- Contrato de manutenção dos elevadores 
- Relatório de inspeção elétrica 
- Manual técnico da bomba de água 
 
A página do condomínio deve mostrar documentos importantes e alertar quando documentos essenciais faltam.
PROMPT 12 — IMAGENS, PLANTAS E VISUAL DO PRÉDIO
Criar secção visual do condomínio. 
 
O objetivo é preparar o sistema para uma gestão mais visual do prédio. 
 
Campos e funcionalidades: 
 
- imagem principal do edifício 
- galeria de imagens 
- fotos da fachada 
- fotos das entradas 
- fotos da garagem 
- fotos de zonas técnicas 
- plantas 2D em PDF ou imagem 
- plantas por piso 
- planta da garagem 
- planta de emergência 
- planta técnica 
- ficheiro 3D opcional para futuro 
- referência externa de modelo 3D 
- notas visuais 
 
A imagem principal deve aparecer no cabeçalho do condomínio. 
 
As plantas devem poder ser associadas a: 
- condomínio inteiro 
- bloco 
- piso 
- zona


## Pagina 12

 
Preparar a estrutura para o futuro: 
- planta 2D interativa 
- zonas clicáveis 
- equipamentos clicáveis 
- QR codes associados a zonas 
- visualização 3D simples 
- digital twin do prédio 
 
Não implementar 3D avançado agora. 
Mas deixar campos, UI e dados preparados para essa evolução. 
 
Na interface, a aba “Visual / Planta” deve mostrar: 
- imagem principal 
- galeria 
- plantas carregadas 
- zonas associadas 
- indicação de que a visualização 3D poderá ser adicionada no futuro
PROMPT 13 — ESTADO OPERACIONAL DO CONDOMÍNIO
Criar sistema de estado operacional do condomínio. 
 
Cada condomínio deve ter um estado operacional simples e visual. 
 
Campos: 
 
- estado geral 
- nível de alerta 
- resumo operacional 
- última atualização 
- atualizado por 
- motivo do estado 
- notas internas 
 
Estados gerais: 
- normal 
- com alertas 
- em manutenção 
- crítico 
- inativo 
- desconhecido 
 
Níveis de alerta: 
- verde 
- amarelo 
- vermelho 
- cinzento 
 
Exemplos: 
Estado: Normal 
Nível: Verde 
Resumo: Condomínio sem alertas relevantes. 
 
Estado: Com alertas 
Nível: Amarelo 
Resumo: Elevador do Bloco B em manutenção. 
 
Estado: Crítico 
Nível: Vermelho 
Resumo: Fuga de água ativa na garagem. 
 
O estado operacional deve aparecer: 
- na lista de condomínios 
- no cabeçalho da página individual 
- nos cards de resumo 
 
Deve ser possível alterar manualmente o estado operacional do condomínio. 


## Pagina 13

Mais tarde, o estado poderá ser atualizado automaticamente com base em avarias, documentos expirados ou 
equipamentos críticos.
PROMPT 14 — NOTAS INTERNAS DO CONDOMÍNIO
Criar área de notas internas do condomínio.
Estas notas são para uso da equipa interna e não devem aparecer para condóminos.
Tipos de notas:
- notas gerais
- notas de acesso
- notas técnicas
- notas administrativas
- notas de comunicação
- alertas internos
- observações sensíveis
Campos da nota:
- tipo
- título
- conteúdo
- criado por
- data de criação
- última atualização
- visibilidade interna
- prioridade
- fixar no topo?
Exemplos:
- “Entrada técnica pela cave -1”
- “Condomínio sensível a atrasos de comunicação”
- “Administrador prefere contacto por email”
- “Quadro elétrico principal fica na sala técnica da garagem”
- “Evitar marcar intervenções às sextas depois das 16h”
A página do condomínio deve permitir destacar notas importantes no topo, se forem marcadas como fixadas.
As notas devem ter permissões, porque algumas podem ser apenas para gestão.
PROMPT 15 — HISTÓRICO DO CONDOMÍNIO
Criar histórico completo do condomínio. 
 
Cada alteração importante deve gerar evento no histórico. 
 
Eventos possíveis: 
- condomínio criado 
- identificação alterada 
- morada alterada 
- gestor alterado 
- estado operacional alterado 
- bloco adicionado 
- bloco editado 
- piso adicionado 
- zona adicionada 
- zona editada 
- equipamento adicionado 
- equipamento editado 
- contacto adicionado 
- contacto alterado 
- documento carregado 
- documento removido 
- planta carregada 
- imagem carregada


## Pagina 14

- nota interna adicionada 
- nota interna alterada 
 
Campos do histórico: 
- condomínio associado 
- tipo de evento 
- descrição 
- utilizador responsável 
- data e hora 
- dados anteriores 
- dados novos 
- origem da alteração 
 
A aba Histórico deve mostrar uma timeline clara. 
 
A timeline deve ser pesquisável e filtrável por: 
- tipo de evento 
- utilizador 
- data 
- entidade alterada 
 
O objetivo é garantir rastreabilidade e memória operacional do condomínio.
PROMPT 16 — COMPLETUDE DA FICHA DO CONDOMÍNIO
Criar sistema de completude da ficha do condomínio.
O sistema deve indicar se a informação do condomínio está completa ou incompleta.
Criar uma percentagem de completude baseada em campos preenchidos.
Exemplo:
Condomínio Vila Verde — 72% completo
Categorias avaliadas:
- identificação
- morada
- estrutura física
- blocos
- zonas
- equipamentos
- contactos
- documentos
- imagens/planta
- notas internas
A página deve mostrar avisos como:
- falta morada completa
- falta gestor responsável
- falta número total de frações
- não existem zonas registadas
- não existem equipamentos críticos registados
- não existe imagem principal
- não existe planta
- não existem contactos de emergência
Isto é muito útil para onboarding de novos condomínios.
Na lista principal, permitir filtro:
- dados completos
- dados incompletos
- faltam documentos
- faltam zonas
- faltam equipamentos


## Pagina 15

PROMPT 17 — FORMULÁRIO POR PASSOS PARA ADICIONAR CONDOMÍNIO
Criar formulário por passos para adicionar ou editar condomínio.
Não quero um formulário gigante numa só página.
O formulário deve ser dividido em passos:
1. Identificação
2. Morada
3. Estrutura física
4. Blocos e entradas
5. Pisos
6. Zonas
7. Equipamentos
8. Contactos
9. Documentos e imagens
10. Estado operacional
11. Notas internas
12. Revisão final
Campos obrigatórios mínimos:
- nome do condomínio
- morada
- localidade
- número total de frações
- estado do condomínio
O resto pode ser preenchido depois.
O formulário deve permitir:
- guardar rascunho
- continuar mais tarde
- saltar passos opcionais
- ver progresso
- validar campos importantes
- mostrar resumo antes de finalizar
A experiência deve ser simples, moderna e clara.
Também deve existir modo rápido:
“Criar condomínio rápido”
Campos do modo rápido:
- nome
- morada
- localidade
- total de frações
- gestor responsável
- estado
Depois o utilizador pode completar a ficha do condomínio.
PROMPT 18 — IMPORTAÇÃO DE CONDOMÍNIOS
Preparar sistema para importação simples de condomínios por CSV ou Excel. 
 
Mesmo que a importação completa não seja implementada agora, preparar a lógica/UI para isso. 
 
A importação deve aceitar campos como: 
 
- nome 
- código interno 
- tipo 
- estado 
- rua 
- número


## Pagina 16

- código postal 
- localidade 
- freguesia 
- concelho 
- distrito 
- país 
- total de frações 
- número de blocos 
- número de elevadores 
- gestor responsável 
- notas 
 
A interface deve permitir: 
- carregar ficheiro 
- mapear colunas 
- validar dados 
- mostrar erros 
- importar 
- gerar relatório de importação 
 
Casos úteis: 
- entrada inicial de muitos condomínios 
- migração de outro software 
- onboarding rápido de cliente 
 
Não precisa ser perfeito no MVP, mas a arquitetura deve permitir esta evolução.
PROMPT 19 — RELAÇÃO COM FRAÇÕES SEM ENTRAR NO MÓDULO DE
FRAÇÕES
Na página do condomínio, mostrar apenas resumo de frações sem desenvolver profundamente o módulo de frações.
Informações úteis:
- total de frações
- frações habitacionais
- frações comerciais
- garagens
- arrecadações
- frações sem proprietário associado
- frações com dados incompletos
A página individual do condomínio deve ter um card de resumo das frações.
Se o sistema já tiver frações, ligar a contagem aos dados existentes.
Se ainda não tiver, permitir guardar apenas números resumidos.
Não desenvolver agora gestão completa de proprietários ou moradores neste prompt.
Apenas preparar a entidade condomínio para se ligar a frações existentes ou futuras.
PROMPT 20 — PREPARAÇÃO PARA MAPA, QR CODES E 3D FUTURO
Preparar a estrutura do condomínio para recursos visuais futuros. 
 
Não implementar tudo agora. 
Mas criar dados e UI preparados para evolução. 
 
Preparar para: 
 
1. Mapa 
- latitude 
- longitude 
- link Google Maps 
- botão ver mapa


## Pagina 17

 
2. QR codes por zona 
- cada zona deve poder ter um identificador público 
- cada zona deve poder ter QR code associado 
- QR code deve apontar futuramente para reporte rápido de ocorrência naquela zona 
 
3. Planta 2D 
- permitir associar plantas ao condomínio, bloco ou piso 
- preparar zonas para serem associadas a coordenadas numa planta 
 
4. Modelo 3D / digital twin 
- campo opcional para ficheiro ou referência externa 3D 
- preparar equipamentos e zonas para serem clicáveis futuramente 
- não implementar visualizador 3D agora 
 
O objetivo é que a base de dados e interface não bloqueiem evolução futura para visualização avançada do 
prédio.
PROMPT 21 — UX DA LISTA E DA PÁGINA INDIVIDUAL
Melhorar a experiência visual e funcional da secção de Condomínios.
A lista principal deve deixar de parecer uma lista de registos.
Cada condomínio deve parecer uma entidade importante.
Usar componentes visuais como:
- cards modernos
- badges de estado
- indicadores de completude
- ícones discretos
- botões claros
- filtros visíveis
- pesquisa rápida
- skeleton loading
- estados vazios bem desenhados
A página individual deve ser organizada por abas.
Não mostrar tudo ao mesmo tempo.
Priorizar clareza.
No topo, mostrar sempre:
- nome
- morada
- estado operacional
- gestor
- ações principais
Ações principais:
- editar condomínio
- adicionar zona
- adicionar equipamento
- adicionar documento
- ver mapa
Evitar botões destrutivos como “apagar” muito visíveis.
A experiência deve parecer plataforma enterprise moderna, não ERP antigo.
PROMPT 22 — MODELO DE DADOS CONCEPTUAL
Criar ou adaptar o modelo de dados para suportar uma entidade Condomínio completa. 


## Pagina 18

Sem obrigar a nomes exatos de tabelas, o sistema deve suportar conceitos equivalentes a: 
 
CONDOMINIUM 
- id 
- name 
- internal_code 
- external_reference 
- type 
- subtype 
- status 
- management_start_date 
- management_end_date 
- manager_id 
- company_id 
- short_description 
- notes 
- tags 
- created_at 
- updated_at 
 
CONDOMINIUM_ADDRESS 
- condominium_id 
- street 
- number 
- lot 
- postal_code 
- locality 
- parish 
- municipality 
- district 
- country 
- latitude 
- longitude 
- google_maps_url 
- access_notes 
- technical_access_notes 
 
CONDOMINIUM_STRUCTURE 
- condominium_id 
- total_fractions 
- residential_fractions 
- commercial_fractions 
- garages_count 
- storage_units_count 
- shops_count 
- blocks_count 
- entrances_count 
- floors_above_ground 
- basements_count 
- technical_floors_count 
- elevators_count 
- stairs_count 
- parking_spaces_count 
- has_garden 
- has_pool 
- has_doorman 
- has_security 
- construction_year 
- last_renovation_year 
- common_area_estimate 
- structural_notes 
 
BLOCK 
- condominium_id 
- name 
- code 
- description 
- specific_address 
- floors_count 
- basements_count 
- fractions_count 
- elevators_count 
- stairs_count 


## Pagina 19

- operational_status 
- access_notes 
- internal_notes 
 
FLOOR 
- condominium_id 
- block_id 
- name 
- number 
- type 
- description 
- fractions_count 
- operational_status 
- notes 
 
ZONE 
- condominium_id 
- block_id 
- floor_id 
- name 
- type 
- description 
- operational_status 
- alert_level 
- qr_code_reference 
- internal_location 
- access_notes 
- technical_notes 
- image_url 
 
EQUIPMENT 
- condominium_id 
- block_id 
- floor_id 
- zone_id 
- name 
- type 
- brand 
- model 
- serial_number 
- internal_reference 
- supplier_id 
- maintenance_company 
- installation_date 
- last_maintenance_date 
- next_maintenance_date 
- maintenance_frequency 
- status 
- criticality 
- warranty_until 
- technical_notes 
 
CONDOMINIUM_CONTACT 
- condominium_id 
- type 
- name 
- company 
- role 
- phone 
- alternate_phone 
- email 
- schedule 
- service 
- is_emergency 
- priority 
- notes 
 
CONDOMINIUM_DOCUMENT 
- condominium_id 
- block_id 
- zone_id 
- equipment_id 
- title 


## Pagina 20

- type 
- description 
- file_url 
- document_date 
- expiry_date 
- uploaded_by 
- version 
- status 
- notes 
 
CONDOMINIUM_MEDIA 
- condominium_id 
- block_id 
- floor_id 
- zone_id 
- type 
- title 
- file_url 
- description 
- is_primary 
- created_at 
 
CONDOMINIUM_HISTORY 
- condominium_id 
- event_type 
- description 
- user_id 
- timestamp 
- old_data 
- new_data 
- source 
 
CONDOMINIUM_OPERATIONAL_STATUS 
- condominium_id 
- general_status 
- alert_level 
- summary 
- reason 
- updated_by 
- updated_at 
 
INTERNAL_NOTE 
- condominium_id 
- type 
- title 
- content 
- priority 
- pinned 
- visibility 
- created_by 
- created_at 
- updated_at 
 
O Codex deve adaptar isto ao estilo e arquitetura existente do projeto. 
Não precisa seguir os nomes exatamente se o projeto já tiver convenções diferentes.
PROMPT 23 — VALIDAÇÕES E REGRAS
Adicionar validações e regras para a secção Condomínios. 
 
Regras: 
 
1. Não permitir condomínio sem nome. 
 
2. Não permitir condomínio ativo sem pelo menos: 
- morada 
- localidade 
- total de frações 
- estado


## Pagina 21

 
3. Código interno deve ser único, se existir. 
 
4. Latitude e longitude devem ser opcionais. 
 
5. Documentos podem ter validade opcional. 
Se tiverem validade e estiverem expirados, mostrar alerta. 
 
6. Equipamentos críticos devem aparecer destacados. 
 
7. Zonas com estado “interditada” ou “em manutenção” devem aparecer destacadas. 
 
8. Condomínios com ficha incompleta devem mostrar aviso. 
 
9. Apagar condomínio deve ser uma ação protegida. 
Preferir arquivar em vez de apagar. 
 
10. Notas internas devem ser visíveis apenas para utilizadores autorizados. 
 
11. Histórico deve ser criado automaticamente para alterações importantes. 
 
12. Imagem principal do condomínio deve ser opcional, mas se existir deve aparecer no cabeçalho.
PROMPT 24 — ESTADOS VAZIOS E ONBOARDING
Criar bons estados vazios para a secção Condomínios.
Quando não houver condomínios:
- mostrar mensagem clara
- botão “Adicionar primeiro condomínio”
Quando um condomínio não tiver zonas:
- mostrar “Ainda não existem zonas registadas”
- botão “Adicionar zona”
Quando não tiver equipamentos:
- mostrar “Ainda não existem equipamentos registados”
- botão “Adicionar equipamento”
Quando não tiver documentos:
- mostrar “Ainda não existem documentos”
- botão “Carregar documento”
Quando não tiver imagem:
- mostrar placeholder elegante
- botão “Adicionar imagem do edifício”
Quando a ficha estiver incompleta:
- mostrar checklist do que falta
Exemplo:
Ficha do condomínio incompleta:
- falta morada completa
- falta estrutura física
- falta contacto de emergência
- falta planta
- falta imagem principal
O objetivo é guiar o utilizador a completar a informação sem o confundir.
PROMPT 25 — PROMPT FINAL CURTO PARA CORRIGIR O ECRÃ ATUAL
A página atual de Condomínios está visualmente aceitável, mas funcionalmente fraca. 
 
Quero reformular completamente a experiência da secção Condomínios.


## Pagina 22

 
Foca apenas em Condomínios. 
 
Cada condomínio deve deixar de parecer um item genérico e passar a parecer uma entidade viva do sistema. 
 
Na lista principal, mostrar condomínios com informação útil: 
- nome 
- código interno 
- morada curta 
- localidade 
- total de frações 
- blocos 
- elevadores 
- gestor responsável 
- estado operacional 
- completude da ficha 
- último evento 
- botão “Abrir condomínio” 
 
Ao abrir um condomínio, criar página individual completa com: 
- cabeçalho 
- imagem do prédio 
- morada 
- estado operacional 
- cards de resumo 
- abas organizadas 
 
Abas: 
- Visão geral 
- Identificação 
- Morada 
- Estrutura física 
- Blocos 
- Pisos 
- Zonas 
- Equipamentos 
- Contactos 
- Documentos 
- Imagens e plantas 
- Histórico 
- Estado operacional 
- Notas internas 
 
Adicionar suporte para: 
- morada completa 
- latitude/longitude 
- notas de acesso 
- estrutura física detalhada 
- blocos 
- pisos 
- zonas 
- equipamentos técnicos 
- contactos importantes 
- documentos 
- imagens 
- plantas 
- histórico 
- estado operacional 
- completude da ficha 
- preparação para mapa, QR codes, planta 2D e 3D futuro 
 
Não implementar módulo de avarias agora. 
Não implementar contabilidade agora. 
Não reconstruir autenticação. 
Apenas melhorar profundamente a entidade Condomínio e a sua gestão.
Estrutura final que o Codex deve entender


## Pagina 23

CONDOMÍNIO
├── Identificação
├── Morada e localização
├── Estrutura física
├── Blocos / entradas
├── Pisos
├── Zonas
├── Equipamentos técnicos
├── Contactos importantes
├── Documentos
├── Imagens / plantas
├── Estado operacional
├── Completude da ficha
├── Notas internas
├── Histórico
└── Preparação futura para mapa / QR / 2D / 3D
Este é o prompt completo que cobre a informação do condomínio como deve ser.
