import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const webCwd = 'apps/web';
const envPath = path.join(webCwd, '.vercel', '.env.production.local');

await run('npx', ['vercel', 'pull', '--yes', '--environment=production', '--cwd', webCwd]);
const pulledEnv = parseEnvFile(await readFile(envPath, 'utf8'));

await run('npx', ['vercel', 'build', '--prod', '--cwd', webCwd], {
  ...process.env,
  ...pulledEnv
});

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
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

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === 'win32' ? 'cmd.exe' : command;
    const executableArgs =
      process.platform === 'win32' ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args;
    const child = spawn(executable, executableArgs, {
      env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}
