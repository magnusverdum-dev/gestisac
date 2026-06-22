# Briefing: Correção Cold Start Bug — O que aconteceu e como prevenir

Data: 2026-06-22
De: Scrutator (Testes)
Para: Aedificator (Frontend), Vigil (Validação), Tabularius (DB)

## O Bug

O dashboard ficava preso a 12% no primeiro arranque do GESTISAC em produção. O utilizador tinha de fazer Refresh manualmente para conseguir aceder.

**Causa raiz:** getDashboard() usava timeout de 15s (REQUEST_TIMEOUT_MS). Em cold start do Vercel, a API demora 15-30s a aquecer. O timeout expirava antes da API responder. Não existia retry automático.

**Por que é que o Refresh funcionava:** O warmup e browser-session já tinham aquecido a API durante 60-100s. Após Refresh, a API estava quente e respondia em <1s.

## O que foi corrigido

1. `getDashboard()` agora aceita timeout de 30s no arranque (era 15s)
2. `loadWorkspaceWithRetry$()` — retry automático até 3 vezes com delay crescente
3. Progress bar avança durante retry (80% → 85% → 90% → 95%)
4. Mensagem "A API ainda esta a aquecer" durante retry em vez de erro imediato

## O que foi criado para prevenir

- `docs/38-cold-start-lifecycle-e-resiliencia.md` — Mapa completo de timeouts e regras
- `tests/e2e/cold-start-regression.spec.ts` — Teste que valida retry automaticamente
- `skills/startup-diagnostics/SKILL.md` — Procedimento de diagnóstico
- `AGENTS.md` atualizado com regras de cold start

## Regras para programadores

### Aedificator (Frontend Qwik)
- NUNCA remover `loadWorkspaceWithRetry$` de `session-service.ts`
- NUNCA reduzir `WORKSPACE_LOAD_INITIAL_TIMEOUT_MS` abaixo de 30s
- NUNCA bloquear a shell por causa de dados lentos — usar modo degradado
- Antes de alterar `session-service.ts` ou `auth.ts`, correr:
  ```bash
  npx playwright test tests/e2e/cold-start-regression.spec.ts
  ```

### Tabularius (DB)
- Se adicionar queries pesadas ao dashboard, garantir que respondem em <15s
- Endpoints que demorem mais de 15s devem ser movidos para carga degradada
- Monitorizar `/api/team` e `/api/condominiums` que já são lentos (~1.5s)

### Vigil (Validação)
- Após qualquer alteração a session/auth, correr cold-start-regression.spec.ts
- Smoke test deve incluir verificação de progress bar
- Screenshots devem documentar estado do progress bar

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `apps/web/src/lib/api/auth.ts` | `getDashboard()` aceita `timeoutMs` opcional |
| `apps/web/src/lib/session/session-service.ts` | `loadWorkspaceWithRetry$()`, constantes de retry |
| `AGENTS.md` | Secção Cold Start Resilience adicionada |
| `docs/38-cold-start-lifecycle-e-resiliencia.md` | Documentação completa |
| `tests/e2e/cold-start-regression.spec.ts` | Teste de regressão |
| `.config/opencode/skills/startup-diagnostics/SKILL.md` | Skill de diagnóstico |
| `.config/opencode/agents/scrutator/` | Agente global de testes |

## Validations that passed

- ✅ `pnpm run typecheck:web`
- ✅ `pnpm run build:web`
- ✅ `npx playwright test tests/e2e/manual-test.spec.ts --headed` (14/14)
- ✅ `npx playwright test tests/e2e/cold-start-regression.spec.ts` (2/2)
- ✅ Dashboard carrega em 10s sem refresh
- ✅ Progress bar começa a 22% (não 12%)