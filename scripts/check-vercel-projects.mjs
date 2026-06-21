import { spawnSync } from 'node:child_process';

const projects = [
  { name: 'gestisac-api', expectedRootDirectory: 'apps/api', expectedBuildCommand: null },
  { name: 'gestisac-web', expectedRootDirectory: 'apps/web' }
];

const failures = [];

for (const project of projects) {
  const output = inspectProject(project.name);
  const rootDirectory = parseRootDirectory(output);
  const apiProject = inspectProjectApi(project.name);

  if (rootDirectory !== project.expectedRootDirectory) {
    failures.push(
      `${project.name} Root Directory is "${rootDirectory || '<unset>'}" but expected "${project.expectedRootDirectory}".`
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(project, 'expectedBuildCommand') &&
    (apiProject?.buildCommand ?? null) !== project.expectedBuildCommand
  ) {
    failures.push(
      `${project.name} Build Command is "${apiProject?.buildCommand || '<empty>'}" but expected no override so the Rust Runtime can build api/*.rs functions.`
    );
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log('Vercel project root directories are aligned.');

function inspectProject(projectName) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx vercel project inspect ${projectName}`]
      : ['vercel', 'project', 'inspect', projectName];

  const result = spawnSync(command, args, { encoding: 'utf8' });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;

  if (result.error || result.status !== 0) {
    const details = String(result.error?.message || output).trim();
    failures.push(`Unable to inspect ${projectName}${details ? `: ${details}` : ''}`);
    return '';
  }

  return output;
}

function parseRootDirectory(output) {
  const line = output
    .split(/\r?\n/)
    .map(stripAnsi)
    .find((item) => item.includes('Root Directory'));

  if (!line) return '';

  return line
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^Root Directory\s*/, '')
    .trim();
}

function inspectProjectApi(projectName) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx vercel api /v9/projects/${projectName}`]
      : ['vercel', 'api', `/v9/projects/${projectName}`];

  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    const details = String(result.error?.message || result.stderr || result.stdout || '').trim();
    failures.push(`Unable to inspect ${projectName} via Vercel API${details ? `: ${details}` : ''}`);
    return null;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    failures.push(`Unable to parse Vercel API response for ${projectName}.`);
    return null;
  }
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}
