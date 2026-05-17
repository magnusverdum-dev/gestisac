# Avarias - Prompts Originais

Este documento preserva e organiza as prompts extraidas dos tres PDFs de referencia do modulo de avarias:

- `Gestisac_Modulo_Avarias_Codex_Prompts.pdf`
- `Gestisac_Avarias_Advanced_Features_Prompts.pdf`
- `Gestisac_Advanced_Operational_Prompts.pdf`

O objetivo e manter a visao original pesquisavel no repositorio e pronta para orientar futuras iteracoes de produto, backend e frontend.

## Gestisac - Modulo De Avarias

### Visao Global Do Modulo

Estamos a expandir uma plataforma existente de gestao de condominios chamada Gestisac. A plataforma ja possui funcionalidades base relacionadas com administracao, gestao e contabilidade.

O objetivo agora e criar um modulo de avarias totalmente funcional e integrado no sistema existente. Este modulo deve funcionar como um sistema operacional de manutencao e gestao de incidentes para condominios.

O modulo deve incluir:

- Painel administrativo web para gestao e atribuicao.
- PWA para tecnicos/funcionarios.
- PWA para condominos.

Tudo deve integrar-se com o backend, autenticacao, utilizadores, permissoes e condominios ja existentes.

O sistema deve ser moderno, extremamente rapido, preparado para Androids fracos e redes lentas, com arquitetura escalavel e preparada para realtime e offline-first. A experiencia deve parecer software enterprise moderno e nao um ERP antigo.

### Funcionalidade Do Modulo De Avarias

Criar um sistema completo de gestao de avarias para condominios. Cada avaria deve funcionar como um ticket operacional inteligente.

O sistema deve permitir:

- Criacao de avarias.
- Classificacao por prioridade.
- Estados operacionais.
- Atribuicao de tecnicos.
- Historico completo.
- Uploads de imagens/videos.
- Timeline de eventos.
- Notificacoes em tempo real.
- Confirmacao de resolucao pelo condomino.
- Reabertura da avaria caso necessario.

Os estados devem refletir operacoes reais de manutencao:

- Aberta.
- Em analise.
- Atribuida.
- Em deslocacao.
- No local.
- Em reparacao.
- Aguardando material.
- Resolvida.
- Confirmada.
- Reaberta.
- Fechada.

O sistema deve manter historico completo e auditavel de todas as alteracoes.

### PWA Dos Tecnicos

Criar uma PWA operacional focada em tecnicos e funcionarios responsaveis pela resolucao das avarias. A aplicacao deve ser extremamente rapida, simples e eficiente.

A UX deve priorizar:

- Poucos cliques.
- Botoes grandes.
- Rapidez operacional.
- Utilizacao em movimento.
- Utilizacao em ambientes dificeis.

A PWA deve permitir:

- Receber tarefas.
- Aceitar tarefas.
- Visualizar detalhes completos da avaria.
- Abrir localizacao no mapa.
- Fazer check-in no local.
- Alterar estados.
- Comunicar via chat.
- Adicionar notas.
- Fazer uploads de fotos antes/depois.
- Finalizar intervencao.

A aplicacao deve funcionar offline-first. Caso nao exista internet:

- Guardar alteracoes localmente.
- Guardar uploads pendentes.
- Sincronizar automaticamente quando a ligacao regressar.

A experiencia deve parecer uma aplicacao nativa Android moderna.

### PWA Dos Condominos

Criar uma PWA simples e extremamente intuitiva para condominos. O objetivo e reduzir chamadas telefonicas e centralizar toda a comunicacao operacional.

O utilizador deve conseguir:

- Reportar avarias.
- Adicionar fotos/videos.
- Acompanhar estado em tempo real.
- Visualizar timeline.
- Receber notificacoes.
- Comunicar com gestao/tecnicos.
- Confirmar resolucao.
- Reabrir avaria caso nao esteja resolvida.

A experiencia deve ser minimalista, rapida e clara. O foco principal e simplicidade.

### Experiencia Administrativa

Expandir a plataforma administrativa existente para incluir gestao operacional de avarias.

O painel administrativo deve permitir:

- Visualizar todas as avarias.
- Filtrar por estado, prioridade e condominio.
- Atribuir tecnicos.
- Acompanhar estado em tempo real.
- Visualizar metricas.
- Visualizar SLA.
- Acompanhar equipas.
- Consultar historico completo.

A gestao deve conseguir controlar operacoes em tempo real de forma centralizada. O sistema deve parecer moderno, rapido e visualmente limpo.

### Realtime E Notificacoes

O modulo deve funcionar em tempo real. Mudancas de estado devem atualizar instantaneamente:

- Painel administrativo.
- Tecnicos.
- Condominos.

O sistema deve suportar:

