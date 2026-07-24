import { ObsCommand, ObsSnapshot } from '@obs-remote/obs-contracts';
import { RemoteTransport } from './transports/RemoteTransport';

export interface ObsDataSource {
  execute(command: ObsCommand): void;
  subscribe(callback: (event: unknown) => void): () => void;
  getSnapshot(): Promise<ObsSnapshot>;
  disconnect(): void;
  type: 'local' | 'remote';
}

export class LocalObsDataSource implements ObsDataSource {
  type = 'local' as const;

  execute(command: ObsCommand) {
    window.desktop?.obs?.execute(command);
  }

  subscribe(callback: (event: unknown) => void) {
    if (!window.desktop?.obs) return () => {};
    return window.desktop.obs.subscribe(callback);
  }

  async getSnapshot(): Promise<ObsSnapshot> {
    if (!window.desktop?.obs) throw new Error('No desktop obs');
    return await window.desktop.obs.getSnapshot();
  }

  disconnect() {
    window.desktop?.obs?.disconnect();
  }
}

export class RemoteObsDataSource implements ObsDataSource {
  type = 'remote' as const;
  private transport: RemoteTransport;
  private unsubTransport: (() => void) | null = null;
  private snapshotCallback: ((snapshot: ObsSnapshot) => void) | null = null;

  constructor(transport: RemoteTransport) {
    this.transport = transport;
  }

  execute(command: ObsCommand) {
    this.transport.send({
      type: 'command.request',
      payload: {
        commandId: crypto.randomUUID(),
        command
      }
    });
  }

  subscribe(callback: (event: unknown) => void) {
    if (!this.unsubTransport) {
      this.unsubTransport = this.transport.subscribe((msg: unknown) => {
        if (msg.type === 'snapshot') {
          callback({ state: 'connected', snapshot: msg.payload });
        } else if (msg.type === 'event') {
          callback({ state: 'connected', event: msg.payload });
        }
      });
    }

    return () => {
      if (this.unsubTransport) {
        this.unsubTransport();
        this.unsubTransport = null;
      }
    };
  }

  async getSnapshot(): Promise<ObsSnapshot> {
    return {} as any;
  }

  disconnect() {
    this.transport.disconnect();
  }
}
