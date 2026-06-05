import { spawn } from 'child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET = 'http://127.0.0.1:55951';
const EMAIL = 'admin@gestisac.pt';
const loginNeeded = String(process.env.GESTISAC_LOGIN_NEEDED ?? 'true').trim().toLowerCase() !== 'false';
const PASS = loginNeeded ? process.env.GESTISAC_SMOKE_PASSWORD : '';
const MESSAGE = `chat-e2e-${Date.now()}`;

if (loginNeeded && !PASS) {
  throw new Error('GESTISAC_SMOKE_PASSWORD is required. The password will not be printed.');
}

let seq = 0;
const pending = {};
const msgId = () => ++seq;

function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId();
    pending[id] = { resolve, reject };
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending[id]) {
        delete pending[id];
        reject(new Error(`Timeout: ${method}`));
      }
    }, 30000);
  });
}

async function evaluate(ws, expression) {
  const result = await cdp(ws, 'Runtime.evaluate', { expression, awaitPromise: true });
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluate failed');
  }
  return result.result?.value;
}

async function waitFor(ws, predicate, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await evaluate(ws, predicate);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for: ${predicate}`);
}

async function main() {
  try { spawn('taskkill', ['/f', '/im', 'msedge.exe'], { stdio: 'ignore' }); } catch {}
  await new Promise((r) => setTimeout(r, 1500));

  const proc = spawn(EDGE, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,900',
    '--disable-gpu',
    TARGET
  ], { stdio: 'ignore' });

  await new Promise((r) => setTimeout(r, 3500));
  const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page target');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending[msg.id]) {
      const { resolve, reject } = pending[msg.id];
      delete pending[msg.id];
      if (msg.error) reject(new Error(msg.error.message || 'CDP error'));
      else resolve(msg);
    }
  });
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

  await cdp(ws, 'Page.enable');
  await cdp(ws, 'Runtime.enable');

  if (loginNeeded) {
    await evaluate(ws, `window.location.href='${TARGET}/client/login'; true;`);
    await waitFor(ws, `document.querySelector('input[type="email"]') && document.querySelector('input[type="password"]')`);
    await evaluate(ws, `
      (() => {
        const email = document.querySelector('input[type="email"]');
        const pass = document.querySelector('input[type="password"]');
        email.value = '${EMAIL}';
        pass.value = '${PASS}';
        email.dispatchEvent(new Event('input', { bubbles: true }));
        pass.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = Array.from(document.querySelectorAll('button')).find((b) => /entrar|iniciar/i.test(b.textContent || ''));
        btn?.click();
        return true;
      })();
    `);
  } else {
    await evaluate(ws, `window.location.href='${TARGET}/api/auth/browser-session?appContext=client'; true;`);
  }

  await waitFor(ws, `location.pathname.includes('/client/dashboard') || location.pathname.includes('/client/tickets')`, 30000);
  await evaluate(ws, `window.location.href='${TARGET}/client/chat'; true;`);
  await waitFor(ws, `document.querySelector('textarea')`);
  await evaluate(ws, `
    (() => {
      const ta = document.querySelector('textarea');
      ta.value = '${MESSAGE}';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /enviar/i.test(b.textContent || ''));
      btn?.click();
      return true;
    })();
  `);
  await waitFor(ws, `Array.from(document.querySelectorAll('.chat-message p')).some((p) => (p.textContent || '').includes('${MESSAGE}'))`, 20000);

  await evaluate(ws, `window.location.href='${TARGET}/hq/chat'; true;`);
  await waitFor(ws, `Array.from(document.querySelectorAll('.chat-message p')).some((p) => (p.textContent || '').includes('${MESSAGE}'))`, 20000);

  await evaluate(ws, `window.location.href='${TARGET}/worker/chat'; true;`);
  await waitFor(ws, `Array.from(document.querySelectorAll('.chat-message p')).some((p) => (p.textContent || '').includes('${MESSAGE}'))`, 20000);

  console.log(`OK:${MESSAGE}`);
  ws.close();
  try { proc.kill(); } catch {}
}

main().catch((err) => {
  console.error(`FAIL:${err.message}`);
  process.exit(1);
});
