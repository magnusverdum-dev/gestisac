import http from 'node:http';
import { readFile } from 'node:fs/promises';

const host = '127.0.0.1';
const port = Number(process.env.GESTISAC_MOCK_API_PORT || 3000);
const demoDataPath = new URL('../../mock/demo-data.json', import.meta.url);

const readDemoData = async () => JSON.parse(await readFile(demoDataPath, 'utf-8'));

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
};

const pickDashboard = (data) => ({
  user: data.user,
  activeCondominium: data.activeCondominium,
  urgentNotice: data.urgentNotice,
  operationalSummary: data.operationalSummary,
  quickActions: data.quickActions,
  dashboardModules: data.dashboardModules,
  alerts: data.alerts
});

const routes = {
  '/health': async () => ({ service: 'gestisac-api', status: 'online' }),
  '/api/health': async () => ({ service: 'gestisac-api', status: 'online' }),
  '/api/version': async (data) => data.version,
  '/api/dashboard': async (data) => pickDashboard(data),
  '/api/condominiums': async (data) => data.condominiums,
  '/api/tickets': async (data) => data.tickets,
  '/api/reports': async (data) => data.reports,
  '/api/documents': async (data) => data.documents,
  '/api/maintenance': async (data) => data.maintenance,
  '/api/suppliers': async (data) => data.suppliers
};

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'missing_url' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);
  const handler = routes[url.pathname];

  if (!handler) {
    sendJson(response, 404, {
      error: 'not_found',
      path: url.pathname
    });
    return;
  }

  try {
    const data = await readDemoData();
    sendJson(response, 200, await handler(data));
  } catch (error) {
    sendJson(response, 500, {
      error: 'mock_data_error',
      message: error instanceof Error ? error.message : 'Unable to read demo data'
    });
  }
});

server.listen(port, host, () => {
  console.log(`GESTISAC mock API listening at http://${host}:${port}`);
});
