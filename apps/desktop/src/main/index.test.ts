import { describe, it, expect, vi } from 'vitest';
import { app, BrowserWindow, shell, ipcMain } from 'electron';

vi.mock('electron', () => {
  return {
    app: {
      requestSingleInstanceLock: vi.fn().mockReturnValue(true),
      quit: vi.fn(),
      whenReady: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      webContents: {
        on: vi.fn(),
        session: {
          webRequest: {
            onHeadersReceived: vi.fn(),
          },
        },
        setWindowOpenHandler: vi.fn(),
        openDevTools: vi.fn(),
      },
    })),
    shell: {
      openExternal: vi.fn(),
    },
    ipcMain: {
      handle: vi.fn(),
    },
  };
});

describe('Main Process Security Settings', () => {
  it('should have secure webPreferences when creating a window', async () => {
    // Import the index file to trigger createWindow when ready
    // We isolate imports to ensure fresh mock execution
    await import('./index');
    
    // Simulate app.whenReady() execution
    const whenReadyCall = vi.mocked(app.whenReady).mock.results[0];
    await whenReadyCall.value;
    
    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    
    // Get the arguments passed to the BrowserWindow constructor
    const windowArgs = vi.mocked(BrowserWindow).mock.calls[0][0];
    
    expect(windowArgs).toBeDefined();
    expect(windowArgs?.webPreferences).toBeDefined();
    
    const prefs = windowArgs?.webPreferences;
    expect(prefs?.nodeIntegration).toBe(false);
    expect(prefs?.contextIsolation).toBe(true);
    expect(prefs?.sandbox).toBe(true);
  });

  it('should only open external URLs from the allowlist', async () => {
    // Re-import main process entry to ensure handlers are registered
    await import('./index');
    
    // Find the registered shell:openExternal handler
    const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(c => c[0] === 'shell:openExternal');
    expect(handleCall).toBeDefined();
    
    const handler = handleCall![1] as (event: unknown, url: string) => boolean;
    
    // Clear mock just in case
    vi.mocked(shell.openExternal).mockClear();
    
    // Allowed URL
    const result1 = handler({} as any, 'https://github.com/streamerhub1');
    expect(result1).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/streamerhub1');
    
    // Disallowed URL
    const result2 = handler({} as any, 'https://example.com');
    expect(result2).toBe(false);
    expect(shell.openExternal).toHaveBeenCalledTimes(1); // Not called again
    
    // Invalid URL format
    const result3 = handler({} as any, 'javascript:alert(1)');
    expect(result3).toBe(false);
    expect(shell.openExternal).toHaveBeenCalledTimes(1); // Still not called
    
    // Allowed protocol check (twitch)
    const result4 = handler({} as any, 'https://twitch.tv/somechannel');
    expect(result4).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledTimes(2);
  });
});
