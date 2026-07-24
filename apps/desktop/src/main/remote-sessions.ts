import { ipcMain } from 'electron';
import WebSocket from 'ws';
import { getAccessToken, getDeviceId } from './auth.js';
import { getMainWindow } from './index.js';
import * as jose from 'jose';
import crypto from 'crypto';
import { getRemoteCommandGuard } from './remote-command-guard.js';
import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { getApiUrl, getWsUrl } from './api.js';

function loadDeviceIdentity() {
  try {
    const storePath = path.join(
      app.getPath('userData'),
      'device_identity.json',
    );
    if (fs.existsSync(storePath)) {
      const encrypted = fs.readFileSync(storePath);
      const data = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(encrypted)
        : encrypted.toString('utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return null;
}

let backendPublicKey: crypto.KeyObject | null = null;
const activeSessions = new Map<string, WebSocket>();

// The context returned to renderer
export interface SessionContext {
  remoteSessionId: string;
  role: 'streamer' | 'moderator';
  peerDeviceId: string;
  permissions: string[];
}

export function setupRemoteSessions() {
  ipcMain.handle(
    'remoteSessions:connect',
    async (_, authorizationToken: string) => {
      return connectSession(authorizationToken);
    },
  );

  ipcMain.handle(
    'remoteSessions:disconnect',
    async (_, remoteSessionId: string) => {
      const ws = activeSessions.get(remoteSessionId);
      if (ws) {
        ws.close();
        activeSessions.delete(remoteSessionId);
      }
    },
  );

  ipcMain.on(
    'remoteSessions:sendSignal',
    (_, remoteSessionId: string, msg: unknown) => {
      const ws = activeSessions.get(remoteSessionId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
  );

  ipcMain.handle(
    'remoteSessions:signChallenge',
    async (_, remoteSessionId: string, challengeHex: string) => {
      // Look up local device private key
      const identity = loadDeviceIdentity();
      const privateKeyPem = identity?.privateKey;
      if (!privateKeyPem) throw new Error('No device private key');

      const privateKey = crypto.createPrivateKey(privateKeyPem);
      const signature = crypto.sign(
        null,
        Buffer.from(challengeHex, 'hex'),
        privateKey,
      );
      return signature.toString('hex');
    },
  );

  ipcMain.handle(
    'remoteSessions:verifyProof',
    async (
      _,
      remoteSessionId: string,
      challengeHex: string,
      signatureHex: string,
      peerPublicKeyPem: string,
    ) => {
      const publicKey = crypto.createPublicKey(peerPublicKeyPem);
      const isValid = crypto.verify(
        null,
        Buffer.from(challengeHex, 'hex'),
        publicKey,
        Buffer.from(signatureHex, 'hex'),
      );
      if (isValid) {
        // Handshake complete, enable commands
        getRemoteCommandGuard().enableSession(remoteSessionId);
      }
      return isValid;
    },
  );

  ipcMain.handle(
    'remoteSessions:executeCommand',
    async (_, remoteSessionId: string, command: unknown) => {
      return getRemoteCommandGuard().execute(
        remoteSessionId,
        command as { command: string; args?: unknown; seq: number },
      );
    },
  );
}

async function fetchBackendPublicKey() {
  if (backendPublicKey) return backendPublicKey;
  const res = await fetch(`${getApiUrl()}/api/v1/auth/desktop/public-key`);
  if (!res.ok) throw new Error('Failed to fetch public key');
  const data = await res.json();
  backendPublicKey = crypto.createPublicKey(data.publicKey);
  return backendPublicKey;
}

export async function connectSession(
  authorizationToken: string,
): Promise<SessionContext> {
  const publicKey = await fetchBackendPublicKey();

  // Verify JWT signature using Jose
  const { payload } = await jose.jwtVerify(authorizationToken, publicKey);

  if (payload.tokenType !== 'remote-session') {
    throw new Error('Invalid token type');
  }

  const {
    remoteSessionId,
    role,
    streamerDeviceId,
    moderatorDeviceId,
    permissions,
  } = payload as {
    remoteSessionId: string;
    role: 'streamer' | 'moderator';
    streamerDeviceId: string;
    moderatorDeviceId: string;
    permissions: string[];
  };
  const peerDeviceId =
    role === 'streamer' ? moderatorDeviceId : streamerDeviceId;

  const appToken = getAccessToken();
  if (!appToken) throw new Error('Not logged in');

  const ws = new WebSocket(`${getWsUrl()}/api/v1/signaling/session`);

  ws.on('open', () => {
    ws.send(
      JSON.stringify({
        type: 'signaling.authenticate',
        appToken,
        authorizationToken,
      }),
    );
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'heartbeat.ping') {
        ws?.send(
          JSON.stringify({ type: 'heartbeat.pong', timestamp: Date.now() }),
        );
        return;
      }
      getMainWindow()?.webContents.send(
        `remoteSessions:message:${remoteSessionId}`,
        msg,
      );
    } catch (e) {}
  });

  ws.on('close', () => {
    activeSessions.delete(remoteSessionId);
    getMainWindow()?.webContents.send(
      `remoteSessions:disconnected:${remoteSessionId}`,
    );
  });

  activeSessions.set(remoteSessionId, ws);

  // Register session with RemoteCommandGuard
  getRemoteCommandGuard().registerSession(
    remoteSessionId,
    payload as {
      role: 'streamer' | 'moderator';
      permissions?: string[];
      exp: number;
    },
  );

  return {
    remoteSessionId,
    role,
    peerDeviceId,
    permissions: permissions || [],
  };
}
