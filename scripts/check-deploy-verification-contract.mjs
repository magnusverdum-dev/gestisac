import { readFileSync } from 'node:fs';

const failures = [];

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts || {};

if (scripts['deploy:prod:verify'] !== 'node scripts/deploy-production-verified.mjs') {
  failures.push('package.json must expose deploy:prod:verify -> node scripts/deploy-production-verified.mjs');
}

const goLiveChecklist = readFileSync('docs/29-go-live-checklist.md', 'utf8');
if (!/deploy:prod:verify/.test(goLiveChecklist)) {
  failures.push('docs/29-go-live-checklist.md must mention pnpm run deploy:prod:verify.');
}
if (!/screenshot/i.test(goLiveChecklist)) {
  failures.push('docs/29-go-live-checklist.md must mention screenshot evidence for deploy validation.');
}

const smokeDoc = readFileSync('docs/36-smoke-tests-por-melhoria.md', 'utf8');
if (!/pnpm run deploy:prod:verify/.test(smokeDoc)) {
  failures.push('docs/36-smoke-tests-por-melhoria.md must mention pnpm run deploy:prod:verify.');
}
if (!/screenshot/i.test(smokeDoc)) {
  failures.push('docs/36-smoke-tests-por-melhoria.md must mention screenshot evidence for user-visible validation.');
}

const deployOps = readFileSync('.opencode/agents/deploy-ops.md', 'utf8');
if (!/deploy:prod:verify/.test(deployOps)) {
  failures.push('.opencode/agents/deploy-ops.md must mention pnpm run deploy:prod:verify.');
}
if (!/screenshot evidence|screenshots/i.test(deployOps)) {
  failures.push('.opencode/agents/deploy-ops.md must require screenshot evidence before calling a deploy validated.');
}

const startupAudit = readFileSync('docs/37-auditoria-arranque-loginless-servidor.md', 'utf8');
if (!/gestisac\.sessionToken/.test(startupAudit) || !/VITE_API_BASE_URL/.test(startupAudit)) {
  failures.push('docs/37-auditoria-arranque-loginless-servidor.md must document session token and API base URL startup invariants.');
}
if (!/test:e2e:prod:headed/.test(startupAudit) || !/screenshots/i.test(startupAudit)) {
  failures.push('docs/37-auditoria-arranque-loginless-servidor.md must document user-visible production smoke and screenshots.');
}

if (failures.length) {
  console.error('Deploy verification contract failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Deploy verification contract OK');
