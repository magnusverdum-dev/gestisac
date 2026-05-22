import { apiRequest } from './http';
import type { PaginatedResponse, ResourceEndpoint } from './types';

export async function getResourcePage<T>(
  token: string,
  path: string,
  page = 1,
  pageSize = 50,
  search = ''
): Promise<T[]> {
  const [basePath, existingQuery = ''] = path.split('?');
  const params = new URLSearchParams(existingQuery);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await apiRequest<PaginatedResponse<T>>(`${basePath}?${params}`, { token });

  return response.items;
}

export async function createResource(
  token: string,
  resource: ResourceEndpoint,
  payload: Record<string, unknown>
): Promise<unknown> {
  return apiRequest(`/api/${resource}`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateResource(
  token: string,
  resource: ResourceEndpoint,
  id: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  return apiRequest(`/api/${resource}/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteResource(
  token: string,
  resource: ResourceEndpoint,
  id: string
): Promise<unknown> {
  return apiRequest(`/api/${resource}/${id}`, {
    method: 'DELETE',
    token
  });
}
