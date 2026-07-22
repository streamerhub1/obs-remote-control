import { app, BrowserWindow } from 'electron';
import path from 'path';

export function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  return mainWindow;
}

if (app) {
  app.whenReady().then(() => {
    createWindow();
  });
}
