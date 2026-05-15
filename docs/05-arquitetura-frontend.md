# Arquitetura Frontend

## Stack

- Qwik
- Qwik City
- TypeScript
- Tailwind CSS
- Sistema UI proprio

## Objetivos

- Carregamento rapido.
- Resumability por defeito.
- Excelente performance em dispositivos modestos.
- Componentes reutilizaveis e previsiveis.
- Separacao clara entre UI, dominio e dados.

## Estrutura Planeada

```text
apps/web/
  src/
    components/
      shell/
      dashboard/
      navigation/
      feedback/
      data-display/
      forms/
    features/
      condominiums/
      accounting/
      administration/
      reports/
      assemblies/
      documents/
      settings/
    routes/
    styles/
    lib/
```

## Sistema UI

O pacote `packages/ui` deve concentrar componentes reutilizaveis, tokens e padroes visuais. Componentes especificos de dominio ficam em `apps/web/src/features`.

## Estado

Estados locais devem ser simples. Estado global so deve existir quando varios modulos realmente partilham o mesmo dado, como utilizador autenticado, condominio ativo ou permissoes.

## Dados

Camada de acesso a API deve ficar isolada em `lib/api` ou equivalente. Componentes nao devem conhecer detalhes de endpoints.

## Performance

- Evitar bundles grandes.
- Usar assets otimizados.
- Priorizar HTML inicial util.
- Carregar detalhes apenas quando necessario.
- Mobile-first nas decisoes de layout.
