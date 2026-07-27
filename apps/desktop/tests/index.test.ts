import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app, BrowserWindow, shell, ipcMain } from 'electron';

const windowOn = vi.fn();
const webContentsOn = vi.fn();
const setWindowOpenHandler = vi.fn();
const show = vi.fn();
const restore = vi.fn();
const focus = vi.fn();
const isMinimized = vi.fn().mockReturnValue(false);
const isVisible = vi.fn().mockReturnValue(true);
const isDestroyed = vi.fn().mockReturnValue(false);

vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    quit: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    setAsDefaultProtocolClient: vi.fn(),
    isDefaultProtocolClient: vi.fn().mockReturnValue(true),
    getPath: vi.fn().mockReturnValue('mock-path'),
    isPackaged: false,
  },
  BrowserWindow: Object.assign(
    vi.fn().mockImplementation(() => ({
      on: windowOn,
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      show,
      restore,
      focus,
      isMinimized,
      isVisible,
      isDestroyed,
      webContents: {
        on: webContentsOn,
        send: vi.fn(),
        session: { webRequest: { onHeadersReceived: vi.fn() } },
        setWindowOpenHandler,
        openDevTools: vi.fn(),
        reload: vi.fn(),
      },
    })),
    { getAllWindows: vi.fn().mockReturnValue([]) },
  ),
  shell: { openExternal: vi.fn() },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  dialog: { showMessageBox: vi.fn() },
}));

vi.mock('electron-updater', () => ({
  autoUpdater: { on: vi.fn(), checkForUpdatesAndNotify: vi.fn() },
}));

describe('Main Process Security Settings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isMinimized.mockReturnValue(false);
    isVisible.mockReturnValue(true);
    isDestroyed.mockReturnValue(false);
  });

  it('should have secure webPreferences when creating a window', async () => {
    await import('../src/main/index');
    await vi.mocked(app.whenReady).mock.results[0].value;

    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    const windowArgs = vi.mocked(BrowserWindow).mock.calls[0][0];
    const prefs = windowArgs?.webPreferences;

    expect(windowArgs?.minWidth).toBe(800);
    expect(prefs?.nodeIntegration).toBe(false);
    expect(prefs?.contextIsolation).toBe(true);
    expect(prefs?.sandbox).toBe(true);
  });

  it('should only open external URLs from the allowlist', async () => {
    await import('../src/main/index');

    const handleCall = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === 'shell:openExternal');
    expect(handleCall).toBeDefined();
    const handler = handleCall![1] as (event: unknown, url: string) => boolean;

    vi.mocked(shell.openExternal).mockClear();

    expect(handler({} as unknown, 'https://github.com/streamerhub1')).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/streamerhub1');
    expect(handler({} as unknown, 'https://example.com')).toBe(false);
    expect(handler({} as unknown, 'javascript:alert(1)')).toBe(false);
    expect(handler({} as unknown, 'https://twitch.tv/somechannel')).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledTimes(2);
  });

  it('routes allowed navigations to shell.openExternal and blocks in-window navigation', async () => {
    await import('../src/main/index');

    const openHandler = setWindowOpenHandler.mock.calls[0][0] as (details: { url: string }) => { action: string };
    expect(openHandler({ url: 'https://github.com/streamerhub1' })).toEqual({ action: 'deny' });
    expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/streamerhub1');

    const willNavigateCall = webContentsOn.mock.calls.find((call) => call[0] === 'will-navigate');
    expect(willNavigateCall).toBeDefined();
    const event = { preventDefault: vi.fn() };
    willNavigateCall![1](event, 'https://twitch.tv/somechannel');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(shell.openExternal).toHaveBeenCalledWith('https://twitch.tv/somechannel');
  });

  it('restores the existing window on repeat launch', async () => {
    const { restoreMainWindow } = await import('../src/main/index');
    const window = {
      isDestroyed: vi.fn().mockReturnValue(false),
      isMinimized: vi.fn().mockReturnValue(true),
      isVisible: vi.fn().mockReturnValue(false),
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
    } as unknown as Electron.BrowserWindow;

    expect(restoreMainWindow(window)).toBe(true);
    expect(window.restore).toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });
});
