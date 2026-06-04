const apiUrl = (process.env.GESTISAC_API_URL || 'https://gestisac-api.vercel.app').replace(/\/$/, '');
const email = process.env.GESTISAC_SMOKE_EMAIL || 'admin@gestisac.pt';
const password = process.env.GESTISAC_SMOKE_PASSWORD;

if (!password) {
  console.error('GESTISAC_SMOKE_PASSWORD is required. The token/password will not be printed.');
  process.exit(1);
}

const endpoints = [
  '/api/dashboard',
  '/api/condominiums?page=1&pageSize=50',
  '/api/buildings?page=1&pageSize=50',
  '/api/fractions?page=1&pageSize=50',
  '/api/residents?page=1&pageSize=50',
  '/api/tickets?page=1&pageSize=50',
  '/api/ocorrencias',
  '/api/suppliers?page=1&pageSize=50',
  '/api/documents?page=1&pageSize=50',
  '/api/reports?page=1&pageSize=50',
  '/api/maintenance?page=1&pageSize=50',
  '/api/inspections?page=1&pageSize=50',
  '/api/calendar-events?page=1&pageSize=50',
  '/api/assemblies?page=1&pageSize=50',
  '/api/accounting/summary',
  '/api/accounting/overview',
  '/api/accounting/quotas?page=1&pageSize=50',
  '/api/accounting/payments?page=1&pageSize=50',
  '/api/accounting/debts?page=1&pageSize=50',
  '/api/accounting/receipts?page=1&pageSize=50',
  '/api/accounting/expenses?page=1&pageSize=50',
  '/api/accounting/reserve-funds?page=1&pageSize=50',
  '/api/accounting/payment-agreements?page=1&pageSize=50',
  '/api/accounting/cash-movements?page=1&pageSize=50',
  '/api/accounting/bank-transactions?page=1&pageSize=50',
  '/api/accounting/reconciliations',
  '/api/audit-log?page=1&pageSize=25',
  '/api/permissions'
];

const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ email, password, appContext: 'hq' })
});

if (!loginResponse.ok) {
  console.error(`Login failed with HTTP ${loginResponse.status}`);
  process.exit(1);
}

const auth = await loginResponse.json();
const token = auth.token;
const results = [];

for (const endpoint of endpoints) {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  let count = null;
  let message = '';

  try {
    const body = await response.clone().json();
    message = body.message || body.code || '';
    if (Array.isArray(body.items)) {
      count = body.items.length;
    } else if (Array.isArray(body.data)) {
      count = body.data.length;
    }
  } catch {
    message = response.ok ? '' : response.statusText;
  }

  results.push({
    endpoint,
    status: response.status,
    ok: response.ok,
    count,
    message
  });
}

const failures = results.filter((result) => !result.ok);
console.table(results);

if (failures.length) {
  console.error(`Production API check failed: ${failures.length} endpoint(s) failed.`);
  process.exit(1);
}

console.log('Production API check passed.');
