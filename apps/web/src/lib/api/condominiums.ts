import { canUseBrowserDemoApi } from './demo';
import { apiRequest, isHtmlFallbackResponse, resolveApiUrl } from './http';
import type {
  CondominiumAlert,
  CompletenessReport,
  Condominium,
  CondominiumDetailResponse,
  CondominiumHistoryEvent,
  CondominiumManagedDocument,
  CondominiumMedia,
  CondominiumPlanMarker,
  ImportFilePreview,
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
  | 'plan-markers'
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

export async function getCondominiumAlerts(
  token: string,
  id: string
): Promise<CondominiumAlert[]> {
  return apiRequest(`/api/condominiums/${id}/alerts`, { token });
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

export async function previewCondominiumImportFile(
  token: string,
  payload: FormData
): Promise<ImportFilePreview> {
  const response = await fetch(resolveApiUrl('/api/condominiums/import/preview-file'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      throw new Error('Preview por ficheiro indisponivel no modo demo');
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Nao foi possivel validar ficheiro')
      .catch(() => 'Nao foi possivel validar ficheiro');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    throw new Error('Preview por ficheiro requer API Rust ativa');
  }

  return response.json();
}

export async function previewCondominiumImportMapped(
  token: string,
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>
): Promise<ImportPreview> {
  return apiRequest('/api/condominiums/import/preview-mapped', {
    method: 'POST',
    token,
    body: JSON.stringify({ rows, mapping })
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

export async function uploadCondominiumDocument(
  token: string,
  condominiumId: string,
  payload: FormData
): Promise<CondominiumManagedDocument> {
  return uploadCondominiumAsset(token, `/api/condominiums/${condominiumId}/documents/upload`, payload, 'Upload de documento falhou');
}

export async function uploadCondominiumMedia(
  token: string,
  condominiumId: string,
  payload: FormData
): Promise<CondominiumMedia> {
  return uploadCondominiumAsset(token, `/api/condominiums/${condominiumId}/media/upload`, payload, 'Upload de media falhou');
}

export async function downloadCondominiumDocument(
  token: string,
  condominiumId: string,
  resourceId: string
): Promise<{ blob: Blob; filename: string }> {
  return downloadCondominiumAsset(token, `/api/condominiums/${condominiumId}/documents/${resourceId}/download`, 'gestisac-documento');
}

export async function downloadCondominiumMedia(
  token: string,
  condominiumId: string,
  resourceId: string
): Promise<{ blob: Blob; filename: string }> {
  return downloadCondominiumAsset(token, `/api/condominiums/${condominiumId}/media/${resourceId}/download`, 'gestisac-media');
}

export async function createCondominiumPlanMarker(
  token: string,
  condominiumId: string,
  payload: Record<string, unknown>
): Promise<CondominiumPlanMarker> {
  return createCondominiumSubresource(token, condominiumId, 'plan-markers', payload);
}

async function uploadCondominiumAsset<T>(
  token: string,
  path: string,
  payload: FormData,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      throw new Error('Upload dedicado requer API Rust ativa');
    }

    const message = await response
      .json()
      .then((body) => body.message || fallbackMessage)
      .catch(() => fallbackMessage);
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    throw new Error('Upload dedicado requer API Rust ativa');
  }

  return response.json();
}

async function downloadCondominiumAsset(
  token: string,
  path: string,
  fallback: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body.message || 'Download falhou')
      .catch(() => 'Download falhou');
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    filename: response.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ?? fallback
  };
}
