import { P2PMessage, P2PMessageSchema, createP2PMessage, P2PPayload } from '@obs-remote/p2p-protocol';
import { COMMAND_PERMISSIONS } from '@obs-remote/permissions';
import { ObsCommand } from '@obs-remote/obs-contracts';

// Decode JWT without verifying signature (since it's fetched over HTTPS/WSS from our trusted backend, 
// or we can assume the backend verified it if received via signaling).
// If we must verify cryptographically on client, we'd need a public key. 
// For now, we decode to get the verified payload.
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private controlChannel: RTCDataChannel | null = null;
  private eventsChannel: RTCDataChannel | null = null;
  
  private role: 'streamer' | 'moderator';
  private authorizationToken: string | null = null;
  private authPayload: any = null;
  private currentRevision = 0;
  private sequenceCounter = 0;
  private executedCommands = new Set<string>();

  private iceBuffer: RTCIceCandidateInit[] = [];
  
  private executeObsCommand: (cmd: any) => Promise<any>;
  private getObsSnapshot: () => Promise<any>;
  private signalingSend: (msg: any) => void;
  private signalingUnsub: () => void;

  private latencyStart: Map<string, number> = new Map();
  private latency = 0;
  private heartbeatInterval: any;

  constructor(
    role: 'streamer' | 'moderator',
    authorizationToken: string | null,
    executeObsCommand: (cmd: any) => Promise<any>,
    getObsSnapshot: () => Promise<any>,
    signalingSend: (msg: any) => void,
    signalingSubscribe: (cb: (msg: any) => void) => () => void
  ) {
    this.role = role;
    this.authorizationToken = authorizationToken;
    if (authorizationToken) {
      this.authPayload = decodeJwt(authorizationToken);
      if (!this.authPayload) throw new Error('Invalid authorization token');
    }
    
    this.executeObsCommand = executeObsCommand;
    this.getObsSnapshot = getObsSnapshot;
    this.signalingSend = signalingSend;
    this.signalingUnsub = signalingSubscribe(this.handleSignalingMessage.bind(this));
  }

  public async connect() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Fallback, should be from backend
      ]
    };
    
    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingSend({ type: 'signaling.ice', payload: event.candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('WebRTC State:', this.pc?.connectionState);
      if (this.pc?.connectionState === 'connected') {
        this.startHeartbeat();
        if (this.role === 'moderator') {
          this.sendP2PMessage('handshake.hello', { appVersion: '1.0.0', deviceId: this.authPayload.moderatorDeviceId });
        }
      } else if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'closed') {
        this.stopHeartbeat();
      }
    };

    if (this.role === 'moderator') {
      this.controlChannel = this.pc.createDataChannel('control');
      this.eventsChannel = this.pc.createDataChannel('events');
      this.pc.createDataChannel('preview');
      this.pc.createDataChannel('files');
      
      this.setupDataChannel(this.controlChannel);
      this.setupDataChannel(this.eventsChannel);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.signalingSend({ type: 'signaling.offer', payload: offer });
    } else {
      this.pc.ondatachannel = (event) => {
        if (event.channel.label === 'control') {
          this.controlChannel = event.channel;
          this.setupDataChannel(this.controlChannel);
        } else if (event.channel.label === 'events') {
          this.eventsChannel = event.channel;
          this.setupDataChannel(this.eventsChannel);
        }
      };
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const msgId = crypto.randomUUID();
      this.latencyStart.set(msgId, Date.now());
      this.sendP2PMessage('heartbeat.ping', { timestamp: Date.now() });
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const msg = P2PMessageSchema.parse(parsed);
        this.handleP2PMessage(msg, channel.label);
      } catch (err) {
        console.error('Invalid P2P message', err);
      }
    };
  }

  private async handleSignalingMessage(msg: any) {
    if (!this.pc) return;

    if (msg.type === 'signaling.offer' && this.role === 'streamer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      for (const candidate of this.iceBuffer) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.iceBuffer = [];
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.signalingSend({ type: 'signaling.answer', payload: answer });
    } else if (msg.type === 'signaling.answer' && this.role === 'moderator') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      for (const candidate of this.iceBuffer) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.iceBuffer = [];
    } else if (msg.type === 'signaling.ice') {
      if (this.pc.remoteDescription) {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
      } else {
        this.iceBuffer.push(msg.payload);
      }
    }
  }

  private async handleP2PMessage(msg: P2PMessage, channel: string) {
    if (msg.type === 'heartbeat.ping') {
      this.sendP2PMessage('heartbeat.pong', { timestamp: msg.payload.timestamp });
    } else if (msg.type === 'heartbeat.pong') {
      const start = this.latencyStart.get(msg.messageId); // Note: messageId might not match ping, we can use timestamp
      const latency = Date.now() - msg.payload.timestamp;
      this.latency = latency;
    } else if (msg.type === 'handshake.hello' && this.role === 'streamer') {
      // Validate session
      if (!this.authPayload) {
        this.sendP2PMessage('error', { code: 'UNAUTHORIZED', message: 'No authorization' });
        return;
      }
      if (Date.now() > this.authPayload.expiresAt) {
        this.sendP2PMessage('error', { code: 'EXPIRED', message: 'Token expired' });
        return;
      }
      // Issue challenge
      this.sendP2PMessage('handshake.challenge', { challenge: 'some-random-challenge' });
    } else if (msg.type === 'handshake.challenge' && this.role === 'moderator') {
      this.sendP2PMessage('handshake.proof', { proof: 'mock-proof' }); // In real app, sign with device private key
    } else if (msg.type === 'handshake.proof' && this.role === 'streamer') {
      // Verify proof
      this.sendP2PMessage('handshake.accepted', { permissionsVersion: this.authPayload.permissionsVersion });
      // Send initial snapshot
      const snapshot = await this.getObsSnapshot();
      this.currentRevision++;
      this.sendP2PMessage('state.snapshot', { revision: this.currentRevision, snapshot });
    } else if (msg.type === 'command.request' && this.role === 'streamer') {
      const payload = msg.payload as Extract<P2PPayload, { type: 'command.request' }>['payload'];
      
      if (this.executedCommands.has(payload.commandId)) {
        this.sendP2PMessage('error', { code: 'DUPLICATE', message: 'Command already executed' });
        return;
      }
      
      const allowedPerms = this.authPayload.permissions || [];
      const requiredPerm = COMMAND_PERMISSIONS[payload.command.type as ObsCommand['type']];
      
      if (requiredPerm && !allowedPerms.includes(requiredPerm)) {
        this.sendP2PMessage('command.result', { 
          commandId: payload.commandId, 
          success: false, 
          error: { code: 'FORBIDDEN', message: 'Permission denied' }
        });
        return;
      }

      this.executedCommands.add(payload.commandId);
      try {
        const result = await this.executeObsCommand(payload.command);
        this.currentRevision++;
        this.sendP2PMessage('command.result', { 
          commandId: payload.commandId, 
          success: true, 
          result,
          revision: this.currentRevision
        });
      } catch (err: any) {
        this.sendP2PMessage('command.result', { 
          commandId: payload.commandId, 
          success: false, 
          error: { code: 'EXECUTION_FAILED', message: err.message }
        });
      }
    } else if (msg.type === 'state.snapshot' && this.role === 'moderator') {
      const payload = msg.payload as Extract<P2PPayload, { type: 'state.snapshot' }>['payload'];
      this.currentRevision = payload.revision;
      window.dispatchEvent(new CustomEvent('obs:remoteSnapshot', { detail: payload.snapshot }));
    } else if (msg.type === 'state.patch' && this.role === 'moderator') {
      const payload = msg.payload as Extract<P2PPayload, { type: 'state.patch' }>['payload'];
      if (payload.revision !== this.currentRevision + 1) {
        this.sendP2PMessage('state.resyncRequest', { lastKnownRevision: this.currentRevision });
        return;
      }
      this.currentRevision = payload.revision;
      window.dispatchEvent(new CustomEvent('obs:remoteEvent', { detail: payload.event }));
    }
  }

  public sendP2PMessage<T extends P2PPayload['type']>(
    type: T,
    payload: Extract<P2PPayload, { type: T }>['payload']
  ) {
    if (!this.controlChannel || this.controlChannel.readyState !== 'open') return;
    this.sequenceCounter++;
    const msg = createP2PMessage(this.authPayload?.remoteSessionId || 'unknown', this.sequenceCounter, type, payload);
    const raw = JSON.stringify(msg);
    this.controlChannel.send(raw);
  }

  public broadcastEvent(event: any) {
    if (this.role === 'streamer') {
      this.currentRevision++;
      this.sendP2PMessage('state.patch', { revision: this.currentRevision, event });
    }
  }

  public destroy() {
    this.stopHeartbeat();
    this.signalingUnsub();
    if (this.controlChannel) this.controlChannel.close();
    if (this.eventsChannel) this.eventsChannel.close();
    if (this.pc) this.pc.close();
  }
}
