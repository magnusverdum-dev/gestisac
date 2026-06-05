import { existsSync, readFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const loginNeeded = String(process.env.GESTISAC_LOGIN_NEEDED ?? 'true').trim().toLowerCase() !== 'false';

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.envFile) {
  loadEnvFile(args.envFile);
} else {
  loadOptionalEnvFiles(['.env.smoke.local', 'apps/api/.env.smoke.local']);
}

const apiUrl = (process.env.GESTISAC_API_URL || 'https://gestisac-api.vercel.app').replace(/\/$/, '');
const email = process.env.GESTISAC_SMOKE_EMAIL || 'admin@gestisac.pt';
const password = loginNeeded
  ? process.env.GESTISAC_SMOKE_PASSWORD
  : process.env.GESTISAC_SMOKE_PASSWORD || process.env.GESTISAC_BOOTSTRAP_ADMIN_PASSWORD || '';
const requestTimeoutMs = Number(process.env.GESTISAC_SMOKE_TIMEOUT_MS || 20_000);

if (loginNeeded && !password) {
  console.error('GESTISAC_SMOKE_PASSWORD is required. The email, password and tokens will not be printed.');
  process.exit(1);
}

const smokeMatrix = [
  {
    appContext: 'hq',
    endpoints: [
      '/api/shared/me',
      '/api/team',
      '/api/hq/dashboard',
      '/api/hq/tickets',
      '/api/hq/accounting/overview',
      '/api/dashboard',
      '/api/condominiums?page=1&pageSize=50',
      '/api/buildings?page=1&pageSize=50',
      '/api/fractions?page=1&pageSize=50',
      '/api/residents?page=1&pageSize=50',
      '/api/tickets?page=1&pageSize=50',
      '/api/ocorrencias?page=1&pageSize=50',
      '/api/suppliers?page=1&pageSize=50',
      '/api/documents?page=1&pageSize=50',
      '/api/reports?page=1&pageSize=50',
      '/api/maintenance?page=1&pageSize=50',
      '/api/inspections?page=1&pageSize=50',
      '/api/calendar-events?page=1&pageSize=50',
      '/api/assemblies?page=1&pageSize=50',
      '/api/accounting/summary',
      '/api/accounting/overview',
      '/api/accounting/quotas?page=1&pageSize=50',
      '/api/accounting/payments?page=1&pageSize=50',
      '/api/accounting/debts?page=1&pageSize=50',
      '/api/accounting/receipts?page=1&pageSize=50',
      '/api/accounting/expenses?page=1&pageSize=50',
      '/api/accounting/reserve-funds?page=1&pageSize=50',
      '/api/accounting/payment-agreements?page=1&pageSize=50',
      '/api/accounting/cash-movements?page=1&pageSize=50',
      '/api/accounting/bank-transactions?page=1&pageSize=50',
      '/api/accounting/reconciliations',
      '/api/audit-log?page=1&pageSize=25',
      '/api/permissions'
    ]
  },
  {
    appContext: 'worker',
    endpoints: ['/api/shared/me', '/api/team', '/api/worker/dashboard', '/api/worker/tickets']
  },
  {
    appContext: 'client',
    endpoints: ['/api/shared/me', '/api/client/dashboard', '/api/client/tickets']
  }
];

const results = [];
const failures = [];

for (const smoke of smokeMatrix) {
  await runAppSmoke(smoke);
}

console.table(results);

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  console.error(`Production API check failed: ${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log('Production API check passed for hq, worker and client contexts.');

async function runAppSmoke({ appContext, endpoints }) {
  let auth = null;
  let token = '';

  try {
    auth = loginNeeded ? await login(appContext) : await browserSessionAuth(appContext);
    token = auth.token;
    validateAuthResponse(appContext, auth, loginNeeded ? 'login' : 'browser-session');
    await checkMe(appContext, token);

    const refreshed = await refreshSession(appContext, refreshTokenFrom(auth));
    validateAuthResponse(appContext, refreshed, 'refresh');
    token = refreshed.token;
    await checkMe(appContext, token);

    for (const endpoint of endpoints) {
      await checkEndpoint(appContext, token, endpoint);
    }
  } catch (error) {
    failures.push(`${appContext}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (token) {
      await logout(appContext, token);
    }
  }
}

async function login(appContext) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, appContext })
  });

  if (!response.ok) {
    throw new Error(`login returned HTTP ${response.status}`);
  }

  return response.body;
}

