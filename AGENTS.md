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
