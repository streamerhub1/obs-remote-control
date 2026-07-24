export type TransportState =
  'disconnected' | 'connecting' | 'connected' | 'error';

export interface RemoteTransport {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect(sessionContext: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(message: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe(listener: (message: any) => void): () => void;
  disconnect(reason?: string): Promise<void>;
  getState(): TransportState;
}
