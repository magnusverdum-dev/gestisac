# Estudo Completo: Cold Starts no GESTISAC

Data: 2026-06-22
Status: DOCUMENTO CRÍTICO — Problema recorrente que afeta a experiência do utilizador

## 1. Resumo Executivo

O GESTISAC sofre de cold starts severos porque:
1. A API Rust em Vercel carrega **TODO o estado da aplicação** em memória antes de servir o primeiro pedido
2. O frontend tem **múltiplas camadas de timeout** que expiram antes da API estar pronta
3. O keep-warm existente (GitHub Actions a cada 5 min) **não é suficiente** para manter a API quente

**Impacto:** Utilizador vê "A ligar ao backend" durante 10-60 segundos no primeiro arranque.

## 2. Arquitetura do Cold Start

### 2.1 O que acontece quando a API acorda

```
┌─────────────────────────────────────────────────────────────────┐
│                    COLD START DA API RUST                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FASE 1: Carregamento do binário (1-5s)                        │
│  ├─ Vercel carrega binário Rust do CDN                         │
│  ├─ ~20-50MB com dependências (argon2, calamine, reqwest)     │
│  └─ Tempo: 1-5s dependendo da região                           │
│                                                                 │
│  FASE 2: Inicialização (~0s)                                    │
│  ├─ init_tracing() — logging                                   │
│  └─ ApiConfig::from_env() — variáveis de ambiente              │
│                                                                 │
│  FASE 3: Ligação PostgreSQL (0.5-3s) ← GARGALO                 │
│  ├─ connect_postgres() — pool de 1 conexão                     │
│  ├─ Statement cache DESLIGADO (compatibilidade Supabase)       │
│  └─ TLS handshake + auth PostgreSQL                            │
│                                                                 │
│  FASE 4: Hidratação do Estado (3-15s) ← CRÍTICO               │
│  ├─ Carrega TODOS os dados de PostgreSQL para memória          │
│  ├─ ~30+ queries sequenciais (pool=1)                          │
│  ├─ Utilizadores, condóminios, tickets, contabilidade...       │
│  ├─ Em produção: paralelo com try_join! mas pool=1 serializa   │
│  └─ Só TERMINA quando TODOS os dados estão em memória          │
│                                                                 │
│  FASE 5: Primeiro pedido servido                                │
│  └─ APENAS AGORA a API pode responder a /api/warmup            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

TEMPO TOTAL ESTIMADO: 10-25 segundos
```

### 2.2 O que acontece no Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                    COLD START DO FRONTEND                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FASE 1: SSR + Hidratação (0-1s)                                │
│  ├─ Qwik City renderiza HTML no servidor                       │
│  ├─ Login page aparece imediatamente                            │
│  └─ Progress bar: 8%                                           │
│                                                                 │
│  FASE 2: Loginless Session (0.5s)                               │
│  ├─ Detecta que está em /login                                 │
│  ├─ Inicia sessão automática                                    │
│  └─ Progress bar: 12%                                          │
│                                                                 │
│  FASE 3: Warmup API (0-60s) ← TIMEOUT                          │
│  ├─ warmupApi() — GET /api/warmup                              │
│  ├─ Timeout: 60 segundos                                       │
│  ├─ Retry: até 6 vezes                                         │
│  └─ Progress bar: 18% → 54%                                    │
│                                                                 │
│  FASE 4: Browser Session (0-40s) ← TIMEOUT                     │
│  ├─ startBrowserSession() — GET /api/auth/browser-session      │
│  ├─ Timeout: 40 segundos                                       │
│  └─ Progress bar: 58% → 76%                                    │
│                                                                 │
│  FASE 5: Dashboard Load (0-30s) ← TIMEOUT                      │
│  ├─ getDashboard() — GET /api/dashboard                        │
│  ├─ Timeout: 30s (arranque) / 15s (normal)                     │
│  ├─ Retry: até 3 vezes                                         │
│  └─ Progress bar: 80% → 95%                                    │
│                                                                 │
│  FASE 6: Resources Load (0-36s)                                 │
│  ├─ 16+ endpoints em batches de 6                              │
│  ├─ Timeout: 6s por resource                                   │
│  └─ Progress bar: 95% → 100%                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Mapa de Todos os Pontos de Falha

### 3.1 Falhas de Rede

