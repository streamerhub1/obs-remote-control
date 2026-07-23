import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path, { join } from 'path';
import { setupAuthHandlers, handleDeepLink } from './auth';
import { setupObsHandlers } from './obs';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show();
      if (isDev) {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // Handle render process errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`Page failed to load: ${errorDescription} (${errorCode}) at ${validatedURL}`);
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error(`Render process gone. Reason: ${details.reason}, exitCode: ${details.exitCode}`);
    });

    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      console.error(`Preload error in ${preloadPath}:`, error);
    });

    // Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      if (!isDev) {
        responseHeaders['Content-Security-Policy'] = ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss: http: https:;"];
      }

      callback({ responseHeaders });
    });

    // Prevent external window creation
    mainWindow.webContents.setWindowOpenHandler((_details) => {
      return { action: 'deny' };
    });

    // Load URL or local file
    if (process.env.ELECTRON_RENDERER_URL) {
      mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  app.whenReady().then(() => {
    // Register Deep Link
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('obsremote', process.execPath, [path.resolve(process.argv[1])])
      }
    } else {
      app.setAsDefaultProtocolClient('obsremote')
    }

    // Register IPC handlers
    ipcMain.handle('shell:openExternal', (event, url: string) => {
      const allowlist = ['github.com', 'twitch.tv'];
      try {
        const parsedUrl = new URL(url);
        if ((parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') && allowlist.some(domain => parsedUrl.hostname.endsWith(domain))) {
          shell.openExternal(url);
          return true;
        }
        console.warn(`Blocked attempt to open external URL: ${url}`);
        return false;
      } catch {
        console.error(`Invalid URL provided to openExternal: ${url}`);
        return false;
      }
    });

    createWindow();
    
    if (mainWindow) {
      setupAuthHandlers(mainWindow);
      setupObsHandlers(mainWindow);
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.pop();
    if (url && url.startsWith('obsremote://')) {
      handleDeepLink(url);
    }
  });
}
