/// <reference types="vite/client" />

interface Window {
  desktop: {
    platform: string;
    appVersion: string;
    openExternalUrl: (url: string) => Promise<boolean>;
    auth: {
      login: () => Promise<void>;
      logout: () => Promise<void>;
      getState: () => Promise<{ authenticated: boolean }>;
      getProfile: () => Promise<any>;
      subscribe: (callback: (state: any) => void) => () => void;
    };
    obs: {
      getStatus: () => Promise<any>;
      connect: (config: any) => Promise<boolean>;
      disconnect: () => Promise<void>;
      getSnapshot: () => Promise<any>;
      execute: (command: any) => Promise<any>;
      subscribe: (callback: (event: any) => void) => () => void;
      saveSettings: (settings: any) => Promise<void>;
    };
  };
}
