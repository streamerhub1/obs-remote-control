export type TransportState =
  'disconnected' | 'connecting' | 'connected' | 'error';

export interface RemoteTransport {
  connect(sessionContext: any): Promise<void>;
  send(message: any): Promise<void>;
  subscribe(listener: (message: any) => void): () => void;
  disconnect(reason?: string): Promise<void>;
  getState(): TransportState;
}
