import { existsSync, readFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const target = args.target || 'all';
const envFile = args['production-env-file'] || args['env-file'];
const failures = [];
const warnings = [];

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

if (envFile) {
  loadEnvFile(envFile);
}

if (!['all', 'api', 'web'].includes(target)) {
  failures.push(`Invalid --target "${target}". Use api, web or all.`);
}

if (target === 'all' || target === 'api') {
  checkApiEnv();
}

if (target === 'all' || target === 'web') {
  checkWebEnv();
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

console.log(`Production environment check passed for target: ${target}`);

function checkApiEnv() {
  required('GESTISAC_ENV');
  if (value('GESTISAC_ENV') !== 'production') {
    failures.push('GESTISAC_ENV must be production.');
  }

  const databaseUrl = value('GESTISAC_DATABASE_URL') || value('DATABASE_URL');
  if (!databaseUrl) {
    failures.push('GESTISAC_DATABASE_URL or DATABASE_URL is required.');
  } else {
    noLocalValue('GESTISAC_DATABASE_URL/DATABASE_URL', databaseUrl);
    noPlaceholder('GESTISAC_DATABASE_URL/DATABASE_URL', databaseUrl);
    if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
      failures.push('GESTISAC_DATABASE_URL/DATABASE_URL must be a Postgres connection string.');
    }
    if (databaseUrl.includes(':6543/')) {
      warnings.push('GESTISAC_DATABASE_URL uses Supabase transaction pooler port 6543; prefer session pooler 5432 for SQLx.');
    }
  }

  required('JWT_SECRET');
  const jwtSecret = value('JWT_SECRET');
  if (jwtSecret) {
    noPlaceholder('JWT_SECRET', jwtSecret);
    if (jwtSecret === 'change-me-in-production' || jwtSecret === 'gestisac-local-dev-secret') {
      failures.push('JWT_SECRET must not use a development/default value.');
    }
    if (jwtSecret.length < 32) {
      failures.push('JWT_SECRET should be at least 32 characters.');
    }
  }

  required('GESTISAC_CORS_ORIGINS');
  const corsOrigins = value('GESTISAC_CORS_ORIGINS');
  if (corsOrigins) {
    noLocalValue('GESTISAC_CORS_ORIGINS', corsOrigins);
    for (const origin of corsOrigins.split(',').map((item) => item.trim()).filter(Boolean)) {
      if (!origin.startsWith('https://')) {
        failures.push(`GESTISAC_CORS_ORIGINS must use https in production: ${origin}`);
      }
    }
  }

  const demoSeed = value('GESTISAC_ALLOW_DEMO_SEED');
  if (isTruthy(demoSeed)) {
    failures.push('GESTISAC_ALLOW_DEMO_SEED must be false or unset in production.');
  }

  const runMigrations = value('GESTISAC_RUN_MIGRATIONS');
  if (isTruthy(runMigrations)) {
    failures.push('GESTISAC_RUN_MIGRATIONS must be false or unset in production.');
  }

  const syncOnStartup = value('GESTISAC_SYNC_ON_STARTUP');
  if (isTruthy(syncOnStartup)) {
    failures.push('GESTISAC_SYNC_ON_STARTUP must be false or unset in production.');
  }

  if (value('GESTISAC_BOOTSTRAP_ADMIN_PASSWORD')) {
    warnings.push('GESTISAC_BOOTSTRAP_ADMIN_PASSWORD is set; keep it temporary and rotate/remove it after development login validation.');
  }

  const documentBackend = (value('GESTISAC_DOCUMENT_STORAGE_BACKEND') || 'postgres').toLowerCase();
  if (!['postgres', 'postgresql', 'database', 'db', 'filesystem', 'fs', 'local'].includes(documentBackend)) {
    failures.push('GESTISAC_DOCUMENT_STORAGE_BACKEND must be postgres or filesystem.');
  }
  if (isVercelRuntime() && ['filesystem', 'fs', 'local'].includes(documentBackend)) {
    failures.push('GESTISAC_DOCUMENT_STORAGE_BACKEND must not be filesystem on Vercel production.');
  }

  const documentPath = value('GESTISAC_DOCUMENT_STORAGE_PATH');
  if (['filesystem', 'fs', 'local'].includes(documentBackend) && !documentPath) {
    warnings.push('GESTISAC_DOCUMENT_STORAGE_PATH is unset while filesystem document storage is selected.');
  }
}

function checkWebEnv() {
  required('VITE_API_BASE_URL');
  const apiBaseUrl = value('VITE_API_BASE_URL');
  if (!apiBaseUrl) return;
  noLocalValue('VITE_API_BASE_URL', apiBaseUrl);
  noPlaceholder('VITE_API_BASE_URL', apiBaseUrl);
  if (!apiBaseUrl.startsWith('https://')) {
    failures.push('VITE_API_BASE_URL must use https in production.');
  }
}

function required(name) {
  if (!value(name)) {
    failures.push(`${name} is required.`);
  }
}

function noLocalValue(name, rawValue) {
  if (rawValue.includes('127.0.0.1') || rawValue.includes('localhost')) {
    failures.push(`${name} must not point to localhost/127.0.0.1 in production.`);
  }
}

function noPlaceholder(name, rawValue) {
  if (rawValue.includes('<') || rawValue.includes('example.com')) {
    failures.push(`${name} still contains placeholder values.`);
  }
}

function value(name) {
  return (process.env[name] || '').trim();
}

function isTruthy(rawValue) {
  return ['1', 'true', 'yes', 'on'].includes(String(rawValue || '').trim().toLowerCase());
}

function isVercelRuntime() {
  return isTruthy(value('VERCEL')) || Boolean(value('VERCEL_ENV'));
}

function parseArgs(items) {
  const parsed = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = items[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  pnpm run check:prod-env
  pnpm run check:prod-env -- --target api
  pnpm run check:prod-env -- --target web
  pnpm run check:prod-env -- --production-env-file <path>

Targets:
  all  Validate API and Web production variables.
  api  Validate only API production variables.
  web  Validate only Web production variables.

The script validates names and shapes only. It never prints secret values.`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    console.error('Env file not found. Secret values will not be printed.');
    process.exit(1);
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = unquote(rawValue);
  }
}

function unquote(rawValue) {
  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
}
