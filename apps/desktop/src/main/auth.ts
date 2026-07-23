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

  ipcMain.handle('auth:store-refresh-token', async (_, token: string) => {
    const storePath = getStorePath();
    // Only encrypt if safeStorage is available, otherwise use plain text fallback
    const buffer = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(token) : Buffer.from(token, 'utf-8');
    fs.writeFileSync(storePath, buffer);
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
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
  };
}
