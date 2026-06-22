import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../../.scrutator-screenshots');
const BASE_URL = 'https://gestisac-web.vercel.app';
const TARGET = '/hq/dashboard';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text(), time: new Date().toISOString() });
  });

  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push({ message: err.message, time: new Date().toISOString() });
  });

  console.log(`\n========================================`);
  console.log(`HQ Dashboard Loading Smoke Test`);
  console.log(`Target: ${BASE_URL}${TARGET}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  // Step 1: Navigate
  const t0 = Date.now();
  console.log(`[Step 1] Navigating to ${BASE_URL}${TARGET}...`);
  try {
    const resp = await page.goto(`${BASE_URL}${TARGET}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[Step 1] Done in ${Date.now() - t0}ms. HTTP: ${resp?.status()}`);
  } catch (e) {
    console.log(`[Step 1] Error: ${e.message}`);
  }

  // Step 2: Immediate screenshot
  let ss = path.join(SCREENSHOT_DIR, `hq-smoke-01-initial-${ts()}.png`);
  await page.screenshot({ path: ss, fullPage: true });
  console.log(`[Step 2] Screenshot: ${ss}`);
  console.log(`[Step 2] URL: ${page.url()}`);
  let bodyText = await page.locator('body').innerText().catch(() => '(error reading body)');
  console.log(`[Step 2] Body (500ch): ${bodyText.substring(0, 500)}`);
  let progressEls = await page.locator('[role="progressbar"], [class*="progress"], [class*="loading"]').count();
  console.log(`[Step 2] Progress/loading indicators: ${progressEls}`);

  // Step 3: Wait 15s
  console.log(`\n[Step 3] Waiting 15s...`);
  await page.waitForTimeout(15000);
  ss = path.join(SCREENSHOT_DIR, `hq-smoke-02-15s-${ts()}.png`);
  await page.screenshot({ path: ss, fullPage: true });
  console.log(`[Step 3] Screenshot: ${ss}`);
  console.log(`[Step 3] URL: ${page.url()}`);
  bodyText = await page.locator('body').innerText().catch(() => '(error reading body)');
  console.log(`[Step 3] Body (500ch): ${bodyText.substring(0, 500)}`);
  let pcts = bodyText.match(/\d+%/g);
  console.log(`[Step 3] Percentages: ${pcts ? pcts.join(', ') : 'none'}`);
  let hasErr = /Sess[ãa]o iniciada|dashboard ainda (nao|não) carregou/i.test(bodyText);
  console.log(`[Step 3] Session error text: ${hasErr}`);

  // Step 4: Wait 30 more s (45s total)
  console.log(`\n[Step 4] Waiting 30s more (45s total)...`);
  await page.waitForTimeout(30000);
  ss = path.join(SCREENSHOT_DIR, `hq-smoke-03-45s-${ts()}.png`);
  await page.screenshot({ path: ss, fullPage: true });
  console.log(`[Step 4] Screenshot: ${ss}`);
  console.log(`[Step 4] URL: ${page.url()}`);
  bodyText = await page.locator('body').innerText().catch(() => '(error reading body)');
  console.log(`[Step 4] Body (500ch): ${bodyText.substring(0, 500)}`);
  hasErr = /Sess[ãa]o iniciada|dashboard ainda (nao|não) carregou/i.test(bodyText);
  console.log(`[Step 4] Session error text: ${hasErr}`);

  // Step 5: If error still present, wait 30 more s (75s total)
  if (hasErr) {
    console.log(`\n[Step 5] Error still present. Waiting 30s more for retry (75s total)...`);
    await page.waitForTimeout(30000);
    ss = path.join(SCREENSHOT_DIR, `hq-smoke-04-75s-${ts()}.png`);
    await page.screenshot({ path: ss, fullPage: true });
    console.log(`[Step 5] Screenshot: ${ss}`);
    console.log(`[Step 5] URL: ${page.url()}`);
    bodyText = await page.locator('body').innerText().catch(() => '(error reading body)');
    console.log(`[Step 5] Body (500ch): ${bodyText.substring(0, 500)}`);
    hasErr = /Sess[ãa]o iniciada|dashboard ainda (nao|não) carregou/i.test(bodyText);
    console.log(`[Step 5] Session error: ${hasErr}`);
  }

  // Step 6: Final screenshot
  console.log(`\n[Step 6] Final screenshot...`);
  ss = path.join(SCREENSHOT_DIR, `hq-smoke-05-final-${ts()}.png`);
  await page.screenshot({ path: ss, fullPage: true });
  console.log(`[Step 6] Screenshot: ${ss}`);
  console.log(`[Step 6] URL: ${page.url()}`);
  bodyText = await page.locator('body').innerText().catch(() => '(error reading body)');
  console.log(`[Step 6] Body (1000ch): ${bodyText.substring(0, 1000)}`);

  const sidebar = await page.locator('aside, nav, [class*="sidebar"], [class*="menu"], [class*="Sidebar"]').count();
  const cards = await page.locator('[class*="card"], [class*="Card"]').count();
  console.log(`[Step 6] Sidebar/nav: ${sidebar}, Cards: ${cards}`);

  // Console errors
  const errors = consoleMessages.filter(m => m.type === 'error');
  const warnings = consoleMessages.filter(m => m.type === 'warning');
  console.log(`\n========================================`);
  console.log(`Console: ${consoleMessages.length} total, ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e, i) => console.log(`  [${i + 1}] ${e.text}`));
  }
  if (pageErrors.length > 0) {
    console.log(`\nPage Errors (uncaught):`);
    pageErrors.forEach((e, i) => console.log(`  [${i + 1}] ${e.message}`));
  }

  // Verdict
  const loaded = bodyText.length > 200 && !hasErr;
  console.log(`\n========================================`);
  console.log(`FINAL VERDICT`);
  console.log(`Dashboard loaded: ${loaded ? 'YES' : 'NO'}`);
  console.log(`Session error present: ${hasErr ? 'YES' : 'NO'}`);
  console.log(`Body text length: ${bodyText.length}`);
  console.log(`========================================`);

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
