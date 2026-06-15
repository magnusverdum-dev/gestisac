# GESTISAC Performance Baseline

Data: 2026-06-14

This file stores the performance baseline observed in the current published state of the application.

## Method Note

The values below are **user-facing proxies**, but they are not yet real RUM or full Core Web Vitals.

- `hot` means a repeated visit with a warm connection/resource path.
- `new conn` means a synthetic first visit with a new connection.
- `browser-session` measures the time to prepare loginless entry into the app.
- The `web` and `api` timings here measure network/document/API response, not real browser paint.

For a future comparison that is closer to actual user experience, the next step is to add browser metrics for:

- `navigation start -> first paint`
- `navigation start -> LCP`
- `click -> route ready`
- `input -> response painted`

Browser telemetry in `apps/web` can be enabled with `?perf=1` or by setting `localStorage['gestisac:perf-telemetry'] = '1'`.

## Synthetic Baseline

### Frontend

| Target | Scenario | TTFB p50 | Total p50 | Note |
| --- | --- | ---: | ---: | --- |
| `/hq/login` | `new conn` | 443 ms | 569 ms | synthetic first visit |
| `/hq/login` | `hot` | 117 ms | 223 ms | repeated visit / keep-alive |
| `/` | `hot` | 114 ms | 224 ms | published homepage |

### Public API

| Target | Scenario | TTFB p50 | Total p50 | Note |
| --- | --- | ---: | ---: | --- |
| `/api/health` | `new conn` | 472 ms | 473 ms | initial health check |
| `/api/health` | `hot` | 144 ms | 297 ms | repeated health check |
| `/api/warmup` | `hot` | 146 ms | 298 ms | active warmup |
| `/api/version` | `hot` | 148 ms | 150 ms | light response |
| `/api/auth/browser-session?appContext=hq&mode=json` | `hot` | 1416 ms | 1746 ms | loginless entry |

### Authenticated Endpoints

| Target | TTFB p50 | Total p50 | Note |
| --- | ---: | ---: | --- |
| `/api/shared/me` | 142 ms | 143 ms | short identity path |
| `/api/hq/dashboard` | 146 ms | 251 ms | HQ dashboard |
| `/api/hq/tickets` | 148 ms | 478 ms | operational list |
| `/api/team` | 1389 ms | 1678 ms | slow area observed |
| `/api/condominiums?page=1&pageSize=50` | 1033 ms | 1526 ms | heavy list |
| `/api/calendar-events?page=1&pageSize=50` | 923 ms | 1035 ms | heavy list |
| `/api/audit-log?page=1&pageSize=25` | 142 ms | 258 ms | fast history |
| `/api/accounting/overview` | 334 ms | 406 ms | accounting summary |

## Production Checks

The production checks passed at the time of measurement:

- `pnpm run check:prod-readiness`
- `pnpm run check:prod-api`

## Short Read

- The published frontend is well cached and fast on the hot path.
- The biggest cost observed is not pure cold start, but some endpoints with heavier backend or DB work.
- `browser-session` is by far the most expensive part of loginless entry.
- The condominium 3D viewer was moved out of the main Qwik bundle into `/viewer-3d/`, a static mini-app served from `public/`.
- The main build no longer ships the old `q-BTt32e3U.js` `three.js` / `GLTFLoader` chunk on the normal app path.
- The viewer is now opened explicitly from the condominium page, so the main app does not pay that cost on initial load.

## Viewer Isolation Snapshot

Before the change:

- `q-BTt32e3U.js` was `732.83 kB` minified / `189.32 kB` gzip.
- The chunk came from the condominium 3D preview and pulled `three.js` plus `GLTFLoader` into the app build.

After the change:

- The largest main-app bundles are now `q-CoEZ-Rkp.js` at `62.9 kB` and `q-rubW2xiw.js` at `50.5 kB`.
- The 3D code lives in static viewer assets instead of the main app bundle.
- The viewer assets currently weigh:
  - `three.module.js` `633.8 kB`
  - `three.core.js` `1394.0 kB`
  - `GLTFLoader.js` `112.3 kB`
  - `OrbitControls.js` `39.6 kB`
  - `BufferGeometryUtils.js` `34.7 kB`
  - `SkeletonUtils.js` `11.3 kB`
- Those files are still self-hosted, but they are fetched only when someone opens the viewer.

## Next Comparison

When there is an improvement, compare against this baseline on these points:

- `/hq/login`
- `/api/health`
- `/api/warmup`
- `/api/auth/browser-session`
- `/api/team`
- `/api/condominiums?page=1&pageSize=50`
- `/api/calendar-events?page=1&pageSize=50`
