'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WebSocketClient, ConnectionState } from '@/lib/websocketClient';
import { useChatStore } from '@/stores/chatStore';
import { ClientEvent, ServerEvent, SERVER_EVENTS } from '@/types/events';
import { useToastNotifications } from '@/components/Toast';

type EventHandler = (payload: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  sendMessage: (event: ClientEvent, payload: any) => void;
  on: (event: ServerEvent, handler: EventHandler) => void;
  off: (event: ServerEvent, handler: EventHandler) => void;
  reconnect: () => void;
  connectIfAuthenticated: () => Promise<void>;
  getConnectionMetrics: () => any;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastError: null
  });
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToastNotifications();
  
  // Use refs to access current values without causing re-renders
  const connectedRef = useRef(connected);
  const publicKeyRef = useRef(publicKey);
  
  // Update refs when values change
  connectedRef.current = connected;
  publicKeyRef.current = publicKey;

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      // First, try to get the session token from cookies directly
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'l4_session') {
          const token = decodeURIComponent(value);
          console.log('[WebSocketProvider] 🔑 Found session token in cookies');
          return token;
        }
      }

      // If no cookie found, check if we have a wallet connection and try to fetch user
      if (connected && publicKey) {
        console.log('[WebSocketProvider] 🔑 No session cookie, trying to fetch user with wallet connection');
        const { authService } = await import('@/lib/authService');
        const user = await authService.fetchUser();
        if (user) {
          // Try to get the cookie again after fetching user (it might have been set)
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'l4_session') {
              const token = decodeURIComponent(value);
              console.log('[WebSocketProvider] 🔑 Found session token after user fetch');
              return token;
            }
          }
        }
      }

      console.log('[WebSocketProvider] 🔑 No authentication token available');
      return null;
    } catch (err) {
      console.error('[WebSocketProvider] Token fetch error:', err);
      return null;
    }
  }, []); // Remove dependencies to prevent recreation

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
    
    // Listen to connection state changes
    const unsubscribe = clientRef.current.onConnectionStateChange((state) => {
      setConnectionState(state);
      setIsConnected(state.isConnected);
      setIsConnecting(state.isConnecting);
      
      // Show toast notifications for connection changes
      if (state.isConnected && state.lastConnectedAt) {
        // toast.connection('Connected to chat server');
      } else if (state.lastError) {
        // toast.error('Connection Error', state.lastError);
      } else if (state.isConnecting) {
        // toast.info('Connecting...', 'Establishing connection to chat server');
      }
    });
    
    console.log('[WebSocketProvider] 🆕 New WebSocket client created');
  }, [getToken, toast]);

  const connectIfAuthenticated = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[WebSocketProvider] ⏸️ Connection already in progress');
      return;
    }
  
    // Check if already connected
    if (clientRef.current?.isConnected()) {
      console.log('[WebSocketProvider] ✅ Already connected');
      return;
    }
  
    // Try to get a token first to check if we're authenticated
    const token = await getToken();
    if (!token) {
      console.log('[WebSocketProvider] ❌ No authentication token available');
      return;
    }
  
    console.log('[WebSocketProvider] 🚀 Initiating connection...', {
      hasWallet: connectedRef.current && publicKeyRef.current,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
  
    isConnectingRef.current = true;
  
    try {
      // Cleanup existing client
      if (clientRef.current) {
        console.log('[WebSocketProvider] 🧹 Cleaning up previous client');
        clientRef.current.disconnect();
      }
  
      // Initialize new client
      initClient();
  
      // Connect if client was created
      if (clientRef.current) {
        console.log('[WebSocketProvider] 🤝 Attempting connection');
        await clientRef.current.connect();
      }
    } catch (error) {
      console.error('[WebSocketProvider] 💥 Connection failed:', error);
      toast.error('Connection Failed', 'Failed to connect to chat server');
    } finally {
      isConnectingRef.current = false;
    }
  }, [getToken, initClient, toast]);

  // Sync isConnected state with client
// ✅ ADD THIS — Sync connection state IMMEDIATELY and on tab focus
  useEffect(() => {
    const syncConnectionState = () => {
      if (clientRef.current) {
        const connected = clientRef.current.isConnected();
        setIsConnected(connected);
        if (connected) {
          isConnectingRef.current = false;
        }
      }
    };

    // Listen to tab visibility change (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncConnectionState();
        // Try to connect when tab becomes visible
        connectIfAuthenticated();
      }
    };

    // Listen to window focus (user clicks back into browser)
    const handleWindowFocus = () => {
      syncConnectionState();
      // Try to connect when window gains focus
      connectIfAuthenticated();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Initial sync on mount
    syncConnectionState();

    // Try to connect after a short delay to ensure page is fully loaded
    const initialConnectionTimeout = setTimeout(() => {
      connectIfAuthenticated();
    }, 1000);

    // Set up periodic connection attempts (every 30 seconds)
    const connectionInterval = setInterval(() => {
      if (!clientRef.current?.isConnected() && !isConnectingRef.current) {
        console.log('[WebSocketProvider] 🔄 Periodic connection attempt');
        connectIfAuthenticated();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(connectionInterval);
      clearTimeout(initialConnectionTimeout);
    };
  }, [connectIfAuthenticated]); // ✅ Include connectIfAuthenticated in dependencies

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

  const getConnectionMetrics = useCallback(() => {
    return clientRef.current?.getConnectionMetrics() || null;
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
  }, [connected, publicKey, connectIfAuthenticated]);

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
    isConnecting,
    connectionState,
    sendMessage,
    on,
    off,
    reconnect,
    connectIfAuthenticated,
    getConnectionMetrics
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