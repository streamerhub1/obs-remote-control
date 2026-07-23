import OBSWebSocket from 'obs-websocket-js';
import {
  ObsConnectionConfig,
  ObsConnectionState,
  ObsSnapshot,
  ObsCommand,
  ObsCommandResult,
} from '@obs-remote/obs-contracts';

export class ObsAdapter {
  private obs: OBSWebSocket;
  private state: ObsConnectionState = 'disconnected';
  private revision: number = 0;

  constructor() {
    this.obs = new OBSWebSocket();
    
    this.obs.on('ConnectionClosed', () => {
      this.state = 'disconnected';
    });
    
    this.obs.on('ConnectionError', () => {
      this.state = 'error';
    });
  }

  public getState(): ObsConnectionState {
    return this.state;
  }

  public async connect(config: ObsConnectionConfig): Promise<boolean> {
    try {
      this.state = 'connecting';
      const url = `ws://${config.host}:${config.port}`;
      await this.obs.connect(url, config.password);
      this.state = 'connected';
      return true;
    } catch (e) {
      this.state = 'error';
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    await this.obs.disconnect();
    this.state = 'disconnected';
  }

  public async getSnapshot(): Promise<ObsSnapshot | null> {
    if (this.state !== 'connected') return null;
    
    try {
      const version = await this.obs.call('GetVersion');
      const scenes = await this.obs.call('GetSceneList');
      const studioMode = await this.obs.call('GetStudioModeEnabled');
      const streamStatus = await this.obs.call('GetStreamStatus');
      const recordStatus = await this.obs.call('GetRecordStatus');

      this.revision++;

      return {
        revision: this.revision,
        obsVersion: version.obsVersion,
        websocketVersion: version.obsWebSocketVersion,
        currentProgramScene: scenes.currentProgramSceneName,
        currentPreviewScene: scenes.currentPreviewSceneName,
        scenes: scenes.scenes.map((s: any) => s.sceneName),
        studioMode: studioMode.studioModeEnabled,
        streamStatus: {
          active: streamStatus.outputActive,
          reconnecting: streamStatus.outputReconnecting,
          timecode: streamStatus.outputTimecode,
        },
        recordStatus: {
          active: recordStatus.outputActive,
          paused: recordStatus.outputPaused,
          timecode: recordStatus.outputTimecode,
        },
      };
    } catch (e) {
      console.error('Failed to get snapshot', e);
      return null;
    }
  }

  public async executeCommand(command: ObsCommand): Promise<ObsCommandResult> {
    if (this.state !== 'connected') {
      return { success: false, error: 'Not connected' };
    }

    try {
      let data: any;
      switch (command.type) {
        case 'SetCurrentProgramScene':
          await this.obs.call('SetCurrentProgramScene', { sceneName: command.payload.sceneName });
          break;
        case 'SetInputMute':
          await this.obs.call('SetInputMute', { inputName: command.payload.inputName, inputMuted: command.payload.muted });
          break;
        case 'SetInputVolume':
          await this.obs.call('SetInputVolume', { inputName: command.payload.inputName, inputVolumeDb: command.payload.volumeDb });
          break;
        case 'StartStream':
          await this.obs.call('StartStream');
          break;
        case 'StopStream':
          await this.obs.call('StopStream');
          break;
        case 'StartRecord':
          await this.obs.call('StartRecord');
          break;
        case 'StopRecord':
          await this.obs.call('StopRecord');
          break;
        default:
          return { success: false, error: 'Unknown command' };
      }
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Command failed' };
    }
  }
}
