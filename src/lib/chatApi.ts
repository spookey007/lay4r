// /src/lib/chatApi.ts
import { apiFetch } from './api';
import { useChatStore } from '@/stores/chatStore';

export const fetchMessagesWithFallback = async (
  channelId: string,
  limit = 50,
  before?: string,
  sendMessage?: (event: any, payload: any) => void,
  isConnected = false
) => {
  console.log('📚 [chatApi] fetchMessagesWithFallback called:', {
    channelId,
    limit,
    before,
    isConnected,
    hasSendMessage: !!sendMessage
  });

  if (isConnected && sendMessage) {
    console.log('📚 [chatApi] Sending FETCH_MESSAGES via WebSocket');
    sendMessage('FETCH_MESSAGES', { channelId, limit, before });
    return;
  }

  // try {
  //   const url = `/chat/channels/${channelId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`;
  //   const response = await apiFetch(url);

  //   if (!response.ok) throw new Error(`HTTP ${response.status}`);

  //   const data = await response.json();
  //   useChatStore.getState().setMessages(channelId, data.messages);
  //   console.log(`📚 [chatApi] Fetched ${data.messages.length} messages via HTTP fallback`);
  // } catch (error) {
  //   console.error('[chatApi] Fallback fetch failed:', error);
  // }
};