import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupApiHandlers } from './api';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn(),
  },
}));

vi.mock('./auth', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
}));

const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiHandlers();
  });

  it('registers api:profile:getMe and calls /api/v1/profiles/me', async () => {
    const handleMock = ipcMain.handle as import('vitest').Mock;
    const getMeCall = handleMock.mock.calls.find(
      (c: unknown[]) => c[0] === 'api:profile:getMe',
    );
    expect(getMeCall).toBeDefined();

    globalFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        bio: 'Hello world',
        languages: ['ru'],
        categories: [],
        timezone: 'UTC',
        collaborationAvailability: true,
        socialLinks: [],
        user: {
          id: 'user1',
          displayName: 'Test User',
          twitchLogin: 'testuser',
          avatarUrl: 'https://avatar',
        },
      }),
    });

    const getMeHandler = getMeCall![1];
    const res = await getMeHandler();

    // Check fetch was called with the correct path
    expect(globalFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/profiles/me'),
      expect.anything(),
    );

    // Check mapping flattened structure
    expect(res).toEqual({
      id: 'user1',
      displayName: 'Test User',
      twitchLogin: 'testuser',
      avatarUrl: 'https://avatar',
      bio: 'Hello world',
      languages: ['ru'],
      categories: [],
      timezone: 'UTC',
      collaborationAvailability: true,
      twitchUrl: 'https://twitch.tv/testuser',
    });
  });
});

