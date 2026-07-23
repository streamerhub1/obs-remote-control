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

  registerSession(remoteSessionId: string, payload: any) {
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

  async execute(remoteSessionId: string, commandMsg: any) {
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

    // Permission checking
    // Simplified for now: just check if they have 'obs.manage'
    if (!session.permissions.includes('obs.manage') && !session.permissions.includes('obs.view')) {
        throw new Error('Insufficient permissions');
    }

    const obs = getObsAdapter();
    if (!obs) throw new Error('OBS not connected');

    try {
      // Map commands securely
      switch (command) {
        case 'SetCurrentProgramScene':
          if (!session.permissions.includes('obs.manage')) throw new Error('Permission denied');
          await obs.call('SetCurrentProgramScene', args);
          return { status: 'success' };
        case 'GetSceneList':
          return { status: 'success', data: await obs.call('GetSceneList') };
        // Add more explicitly allowed commands here...
        default:
          throw new Error('Command not allowed or unknown');
      }
    } catch (e: any) {
      throw new Error(`OBS Error: ${e.message}`);
    }
  }
}

const guard = new RemoteCommandGuard();

export function getRemoteCommandGuard() {
  return guard;
}
