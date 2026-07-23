import { ObsCommand, ObsEvent, ObsSnapshot } from '@obs-remote/obs-contracts';
import { getCommandPermission, PermissionKey } from '@obs-remote/permissions';
import { createResponse, createEvent, P2PControlRequestSchema, P2PEnvelopeSchema } from '@obs-remote/p2p-protocol';

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, Map<string, RTCDataChannel>> = new Map();
  private executeObsCommand: (command: ObsCommand) => Promise<any>;
  private getObsSnapshot: () => Promise<ObsSnapshot | null>;

  constructor(executeObsCommand: (cmd: ObsCommand) => Promise<any>, getObsSnapshot: () => Promise<ObsSnapshot | null>) {
    this.executeObsCommand = executeObsCommand;
    this.getObsSnapshot = getObsSnapshot;
    
    // Listen for signaling messages from Main process
    (window as any).desktop.signaling.subscribe(async (msg: any) => {
      const { fromUserId, fromDeviceId, type } = msg;
      if (!fromUserId || !fromDeviceId) return;
      const peerId = `${fromUserId}:${fromDeviceId}`;

      if (type === 'offer') {
        await this.handleOffer(peerId, msg.offer, msg.permissions);
      } else if (type === 'ice-candidate') {
        const pc = this.peerConnections.get(peerId);
        if (pc) await pc.addIceCandidate(msg.candidate);
      }
    });
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit, permissions: PermissionKey[]) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnections.set(peerId, pc);
    this.dataChannels.set(peerId, new Map());

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      this.dataChannels.get(peerId)?.set(channel.label, channel);
      
      channel.onmessage = async (e) => {
        await this.handleDataChannelMessage(peerId, channel.label, e.data, permissions);
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const [targetUserId, targetDeviceId] = peerId.split(':');
        (window as any).desktop.signaling.send({
          type: 'ice-candidate',
          targetUserId,
          targetDeviceId,
          candidate: event.candidate,
        });
      }
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const [targetUserId, targetDeviceId] = peerId.split(':');
    (window as any).desktop.signaling.send({
      type: 'answer',
      targetUserId,
      targetDeviceId,
      answer,
    });
  }

  private async handleDataChannelMessage(peerId: string, channelName: string, data: any, permissions: PermissionKey[]) {
    try {
      const envelope = P2PEnvelopeSchema.parse(JSON.parse(data));
      if (envelope.type !== 'request') return;

      if (channelName === 'control') {
        const req = P2PControlRequestSchema.parse(envelope.payload);
        let responsePayload: any;
        let success = false;
        let error: string | undefined;

        if (req.action === 'getSnapshot') {
          if (!permissions.includes('obs.read')) {
            error = 'Forbidden: missing obs.read';
          } else {
            responsePayload = await this.getObsSnapshot();
            success = true;
          }
        } else if (req.action === 'executeCommand') {
          const mapping = getCommandPermission(req.command.type);
          if (!mapping) {
            error = 'Unknown command';
          } else if (!permissions.includes(mapping.permissionKey)) {
            error = `Forbidden: missing ${mapping.permissionKey}`;
          } else {
            responsePayload = await this.executeObsCommand(req.command);
            success = true;
          }
        }

        const channel = this.dataChannels.get(peerId)?.get('control');
        if (channel?.readyState === 'open' && envelope.requestId) {
          channel.send(JSON.stringify(createResponse('control', envelope.requestId, { success, data: responsePayload, error })));
        }
      }
    } catch (e) {
      console.error('DataChannel error', e);
    }
  }

  public broadcastEvent(event: ObsEvent) {
    const envelope = JSON.stringify(createEvent('events', event));
    for (const channels of this.dataChannels.values()) {
      const channel = channels.get('events');
      if (channel?.readyState === 'open') {
        channel.send(envelope);
      }
    }
  }

  public destroy() {
    for (const pc of this.peerConnections.values()) pc.close();
    this.peerConnections.clear();
    this.dataChannels.clear();
  }
}
