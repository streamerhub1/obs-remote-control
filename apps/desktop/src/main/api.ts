import { ipcMain, app } from 'electron';
import { getAccessToken } from './auth.js';
import { z } from 'zod';

export const getApiUrl = () => {
  const url = process.env.STREAMERHUB_API_URL || process.env.VITE_API_URL || process.env.VITE_BACKEND_URL;
  if (!url) {
    if (app.isPackaged) {
      return 'https://api.streamerhub.app';
    }
    return 'http://localhost:3000';
  }
  return url;
};

export const getWsUrl = () => {
  const url = process.env.STREAMERHUB_WS_URL || process.env.VITE_WS_URL;
  if (!url) {
    if (app.isPackaged) {
      return 'wss://api.streamerhub.app';
    }
    return 'ws://localhost:3000';
  }
  return url;
};

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      let msg = res.statusText;
      try {
        const json = JSON.parse(errorText);
        if (json.message || json.error) msg = json.message || json.error;
      } catch(e) {}
      throw new Error(msg); // Let renderer handle UI, just pass the message string
    }
    
    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('API Fetch error:', message);
    // Hide technical errors behind a user-friendly message
    if (message === 'fetch failed' || message.includes('ECONNREFUSED')) {
       throw new Error('Сервис временно недоступен');
    }
    throw new Error(message);
  }
}

export function setupApiHandlers() {
  ipcMain.handle('api:getWsUrl', () => getWsUrl());
  ipcMain.handle('api:feed:list', async () => apiFetch('/api/v1/feed'));
  ipcMain.handle('api:feed:create', async (_, data: unknown) => apiFetch('/api/v1/feed', { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:feed:like', async (_, id: unknown) => apiFetch(`/api/v1/feed/${z.string().parse(id)}/like`, { method: 'POST' }));
  
  ipcMain.handle('api:collabs:list', async () => apiFetch('/api/v1/collabs'));
  ipcMain.handle('api:collabs:create', async (_, data: unknown) => apiFetch('/api/v1/collabs', { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:collabs:apply', async (_, id: unknown, message: unknown) => apiFetch(`/api/v1/collabs/${z.string().parse(id)}/apply`, { method: 'POST', body: JSON.stringify({ message: z.string().optional().parse(message) }) }));
  ipcMain.handle('api:collabs:join', async (_, id: unknown) => apiFetch(`/api/v1/collabs/${z.string().parse(id)}/join`, { method: 'POST' }));
  
  ipcMain.handle('api:calendar:list', async (_, start: unknown, end: unknown) => {
    const q = new URLSearchParams();
    const s = z.string().optional().parse(start);
    const e = z.string().optional().parse(end);
    if (s) q.set('start', s);
    if (e) q.set('end', e);
    return apiFetch(`/api/v1/calendar?${q.toString()}`);
  });
  ipcMain.handle('api:calendar:create', async (_, data: unknown) => apiFetch('/api/v1/calendar', { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:calendar:update', async (_, id: unknown, data: unknown) => apiFetch(`/api/v1/calendar/${z.string().parse(id)}`, { method: 'PUT', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:calendar:delete', async (_, id: unknown) => apiFetch(`/api/v1/calendar/${z.string().parse(id)}`, { method: 'DELETE' }));
  
  ipcMain.handle('api:profile:getMe', async () => apiFetch('/api/v1/profile/me'));
  ipcMain.handle('api:profile:updateMe', async (_, data: unknown) => apiFetch('/api/v1/profile/me', { method: 'PATCH', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  
  ipcMain.handle('api:notifications:list', async () => apiFetch('/api/v1/notifications'));
  ipcMain.handle('api:notifications:markAllRead', async () => apiFetch('/api/v1/notifications/read-all', { method: 'POST' }));
  ipcMain.handle('api:notifications:markRead', async (_, id: unknown) => apiFetch(`/api/v1/notifications/${z.string().parse(id)}/read`, { method: 'POST' }));
  
  ipcMain.handle('api:relationships:list', async () => apiFetch('/api/v1/relationships'));
  ipcMain.handle('api:relationships:invite', async (_, data: unknown) => apiFetch('/api/v1/relationships/invite', { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:relationships:respond', async (_, id: unknown, data: unknown) => apiFetch(`/api/v1/relationships/${z.string().parse(id)}/respond`, { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  ipcMain.handle('api:relationships:revoke', async (_, id: unknown) => apiFetch(`/api/v1/relationships/${z.string().parse(id)}/revoke`, { method: 'POST' }));
  ipcMain.handle('api:relationships:getPermissions', async (_, id: unknown) => apiFetch(`/api/v1/relationships/${z.string().parse(id)}/permissions`));
  ipcMain.handle('api:relationships:setPermissions', async (_, id: unknown, data: unknown) => apiFetch(`/api/v1/relationships/${z.string().parse(id)}/permissions`, { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
  
  ipcMain.handle('api:remoteSessions:create', async (_, data: unknown) => apiFetch('/api/v1/remote-sessions', { method: 'POST', body: JSON.stringify(z.record(z.unknown()).parse(data)) }));
}
