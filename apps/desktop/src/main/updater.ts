import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';

export function setupUpdater(mainWindow: BrowserWindow) {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // Basic logging
  autoUpdater.logger = console;

  autoUpdater.autoDownload = true; // Auto download by default
  autoUpdater.autoInstallOnAppQuit = false; // We want to control installation

  // Expose states to renderer
  const notifyState = (state: string, data?: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:state', { state, data });
    }
  };

  autoUpdater.on('checking-for-update', () => notifyState('checking'));
  autoUpdater.on('update-available', (info) => notifyState('available', info));
  autoUpdater.on('update-not-available', (info) =>
    notifyState('not-available', info),
  );
  autoUpdater.on('error', (err) => {
    // Only send the message, not the full stack trace
    notifyState('error', { message: err?.message || 'Unknown updater error' });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    notifyState('downloading', progressObj);
  });
  autoUpdater.on('update-downloaded', (info) =>
    notifyState('downloaded', info),
  );

  ipcMain.handle('updater:getState', () => {
    return 'idle';
  });

  ipcMain.on('updater:check', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Check for updates failed', err);
    });
  });

  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
  });

  // Initial check after 10 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(console.error);
  }, 10000);

  // Check every 6 hours
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(console.error);
    },
    6 * 60 * 60 * 1000,
  );
}
