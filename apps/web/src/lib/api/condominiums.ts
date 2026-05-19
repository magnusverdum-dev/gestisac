import { apiRequest } from './http';
import type {
  CompletenessReport,
  Condominium,
  CondominiumDetailResponse,
  CondominiumHistoryEvent,
  ImportPreview,
  ImportReport,
  ImportRowInput
} from './types';

export type CondominiumSubresource =
  | 'blocks'
  | 'floors'
  | 'zones'
  | 'equipment'
  | 'contacts'
  | 'documents'
  | 'media'
  | 'notes';

export async function getCondominiumDetail(
  token: string,
  id: string
): Promise<CondominiumDetailResponse> {
  return apiRequest(`/api/condominiums/${id}`, { token });
}

export async function getCondominiumCompleteness(
  token: string,
  id: string
): Promise<CompletenessReport> {
  return apiRequest(`/api/condominiums/${id}/completeness`, { token });
}

export async function getCondominiumHistory(
  token: string,
  id: string
): Promise<CondominiumHistoryEvent[]> {
  return apiRequest(`/api/condominiums/${id}/history`, { token });
}

export async function updateCondominiumSection(
  token: string,
  id: string,
  section: 'identification' | 'address' | 'structure' | 'operational-status',
  payload: Record<string, unknown>
): Promise<Condominium> {
  return apiRequest(`/api/condominiums/${id}/${section}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function archiveCondominium(token: string, id: string): Promise<Condominium> {
  return apiRequest(`/api/condominiums/${id}/archive`, {
    method: 'POST',
    token
  });
}

export async function saveCondominiumDraft(
  token: string,
  id: string,
  payload: Record<string, unknown>
): Promise<Condominium> {
  return apiRequest(`/api/condominiums/${id}/onboarding-draft`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function createCondominiumSubresource<T>(
  token: string,
  condominiumId: string,
  resource: CondominiumSubresource,
  payload: Record<string, unknown>
): Promise<T> {
  return apiRequest(`/api/condominiums/${condominiumId}/${resource}`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateCondominiumSubresource<T>(
  token: string,
  condominiumId: string,
  resource: CondominiumSubresource,
  resourceId: string,
  payload: Record<string, unknown>
): Promise<T> {
  return apiRequest(`/api/condominiums/${condominiumId}/${resource}/${resourceId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteCondominiumSubresource<T>(
  token: string,
  condominiumId: string,
  resource: CondominiumSubresource,
  resourceId: string
): Promise<T> {
  return apiRequest(`/api/condominiums/${condominiumId}/${resource}/${resourceId}`, {
    method: 'DELETE',
    token
  });
}

export async function previewCondominiumImport(
  token: string,
  csv: string,
  delimiter = ','
): Promise<ImportPreview> {
  return apiRequest('/api/condominiums/import/preview', {
    method: 'POST',
    token,
    body: JSON.stringify({ csv, delimiter })
  });
}

export async function commitCondominiumImport(
  token: string,
  rows: ImportRowInput[],
  skipExisting = true
): Promise<ImportReport> {
  return apiRequest('/api/condominiums/import/commit', {
    method: 'POST',
    token,
    body: JSON.stringify({ rows, skipExisting })
  });
}
