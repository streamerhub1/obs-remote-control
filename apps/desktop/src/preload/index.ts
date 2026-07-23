import { contextBridge, ipcRenderer } from 'electron';

const API = {
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0', // Fallback version
  openExternalUrl: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    getKeys: () => ipcRenderer.invoke('auth:get-keys'),
    storeRefreshToken: (token: string) => ipcRenderer.invoke('auth:store-refresh-token', token),
    onCallback: (callback: (code: string) => void) => {
      ipcRenderer.on('auth:callback', (_, code) => callback(code));
      return () => ipcRenderer.removeAllListeners('auth:callback');
    }
  },
  obs: {
    getStatus: () => ipcRenderer.invoke('obs:getStatus'),
    connect: (config: any) => ipcRenderer.invoke('obs:connect', config),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getSnapshot: () => ipcRenderer.invoke('obs:getSnapshot'),
    execute: (command: any) => ipcRenderer.invoke('obs:execute', command),
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', API);
  } catch (error) {
    console.error(error);
  }
} else {
    window.electron = API;
}
