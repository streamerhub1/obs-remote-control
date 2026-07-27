import { ipcMain, app } from 'electron';
import { getAccessToken } from './auth.js';
import { z } from 'zod';

const INVALID_SERVICE_RESPONSE = 'Некорректный ответ сервиса';

const FeedAuthorSchema = z.object({
  id: z.string(),
  publicId: z.number().optional(),
  displayName: z.string(),
  twitchLogin: z.string(),
  avatarUrl: z.string().nullable(),
});

const FeedPostSchema = z.object({
  id: z.string(),
  content: z.string(),
  likesCount: z.number(),
  commentsCount: z.number(),
  createdAt: z.string(),
  author: FeedAuthorSchema,
});

const FeedCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  likesCount: z.number(),
  createdAt: z.string(),
  author: FeedAuthorSchema,
});

const FeedListResponseSchema = z.object({
  data: z.array(FeedPostSchema),
  nextCursor: z.string().nullable(),
  tab: z.enum(['all', 'following', 'forYou']).optional(),
});

const FeedCommentsResponseSchema = z.object({
  data: z.array(FeedCommentSchema),
  nextCursor: z.string().nullable(),
});

const FeedLikeResponseSchema = z.object({ liked: z.boolean() });

const BackendProfileResponseSchema = z.object({
  bannerUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  languages: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  timezone: z.string().default('UTC'),
  collaborationAvailability: z.boolean().default(true),
  socialLinks: z
    .array(z.object({ platform: z.string(), url: z.string() }))
    .default([]),
  user: z.object({
    id: z.string(),
    publicId: z.number().optional(),
    displayName: z.string(),
    twitchLogin: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

function normalizeProfile(raw: unknown) {
  const parsed = BackendProfileResponseSchema.parse(raw);
  return {
    id: parsed.user.id,
    publicId: parsed.user.publicId,
    displayName: parsed.user.displayName,
    twitchLogin: parsed.user.twitchLogin,
    avatarUrl: parsed.user.avatarUrl,
    bio: parsed.bio,
    languages: parsed.languages,
    categories: parsed.categories,
    timezone: parsed.timezone,
    collaborationAvailability: parsed.collaborationAvailability,
    twitchUrl: `https://twitch.tv/${parsed.user.twitchLogin}`,
  };
}

const CollaborationAuthorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

const CollaborationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  startAt: z.string(),
  expectedDurationMinutes: z.number(),
  maximumParticipants: z.number(),
  currentParticipants: z.number(),
  applicationMode: z.string(),
  visibility: z.string(),
  host: CollaborationAuthorSchema.nullable().optional(),
  myApplication: z.object({ status: z.string() }).nullable().optional(),
  inviteUrl: z.string().optional(),
});

const CollaborationListResponseSchema = z.object({
  data: z.array(CollaborationSchema),
  nextCursor: z.string().nullable(),
});

const RemoteSessionListResponseSchema = z.array(
  z.object({
    id: z.string(),
    publicId: z.string(),
    status: z.string(),
    streamerId: z.string(),
    moderatorId: z.string(),
    createdAt: z.string(),
    endedAt: z.string().nullable().optional(),
    streamer: CollaborationAuthorSchema.nullable().optional(),
    moderator: CollaborationAuthorSchema.nullable().optional(),
  }),
);

export const getApiUrl = () => {
  const url =
    import.meta.env.VITE_STREAMERHUB_API_URL || process.env.STREAMERHUB_API_URL;
  if (url) return url.replace(/\/$/, '');

  if (import.meta.env.PROD || app.isPackaged) {
    throw new Error('VITE_STREAMERHUB_API_URL is required for production builds');
  }
  return 'http://localhost:3000';
};

export const getWsUrl = () => {
  const url =
    import.meta.env.VITE_STREAMERHUB_WS_URL || process.env.STREAMERHUB_WS_URL;
  if (url) return url.replace(/\/$/, '');

  if (import.meta.env.PROD || app.isPackaged) {
    throw new Error('VITE_STREAMERHUB_WS_URL is required for production builds');
  }
  return 'ws://localhost:3000';
};

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });

    if (!res.ok) {
      const errorText = await res.text();
      let msg = res.statusText;
      try {
        const json = JSON.parse(errorText);
        if (json.message || json.error) msg = json.message || json.error;
      } catch (_e) {
        // Keep status text when the backend did not return JSON.
      }
      throw new Error(msg);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('API Fetch error:', message);
    if (message === 'fetch failed' || message.includes('ECONNREFUSED')) {
      throw new Error('Сервис временно недоступен');
    }
    throw new Error(message);
  }
}

