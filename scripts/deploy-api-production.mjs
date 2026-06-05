import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const project = JSON.parse(readFileSync('apps/api/.vercel/project.json', 'utf8'));
const preflightOnly = process.argv.includes('--preflight-only');
const apiCwd = 'apps/api';

const preflightSteps = [
  ['Vercel project roots', 'node', ['scripts/check-vercel-projects.mjs']],
  ['Migration audit', 'node', ['scripts/audit-database-migrations.mjs']],
  ['Foreign-key index audit', 'node', ['scripts/audit-foreign-key-indexes.mjs']],
  ['API entrypoints', 'node', ['scripts/check-api-entrypoints.mjs']],
  ['Rust API check', 'node', ['scripts/run-cargo.mjs', 'check', '--manifest-path', 'apps/api/Cargo.toml']],
  [
    'Rust API formatting',
    'node',
    ['scripts/run-cargo.mjs', 'fmt', '--manifest-path', 'apps/api/Cargo.toml', '--', '--check']
  ],
  [
    'Rust API clippy',
    'node',
    ['scripts/run-cargo.mjs', 'clippy', '--manifest-path', 'apps/api/Cargo.toml', '--', '-D', 'warnings']
  ],
  ['Rust API tests', 'node', ['scripts/run-cargo.mjs', 'test', '--manifest-path', 'apps/api/Cargo.toml']],
  ['Production readiness', 'node', ['scripts/check-production-readiness.mjs']]
];

for (const [label, command, args] of preflightSteps) {
  console.log(`\n[deploy-api-production] ${label}`);
  const result = run(command, args);
  if (result.status !== 0 || result.error) {
    console.error(`[deploy-api-production] Preflight failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[deploy-api-production] Preflights passed.');

if (preflightOnly) {
  console.log('[deploy-api-production] --preflight-only set; deploy skipped.');
  process.exit(0);
}

console.log(`[deploy-api-production] Deploying API to Vercel Production from ${apiCwd}.`);

const result = run('npx', ['vercel', 'deploy', '--prod', '--yes', '--cwd', apiCwd], {
  env: {
    ...process.env,
    VERCEL_ORG_ID: project.orgId,
    VERCEL_PROJECT_ID: project.projectId
  }
});

process.exit(result.status ?? 1);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
}
