import { contextBridge, ipcRenderer } from 'electron';

const API = {
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0', // Fallback version
  openExternalUrl: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
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
