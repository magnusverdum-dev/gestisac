# Prompt Master - Seccao Condominios Completa

Fonte: prompt enviada pelo Jose para orientar a reformulacao profunda da seccao
`Condominios` do Gestisac.

## Objetivo Global

Estamos a trabalhar numa plataforma existente chamada Gestisac, usada para
gestao de condominios.

O objetivo e melhorar apenas a seccao `Condominios`.

A pagina atual esta demasiado generica: parece uma lista de registos simples e
nao permite compreender, visualizar, organizar nem gerir verdadeiramente a
informacao de cada condominio.

Cada condominio deve deixar de ser apenas:

- Nome.
- Numero de fracoes.
- Botoes de editar/apagar.

Cada condominio deve passar a representar um predio real ou conjunto de predios,
com informacao administrativa, fisica, operacional, tecnica, visual, documental
e historica.

## Limites Da Implementacao

- Nao reconstruir o sistema todo.
- Nao recriar autenticacao.
- Nao mexer na contabilidade de forma profunda.
- Nao criar o modulo de avarias agora.
- Focar apenas na estrutura, informacao, visualizacao e gestao da entidade
  `Condominio`.

## Capacidades Esperadas

- Listar condominios de forma util.
- Pesquisar condominios.
- Filtrar condominios.
- Abrir uma pagina individual de cada condominio.
- Editar informacao completa do condominio.
- Adicionar dados fisicos, tecnicos e operacionais.
- Guardar documentos e plantas.
- Guardar contactos importantes.
- Guardar imagens do predio.
- Preparar o sistema para mapa, planta 2D, QR codes por zona e 3D/digital twin.

## Prompt 1 - Lista Principal De Condominios

A pagina principal de Condominios deve ser reformulada para ser util em gestao
real.

Deve ter:

- Titulo `Condominios`.
- Subtitulo explicativo.
- Botao `Adicionar condominio`.
- Pesquisa global.
- Filtros.
- Cards/resumo no topo.
- Lista moderna de condominios.

Cards de resumo:

- Total de condominios ativos.
- Total de fracoes.
- Condominios com alertas.
- Condominios em manutencao.
- Condominios incompletos/falta informacao.

Cada condominio na lista deve mostrar:

- Nome do condominio.
- Codigo interno.
- Morada curta.
- Localidade.
- Numero total de fracoes.
- Numero de blocos.
- Numero de elevadores.
- Gestor responsavel.
- Estado operacional.
- Nivel de alerta.
- Ultimo evento registado.
- Se tem documentos principais carregados ou nao.
- Se tem morada completa ou nao.
- Se tem estrutura fisica completa ou nao.
- Botao principal `Abrir condominio`.

A acao principal deve ser `Abrir condominio`.

Acoes secundarias:

- Editar.
- Duplicar.
- Arquivar.
- Apagar apenas se fizer sentido.

A lista deve permitir alternar entre:

- Vista em cards.
- Vista em tabela.

Filtros necessarios:

- Estado: ativo, inativo, onboarding, suspenso, arquivo.
- Tipo: residencial, comercial, misto, garagens, empreendimento.
- Localidade.
- Gestor responsavel.
- Estado operacional: normal, com alertas, manutencao, critico.
- Dados incompletos.
- Com/sem planta.
- Com/sem equipamentos registados.

Pesquisa deve encontrar por:

- Nome.
- Codigo interno.
- Rua.
- Localidade.
- Codigo postal.
- Gestor.
- Notas.

## Prompt 2 - Pagina Individual Do Condominio

Ao clicar em `Abrir condominio`, o utilizador deve entrar numa pagina dedicada
ao condominio. Esta pagina deve ser o centro de controlo daquele predio.

Cabecalho principal:

- Nome do condominio.
- Codigo interno.
- Morada completa curta.
- Estado operacional.
- Nivel de alerta.
- Gestor responsavel.
- Imagem principal do edificio, se existir.
- Botao editar.
- Botao adicionar informacao.
- Botao ver mapa.
- Botao carregar documento.
- Botao adicionar zona.
- Botao adicionar equipamento.

Cards de resumo:

