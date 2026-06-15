# GC Software - Levantamento funcional

Fontes públicas consultadas:

- [Página de preços oficial](https://www.gcsoftware.pt/pricing/)
- [Documentação oficial](https://docs.gcsoftware.pt/)
- [Lista de links das aplicações](https://docs.gcsoftware.pt/general/links-apps/)
- [GC BackOffice no Google Play](https://play.google.com/store/apps/details?id=pt.gcsoftware.backoffice)
- [GC Condóminos no Google Play](https://play.google.com/store/apps/details?id=pt.gcsoftware.condominos)
- [GC Técnicos no Google Play](https://play.google.com/store/apps/details?id=pt.gcsoftware.tecnicos)

Nota:

- O URL público `https://www.gcsoftware.pt/backoffice/?demo=1` abre a página de login.
- A sessão de demonstração está funcional e expõe o menu principal do backoffice.
- Por isso, este levantamento foi consolidado a partir da documentação oficial, página de preços, listagens das aplicações e confirmação direta do demo.

## 1. Visão geral do produto

O GC é um software de gestão de condomínios com:

- BackOffice principal para administração
- App / portal para condóminos
- App / portal para técnicos
- Módulos de tesouraria, contabilidade, assembleias, manutenção, contencioso e comunicação
- Integração com email, banking, PDFs, Word Add-in e autenticação em duas etapas
- Funcionalidades opcionais de Inteligência Artificial

## 2. Estrutura comercial e posicionamento

Planos públicos:

- Home Edition: 1 condomínio, 1 utilizador, até 85 frações, €200/ano
- Startup: até 100 frações, €59/mês ou €590/ano
- Small Business: até 200 frações, €99/mês ou €990/ano
- Professional: até 600 frações, €139/mês ou €1390/ano
- Enterprise: até 1000 frações, €169/mês ou €1690/ano

Inclui, conforme o plano:

- Condomínios e utilizadores ilimitados
- BackOffice + App Mobile
- Relatórios personalizáveis
- Upload de ficheiros
- Funcionalidades avançadas
- Add-In do Word
- Portal de Condóminos
- Portal / App de Técnicos
- Módulo de Avarias
- Módulo de Contencioso
- Módulo de Integrações Fiscais

## 3. Módulos principais do BackOffice

### 3.0 Mapa do menu confirmado no demo

Menu principal visível no backoffice:

- Administração
- CRM Comercial
- Condomínios
- Frações
- Entidades
- Obrigações Declarativas
- Seguros
- Contabilidade
- Tesouraria
- Avarias
- Assembleias
- Correspondência

Submenus confirmados no demo:

- Administração
  - Empresa
  - Utilizadores
  - Permissões
  - Parâmetros
  - E-Mail
    - Contas de Envio
    - Documentos
    - Templates
  - SMS
    - Configuração
    - Encomendas
  - IA
    - Funcionalidades
    - Chat Externo
    - Respostas Automáticas
    - Subscrição
    - Consumos
    - Conversas
  - Newsletters
  - Tabelas
  - Registo de Atividade
  - Relatórios
- CRM Comercial
  - Planos/Serviços
  - Tabela de Preços
  - Pedidos de Orçamento
- Condomínios
  - Condomínios
  - Histórico Consolidado
  - Inquéritos
  - Relatórios
- Frações
  - Frações
  - Relatórios
- Entidades
  - Condóminos
  - Atualização de Dados
  - Convidar para o Portal
  - Relatórios
  - Fornecedores
  - Relatórios
  - Funcionários do Condomínio
  - Funcionários Associados ao Condomínio
  - Ausências
  - Férias
  - Horas Trabalhadas
  - Processamento de Salários e Avenças
  - Consulta de Recibos
  - Relatórios
  - RGPD
  - Acessos aos Dados de Condóminos
  - Anonimizar Condóminos
  - Relatórios
- Obrigações Declarativas
  - Relatórios
- O módulo de obrigações declarativas inclui documentos e relatórios como:
  - Declaração de Não Dívida
  - Declaração de IRS (Condomínio)
  - Declaração de Retenção na Fonte (Prediais)
  - Atualização de Rendas
  - Listagem de Rendimentos Prediais
- Seguros
  - Seguros do Condomínio
  - Seguros Individuais
  - Simulador de Orçamentos
    - Criar Simulação
    - Consultar/Anular Simulação
  - Processamento de Seguro
    - Processar Seguro
    - Consultar/Anular Seguro
  - Alertas
  - Relatórios
- No ecrã de seguros do condomínio existem:
  - tipo de seguro
  - apólice
  - seguradora
  - mediador
  - capital seguro
  - periodicidade de pagamento à seguradora
  - data de início
  - data de renovação
  - data de fim
  - observações
- No separador de orçamento do seguro existem:
  - opção de fazer parte do orçamento
  - opção de centro de custo à parte
  - indicação se a quota é incluída ou lançada à parte
- No separador de pagamentos do seguro existem:
  - número de recibo
  - data de início
  - data de fim
  - prémio
  - ficheiro
- Contabilidade
  - Estrutura contabilística e relatórios
- Tesouraria
  - Recibos
    - Processar Recibo
    - Editar Recibo
    - Consultar Recibo
  - Recebimento de Desconhecidos
  - Avisos de Cobrança
    - Processamento Manual
    - Processamento Automático
  - Alertas
  - Relatórios
- Avarias
  - Produtos
  - Contratos de Manutenção
  - Locais de Manutenção
  - Plano de Rotas
  - Rotas
  - Inspeções Periódicas
  - Tarefas
  - Relatórios
- Assembleias
  - Agenda de Assembleias
  - Votações
  - Convocatórias
  - Emissão de Convocatórias
  - Comprovativos de Envios
  - Atas
  - Envio de Atas
  - Add-In do Word
  - Relatórios
- Correspondência
  - E-Mail
    - Enviar para o Condomínio
    - Enviar para Condóminos
    - Enviar para Frações
    - Enviar para Fornecedores
  - SMS
    - Enviar para o Condomínio
    - Enviar para Fração
    - Envio Direto
  - Consulta de Documentos Enviados
  - Relatórios

### 3.1 Configuração inicial e administração

- Registo inicial do condomínio
- Importação de dados por Excel
- Assistente passo a passo para onboarding
- Configuração do sistema
- Gestão da empresa, contactos, administrador, serviços e imagens
- Configuração de parâmetros do sistema
- Gestão de utilizadores
- Serviço de SMS
- Newsletters
- Autenticação em duas etapas

### 3.2 Condomínios, frações e entidades

- Criação e administração de condomínios
- Alteração do período fiscal
- Inativar ou eliminar condomínios mantendo histórico
- Gestão de frações
- Transferência de quotas e proprietário
- Conceitos de permilagem
- Conceito de inquilino e arrendatário
- Fração de arrendamento
- Contactos de SOS
- A ficha de condomínio inclui separadores operacionais para:
  - dados principais
  - contas bancárias
  - BI do condomínio
  - cobranças
  - ficheiros
  - localização no mapa
- Na ficha de condomínio é possível gerir:
  - código, NIF, descrição, morada, porta, código postal, localidade, distrito, concelho, freguesia e dados fiscais
  - gestor, administrativo e local de cobrança
  - periodicidade das quotas e do fundo comum de reserva
  - formato da permilagem
  - tipo de leitura de manutenção
  - estado do condomínio
  - extrato bancário, história do condomínio, frações, condóminos, seguros e tarefas
- No separador de contas bancárias do condomínio existe gestão de:
  - ordem
  - conta bancária
  - tipo de conta
  - banco
  - SWIFT
  - filtragem por ativos, inativos e todos
- No separador de cobranças do condomínio existe configuração de:
  - pagamentos eletrónicos por Multibanco, MB Way e Payshop
  - chave API da entidade de pagamentos
  - débito direto interno
  - opção de quem paga
  - notificações configuradas
  - processamento automático de avisos de cobrança
  - data limite de pagamento
  - mês e dia de vencimento
  - número de casas decimais para mapas
  - cálculo do fundo comum de reserva
  - percentagem do FCR
  - administração total
  - permilagem auxiliar
  - zonas
  - alojamento local
- No separador de ficheiros do condomínio há gestão de:
  - tipo de ficheiro
  - ficheiro
  - notas
- O separador BI do condomínio permite gerir:
  - ano de construção
  - número de pisos
  - tipo de cobertura
  - contadores individuais
  - equipamento e quantidade
  - área de implantação
  - área total de construção
  - valor de reconstrução
  - partes comuns
  - percentagem de partes comuns
- A ficha de fração inclui:
  - número da fração, bloco, piso e porta
  - permilagem real e ponderada
  - tipo de fração
  - arrendamento
  - fração administrada
  - locatário
  - alojamento local
  - proprietários
  - arrendatários
  - outras localizações
  - contadores
  - ficheiros
- A ficha de fração permite ainda gerir:
  - permilagem
  - tipo de contador
  - quem paga
  - relação com seguro e entidade
- O módulo de frações inclui ainda:
  - proprietários
  - arrendatários
  - outras localizações
  - contadores
  - ficheiros
- Os condóminos têm:
  - atualização de dados
  - convite para o portal
  - relatórios
- A ficha de condómino inclui:
  - pesquisa por código e nome
  - separadores de principal, moradas, contactos, informação bancária e ficheiros
  - ligação às frações do condómino
  - primeiro titular e segundo titular
  - foto, data de nascimento, contribuinte, cartão de cidadão, segurança social, saúde e passaporte
  - ativação do portal/app móvel
  - permissão para ver todos os condóminos no portal
  - autenticação em duas etapas
  - emissão de correspondência
  - conta corrente
  - abertura de ocorrência
  - filtragem por condomínio
  - cópia de dados
  - cancelamento de débito direto
  - ligações inativas
- No separador de contactos do condómino há:
  - contactos úteis
  - envio de correspondência por email, SMS, telefone e carta
  - configuração de correspondência registada, correio normal e depósito em caixa de correio
  - e-mail e telefone de envio
  - idioma preferencial
  - consentimentos RGPD
  - preferência de convocatória, atas, relatórios de contas, avisos de cobrança e recibos
  - disponibilidade para assembleia eletrónica
  - assinatura digital da ata
- No separador de informação bancária do condómino há:
  - gestão de contas bancárias
  - NIB, IBAN, tipo de conta e débito direto
  - descrição do extrato bancário
  - banco, balcão e SWIFT
  - autorização de débito direto
- O módulo de funcionários do condomínio inclui:
  - funcionários associados
  - ausências
  - férias
  - horas trabalhadas
  - processamento de salários e avenças
  - consulta de recibos
- O RGPD inclui:
  - acessos aos dados dos condóminos
  - anonimização de condóminos

### 3.3 Orçamentos e quotas

- Criar orçamentos por assistente
- Distribuição de custos por estrutura de orçamento
- Lançar quotas
- Coimas / penalidades
- Permilagem vs orçamento
- Eliminação de quotas
- Dívidas incobráveis
- Rendimentos
- Carregamento de carro elétrico
- Sugestões de orçamento com apoio de IA

### 3.4 Tesouraria

- Avisos de cobrança manuais
- Avisos de cobrança automáticos
- Recibos
- Nota de crédito de condómino
- Pagamentos de desconhecidos
- Quotas ausentes nos avisos de cobrança
- Fluxo de emissão e envio por email
- Impressão e envio por CTT quando aplicável
- No módulo de recibos existem operações para:
  - processar recibo
  - consultar recibo
  - gerar recibo eletrónico
  - eliminar recibo
  - impressão de seguida
- No módulo de avisos de cobrança existem operações para:
  - processar avisos de cobrança
  - consultar aviso de cobrança
  - eliminar avisos de cobrança
- O módulo inclui ainda:
  - recebimento de desconhecidos
  - alertas
  - relatórios
  - gestão de caixa
  - diário de caixa
  - transferências
- No ecrã de consulta de recibos existem filtros por:
  - referência
  - número de recibo
  - condomínio
  - id de pagamento eletrónico
  - transação
  - cabeçalho
  - condómino
  - modo de pagamento
  - data do documento
  - valor
  - data do recibo
- No ecrã de processamento de avisos de cobrança existem:
  - filtro por condomínio
  - ano
  - mês
  - seleção de todos os condóminos, apenas um condómino ou apenas uma fração
  - filtro de condóminos ativos, inativos ou todos
  - tipos de quota
  - data de emissão
  - limite de pagamento
  - débitos a partir de
  - débitos até
  - saldo anterior agrupado ou detalhado
  - descrição do saldo anterior
  - descrição no cabeçalho
  - envio de email
  - anexo adicional ao email

### 3.5 Contabilidade

- Lançamento de juros bancários
- Adiantamento por condómino
- Pagamentos a fornecedor
- Notas de crédito de fornecedor
- Anular faturas de fornecedores
- Anular pagamento de fatura de fornecedor
- Correção de valores em mapas
- Fecho e reabertura do exercício
- Gerir saldo do fundo de reserva
- Transferências de caixa (conta 115)
- Talões de depósito
- Condómino pagou fatura de fornecedor
- Indemnizações de seguros
- O módulo de contabilidade inclui ainda:
  - documentos contabilísticos
  - faturas de fornecedor
  - processamento de fatura de fornecedor
  - processamento de faturas de fornecedor em lote
  - processamento de fatura de consumo
  - pagamento de fatura de fornecedor
  - processamento de fatura de produtos de limpeza
- Os relatórios contabilísticos confirmados no menu incluem:
  - Relatório de Contas Unificado
  - Capa do Relatório de Contas
  - Resumo das Contas
  - Balancete Analítico
  - Demonstração de Resultados
  - Balanço
  - Resultados Mensais
  - Balancete de Fornecedores
  - Balancete de Condóminos
  - Relatório de Contas Completo
  - Relatório de Contas Simplificado I
  - Relatório de Contas Simplificado II
  - Verbete Contabilístico
  - Contas SNC
  - Rúbricas
  - Balancete de Condóminos (Obras)
  - Edifícios por Fechar
  - Edifícios Fechados
  - CTT
  - Proveitos
  - Despesas com Fornecedores
  - Despesas com Fornecedores - Recibos Verdes
  - Despesas - Recibos Verdes
  - Despesas
  - Gráficos
  - Extrato de Lançamentos
  - Condomínios com diferenças de saldos
  - Frações com diferenças de saldos
  - Extrato de FCR

### 3.6 Assembleias

- Agendar assembleias
- Lista de presenças preenchida automaticamente após convocatória
- Enviar convocatórias
- Envio de atas
- Registo de entradas e votações
- Add-In do Word para atas, cartas e templates
- Exportação e envio automático de documentação

### 3.7 Correspondência e documentos

- Consulta de documentos enviados
- Registo coletivo
- Declaração de não dívida
- Mensagens e alertas
- Saldos do extrato de conta
- Controlos de consulta e rastreabilidade dos documentos enviados
- O módulo de correspondência inclui ainda:
  - explicação da elaboração de cartas
  - elaboração de templates de documentos
  - processamento de documentos
  - envio de email para condomínio, condóminos, frações e fornecedores
  - envio de SMS para condomínio, fração e envio direto
- No ecrã de envio de email para o condomínio existem:
  - seleção de condomínio
  - assunto
  - mensagem com editor rico
  - anexos 1, 2 e 3
  - revisão com IA
- No ecrã de envio de SMS para o condomínio existem:
  - seleção de condomínio
  - mensagem
  - contador de caracteres disponíveis
  - revisão com IA
- A consulta de documentos enviados mostra:
  - condomínio
  - pesquisa
  - número
  - data
  - hora
  - tipo
  - número do documento
  - expedição
  - info
  - ficheiros adicionais

### 3.8 Manutenção e avarias

- Produtos de armazém
- Contratos de manutenção
- Locais de manutenção
- Plano de rotas
- Rotas
- Inspeções periódicas
- Tarefas
- Relatórios
- Gestão de stock em armazém
- Associação de produtos a utilizadores
- Quantidade em stock

### 3.9 Assembleias

- Agenda de assembleias
- Assembleia digital
- Ordens de trabalho
- Lista de presenças
- Número, exercício, tipo de assembleia, local, data e hora
- Segunda convocatória com dias e tempo
- Assembleia adiada
- Gestor e assessor
- Upload de ata, relatório de contas e orçamento
- Presenças com:
  - fração
  - letra
  - bloco
  - piso
  - porta
  - permilagem
  - votação
  - presente
  - procurador
  - respondido
  - nome do procurador
  - presença online
  - upload de procuração
- Totais automáticos:
  - presentes
  - procuradores
  - total

### 3.10 Comunicação por email

- Contas de envio
- Configuração Gmail simplificada com 2FA e app password
- Envio automático de emails
- Conta de email específica por condomínio

### 3.11 Integrações e ficheiros

- Open Banking
- Integração automática com extratos bancários
- Reconciliação e conferência automática
- Integração com drives cloud
- Dropbox
- Google Drive
- Instalação do software em desktop / modo PWA

### 3.12 Segurança e conformidade

- Verificação em duas etapas
- Gestão de permissões por perfil
- Email único por utilizador
- Rastreio de envios e visualizações
- Módulo RGPD com anonimização e controlo de acessos a dados pessoais

### 3.13 Inteligência Artificial

- Melhorar emails automaticamente
- Descrever ocorrências automaticamente a partir de fotografias
- Gerar sugestões de orçamento
- Assistente para condóminos
- Chat externo no website
- No backoffice, a IA pode ser ativada por módulos e canais:
  - Portal de Condóminos
  - Chat Externo da Empresa
  - Backoffice
  - Portal de Técnicos
- Controlos visíveis no backoffice:
  - IA avançada ativa
  - Assistente com IA generativa
  - Revisão de e-mails
  - Revisão de SMS
  - Descrição automática de ocorrências por imagem
  - Permitir orçamentar valores para um novo orçamento
- O backoffice mostra também o plano de IA e o consumo disponível

## 4. Portal / App de Condóminos

Funcionalidades publicamente listadas:

- Consulta de conta e situação do condomínio
- Consulta de recibos
- Consulta de avisos / faturação
- Consulta de despesas e documentos
- Consulta de extratos e informação financeira
- Consulta de regulamentos e formas de pagamento
- Consulta de notícias e comunicações da administração
- Participação em assembleias
- Votação digital
- Reporte de ocorrências com fotografia
- Acompanhamento do estado das ocorrências
- Atualização de dados pessoais
- Alteração de password
- Assistente / apoio por IA
- Idiomas PT / EN / ES
- Modo claro e escuro

## 5. Portal / App de Técnicos

Funcionalidades publicamente listadas:

- Dashboard com rotas de manutenção
- Agenda diária com tarefas
- Consulta de intervenções pendentes
- Fecho de intervenções
- Reporte de nova ocorrência
- Consulta das ocorrências em que o técnico interveio
- Confirmação de intervenção por QR Code
- Confirmação de intervenção por NFC
- Gestão de locais de manutenção por QR / NFC
- Funciona como web app instalável
- Idiomas PT / EN / ES
- Modo claro e escuro

## 6. Funcionalidades de suporte operacional

- Base de conhecimento / documentação oficial
- Manual da app mobile de técnicos
- Boas práticas para configuração de email
- Fluxos guiados para início de utilização
- Importação por Excel
- Upload e gestão de documentos
- Relatórios e mapas personalizáveis
- Suporte a PDFs e visualização em dispositivos móveis

## 7. Leitura estratégica

O GC não é apenas um software básico de condomínio. Pelo que está publicamente documentado, é uma plataforma madura com:

- Núcleo administrativo
- Tesouraria e contabilidade robustas
- Comunicação automatizada
- Portais para condóminos e técnicos
- Módulos específicos para manutenção e contencioso
- Integrações bancárias e fiscais
- Apoio de IA

Isto significa que, para competir, um MVP precisa pelo menos cobrir o essencial de:

- condomínios
- frações
- quotas
- avisos de cobrança
- recibos
- assembleias
- comunicação
- manutenção
- reconciliação bancária básica

## 8. Limites deste levantamento

Este documento foi feito com base em fontes públicas oficiais. Onde a interface pública não estava diretamente acessível, os módulos foram confirmados por:

- documentação oficial
- listagens oficiais das apps
- página de preços

Para uma auditoria ainda mais fina, o próximo passo ideal é:

- abrir sessão no backoffice com credenciais de demonstração
- mapear menus, submenus e fluxos reais
- comparar cada ecrã com os módulos abaixo
