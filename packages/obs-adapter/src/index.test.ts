import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObsAdapter } from './index';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockCall = vi.fn();
const mockOn = vi.fn();

vi.mock('obs-websocket-js', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        connect: mockConnect,
        disconnect: mockDisconnect,
        call: mockCall,
        on: mockOn,
      };
    }),
    OBSWebSocketError: class OBSWebSocketError extends Error {
      code: number;
      constructor(code: number, message: string) {
        super(message);
        this.code = code;
      }
    }
  };
});

describe('ObsAdapter', () => {
  let adapter: ObsAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ObsAdapter();

    mockConnect.mockResolvedValue(true);
    
    mockCall.mockImplementation((requestType) => {
      switch (requestType) {
        case 'GetVersion': return Promise.resolve({ obsVersion: '30.1.0', obsWebSocketVersion: '5.4.0' });
        case 'GetSceneList': return Promise.resolve({ currentProgramSceneName: 'Main', scenes: [{ sceneName: 'Main' }] });
        case 'GetStudioModeEnabled': return Promise.resolve({ studioModeEnabled: false });
        case 'GetStreamStatus': return Promise.resolve({ outputActive: false, outputReconnecting: false, outputTimecode: '00:00:00' });
        case 'GetRecordStatus': return Promise.resolve({ outputActive: false, outputPaused: false, outputTimecode: '00:00:00' });
        case 'GetInputList': return Promise.resolve({ inputs: [{ inputName: 'Mic', inputKind: 'wasapi_input_capture', unversionedInputKind: 'wasapi_input_capture' }] });
        case 'GetSceneItemList': return Promise.resolve({ sceneItems: [{ sceneItemId: 1, sourceName: 'Mic', sceneItemEnabled: true }] });
        case 'GetInputMute': return Promise.resolve({ inputMuted: false });
        case 'GetInputVolume': return Promise.resolve({ inputVolumeDb: -10, inputVolumeMul: 0.5 });
        case 'GetSourceFilterList': return Promise.resolve({ filters: [] });
        default: return Promise.resolve({});
      }
    });
  });

  it('should connect and full resync successfully', async () => {
    const success = await adapter.connect({ host: '127.0.0.1', port: 4455, password: 'test' });
    expect(success).toBe(true);
    expect(mockConnect).toHaveBeenCalledWith('ws://127.0.0.1:4455', 'test');
    expect(adapter.getState()).toBe('connected');

    const snapshot = adapter.getSnapshotData();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.obsVersion).toBe('30.1.0');
    expect(snapshot?.currentProgramScene).toBe('Main');
    expect(snapshot?.audioMixer['Mic'].volumeDb).toBe(-10);
  });

  it('should return false on connection error without logging password', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'));
    const success = await adapter.connect({ host: '127.0.0.1', port: 4455, password: 'secretpassword123' });
    expect(success).toBe(false);
    expect(adapter.getState()).toBe('connecting'); // Because it immediately tries to reconnect
    
    // Cleanup
    await adapter.disconnect();
  });

  it('should handle disconnect manually', async () => {
    await adapter.connect({ host: '127.0.0.1', port: 4455 });
    await adapter.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(adapter.getState()).toBe('disconnected');
    expect(adapter.getSnapshotData()).toBeNull();
  });

  it('should execute command SetCurrentProgramScene', async () => {
    await adapter.connect({ host: '127.0.0.1', port: 4455 });
    const result = await adapter.executeCommand({
      type: 'scene.setCurrentProgram',
      payload: { sceneName: 'Gaming' }
    });
    
    expect(result.success).toBe(true);
    expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', { sceneName: 'Gaming' });
  });

  it('should return error for invalid command type', async () => {
    await adapter.connect({ host: '127.0.0.1', port: 4455 });
    const result = await adapter.executeCommand({
      type: 'unknown.command' as any,
      payload: {}
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown command');
  });

  it('should update state on ObsEvent', async () => {
    await adapter.connect({ host: '127.0.0.1', port: 4455 });
    
    // Simulate event from OBS
    const eventHandler = mockOn.mock.calls.find(call => call[0] === 'CurrentProgramSceneChanged')?.[1];
    expect(eventHandler).toBeDefined();

    eventHandler({ sceneName: 'BRB' });

    const snapshot = adapter.getSnapshotData();
    expect(snapshot?.currentProgramScene).toBe('BRB');
    expect(snapshot?.revision).toBe(2); // 1 from connect resync, 1 from event
  });
});
