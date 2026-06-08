import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'apps/web/src/app.tsx',
    pattern: /VITE_GESTISAC_DEV_AUTO_LOGIN \?\? 'true'/,
    message: 'apps/web/src/app.tsx must default VITE_GESTISAC_DEV_AUTO_LOGIN to true in development.'
  },
  {
    file: 'apps/web/src/app.tsx',
    pattern: /readSessionValue\(DEV_AUTO_LOGIN_SUPPRESS_KEY\) !== '1'/,
    message: 'apps/web/src/app.tsx must suppress dev auto-login only after explicit logout.'
  },
  {
    file: 'apps/web/src/app.tsx',
    pattern: /hideCredentialEntry=\{devAutoLoginEnabled && autoBrowserSessionPending\.value\}/,
    message: 'apps/web/src/app.tsx must hide manual credential entry while dev auto-login is opening.'
  },
  {
    file: 'apps/web/src/components/auth/LoginPage.tsx',
    pattern: /hideCredentialEntry\?: boolean;/,
    message: 'LoginPage must support hiding manual credential entry.'
  },
  {
    file: 'apps/web/src/components/auth/LoginPage.tsx',
    pattern: /Sessao de desenvolvimento a abrir automaticamente\./,
    message: 'LoginPage must show the development auto-login state instead of asking for credentials.'
  },
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
