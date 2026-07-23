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
    subscribe: (callback: (state: any) => void) => {
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
  obs: {
    getStatus: () => ipcRenderer.invoke('obs:getStatus'),
    connect: (config: any) => ipcRenderer.invoke('obs:connect', config),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getSnapshot: () => ipcRenderer.invoke('obs:getSnapshot'),
    execute: (command: any) => ipcRenderer.invoke('obs:execute', command),
    subscribe: (callback: (event: any) => void) => {
      ipcRenderer.on('obs:event', (_, event) => callback(event));
      return () => ipcRenderer.removeAllListeners('obs:event');
    },
    saveSettings: (settings: any) => ipcRenderer.invoke('obs:saveSettings', settings)
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