| # | Falha | Impacto | Recuperação |
|---|-------|---------|-------------|
| F1 | `warmupApi()` timeout (60s) | Tentativa refeita (até 6x) | Auto-retry com delay exponencial |
| F2 | `startBrowserSession()` timeout (40s) | Tentativa refeita (até 6x) | Auto-retry com delay exponencial |
| F3 | Rede inacessível | Todos os pedidos falham | Fallback para demo API (dev only) |
| F4 | DNS falha | Todos os pedidos falham | Erro + botão retry |
| F5 | TLS certificate error | Todos os pedidos falham | Erro + botão retry |

### 3.2 Falhas da API

| # | Falha | Impacto | Recuperação |
|---|-------|---------|-------------|
| F6 | `/api/health` retorna erro | `apiStatus = 'offline'` | Cosmético — não bloqueia login |
| F7 | `/api/warmup` retorna 5xx | Retry automático | Até 6 tentativas |
| F8 | `/api/auth/browser-session` retorna 401/403 | Sessão não criada | Fallback para login manual |
| F9 | `/api/auth/browser-session` retorna 5xx | Retry automático | Até 6 tentativas |
| F10 | 6 tentativas de browser session falham | Erro + botão retry | Utilizador clica retry |
| F11 | `/api/dashboard` timeout (30s) | Workspace retry | Até 3 tentativas |
| F12 | `/api/dashboard` retorna 5xx | Modo degradado | Dashboard com dados parciais |
| F13 | Resource individual timeout (6s) | Resource retorna array vazio | `loadWarnings` preenchido |
| F14 | `/api/me` retorna 401 | Token inválido | Tenta refresh token |
| F15 | `/api/auth/refresh` falha | Tokens limpos | Utilizador vê login |

### 3.3 Falhas de Estado/Lógica

| # | Falha | Impacto | Recuperação |
|---|-------|---------|-------------|
| F16 | Token expirado (15s antes) | Token limpo proativamente | Tenta refresh ou loginless |
| F17 | `localStorage` indisponível | Não persiste tokens | Sessão in-memory only |
| F18 | Dashboard ok, resources falham | Dashboard mostra, dados parciais | "alguns dados não carregaram" |
| F19 | Dashboard falha, resources ok | Não mostra dashboard | "dashboard ainda não carregou" |
| F20 | Ambos falham | App mostra estado de erro | Mensagem + retry |

## 4. Timeline Visual do Cold Start

### Cenário: Primeira visita, API fria

```
TEMPO   EVENTO                                      PROGRESS    UTILIZADOR VÊ
─────   ──────                                      ────────    ─────────────
0.0s    Browser abre, HTML carrega (SSR)            8%          Tela de login
        "A ligar ao backend"                                    "A ligar ao backend"
        │
0.5s    initBrowserSession$() inicia                12%         Progress bar: 12%
        │
1.0s    warmupApi() inicia                          18%         "18%"
        GET /api/warmup (timeout: 60s)                          "Sessão automática..."
        ...aguardando API fria...
        │
15.0s   Ainda aguardando warmup...                  22%         "22%"
        (API a carregar binário + PostgreSQL)                   "Servidor a ligar"
        │
20.0s   warmupApi() retorna                         34%         "34%"
        │
21.0s   startBrowserSession() inicia                58%         "58%"
        GET /api/auth/browser-session
        (timeout: 40s)
        │
35.0s   Token obtido                                76%         "76%"
        Navega para /dashboard                      76%         Shell do dashboard
        │
36.0s   loadWorkspaceWithRetry$() inicia            80%         "80%"
        getDashboard(token, 30s)                   80%         Dashboard skeleton
        getResources(token)
        │
50.0s   Dashboard retorna                           85%         "85%"
        │
55.0s   Resources batch 1 completo                  90%         "90%"
        │
60.0s   Resources batch 2 completo                  95%         "95%"
        │
65.0s   Resources batch 3 completo                  100%        App completa
        │
DONE    App totalmente operacional                   --          Utilizador interage

TEMPO TOTAL: ~65 segundos (API fria)
```

### Cenário: Visita subsequente, API quente

```
TEMPO   EVENTO                                      PROGRESS    UTILIZADOR VÊ
─────   ──────                                      ────────    ─────────────
0.0s    Browser abre (SSR)                          8%          Tela de login
0.2s    initBrowserSession$()                       8%
0.6s    warmupApi() → 200 OK                        34%         "34%"
0.8s    startBrowserSession() → 200 OK              76%         "76%"
1.0s    Token obtido, navega para dashboard         76%         Shell do dashboard
1.2s    getDashboard() → 200 OK                     85%         Dashboard com dados
2.0s    Resources batch 1                           90%         "90%"
3.0s    Resources batch 2                           95%         "95%"
4.0s    Resources batch 3                           100%        App completa
5.0s    Accounting sub-batches                      100%        Completo

TEMPO TOTAL: ~5 segundos (API quente)
```

