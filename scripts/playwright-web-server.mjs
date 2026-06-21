import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const pnpm = 'pnpm';
const workspaceRoot = process.cwd();
const distRoot = resolve(workspaceRoot, 'apps/web/dist');
const host = process.env.PLAYWRIGHT_PREVIEW_HOST || '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_PREVIEW_PORT || 4173);

function spawnProcess(command, args) {
  const env = {
    ...process.env,
    VITE_API_BASE_URL: '',
    VITE_GESTISAC_DEV_LOGIN_EMAIL: '',
    VITE_GESTISAC_DEV_LOGIN_PASSWORD: '',
    VITE_GESTISAC_LOGIN_NEEDED: 'false'
  };

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', command, ...args], {
      env,
      stdio: 'inherit',
      windowsHide: true
    });
  }

  return spawn(command, args, {
    env,
    stdio: 'inherit',
    windowsHide: true
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args);

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
    });
  });
}

await run(pnpm, ['run', 'build:web:dev-login']);

const server = createServer(async (request, response) => {
  try {
    const filePath = await resolveRequestPath(request.url ?? '/');
    const contentType = contentTypeFor(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Failed to serve test app');
  }
});

server.listen(port, host, () => {
  console.log(`Playwright static web server listening at http://${host}:${port}`);
});

const stopServer = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);

async function resolveRequestPath(rawUrl) {
  const { pathname } = new URL(rawUrl, `http://${host}:${port}`);
  const requestedPath = decodeURIComponent(pathname);
  const relativePath = normalize(requestedPath.replace(/^\/+/, ''));
  const candidate = resolve(distRoot, relativePath);

  if (!candidate.startsWith(distRoot + sep) && candidate !== distRoot) {
    return join(distRoot, 'index.html');
  }

  const filePath = await firstExistingFile([
    candidate,
    join(candidate, 'index.html'),
    join(distRoot, 'index.html')
  ]);

  return filePath;
}

async function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next static fallback.
    }
  }

  throw new Error('No static index.html found for Playwright server');
}

function contentTypeFor(filePath) {
  const extension = extname(filePath).toLowerCase();
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  return types[extension] ?? 'application/octet-stream';
}