- Total de fracoes.
- Blocos.
- Entradas.
- Pisos.
- Caves.
- Elevadores.
- Zonas registadas.
- Equipamentos criticos.
- Documentos.
- Contactos importantes.
- Estado operacional.

Abas:

- Visao geral.
- Identificacao.
- Morada.
- Estrutura fisica.
- Blocos.
- Pisos.
- Zonas.
- Equipamentos.
- Contactos.
- Documentos.
- Imagens e plantas.
- Historico.
- Estado operacional.
- Notas internas.
- Preparacao 3D / digital twin.

O gestor deve conseguir perceber rapidamente:

- Onde fica o condominio.
- Como esta organizado.
- Quantas fracoes tem.
- Quantos blocos tem.
- Que zonas existem.
- Que equipamentos criticos existem.
- Que documentos existem.
- Que contactos sao importantes.
- Se falta informacao importante.

## Prompt 3 - Identificacao Do Condominio

Campos necessarios:

- Nome do condominio.
- Codigo interno.
- Referencia externa.
- Tipo de condominio.
- Subtipo.
- Estado do condominio.
- Data de inicio da gestao.
- Data de fim da gestao, se aplicavel.
- Gestor responsavel.
- Equipa responsavel.
- Empresa gestora.
- Descricao curta.
- Notas administrativas.
- Tags internas.

Tipos possiveis:

- Residencial.
- Comercial.
- Misto.
- Garagens.
- Lojas.
- Empreendimento.
- Moradias em banda.
- Condominio fechado.
- Edificio unico.
- Varios blocos.
- Outro.

Estados possiveis:

- Ativo.
- Inativo.
- Em onboarding.
- Suspenso.
- Em transicao.
- Arquivo.

Tags internas:

- Cliente premium.
- Urgente.
- Dados incompletos.
- Precisa revisao.
- Sensivel a comunicacao.
- Manutencao recorrente.
- Predio antigo.
- Predio novo.
- Condominio grande.
- Condominio pequeno.

A pagina deve indicar claramente se a ficha esta completa ou incompleta.

## Prompt 4 - Morada E Localizacao

Campos necessarios:

- Rua.
- Numero.
- Lote.
- Bloco de morada.
- Codigo postal.
- Localidade.
- Freguesia.
- Concelho.
- Distrito.
- Pais.
- Latitude.
- Longitude.
- Link Google Maps.
- Link Apple Maps.
- Notas de acesso.
- Ponto de entrada principal.
- Ponto de entrada para tecnicos.
- Ponto de entrada para garagem.
- Restricoes de acesso.
- Referencia visual do local.

A pagina deve ter:

- Botao abrir no Google Maps.
- Botao copiar morada.
- Botao copiar coordenadas.
- Preview simples de mapa, se existir suporte.

Preparar para:

- Rotas de tecnicos.
- Mapa operacional.
- Calculo de proximidade.
- Geolocalizacao de tarefas.
- Check-in no local.

## Prompt 5 - Estrutura Fisica Do Condominio

Campos gerais:

- Numero total de fracoes.
- Fracoes habitacionais.
- Fracoes comerciais.
- Garagens.
- Arrecadacoes.
- Lojas.
- Blocos.
- Entradas.
- Pisos acima do solo.
- Caves.
- Pisos tecnicos.
- Elevadores.
- Escadas.
- Lugares de estacionamento.
- Jardim.
- Piscina.
- Sala de condominio.
- Casa do lixo.
- Cobertura acessivel.
- Telhado tecnico.
- Paineis solares.
- CCTV.
- Portaria.
- Porteiro.
- Seguranca.
- Ano de construcao.
- Ano de ultima reabilitacao.
- Area comum aproximada.
- Observacoes estruturais.

Exemplo de resumo esperado:

`2 blocos - 8 pisos - 2 caves - 48 fracoes - 2 elevadores - garagem comum`.

## Prompt 6 - Blocos / Entradas

Cada bloco deve ter:

- Nome do bloco.
- Codigo do bloco.
- Descricao.
- Morada especifica.
- Entrada principal.
- Numero de pisos.
- Numero de caves.
- Numero de fracoes.
- Numero de elevadores.
- Numero de escadas.
- Numero de garagens associadas.
- Estado operacional do bloco.
- Notas de acesso.
- Notas internas.