## 5. Cadeia de Timeouts (NÃO ALTERAR)

```
┌────────────────────────────────────────────────────────────────────┐
│                     CADEIA DE TIMEOUTS                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  FASE 1: ARRANQUE DA API                                          │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  warmupApi()               60s  (WARMUP_TIMEOUT_MS)      │     │
│  │  GET /api/warmup                                             │
│  │  Retry: até 6x (BROWSER_SESSION_MAX_ATTEMPTS)             │     │
│  │  Delay: 1.5s * attempt                                     │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  FASE 2: AUTENTICAÇÃO                                             │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  startBrowserSession()   40s  (AUTH_STARTUP_TIMEOUT_MS)  │     │
│  │  GET /api/auth/browser-session                            │     │
│  │  login()                40s  (AUTH_STARTUP_TIMEOUT_MS)   │     │
│  │  refreshSession()       40s  (AUTH_STARTUP_TIMEOUT_MS)   │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  FASE 3: CARREGAMENTO DO WORKSPACE                                │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  getDashboard()          30s  (WORKSPACE_LOAD_INITIAL)   │     │
│  │  (15s após primeiro carregamento)                         │     │
│  │  getResources()          6s/resource (INITIAL_RESOURCE)  │     │
│  │  16+ endpoints em batches de 6                            │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  FASE 4: RETRY DO WORKSPACE                                       │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  Workspace retry:        3x  (WORKSPACE_LOAD_MAX_RETRIES)│     │
│  │  Delay: 3s * attempt                                     │     │
│  │  Progress: 80% → 85% → 90% → 95%                        │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  FASE 5: HEALTH CHECK (caminho não-loginless)                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  getApiHealth()          15s  (REQUEST_TIMEOUT_MS)       │     │
│  │  GET /api/health                                          │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  FASE 6: VALIDAÇÃO DE TOKEN (caminho não-loginless)               │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  me()                    15s  (REQUEST_TIMEOUT_MS)       │     │
│  │  GET /api/me                                              │     │
│  │  Falha → refreshSession()  40s                           │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Bottlenecks Identificados na API

### 6.1 HIDRATAÇÃO COMPLETA DO ESTADO (CRÍTICO)

**Localização:** `apps/api/src/state.rs:207-504`

O estado **inteiro** da aplicação é carregado de PostgreSQL para memória **antes** de servir o primeiro pedido:

| Fase | Queries | Read + Write Back |
|------|---------|-------------------|
| Identity snapshot | 3 queries | ~3 queries |
| Condomínios | 1 load + 1 write-back | ~2 queries |
| Estrutura propriedade | 3 queries | ~3 queries |
| Sessões | 1 load + 1 write-back | ~2 queries |
| Chat messages | 1 load + 1 write-back | ~2 queries |
| Ocorrências | 3 queries | ~3 queries |
| Operacional | 5 queries | ~5 queries |
| Documental | 3 queries | ~3 queries |
| Financeiro | 10 queries | ~10 queries |

**Total: ~30+ queries sequenciais com pool=1**

### 6.2 POOL DE CONEXÃO ÚNICO (ALTO)

**Localização:** `apps/api/src/repositories/postgres.rs:3811-3817`

```rust
fn database_pool_max_connections() -> u32 {
    std::env::var("GESTISAC_DATABASE_POOL_MAX")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .map(|value| value.clamp(1, 4))
        .unwrap_or(1)  // PADRÃO: 1 conexão
}
```

Com pool=1, as queries paralelas em `try_join!` são serializadas.

### 6.3 STATEMENT CACHE DESLIGADO (MODERADO)

**Localização:** `apps/api/src/repositories/postgres.rs:187`

```rust
let connect_options = PgConnectOptions::from_str(database_url)?
    .statement_cache_capacity(0);  // DESLIGADO para Supabase
```

Cada query faz PREPARE + EXECUTE em vez de apenas EXECUTE.

### 6.4 BINÁRIO PESADO (MODERADO)

| Dependência | Propósito | Impacto |
|-------------|-----------|---------|
| `argon2` | Password hashing | Moderado |
| `calamine` | Excel parsing | PESADO |
| `reqwest` + `rustls-tls` | HTTP client | PESADO |
| `sqlx` + `postgres` + `migrate` | Database | PESADO |

## 7. Keep-Warm Existente

### 7.1 GitHub Actions (a cada 5 minutos)

**Ficheiro:** `.github/workflows/keep-api-warm.yml`

```yaml
schedule:
  - cron: "*/5 * * * *"  # A cada 5 minutos
