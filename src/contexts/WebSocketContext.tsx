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
    if (!connected || !publicKey) {
      console.log('[WebSocketProvider] ❌ Not authenticated - wallet not connected');
      return null;
    }

    try {
      // Try localStorage first (most reliable for cross-domain)
      try {
        const tokenFromStorage = localStorage.getItem('l4_session');
        if (tokenFromStorage) {
          console.log('[WebSocketProvider] ✅ Found l4_session token in localStorage');
          return tokenFromStorage;
        }
      } catch (error) {
        console.warn('[WebSocketProvider] ⚠️ localStorage access failed:', error);
      }

      // Try sessionStorage as fallback
      try {
        const tokenFromSession = sessionStorage.getItem('l4_session');
        if (tokenFromSession) {
          console.log('[WebSocketProvider] ✅ Found l4_session token in sessionStorage');
          // Try to store in localStorage for future use
          try {
            localStorage.setItem('l4_session', tokenFromSession);
            console.log('[WebSocketProvider] ✅ Token copied to localStorage');
          } catch (storageError) {
            console.warn('[WebSocketProvider] ⚠️ Could not copy token to localStorage:', storageError);
          }
          return tokenFromSession;
        }
      } catch (error) {
        console.warn('[WebSocketProvider] ⚠️ sessionStorage access failed:', error);
      }

      // If no token in storage, try to get it from the API
      console.log('[WebSocketProvider] 🔍 No token in storage, fetching from API...');
      const { authService } = await import('@/lib/authService');
      const user = await authService.fetchUser();
      if (!user) {
        console.log('[WebSocketProvider] ❌ No user data from authService');
        return null;
      }

      // The API call should have set the token in localStorage via the login process
      // Let's check again after the API call
      try {
        const tokenAfterApi = localStorage.getItem('l4_session');
        if (tokenAfterApi) {
          console.log('[WebSocketProvider] ✅ Found token in localStorage after API call');
          return tokenAfterApi;
        }
      } catch (error) {
        console.warn('[WebSocketProvider] ⚠️ localStorage access failed after API call:', error);
      }

      // Last resort: try to get token from cookies (might work in same-domain scenarios)
      console.log('[WebSocketProvider] 🔍 Checking cookies for l4_session...');
      console.log('[WebSocketProvider] 📋 All cookies:', document.cookie);
      
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'l4_session') {
          console.log('[WebSocketProvider] ✅ Found l4_session token in cookies');
          const decodedToken = decodeURIComponent(value);
          
          // Try to store in localStorage for future use
          try {
            localStorage.setItem('l4_session', decodedToken);
            console.log('[WebSocketProvider] ✅ Token copied to localStorage');
          } catch (storageError) {
            console.warn('[WebSocketProvider] ⚠️ Could not store token in localStorage:', storageError);
            // Try sessionStorage as fallback
            try {
              sessionStorage.setItem('l4_session', decodedToken);
              console.log('[WebSocketProvider] ✅ Token stored in sessionStorage as fallback');
            } catch (sessionError) {
              console.warn('[WebSocketProvider] ⚠️ Could not store token in sessionStorage:', sessionError);
            }
          }
          return decodedToken;
        }
      }
      
      console.log('[WebSocketProvider] ❌ l4_session token not found in localStorage, sessionStorage, or cookies');
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
  
    // Check authentication
    if (!connectedRef.current || !publicKeyRef.current) {
      console.log('[WebSocketProvider] ❌ Not authenticated');
      return;
    }
  
    console.log('[WebSocketProvider] 🚀 Initiating connection...', {
      publicKey: publicKeyRef.current.toString(),
      timestamp: new Date().toISOString()
    });
  
    isConnectingRef.current = true;
  
    try {
      // Cleanup existing client only if it exists and is not connected
      if (clientRef.current && !clientRef.current.isConnected()) {
        console.log('[WebSocketProvider] 🧹 Cleaning up previous client');
        clientRef.current.disconnect();
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
  
      // Initialize new client only if we don't have one or it's not connected
      if (!clientRef.current || !clientRef.current.isConnected()) {
        initClient();
      }
  
      // Connect if client was created and not already connected
      if (clientRef.current && !clientRef.current.isConnected()) {
        console.log('[WebSocketProvider] 🤝 Attempting connection');
        await clientRef.current.connect();
      }
    } catch (error) {
      console.error('[WebSocketProvider] 💥 Connection failed:', error);
      toast.error('Connection Failed', 'Failed to connect to chat server');
    } finally {
      isConnectingRef.current = false;
    }
  }, [initClient, toast]);

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
      }
    };

    // Listen to window focus (user clicks back into browser)
    const handleWindowFocus = () => {
      syncConnectionState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Initial sync on mount
    syncConnectionState();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []); // ✅ Empty dependency array — runs once on mount

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

  // Auto-connect on wallet connect with improved state management
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
      // Only connect if we're not already connected or connecting
      if (!clientRef.current?.isConnected() && !isConnectingRef.current) {
        // Add delay to prevent rapid connection attempts
        connectionTimeoutRef.current = setTimeout(() => {
          connectIfAuthenticated();
        }, 1000);
      } else {
        console.log('[WebSocketProvider] ⏸️ Skipping connection - already connected or connecting');
      }
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