O sistema deve permitir adicionar, editar, arquivar e reorganizar blocos.

O bloco deve poder estar ligado a:

- Pisos.
- Zonas.
- Equipamentos.
- Documentos.
- Imagens.
- Notas.

## Prompt 7 - Pisos

Campos por piso:

- Nome do piso.
- Numero do piso.
- Bloco associado.
- Tipo de piso.
- Descricao.
- Numero de fracoes nesse piso.
- Zonas nesse piso.
- Estado operacional.
- Notas internas.

Tipos:

- Habitacao.
- Garagem.
- Arrecadacoes.
- Comercial.
- Tecnico.
- Cobertura.
- Telhado.
- Exterior.
- Cave.
- Res do chao.
- Outro.

## Prompt 8 - Zonas Do Condominio

Cada zona deve ter:

- Nome da zona.
- Tipo de zona.
- Condominio associado.
- Bloco associado.
- Piso associado.
- Descricao.
- Estado operacional.
- Nivel de alerta.
- QR code associado/preparado.
- Localizacao interna.
- Notas de acesso.
- Notas tecnicas.
- Imagem da zona.
- Planta associada.

Tipos de zona incluem entrada principal, hall, escadas, corredor, elevador,
garagem, arrecadacoes, sala de condominio, casa do lixo, jardim, piscina,
cobertura, telhado, quadro eletrico, casa das maquinas, portao,
intercomunicador, CCTV, zona tecnica, exterior, estacionamento, portaria e
outro.

Estados:

- Operacional.
- Com alerta.
- Em manutencao.
- Interditada.
- Inativa.

Preparar cada zona para:

- QR code fisico.
- Planta 2D clicavel.
- Modelo 3D clicavel.
- Avarias associadas no futuro.

## Prompt 9 - Equipamentos Importantes

Cada equipamento deve ter:

- Nome.
- Tipo.
- Condominio associado.
- Bloco associado.
- Piso associado.
- Zona associada.
- Marca.
- Modelo.
- Numero de serie.
- Referencia interna.
- Fornecedor associado.
- Empresa de manutencao.
- Data de instalacao.
- Data da ultima manutencao.
- Data da proxima manutencao.
- Periodicidade de manutencao.
- Estado atual.
- Nivel critico.
- Notas tecnicas.
- Documentos associados.
- Imagens associadas.
- Garantia ate.
- Contrato associado.

Tipos incluem elevador, bomba de agua, portao automatico, quadro eletrico,
sistema de incendio, CCTV, intercomunicador, iluminacao comum, painel solar,
sistema de rega, piscina, caldeira, ventilacao, exaustao, porta automatica,
antena, rede informatica, contador geral, sistema de acesso e outro.

## Prompt 10 - Contactos Importantes

Cada contacto deve ter:

- Tipo de contacto.
- Nome.
- Empresa.
- Cargo/funcao.
- Telefone principal.
- Telefone alternativo.
- Email.
- Horario de contacto.
- Servico associado.
- Indicacao de emergencia.
- Prioridade.
- Notas internas.
- Documento ou contrato associado.

A seccao deve permitir:

- Pesquisar contacto.
- Filtrar por tipo.
- Marcar favoritos.
- Marcar emergencia.
- Copiar telefone.
- Copiar email.
- Abrir chamada em mobile.
- Abrir email.

## Prompt 11 - Documentos Do Condominio

Campos:

- Titulo.
- Tipo de documento.
- Descricao.
- Ficheiro.
- Condominio associado.
- Bloco associado.
- Zona associada.
- Equipamento associado.
- Data do documento.
- Data de validade.
- Carregado por.
- Data de upload.
- Versao.
- Estado do documento.
- Notas.

Funcionalidades:

- Upload de ficheiros.
- Pesquisa.
- Filtros por tipo.
- Alerta para documentos expirados.
- Preview quando possivel.
- Download.
- Associacao a equipamentos ou zonas.

## Prompt 12 - Imagens, Plantas E Visual Do Predio

Campos e funcionalidades:

