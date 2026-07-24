import type { DesktopAPI } from '../preload';

declare global {
  interface Window {
    desktop: DesktopAPI;
  }
}
export {};
