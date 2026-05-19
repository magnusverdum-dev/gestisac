import { canUseBrowserDemoApi, demoDownloadDocument, demoUploadDocument } from './demo';
import { apiRequest, isHtmlFallbackResponse, resolveApiUrl } from './http';
import type { DocumentItem, DocumentPreview, DocumentTemplate, GenerateDocumentPayload } from './types';

export async function uploadDocument(token: string, payload: FormData): Promise<DocumentItem> {
  const response = await fetch(resolveApiUrl('/api/documents/upload'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoUploadDocument(payload);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Upload falhou')
      .catch(() => 'Upload falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoUploadDocument(payload);
  }

  return response.json();
}

export async function getDocumentTemplates(token: string): Promise<DocumentTemplate[]> {
  return apiRequest('/api/documents/templates', { token });
}

export async function generateDocument(
  token: string,
  payload: GenerateDocumentPayload
): Promise<DocumentItem> {
  return apiRequest('/api/documents/generate', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function getDocumentPreview(token: string, id: string): Promise<DocumentPreview> {
  return apiRequest(`/api/documents/${id}/preview`, { token });
}

export async function downloadDocument(
  token: string,
  id: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(resolveApiUrl(`/api/documents/${id}/download`), {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoDownloadDocument(id);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Download falhou')
      .catch(() => 'Download falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoDownloadDocument(id);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition'), 'gestisac-documento')
  };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? fallback;
}