- Imagem principal do edificio.
- Galeria de imagens.
- Fotos da fachada.
- Fotos das entradas.
- Fotos da garagem.
- Fotos de zonas tecnicas.
- Plantas 2D em PDF ou imagem.
- Plantas por piso.
- Planta da garagem.
- Planta de emergencia.
- Planta tecnica.
- Ficheiro 3D opcional.
- Referencia externa de modelo 3D.
- Notas visuais.

Preparar para:

- Planta 2D interativa.
- Zonas clicaveis.
- Equipamentos clicaveis.
- QR codes associados a zonas.
- Visualizacao 3D simples.
- Digital twin do predio.

Nao implementar 3D avancado agora.

## Prompt 13 - Estado Operacional Do Condominio

Campos:

- Estado geral.
- Nivel de alerta.
- Resumo operacional.
- Ultima atualizacao.
- Atualizado por.
- Motivo do estado.
- Notas internas.

Estados gerais:

- Normal.
- Com alertas.
- Em manutencao.
- Critico.
- Inativo.
- Desconhecido.

Niveis de alerta:

- Verde.
- Amarelo.
- Vermelho.
- Cinzento.

O estado operacional deve aparecer na lista, cabecalho e cards de resumo.

## Prompt 14 - Notas Internas Do Condominio

Notas internas nao devem aparecer para condominos.

Campos:

- Tipo.
- Titulo.
- Conteudo.
- Criado por.
- Data de criacao.
- Ultima atualizacao.
- Visibilidade interna.
- Prioridade.
- Fixar no topo.

As notas devem ter permissoes.

## Prompt 15 - Historico Do Condominio

Cada alteracao importante deve gerar evento no historico.

Eventos incluem:

- Condominio criado.
- Identificacao alterada.
- Morada alterada.
- Gestor alterado.
- Estado operacional alterado.
- Bloco/piso/zona/equipamento/contacto/documento/nota adicionados ou alterados.
- Documento removido.
- Planta carregada.
- Imagem carregada.

Campos do historico:

- Condominio associado.
- Tipo de evento.
- Descricao.
- Utilizador responsavel.
- Data e hora.
- Dados anteriores.
- Dados novos.
- Origem da alteracao.

A timeline deve ser pesquisavel e filtravel.

## Prompt 16 - Completude Da Ficha

Criar percentagem de completude baseada em campos preenchidos.

Categorias:

- Identificacao.
- Morada.
- Estrutura fisica.
- Blocos.
- Zonas.
- Equipamentos.
- Contactos.
- Documentos.
- Imagens/planta.
- Notas internas.

Avisos esperados:

- Falta morada completa.
- Falta gestor responsavel.
- Falta numero total de fracoes.
- Nao existem zonas registadas.
- Nao existem equipamentos criticos registados.
- Nao existe imagem principal.
- Nao existe planta.
- Nao existem contactos de emergencia.

## Prompt 17 - Formulario Por Passos

Passos:

1. Identificacao.
2. Morada.
3. Estrutura fisica.
4. Blocos e entradas.
5. Pisos.
6. Zonas.
7. Equipamentos.
8. Contactos.
9. Documentos e imagens.
10. Estado operacional.
11. Notas internas.
12. Revisao final.

Campos obrigatorios minimos:

- Nome do condominio.
- Morada.
- Localidade.
- Numero total de fracoes.
- Estado do condominio.

Deve permitir:

- Guardar rascunho.
- Continuar mais tarde.
- Saltar passos opcionais.
- Ver progresso.
- Validar campos importantes.
- Mostrar resumo antes de finalizar.
- Criar condominio rapido.

## Prompt 18 - Importacao De Condominios

Preparar importacao por CSV ou Excel.

Campos aceites:

- Nome.
- Codigo interno.
- Tipo.
- Estado.
- Rua.
- Numero.
- Codigo postal.
- Localidade.
- Freguesia.
- Concelho.
- Distrito.
- Pais.
- Total de fracoes.
- Numero de blocos.
- Numero de elevadores.
- Gestor responsavel.
- Notas.

Interface:

- Carregar ficheiro.
- Mapear colunas.
- Validar dados.
- Mostrar erros.
- Importar.
- Gerar relatorio.

## Prompt 19 - Relacao Com Fracoes

Mostrar apenas resumo de fracoes, sem desenvolver profundamente o modulo de
fracoes.

Informacao util:

