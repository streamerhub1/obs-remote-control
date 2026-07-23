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

  ipcMain.on('signaling:send', (_, msg: unknown) => {
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

  // Don't pass token in URL
  const url = `ws://localhost:3000/api/v1/signaling`;
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Signaling WebSocket connected');
    getMainWindow()?.webContents.send('signaling:connected');
    
    // Send authenticate message
    ws?.send(JSON.stringify({
      type: 'signaling.authenticate',
      appToken: token,
      // authorizationToken will be handled by the renderer which creates specific sessions
      // Wait, if renderer initiates, how does renderer authenticate?
      // Actually, renderer calls `signaling.send` for `signaling.authenticate` right?
      // Yes, renderer can send `signaling.authenticate` directly.
      // But the main process also connects to the WebSocket globally?
      // No, we can just send the appToken here for presence.
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'heartbeat.ping') {
         ws?.send(JSON.stringify({ type: 'heartbeat.pong', timestamp: Date.now() }));
         return;
      }
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