```

**O que faz:**
1. `GET /api/warmup` — com retry 5x, delay 8s, max-time 240s
2. `GET /api/health` — silencioso

**Limitação:** O Vercel free tier mantém funções frias por até 30 segundos entre requests. O cron de 5 minutos deveria ser suficiente, mas há edge cases onde a API ainda adormece.

### 7.2 Verificação de Produção

**Ficheiro:** `scripts/check-production-readiness.mjs`

Verifica se o workflow keep-warm está configurado corretamente.

## 8. Soluções Possíveis

### 8.1 Soluções Imediatas (Alto Impacto, Baixo Custo)

| Solução | Impacto | Custo | Esforço |
|---------|---------|-------|---------|
| **Aumentar pool para 4** | Alto | $0 | Baixo |
| **Cache de statements** (se possível) | Médio | $0 | Médio |
| **Excluir calamine do default** | Médio | $0 | Baixo |
| **Health/warmup sem estado completo** | Alto | $0 | Médio |

### 8.2 Soluções de Médio Prazo (Alto Impacto, Médio Custo)

| Solução | Impacto | Custo | Esforço |
|---------|---------|-------|---------|
| **Lazy loading do estado** | CRÍTICO | $0 | Alto |
| **Separar warmup do estado completo** | Alto | $0 | Médio |
| **Edge functions para health** | Alto | $0 | Médio |
| **Aumentar frequência do cron** | Médio | $0 | Baixo |

### 8.3 Soluções de Longo Prazo (Máximo Impacto)

| Solução | Impacto | Custo | Esforço |
|---------|---------|-------|---------|
| **Migrar para containers (Railway/Fly.io)** | Máximo | $5-20/mês | Alto |
| **Usar Vercel Fluid Compute** | Alto | $0 | Médio |
| **Connection pooling externo (PgBouncer)** | Alto | $0-10/mês | Médio |
| **Pre-warming com webhook** | Alto | $0 | Médio |

## 9. Plano de Ação Recomendado

### Fase 1: Correções Imediatas (esta semana)

1. **Aumentar pool de conexões para 4**
   - Adicionar `GESTISAC_DATABASE_POOL_MAX=4` no Vercel
   - Impacto: queries paralelas realmente paralelas

2. **Excluir calamine do default features**
   - Feature-gate Excel parsing
   - Reduz tamanho do binário

3. **Criar endpoint /api/lightweight-warmup**
   - Responde SEM carregar estado completo
   - Apenas verifica que o binário está carregado
   - Frontend usa este para warmup inicial

### Fase 2: Otimização da API (próximas 2 semanas)

4. **Lazy loading do estado**
   - Carregar apenas dados críticos (users, sessions) no arranque
   - Carregar condóminios, tickets, etc. no primeiro acesso
   - Reduz cold start em 50-70%

5. **Separar rotas de health do estado completo**
   - `/api/health` e `/api/warmup` não precisam de AppState completo
   - Criar health check leve que responde sem hidratação

### Fase 3: Arquitetura (próximo mês)

6. **Avaliar migração para Railway/Fly.io**
   - Containers não têm cold start (sempre quentes)
   - Custo: $5-20/mês
   - Elimina completamente o problema

7. **Connection pooling externo**
   - PgBouncer ou Supabase Connection Pooler
   - Remove limitação de pool=1

## 10. Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Tempo médio cold start | 10-25s | <3s |
| Tempo máximo cold start | 60s+ | <10s |
| Taxa de sucesso 1ª visita | ~85% | >99% |
| Utilizadores presos no loading | ~15% | <1% |
| Tempo API quente | ~5s | ~2s |

## 11. Conclusão

O cold start do GESTISAC é um problema **arquitetural** causado pela decisão de carregar todo o estado em memória antes de servir pedidos. Embora o keep-warm existente ajude, não resolve o problema fundamental.

**A solução definitiva** é uma combinação de:
1. Lazy loading do estado (carregar apenas o necessário)
2. Health endpoints leves (sem estado completo)
3. Pool de conexões maior (paralelismo real)
4. Avaliação de infraestrutura alternativa (Railway/Fly.io)

Com estas mudanças, o cold start pode ser reduzido de 10-25s para <3s, eliminando completamente o problema de utilizadores presos no loading.
