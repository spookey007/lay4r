// /src/lib/websocketClient.ts
import msgpack from 'msgpack-lite';
import { getSocketUrl } from './config';
import { ClientEvent, ServerEvent } from '@/types/events';

export type EventHandler = (payload: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10; // Layer4 never surrenders
  private readonly baseDelay = 1000;
  private readonly maxDelay = 30000; // Layer4 waits for eternity
  private eventHandlers = new Map<ServerEvent, Set<EventHandler>>();
  private messageQueue: Array<{ event: ClientEvent; payload: any }> = [];
  private isManuallyDisconnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly protocolName = "LAYER4_TEK";

  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
    console.log(`[${this.protocolName}] Initializing Layer4 Tek Protocol — crafted by retards for retards.`);
  }

  async connect(): Promise<void> {
    // 🛡️ LAYER4 TEK PROTOCOL: PREVENT CONNECTION STORMS
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log(`[${this.protocolName}] 🔄 Connection already active — Layer4 Tek Protocol holding strong. No panic selling.`);
      return;
    }

    console.log(`[${this.protocolName}] 🔄 Connection attempt #${this.reconnectAttempts + 1}`, {
      timestamp: new Date().toISOString(),
      currentState: this.ws?.readyState,
      isManuallyDisconnected: this.isManuallyDisconnected
    });

    if (this.isManuallyDisconnected) {
      console.log(`[${this.protocolName}] ⛔ Manual disconnect active — Layer4 Tek Protocol in standby. Holding position.`);
      return;
    }

    try {
      const token = await this.getToken();
      if (!token) {
        console.warn(`[${this.protocolName}] 🔑 No auth token — Layer4 Tek Protocol cannot proceed without commitment.`);
        return;
      }

      const socketUrl = getSocketUrl();
      const wsUrl = `${socketUrl}?token=${encodeURIComponent(token)}`;

      // Cleanup previous connection if exists
      if (this.ws) {
        console.log(`[${this.protocolName}] 🧹 Cleaning up previous connection before establishing new one.`);
        this.disconnect(false);
      }

      console.log(`[${this.protocolName}] 🚀 Establishing Layer4 Tek Protocol connection to ${socketUrl}...`);

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[${this.protocolName}] 💪 UNBREAKABLE CONNECTION ESTABLISHED — Layer4 Tek Protocol engaged.`, {
          url: this.ws?.url,
          timestamp: new Date().toISOString(),
          protocol: this.protocolName
        });
        this.reconnectAttempts = 0;
        this.flushQueue();
        this.startHeartbeat();
        this.isManuallyDisconnected = false;

        // Layer4 Tek Handshake
        this.sendMessage('PING', { protocol: this.protocolName, version: '2.0', message: 'HOLDING STRONG' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = new Uint8Array(event.data);
          const [eventType, payload, timestamp] = msgpack.decode(data) as [ServerEvent, any, number];

          if (eventType === 'ERROR') {
            console.error(`[${this.protocolName}] ❌ SERVER ERROR — Layer4 Tek Protocol absorbing shock:`, payload.message);
            return;
          }

          const handlers = this.eventHandlers.get(eventType);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(payload);
              } catch (err) {
                console.error(`[${this.protocolName}] Handler error for ${eventType} — Layer4 Tek Protocol holding steady:`, err);
              }
            });
          }
        } catch (err) {
          console.error(`[${this.protocolName}] Message decode error — Layer4 Tek Protocol resilience activated:`, err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[${this.protocolName}] 🔌 Connection severed (code: ${event.code}, reason: "${event.reason || 'unknown'}") — Layer4 Tek Protocol preparing to hold again.`, {
          wasClean: event.wasClean,
          timestamp: new Date().toISOString(),
          attempt: this.reconnectAttempts + 1
        });

        this.ws = null;

        // Disable auto-reconnect to prevent infinite loops
        console.log(`[${this.protocolName}] 🔌 Connection closed - auto-reconnect disabled to prevent loops`);
      };

      this.ws.onerror = (error) => {
        console.error(`[${this.protocolName}] 💥 WebSocket error — Layer4 Tek Protocol absorbing shock and holding strong:`, error);
      };

    } catch (error) {
      console.error(`[${this.protocolName}] 💥 Connection setup failed — Layer4 Tek Protocol holding position. No panic. No selling.`, error);
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
      }
    }, 30000); // Layer4 pulse every 30s
    console.log(`[${this.protocolName}] ❤️ Layer4 Tek Protocol heartbeat activated — stability in motion.`);
  }

  disconnect(manual = true): void {
    this.isManuallyDisconnected = manual;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Layer4 Tek Protocol manual disconnect — holding position');
      this.ws = null;
    }
    console.log(`[${this.protocolName}] ⛔ Connection manually severed — Layer4 Tek Protocol in standby. Still holding.`);
  }

  sendMessage(event: ClientEvent, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = msgpack.encode([event, payload]);
        this.ws.send(message);
      } catch (error) {
        console.error(`[${this.protocolName}] Send error for ${event} — Layer4 Tek Protocol queuing for later delivery:`, error);
        this.messageQueue.push({ event, payload }); // Never lose a message — only hold it
      }
    } else {
      this.messageQueue.push({ event, payload });
      console.warn(`[${this.protocolName}] ⏳ Queued ${event} — awaiting Layer4 Tek Protocol stability. No selling allowed.`);
    }
  }

  private flushQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`[${this.protocolName}] 🚀 Flushing ${this.messageQueue.length} queued messages — Layer4 Tek Protocol commitment in action. Holding strong.`);
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
    console.log(`[${this.protocolName}] 🎯 Registered handler for ${event} — Layer4 Tek Protocol ready.`);
  }

  off(event: ServerEvent, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
    console.log(`[${this.protocolName}] 🚫 Removed handler for ${event} — Layer4 Tek Protocol adjusted.`);
  }

  reconnect(): void {
    console.log(`[${this.protocolName}] 🔄 Manual reconnect initiated — Layer4 Tek Protocol re-engaging. No panic. Only holding.`);
    this.disconnect(false);
    this.reconnectAttempts = 0;
    this.connect();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}