- Notificacoes push.
- Atualizacao realtime.
- Chat operacional.
- Timeline live.
- Sincronizacao automatica.

O objetivo e criar sensacao de sistema vivo e operacional.

### Performance E Qualidade

Todo o modulo deve ser otimizado para:

- Performance extrema.
- Carregamento rapido.
- Androids antigos.
- Redes lentas.
- Baixo consumo de memoria.
- UX fluida.

Evitar interfaces pesadas e excesso de JavaScript desnecessario. O foco e velocidade, estabilidade, responsividade e experiencia moderna.

### Visao Futura

A arquitetura e decisoes tomadas devem preparar o sistema para futuras expansoes, incluindo:

- IA para classificacao automatica.
- Detecao automatica de prioridades.
- Manutencao preditiva.
- OCR.
- Voz para criacao de tickets.
- Integracao IoT.
- Sensores.
- Analytics avancado.

O sistema deve nascer preparado para crescer sem necessidade de reestruturacao profunda.

## Advanced UX & Enterprise Features

### Experiencia Enterprise Moderna

O modulo de avarias deve transmitir sensacao de software enterprise moderno e operacional. A experiencia visual e funcional deve lembrar plataformas modernas de operacoes e gestao em tempo real.

O objetivo e que:

- Gestores sintam controlo operacional.
- Tecnicos sintam rapidez e simplicidade.
- Condominos sintam transparencia e confianca.

Evitar aparencia de ERP antigo. Priorizar clareza, velocidade, fluidez, organizacao visual, sensacao realtime e feedback visual imediato.

### Timeline Operacional

Criar timeline operacional visual para cada avaria. A timeline deve mostrar toda a evolucao do ticket em tempo real.

Exemplo:

- Avaria reportada.
- Analisada.
- Tecnico atribuido.
- Tecnico em deslocacao.
- Tecnico chegou.
- Reparacao iniciada.
- Reparacao concluida.
- Resolucao confirmada.

A timeline deve parecer moderna, viva e extremamente clara.

### Realtime E Sensacao De Sistema Vivo

O sistema deve transmitir sensacao de atividade operacional em tempo real. Alteracoes de estado devem atualizar instantaneamente dashboards, listas, timelines, notificacoes e aplicacoes moveis.

O objetivo e criar sensacao de centro operacional moderno.

### Experiencia Dos Tecnicos

A experiencia dos tecnicos deve ser extremamente rapida e operacional. Priorizar botoes grandes, poucos cliques, acoes rapidas, leitura facil e utilizacao em ambientes dificeis.

A aplicacao deve funcionar bem em obra, com stress, em movimento, com internet fraca e em Androids antigos. O sistema deve reduzir friccao operacional ao maximo.

### Offline-First

A PWA dos tecnicos deve funcionar offline-first. Mesmo sem internet deve ser possivel visualizar tarefas, atualizar estados, adicionar notas, tirar fotos e guardar uploads.

Quando a internet regressar, deve sincronizar automaticamente, resolver conflitos e enviar uploads pendentes. A experiencia deve parecer continua e confiavel.

### Experiencia Dos Condominos

A experiencia dos condominos deve transmitir transparencia, confianca, controlo e simplicidade.

O utilizador deve perceber facilmente:

- Estado da avaria.
- Quem esta responsavel.
- Progresso da resolucao.
- Historico completo.

Evitar interfaces confusas ou demasiado tecnicas.

### Fotos Antes/Depois

O sistema deve valorizar uploads visuais e criar uma experiencia forte para fotos antes/depois, videos, comparacao visual e historico visual.

O objetivo e aumentar confianca, prova de trabalho, transparencia e qualidade percebida.

### Dashboard Operacional

Criar dashboards operacionais modernos com:

- Avarias abertas.
- Emergencias.
- Tecnicos ativos.
- SLA.
- Tempos medios.
- Atividade em tempo real.

A experiencia deve parecer um centro operacional vivo.

### Notificacoes Humanizadas

As notificacoes devem ser claras e humanas, evitando mensagens frias ou demasiado tecnicas.

Exemplos:

- Tecnico a caminho.
- Reparacao iniciada.
- Problema resolvido.
- Nova atualizacao disponivel.

O objetivo e aumentar sensacao de acompanhamento real.

### Visao Futura Enterprise

As decisoes arquiteturais devem preparar o sistema para IA, detecao automatica de prioridades, previsao de avarias, heatmaps, OCR, sensores IoT, automacao operacional e analytics avancado.

## Advanced Operational Prompts

### Modo Emergencia

Criar um modo operacional de emergencia para incidentes criticos, como fuga de agua, incendio, elevador preso, curto-circuito e falha eletrica critica.

O sistema deve:

- Destacar visualmente emergencias.
- Utilizar cores e alertas especiais.
- Mover automaticamente tickets urgentes para topo.
- Notificar tecnicos e gestores em tempo real.
- Permitir acompanhamento live da resolucao.

