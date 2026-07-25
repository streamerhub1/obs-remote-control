import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupApiHandlers } from '../src/main/api';
import { ipcMain } from 'electron';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    requestSingleInstanceLock: vi.fn(),
  }
}));

// Mock auth
vi.mock('../src/main/auth.js', () => ({
  getAccessToken: vi.fn().mockReturnValue('mock-token'),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Main process api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers feed routes correctly', () => {
    setupApiHandlers();
    expect(ipcMain.handle).toHaveBeenCalledWith('api:feed:list', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('api:feed:create', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('api:feed:like', expect.any(Function));
  });

  it('validates feed list response structure', async () => {
    setupApiHandlers();
    const listHandler = (ipcMain.handle as unknown as { mock: { calls: unknown[][] } }).mock.calls.find((c: unknown[]) => c[0] === 'api:feed:list')![1] as Function;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], nextCursor: null })
    });

    const result = await listHandler(null);
    expect(result).toEqual({ data: [], nextCursor: null });

    // Validate failure
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ something_else: true })
    });

    await expect(listHandler(null)).rejects.toThrow('Некорректный ответ сервиса');
  });

  it('api:feed:like validates response', async () => {
    setupApiHandlers();
    const likeHandler = (ipcMain.handle as unknown as { mock: { calls: unknown[][] } }).mock.calls.find((c: unknown[]) => c[0] === 'api:feed:like')![1] as Function;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ liked: true })
    });

    const result = await likeHandler(null, 'post1');
    expect(result).toEqual({ liked: true });

    // invalid response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ no_liked_field: true })
    });

    await expect(likeHandler(null, 'post1')).rejects.toThrow('Некорректный ответ сервиса');
  });
});
