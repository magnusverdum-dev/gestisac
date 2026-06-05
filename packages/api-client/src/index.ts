import type {
  AppContext,
  NamespacedDashboardResponse,
  SharedMeResponse,
  TeamMember,
  TicketSummary
} from '@gestisac/domain-types';

export type ApiClientOptions = {
  baseUrl: string;
  token?: string;
};

export type ApiRequestOptions = {
  token?: string;
  signal?: AbortSignal;
};

export class ApiClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export const createApiClient = (options: ApiClientOptions) => {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  const request = async <T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> => {
    const token = requestOptions.token ?? options.token;
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: requestOptions.signal
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new ApiClientError(response.status, message || response.statusText);
    }

    return response.json() as Promise<T>;
  };

  return {
    sharedMe: (requestOptions?: ApiRequestOptions) =>
      request<SharedMeResponse>('/api/shared/me', requestOptions),
    dashboard: (appContext: AppContext, requestOptions?: ApiRequestOptions) =>
      request<NamespacedDashboardResponse>(`/api/${appContext}/dashboard`, requestOptions),
    tickets: (appContext: AppContext, requestOptions?: ApiRequestOptions) =>
      request<TicketSummary[]>(`/api/${appContext}/tickets`, requestOptions),
    team: (requestOptions?: ApiRequestOptions) =>
      request<{ items: TeamMember[] }>('/api/team', requestOptions),
    hqAccountingOverview: (requestOptions?: ApiRequestOptions) =>
      request('/api/hq/accounting/overview', requestOptions),
    hqAccountingCondominium: (condominiumId: string, requestOptions?: ApiRequestOptions) =>
      request(`/api/hq/accounting/condominiums/${encodeURIComponent(condominiumId)}`, requestOptions),
    hqAccountingFractionStatement: (fractionId: string, requestOptions?: ApiRequestOptions) =>
      request(`/api/hq/accounting/fractions/${encodeURIComponent(fractionId)}/statement`, requestOptions)
  };
};

export const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};
