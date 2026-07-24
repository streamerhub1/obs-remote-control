import OBSWebSocket, { OBSWebSocketError } from 'obs-websocket-js';
import {
  ObsConnectionConfig,
  ObsConnectionState,
  ObsSnapshot,
  ObsCommand,
  ObsCommandResult,
  ObsEvent,
} from '@obs-remote/obs-contracts';

export class ObsAdapter {
  private obs: OBSWebSocket;
  private state: ObsConnectionState = 'disconnected';
  private snapshot: ObsSnapshot | null = null;
  private revision: number = 0;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private config: ObsConnectionConfig | null = null;
  private shouldReconnect = false;

  private listeners: Array<
    (
      state: ObsConnectionState,
      snapshot: ObsSnapshot | null,
      event?: ObsEvent,
    ) => void
  > = [];

  constructor() {
    this.obs = new OBSWebSocket();

    this.obs.on('ConnectionClosed', () => {
      this.handleDisconnect();
    });

    this.obs.on('ConnectionError', (err) => {
      console.error('OBS Connection Error', err.message); // hide full err to avoid password leak
      this.handleDisconnect();
    });

    // Handle OBS Events for normalize state
    this.obs.on('CurrentProgramSceneChanged', (data) =>
      this.handleEvent({ type: 'CurrentProgramSceneChanged', eventData: data }),
    );
    this.obs.on('SceneItemEnableStateChanged', (data) =>
      this.handleEvent({
        type: 'SceneItemEnableStateChanged',
        eventData: data,
      }),
    );
    this.obs.on('InputMuteStateChanged', (data) =>
      this.handleEvent({ type: 'InputMuteStateChanged', eventData: data }),
    );
    this.obs.on('InputVolumeChanged', (data) =>
      this.handleEvent({ type: 'InputVolumeChanged', eventData: data }),
    );
    this.obs.on('StreamStateChanged', (data) =>
      this.handleEvent({ type: 'StreamStateChanged', eventData: data }),
    );
    this.obs.on('RecordStateChanged', (data) =>
      this.handleEvent({ type: 'RecordStateChanged', eventData: data }),
    );
  }

  public subscribe(
    callback: (
      state: ObsConnectionState,
      snapshot: ObsSnapshot | null,
      event?: ObsEvent,
    ) => void,
  ) {
    this.listeners.push(callback);
    callback(this.state, this.snapshot);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(event?: ObsEvent) {
    this.listeners.forEach((cb) => cb(this.state, this.snapshot, event));
  }

  private changeState(newState: ObsConnectionState) {
    this.state = newState;
    this.notify();
  }

  private handleDisconnect() {
    if (this.state !== 'disconnected') {
      this.changeState('disconnected');
    }
    this.snapshot = null;

    if (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;
      const backoff = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
        30000,
      );
      this.changeState('connecting');
      this.reconnectTimeout = setTimeout(() => {
        if (this.config) {
          this.connect(this.config).catch(() => {});
        }
      }, backoff);
    }
  }

  public getState(): ObsConnectionState {
    return this.state;
  }

  public getSnapshotData(): ObsSnapshot | null {
    return this.snapshot;
  }

  public async connect(config: ObsConnectionConfig): Promise<boolean> {
    this.config = config;
    this.shouldReconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      this.changeState('connecting');
      const url = `ws://${config.host}:${config.port}`;

      const connectPromise = this.obs.connect(url, config.password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000),
      );

      await Promise.race([connectPromise, timeoutPromise]);

      this.reconnectAttempts = 0;
      this.changeState('connected');

      await this.fullResync();

