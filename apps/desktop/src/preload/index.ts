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
    getToken: () => ipcRenderer.invoke('auth:getToken'),
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
    subscribe: (callback: (msg: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, msg: unknown) => callback(msg);
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
  remoteSessions: {
    connect: (authorizationToken: string) => ipcRenderer.invoke('remoteSessions:connect', authorizationToken),
    disconnect: (remoteSessionId: string) => ipcRenderer.invoke('remoteSessions:disconnect', remoteSessionId),
    sendSignal: (remoteSessionId: string, msg: unknown) => ipcRenderer.send('remoteSessions:sendSignal', remoteSessionId, msg),
    signChallenge: (remoteSessionId: string, challengeHex: string) => ipcRenderer.invoke('remoteSessions:signChallenge', remoteSessionId, challengeHex),
    verifyProof: (remoteSessionId: string, challengeHex: string, signatureHex: string, peerPublicKeyPem: string) => ipcRenderer.invoke('remoteSessions:verifyProof', remoteSessionId, challengeHex, signatureHex, peerPublicKeyPem),
    executeCommand: (remoteSessionId: string, command: unknown) => ipcRenderer.invoke('remoteSessions:executeCommand', remoteSessionId, command),
    onMessage: (remoteSessionId: string, callback: (msg: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, msg: unknown) => callback(msg);
      ipcRenderer.on(`remoteSessions:message:${remoteSessionId}`, handler);
      return () => ipcRenderer.removeListener(`remoteSessions:message:${remoteSessionId}`, handler);
    },
    onDisconnected: (remoteSessionId: string, callback: () => void) => {
      ipcRenderer.on(`remoteSessions:disconnected:${remoteSessionId}`, callback);
      return () => ipcRenderer.removeListener(`remoteSessions:disconnected:${remoteSessionId}`, callback);
    },
    onIncoming: (callback: (session: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, session: unknown) => callback(session);
      ipcRenderer.on('remoteSessions:incoming', handler);
      return () => ipcRenderer.removeListener('remoteSessions:incoming', handler);
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
