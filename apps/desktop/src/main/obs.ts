import { ipcMain, safeStorage, app } from 'electron';
import { ObsAdapter } from '@obs-remote/obs-adapter';
import { ObsConnectionConfigSchema, ObsCommandSchema } from '@obs-remote/obs-contracts';
import path from 'path';
import fs from 'fs';

const obs = new ObsAdapter();
export function getObsAdapter() { return obs; }

function getObsSettingsPath() {
  return path.join(app.getPath('userData'), 'obs_settings.json');
}

function loadObsSettings() {
  try {
    const storePath = getObsSettingsPath();
    if (fs.existsSync(storePath)) {
      const encrypted = fs.readFileSync(storePath);
      const data = safeStorage.isEncryptionAvailable() 
        ? safeStorage.decryptString(encrypted)
        : encrypted.toString('utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load OBS settings', e);
  }
  return null;
}

function saveObsSettings(data: unknown) {
  const storePath = getObsSettingsPath();
  const json = JSON.stringify(data);
  const buffer = safeStorage.isEncryptionAvailable() 
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8');
  fs.writeFileSync(storePath, buffer);
}

export function setupObsHandlers(mainWindow: Electron.BrowserWindow) {
  // Pass events to renderer
  obs.subscribe((state, snapshot, event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('obs:event', { state, snapshot, event });
    }
  });

  ipcMain.handle('obs:getStatus', () => {
    return obs.getState();
  });

  ipcMain.handle('obs:connect', async (_, configRaw: unknown) => {
    const parsed = ObsConnectionConfigSchema.safeParse(configRaw);
    if (!parsed.success) {
      return false; // Validation failed
    }

    // Save to safe storage
    saveObsSettings(parsed.data);

    return await obs.connect(parsed.data);
  });

  ipcMain.handle('obs:disconnect', async () => {
    await obs.disconnect();
    return true;
  });

  ipcMain.handle('obs:getSnapshot', async () => {
    return obs.getSnapshotData();
  });

  ipcMain.handle('obs:execute', async (_, commandRaw: unknown) => {
    const parsed = ObsCommandSchema.safeParse(commandRaw);
    if (!parsed.success) {
      return { success: false, error: 'Invalid command schema' };
    }
    return await obs.executeCommand(parsed.data);
  });

  // Auto connect on startup if settings exist
  const settings = loadObsSettings();
  if (settings) {
    obs.connect(settings).catch(() => {});
  }
}
