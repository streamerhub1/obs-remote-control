import { WebRTCManager } from './webrtc';
import { ObsCommand, ObsSnapshot } from '@obs-remote/obs-contracts';

export interface ObsDataSource {
  execute(command: ObsCommand): void;
  subscribe(callback: (event: any) => void): () => void;
  getSnapshot(): Promise<ObsSnapshot>;
  disconnect(): void;
  type: 'local' | 'remote';
}

export class LocalObsDataSource implements ObsDataSource {
  type = 'local' as const;

  execute(command: ObsCommand) {
    window.desktop?.obs?.execute(command);
  }

  subscribe(callback: (event: any) => void) {
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
  private webrtc: WebRTCManager;

  constructor(webrtc: WebRTCManager) {
    this.webrtc = webrtc;
  }

  execute(command: ObsCommand) {
    this.webrtc.sendP2PMessage('command.request', {
      commandId: crypto.randomUUID(),
      command
    });
  }

  subscribe(callback: (event: any) => void) {
    const handleEvent = (e: any) => callback({ state: 'connected', event: e.detail });
    const handleSnapshot = (e: any) => callback({ state: 'connected', snapshot: e.detail });
    
    window.addEventListener('obs:remoteEvent', handleEvent);
    window.addEventListener('obs:remoteSnapshot', handleSnapshot);

    return () => {
      window.removeEventListener('obs:remoteEvent', handleEvent);
      window.removeEventListener('obs:remoteSnapshot', handleSnapshot);
    };
  }

  async getSnapshot(): Promise<ObsSnapshot> {
    // Usually snapshot is received via event for remote. We can return an empty or cached one.
    return {} as any; // Better to wait for snapshot event
  }

  disconnect() {
    this.webrtc.destroy();
  }
}
