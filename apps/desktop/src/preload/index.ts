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
  },
  api: {
    getWsUrl: () => ipcRenderer.invoke('api:getWsUrl'),
    feed: {
      list: () => ipcRenderer.invoke('api:feed:list'),
      create: (data: unknown) => ipcRenderer.invoke('api:feed:create', data),
      like: (id: string) => ipcRenderer.invoke('api:feed:like', id)
    },
    collabs: {
      list: () => ipcRenderer.invoke('api:collabs:list'),
      create: (data: unknown) => ipcRenderer.invoke('api:collabs:create', data),
      apply: (id: string, message?: string) => ipcRenderer.invoke('api:collabs:apply', id, message),
      join: (id: string) => ipcRenderer.invoke('api:collabs:join', id)
    },
    calendar: {
      list: (start?: string, end?: string) => ipcRenderer.invoke('api:calendar:list', start, end),
      create: (data: unknown) => ipcRenderer.invoke('api:calendar:create', data),
      update: (id: string, data: unknown) => ipcRenderer.invoke('api:calendar:update', id, data),
      delete: (id: string) => ipcRenderer.invoke('api:calendar:delete', id)
    },
    profile: {
      getMe: () => ipcRenderer.invoke('api:profile:getMe'),
      updateMe: (data: unknown) => ipcRenderer.invoke('api:profile:updateMe', data)
    },
    notifications: {
      list: () => ipcRenderer.invoke('api:notifications:list'),
      markAllRead: () => ipcRenderer.invoke('api:notifications:markAllRead'),
      markRead: (id: string) => ipcRenderer.invoke('api:notifications:markRead', id)
    },
    relationships: {
      list: () => ipcRenderer.invoke('api:relationships:list'),
      invite: (data: unknown) => ipcRenderer.invoke('api:relationships:invite', data),
      respond: (id: string, data: unknown) => ipcRenderer.invoke('api:relationships:respond', id, data),
      revoke: (id: string) => ipcRenderer.invoke('api:relationships:revoke', id),
      getPermissions: (id: string) => ipcRenderer.invoke('api:relationships:getPermissions', id),
      setPermissions: (id: string, data: unknown) => ipcRenderer.invoke('api:relationships:setPermissions', id, data)
    },
    remoteSessions: {
      create: (data: unknown) => ipcRenderer.invoke('api:remoteSessions:create', data)
    }
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
