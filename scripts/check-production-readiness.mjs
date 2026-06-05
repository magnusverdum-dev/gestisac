import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const apiUrl = (process.env.GESTISAC_API_URL || 'https://gestisac-api.vercel.app').replace(/\/$/, '');
const webUrl = (process.env.GESTISAC_WEB_URL || 'https://gestisac-web.vercel.app').replace(/\/$/, '');
const oldDemoEmail = process.env.GESTISAC_OLD_DEMO_EMAIL || 'admin@gestisac.pt';
const oldDemoPassword = process.env.GESTISAC_OLD_DEMO_PASSWORD || 'Gestisac2026!';
const failures = [];
const warnings = [];
const evidence = [];

await main();

async function main() {
  runStep('vercel project roots', 'node', ['scripts/check-vercel-projects.mjs']);
  runStep('migration audit', 'node', ['scripts/audit-database-migrations.mjs']);
  checkForeignKeyIndexes();
  checkVercelEnvNames('api', [
    'GESTISAC_DATABASE_URL',
    'GESTISAC_ENV',
    'JWT_SECRET',
    'GESTISAC_CORS_ORIGINS',
    'GESTISAC_RUN_MIGRATIONS',
    'GESTISAC_SYNC_ON_STARTUP',
    'GESTISAC_ALLOW_DEMO_SEED',
    'GESTISAC_DOCUMENT_STORAGE_BACKEND'
  ]);
  checkVercelEnvNames('web', ['VITE_API_BASE_URL']);
  await checkApiHealth();
  await checkApiVersion();
  await checkLoginCorsPreflight();
  await checkPublishedWeb();
  await checkOldDemoCredentialRejected();
  await checkAuthenticatedSmokeAvailability();

  for (const item of evidence) {
    console.log(`OK ${item}`);
  }

  for (const warning of warnings) {
    console.warn(`WARN ${warning}`);
  }

  if (failures.length) {
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log('Production readiness check passed.');
}

function runStep(label, command, args) {
  const result = spawnSync(commandForPlatform(command), argsForPlatform(command, args), {
    encoding: 'utf8'
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  if (result.error || result.status !== 0) {
    failures.push(`${label} failed${output ? `: ${lastLines(output)}` : ''}`);
    return '';
  }

  evidence.push(`${label}`);
  return output;
}

function checkVercelEnvNames(target, requiredNames) {
  const cwd = target === 'api' ? 'apps/api' : 'apps/web';
  const output = runStep(
    `vercel env names ${target}`,
    'npx',
    ['vercel', 'env', 'ls', 'production', '--cwd', cwd]
  );

  if (!output) {
    return;
  }

  for (const name of requiredNames) {
    if (!output.includes(name)) {
      failures.push(`${target} production env is missing ${name}.`);
    }
  }

  if (target === 'api' && output.includes('GESTISAC_BOOTSTRAP_ADMIN_PASSWORD')) {
    warnings.push('GESTISAC_BOOTSTRAP_ADMIN_PASSWORD is present in API Production; remove it after bootstrap validation.');
  }
}

function checkForeignKeyIndexes() {
  const output = runStep('foreign key index audit', 'node', [
    'scripts/audit-foreign-key-indexes.mjs',
    '--json'
  ]);

  if (!output) {
    return;
  }

  try {
    const audit = JSON.parse(output);
    if (audit.missing > 0) {
      warnings.push(`${audit.missing} foreign key(s) do not have a leading-column index in local migrations.`);
    }
  } catch {
    warnings.push('Unable to parse foreign key index audit output.');
  }
}

async function checkApiHealth() {
  const { status, ms, body } = await fetchJson(`${apiUrl}/api/health`, 'api health', 45_000);
  if (status !== 200) {
    failures.push(`/api/health returned HTTP ${status}.`);
    return;
  }

  const persistence = body.persistence || {};
  expectEqual('health.status', body.status, 'online');
  expectEqual('health.activeBackend', persistence.activeBackend, 'postgresql');
  expectEqual('health.databaseConfigured', persistence.databaseConfigured, true);
  expectEqual('health.documentStorageBackend', persistence.documentStorageBackend, 'postgres');
  expectEqual('health.documentStoragePersistent', persistence.documentStoragePersistent, true);
  expectEqual('health.documentStorageWarning', persistence.documentStorageWarning ?? null, null);
  expectEqual('health.environment', persistence.environment, 'production');
  expectEqual('health.demoSeedAllowed', persistence.demoSeedAllowed, false);
  evidence.push(`/api/health ${status} in ${ms}ms with persistent postgres storage`);
}

async function checkApiVersion() {
  const { status, ms, body } = await fetchJson(`${apiUrl}/api/version`, 'api version', 20_000);
  if (status !== 200) {
    failures.push(`/api/version returned HTTP ${status}.`);
    return;
  }

  if (!body.name || !body.version || !body.environment) {
    failures.push('/api/version returned empty fields.');
  }
  expectEqual('version.environment', body.environment, 'production');
  evidence.push(`/api/version ${status} in ${ms}ms`);
}

async function checkLoginCorsPreflight() {
  const origin = new URL(webUrl).origin;
  const started = Date.now();
  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      },
      signal: AbortSignal.timeout(20_000)
    });
    const ms = Date.now() - started;
    if (![200, 204].includes(response.status)) {
      failures.push(`login CORS preflight returned HTTP ${response.status}.`);
      return;
    }

    const allowOrigin = response.headers.get('access-control-allow-origin') || '';
    const allowMethods = response.headers.get('access-control-allow-methods') || '';
    const allowHeaders = response.headers.get('access-control-allow-headers') || '';
    if (allowOrigin !== origin && allowOrigin !== '*') {
      failures.push(`login CORS preflight does not allow web origin ${origin}.`);
    }
    for (const method of ['POST', 'OPTIONS']) {
      if (!headerListIncludes(allowMethods, method)) {
        failures.push(`login CORS preflight does not allow ${method}.`);
      }
    }
    for (const header of ['content-type', 'authorization']) {
      if (!headerListIncludes(allowHeaders, header)) {
        failures.push(`login CORS preflight does not allow ${header} header.`);
      }
    }

    evidence.push(`login CORS preflight ${response.status} in ${ms}ms for ${origin}`);
  } catch (error) {
    failures.push(`login CORS preflight failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkPublishedWeb() {
  const assetUrls = new Set();
  for (const path of ['/', '/hq/login', '/worker/login', '/client/login']) {
    const url = `${webUrl}${path}?readiness=${Date.now()}`;
    const { status, ms, text } = await fetchText(url, `web ${path}`, 20_000);
    if (status !== 200) {
      failures.push(`${path} returned HTTP ${status}.`);
      continue;
    }

    checkForbiddenPublishedText(`web ${path} HTML`, text);
    for (const assetUrl of collectPublishedAssetUrls(url, text)) {
      assetUrls.add(assetUrl);
    }
    evidence.push(`web ${path} ${status} in ${ms}ms without localhost/demo credential hints`);
  }

  await checkPublishedAssets(assetUrls);
}

async function checkOldDemoCredentialRejected() {
  const started = Date.now();
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: oldDemoEmail,
      password: oldDemoPassword,
      appContext: 'hq'
    }),
    signal: AbortSignal.timeout(20_000)
  });
  const ms = Date.now() - started;

  if (![401, 403].includes(response.status)) {
    failures.push(`old demo credential was not rejected; login returned HTTP ${response.status}.`);
    return;
  }

  evidence.push(`old demo credential rejected with HTTP ${response.status} in ${ms}ms`);
}

async function checkAuthenticatedSmokeAvailability() {
  const smokeEnvFile = process.env.GESTISAC_SMOKE_ENV_FILE || '';
  const defaultSmokeEnvFile = ['.env.smoke.local', 'apps/api/.env.smoke.local'].find((path) => existsSync(path)) || '';
  if (!process.env.GESTISAC_SMOKE_PASSWORD && !smokeEnvFile && !defaultSmokeEnvFile) {
    failures.push(
      'Authenticated production smoke requires GESTISAC_SMOKE_PASSWORD, GESTISAC_SMOKE_ENV_FILE or .env.smoke.local in development.'
    );
    return;
  }

  const args = ['scripts/check-production-api.mjs'];
  if (smokeEnvFile) {
    args.push('--smoke-env-file', smokeEnvFile);
  }

  runStep('authenticated production API smoke', 'node', args);
}

async function fetchJson(url, label, timeoutMs) {
  const { status, ms, text } = await fetchText(url, label, timeoutMs);
  try {
    return { status, ms, body: JSON.parse(text) };
  } catch {
    failures.push(`${label} did not return valid JSON.`);
    return { status, ms, body: {} };
  }
}

async function fetchText(url, label, timeoutMs) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: '*/*', 'Cache-Control': 'no-store' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    return { status: response.status, ms: Date.now() - started, text: await response.text() };
  } catch (error) {
    failures.push(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
    return { status: 0, ms: Date.now() - started, text: '' };
  }
}

function collectPublishedAssetUrls(pageUrl, html) {
  const pageOrigin = new URL(webUrl).origin;
  const urls = [];
  const assetPattern = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = assetPattern.exec(html)) !== null) {
    try {
      const assetUrl = new URL(match[1], pageUrl);
      if (assetUrl.origin !== pageOrigin) {
        continue;
      }
      if (!/\.(?:js|mjs|css)(?:$|\?)/i.test(assetUrl.pathname)) {
        continue;
      }
      assetUrl.searchParams.delete('readiness');
      urls.push(assetUrl.toString());
    } catch {
      warnings.push(`Unable to parse published asset URL on ${pageUrl}.`);
    }
  }
  return urls;
}

async function checkPublishedAssets(assetUrls) {
  const urls = Array.from(assetUrls).sort();
  const scanLimit = 120;
  if (urls.length === 0) {
    warnings.push('No same-origin JS/CSS assets discovered in published web HTML.');
    return;
  }
  if (urls.length > scanLimit) {
    warnings.push(`Published web asset scan limited to ${scanLimit} of ${urls.length} discovered assets.`);
  }

  let scanned = 0;
  for (const assetUrl of urls.slice(0, scanLimit)) {
    const { status, text } = await fetchText(assetUrl, `web asset ${assetUrl}`, 20_000);
    if (status !== 200) {
      failures.push(`published web asset returned HTTP ${status}: ${assetPath(assetUrl)}`);
      continue;
    }
    checkForbiddenPublishedText(`web asset ${assetPath(assetUrl)}`, text);
    scanned += 1;
  }

  evidence.push(`${scanned} published web asset(s) scanned without localhost/demo credential hints`);
}

function checkForbiddenPublishedText(label, text) {
  if (/127\.0\.0\.1|localhost/i.test(text)) {
    failures.push(`${label} contains localhost/127.0.0.1.`);
  }
  if (text.includes(oldDemoPassword) || /Entrar rapido/i.test(text)) {
    failures.push(`${label} contains old demo credential hints.`);
  }
}

function assetPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

function headerListIncludes(rawValue, expected) {
  return rawValue
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .includes(expected.toLowerCase());
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label} expected ${String(expected)} but got ${String(actual)}.`);
  }
}

function commandForPlatform(command) {
  return process.platform === 'win32' ? 'cmd.exe' : command;
}

function argsForPlatform(command, args) {
  return process.platform === 'win32'
    ? ['/d', '/s', '/c', [command, ...args.map(quoteArg)].join(' ')]
    : args;
}

function quoteArg(value) {
  if (!/[ \t"&|<>^]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function lastLines(output) {
  return output.split(/\r?\n/).slice(-5).join(' | ');
}
