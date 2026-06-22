# Cold Start Lifecycle e Resiliência do Arranque

Data: 2026-06-22

Este documento define como o GESTISAC lida com cold starts do Vercel e como garantir que o utilizador nunca fica preso no ecrã de loading.

## O Problema que Corrigimos

Em 2026-06-22, o dashboard ficava preso a 12% no primeiro arranque. O utilizador tinha de fazer Refresh manualmente. A causa era:

1. API Vercel cold start → getDashboard() timeout 15s
2. Sem retry automático → utilizador vê erro e preso
3. Após Refresh → API já quente → funciona em segundos

**Lição:** O problema não era a API estar offline. Era a API estar **a aquecer** — e o frontend não ter resiliência para aguentar.

## Cadeia de Timeouts (Mapa Completo)

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE ARRANQUE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. warmupApi()           → timeout: 60s  (WARMUP)         │
│     └─ /api/warmup                                      │
│                                                             │
│  2. startBrowserSession() → timeout: 40s  (AUTH)           │
│     └─ /api/auth/browser-session                      │
│                                                             │
│  3. getDashboard()        → timeout: 15s  (DEFAULT)        │
│     └─ /api/dashboard                                 │
│     └─ 30s no primeiro carregamento (WORKSPACE_INITIAL)    │
│                                                             │
│  4. getResources()        → timeout: 6s   (por resource)   │
│     └─ /api/condominiums, /api/tickets, etc.           │
│     └─ batching de 6 em 6                               │
│                                                             │
│  5. Retry automático      → até 3 tentativas               │
│     └─ WORKSPACE_LOAD_MAX_RETRIES = 3                   │
│     └─ WORKSPACE_LOAD_RETRY_DELAY_MS = 3000ms           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Constantes Críticas

| Constante | Valor | Local | Descrição |
|-----------|-------|-------|-----------|
| `WARMUP_TIMEOUT_MS` | 60,000ms | `auth.ts` | Timeout do warmup da API |
| `AUTH_STARTUP_TIMEOUT_MS` | 40,000ms | `auth.ts` | Timeout de login/browser-session |
| `REQUEST_TIMEOUT_MS` | 15,000ms | `http.ts` | Timeout padrão para requests |
| `WORKSPACE_LOAD_INITIAL_TIMEOUT_MS` | 30,000ms | `session-service.ts` | Timeout do dashboard no arranque |
| `INITIAL_RESOURCE_TIMEOUT_MS` | 6,000ms | `resources.ts` | Timeout por resource individual |
| `WORKSPACE_LOAD_MAX_RETRIES` | 3 | `session-service.ts` | Tentativas máximas de retry |
| `WORKSPACE_LOAD_RETRY_DELAY_MS` | 3,000ms | `session-service.ts` | Delay base entre retries |
| `BROWSER_SESSION_MAX_ATTEMPTS` | 6 | `session-service.ts` | Tentativas de browser-session |
| `BROWSER_SESSION_RETRY_DELAY_MS` | 1,500ms | `session-service.ts` | Delay base entre tentativas |

## Regras de Resiliência

### Regra 1: Shell primeiro, dados depois
A shell da app (menu, sidebar, header) deve aparecer assim que existe token válido. Os dados lentos carregam dentro da app com estados degradados.

### Regra 2: Retry automático no arranque
Se getDashboard() falhar por timeout no arranque, retry automático (até 3x) com delay crescente. NUNCA mostrar erro sem antes.retry.

### Regra 3: Progress bar real
A progress bar deve avançar durante o retry. Sequência: 12% → 18% → 32% → 54% → 58% → 76% → 80% → 85% → 90% → 95% → 100%.

### Regra 4: Nunca preso sem saída
Se todos os retries falharem, mostrar erro com botão "Repetir" explícito. NUNCA deixar o utilizador preso sem opção.

### Regra 5: Dados degradados > sem dados
Se resources falharem mas dashboard ok, mostrar dashboard com dados parciais e aviso "modo degradado". NUNCA bloquear a app por causa de módulos secundários.

## Cold Start Timeline Típico

```
Tempo    Evento                          Progresso
─────    ──────                          ─────────
0s       Navegação para /hq/dashboard    12%
0-3s     warmupApi() inicia              18%
3-15s    warmupApi() aguarda             18-32%
15-30s   warmupApi() timeout ou OK       32-54%
30-40s   startBrowserSession()           54-58%
40-45s   Token obtido, navega para /     58-76%
45-60s   getDashboard() com 30s timeout  76-80%
60-75s   Retry 1 se timeout              80-85%
75-90s   Retry 2 se timeout              85-90%
90-105s  Retry 3 se timeout              90-95%
105s+    Sucesso ou erro final           100% ou ERRO
```

**Tempo máximo aceitável:** ~2 minutos (com todos os retries)

**Tempo típico (API quente):** ~5 segundos

## Testes de Regressão

### Teste obrigatório: Dashboard Loading Smoke
```bash
npx tsx tests/e2e/hq-dashboard-loading-smoke.ts
```
- Valida que o progress bar avança além de 12%
- Valida que o dashboard carrega sem refresh manual
- Valida que retry funciona quando API está lenta

### Teste obrigatório: Smoke Completo
```bash
npx playwright test tests/e2e/manual-test.spec.ts --headed
```
- Valida login automático em 14 páginas
- Valida dados reais em HQ, Worker, Client
- Screenshots como evidência

## Como Diagnosticar se Voltar

### Sintoma: "Browser fica preso a X%"

1. **Verificar se API responde:**
   ```bash
   curl https://gestisac-api.vercel.app/api/health
   ```

2. **Verificar se warmup funciona:**
   ```bash
   curl https://gestisac-api.vercel.app/api/warmup
   ```

3. **Verificar browser-session:**
   ```bash
   curl "https://gestisac-api.vercel.app/api/auth/browser-session?appContext=hq&mode=json"
   ```

4. **Se tudo responde mas frontend fica preso:**
   - Verificar `VITE_API_BASE_URL` no build
   - Verificar se `gestisac.sessionToken` existe em localStorage
   - Abrir DevTools → Network → verificar requests bloqueados

5. **Se API não responde:**
   - Vercel cold start normal → aguardar 30-60s
   - Se continuar sem responder → verificar logs Vercel
   - Se Supabase dormido → verificar connection pool

### Sintoma: "Dashboard mostra zeros"

1. Verificar se getDashboard() retorna dados
2. Verificar se loadWorkspaceWithRetry$ está a ser chamado
3. Verificar Console por erros de timeout
4. Fazer refresh → se funciona, é cold start (retry deve resolver)

## Preventing Future Regressions

### Checklist antes de alterar session-service.ts ou auth.ts:

- [ ] Typecheck passa: `pnpm run typecheck:web`
- [ ] Build passa: `pnpm run build:web`
- [ ] Smoke test passa: `npx playwright test tests/e2e/manual-test.spec.ts --headed`
- [ ] Dashboard loading passa: `npx tsx tests/e2e/hq-dashboard-loading-smoke.ts`
- [ ] Timeout chain não foi quebrada (verificar constantes acima)
- [ ] Progress bar ainda avança durante retry
- [ ] Retry ainda funciona (testar com API lenta ou mock)
