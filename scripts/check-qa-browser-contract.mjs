import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function requireText(path, pattern, message) {
  const content = read(path);
  if (!pattern.test(content)) {
    failures.push(`${path}: ${message}`);
  }
}

function forbidText(path, pattern, message) {
  const content = read(path);
  if (pattern.test(content)) {
    failures.push(`${path}: ${message}`);
  }
}

function walk(dir, visitor) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      walk(path, visitor);
      continue;
    }
    visitor(path, entry);
  }
}

walk(root, (path) => {
  const name = path.split(/[\\/]/).at(-1) ?? '';
  if (/^\.env\.vercel(?:\.|$)/.test(name) && !name.endsWith('.example')) {
    failures.push(`Sensitive Vercel env artifact must not be in the tree: ${relative(root, path)}`);
  }
});

requireText('.gitignore', /^\*\*\/\.env\.vercel\*/m, 'must ignore Vercel env artifacts recursively.');
requireText('.gitignore', /^test-results\/$/m, 'must ignore Playwright test-results.');
requireText('.gitignore', /^\.scrutator-screenshots\/$/m, 'must ignore Scrutator screenshots.');
requireText('.gitignore', /^playwright-report\/$/m, 'must ignore Playwright reports.');

requireText('package.json', /"test:e2e":\s*"cross-env TEST_HEADLESS=true playwright test"/, 'test:e2e must be cross-platform and headless by default.');
requireText('package.json', /"test:e2e:headed":\s*"cross-env TEST_HEADLESS=false playwright test"/, 'test:e2e:headed must be the visible-browser path.');
requireText('package.json', /"test:e2e:prod":\s*"cross-env TEST_HEADLESS=true TEST_URL=https:\/\/gestisac-web\.vercel\.app PLAYWRIGHT_SKIP_WEBSERVER=true playwright test"/, 'production E2E must use TEST_URL and skip the local webServer.');
requireText('package.json', /"guard:qa-browser":\s*"node scripts\/check-qa-browser-contract\.mjs"/, 'must expose guard:qa-browser.');
requireText('package.json', /"pre-commit":\s*"pnpm run guard:loginless-dev && pnpm run guard:qa-browser"/, 'pre-commit must block loginless and QA browser regressions.');
requireText('package.json', /"guard:git-push":\s*"pnpm run guard:loginless-dev && pnpm run guard:qa-browser &&/, 'git push guard must include QA browser guard.');

requireText('playwright.config.ts', /baseURL:\s*testUrl/, 'Playwright must use TEST_URL/baseURL, not hardcoded URLs.');
requireText('playwright.config.ts', /http:\/\/127\.0\.0\.1:4173/, 'local Playwright URL must use the static preview server.');
requireText('playwright.config.ts', /scripts\/playwright-web-server\.mjs/, 'Playwright must start the dedicated QA web server.');
requireText('playwright.config.ts', /PLAYWRIGHT_SKIP_WEBSERVER/, 'production runs must be able to skip the local webServer.');
forbidText('playwright.config.ts', /localhost:5173/, 'must not point browser QA at the Vite dev port.');

requireText('scripts/playwright-web-server.mjs', /VITE_API_BASE_URL:\s*''/, 'local QA server must force demo API instead of published API.');
requireText('scripts/playwright-web-server.mjs', /VITE_GESTISAC_LOGIN_NEEDED:\s*'false'/, 'local QA server must force loginless mode.');
requireText('scripts/playwright-web-server.mjs', /build:web:dev-login/, 'local QA server must build the dev-login web app.');

requireText('tests/e2e/manual-test.spec.ts', /process\.env\.SCRUTATOR_SCREENSHOT_DIR/, 'E2E must keep Scrutator evidence screenshots configurable.');
requireText('tests/e2e/manual-test.spec.ts', /page\.goto\(`\/\$\{context\}\/login`/, 'E2E must exercise loginless browser-session entry.');
requireText('tests/e2e/manual-test.spec.ts', /main\.app-shell/, 'E2E must verify the real app shell after loginless entry.');
forbidText('tests/e2e/manual-test.spec.ts', /chromium\.launch|from ['"]playwright['"]/, 'E2E must use Playwright test fixtures, not a manual browser launcher.');
forbidText('tests/e2e/manual-test.spec.ts', /admin@gestisac\.(?:pt|com)|Dev-8f1ee0ed883447adb5!|demo123|page\.fill\([^)]*(?:email|password)|getByLabel\([^)]*(?:email|password)/i, 'E2E must not hardcode or type manual credentials.');
forbidText('tests/e2e/manual-test.spec.ts', /localhost:5173/, 'E2E must not hardcode the old Vite dev URL.');

requireText('apps/web/src/lib/api/demo.ts', /pathname === 'warmup'/, 'demo API must implement /api/warmup for loginless local QA.');
requireText('apps/web/src/lib/session/session-store.ts', /createSessionStore\(initialRoute\?:/, 'session route state must be initialized once, not rewritten on every render.');
forbidText('apps/web/src/app.tsx', /showEntry\.value = initialRoute\.showEntry|currentPath\.value = initialRoute\.path|appContext\.value = initialRoute\.appContext/, 'App render must not reset session route signals from static location.');

forbidText('.opencode/agents/scrutator.md', /\/hq\/accounting|\/hq\/condominiums|\/worker\/tasks|\/client\/documents/, 'Scrutator prompt must not use stale English routes.');
requireText('.opencode/agents/scrutator.md', /pnpm run test:e2e:headed/, 'Scrutator prompt must document the visible-browser command.');
requireText('.opencode/agents/scrutator.md', /Do not manually type credentials in development|Never type\s+credentials/i, 'Scrutator prompt must forbid manual credentials in local QA.');

if (failures.length > 0) {
  console.error('QA browser contract failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('QA browser contract OK');
