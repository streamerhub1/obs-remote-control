import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';

export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

let currentState: UpdaterState = { status: 'idle' };

export function setupUpdater(mainWindow: BrowserWindow) {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // Basic logging
  autoUpdater.logger = console;

  autoUpdater.autoDownload = true; // Auto download by default
  autoUpdater.autoInstallOnAppQuit = false; // We want to control installation

  // Expose states to renderer
  const notifyState = (state: UpdaterState['status'], data?: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:state', { state, data });
    }
  };

  const updateState = (newState: UpdaterState) => {
    currentState = newState;
    let data: unknown = undefined;
    if (newState.status === 'available' || newState.status === 'downloaded') {
      data = { version: newState.version };
    } else if (newState.status === 'downloading') {
      data = { version: newState.version, percent: newState.percent };
    } else if (newState.status === 'error') {
      data = { message: newState.message };
    }
    notifyState(newState.status, data);
  };

  autoUpdater.on('checking-for-update', () =>
    updateState({ status: 'checking' }),
  );
  autoUpdater.on('update-available', (info) =>
    updateState({ status: 'available', version: info.version }),
  );
  autoUpdater.on('update-not-available', () =>
    updateState({ status: 'not-available' }),
  );
  autoUpdater.on('error', (err) => {
    // Only send the message, not the full stack trace
    updateState({
      status: 'error',
      message: err?.message || 'Unknown updater error',
    });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    updateState({
      status: 'downloading',
      version:
        currentState.status === 'available' ||
        currentState.status === 'downloading'
          ? currentState.version
          : 'unknown',
      percent: progressObj.percent,
    });
  });
  autoUpdater.on('update-downloaded', (info) =>
    updateState({ status: 'downloaded', version: info.version }),
  );

  ipcMain.handle('updater:getState', () => {
    return currentState;
  });

  ipcMain.on('updater:check', () => {
    if (
      currentState.status === 'checking' ||
      currentState.status === 'downloading'
    ) {
      return;
    }
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Check for updates failed', err);
    });
  });

  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
  });

  // Initial check after 10 seconds
  setTimeout(() => {
    if (currentState.status === 'idle' || currentState.status === 'error') {
      autoUpdater.checkForUpdates().catch(console.error);
    }
  }, 10000);

  // Check every 6 hours
  setInterval(
    () => {
      if (currentState.status === 'idle' || currentState.status === 'error') {
        autoUpdater.checkForUpdates().catch(console.error);
      }
    },
    6 * 60 * 60 * 1000,
  );
}
