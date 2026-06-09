import { apiRequest } from './http';
import type { AppContext, DashboardResponse, LoginResponse, PublicUser } from './types';

export const SESSION_TOKEN_KEY = 'gestisac.sessionToken';
export const SESSION_REFRESH_KEY = 'gestisac.refreshToken';
export const SESSION_EXPIRES_KEY = 'gestisac.expiresAt';
export const SESSION_APP_CONTEXT_KEY = 'gestisac.appContext';

const AUTH_STARTUP_TIMEOUT_MS = 40_000;

export async function getApiHealth(): Promise<{ service: string; status: 'online' }> {
  return apiRequest('/api/health');
}

export async function login(email: string, password: string, appContext: AppContext): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, appContext }),
    timeoutMs: AUTH_STARTUP_TIMEOUT_MS
  });
}

export async function refreshSession(refreshToken: string, appContext?: AppContext): Promise<LoginResponse> {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken, appContext }),
    timeoutMs: AUTH_STARTUP_TIMEOUT_MS
  });
}

export async function startBrowserSession(appContext: AppContext): Promise<LoginResponse> {
  return apiRequest(`/api/auth/browser-session?appContext=${encodeURIComponent(appContext)}&mode=json`, {
    timeoutMs: AUTH_STARTUP_TIMEOUT_MS
  });
}

export async function me(token: string): Promise<{ user: PublicUser }> {
  return apiRequest('/api/me', { token });
}

export async function logout(token: string): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST', token });
}

export async function getDashboard(token: string): Promise<DashboardResponse> {
  return apiRequest('/api/dashboard', { token });
}

export async function updateActiveCondominium(token: string, name: string): Promise<string> {
  return apiRequest('/api/active-condominium', {
    method: 'PUT',
    token,
    body: JSON.stringify({ name })
  });
}
