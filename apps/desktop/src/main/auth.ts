import { ipcMain, safeStorage, shell } from 'electron';
import crypto from 'crypto';

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let deviceKeys: { publicKey: string; privateKey: string } | null = null;

function getStorePath() {
  return path.join(app.getPath('userData'), 'secure-store.bin');
}

export function setupAuthHandlers() {
  ipcMain.handle('auth:get-keys', () => {
    if (!deviceKeys) {
      deviceKeys = generateKeys();
    }
    return deviceKeys.publicKey;
  });

  ipcMain.handle('auth:store-refresh-token', (_, token: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        fs.writeFileSync(getStorePath(), encrypted);
      }
      refreshTokenCache = token;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });

  ipcMain.handle('auth:login', async () => {
    // Open system browser
    shell.openExternal('http://localhost:3000/auth/desktop/login');
  });
}

export function handleDeepLink(url: string, mainWindow: Electron.BrowserWindow) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
      const code = parsed.searchParams.get('code');
      if (code && mainWindow) {
        mainWindow.webContents.send('auth:callback', code);
      }
    }
  } catch (e) {
    console.error('Deep link error', e);
  }
}

function generateKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Store private key securely
  // In production, we'd save this encrypted to disk via safeStorage
  return { publicKey, privateKey };
}
