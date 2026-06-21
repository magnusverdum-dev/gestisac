import { spawnSync } from 'node:child_process';

const steps = [
  ['API production deploy', 'pnpm', ['run', 'deploy:api:prod']],
  ['Web production deploy', 'pnpm', ['run', 'deploy:web:prod']],
  ['User-visible production smoke', 'pnpm', ['run', 'test:e2e:prod:headed']]
];

for (const [label, command, args] of steps) {
  console.log(`\n[deploy-production-verified] ${label}`);
  const result = run(command, args);
  if (result.status !== 0 || result.error) {
    console.error(`[deploy-production-verified] Failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[deploy-production-verified] Production is deployed and verified from the user perspective.');
console.log('[deploy-production-verified] Screenshot evidence should be available in .scrutator-screenshots/.');

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}
