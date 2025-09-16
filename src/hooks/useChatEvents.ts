// /src/hooks/useChatEvents.ts
'use client';

import { useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { CLIENT_EVENTS } from '@/types/events';
import { fetchMessagesWithFallback } from '@/lib/chatApi';

export function useChatEvents() {
  const { sendMessage, on, off, isConnected } = useWebSocket();

  const sendChatMessage = useCallback((channelId: string, content: string, attachments: any[] = [], repliedToMessageId?: string) => {
    sendMessage(CLIENT_EVENTS.SEND_MESSAGE, {
      channelId,
      content,
      attachments,
      repliedToMessageId
    });
  }, [sendMessage]);

  const editMessage = useCallback((messageId: string, content: string) => {
    sendMessage(CLIENT_EVENTS.EDIT_MESSAGE, {
      messageId,
      content
    });
  }, [sendMessage]);

  const deleteMessage = useCallback((messageId: string) => {
    sendMessage(CLIENT_EVENTS.DELETE_MESSAGE, {
      messageId
    });
  }, [sendMessage]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    sendMessage(CLIENT_EVENTS.ADD_REACTION, {
      messageId,
      emoji
    });
  }, [sendMessage]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    sendMessage(CLIENT_EVENTS.REMOVE_REACTION, {
      messageId,
      emoji
    });
  }, [sendMessage]);

  const startTyping = useCallback((channelId: string) => {
    sendMessage(CLIENT_EVENTS.START_TYPING, {
      channelId
    });
  }, [sendMessage]);

  const stopTyping = useCallback((channelId: string) => {
    sendMessage(CLIENT_EVENTS.STOP_TYPING, {
      channelId
    });
  }, [sendMessage]);

  const fetchMessages = useCallback(async (channelId: string, limit = 50, before?: string) => {
    await fetchMessagesWithFallback(channelId, limit, before, sendMessage, isConnected);
  }, [sendMessage, isConnected]);

  const joinChannel = useCallback((channelId: string) => {
    sendMessage(CLIENT_EVENTS.JOIN_CHANNEL, {
      channelId
    });
  }, [sendMessage]);

  const leaveChannel = useCallback((channelId: string) => {
    sendMessage(CLIENT_EVENTS.LEAVE_CHANNEL, {
      channelId
    });
  }, [sendMessage]);

  const markAsRead = useCallback((messageId: string) => {
    sendMessage(CLIENT_EVENTS.MARK_AS_READ, {
      messageId
    });
  }, [sendMessage]);

  const ping = useCallback(() => {
    sendMessage(CLIENT_EVENTS.PING, {});
  }, [sendMessage]);

  return {
    sendChatMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    fetchMessages,
    joinChannel,
    leaveChannel,
    markAsRead,
    ping,
    on,
    off
  };
}