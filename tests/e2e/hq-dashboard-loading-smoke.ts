import { chromium } from 'playwright';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../.scrutator-screenshots');
const BASE_URL = 'https://gestisac-web.vercel.app';
const TARGET = '/hq/dashboard';

async function run() {
  const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages: { type: string; text: string; time: string }[] = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      time: new Date().toISOString(),
    });
  });

  // Collect page errors
  const pageErrors: { message: string; time: string }[] = [];
  page.on('pageerror', err => {
    pageErrors.push({
      message: err.message,
      time: new Date().toISOString(),
    });
  });

  // Track network responses
  const networkResponses: { url: string; status: number; time: string }[] = [];
  page.on('response', resp => {
    networkResponses.push({
      url: resp.url(),
      status: resp.status(),
      time: new Date().toISOString(),
    });
  });

  console.log(`\n=== HQ Dashboard Loading Smoke Test ===`);
  console.log(`Target: ${BASE_URL}${TARGET}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Step 1: Navigate to the HQ dashboard
  const navStart = Date.now();
  console.log(`[Step 1] Navigating to ${BASE_URL}${TARGET}...`);
  
  try {
    const response = await page.goto(`${BASE_URL}${TARGET}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    const navTime = Date.now() - navStart;
    console.log(`[Step 1] Navigation complete in ${navTime}ms. HTTP status: ${response?.status()}`);
  } catch (err: any) {
    console.log(`[Step 1] Navigation error: ${err.message}`);
  }

  // Step 2: Screenshot immediately - initial state
  const ss1 = path.join(SCREENSHOT_DIR, `hq-dashboard-initial-${timestamp()}.png`);
  await page.screenshot({ path: ss1, fullPage: true });
  console.log(`[Step 2] Screenshot taken (initial): ${ss1}`);
  
  // Check initial page state
  const title1 = await page.title();
  const url1 = page.url();
  const bodyText1 = await page.locator('body').innerText().catch(() => '(could not read)');
  console.log(`[Step 2] Title: "${title1}"`);
  console.log(`[Step 2] URL: "${url1}"`);
  console.log(`[Step 2] Body text (first 500 chars): ${bodyText1.substring(0, 500)}`);

  // Check for progress bar or loading indicators
  const hasProgressBar = await page.locator('[role="progressbar"], .progress-bar, [class*="progress"], [class*="loading"]').count();
  console.log(`[Step 2] Progress/loading indicators found: ${hasProgressBar}`);

  // Step 3: Wait 15 seconds, take screenshot
  console.log(`\n[Step 3] Waiting 15 seconds...`);
  await page.waitForTimeout(15000);
  
  const ss2 = path.join(SCREENSHOT_DIR, `hq-dashboard-15s-${timestamp()}.png`);
  await page.screenshot({ path: ss2, fullPage: true });
  console.log(`[Step 3] Screenshot taken (after 15s): ${ss2}`);
  
  const url2 = page.url();
  const bodyText2 = await page.locator('body').innerText().catch(() => '(could not read)');
  console.log(`[Step 3] URL: "${url2}"`);
  console.log(`[Step 3] Body text (first 500 chars): ${bodyText2.substring(0, 500)}`);

  // Check for the specific error message
  const hasSessionError = bodyText2.includes('Sessao iniciada') || bodyText2.includes('sessao iniciada') || bodyText2.includes('Sessão iniciada') || bodyText2.includes('dashboard ainda nao carregou') || bodyText2.includes('dashboard ainda não carregou');
  console.log(`[Step 3] Has "session started but dashboard not loaded" error: ${hasSessionError}`);

  // Check progress percentage text
  const progressMatch = bodyText2.match(/(\d+)%/g);
  if (progressMatch) {
    console.log(`[Step 3] Progress percentages found: ${progressMatch.join(', ')}`);
  }

  // Check for error messages
  const errorToasts = await page.locator('[role="alert"], .error, .toast-error, [class*="error"]').count();
  console.log(`[Step 3] Error elements found: ${errorToasts}`);

  // Step 4: Wait 30 more seconds (45s total), take screenshot
  console.log(`\n[Step 4] Waiting 30 more seconds (45s total)...`);
  await page.waitForTimeout(30000);
  
  const ss3 = path.join(SCREENSHOT_DIR, `hq-dashboard-45s-${timestamp()}.png`);
  await page.screenshot({ path: ss3, fullPage: true });
  console.log(`[Step 4] Screenshot taken (after 45s): ${ss3}`);
  
  const url3 = page.url();
  const bodyText3 = await page.locator('body').innerText().catch(() => '(could not read)');
  console.log(`[Step 4] URL: "${url3}"`);
  console.log(`[Step 4] Body text (first 500 chars): ${bodyText3.substring(0, 500)}`);

  // Check if dashboard loaded
  const dashboardLoaded = url3.includes('/hq/dashboard') && (
    bodyText3.includes('Dashboard') || 
    bodyText3.includes('dashboard') ||
    bodyText3.includes('Condomínios') ||
    bodyText3.includes('condomínios') ||
    bodyText3.includes('condominios') ||
    bodyText3.includes('Welcome') ||
    bodyText3.includes('Bem-vindo')
  );
  console.log(`[Step 4] Dashboard appears loaded: ${dashboardLoaded}`);

  // Step 5: If session error exists, wait 30 more seconds for retry
  const hasSessionError3 = bodyText3.includes('Sessao iniciada') || bodyText3.includes('sessao iniciada') || bodyText3.includes('Sessão iniciada') || bodyText3.includes('dashboard ainda nao carregou') || bodyText3.includes('dashboard ainda não carregou');
  
  if (hasSessionError3) {
    console.log(`\n[Step 5] Session error still present after 45s. Waiting 30 more seconds for retry...`);
    await page.waitForTimeout(30000);
    
    const ss4 = path.join(SCREENSHOT_DIR, `hq-dashboard-75s-${timestamp()}.png`);
    await page.screenshot({ path: ss4, fullPage: true });
    console.log(`[Step 5] Screenshot taken (after 75s): ${ss4}`);
    
    const url4 = page.url();
    const bodyText4 = await page.locator('body').innerText().catch(() => '(could not read)');
    console.log(`[Step 5] URL: "${url4}"`);
    console.log(`[Step 5] Body text (first 500 chars): ${bodyText4.substring(0, 500)}`);
    
    const hasSessionError4 = bodyText4.includes('Sessao iniciada') || bodyText4.includes('sessao iniciada') || bodyText4.includes('Sessão iniciada') || bodyText4.includes('dashboard ainda nao carregou') || bodyText4.includes('dashboard ainda não carregou');
    console.log(`[Step 5] Session error still present after 75s: ${hasSessionError4}`);
  }

  // Step 6: Final screenshot
  console.log(`\n[Step 6] Taking final screenshot...`);
  const ss5 = path.join(SCREENSHOT_DIR, `hq-dashboard-final-${timestamp()}.png`);
  await page.screenshot({ path: ss5, fullPage: true });
  console.log(`[Step 6] Final screenshot: ${ss5}`);
  
  const finalUrl = page.url();
  const finalBody = await page.locator('body').innerText().catch(() => '(could not read)');
  console.log(`[Step 6] Final URL: "${finalUrl}"`);
  console.log(`[Step 6] Final body text (first 1000 chars): ${finalBody.substring(0, 1000)}`);

  // Check for dashboard content elements
  const sidebarCount = await page.locator('aside, nav, [class*="sidebar"], [class*="menu"]').count();
  const cardCount = await page.locator('[class*="card"], [class*="Card"]').count();
  const chartCount = await page.locator('canvas, svg, [class*="chart"]').count();
  console.log(`[Step 6] Sidebar/nav elements: ${sidebarCount}`);
  console.log(`[Step 6] Card elements: ${cardCount}`);
  console.log(`[Step 6] Chart elements: ${chartCount}`);

  // Print console errors
  const errors = consoleMessages.filter(m => m.type === 'error');
  const warnings = consoleMessages.filter(m => m.type === 'warning');
  
  console.log(`\n=== Console Messages Summary ===`);
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log(`\n--- Console Errors ---`);
    errors.forEach((e, i) => console.log(`  [${i + 1}] [${e.time}] ${e.text}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n--- Console Warnings ---`);
    warnings.slice(0, 10).forEach((w, i) => console.log(`  [${i + 1}] [${w.time}] ${w.text}`));
    if (warnings.length > 10) console.log(`  ... and ${warnings.length - 10} more warnings`);
  }

  // Print page errors
  if (pageErrors.length > 0) {
    console.log(`\n--- Page Errors (uncaught exceptions) ---`);
    pageErrors.forEach((e, i) => console.log(`  [${i + 1}] [${e.time}] ${e.message}`));
  }

  // Print relevant network responses (non-200 or API calls)
  const apiResponses = networkResponses.filter(r => r.url.includes('/api/') || r.url.includes('vercel') || r.status >= 400);
  if (apiResponses.length > 0) {
    console.log(`\n--- API/Network Responses ---`);
    apiResponses.forEach((r, i) => console.log(`  [${i + 1}] ${r.status} ${r.url.substring(0, 120)}`));
  }

  // Final verdict
  const finalDashboardLoaded = finalUrl.includes('/hq/dashboard') && finalBody.length > 200;
  console.log(`\n=== FINAL VERDICT ===`);
  console.log(`Dashboard loaded: ${finalDashboardLoaded ? '✅ YES' : '❌ NO'}`);
  console.log(`Progress advanced beyond initial: ${finalBody.includes('%') ? 'Yes (percentages visible)' : 'Not visible in text'}`);
  console.log(`Session error present: ${hasSessionError3 || hasSessionError ? '⚠️ YES' : '✅ NO'}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  await browser.close();
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
