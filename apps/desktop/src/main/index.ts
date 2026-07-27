import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { setupAuthHandlers, handleDeepLink } from './auth';
import { setupObsHandlers } from './obs';
import { setupSignaling } from './signaling';
import { setupRemoteSessions } from './remote-sessions';
import { setupApiHandlers } from './api';
import { setupUpdater } from './updater';
// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

const isDev =
  process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;
const isAuthClickSmokeTest = process.argv.includes('--smoke-test-auth-click');
const isSmokeTest = process.argv.includes('--smoke-test') || isAuthClickSmokeTest;

let mainWindow: BrowserWindow | null = null;
export function getMainWindow() {
  return mainWindow;
}

let smokeTimeout: ReturnType<typeof setTimeout> | null = null;

function completeSmokeTest(exitCode: number, detail: string) {
  if (!isSmokeTest) return;
  if (smokeTimeout) {
    clearTimeout(smokeTimeout);
    smokeTimeout = null;
  }
  console.log(`SMOKE_RESULT=${exitCode === 0 ? 'passed' : 'failed'}; ${detail}`);
  setTimeout(() => app.exit(exitCode), 100);
}

export function isAllowedExternalUrl(url: string) {
  const allowlist = ['github.com', 'twitch.tv', 'streamhubb.vercel.app'];
  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') &&
      allowlist.some(
        (domain) =>
          parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`),
      )
    );
  } catch {
    return false;
  }
}

function isAppNavigation(url: string) {
  if (url.startsWith('file://')) return true;
  if (!process.env.ELECTRON_RENDERER_URL) return false;
  try {
    return new URL(url).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin;
  } catch {
    return false;
  }
}

function openAllowedExternal(url: string) {
  if (!isAllowedExternalUrl(url)) return false;
  void shell.openExternal(url);
  return true;
}

export function restoreMainWindow(window: BrowserWindow | null) {
  if (!window || window.isDestroyed()) return false;
  if (window.isMinimized()) window.restore();
  if (!window.isVisible()) window.show();
  window.focus();
  return true;
}

if (!gotTheLock) {
  app.quit();
} else {
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0A0A0A',
        symbolColor: '#E5E7EB',
        height: 32,
      },
      backgroundColor: '#0A0A0A',
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
    mainWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(
          `Page failed to load: ${errorDescription} (${errorCode}) at ${validatedURL}`,
        );
        completeSmokeTest(1, `page failed to load: ${errorDescription} (${errorCode})`);
      },
    );

    mainWindow.webContents.on('render-process-gone', async (event, details) => {
      console.error(
        `Render process gone. Reason: ${details.reason}, exitCode: ${details.exitCode}`,
      );
      if (details.reason !== 'clean-exit') {
        if (isSmokeTest) {
          completeSmokeTest(1, `render process gone: ${details.reason} (${details.exitCode})`);
          return;
        }
        const result = await dialog.showMessageBox(mainWindow!, {
          type: 'error',
          title: 'Сбой процесса',
          message: 'Процесс отрисовки завершился с ошибкой.',
          detail: `Причина: ${details.reason}\nКод завершения: ${details.exitCode}\n\nПожалуйста, перезапустите приложение или перезагрузите страницу.`,
          buttons: ['Перезагрузить', 'Закрыть'],
          defaultId: 0,
        });
        if (result.response === 0) {
          mainWindow?.webContents.reload();
        }
      }
    });

    mainWindow.webContents.on('unresponsive', async () => {
      console.error('Render process is unresponsive');
      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        title: 'Приложение не отвечает',
        message: 'Процесс отрисовки перестал отвечать.',
        detail:
          'Вы можете подождать или перезагрузить приложение прямо сейчас.',
        buttons: ['Перезагрузить', 'Подождать'],
        defaultId: 0,
      });
      if (result.response === 0) {
        mainWindow?.webContents.reload();
      }
    });

    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      console.error(`Preload error in ${preloadPath}:`, error);
    });

    // Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        const responseHeaders = { ...details.responseHeaders };

        if (!isDev) {
          responseHeaders['Content-Security-Policy'] = [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://static-cdn.jtvnw.net; connect-src 'self' ws: wss: http: https:;",
          ];
        }

        callback({ responseHeaders });
      },
    );

    mainWindow.webContents.on('did-finish-load', () => {
      if (isAuthClickSmokeTest) {
        setTimeout(() => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            completeSmokeTest(1, 'auth click failed: window destroyed');
            return;
          }
          void mainWindow.webContents
            .executeJavaScript(
              `(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const button = buttons.find((candidate) => candidate.textContent?.includes('Twitch'));
                if (!button) return 'missing';
                button.click();
                return 'clicked';
              })()`,
            )
            .then((result) => {
              if (result !== 'clicked') {
                completeSmokeTest(1, 'auth click failed: twitch button missing');
              }
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              completeSmokeTest(1, `auth click failed: ${message}`);
            });
        }, 500);
        return;
      }
      completeSmokeTest(0, 'renderer loaded');
    });

    // Prevent external window creation inside the app window.
    mainWindow.webContents.setWindowOpenHandler((details) => {
      openAllowedExternal(details.url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (isAppNavigation(url)) return;
      event.preventDefault();
      openAllowedExternal(url);
    });

    // Load URL or local file
    if (process.env.ELECTRON_RENDERER_URL) {
      mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  app.whenReady().then(() => {
    if (isSmokeTest) {
      smokeTimeout = setTimeout(() => {
        completeSmokeTest(1, 'timeout waiting for renderer load');
      }, 20000);
    }

    // Register Deep Link
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('streamerhub', process.execPath, [
          path.resolve(process.argv[1]),
        ]);
      }
    } else {
      app.setAsDefaultProtocolClient('streamerhub');
    }

    // Register IPC handlers
    ipcMain.handle('app:getVersion', () => app.getVersion());

    ipcMain.handle('shell:openExternal', (_event, url: string) => {
      const opened = openAllowedExternal(url);
      if (!opened) console.warn(`Blocked attempt to open external URL: ${url}`);
      return opened;
    });

    createWindow();

    if (mainWindow) {
      setupAuthHandlers(mainWindow);
      setupObsHandlers(mainWindow);
      setupSignaling();
      setupRemoteSessions();
      setupApiHandlers();
      if (!isSmokeTest) {
        void setupUpdater(mainWindow).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Updater initialization failed:', message);
        });
      }
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
    restoreMainWindow(mainWindow);
    const url = commandLine.pop();
    if (url && url.startsWith('streamerhub://')) {
      handleDeepLink(url);
    }
  });
}



