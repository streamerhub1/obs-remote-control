import { getObsAdapter } from './obs.js';
import { LRUCache } from 'lru-cache';

interface SessionInfo {
  remoteSessionId: string;
  role: 'streamer' | 'moderator';
  permissions: string[];
  expiresAt: number;
  handshakeComplete: boolean;
}

class RemoteCommandGuard {
  private sessions = new Map<string, SessionInfo>();
  private dedupCache = new LRUCache<string, boolean>({ max: 1000, ttl: 1000 * 60 });
  private rateLimits = new Map<string, { tokens: number; lastRefill: number }>();

  registerSession(remoteSessionId: string, payload: { role: 'streamer' | 'moderator', permissions?: string[], exp: number }) {
    this.sessions.set(remoteSessionId, {
      remoteSessionId,
      role: payload.role,
      permissions: payload.permissions || [],
      expiresAt: payload.exp * 1000,
      handshakeComplete: false,
    });
    this.rateLimits.set(remoteSessionId, { tokens: 50, lastRefill: Date.now() });
  }

  enableSession(remoteSessionId: string) {
    const session = this.sessions.get(remoteSessionId);
    if (session) {
      session.handshakeComplete = true;
    }
  }

  async execute(remoteSessionId: string, commandMsg: { command: string, args?: unknown, seq: number }) {
    const session = this.sessions.get(remoteSessionId);
    if (!session) throw new Error('Session not found or invalid');
    if (session.role !== 'streamer') throw new Error('Only streamer can execute commands');
    if (!session.handshakeComplete) throw new Error('Handshake not complete');
    if (Date.now() > session.expiresAt) throw new Error('Session expired');

    // Rate limiting (bucket)
    let rl = this.rateLimits.get(remoteSessionId)!;
    const now = Date.now();
    const elapsed = now - rl.lastRefill;
    if (elapsed > 1000) {
      rl.tokens = Math.min(50, rl.tokens + Math.floor(elapsed / 1000) * 10);
      rl.lastRefill = now;
    }
    if (rl.tokens <= 0) throw new Error('Rate limit exceeded');
    rl.tokens--;

    const { command, args, seq } = commandMsg;
    if (!command || seq == null) throw new Error('Invalid command format');

    const dedupKey = `${remoteSessionId}:${seq}`;
    if (this.dedupCache.has(dedupKey)) {
      return { status: 'duplicate' };
    }
    this.dedupCache.set(dedupKey, true);

    const obs = getObsAdapter();
    if (!obs) throw new Error('OBS not connected');

    try {
      const p = session.permissions;

      // Define permission requirements for OBS commands
      const cmdAuth = (reqs: string[]) => {
        if (!reqs.some(req => p.includes(req))) {
           throw new Error(`Permission denied: requires one of [${reqs.join(', ')}]`);
        }
      };

      // Map commands securely
      switch (command) {
        // Scenes
        case 'GetSceneList':
        case 'GetCurrentProgramScene':
        case 'GetCurrentPreviewScene':
          cmdAuth(['scenes.read', 'obs.manage']);
          return { status: 'success', data: await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args) };
        case 'SetCurrentProgramScene':
        case 'SetCurrentPreviewScene':
          cmdAuth(['scenes.switch', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        
        // Scene Items
        case 'GetSceneItemList':
        case 'GetSceneItemId':
          cmdAuth(['sceneItems.read', 'obs.manage']);
          return { status: 'success', data: await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args) };
        case 'SetSceneItemEnabled':
          cmdAuth(['sceneItems.visibility', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        
        // Audio
        case 'GetInputList':
        case 'GetInputMute':
        case 'GetInputVolume':
          cmdAuth(['audio.read', 'obs.manage']);
          return { status: 'success', data: await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args) };
        case 'SetInputMute':
        case 'ToggleInputMute':
          cmdAuth(['audio.mute', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        case 'SetInputVolume':
          cmdAuth(['audio.volume', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        
        // Streaming
        case 'GetStreamStatus':
          cmdAuth(['stream.read', 'obs.manage']);
          return { status: 'success', data: await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args) };
        case 'StartStream':
          cmdAuth(['stream.start', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        case 'StopStream':
          cmdAuth(['stream.stop', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
          
        // Recording
        case 'GetRecordStatus':
          cmdAuth(['record.read', 'obs.manage']);
          return { status: 'success', data: await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args) };
        case 'StartRecord':
          cmdAuth(['record.start', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };
        case 'StopRecord':
        case 'PauseRecord':
        case 'ResumeRecord':
          cmdAuth(['record.stop', 'obs.manage']);
          await obs.call(command as keyof import('obs-websocket-js').OBSRequestTypes, args);
          return { status: 'success' };

        default:
          throw new Error('Command not allowed or unknown');
      }
    } catch (e: unknown) {
      throw new Error(`OBS Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

const guard = new RemoteCommandGuard();

export function getRemoteCommandGuard() {
  return guard;
}