      return true;
    } catch (e: unknown) {
      this.changeState('error');
      this.handleDisconnect();
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    try {
      await this.obs.disconnect();
    } catch (e) {}
    this.changeState('disconnected');
    this.snapshot = null;
  }

  private async fullResync() {
    if (this.state !== 'connected') return;

    try {
      const version = await this.obs.call('GetVersion');
      const scenes = await this.obs.call('GetSceneList');
      const studioMode = await this.obs.call('GetStudioModeEnabled');
      const streamStatus = await this.obs.call('GetStreamStatus');
      const recordStatus = await this.obs.call('GetRecordStatus');
      const inputsList = await this.obs.call('GetInputList');

      const sceneItems: Record<
        string,
        { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean }[]
      > = {};
      for (const scene of scenes.scenes as { sceneName: string }[]) {
        const sceneName = scene.sceneName;
        const items = await this.obs.call('GetSceneItemList', { sceneName });
        sceneItems[sceneName] = (
          items.sceneItems as {
            sceneItemId: number;
            sourceName: string;
            sceneItemEnabled: boolean;
          }[]
        ).map((i) => ({
          sceneItemId: i.sceneItemId,
          sourceName: i.sourceName,
          sceneItemEnabled: i.sceneItemEnabled,
        }));
      }

      const audioMixer: Record<
        string,
        { volumeDb: number; volumeMul: number; muted: boolean }
      > = {};
      const filters: Record<
        string,
        { filterName: string; filterEnabled: boolean; filterKind: string }[]
      > = {};

      for (const input of inputsList.inputs as { inputName: string }[]) {
        const inputName = input.inputName;
        const mute = await this.obs.call('GetInputMute', { inputName });
        const volume = await this.obs.call('GetInputVolume', { inputName });
        audioMixer[inputName] = {
          volumeDb: volume.inputVolumeDb,
          volumeMul: volume.inputVolumeMul,
          muted: mute.inputMuted,
        };

        try {
          const filterList = await this.obs.call('GetSourceFilterList', {
            sourceName: inputName,
          });
          filters[inputName] = (
            filterList.filters as {
              filterName: string;
              filterEnabled: boolean;
              filterKind: string;
            }[]
          ).map((f) => ({
            filterName: f.filterName,
            filterEnabled: f.filterEnabled,
            filterKind: f.filterKind,
          }));
        } catch (e) {
          filters[inputName] = [];
        }
      }

      this.revision++;

      this.snapshot = {
        revision: this.revision,
        obsVersion: version.obsVersion,
        websocketVersion: version.obsWebSocketVersion,
        currentProgramScene: scenes.currentProgramSceneName,
        currentPreviewScene: scenes.currentPreviewSceneName || null,
        scenes: (scenes.scenes as { sceneName: string }[]).map(
          (s) => s.sceneName,
        ),
        sceneItems,
        filters,
        inputs: (
          inputsList.inputs as {
            inputName: string;
            inputKind: string;
            unversionedInputKind: string;
          }[]
        ).map((i) => ({
          inputName: i.inputName,
          inputKind: i.inputKind,
          unversionedInputKind: i.unversionedInputKind,
        })),
        audioMixer,
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
        virtualCameraStatus: false, // simplified for now
      };

      this.notify();
    } catch (e) {
      console.error('Failed full resync', e); // Do not log password
      this.snapshot = null;
      this.notify();
    }
  }

  private handleEvent(event: ObsEvent) {
    if (!this.snapshot) return;

    this.revision++;
    this.snapshot.revision = this.revision;

    switch (event.type) {
      case 'CurrentProgramSceneChanged':
        this.snapshot.currentProgramScene = event.eventData.sceneName;
        break;
      case 'SceneItemEnableStateChanged':
        const { sceneName, sceneItemId, sceneItemEnabled } = event.eventData;
        if (this.snapshot.sceneItems[sceneName]) {
          const item = this.snapshot.sceneItems[sceneName].find(
            (i) => i.sceneItemId === sceneItemId,
          );
          if (item) item.sceneItemEnabled = sceneItemEnabled;
        }
        break;
      case 'InputMuteStateChanged':
        if (this.snapshot.audioMixer[event.eventData.inputName]) {
          this.snapshot.audioMixer[event.eventData.inputName].muted =
            event.eventData.inputMuted;
        }
        break;
      case 'InputVolumeChanged':
        if (this.snapshot.audioMixer[event.eventData.inputName]) {
          this.snapshot.audioMixer[event.eventData.inputName].volumeDb =
            event.eventData.inputVolumeDb;
          this.snapshot.audioMixer[event.eventData.inputName].volumeMul =
            event.eventData.inputVolumeMul;
        }
        break;
      case 'StreamStateChanged':
        this.snapshot.streamStatus.active = event.eventData.outputActive;
        break;
      case 'RecordStateChanged':
        this.snapshot.recordStatus.active = event.eventData.outputActive;
        break;
    }

    this.notify(event);
  }

  public async call(requestType: string, requestData?: any): Promise<any> {
    if (this.state !== 'connected') throw new Error('Not connected');
    return await this.obs.call(requestType as any, requestData);
  }

  public async executeCommand(command: ObsCommand): Promise<ObsCommandResult> {
    if (this.state !== 'connected') {
      return { success: false, error: 'Not connected' };
    }

    try {
      switch (command.type) {
        case 'scene.setCurrentProgram':
          await this.obs.call('SetCurrentProgramScene', {
            sceneName: command.payload.sceneName,
          });
          break;
        case 'sceneItem.setEnabled':
          await this.obs.call('SetSceneItemEnabled', {
            sceneName: command.payload.sceneName,
            sceneItemId: command.payload.sceneItemId,
            sceneItemEnabled: command.payload.enabled,
          });
          break;
        case 'input.setMute':
          await this.obs.call('SetInputMute', {
            inputName: command.payload.inputName,
            inputMuted: command.payload.muted,
          });
          break;
        case 'input.setVolume':
          await this.obs.call('SetInputVolume', {
            inputName: command.payload.inputName,
            inputVolumeDb: command.payload.volumeDb,
          });
          break;
        case 'stream.start':
          await this.obs.call('StartStream');
          break;
        case 'stream.stop':
          await this.obs.call('StopStream');
          break;
        case 'record.start':
          await this.obs.call('StartRecord');
          break;
        case 'record.stop':
          await this.obs.call('StopRecord');
          break;
        default:
          return { success: false, error: 'Unknown command' };
      }
      return { success: true };
    } catch (e: unknown) {
      if (e instanceof OBSWebSocketError) {
        return { success: false, error: `OBS Error: ${e.code}` };
      }
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Command failed',
      };
    }
  }
}
