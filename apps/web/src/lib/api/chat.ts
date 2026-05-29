import { apiRequest } from './http';
import type { AppContext, ChatMessage } from './types';

export async function listChatMessages(token: string): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>('/api/chat/messages', { token });
}

export async function sendChatMessage(token: string, text: string, appContext: AppContext): Promise<ChatMessage> {
  return apiRequest<ChatMessage>('/api/chat/messages', {
    token,
    method: 'POST',
    body: JSON.stringify({ text, appContext })
  });
}
