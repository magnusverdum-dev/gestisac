# Regra Global De Simplicidade UX

Data: 2026-05-18

Esta regra aplica-se a todo o Gestisac. A aplicacao deve ser simples, limpa e
guiada para pessoas que podem ter dificuldade em interpretar muitos dados,
botoes ou opcoes ao mesmo tempo.

## Principios Obrigatorios

- Um ecra deve mostrar uma decisao principal de cada vez.
- Cada pagina principal deve funcionar como um hub simples, com no maximo quatro cartoes grandes de entrada.
- Cada bloco, cartao ou lista deve ter apenas uma acao principal visivel.
- A acao principal deve ser clara: `Abrir`, `Adicionar`, `Continuar` ou equivalente.
- Acoes secundarias devem ficar dentro de `Mais`.
- Acoes destrutivas, como `Apagar`, nunca devem aparecer como botao principal numa lista.
- Formularios avancados, importacoes e configuracoes devem aparecer apenas depois de uma escolha explicita.
- A informacao tecnica deve existir, mas deve estar dentro da seccao correta, nao toda no primeiro ecra.
- O texto deve ser curto, direto e escrito em linguagem operacional simples.
- O mobile/PWA deve ser tratado como experiencia principal, nao como adaptacao secundaria.

## Padrao De Pagina

Cada pagina principal deve seguir este desenho:

1. Cabecalho curto com titulo e uma frase de contexto.
2. Quatro cartoes grandes de entrada, sempre que fizer sentido.
3. Menu lateral interno ou seletor simples para navegar dentro da area escolhida.
4. Uma area de conteudo unica, sem paineis paralelos concorrentes.
5. Lista simples com `Abrir` como acao principal.
6. Menu `Mais` para acoes secundarias.
7. Detalhe limpo, aberto apenas quando o utilizador escolhe um item.

## Regras Para Listas

- Cada linha/cartao deve mostrar apenas o essencial para reconhecer o item.
- `Abrir` e a unica acao primaria visivel.
- `Editar`, `Resolver`, `Arquivar`, `Download`, `Preview` e similares ficam em `Mais`.
- `Apagar` so pode aparecer em `Mais` ou dentro do detalhe, com confirmacao.
- Se existirem muitos filtros, mostrar primeiro pesquisa simples e esconder filtros avancados.

## Regras Para Condominios

- A primeira vista de `Condominios` deve ter apenas quatro entradas: `Condominios Geral`, `Relatorios`, `Documentacao` e `Avarias`.
- Criacao rapida, importacao CSV, ficha tecnica, abas e sub-recursos nao aparecem todos no primeiro impacto.
- A ficha completa continua disponivel, mas organizada por uma area de cada vez.

## Regras Para Documentos

- A primeira vista de `Documentos` deve ter apenas quatro entradas: `Condominios`, `Fornecedores`, `Manutencao` e `Tickets`.
- Documentos devem ser enquadrados pelo contexto antes de mostrar criar, gerar ou upload.
- Modelos e gerador documental devem ficar numa area avancada, nunca acima da escolha principal.

## Criterio De Revisao

Se uma pagina tiver muitos botoes em paralelo, muitos paineis visiveis ou varias
decisoes concorrentes, deve ser simplificada antes de receber novas
funcionalidades.
