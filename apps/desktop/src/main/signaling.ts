import { ipcMain } from 'electron';
import WebSocket from 'ws';
import { getAccessToken } from './auth.js';
import { getMainWindow } from './index.js';

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export function setupSignaling() {
  ipcMain.handle('signaling:connect', async () => {
    connectSignaling();
  });

  ipcMain.on('signaling:send', (_, msg: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
}

export function connectSignaling() {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const token = getAccessToken();
  if (!token) return;

  const url = `ws://localhost:3000/api/v1/signaling?token=${token}`;
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Signaling WebSocket connected');
    getMainWindow()?.webContents.send('signaling:connected');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong') return;
      getMainWindow()?.webContents.send('signaling:message', msg);
    } catch(e) {}
  });

  ws.on('close', () => {
    console.log('Signaling WebSocket closed');
    getMainWindow()?.webContents.send('signaling:disconnected');
    reconnectTimer = setTimeout(connectSignaling, 5000);
  });

  ws.on('error', (err) => {
    console.error('Signaling WebSocket error', err.message);
  });
}

export function stopSignaling() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}
