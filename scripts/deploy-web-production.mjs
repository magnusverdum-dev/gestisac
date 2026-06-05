import { spawnSync } from 'node:child_process';

const webCwd = 'apps/web';
const preflightOnly = process.argv.includes('--preflight-only');

const preflightSteps = [
  ['Vercel project roots', 'node', ['scripts/check-vercel-projects.mjs']],
  ['Web typecheck', 'pnpm', ['run', 'typecheck:web']],
  ['Web production build', 'node', ['scripts/vercel-build-web-production.mjs']],
  ['Production readiness', 'node', ['scripts/check-production-readiness.mjs']]
];

for (const [label, command, args] of preflightSteps) {
  console.log(`\n[deploy-web-production] ${label}`);
  const result = run(command, args);
  if (result.status !== 0 || result.error) {
    console.error(`[deploy-web-production] Preflight failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[deploy-web-production] Preflights passed.');

if (preflightOnly) {
  console.log('[deploy-web-production] --preflight-only set; deploy skipped.');
  process.exit(0);
}

console.log(`[deploy-web-production] Deploying Web to Vercel Production from ${webCwd}.`);

const result = run('npx', ['vercel', 'deploy', '--prebuilt', '--prod', '--yes', '--cwd', webCwd]);
process.exit(result.status ?? 1);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
}
