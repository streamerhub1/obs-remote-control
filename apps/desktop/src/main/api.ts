import { ipcMain } from 'electron';
import { getAccessToken } from './auth.js';

const getApiUrl = () => {
  return process.env.VITE_API_URL || process.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
  } catch (err: any) {
    console.error('API Fetch error:', err.message);
    // Hide technical errors behind a user-friendly message
    if (err.message === 'fetch failed' || err.message.includes('ECONNREFUSED')) {
       throw new Error('Сервис временно недоступен');
    }
    throw new Error(err.message);
  }
}

export function setupApiHandlers() {
  ipcMain.handle('api:feed:list', async () => apiFetch('/api/v1/feed'));
  ipcMain.handle('api:feed:create', async (_, data) => apiFetch('/api/v1/feed', { method: 'POST', body: JSON.stringify(data) }));
  ipcMain.handle('api:feed:like', async (_, id) => apiFetch(`/api/v1/feed/${id}/like`, { method: 'POST' }));
  
  ipcMain.handle('api:collabs:list', async () => apiFetch('/api/v1/collabs'));
  ipcMain.handle('api:collabs:create', async (_, data) => apiFetch('/api/v1/collabs', { method: 'POST', body: JSON.stringify(data) }));
  ipcMain.handle('api:collabs:apply', async (_, id, message) => apiFetch(`/api/v1/collabs/${id}/apply`, { method: 'POST', body: JSON.stringify({ message }) }));
  ipcMain.handle('api:collabs:join', async (_, id) => apiFetch(`/api/v1/collabs/${id}/join`, { method: 'POST' }));
  
  ipcMain.handle('api:calendar:list', async (_, start, end) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return apiFetch(`/api/v1/calendar?${q.toString()}`);
  });
  ipcMain.handle('api:calendar:create', async (_, data) => apiFetch('/api/v1/calendar', { method: 'POST', body: JSON.stringify(data) }));
  ipcMain.handle('api:calendar:update', async (_, id, data) => apiFetch(`/api/v1/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }));
  ipcMain.handle('api:calendar:delete', async (_, id) => apiFetch(`/api/v1/calendar/${id}`, { method: 'DELETE' }));
  
  ipcMain.handle('api:profile:getMe', async () => apiFetch('/api/v1/profile/me'));
  ipcMain.handle('api:profile:updateMe', async (_, data) => apiFetch('/api/v1/profile/me', { method: 'PATCH', body: JSON.stringify(data) }));
  
  ipcMain.handle('api:notifications:list', async () => apiFetch('/api/v1/notifications'));
  ipcMain.handle('api:notifications:markAllRead', async () => apiFetch('/api/v1/notifications/read-all', { method: 'POST' }));
  ipcMain.handle('api:notifications:markRead', async (_, id) => apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' }));
}
