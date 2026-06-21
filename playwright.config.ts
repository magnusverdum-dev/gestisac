import { defineConfig } from '@playwright/test';

const isHeadless = process.env.TEST_HEADLESS?.toLowerCase() !== 'false';
const testUrl = (process.env.TEST_URL?.trim() || 'http://127.0.0.1:4173').replace(/\/$/, '');
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER?.toLowerCase() === 'true';
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.trim() || 'node scripts/playwright-web-server.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  webServer: skipWebServer
    ? undefined
    : {
        command: webServerCommand,
        url: testUrl,
        reuseExistingServer: false,
        timeout: 180000,
      },
  use: {
    baseURL: testUrl,
    headless: isHeadless,
    viewport: { width: 1400, height: 900 },
    actionTimeout: 15000,
    screenshot: 'on',
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', launchOptions: { headless: isHeadless } },
    },
  ],
});
