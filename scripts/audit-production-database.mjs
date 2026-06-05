import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const tempDir = mkdtempSync(path.join(tmpdir(), 'gestisac-prod-db-audit-'));
const envPath = args.envFile || path.join(tempDir, 'api-production.env');

try {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.envFile) {
    loadOptionalEnvFiles(['.env.database.local', 'apps/api/.env.database.local', 'apps/api/.env.local']);
  }

  let databaseUrl = process.env.GESTISAC_DATABASE_URL || process.env.DATABASE_URL;
  let env = {};

  if (!databaseUrl && args.envFile) {
    if (!existsSync(args.envFile)) {
      console.error('Database env file not found. The database URL will not be printed.');
      process.exit(1);
    }
    env = parseEnvFile(readFileSync(args.envFile, 'utf8'));
    databaseUrl = env.GESTISAC_DATABASE_URL || env.DATABASE_URL;
  }

  if (!databaseUrl && !args.envFile) {
    run('npx', ['vercel', 'env', 'pull', envPath, '--environment=production', '--cwd', 'apps/api']);
    env = parseEnvFile(readFileSync(envPath, 'utf8'));
    databaseUrl = env.GESTISAC_DATABASE_URL || env.DATABASE_URL;
  }

  if (!databaseUrl) {
    console.error(
      'Production database URL is not available locally. ' +
        'Set GESTISAC_DATABASE_URL in this shell or pass --database-env-file <path>. ' +
        'The Vercel env pull may return secret keys with empty values.'
    );
    process.exit(1);
  }

  run('node', ['scripts/run-cargo.mjs', 'run', '--manifest-path', 'apps/api/Cargo.toml', '--bin', 'audit_database'], {
    ...process.env,
    GESTISAC_DATABASE_URL: databaseUrl
  });
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function parseArgs(items) {
  const parsed = { envFile: '', help: false };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === '--help' || item === '-h') {
      parsed.help = true;
    } else if (item === '--database-env-file' || item === '--env-file') {
      parsed.envFile = items[index + 1] || '';
      index += 1;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  pnpm run audit:prod-db
  pnpm run audit:prod-db -- --database-env-file <path>

Default local env files, if present:
  .env.database.local
  apps/api/.env.database.local
  apps/api/.env.local

The script prints only redacted schema/data counts. It never prints the database URL.`);
}

function loadOptionalEnvFiles(paths) {
  for (const envPath of paths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const env = parseEnvFile(readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function run(command, args, env = process.env) {
  const executable = process.platform === 'win32' ? 'cmd.exe' : command;
  const executableArgs =
    process.platform === 'win32' ? ['/d', '/s', '/c', [command, ...args.map(quoteArg)].join(' ')] : args;

  const result = spawnSync(executable, executableArgs, {
    env,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteArg(value) {
  if (!/[ \t"&|<>^]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^\uFEFF/, '').replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    if (key) {
      env[key] = value;
    }
  }

  return env;
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
