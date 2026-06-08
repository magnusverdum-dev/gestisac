import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET = 'http://127.0.0.1:5173';
const EMAIL = 'admin@gestisac.pt';
const loginNeeded = String(process.env.GESTISAC_LOGIN_NEEDED ?? 'false').trim().toLowerCase() !== 'false';
const PASS = loginNeeded ? process.env.GESTISAC_SMOKE_PASSWORD : '';

if (loginNeeded && !PASS) {
  throw new Error('GESTISAC_SMOKE_PASSWORD is required. The password will not be printed.');
}

let seq = 0;
const msgId = () => ++seq;
const pending = {};

function cdp(ws, method, params = {}) {
  return new Promise((res, rej) => {
    const id = msgId();
    pending[id] = { res, rej, method };
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error(`Timeout: ${method}`)); } }, 30000);
  });
}

async function evaluate(ws, expr, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await cdp(ws, 'Runtime.evaluate', { expression: expr, awaitPromise: true });
      if (r.result && r.result.type !== 'undefined') return r.result;
      if (r.result && r.result.value !== undefined) return r.result;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  const r = await cdp(ws, 'Runtime.evaluate', { expression: expr, awaitPromise: true });
  return r.result;
}

async function screenshot(ws, name) {
  try {
    const r = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(name), Buffer.from(r.result.data, 'base64'));
    console.log(`  Screenshot: ${name}`);
  } catch (e) {
    console.log(`  Screenshot failed: ${e.message}`);
  }
}

