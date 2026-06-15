# GESTISAC - Roteiro de demo

Data de preparacao: 10/06/2026

## Objetivo da demo

Mostrar que o GESTISAC ja organiza a operacao diaria em seis janelas principais, separa perfis de utilizador e cria base para validar requisitos de contrato.

## Ordem recomendada

### 1. Abrir HQ

- Clique/acao: Entrar em https://gestisac-web.vercel.app/hq/login e confirmar que a sessao de demonstracao abre sem escrever credenciais.
- Mensagem-chave: A entrada sem friccao serve para demonstracao, desenvolvimento e smoke tests; producao real mantem controlo de acesso.

### 2. Hoje / Dashboard

- Clique/acao: Mostrar indicadores, prioridades e os quatro cartoes/resumos principais.
- Mensagem-chave: Esta e a mesa de comando: a administracao ve o que precisa de atencao antes de entrar no detalhe.

### 3. Condominios

- Clique/acao: Abrir a lista, selecionar um condominio e mostrar o painel lateral.
- Mensagem-chave: O condominio deixa de ser uma ficha isolada: liga pedidos, tarefas, agenda, documentos e equipa.

### 4. Pedidos

- Clique/acao: Selecionar um pedido, ver estado, responsavel e historico.
- Mensagem-chave: O pedido passa a ter vida operacional: entra, e triado, atribuido, executado, validado e fica registado.

### 5. Equipa

- Clique/acao: Abrir a equipa e selecionar um membro.
- Mensagem-chave: A administracao consegue perceber carga de trabalho, validacoes pendentes e distribuicao do dia.

### 6. Tarefas

- Clique/acao: Filtrar por Hoje/Em curso/Validacao/Atrasadas.
- Mensagem-chave: Tarefas nao e uma tabela nova; e uma vista operacional sobre trabalho real ja existente.

### 7. Agenda

- Clique/acao: Mostrar proximos eventos e ligacoes.
- Mensagem-chave: A agenda transforma tarefas e pedidos em planeamento visivel.

### 8. Worker

- Clique/acao: Abrir https://gestisac-web.vercel.app/worker/login.
- Mensagem-chave: O funcionario ve o que tem de executar, sem acesso a areas administrativas indevidas.

### 9. Client

- Clique/acao: Abrir https://gestisac-web.vercel.app/client/login.
- Mensagem-chave: O cliente acompanha o que lhe diz respeito, com linguagem simples e sem informacao interna.

### 10. Fecho

- Clique/acao: Abrir a matriz de requisitos.
- Mensagem-chave: A reuniao fecha com validacao: isto esta feito, isto esta parcial, isto esta planeado, e isto precisa da vossa decisao.

## Frases de apoio

- "Esta versao serve para ver a operacao real e validar regras antes de fechar tudo em contrato."
- "O que esta marcado como implementado e demonstravel; o que esta parcial ou planeado nao deve ser vendido como fechado."
- "A matriz de requisitos e a ferramenta para a cliente dizer: isto sim, isto nao, isto falta."

## Links

- HQ: https://gestisac-web.vercel.app/hq/login
- Worker: https://gestisac-web.vercel.app/worker/login
- Client: https://gestisac-web.vercel.app/client/login