# Demo Runbook - 3 Apps Interligadas (Cliente / HQ / Funcionário)

## Objetivo em 10 minutos
Demonstrar o fluxo completo:
1. Cliente abre avaria.
2. HQ recebe e atribui.
3. Funcionário executa e resolve.
4. Cliente confirma.

## Pré-requisitos
- 1 backend/API central.
- 1 frontend central.
- URL pública HTTPS única para os 3 computadores.
- Todos os computadores a apontar para o mesmo ambiente.

## URLs de cada computador
- Computador 1 (HQ): `/hq/login`
- Computador 2 (Funcionário): `/worker/login`
- Computador 3 (Cliente): `/client/login`

Exemplo: `https://demo-gestisac.exemplo.com/hq/login`

## Login da demo
- Em cada app, entrar com a conta de demo fornecida fora do repositorio.
- Nao publicar passwords nem usar botoes de login automatico em producao.

## Script da demo (ordem exata)
1. Cliente: abrir `Tickets` e criar `Avaria` com condomínio e equipamento.
2. HQ: abrir a nova ocorrência, preencher `Worker ID` (ex: `worker-demo-1`) e avançar para `Em triagem`.
3. Funcionário: abrir ocorrência atribuída, avançar para `Em curso` e depois `Resolvida`.
4. Cliente: abrir a mesma ocorrência e confirmar (`Fechada`) ou reabrir se necessário.
5. HQ: validar histórico final e estado fechado.

## Dados mínimos recomendados
- 1 condomínio completo com:
  - zonas
  - equipamentos
- 1 ocorrência seed de fallback.
- 1 técnico de referência (`worker-demo-1`) para atribuição.

## Critérios de sucesso
- O mesmo ticket aparece nas 3 apps.
- Mudanças de estado propagam entre apps.
- Fluxo fecha sem intervenção técnica manual.
