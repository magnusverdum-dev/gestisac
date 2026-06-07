const baseUrl = process.env.GESTISAC_API_URL ?? 'http://127.0.0.1:3000';
const email = process.env.GESTISAC_SMOKE_EMAIL ?? 'admin@gestisac.pt';
const loginNeeded = String(process.env.GESTISAC_LOGIN_NEEDED ?? 'true').trim().toLowerCase() !== 'false';
const password = process.env.GESTISAC_SMOKE_PASSWORD;

if (loginNeeded && !password) {
  console.error('GESTISAC_SMOKE_PASSWORD is required. The token/password will not be printed.');
  process.exit(1);
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = body?.message ?? response.statusText;
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${message}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const cleanup = [];
  let activeToken = '';

  try {
    const health = await request('/health');
    assert(health.status === 'online', 'health endpoint must return online');

    const login = loginNeeded
      ? await request('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        })
      : await browserSessionAuth();
    assert(login.token, 'login must return an access token');
    assert(login.refreshToken, 'login must return a refresh token');

    const refresh = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: login.refreshToken }
    });
    assert(refresh.token, 'refresh must rotate the access token');
    const token = refresh.token;
    activeToken = token;

    const me = await request('/api/me', { token });
    assert(me.user.email === email, 'me endpoint must return the authenticated user');

    const condominiums = await request('/api/condominiums?page=1&pageSize=2', { token });
    assert(Array.isArray(condominiums.items), 'condominiums endpoint must be paginated');
    assert(condominiums.pageSize === 2, 'condominiums endpoint must respect pageSize');

    const timestamp = Date.now();
    const condominium = await request('/api/condominiums', {
      method: 'POST',
      token,
      body: {
        name: `Smoke Condominio ${timestamp}`,
        location: 'Lisboa',
        buildings: 1,
        fractions: 4,
        residents: 8,
        status: 'Em onboarding',
        notice: 'Teste automatico'
      }
    });
    assert(condominium.id, 'creating a condominium must return an id');
    cleanup.push(async () => {
      await request(`/api/condominiums/${condominium.id}/archive`, {
        method: 'POST',
        token
      });
      await request(`/api/condominiums/${condominium.id}`, {
        method: 'DELETE',
        token
      });
    });

    const ticket = await request('/api/tickets', {
      method: 'POST',
      token,
      body: {
        title: `Smoke avaria ${timestamp}`,
        condominium: condominium.name,
        priority: 'Alta',
        status: 'Aberto',
        detail: 'Teste automatico de ocorrencia operacional'
      }
    });
    assert(ticket.id, 'creating a ticket must return an id');
    cleanup.push(() =>
      request(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        token
      })
    );

    const expense = await request('/api/accounting/expenses', {
      method: 'POST',
      token,
      body: {
        condominium: condominium.name,
        category: 'Smoke QA',
        supplier: 'Fornecedor Teste',
        amount: 12.34,
        dueDate: '2026-05-31',
        status: 'Pendente'
      }
    });
    assert(expense.id, 'creating an expense must return an id');
    cleanup.push(() =>
      request(`/api/accounting/expenses/${expense.id}`, {
        method: 'DELETE',
        token
      })
    );

    const templates = await request('/api/documents/templates', { token });
    assert(Array.isArray(templates) && templates.length >= 8, 'document templates must be listed');

    const generatedDocument = await request('/api/documents/generate', {
      method: 'POST',
      token,
      body: {
        template: 'accounts-statement',
        condominium: condominium.name,
        notes: 'Smoke test financeiro',
        format: 'txt'
      }
    });
    assert(generatedDocument.id, 'generating a document must return an id');
    cleanup.push(() =>
      request(`/api/documents/${generatedDocument.id}`, {
        method: 'DELETE',
        token
      })
    );

    const dashboard = await request('/api/dashboard', { token });
    assert(
      dashboard.dashboardModules?.length >= 4,
      'dashboard must return the operational modules'
    );

    console.log('GESTISAC API smoke test passed');
  } finally {
    for (const cleanupTask of cleanup.reverse()) {
      try {
        await cleanupTask();
      } catch (error) {
        console.warn(`Cleanup warning: ${error.message}`);
      }
    }

    if (activeToken) {
      try {
        await request('/api/auth/logout', {
          method: 'POST',
          token: activeToken
        });
      } catch (error) {
        console.warn(`Logout cleanup warning: ${error.message}`);
      }
    }
  }
}

async function browserSessionAuth() {
  const response = await fetch(`${baseUrl}/api/auth/browser-session?appContext=hq`, {
    method: 'GET',
    redirect: 'manual'
  });
  const location = response.headers.get('location') ?? '';
  assert([302, 303].includes(response.status), `browser session must redirect, got ${response.status}`);
  assert(location, 'browser session must include a redirect location');

  const redirectUrl = new URL(location, baseUrl);
  const token = redirectUrl.searchParams.get('token') ?? '';
  const refreshToken = redirectUrl.searchParams.get('refreshToken') ?? '';
  const expiresAt = redirectUrl.searchParams.get('expiresAt') ?? '';
  assert(token, 'browser session must return an access token');
  assert(refreshToken, 'browser session must return a refresh token');

  return { token, refreshToken, expiresAt, appContext: 'hq' };
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
