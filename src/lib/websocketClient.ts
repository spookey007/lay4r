// /src/lib/websocketClient.ts
import msgpack from 'msgpack-lite';
import { getSocketUrl } from './config';
import { ClientEvent, ServerEvent } from '@/types/events';

export type EventHandler = (payload: any) => void;

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastError: string | null;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 15; // Increased for better reliability
  private readonly baseDelay = 1000;
  private readonly maxDelay = 30000;
  private eventHandlers = new Map<ServerEvent, Set<EventHandler>>();
  private messageQueue: Array<{ event: ClientEvent; payload: any; timestamp: number }> = [];
  private isManuallyDisconnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStateListeners = new Set<(state: ConnectionState) => void>();
  private readonly protocolName = "LAYER4_TEK";
  private lastPongReceived = 0;
  private pongTimeout: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastError: null
  };
  private connectionLock = false;

  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
    console.log(`[${this.protocolName}] Initializing enhanced WebSocket client with improved reliability`);
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionLock) {
      console.log(`[${this.protocolName}] 🔒 Connection locked, skipping duplicate attempt`);
      return;
    }

    if (this.connectionState.isConnecting) {
      console.log(`[${this.protocolName}] 🔄 Connection already in progress, skipping duplicate attempt`);
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log(`[${this.protocolName}] 🔄 Connection already active, state: ${this.ws.readyState}`);
      return;
    }

    // Check if we're manually disconnected
    if (this.isManuallyDisconnected) {
      console.log(`[${this.protocolName}] ⛔ Manual disconnect active, skipping connection`);
      return;
    }

    // Set connection lock
    this.connectionLock = true;

    this.updateConnectionState({
      isConnecting: true,
      lastError: null
    });

    console.log(`[${this.protocolName}] 🔄 Connection attempt #${this.reconnectAttempts + 1}`, {
      timestamp: new Date().toISOString(),
      currentState: this.ws?.readyState,
      isManuallyDisconnected: this.isManuallyDisconnected
    });

    if (this.isManuallyDisconnected) {
      console.log(`[${this.protocolName}] ⛔ Manual disconnect active, skipping connection`);
      this.updateConnectionState({ isConnecting: false });
      return;
    }

    try {
      const token = await this.getToken();
      console.log(`[${this.protocolName}] 🔑 Token: ${token}`);
      if (!token) {
        const error = 'No authentication token available';
        console.warn(`[${this.protocolName}] 🔑 ${error}`);
        this.updateConnectionState({ 
          isConnecting: false, 
          lastError: error 
        });
        return;
      }

      const socketUrl = getSocketUrl();
      const wsUrl = `${socketUrl}?token=${encodeURIComponent(token)}`;

      // Cleanup previous connection if exists
      if (this.ws) {
        console.log(`[${this.protocolName}] 🧹 Cleaning up previous connection`);
        this.disconnect(false);
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[${this.protocolName}] 🚀 Establishing connection to ${socketUrl}...`);

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[${this.protocolName}] ✅ Connection established`, {
          url: this.ws?.url,
          timestamp: new Date().toISOString()
        });
        
        this.reconnectAttempts = 0;
        this.lastPongReceived = Date.now();
        this.updateConnectionState({
          isConnected: true,
          isConnecting: false,
          lastConnectedAt: new Date(),
          lastError: null
        });
        
        this.flushQueue();
        this.startHeartbeat();
        this.isManuallyDisconnected = false;
        this.connectionLock = false; // Release lock on successful connection

        // Send initial ping
        this.sendMessage('PING', { 
          protocol: this.protocolName, 
          version: '2.0', 
          message: 'HOLDING STRONG',
          timestamp: Date.now()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = new Uint8Array(event.data);
          const [eventType, payload, timestamp] = msgpack.decode(data) as [ServerEvent, any, number];

          // Handle pong responses
          if (eventType === 'PONG') {
            this.lastPongReceived = Date.now();
            if (this.pongTimeout) {
              clearTimeout(this.pongTimeout);
              this.pongTimeout = null;
            }
            console.log(`[${this.protocolName}] ❤️ Heartbeat acknowledged`);
            return;
          }

          if (eventType === 'ERROR') {
            console.error(`[${this.protocolName}] ❌ Server error:`, payload.message);
            this.updateConnectionState({ lastError: payload.message });
            return;
          }

          // Debug typing events
          if (eventType === 'TYPING_STARTED' || eventType === 'TYPING_STOPPED') {
            console.log(`[${this.protocolName}] 👀 Received ${eventType}:`, payload);
          }

          const handlers = this.eventHandlers.get(eventType);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(payload);
              } catch (err) {
                console.error(`[${this.protocolName}] Handler error for ${eventType}:`, err);
              }
            });
          }
        } catch (err) {
          console.error(`[${this.protocolName}] Message decode error:`, err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[${this.protocolName}] 🔌 Connection closed`, {
          code: event.code,
          reason: event.reason || 'unknown',
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });

        this.ws = null;
        this.connectionLock = false; // Release lock on connection close
        this.updateConnectionState({ 
          isConnected: false, 
          isConnecting: false 
        });

        // Auto-reconnect with exponential backoff
        if (!this.isManuallyDisconnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log(`[${this.protocolName}] ⛔ Max reconnection attempts reached`);
          this.updateConnectionState({ 
            lastError: 'Max reconnection attempts reached' 
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error(`[${this.protocolName}] 💥 WebSocket error:`, error);
        this.connectionLock = false; // Release lock on error
        this.updateConnectionState({ 
          lastError: 'WebSocket connection error' 
        });
      };

    } catch (error) {
      console.error(`[${this.protocolName}] 💥 Connection setup failed:`, error);
      this.connectionLock = false; // Release lock on error
      this.updateConnectionState({ 
        isConnecting: false, 
        lastError: error instanceof Error ? error.message : 'Connection setup failed' 
      });
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage('PING', { 
          beat: Date.now(), 
          protocol: this.protocolName,
          mantra: 'HOLDING STRONG'
        });
        
        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.warn(`[${this.protocolName}] ⚠️ Heartbeat timeout - no pong received`);
          this.ws?.close(1000, 'Heartbeat timeout');
        }, 10000); // 10 second timeout
      }
    }, 30000); // Heartbeat every 30s
    console.log(`[${this.protocolName}] ❤️ Heartbeat activated`);
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), this.maxDelay);
    this.reconnectAttempts++;

    console.log(`[${this.protocolName}] 🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(this.connectionState);
      } catch (err) {
        console.error(`[${this.protocolName}] Connection state listener error:`, err);
      }
    });
  }

  public onConnectionStateChange(listener: (state: ConnectionState) => void) {
    this.connectionStateListeners.add(listener);
    return () => this.connectionStateListeners.delete(listener);
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  disconnect(manual = true): void {
    this.isManuallyDisconnected = manual;
    this.connectionLock = false; // Release lock on disconnect
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, manual ? 'Manual disconnect' : 'Reconnecting');
      this.ws = null;
    }
    
    this.updateConnectionState({
      isConnected: false,
      isConnecting: false
    });
    
    console.log(`[${this.protocolName}] ⛔ Connection closed (manual: ${manual})`);
  }

  sendMessage(event: ClientEvent, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = msgpack.encode([event, payload]);
        this.ws.send(message);
        console.log(`[${this.protocolName}] 📤 Sent ${event}`);
      } catch (error) {
        console.error(`[${this.protocolName}] Send error for ${event}:`, error);
        this.messageQueue.push({ event, payload, timestamp: Date.now() });
      }
    } else {
      this.messageQueue.push({ event, payload, timestamp: Date.now() });
      console.warn(`[${this.protocolName}] ⏳ Queued ${event} - connection not ready`);
    }
  }

  private flushQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`[${this.protocolName}] 🚀 Flushing ${this.messageQueue.length} queued messages`);
    
    // Filter out old messages (older than 5 minutes)
    const now = Date.now();
    const validMessages = this.messageQueue.filter(msg => now - msg.timestamp < 300000);
    this.messageQueue = validMessages;
    
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.sendMessage(msg.event, msg.payload);
    }
  }

  on(event: ServerEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    console.log(`[${this.protocolName}] 🎯 Registered handler for ${event}`);
  }

  off(event: ServerEvent, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
    console.log(`[${this.protocolName}] 🚫 Removed handler for ${event}`);
  }

  reconnect(): void {
    console.log(`[${this.protocolName}] 🔄 Manual reconnect initiated`);
    this.disconnect(false);
    this.reconnectAttempts = 0;
    this.connect();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection quality metrics
  getConnectionMetrics() {
    return {
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      lastPongReceived: this.lastPongReceived,
      queuedMessages: this.messageQueue.length,
      connectionState: this.connectionState
    };
  }
}