- Total de fracoes.
- Fracoes habitacionais.
- Fracoes comerciais.
- Garagens.
- Arrecadacoes.
- Fracoes sem proprietario associado.
- Fracoes com dados incompletos.

## Prompt 20 - Preparacao Para Mapa, QR Codes E 3D

Preparar para:

- Mapa com latitude, longitude, link Google Maps e botao ver mapa.
- QR codes por zona com identificador publico.
- Planta 2D associada a condominio, bloco ou piso.
- Zonas associadas a coordenadas numa planta.
- Modelo 3D/digital twin com ficheiro ou referencia externa.

Nao implementar visualizador 3D agora.

## Prompt 21 - UX Da Lista E Pagina Individual

Usar:

- Cards modernos.
- Badges de estado.
- Indicadores de completude.
- Icones discretos.
- Botoes claros.
- Filtros visiveis.
- Pesquisa rapida.
- Skeleton loading.
- Estados vazios bem desenhados.

A pagina individual deve ser organizada por abas e priorizar clareza.

No topo mostrar sempre:

- Nome.
- Morada.
- Estado operacional.
- Gestor.
- Acoes principais.

Evitar botoes destrutivos muito visiveis.

## Prompt 22 - Modelo De Dados Conceptual

O sistema deve suportar conceitos equivalentes a:

- `CONDOMINIUM`.
- `CONDOMINIUM_ADDRESS`.
- `CONDOMINIUM_STRUCTURE`.
- `BLOCK`.
- `FLOOR`.
- `ZONE`.
- `EQUIPMENT`.
- `CONDOMINIUM_CONTACT`.
- `CONDOMINIUM_DOCUMENT`.
- `CONDOMINIUM_MEDIA`.
- `CONDOMINIUM_HISTORY`.
- `CONDOMINIUM_OPERATIONAL_STATUS`.
- `INTERNAL_NOTE`.

O Codex deve adaptar nomes e estrutura ao estilo existente do projeto.

## Prompt 23 - Validacoes E Regras

Regras:

- Nao permitir condominio sem nome.
- Nao permitir condominio ativo sem morada, localidade, total de fracoes e estado.
- Codigo interno deve ser unico, se existir.
- Latitude e longitude opcionais.
- Documentos expirados devem gerar alerta.
- Equipamentos criticos devem aparecer destacados.
- Zonas interditadas ou em manutencao devem aparecer destacadas.
- Condominios com ficha incompleta devem mostrar aviso.
- Apagar condominio deve ser acao protegida; preferir arquivar.
- Notas internas devem ser visiveis apenas a utilizadores autorizados.
- Historico deve ser criado automaticamente para alteracoes importantes.
- Imagem principal opcional, mas deve aparecer no cabecalho se existir.

## Prompt 24 - Estados Vazios E Onboarding

Estados vazios esperados:

- Sem condominios: mensagem clara e botao `Adicionar primeiro condominio`.
- Sem zonas: mensagem clara e botao `Adicionar zona`.
- Sem equipamentos: mensagem clara e botao `Adicionar equipamento`.
- Sem documentos: mensagem clara e botao `Carregar documento`.
- Sem imagem: placeholder elegante e botao `Adicionar imagem do edificio`.
- Ficha incompleta: checklist do que falta.

## Prompt 25 - Prompt Final Curto

Reformular profundamente a experiencia da seccao `Condominios`.

Na lista principal, mostrar:

- Nome.
- Codigo interno.
- Morada curta.
- Localidade.
- Total de fracoes.
- Blocos.
- Elevadores.
- Gestor responsavel.
- Estado operacional.
- Completude da ficha.
- Ultimo evento.
- Botao `Abrir condominio`.

Ao abrir um condominio, criar pagina individual com:

- Cabecalho.
- Imagem do predio.
- Morada.
- Estado operacional.
- Cards de resumo.
- Abas organizadas.

Adicionar suporte para morada completa, coordenadas, notas de acesso, estrutura
fisica, blocos, pisos, zonas, equipamentos, contactos, documentos, imagens,
plantas, historico, estado operacional, completude, mapa, QR codes, planta 2D e
3D futuro.

Nao implementar avarias, contabilidade ou autenticacao nesta frente.
