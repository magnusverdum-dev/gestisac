# Composicao Dashboard

## Papel

O dashboard e a primeira experiencia memoravel do produto. Deve comunicar rapidamente o estado da operacao e dar ao utilizador uma proxima acao clara.

## Estrutura Desktop

```text
Sidebar fixa | Topbar
             | Saudacao + aviso urgente
             | Quick actions
             | Grid 2x2 de cards operacionais
             | Alertas importantes
```

## Ritmo Visual

1. Identidade e orientacao: sidebar, topbar e condominio ativo.
2. Prioridade operacional: saudacao, aviso urgente e estado do dia.
3. Acao imediata: quick actions.
4. Estado global: quatro cards centrais.
5. Prioridades: alertas importantes.

## Topbar

Elementos:

- Pesquisa global com atalho de teclado.
- Indicador de estado do sistema.
- Indicador de avisos urgentes.
- Notificacoes com badge.
- Seletor de condominio.
- Perfil com menu.
- Estado de sistema ou sincronizacao quando necessario.

Comportamento:

- Fixa no topo da area de conteudo.
- Transparencia reduzida para garantir leitura.
- Em mobile, reduz pesquisa para icone/entrada expandida.

## Saudacao

Deve ser humana e contextual:

```text
Bom dia, Joao.
Aqui esta o resumo geral do seu condominio hoje.
```

Pode incluir:

- Resumo operacional.
- Aviso urgente quando existir algo critico.
- Estado do dia com avarias, prazos e fornecedores ativos.

## Quick Actions

Devem ser botoes grandes, com icone, titulo e microcopy curta.

Acoes iniciais:

- Novo Ticket
- Emitir Recibo
- Novo Condominio
- Gerar Relatorio

Regras:

- Maximo de 4 acoes principais no dashboard desktop.
- Em tablet, grid 2x2.
- Em mobile, lista horizontal scrollavel ou grid 2x2 compacto.

## Cards Operacionais

Cada card deve ter:

- Icone ou simbolo do modulo.
- Titulo.
- Subtitulo.
- 3 a 4 metricas.
- Um estado ou alerta pequeno.
- CTA principal.
- Visual identitario de fundo.
- Menu contextual discreto.

### Condominios

Narrativa: estrutura, edificios, moradores e estabilidade.

### Contabilidade

Narrativa: saude financeira, previsibilidade e controlo.

### Administracao

Narrativa: operacao, manutencao e resolucao.

### Relatorios

Narrativa: inteligencia, analise e documentacao.

## Alertas Importantes

Devem aparecer como uma faixa premium no fim do dashboard, com cards pequenos e CTA "Ver todos alertas".

Prioridade visual:

- Vermelho/rose para risco financeiro ou urgente.
- Dourado para vencimentos e atencao.
- Azul/roxo para eventos e assembleias.
- Verde para estados positivos ou concluidos.

## Psicologia Do Dashboard

O utilizador deve ler o dashboard nesta ordem:

1. Quem sou e que condominio estou a ver.
2. O que preciso fazer agora.
3. Como esta a operacao.
4. O que esta em risco.
5. Para onde posso navegar.
