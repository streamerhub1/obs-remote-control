/// <reference types="vite/client" />

import { ObsCommand, ObsCommandResult, ObsConnectionConfig, ObsConnectionState, ObsEvent, ObsSnapshot } from '@obs-remote/obs-contracts';

interface Window {
  desktop: {
    platform: string;
    appVersion: string;
    openExternalUrl: (url: string) => Promise<boolean>;
    auth: {
      login: () => Promise<void>;
      logout: () => Promise<void>;
      getState: () => Promise<{ loading: boolean; authenticated: boolean; error?: string }>;
      getProfile: () => Promise<any>;
      subscribe: (callback: (state: { loading?: boolean; authenticated?: boolean; error?: string }) => void) => () => void;
    };
    signaling: {
      connect: () => Promise<void>;
      send: (msg: unknown) => void;
      subscribe: (callback: (msg: unknown) => void) => () => void;
      onConnected: (callback: () => void) => () => void;
      onDisconnected: (callback: () => void) => () => void;
    };
    obs: {
      getStatus: () => Promise<ObsConnectionState>;
      connect: (config: ObsConnectionConfig) => Promise<boolean>;
      disconnect: () => Promise<void>;
      getSnapshot: () => Promise<ObsSnapshot | null>;
      execute: (command: ObsCommand) => Promise<ObsCommandResult>;
      subscribe: (callback: (event: ObsEvent) => void) => () => void;
      saveSettings: (settings: ObsConnectionConfig) => Promise<void>;
    };
  };
}
