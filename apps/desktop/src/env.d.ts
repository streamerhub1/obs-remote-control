/// <reference types="vite/client" />

interface Window {
  electron: {
    platform: string;
    appVersion: string;
    openExternalUrl: (url: string) => Promise<boolean>;
  };
}