export function setupApiHandlers() {
  const host = new URL(getApiUrl()).hostname;
  console.log(`Desktop API host: ${host}`);

  ipcMain.handle('api:getWsUrl', () => getWsUrl());
  ipcMain.handle('api:feed:list', async (_, options: unknown) => {
    const parsedOptions = z
      .object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        tab: z.enum(['all', 'following', 'forYou']).optional(),
      })
      .optional()
      .parse(options);
    const q = new URLSearchParams();
    if (parsedOptions?.cursor) q.set('cursor', parsedOptions.cursor);
    if (parsedOptions?.limit) q.set('limit', String(parsedOptions.limit));
    if (parsedOptions?.tab) q.set('tab', parsedOptions.tab);
    const raw = await apiFetch(`/api/v1/feed${q.size ? `?${q.toString()}` : ''}`);
    const parsed = FeedListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Service returned invalid feed list data:', parsed.error);
      throw new Error(INVALID_SERVICE_RESPONSE);
    }
    return parsed.data;
  });
  ipcMain.handle('api:feed:create', async (_, data: unknown) =>
    apiFetch('/api/v1/feed/posts', {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
  ipcMain.handle('api:feed:like', async (_, id: unknown) => {
    const raw = await apiFetch(`/api/v1/feed/posts/${z.string().parse(id)}/like`, {
      method: 'POST',
    });
    const parsed = FeedLikeResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Service returned invalid feed like data:', parsed.error);
      throw new Error(INVALID_SERVICE_RESPONSE);
    }
    return parsed.data;
  });
  ipcMain.handle('api:feed:comments:list', async (_, postId: unknown, options: unknown) => {
    const parsedOptions = z
      .object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).optional() })
      .optional()
      .parse(options);
    const q = new URLSearchParams();
    if (parsedOptions?.cursor) q.set('cursor', parsedOptions.cursor);
    if (parsedOptions?.limit) q.set('limit', String(parsedOptions.limit));
    const raw = await apiFetch(
      `/api/v1/feed/posts/${z.string().parse(postId)}/comments${q.size ? `?${q.toString()}` : ''}`,
    );
    const parsed = FeedCommentsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Service returned invalid feed comments data:', parsed.error);
      throw new Error(INVALID_SERVICE_RESPONSE);
    }
    return parsed.data;
  });
  ipcMain.handle('api:feed:comments:create', async (_, postId: unknown, data: unknown) =>
    apiFetch(`/api/v1/feed/posts/${z.string().parse(postId)}/comments`, {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );

  ipcMain.handle('api:collabs:list', async () => {
    const raw = await apiFetch('/api/v1/collaborations');
    const parsed = CollaborationListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Service returned invalid collaborations data:', parsed.error);
      throw new Error(INVALID_SERVICE_RESPONSE);
    }
    return parsed.data;
  });
  ipcMain.handle('api:collabs:create', async (_, data: unknown) =>
    apiFetch('/api/v1/collaborations', {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
  ipcMain.handle('api:collabs:apply', async (_, id: unknown, message: unknown) =>
    apiFetch(`/api/v1/collaborations/${z.string().parse(id)}/apply`, {
      method: 'POST',
      body: JSON.stringify({ message: z.string().optional().parse(message) }),
    }),
  );
  ipcMain.handle('api:collabs:join', async (_, id: unknown) =>
    apiFetch(`/api/v1/collaborations/${z.string().parse(id)}/join`, { method: 'POST' }),
  );

  ipcMain.handle('api:calendar:list', async (_, start: unknown, end: unknown) => {
    const q = new URLSearchParams();
    const s = z.string().optional().parse(start);
    const e = z.string().optional().parse(end);
    if (s) q.set('start', s);
    if (e) q.set('end', e);
    return apiFetch(`/api/v1/calendar?${q.toString()}`);
  });
  ipcMain.handle('api:calendar:create', async (_, data: unknown) =>
    apiFetch('/api/v1/calendar', {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
  ipcMain.handle('api:calendar:delete', async (_, id: unknown) =>
    apiFetch(`/api/v1/calendar/${z.string().parse(id)}`, { method: 'DELETE' }),
  );

  ipcMain.handle('api:profile:getMe', async () => normalizeProfile(await apiFetch('/api/v1/profiles/me')));
  ipcMain.handle('api:profile:updateMe', async (_, data: unknown) => {
    await apiFetch('/api/v1/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    });
    return normalizeProfile(await apiFetch('/api/v1/profiles/me'));
  });

  ipcMain.handle('api:notifications:list', async () => apiFetch('/api/v1/notifications'));
  ipcMain.handle('api:notifications:markAllRead', async () =>
    apiFetch('/api/v1/notifications/mark-read', { method: 'POST' }),
  );
  ipcMain.handle('api:notifications:markRead', async (_, id: unknown) =>
    apiFetch(`/api/v1/notifications/${z.string().parse(id)}/mark-read`, { method: 'POST' }),
  );

  ipcMain.handle('api:relationships:list', async () => apiFetch('/api/v1/relationships'));
  ipcMain.handle('api:relationships:invite', async (_, data: unknown) =>
    apiFetch('/api/v1/relationships/invite', {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
  ipcMain.handle('api:relationships:respond', async (_, id: unknown, data: unknown) =>
    apiFetch(`/api/v1/relationships/${z.string().parse(id)}/respond`, {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
  ipcMain.handle('api:relationships:revoke', async (_, id: unknown) =>
    apiFetch(`/api/v1/relationships/${z.string().parse(id)}/revoke`, { method: 'POST' }),
  );
  ipcMain.handle('api:relationships:getPermissions', async (_, id: unknown) =>
    apiFetch(`/api/v1/relationships/${z.string().parse(id)}/permissions`),
  );
  ipcMain.handle('api:relationships:setPermissions', async (_, id: unknown, data: unknown) =>
    apiFetch(`/api/v1/relationships/${z.string().parse(id)}/permissions`, {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );

  ipcMain.handle('api:remoteSessions:list', async () => {
    const raw = await apiFetch('/api/v1/remote-sessions');
    const parsed = RemoteSessionListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Service returned invalid remote sessions data:', parsed.error);
      throw new Error(INVALID_SERVICE_RESPONSE);
    }
    return parsed.data;
  });
  ipcMain.handle('api:remoteSessions:create', async (_, data: unknown) =>
    apiFetch('/api/v1/remote-sessions', {
      method: 'POST',
      body: JSON.stringify(z.record(z.unknown()).parse(data)),
    }),
  );
}
