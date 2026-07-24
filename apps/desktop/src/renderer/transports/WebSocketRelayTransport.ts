import { RemoteTransport, TransportState } from './RemoteTransport';
import { P2PMessage, P2PMessageSchema } from '@obs-remote/remote-protocol';

export class WebSocketRelayTransport implements RemoteTransport {
  private ws: WebSocket | null = null;
  private state: TransportState = 'disconnected';
  private listeners: Set<(message: unknown) => void> = new Set();
  private sessionContext: { role: string; moderatorAuthorization?: string; streamerAuthorization?: string } | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string = 'ws://localhost:3000/api/v1/signaling/session') {
    this.url = url;
  }

  async connect(sessionContext: { role: string; moderatorAuthorization?: string; streamerAuthorization?: string }): Promise<void> {
    this.sessionContext = sessionContext;
    this.state = 'connecting';

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.state = 'connected';
        // Authenticate the session
        this.ws?.send(
          JSON.stringify({
            type: 'signaling.authenticate',
            authorizationToken:
              sessionContext.role === 'moderator'
                ? sessionContext.moderatorAuthorization
                : sessionContext.streamerAuthorization,
          }),
        );
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session.message') {
            const parsedMsg = P2PMessageSchema.safeParse(data.payload);
            if (parsedMsg.success) {
              this.listeners.forEach((l) => l(parsedMsg.data));
            } else {
              console.error('Invalid message from relay', parsedMsg.error);
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket Relay Error', err);
        if (this.state === 'connecting') {
          this.state = 'error';
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = () => {
        this.state = 'disconnected';
        this.ws = null;
        // Basic reconnect logic
        if (this.sessionContext) {
          this.reconnectTimer = setTimeout(
            () => this.connect(this.sessionContext!),
            3000,
          );
        }
      };
    });
  }

  async send(message: unknown): Promise<void> {
    if (this.state !== 'connected' || !this.ws) {
      throw new Error('Transport not connected');
    }

    this.ws.send(
      JSON.stringify({
        type: 'session.message',
        payload: message,
      }),
    );
  }

  subscribe(listener: (message: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async disconnect(reason?: string): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer as unknown as number);
      this.reconnectTimer = null;
    }
    this.sessionContext = null;
    this.state = 'disconnected';
    if (this.ws) {
      this.ws.close(1000, reason || 'User disconnected');
      this.ws = null;
    }
  }

  getState(): TransportState {
    return this.state;
  }
}
