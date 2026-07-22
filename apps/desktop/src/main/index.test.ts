import { describe, it, expect, vi } from 'vitest';
import { createWindow } from './index.js';

// Mock electron
vi.mock('electron', () => ({
  app: {
    whenReady: vi.fn().mockResolvedValue(true),
  },
  BrowserWindow: class {
    loadFile = vi.fn();
    constructor(public config: any) {}
  },
}));

describe('Electron Main', () => {
  it('configures BrowserWindow securely', () => {
    const win = createWindow();
    expect((win as any).config.webPreferences.nodeIntegration).toBe(false);
    expect((win as any).config.webPreferences.contextIsolation).toBe(true);
    expect((win as any).config.webPreferences.sandbox).toBe(true);
  });
});
