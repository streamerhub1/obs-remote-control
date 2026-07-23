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
  };
}
