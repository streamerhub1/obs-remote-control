/// <reference types="vite/client" />

interface Window {
  electron: {
    platform: string;
    appVersion: string;
    openExternalUrl: (url: string) => Promise<boolean>;
    auth: {
      login: () => Promise<void>;
      getKeys: () => Promise<string>;
      storeRefreshToken: (token: string) => Promise<boolean>;
      onCallback: (callback: (code: string) => void) => () => void;
    };
    obs: {
      getStatus: () => Promise<any>;
      connect: (config: any) => Promise<boolean>;
      disconnect: () => Promise<void>;
      getSnapshot: () => Promise<any>;
      execute: (command: any) => Promise<any>;
    };
  };
}
