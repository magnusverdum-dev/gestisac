import { canUseBrowserDemoApi, demoExportReport } from './demo';
import { apiRequest, isHtmlFallbackResponse, resolveApiUrl } from './http';
import type { ReportPreview } from './types';

export async function getReportPreview(token: string, id: string): Promise<ReportPreview> {
  return apiRequest(`/api/reports/${id}/preview`, { token });
}

export async function exportReport(
  token: string,
  id: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(resolveApiUrl(`/api/reports/${id}/export`), {
    method: 'POST',
    headers: {
      Accept: 'text/csv',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoExportReport(id);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Exportacao falhou')
      .catch(() => 'Exportacao falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoExportReport(id);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition'), 'gestisac-relatorio.csv')
  };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? fallback;
}
