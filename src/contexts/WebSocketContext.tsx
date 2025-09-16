'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WebSocketClient } from '@/lib/websocketClient';
import { useChatStore } from '@/stores/chatStore';
import { ClientEvent, ServerEvent, SERVER_EVENTS } from '@/types/events';

type EventHandler = (payload: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (event: ClientEvent, payload: any) => void;
  on: (event: ServerEvent, handler: EventHandler) => void;
  off: (event: ServerEvent, handler: EventHandler) => void;
  reconnect: () => void;
  connectIfAuthenticated: () => Promise<void>;
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
  const clientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to access current values without causing re-renders
  const connectedRef = useRef(connected);
  const publicKeyRef = useRef(publicKey);
  
  // Update refs when values change
  connectedRef.current = connected;
  publicKeyRef.current = publicKey;

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) return null;

    try {
      const { authService } = await import('@/lib/authService');
      const user = await authService.fetchUser();
      if (!user) return null;

      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'l4_session') {
          return decodeURIComponent(value);
        }
      }
    } catch (err) {
      console.error('[WebSocketProvider] Token fetch error:', err);
    }
    return null;
  }, [connected, publicKey]);

  const initClient = useCallback(() => {
    // Only create a new client if we don't have one or it's not connected
    if (clientRef.current && clientRef.current.isConnected()) {
      console.log('[WebSocketProvider] ✅ Client already connected, reusing existing client');
      return;
    }
    
    if (clientRef.current) {
      console.log('[WebSocketProvider] 🔌 Disconnecting existing client before creating new one');
      clientRef.current.disconnect();
    }
    
    clientRef.current = new WebSocketClient(getToken);
    console.log('[WebSocketProvider] 🆕 New WebSocket client created');
  }, [getToken]);

  const connectIfAuthenticated = useCallback(async () => {
    console.log('[WebSocketProvider] 🔄 connectIfAuthenticated called', {
      connected: connectedRef.current,
      publicKey: publicKeyRef.current?.toString(),
      isConnecting: isConnectingRef.current,
      isAlreadyConnected: clientRef.current?.isConnected(),
      timestamp: new Date().toISOString()
    });

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[WebSocketProvider] ⏸️ Already connecting, skipping');
      return;
    }
    
    if (clientRef.current?.isConnected()) {
      console.log('[WebSocketProvider] ✅ Already connected, skipping');
      return;
    }

    if (!connectedRef.current || !publicKeyRef.current) {
      console.log('[WebSocketProvider] ❌ Not authenticated, skipping');
      return;
    }

    console.log('[WebSocketProvider] 🚀 Starting connection...');
    isConnectingRef.current = true;
    
    try {
      // Initialize client (this will disconnect any existing one)
      initClient();
      
      // Attempt connection
      await clientRef.current?.connect();
    } catch (error) {
      console.error('[WebSocketProvider] Connection error:', error);
    } finally {
      isConnectingRef.current = false;
    }
  }, [initClient]); // Remove connected and publicKey to prevent re-creation

  // Sync isConnected state with client
  useEffect(() => {
    const checkConnection = () => {
      if (clientRef.current) {
        const connected = clientRef.current.isConnected();
        setIsConnected(connected);
        if (connected) {
          isConnectingRef.current = false;
        }
      }
    };

    checkConnection(); // Check immediately
    const interval = setInterval(checkConnection, 1000);
    
    return () => clearInterval(interval);
  }, []); // ✅ Empty dependency array — we only need to set up the interval once

  const sendMessage = useCallback((event: ClientEvent, payload: any) => {
    clientRef.current?.sendMessage(event, payload);
  }, []);

  const on = useCallback((event: ServerEvent, handler: EventHandler) => {
    clientRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: ServerEvent, handler: EventHandler) => {
    clientRef.current?.off(event, handler);
  }, []);

  const reconnect = useCallback(() => {
    isConnectingRef.current = false;
    clientRef.current?.reconnect();
  }, []);

  // Auto-connect on wallet connect with debounce
  useEffect(() => {
    console.log('[WebSocketProvider] 🔄 Wallet state changed', {
      connected,
      publicKey: publicKey?.toString(),
      timestamp: new Date().toISOString()
    });

    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (connected && publicKey) {
      // Add delay to prevent rapid connection attempts
      connectionTimeoutRef.current = setTimeout(() => {
        connectIfAuthenticated();
      }, 1000);
    } else {
      console.log('[WebSocketProvider] 🔌 Disconnecting due to wallet disconnect');
      isConnectingRef.current = false;
      clientRef.current?.disconnect();
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [connected, publicKey, connectIfAuthenticated]); // Keep dependencies but connectIfAuthenticated is now stable

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[WebSocketProvider] 🧹 Cleaning up WebSocket provider');
      isConnectingRef.current = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      clientRef.current?.disconnect();
    };
  }, []);

  const value = {
    isConnected,
    sendMessage,
    on,
    off,
    reconnect,
    connectIfAuthenticated
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Re-export for convenience
export { useChatEvents } from '@/hooks/useChatEvents';
export { SERVER_EVENTS } from '@/types/events';