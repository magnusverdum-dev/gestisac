import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

type AppContext = 'hq' | 'worker' | 'client';

type SmokePage = {
  context: AppContext;
  name: string;
  path: string;
  expectedText: RegExp;
};

const screenshotDir = process.env.SCRUTATOR_SCREENSHOT_DIR || '.scrutator-screenshots';

const smokePages: SmokePage[] = [
  { context: 'hq', name: 'HQ-Dashboard', path: '/dashboard', expectedText: /dashboard|painel/i },
  { context: 'hq', name: 'HQ-Condominios', path: '/condominios', expectedText: /condominios/i },
  { context: 'hq', name: 'HQ-Contabilidade', path: '/contabilidade', expectedText: /contabilidade/i },
  { context: 'hq', name: 'HQ-Calendario', path: '/calendario', expectedText: /calendario|agenda/i },
  { context: 'hq', name: 'HQ-Tarefas', path: '/tarefas', expectedText: /tarefas/i },
  { context: 'hq', name: 'HQ-Pedidos', path: '/tickets', expectedText: /pedidos|tickets|ocorrencias/i },
  { context: 'worker', name: 'Worker-Dashboard', path: '/dashboard', expectedText: /dashboard|tarefas/i },
  { context: 'worker', name: 'Worker-Tarefas', path: '/tarefas', expectedText: /tarefas/i },
  { context: 'worker', name: 'Worker-Pedidos', path: '/tickets', expectedText: /pedidos|tickets|ocorrencias/i },
  { context: 'worker', name: 'Worker-Calendario', path: '/calendario', expectedText: /calendario|agenda/i },
  { context: 'client', name: 'Client-Dashboard', path: '/dashboard', expectedText: /dashboard|condominio/i },
  { context: 'client', name: 'Client-Pedidos', path: '/tickets', expectedText: /pedidos|tickets|ocorrencias/i },
  { context: 'client', name: 'Client-Documentos', path: '/documentos', expectedText: /documentos/i },
  { context: 'client', name: 'Client-Calendario', path: '/calendario', expectedText: /calendario|agenda/i },
];

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectBrowserErrors(page: Page, testInfo: TestInfo) {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      messages.push(`[console] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.message}`);
  });

  return async () => {
    if (messages.length > 0) {
      await testInfo.attach('browser-errors', {
        body: messages.join('\n'),
        contentType: 'text/plain',
      });
    }
  };
}

async function startLoginlessSession(page: Page, context: AppContext) {
  await page.context().clearCookies();
  await page.goto(`/${context}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${context}/dashboard(?:$|[?#])`), {
    timeout: 45000,
  });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('main.app-shell')).toBeVisible({ timeout: 15000 });
}

async function openSmokePage(page: Page, smokePage: SmokePage) {
  await page.goto(`/${smokePage.context}${smokePage.path}`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(
    new RegExp(`/${smokePage.context}${escapeRegExp(smokePage.path)}(?:$|[?#])`),
    { timeout: 15000 },
  );
  await expect(page.locator('main.app-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('body')).toContainText(smokePage.expectedText, { timeout: 20000 });
  await expect(page.locator('body')).not.toContainText(/credenciais invalidas|sessao automatica indisponivel/i);
}

async function captureEvidence(page: Page, smokePage: SmokePage, testInfo: TestInfo) {
  const path = join(screenshotDir, `${smokePage.name.toLowerCase()}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(smokePage.name, { path, contentType: 'image/png' });
}

test.describe('GESTISAC loginless browser smoke', () => {
  for (const smokePage of smokePages) {
    test(smokePage.name, async ({ page }, testInfo) => {
      const flushBrowserErrors = collectBrowserErrors(page, testInfo);

      try {
        await startLoginlessSession(page, smokePage.context);
        await openSmokePage(page, smokePage);
        await captureEvidence(page, smokePage, testInfo);
      } finally {
        await flushBrowserErrors();
      }
    });
  }
});
