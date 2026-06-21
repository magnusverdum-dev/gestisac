import { readFileSync } from 'node:fs';

const checks = [
  // ══════════════════════════════════════════════════════════
  // apps/web/src/app.tsx — still has UI/rendering patterns
  // ══════════════════════════════════════════════════════════
  {
    file: 'apps/web/src/app.tsx',
    pattern: /readSessionValue\(svc\.DEV_AUTO_LOGIN_SUPPRESS_KEY\) !== '1'/,
    message: 'apps/web/src/app.tsx must suppress dev auto-login only after explicit logout.'
  },
  {
    file: 'apps/web/src/app.tsx',
    pattern: /hideCredentialEntry=\{hideLoginlessCredentialEntry \|\| store\.autoBrowserSessionPending\.value\}/,
    message: 'apps/web/src/app.tsx must hide manual credential entry while loginless browser-session is opening.'
  },
  {
    file: 'apps/web/src/app.tsx',
    pattern: /const hideLoginlessCredentialEntry =[\s\S]*svc\.browserSessionLoginlessEnabled/s,
    message: 'apps/web/src/app.tsx must hide manual credential entry immediately on loginless login routes.'
  },
  {
    file: 'apps/web/src/app.tsx',
    pattern: /svc\.browserSessionLoginlessEnabled &&\s*store\.autoBrowserSessionPending\.value &&\s*!store\.isLoading\.value &&\s*store\.currentPath\.value === '\/login'[\s\S]*void svc\.openBrowserSession\$\(\);/s,
    message: 'apps/web/src/app.tsx must automatically retry loginless entry while the login route is waiting.'
  },

  // ══════════════════════════════════════════════════════════
  // apps/web/src/lib/session/session-service.ts — session logic
  // ══════════════════════════════════════════════════════════
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /VITE_GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'session-service.ts must default published loginless mode to browser-session unless explicitly disabled.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /VITE_GESTISAC_DEV_AUTO_LOGIN \?\? 'true'/,
    message: 'session-service.ts must default VITE_GESTISAC_DEV_AUTO_LOGIN to true in development.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /readSessionValue\(DEV_AUTO_LOGIN_SUPPRESS_KEY\) !== '1'/,
    message: 'session-service.ts must suppress dev auto-login only after explicit logout.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /const BROWSER_SESSION_MAX_ATTEMPTS = 6;/,
    message: 'session-service.ts must keep multiple automatic browser-session attempts before showing a recoverable error.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /for \(let attempt = 1; attempt <= BROWSER_SESSION_MAX_ATTEMPTS; attempt \+= 1\)/,
    message: 'session-service.ts must retry the API warmup/browser-session flow automatically.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /await warmupApi\(\);\s*browserSessionProgress\.value[\s\S]*auth = await startBrowserSession\(appContext\.value\);/,
    message: 'session-service.ts must warm the published API immediately before creating a browser session.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /startBrowserSession\(appContext\.value\)/,
    message: 'session-service.ts must use browser-session API for loginless development instead of manual credential entry.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /autoBrowserSessionPending\.value = browserSessionLoginlessEnabled;/,
    message: 'session-service.ts must keep the loginless retry UI active after a recoverable browser-session failure.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /browserSessionLoginlessEnabled/,
    message: 'session-service.ts must declare browserSessionLoginlessEnabled for loginless development mode.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /browserSessionProgress/,
    message: 'session-service.ts must reference browserSessionProgress for loginless loading UX.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /if \(browserSessionLoginlessEnabled\) \{\s*session\.ready = false;\s*session\.token = '';\s*session\.user = null;[\s\S]*writeStoredValue\(SESSION_APP_CONTEXT_KEY, context\);[\s\S]*await openBrowserSession\$\(\);\s*return;\s*\}/s,
    message: 'session-service.ts must switch apps through a clean context-specific browser-session, not a reused token.'
  },
  {
    file: 'apps/web/src/lib/session/session-service.ts',
    pattern: /if \(shouldStartLoginlessSession[\s\S]*?\) \{\s*autoBrowserSessionPending\.value = true;[\s\S]*?await openBrowserSession\$\(\);\s*return;\s*\}/s,
    message: 'session-service.ts must auto-open browser-session before showing manual login when on the login route.'
  },

  // ══════════════════════════════════════════════════════════
  // apps/web/src/lib/session/session-store.ts — store declarations
  // ══════════════════════════════════════════════════════════
  {
    file: 'apps/web/src/lib/session/session-store.ts',
    pattern: /browserSessionProgress/,
    message: 'session-store.ts must declare browserSessionProgress signal for loginless loading UX.'
  },
  {
    file: 'apps/web/src/lib/session/session-store.ts',
    pattern: /autoBrowserSessionPending/,
    message: 'session-store.ts must declare autoBrowserSessionPending signal for browser session tracking.'
  },

  // ══════════════════════════════════════════════════════════
  // apps/web/src/lib/api/http.ts — fetch config
  // ══════════════════════════════════════════════════════════
  {
    file: 'apps/web/src/lib/api/http.ts',
    pattern: /cache: 'no-store'/,
    message: 'API requests from the web app must bypass stale browser caches during loginless startup.'
  },

  // ══════════════════════════════════════════════════════════
  // .github/workflows/keep-api-warm.yml — CI warmup
  // ══════════════════════════════════════════════════════════
  {
    file: '.github/workflows/keep-api-warm.yml',
    pattern: /--retry 5[\s\S]*--retry-all-errors[\s\S]*request "\/api\/warmup"[\s\S]*request "\/api\/health"/,
    message: 'Keep API warm workflow must retry transient failures and ping warmup plus health.'
  },

  // ══════════════════════════════════════════════════════════
  // apps/web/src/components/auth/LoginPage.tsx — UI
  // ══════════════════════════════════════════════════════════
  {
    file: 'apps/web/src/components/auth/LoginPage.tsx',
    pattern: /hideCredentialEntry\?: boolean;/,
    message: 'LoginPage must support hiding manual credential entry.'
  },
  {
    file: 'apps/web/src/components/auth/LoginPage.tsx',
    pattern: /sem credenciais manuais/,
    message: 'LoginPage must show the development auto-login state instead of asking for credentials.'
  },
  {
    file: 'apps/web/src/components/auth/LoginPage.tsx',
    pattern: /login-progress/,
    message: 'LoginPage must show progress while the server opens the automatic session.'
  },

  // ══════════════════════════════════════════════════════════
  // Scripts — all default to login-free mode
  // ══════════════════════════════════════════════════════════
  {
    file: 'scripts/check-production-api.mjs',
    pattern: /GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'Production API smoke must default to login-free mode.'
  },
  {
    file: 'scripts/check-production-readiness.mjs',
    pattern: /GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'Production readiness must default to login-free mode.'
  },
  {
    file: 'scripts/smoke-api.mjs',
    pattern: /GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'Local API smoke must default to login-free mode.'
  },
  {
    file: 'nav-test.mjs',
    pattern: /GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'Navigation smoke must default to login-free mode.'
  },
  {
    file: 'chat-e2e.mjs',
    pattern: /GESTISAC_LOGIN_NEEDED \?\? 'false'/,
    message: 'Chat smoke must default to login-free mode.'
  }
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(new URL(`../${check.file}`, import.meta.url), 'utf8');
  if (!check.pattern.test(source)) {
    failures.push(`${check.file}: ${check.message}`);
  }
}

if (failures.length) {
  console.error('FAIL loginless-dev contract');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('OK loginless-dev contract');
