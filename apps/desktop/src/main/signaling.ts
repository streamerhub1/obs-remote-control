import { ipcMain } from 'electron';
import WebSocket from 'ws';
import { getAccessToken } from './auth.js';
import { getMainWindow } from './index.js';
import { getWsUrl } from './api.js';

let globalWs: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export function setupSignaling() {
  ipcMain.handle('signaling:connect', async () => {
    connectSignaling();
  });
}

export function connectSignaling() {
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const token = getAccessToken();
  if (!token) return;

  const url = `${getWsUrl()}/api/v1/signaling/global`;
  globalWs = new WebSocket(url);

  globalWs.on('open', () => {
    console.log('Global Signaling WebSocket connected');
    getMainWindow()?.webContents.send('signaling:connected');
    
    globalWs?.send(JSON.stringify({
      type: 'signaling.authenticate',
      appToken: token,
    }));
  });

  globalWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'heartbeat.ping') {
         globalWs?.send(JSON.stringify({ type: 'heartbeat.pong', timestamp: Date.now() }));
         return;
      }
      
      if (msg.type === 'remoteSession.incoming') {
        getMainWindow()?.webContents.send('remoteSessions:incoming', msg.payload);
        return;
      }

      getMainWindow()?.webContents.send('signaling:message', msg);
    } catch(e) {}
  });

  globalWs.on('close', () => {
    console.log('Global Signaling WebSocket closed');
    getMainWindow()?.webContents.send('signaling:disconnected');
    reconnectTimer = setTimeout(connectSignaling, 5000);
  });

  globalWs.on('error', (err) => {
    console.error('Global Signaling WebSocket error', err.message);
  });
}

export function stopSignaling() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}
