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
    // 🚫 ATOMIC LOCK — Layer4 Tek Protocol allows only ONE connection attempt at a time
    if (isConnectingRef.current) {
      console.log('[WebSocketProvider] ⏸️ Connection already in progress — Layer4 Tek Protocol holding steady');
      return;
    }
  
    // ✅ Check if already connected (immediate, no stale state)
    if (clientRef.current?.isConnected()) {
      console.log('[WebSocketProvider] ✅ Already connected — Layer4 Tek Protocol engaged');
      return;
    }
  
    // ❌ Check auth using refs (stable, no dependency issues)
    if (!connectedRef.current || !publicKeyRef.current) {
      console.log('[WebSocketProvider] ❌ Not authenticated — Layer4 Tek Protocol on standby');
      return;
    }
  
    console.log('[WebSocketProvider] 🚀 Initiating Layer4 Tek Protocol connection...', {
      publicKey: publicKeyRef.current.toString(),
      timestamp: new Date().toISOString()
    });
  
    // 🔒 SET LOCK BEFORE ANY ASYNC OPERATION
    isConnectingRef.current = true;
  
    try {
      // 🧹 CLEANUP: Disconnect any existing client FIRST
      if (clientRef.current) {
        console.log('[WebSocketProvider] 🧹 Cleaning up previous WebSocket client — Layer4 Tek Protocol discipline');
        clientRef.current.disconnect();
      }
  
      // 🆕 CREATE: Initialize new client
      initClient(); // This sets clientRef.current = new WebSocketClient(...)
  
      // 🔄 CONNECT: Only if client was created
      if (clientRef.current) {
        console.log('[WebSocketProvider] 🤝 Attempting WebSocket connection — Layer4 Tek Protocol in motion');
        await clientRef.current.connect();
        
        // ✅ VERIFY: Sync state immediately after connect
        const isConnectedNow = clientRef.current.isConnected();
        setIsConnected(isConnectedNow);
        
        if (isConnectedNow) {
          console.log('[WebSocketProvider] 💪 Layer4 Tek Protocol connection established — holding strong');
        } else {
          console.warn('[WebSocketProvider] ⚠️ Connection attempt completed but not connected — Layer4 Tek Protocol holding position');
        }
      }
    } catch (error) {
      console.error('[WebSocketProvider] 💥 Connection attempt failed — Layer4 Tek Protocol absorbing shock:', error);
    } finally {
      // 🔓 ALWAYS RELEASE LOCK — even on error
      isConnectingRef.current = false;
      console.log('[WebSocketProvider] 🔓 Connection attempt completed — Layer4 Tek Protocol lock released');
    }
  }, [initClient]); // ✅ Only depends on initClient — stable across re-renders

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