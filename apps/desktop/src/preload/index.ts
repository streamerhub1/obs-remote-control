import { contextBridge, ipcRenderer } from 'electron';

const API = {
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0', // Fallback version
  openExternalUrl: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getState: () => ipcRenderer.invoke('auth:getState'),
    getProfile: () => ipcRenderer.invoke('auth:getProfile'),
    subscribe: (callback: (state: unknown) => void) => {
      ipcRenderer.on('auth:state-changed', (_, state) => callback(state));
      ipcRenderer.on('auth:error', (_, error) => callback({ error }));
      ipcRenderer.on('auth:loading', (_, loading) => callback({ loading }));
      return () => {
        ipcRenderer.removeAllListeners('auth:state-changed');
        ipcRenderer.removeAllListeners('auth:error');
        ipcRenderer.removeAllListeners('auth:loading');
      };
    }
  },
  signaling: {
    connect: () => ipcRenderer.invoke('signaling:connect'),
    send: (msg: any) => ipcRenderer.send('signaling:send', msg),
    subscribe: (callback: (msg: any) => void) => {
      const handler = (_event: any, msg: any) => callback(msg);
      ipcRenderer.on('signaling:message', handler);
      return () => {
        ipcRenderer.removeListener('signaling:message', handler);
      };
    },
    onConnected: (callback: () => void) => {
      ipcRenderer.on('signaling:connected', callback);
      return () => ipcRenderer.removeListener('signaling:connected', callback);
    },
    onDisconnected: (callback: () => void) => {
      ipcRenderer.on('signaling:disconnected', callback);
      return () => ipcRenderer.removeListener('signaling:disconnected', callback);
    }
  },
  obs: {
    getStatus: () => ipcRenderer.invoke('obs:getStatus'),
    connect: (config: unknown) => ipcRenderer.invoke('obs:connect', config),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getSnapshot: () => ipcRenderer.invoke('obs:getSnapshot'),
    execute: (command: unknown) => ipcRenderer.invoke('obs:execute', command),
    subscribe: (callback: (event: unknown) => void) => {
      ipcRenderer.on('obs:event', (_, event) => callback(event));
      return () => {
        ipcRenderer.removeAllListeners('obs:event');
      };
    },
    saveSettings: (settings: unknown) => ipcRenderer.invoke('obs:saveSettings', settings)
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('desktop', API);
  } catch (error) {
    console.error(error);
  }
} else {
    // @ts-ignore
    window.desktop = API;
}
