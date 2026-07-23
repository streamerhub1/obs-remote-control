import { ipcMain } from 'electron';
import { ObsAdapter } from '@obs-remote/obs-adapter';
import { ObsConnectionConfig, ObsCommand } from '@obs-remote/obs-contracts';

const obs = new ObsAdapter();

export function setupObsHandlers() {
  ipcMain.handle('obs:getStatus', () => {
    return obs.getState();
  });

  ipcMain.handle('obs:connect', async (_, config: ObsConnectionConfig) => {
    return await obs.connect(config);
  });

  ipcMain.handle('obs:disconnect', async () => {
    await obs.disconnect();
    return true;
  });

  ipcMain.handle('obs:getSnapshot', async () => {
    return await obs.getSnapshot();
  });

  ipcMain.handle('obs:execute', async (_, command: ObsCommand) => {
    return await obs.executeCommand(command);
  });
}