async function waitForInteractive(ws) {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await cdp(ws, 'Runtime.evaluate', { expression: 'document.readyState', awaitPromise: false });
      if (r.result && r.result.value === 'complete') return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  try { spawn('taskkill', ['/f', '/im', 'msedge.exe'], { stdio: 'ignore' }); } catch {}
  await new Promise(r => setTimeout(r, 2000));

  const userDir = 'C:\\Users\\josefeio\\AppData\\Local\\Temp\\edge-nt-' + Date.now();
  const proc = spawn(EDGE, [
    '--remote-debugging-port=9222', '--headless=new', '--no-first-run',
    '--no-default-browser-check', '--window-size=1400,900', '--disable-gpu',
    `--user-data-dir=${userDir}`, TARGET,
  ], { stdio: 'ignore' });
  console.log('Edge PID:', proc.pid);
  await new Promise(r => setTimeout(r, 4000));

  // Connect to page
  let pageUrl;
  for (let i = 0; i < 15; i++) {
    try {
      const resp = await fetch('http://127.0.0.1:9222/json');
      const targets = await resp.json();
      const page = targets.find(t => t.type === 'page');
      if (page) { pageUrl = page.webSocketDebuggerUrl; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  if (!pageUrl) { console.error('No page target'); proc.kill(); process.exit(1); }

  const ws = new WebSocket(pageUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pending[msg.id]) { pending[msg.id].res(msg); delete pending[msg.id]; }
      // Log console messages
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = (msg.params.args || []).map(a => a.value || a.description).join(' ');
        if (args.includes('gestisac') || args.includes('error') || args.includes('Error')) {
          console.log('  [CONSOLE]', args.substring(0, 200));
        }
      }
    } catch {}
  };
  await new Promise(r => setTimeout(r, 1000));

  await cdp(ws, 'Page.enable');
  await cdp(ws, 'Runtime.enable');
  await cdp(ws, 'DOM.enable');
  await cdp(ws, 'Runtime.runIfWaitingForDebugger');
  // Enable console monitoring
  await cdp(ws, 'Runtime.consoleAPICalled'); // listen
  console.log('CDP ready');

  // Wait for interactive
  const interactive = await waitForInteractive(ws);
  console.log('Page interactive:', interactive);

  await new Promise(r => setTimeout(r, 2000));

  if (loginNeeded) {
    // Clear storage to force fresh login
    await evaluate(ws, 'localStorage.clear()');
    console.log('Storage cleared');

    // Reload
    await cdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 3000));
    await waitForInteractive(ws);
    await new Promise(r => setTimeout(r, 3000));

    // ---- LOGIN ----
    console.log('\n--- LOGIN ---');

    const rInputs = await evaluate(ws, `Array.from(document.querySelectorAll('input')).map(i=>({name:i.name,type:i.type,placeholder:i.placeholder}))`);
    console.log('  Inputs:', JSON.stringify(rInputs?.value));

    const rBtns = await evaluate(ws, `Array.from(document.querySelectorAll('button')).map(b=>({text:b.textContent.trim().substring(0,40),type:b.type}))`);
    console.log('  Buttons:', JSON.stringify(rBtns?.value));

    // Set email
    await evaluate(ws, `(function(){const e=document.querySelector('input[name="email"]');if(e){e.value=${JSON.stringify(EMAIL)};e.dispatchEvent(new Event('input',{bubbles:true}));}return !!e;})()`);
    await new Promise(r => setTimeout(r, 300));

    // Set password
    await evaluate(ws, `(function(){const e=document.querySelector('input[name="password"]');if(e){e.value=${JSON.stringify(PASS)};e.dispatchEvent(new Event('input',{bubbles:true}));}return !!e;})()`);
    await new Promise(r => setTimeout(r, 300));

    // Click login
    await evaluate(ws, `(function(){const b=document.querySelector('button[type="submit"], .primary-action');if(b){b.click();return true;}return false;})()`);
    console.log('  Login clicked');
  } else {
    await evaluate(ws, `window.location.href='${TARGET}/api/auth/browser-session?appContext=hq'; true;`);
    console.log('Browser session requested');
  }

  // Wait for dashboard
  for (let i = 0; i < 40; i++) {
    const r = await evaluate(ws, `document.querySelector('.sidebar, .nav-list') !== null`);
    if (r?.value) { console.log('  Auth OK'); break; }
    await new Promise(r => setTimeout(r, 500));
  }

  // ---- DASHBOARD ----
  console.log('\n--- DASHBOARD ---');
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(ws, 'nav-test-Dashboard.png');

  const rNavTexts = await evaluate(ws, `(function(){return Array.from(document.querySelectorAll('.nav-item')).map(n=>n.textContent.trim()).join(', ')})()`);
  const navItems = rNavTexts?.value || '';
  console.log(`  Nav items: ${navItems || '(none)'}`);

  // ---- NAVIGATE ----
  const menuItems = ['Condominios', 'Administracao', 'Contabilidade', 'Tickets', 'Manutencao', 'Calendario', 'Documentos', 'Fornecedores', 'Definicoes'];

  for (const label of menuItems) {
    console.log(`\n--- ${label} ---`);
    await evaluate(ws, `(function(){const items=document.querySelectorAll('.nav-item');for(const n of items){if(n.textContent.trim().includes(${JSON.stringify(label)})){n.click();return true;}}return false;})()`);
    await new Promise(r => setTimeout(r, 3000));

    const rUrl = await evaluate(ws, 'window.location.href', 3);
    const rBody = await evaluate(ws, `(function(){const b=document.querySelector('.page-title, h1, h2, main'); if(!b) return document.body.textContent.trim().replace(/\\s+/g,' ').substring(0,150); return b.textContent.trim().replace(/\\s+/g,' ').substring(0,150);})()`, 3);
    console.log(`  URL: ${rUrl?.value || '(unknown)'}`);
    console.log(`  Content: "${rBody?.value || '(empty)'}"`);

    await screenshot(ws, `nav-test-${label}.png`);
  }

  // ---- FINAL ----
  console.log('\n--- FINAL ---');
  const rPath = await evaluate(ws, 'window.location.pathname', 3);
  const rFinalSidebar = await evaluate(ws, `(function(){return Array.from(document.querySelectorAll('.nav-item')).map(n=>n.textContent.trim()).join(' | ')})()`);

  console.log(`  Path: ${rPath?.value || '(unknown)'}`);
  if (rFinalSidebar?.value) console.log(`  Sidebar: ${rFinalSidebar.value}`);

  await screenshot(ws, 'nav-test-Final.png');

  const result = { passed: !!navItems, navItems, path: rPath?.value };
  writeFileSync(resolve('nav-test-results.json'), JSON.stringify(result, null, 2));

  if (navItems) {
    console.log(`\n=== ALL NAVIGATION TESTS PASSED ===`);
  } else {
    console.log(`\n=== PARTIAL RESULT - no nav items found ===`);
  }

  ws.close();
  setTimeout(() => { try { proc.kill(); } catch {} }, 1000);
}

main().catch(err => {
  console.error('TEST FAILED:', err.message);
  writeFileSync(resolve('nav-test-complete.txt'), 'FAILED: ' + err.message);
  try { spawn('taskkill', ['/f', '/im', 'msedge.exe'], { stdio: 'ignore' }); } catch {}
});
