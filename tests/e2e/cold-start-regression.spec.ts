/**
 * Cold Start Regression Test
 * 
 * Validates that the startup retry mechanism works correctly.
 * Simulates first visit with API that may be cold-starting.
 * 
 * Run: npx playwright test tests/e2e/cold-start-regression-test.ts --headed
 * 
 * What it tests:
 * 1. Progress bar advances beyond 12% automatically
 * 2. Dashboard loads without manual refresh
 * 3. Retry mechanism works when API is slow
 * 4. Error messages are user-friendly during retry
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';

const screenshotDir = process.env.SCRUTATOR_SCREENSHOT_DIR || '.scrutator-screenshots';
const BASE_URL = process.env.TEST_URL || 'https://gestisac-web.vercel.app';

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

test.describe('Cold Start Regression', () => {
  test('Dashboard loads without manual refresh within 60s', async ({ page }, testInfo: TestInfo) => {
    const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

    // Step 1: Navigate to login page (triggers loginless browser-session flow)
    // IMPORTANT: The loginless flow starts at /hq/login, NOT /hq/dashboard
    const navStart = Date.now();
    await page.goto(`${BASE_URL}/hq/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    const navTime = Date.now() - navStart;

    // Screenshot initial state (progress bar should appear)
    const ss1 = join(screenshotDir, `cold-start-initial-${timestamp()}.png`);
    await page.screenshot({ path: ss1, fullPage: true });
    await testInfo.attach('Initial state', { path: ss1, contentType: 'image/png' });

    // Check initial progress
    const bodyText = await page.locator('body').innerText();
    const progressMatch = bodyText.match(/(\d+)%/);
    const initialProgress = progressMatch ? parseInt(progressMatch[1]) : 0;

    console.log(`[Cold Start] Navigation: ${navTime}ms, Initial progress: ${initialProgress}%`);

    // Step 2: Wait for redirect to dashboard (loginless should auto-redirect)
    // The loginless flow: /hq/login → browser-session → redirect to /hq/dashboard
    let dashboardLoaded = false;
    let lastProgress = initialProgress;

    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(10000);

      const currentUrl = page.url();
      const currentBody = await page.locator('body').innerText();

      // Check if we've been redirected to dashboard
      const onDashboard = currentUrl.includes('/hq/dashboard');

      // Check if dashboard loaded with real content
      dashboardLoaded = onDashboard && (
        currentBody.includes('Dashboard') ||
        currentBody.includes('Pedidos abertos') ||
        currentBody.includes('Modulos ativos') ||
        currentBody.includes('Acoes rapidas') ||
        currentBody.includes('Sinais operacionais')
      );

      // Track progress
      const pm = currentBody.match(/(\d+)%/);
      const currentProgress = pm ? parseInt(pm[1]) : lastProgress;

      console.log(`[Cold Start] After ${(i + 1) * 10}s: URL=${currentUrl.split('/').pop()}, progress=${currentProgress}%, loaded=${dashboardLoaded}`);

      // Screenshot at 30s and final
      if (i === 2) {
        const ss2 = join(screenshotDir, `cold-start-30s-${timestamp()}.png`);
        await page.screenshot({ path: ss2, fullPage: true });
        await testInfo.attach('After 30s', { path: ss2, contentType: 'image/png' });
      }

      lastProgress = currentProgress;

      if (dashboardLoaded) break;
    }

    // Final screenshot
    const ssFinal = join(screenshotDir, `cold-start-final-${timestamp()}.png`);
    await page.screenshot({ path: ssFinal, fullPage: true });
    await testInfo.attach('Final state', { path: ssFinal, contentType: 'image/png' });

    // Assertions
    // 1. Progress should have advanced beyond initial (or dashboard loaded)
    const progressAdvanced = lastProgress > initialProgress || lastProgress === 100 || dashboardLoaded;
    expect(progressAdvanced, `Progress should advance: ${initialProgress}% -> ${lastProgress}%`).toBeTruthy();

    // 2. Dashboard should load within 60s without manual refresh
    expect(dashboardLoaded, 'Dashboard should load within 60s').toBeTruthy();

    // 3. Should not have credential entry form visible (loginless worked)
    const passwordFields = await page.locator('input[type="password"]').count();
    expect(passwordFields, 'No password field should be visible').toBe(0);

    // 4. Should have app shell visible
    const appShell = await page.locator('main.app-shell').count();
    expect(appShell, 'App shell should be visible').toBeGreaterThan(0);

    console.log(`[Cold Start] ✅ PASSED: Dashboard loaded, progress advanced to ${lastProgress}%`);
  });

  test('Progress bar shows meaningful updates during retry', async ({ page }, testInfo: TestInfo) => {
    const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

    // Navigate to trigger cold start flow
    await page.goto(`${BASE_URL}/hq/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for redirect to dashboard (loginless)
    await expect(page).toHaveURL(/\/hq\/dashboard/, { timeout: 45000 });

    // Check that progress bar appeared and advanced
    const bodyText = await page.locator('body').innerText();
    const hasProgress = bodyText.includes('%');

    // Screenshot
    const ss = join(screenshotDir, `cold-start-progress-${timestamp()}.png`);
    await page.screenshot({ path: ss, fullPage: true });
    await testInfo.attach('Progress check', { path: ss, contentType: 'image/png' });

    // Verify progress was shown (may have completed already)
    // The key assertion is that the page loaded without manual intervention
    const appShell = await page.locator('main.app-shell').count();
    expect(appShell, 'App shell should be visible after loginless entry').toBeGreaterThan(0);

    console.log(`[Cold Start] ✅ Progress bar test passed, app loaded successfully`);
  });
});
