import { canUseBrowserDemoApi, demoApiRequest } from './demo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';
const OFFICIAL_PRODUCTION_API_BASE_URL = 'https://gestisac-api.vercel.app';
const IS_PRODUCTION = import.meta.env.PROD === true && import.meta.env.MODE === 'production';
const REQUEST_TIMEOUT_MS = 15_000;

type ApiRequestOptions = {
  method?: string;
  token?: string;
  body?: BodyInit;
  timeoutMs?: number;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (!effectiveApiBaseUrl() && typeof window !== 'undefined') {
    if (IS_PRODUCTION) {
      throw new Error('VITE_API_BASE_URL e obrigatorio em producao');
    }

    return demoApiRequest<T>(path, options);
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(resolveApiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      signal: controller.signal
    });
  } catch (error) {
    if (canUseDemoFallback()) {
      return demoApiRequest<T>(path, options);
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Pedido ao backend excedeu o tempo limite');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (canUseDemoFallback(response.status)) {
      return demoApiRequest<T>(path, options);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Pedido falhou')
      .catch(() => 'Pedido falhou');
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isHtmlFallbackResponse(response)) {
    return demoApiRequest<T>(path, options);
  }

  return response.json().catch((error) => {
    if (canUseDemoFallback()) {
      return demoApiRequest<T>(path, options);
    }

    throw error;
  });
}

export function resolveApiUrl(path: string): string {
  const apiBaseUrl = effectiveApiBaseUrl();

  if (!apiBaseUrl) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}

export function isHtmlFallbackResponse(response: Response): boolean {
  return !IS_PRODUCTION &&
    !API_BASE_URL &&
    typeof window !== 'undefined' &&
    response.headers.get('content-type')?.toLowerCase().includes('text/html') === true;
}

function canUseDemoFallback(status?: number): boolean {
  return !IS_PRODUCTION && canUseBrowserDemoApi(status);
}

function effectiveApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  if (
    IS_PRODUCTION &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'gestisac-web.vercel.app'
  ) {
    return OFFICIAL_PRODUCTION_API_BASE_URL;
  }

  return '';
}
