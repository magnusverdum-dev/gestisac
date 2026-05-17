const baseUrl = process.env.GESTISAC_API_URL ?? 'http://127.0.0.1:3000';
const email = process.env.GESTISAC_SMOKE_EMAIL ?? 'admin@gestisac.pt';
const password = process.env.GESTISAC_SMOKE_PASSWORD ?? 'Gestisac2026!';

async function request(path, options = {}) {
  const headers = {
    Accept: options.accept ?? 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text && response.headers.get('content-type')?.includes('application/json')
    ? JSON.parse(text)
    : text;

  if (!response.ok) {
    const message = typeof body === 'object' && body?.message ? body.message : response.statusText;
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${message}`);
  }

  return body;
}

async function upload(path, token, formData) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${response.status} ${body?.message ?? response.statusText}`);
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
  const timestamp = Date.now();

  try {
    const health = await request('/health');
    assert(health.status === 'online', 'health endpoint must return online');

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert(login.token, 'login must return token');
    activeToken = login.token;

    const condominium = await request('/api/condominiums', {
      method: 'POST',
      token: activeToken,
      body: {
        name: `Smoke Avarias ${timestamp}`,
        location: 'Lisboa',
        buildings: 1,
        fractions: 6,
        residents: 12,
        status: 'Ativo',
        notice: 'Smoke V3 avarias'
      }
    });
    cleanup.push(() => request(`/api/condominiums/${condominium.id}`, {
      method: 'DELETE',
      token: activeToken
    }));

    const ticket = await request('/api/tickets', {
      method: 'POST',
      token: activeToken,
      body: {
        title: `Smoke V3 elevador ${timestamp}`,
        condominium: condominium.name,
        location: 'Elevador B',
        category: 'Elevadores',
        priority: 'Alta',
        status: 'Aberta',
        resident: 'Morador Smoke',
        reporterName: 'Morador Smoke',
        detail: 'Teste automatico ponta a ponta V3'
      }
    });
    cleanup.push(() => request(`/api/tickets/${ticket.id}`, {
      method: 'DELETE',
      token: activeToken
    }));

    const detail = await request(`/api/tickets/${ticket.id}`, { token: activeToken });
    assert(detail.id === ticket.id, 'ticket detail must return created ticket');
    assert(detail.checklist.length > 0, 'ticket detail must include checklist');

    const assigned = await request(`/api/tickets/${ticket.id}/assign`, {
      method: 'PUT',
      token: activeToken,
      body: {
        technician: 'Tecnico Smoke',
        note: 'Atribuicao smoke',
        clientActionId: `smoke-assign-${timestamp}`
      }
    });
    assert(assigned.assignedTechnician === 'Tecnico Smoke', 'assign must persist technician');

    await request(`/api/tickets/${ticket.id}/transition`, {
      method: 'PUT',
      token: activeToken,
      body: {
        status: 'Em deslocacao',
        note: 'Tecnico a caminho',
        clientActionId: `smoke-road-${timestamp}`
      }
    });
    await request(`/api/tickets/${ticket.id}/transition`, {
      method: 'PUT',
      token: activeToken,
      body: {
        status: 'No local',
        note: 'Tecnico chegou',
        clientActionId: `smoke-onsite-${timestamp}`
      }
    });

    const messagePayload = {
      message: `Mensagem smoke ${timestamp}`,
      role: 'Operacao',
      clientActionId: `smoke-message-${timestamp}`
    };
    await request(`/api/tickets/${ticket.id}/messages`, {
      method: 'POST',
      token: activeToken,
      body: messagePayload
    });
    const afterFirstMessage = await request(`/api/tickets/${ticket.id}`, { token: activeToken });
    await request(`/api/tickets/${ticket.id}/messages`, {
      method: 'POST',
      token: activeToken,
      body: messagePayload
    });
    const afterDuplicateMessage = await request(`/api/tickets/${ticket.id}`, { token: activeToken });
    assert(
      afterDuplicateMessage.messages.length === afterFirstMessage.messages.length,
      'clientActionId must prevent duplicated messages'
    );

    const checklistItem = afterDuplicateMessage.checklist[0];
    const checked = await request(`/api/tickets/${ticket.id}/checklist/${checklistItem.id}`, {
      method: 'PUT',
      token: activeToken,
      body: {
        completed: true,
        clientActionId: `smoke-checklist-${timestamp}`
      }
    });
    assert(
      checked.checklist.find((item) => item.id === checklistItem.id)?.completed === true,
      'checklist update must persist completion'
    );

    const formData = new FormData();
    formData.set('kind', 'Foto antes');
    formData.set('caption', 'Upload smoke V3');
    formData.set('clientActionId', `smoke-upload-${timestamp}`);
    formData.set('file', new Blob(['gestisac smoke avarias'], { type: 'text/plain' }), `smoke-avaria-${timestamp}.txt`);
    const withAttachment = await upload(`/api/tickets/${ticket.id}/attachments/upload`, activeToken, formData);
    assert(withAttachment.attachments.length > 0, 'upload must add attachment metadata');

    await request(`/api/tickets/${ticket.id}/transition`, {
      method: 'PUT',
      token: activeToken,
      body: {
        status: 'Resolvida',
        note: 'Resolvida no smoke',
        clientActionId: `smoke-resolved-${timestamp}`
      }
    });
    const confirmed = await request(`/api/tickets/${ticket.id}/confirm-resolution`, {
      method: 'POST',
      token: activeToken,
      body: {
        confirmed: true,
        comment: 'Confirmacao smoke',
        signature: 'Morador Smoke',
        clientActionId: `smoke-confirm-${timestamp}`
      }
    });
    assert(confirmed.status === 'Confirmada', 'resident confirmation must set Confirmada');

    const reopened = await request(`/api/tickets/${ticket.id}/reopen`, {
      method: 'POST',
      token: activeToken,
      body: {
        reason: 'Reabertura smoke',
        clientActionId: `smoke-reopen-${timestamp}`
      }
    });
    assert(reopened.status === 'Reaberta', 'reopen must set Reaberta');

    const feed = await request('/api/operations/feed', { token: activeToken });
    assert(feed.some((item) => item.ticketId === ticket.id), 'operations feed must include ticketId');

    const qrZones = await request('/api/qr-zones', { token: activeToken });
    assert(
      qrZones.some((zone) => zone.qrPayload.startsWith('/condomino/avarias?')),
      'QR zones must expose web URLs'
    );

    console.log('GESTISAC avarias V3 smoke test passed');
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

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
