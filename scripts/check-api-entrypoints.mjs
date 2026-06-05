import { spawnSync } from 'node:child_process';

const entrypoints = [
  ['standalone always-on API', 'gestisac-api'],
  ['Vercel serverless API', 'server']
];

for (const [label, bin] of entrypoints) {
  console.log(`[check-api-entrypoints] Checking ${label} (${bin})`);
  const result = run('node', [
    'scripts/run-cargo.mjs',
    'check',
    '--manifest-path',
    'apps/api/Cargo.toml',
    '--bin',
    bin
  ]);

  if (result.status !== 0 || result.error) {
    console.error(`[check-api-entrypoints] Failed: ${label} (${bin})`);
    process.exit(result.status ?? 1);
  }
}

console.log('[check-api-entrypoints] API entrypoints compile.');

function run(command, args) {
  return spawnSync(commandForPlatform(command), argsForPlatform(command, args), {
    stdio: 'inherit'
  });
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