A experiencia deve transmitir sensacao de centro operacional profissional.

### Assinatura Digital Do Morador

Adicionar sistema de confirmacao digital da resolucao da avaria.

O morador deve conseguir:

- Confirmar resolucao.
- Rejeitar resolucao.
- Adicionar comentario final.
- Assinar digitalmente no dispositivo.

A confirmacao deve ficar registada no historico do ticket. O objetivo e aumentar transparencia e reduzir conflitos.

### Before / After Visual

Criar sistema visual de comparacao antes/depois para reparacoes.

As imagens devem:

- Aparecer integradas na timeline.
- Suportar slider visual comparativo.
- Funcionar bem em mobile.
- Carregar rapidamente.

O objetivo e demonstrar visualmente o trabalho executado.

### SLA Visual

Criar sistema visual de SLA para tickets operacionais. Cada ticket deve indicar tempo restante, proximidade do limite SLA e estado visual claro.

Exemplo:

- Verde = dentro do prazo.
- Amarelo = proximo do limite.
- Vermelho = SLA em risco.

O painel administrativo deve permitir visualizar rapidamente problemas operacionais.

### Feed Operacional Live

Criar feed operacional em tempo real com chegada de tecnicos, novas avarias, alteracoes de estado, tarefas concluidas, emergencias e confirmacoes de moradores.

O objetivo e criar sensacao de sistema vivo e altamente operacional.

### Modo Supervisor

Criar modo supervisor para acompanhamento operacional avancado.

O supervisor deve conseguir:

- Visualizar tecnicos ativos.
- Acompanhar tarefas em tempo real.
- Visualizar estado das equipas.
- Redistribuir tarefas.
- Acompanhar emergencias.
- Analisar operacoes live.

O objetivo e criar controlo operacional centralizado.

### Checklists Por Tipo De Avaria

Criar sistema de checklists operacionais dinamicas. Cada tipo de avaria pode possuir checklist propria, validacoes especificas, procedimentos obrigatorios e confirmacao de etapas.

Exemplo de eletricidade:

- Verificar disjuntor.
- Testar tensao.
- Validar seguranca.
- Confirmar reparacao.

O sistema deve ajudar tecnicos a seguir procedimentos corretamente.

### Compressao E Upload Inteligente

O sistema deve otimizar automaticamente uploads realizados por tecnicos e moradores.

Objetivos:

- Uploads rapidos.
- Baixo consumo de dados moveis.
- Funcionamento em redes lentas.
- Excelente experiencia em Androids fracos.

O sistema deve comprimir imagens automaticamente, gerar versoes otimizadas, sincronizar uploads pendentes e manter boa qualidade perceptivel.

### Historico Visual Do Condominio

Criar painel historico inteligente para condominios com avarias recorrentes, zonas problematicas, custos acumulados, frequencia de incidentes e historico operacional.

O objetivo e transformar dados operacionais em visao estrategica.

### Smart Search

Criar pesquisa inteligente operacional. O utilizador deve conseguir pesquisar naturalmente por infiltracoes, garagem, bloco, eletricidade, tecnicos, condominios e estados.

A pesquisa deve ser extremamente rapida e eficiente.

### QR Codes Operacionais

Criar sistema de QR Codes para zonas do condominio, como garagem, elevador, piscina, entrada e quadro eletrico.

Ao fazer scan, deve abrir criacao de ticket rapidamente, associar automaticamente localizacao e simplificar reporte de avarias.

O objetivo e reduzir friccao operacional.

### Chat Operacional E Historico De Comunicacao

Criar sistema de chat operacional integrado no modulo de avarias.

O sistema deve permitir:

- Comunicacao entre moradores, tecnicos e gestao.
- Envio de imagens.
- Envio de videos.
- Envio de mensagens rapidas.
- Historico completo de comunicacao.

Toda a comunicacao deve ficar associada ao ticket, condominio, morador e tecnico.

Objetivos:

- Eliminar perda de contexto.
- Evitar comunicacao dispersa em WhatsApp.
- Centralizar provas e instrucoes.
- Melhorar acompanhamento operacional.

### Perfil Operacional De Cliente

Criar sistema interno de perfil operacional de clientes. O objetivo nao e julgamento subjetivo, mas contexto operacional para melhorar atendimento e eficiencia.

O sistema deve permitir registar:

- Historico de avarias validas.
- Reincidencia de reclamacoes.
- Padroes operacionais.
- Observacoes internas.
- Comportamento recorrente.
- Situacoes confirmadas vs falsas ocorrencias.

Gestores e tecnicos autorizados devem conseguir visualizar contexto operacional relevante antes de interagir com o cliente.

As observacoes internas devem ser controladas por permissoes.
