# GESTISAC Agent Instructions

## Rust Backend Standards

When editing Rust in `apps/api`, follow the project Rust standard in `docs/19-rust-best-practices.md` and the reusable prompt in `RUST_BEST_PRACTICES_PROMPT.md`.

Core rules:

- Prefer safe, idiomatic Rust with clear ownership and borrowing.
- Use `Result<T, E>` and typed errors for fallible operations.
- Do not use `unwrap()` in production code.
- Avoid `expect()` unless the message explains the invariant.
- Keep `main.rs` small and move logic into focused modules.
- Separate routes, services, repositories, models, config, state and errors.
- Use strong types for domain concepts and avoid ambiguous boolean arguments.
- Keep async code non-blocking.
- Avoid `unsafe`; if unavoidable, document invariants with a `SAFETY` comment.
- Add tests for meaningful behavior and failure modes.

Validation before delivering Rust changes:

```bash
pnpm run check:api
node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check
pnpm run clippy:api
pnpm run test:api
```

## Qwik Frontend Standards

When editing Qwik in `apps/web`, follow the project Qwik standard in `docs/20-qwik-best-practices.md` and the reusable prompt in `QWIK_BEST_PRACTICES_PROMPT.md`.

Core rules:

- Treat Qwik as Qwik, not React with different syntax.
- Prefer resumability, small initial JavaScript and server-side data loading.
- Use `component$()` for components.
- Use event handlers with `$`, such as `onClick$`, `onInput$` and `onSubmit$`.
- Use `class`, not `className`.
- Avoid `useVisibleTask$()` unless browser-only APIs are truly required.
- Prefer Qwik City `routeLoader$()` for initial data and `routeAction$()` for mutations.
- Keep components small, accessible and typed.
- Do not add React-only libraries.
- Do not expose secrets in client code.

Validation before delivering frontend changes:

```bash
pnpm run typecheck:web
pnpm run build:web
```

## Smoke Tests for Improvements

When implementing or validating any improvement, follow `docs/36-smoke-tests-por-melhoria.md`.

Core rule:

- Validate the published API first.
- Then replicate the impacted user flow by app context: HQ/Admin, Worker and Client.
- Do not treat localhost-only validation as production validation.
- Add new or changed API endpoints to `scripts/check-production-api.mjs` when they are part of the production contract.
- Report which smoke commands passed and which user contexts were replicated before delivering.

## Development Loginless Contract

In development and smoke flows, manual credential entry is forbidden by default.

Core rule:

- The web app must auto-open `browser-session` in development instead of waiting for typed credentials.
- Smoke and readiness scripts must default to `GESTISAC_LOGIN_NEEDED=false`.
- Any change that reintroduces manual credential entry in development must fail the repo guard `pnpm run guard:loginless-dev`.
- Git hooks must block commit/push when that contract is broken.

Critical entry contract:

- Treat login, `browser-session`, API warmup, session storage, app switching and API base URL as infrastructure-critical code.
- Do not change those paths as part of visual, menu, page, dashboard or business-feature work unless the user explicitly asks for login/session changes.
- The automatic entry flow must keep retrying recoverable API startup failures and must never leave the user on a dead login screen.
- The visible test for any change touching those paths is: enter HQ, navigate the main windows, switch app context, then close and repeat; no manual credentials may be typed.
- The production API must remain validated before the browser user-flow test: `/api/health`, `/api/warmup` and `browser-session` for `hq`, `worker` and `client`.

## Cold Start Resilience (Critical — 2026-06-22)

When editing `apps/web/src/lib/session/session-service.ts`, `apps/web/src/lib/api/auth.ts`, or `apps/web/src/lib/api/http.ts`, follow the cold start resilience rules in `docs/38-cold-start-lifecycle-e-resiliencia.md`.

Core rules:

- The workspace load MUST have automatic retry on timeout (see `loadWorkspaceWithRetry$`).
- The initial dashboard timeout MUST be 30s (`WORKSPACE_LOAD_INITIAL_TIMEOUT_MS`), not the default 15s.
- Never remove the retry loop from `openBrowserSession$` or `initBrowserSession$`.
- The progress bar MUST advance during retry (80% → 85% → 90% → 95%).
- If all retries fail, the user MUST see a clear error with a way to retry manually.
- Never block the entire app on a single slow endpoint — use degraded mode for non-critical data.

Timeout chain (do not break):

```
warmupApi()          → 60s  (WARMUP_TIMEOUT_MS)
startBrowserSession() → 40s  (AUTH_STARTUP_TIMEOUT_MS)
getDashboard()       → 30s  (WORKSPACE_LOAD_INITIAL_TIMEOUT_MS) at startup, 15s normally
getResources()       → 6s   (INITIAL_RESOURCE_TIMEOUT_MS) per resource
Workspace retry      → up to 3 attempts, delay 3s/6s/9s
```

Validation before delivering changes to startup/session code:

```bash
pnpm run typecheck:web
pnpm run build:web
npx playwright test tests/e2e/cold-start-regression.spec.ts
npx playwright test tests/e2e/manual-test.spec.ts --headed
```