async function browserSessionAuth(appContext) {
  const started = Date.now();
  const response = await fetch(`${apiUrl}/api/auth/browser-session?appContext=${encodeURIComponent(appContext)}`, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  const ms = Date.now() - started;
  const location = response.headers.get('location') || '';
  if (![302, 303].includes(response.status)) {
    throw new Error(`browser session returned HTTP ${response.status}`);
  }
  if (!location) {
    throw new Error('browser session did not return a redirect location');
  }

  const redirectUrl = new URL(location, apiUrl);
  const token = redirectUrl.searchParams.get('token')?.trim() || '';
  const refreshToken = redirectUrl.searchParams.get('refreshToken')?.trim() || '';
  const expiresAt = redirectUrl.searchParams.get('expiresAt')?.trim() || '';
  const redirectContext = redirectUrl.searchParams.get('appContext')?.trim() || appContext;
  if (!token || !refreshToken) {
    throw new Error('browser session redirect did not include tokens');
  }

  const meResponse = await request('/api/me', { token });
  if (!meResponse.ok) {
    throw new Error(`/api/me returned HTTP ${meResponse.status} after browser session`);
  }

  results.push({
    appContext,
    endpoint: '/api/auth/browser-session',
    status: response.status,
    ok: true,
    count: null,
    ms
  });

  return {
    token,
    refreshToken,
    expiresAt,
    appContext: redirectContext,
    user: meResponse.body?.user || null
  };
}

async function refreshSession(appContext, refreshToken) {
  if (!refreshToken) {
    throw new Error('login response did not include a refresh token');
  }

  const response = await request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken, appContext })
  });

  if (!response.ok) {
    throw new Error(`refresh returned HTTP ${response.status}`);
  }

  return response.body;
}

async function checkMe(appContext, token) {
  const response = await request('/api/me', { token });

  results.push({
    appContext,
    endpoint: '/api/me',
    status: response.status,
    ok: response.ok,
    count: countBodyItems(response.body)
  });

  if (!response.ok) {
    failures.push(`${appContext} /api/me returned HTTP ${response.status}`);
    return;
  }

  if (!response.body?.user?.id) {
    failures.push(`${appContext} /api/me did not return a user id`);
  }
}

async function checkEndpoint(appContext, token, endpoint) {
  const response = await request(endpoint, { token });
  const count = countBodyItems(response.body);

  results.push({
    appContext,
    endpoint,
    status: response.status,
    ok: response.ok,
    count
  });

  if (!response.ok) {
    failures.push(`${appContext} ${endpoint} returned HTTP ${response.status}`);
    return;
  }

  if (endpoint.startsWith(`/api/${appContext}/`) || endpoint === '/api/shared/me') {
    const responseContext = response.body?.appContext;
    if (responseContext && responseContext !== appContext) {
      failures.push(`${appContext} ${endpoint} returned appContext "${responseContext}"`);
    }
  }
}

async function logout(appContext, token) {
  const response = await request('/api/auth/logout', {
    method: 'POST',
    token
  });

  results.push({
    appContext,
    endpoint: '/api/auth/logout',
    status: response.status,
    ok: response.ok,
    count: null
  });

  if (!response.ok) {
    failures.push(`${appContext} logout returned HTTP ${response.status}`);
  }
}

function validateAuthResponse(appContext, auth, phase) {
  if (!auth?.token) {
    failures.push(`${appContext} ${phase} response did not include an access token`);
  }
  if (!refreshTokenFrom(auth)) {
    failures.push(`${appContext} ${phase} response did not include a refresh token`);
  }
  if (!auth?.user?.id) {
    failures.push(`${appContext} ${phase} response did not include a user id`);
  }
  if (auth?.appContext && auth.appContext !== appContext) {
    failures.push(`${appContext} ${phase} response returned appContext "${auth.appContext}"`);
  }
}

function refreshTokenFrom(auth) {
  return auth?.refreshToken || auth?.refresh_token || '';
}

async function request(endpoint, options = {}) {
  const headers = {
    Accept: 'application/json'
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const started = Date.now();
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    signal: AbortSignal.timeout(requestTimeoutMs)
  });

  const body = await response
    .json()
    .catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    body
  };
}

function countBodyItems(body) {
  if (Array.isArray(body)) {
    return body.length;
  }
  if (Array.isArray(body?.items)) {
    return body.items.length;
  }
  if (Array.isArray(body?.data)) {
    return body.data.length;
  }
  return null;
}

function parseArgs(items) {
  const parsed = { envFile: '', help: false };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === '--help' || item === '-h') {
      parsed.help = true;
    } else if (item === '--smoke-env-file' || item === '--env-file') {
      parsed.envFile = items[index + 1] || '';
      index += 1;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  pnpm run check:prod-api
  pnpm run check:prod-api -- --smoke-env-file <path>

Required secret:
  GESTISAC_SMOKE_PASSWORD

Optional login bypass:
  GESTISAC_LOGIN_NEEDED=false

Optional:
  GESTISAC_SMOKE_EMAIL
  GESTISAC_BOOTSTRAP_ADMIN_PASSWORD
  GESTISAC_API_URL
  GESTISAC_SMOKE_TIMEOUT_MS

Default local env files, if present:
  .env.smoke.local
  apps/api/.env.smoke.local

The script validates login or browser-session auth, refresh, /api/me, representative endpoints and logout for hq, worker and client.
It never prints passwords, tokens or full secret values.`);
}

function loadOptionalEnvFiles(paths) {
  for (const envPath of paths) {
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
    }
  }
}

function loadEnvFile(envPath) {
  if (!envPath || !existsSync(envPath)) {
    console.error('Env file not found. The email, password and tokens will not be printed.');
    process.exit(1);
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/^\uFEFF/, '').replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
