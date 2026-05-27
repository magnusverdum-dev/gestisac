import { apiRequest } from './http';
import type { Ocorrencia, OcorrenciaDetalhe, OcorrenciaComentario, OcorrenciasMetricas, OcorrenciaInput, PaginatedOcorrencias } from './types';

export async function listarOcorrencias(token: string, page = 1, pageSize = 200): Promise<PaginatedOcorrencias> {
  return apiRequest<PaginatedOcorrencias>(`/api/ocorrencias?page=${page}&pageSize=${pageSize}`, { token });
}

export async function obterOcorrencia(token: string, id: string): Promise<OcorrenciaDetalhe> {
  return apiRequest<OcorrenciaDetalhe>(`/api/ocorrencias/${id}`, { token });
}

export async function criarOcorrencia(token: string, data: OcorrenciaInput): Promise<Ocorrencia> {
  return apiRequest<Ocorrencia>('/api/ocorrencias', { token, method: 'POST', body: JSON.stringify(data) });
}

export async function atualizarOcorrencia(token: string, id: string, data: Partial<OcorrenciaInput>): Promise<Ocorrencia> {
  return apiRequest<Ocorrencia>(`/api/ocorrencias/${id}`, { token, method: 'PUT', body: JSON.stringify(data) });
}

export async function apagarOcorrencia(token: string, id: string): Promise<Ocorrencia[]> {
  return apiRequest<Ocorrencia[]>(`/api/ocorrencias/${id}`, { token, method: 'DELETE' });
}

export async function transitarStatus(token: string, id: string, novoStatus: string): Promise<Ocorrencia> {
  return apiRequest<Ocorrencia>(`/api/ocorrencias/${id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status: novoStatus }) });
}

export async function reabrirOcorrencia(token: string, id: string): Promise<Ocorrencia> {
  return apiRequest<Ocorrencia>(`/api/ocorrencias/${id}/reabrir`, { token, method: 'POST' });
}

export async function listarComentarios(token: string, id: string): Promise<OcorrenciaComentario[]> {
  return apiRequest<OcorrenciaComentario[]>(`/api/ocorrencias/${id}/comentarios`, { token });
}

export async function criarComentario(token: string, id: string, texto: string, visibilidade = 'interno'): Promise<OcorrenciaComentario> {
  return apiRequest<OcorrenciaComentario>(`/api/ocorrencias/${id}/comentarios`, { token, method: 'POST', body: JSON.stringify({ texto, visibilidade }) });
}

export async function obterMetricas(token: string): Promise<OcorrenciasMetricas> {
  return apiRequest<OcorrenciasMetricas>('/api/ocorrencias/metricas', { token });
}
