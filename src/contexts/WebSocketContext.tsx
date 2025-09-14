'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import msgpack from 'msgpack-lite';
import { getSocketUrl } from '@/lib/config';
import { useChatStore } from '@/stores/chatStore';

// Event types
const CLIENT_EVENTS = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  EDIT_MESSAGE: 'EDIT_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  ADD_REACTION: 'ADD_REACTION',
  REMOVE_REACTION: 'REMOVE_REACTION',
  START_TYPING: 'START_TYPING',
  STOP_TYPING: 'STOP_TYPING',
  FETCH_MESSAGES: 'FETCH_MESSAGES',
  JOIN_CHANNEL: 'JOIN_CHANNEL',
  LEAVE_CHANNEL: 'LEAVE_CHANNEL',
  UPLOAD_MEDIA: 'UPLOAD_MEDIA',
  MARK_AS_READ: 'MARK_AS_READ',
  PING: 'PING'
} as const;

export const SERVER_EVENTS = {
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  REACTION_ADDED: 'REACTION_ADDED',
  REACTION_REMOVED: 'REACTION_REMOVED',
  TYPING_STARTED: 'TYPING_STARTED',
  TYPING_STOPPED: 'TYPING_STOPPED',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  READ_RECEIPT_UPDATED: 'READ_RECEIPT_UPDATED',
  MEDIA_UPLOADED: 'MEDIA_UPLOADED',
  MESSAGES_LOADED: 'MESSAGES_LOADED',
  CHANNEL_CREATED: 'CHANNEL_CREATED',
  NEW_DM_INVITE: 'NEW_DM_INVITE',
  PONG: 'PONG',
  ERROR: 'ERROR'
} as const;

type EventHandler = (payload: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (event: string, payload: any) => void;
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  reconnect: () => void;
  connectIfAuthenticated: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { connected, publicKey } = useWallet();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 1000;
  const maxDelay = 10000;

  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {

      return;
    }

    try {


      // Check wallet connection instead of session tokens
      if (!connected || !publicKey) {



        return;
      }



      // Check if user session exists via auth service
      const { authService } = await import('@/lib/authService');
      const user = await authService.fetchUser();

      if (!user) {

        return;
      }



      // Get session token from cookies for WebSocket auth
      const cookies = document.cookie.split(';');



      let sessionToken = null;
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');

        if (name === 'l4_session') {
          sessionToken = decodeURIComponent(value);
          break;
        }
      }

      if (!sessionToken) {





        
        // Try to get the cookie manually
        const cookies = document.cookie.split(';');

        
        return;
      }



      const socketUrl = getSocketUrl();
      const wsUrl = `${socketUrl}?token=${encodeURIComponent(sessionToken)}`;


      const ws = new WebSocket(wsUrl);

      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {



        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const receiveTime = Date.now();
          const data = new Uint8Array(event.data);
          const [eventType, payload, timestamp] = msgpack.decode(data);


          // Call registered handlers immediately
          const handlers = eventHandlersRef.current.get(eventType);
          if (handlers) {

            const handlerStartTime = Date.now();

            handlers.forEach(handler => {
              try {
                handler(payload);
              } catch (error) {

              }
            });

            const handlerEndTime = Date.now();

          } else {

          }
        } catch (error) {

        }
      };

      ws.onclose = (event) => {

        // Detailed error codes
        const errorMessages = {
          1000: '✅ Normal closure',
          1001: '🚪 Going away',
          1002: '💥 Protocol error',
          1003: '📝 Unsupported data',
          1006: '🔗 Abnormal closure (no close frame)',
          1007: '📊 Invalid frame payload data',
          1008: '🔒 Policy violation (auth failed)',
          1009: '📏 Message too big',
          1011: '🐛 Internal server error',
          1015: '🔐 TLS handshake failure'
        };



        if (event.code === 1008) {


        }

        setIsConnected(false);

        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
          reconnectAttemptsRef.current++;



          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {



      };

    } catch (error) {

    }
  }, [connected, publicKey]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((event: string, payload: any) => {


    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = msgpack.encode([event, payload]);
        console.log('🚀 Sending message via WebSocket1...', event, payload);
        wsRef.current.send(message);

      } catch (error) {

      }
    } else {


    }
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);

  }, []);

  const off = useCallback((event: string, handler: EventHandler) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect when wallet is connected
  useEffect(() => {
    const initConnection = async () => {
      console.log('🔌 [CONTEXT] WebSocket connection check:', {
        connected,
        hasPublicKey: !!publicKey,
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        readyState: wsRef.current?.readyState
      });

      if (connected && publicKey) {
        console.log('🔌 [CONTEXT] Connecting to WebSocket...');
        await connect();
      } else {
        console.log('🔌 [CONTEXT] Not connecting - wallet not connected or no public key');
        // Disconnect if wallet is disconnected
        if (wsRef.current) {
          disconnect();
        }
      }
    };

    initConnection();

    return () => {

      disconnect();
    };
  }, [connected, publicKey, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Manual connection trigger (for after wallet connection)
  const connectIfAuthenticated = useCallback(async () => {

    if (connected && publicKey) {

      await connect();
    } else {

    }
  }, [connected, publicKey, connect]);

  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    on,
    off,
    reconnect,
    connectIfAuthenticated
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Fetch messages function with HTTP fallback
const fetchMessagesWithFallback = async (channelId: string, limit = 50, before?: string, sendMessage?: any, isConnected?: boolean) => {
  console.log('📚 [CONTEXT] Fetching messages:', {
    channelId,
    limit,
    before,
    isConnected
  });

  if (isConnected) {
    console.log('📚 [CONTEXT] Using WebSocket to fetch messages');
    sendMessage(CLIENT_EVENTS.FETCH_MESSAGES, {
      channelId,
      limit,
      before
    });
  } else {
    console.log('📚 [CONTEXT] WebSocket not connected, using HTTP API fallback');
    try {
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/chat/channels/${channelId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📚 [CONTEXT] HTTP API fetch successful:', {
          messageCount: data.messages.length,
          channelId
        });
        
        // Store the messages in the store directly
        const { setMessages } = useChatStore.getState();
        setMessages(channelId, data.messages);
      } else {
        console.error('📚 [CONTEXT] HTTP API fetch failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('📚 [CONTEXT] HTTP API fetch error:', error);
    }
  }
};

// Convenience hooks for specific events
export function useChatEvents() {
  const { sendMessage, on, off, isConnected } = useWebSocket();

  const sendChatMessage = useCallback((channelId: string, content: string, attachments: any[] = [], repliedToMessageId?: string) => {



    // Send immediately without any delays
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

export { CLIENT_EVENTS };
