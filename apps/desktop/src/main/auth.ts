import { ipcMain, safeStorage, shell } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let mainWindowRef: Electron.BrowserWindow | null = null;
let accessToken: string | null = null;
let deviceId: string | null = null;

function getStorePath() {
  return path.join(app.getPath('userData'), 'device_identity.json');
}

function loadDeviceIdentity() {
  try {
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      const encrypted = fs.readFileSync(storePath);
      const data = safeStorage.isEncryptionAvailable() 
        ? safeStorage.decryptString(encrypted)
        : encrypted.toString('utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load device identity', e);
  }
  return null;
}

function saveDeviceIdentity(data: any) {
  const storePath = getStorePath();
  const json = JSON.stringify(data);
  const buffer = safeStorage.isEncryptionAvailable() 
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8');
  fs.writeFileSync(storePath, buffer);
}

function deleteDeviceIdentity() {
  const storePath = getStorePath();
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }
}

export function setupAuthHandlers(mainWindow: Electron.BrowserWindow) {
  mainWindowRef = mainWindow;

  ipcMain.handle('auth:login', async () => {
    shell.openExternal(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/desktop/login`);
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      const identity = loadDeviceIdentity();
      if (identity?.refreshToken) {
        await fetch(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: identity.refreshToken })
        });
      }
    } catch (e) {
      console.error('Logout error', e);
    }
    
    deleteDeviceIdentity();
    accessToken = null;
    deviceId = null;
    mainWindowRef?.webContents.send('auth:state-changed', { authenticated: false });
  });

  ipcMain.handle('auth:getState', async () => {
    if (!accessToken) {
      // try to restore from refresh token
      await refreshAccessToken();
    }
    return { authenticated: !!accessToken };
  });

  ipcMain.handle('auth:getProfile', async () => {
    if (!accessToken) return null;
    try {
      const res = await fetch(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to get profile', e);
    }
    return null;
  });

  // Automatically attempt restore on startup
  refreshAccessToken().then((success) => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send('auth:state-changed', { authenticated: success });
    }
  });
}

async function refreshAccessToken() {
  const identity = loadDeviceIdentity();
  if (!identity || !identity.refreshToken) return false;

  try {
    // 1. Refresh flow with Proof-of-Possession challenge
    const challengeRes = await fetch(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/desktop/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: identity.deviceId })
    });
    
    if (!challengeRes.ok) throw new Error('Challenge failed');
    const { challenge } = await challengeRes.json();

    // Sign challenge
    const signature = crypto.sign(null, Buffer.from(challenge), identity.privateKey).toString('base64');

    // 2. Exchange refresh token + signature for new tokens
    const refreshRes = await fetch(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/desktop/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: identity.deviceId,
        refreshToken: identity.refreshToken,
        signature
      })
    });

    if (!refreshRes.ok) {
      deleteDeviceIdentity();
      return false;
    }

    const tokens = await refreshRes.json();
    accessToken = tokens.accessToken;
    identity.refreshToken = tokens.refreshToken;
    saveDeviceIdentity(identity);
    return true;

  } catch (e) {
    console.error('Refresh token error', e);
    return false;
  }
}

export async function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
      const code = parsed.searchParams.get('code');
      if (code) {
        mainWindowRef?.webContents.send('auth:loading', true);
        await exchangeCode(code);
        mainWindowRef?.webContents.send('auth:loading', false);
      }
    }
  } catch (e) {
    console.error('Deep link error', e);
  }
}

async function exchangeCode(code: string) {
  try {
    // Generate Ed25519 keys
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const privKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    const response = await fetch(`${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/desktop/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        publicKey: pubKeyPem,
        deviceName: `${process.platform} Device`,
        platform: process.platform,
        appVersion: app.getVersion()
      })
    });

    if (!response.ok) throw new Error('Exchange failed');
    
    const data = await response.json();
    
    accessToken = data.accessToken;
    deviceId = data.deviceId;

    saveDeviceIdentity({
      deviceId: data.deviceId,
      publicKey: pubKeyPem,
      privateKey: privKeyPem,
      refreshToken: data.refreshToken
    });

    mainWindowRef?.webContents.send('auth:state-changed', { authenticated: true });
  } catch (error) {
    console.error('Code exchange failed', error);
    mainWindowRef?.webContents.send('auth:error', 'Login failed');
  }
}
