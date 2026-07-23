import { z } from 'zod';

// Connection
export const ObsConnectionConfigSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.number().default(4455),
  password: z.string().optional(),
});
export type ObsConnectionConfig = z.infer<typeof ObsConnectionConfigSchema>;

export const ObsConnectionStateSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
]);
export type ObsConnectionState = z.infer<typeof ObsConnectionStateSchema>;

// Detailed Snapshot
export const ObsSnapshotSchema = z.object({
  revision: z.number(),
  obsVersion: z.string(),
  websocketVersion: z.string(),
  currentProgramScene: z.string(),
  currentPreviewScene: z.string().nullable(),
  scenes: z.array(z.string()),
  sceneItems: z.record(z.string(), z.array(z.object({
    sceneItemId: z.number(),
    sourceName: z.string(),
    sceneItemEnabled: z.boolean(),
  }))),
  filters: z.record(z.string(), z.array(z.object({
    filterName: z.string(),
    filterEnabled: z.boolean(),
    filterKind: z.string(),
  }))),
  inputs: z.array(z.object({
    inputName: z.string(),
    inputKind: z.string(),
    unversionedInputKind: z.string(),
  })),
  audioMixer: z.record(z.string(), z.object({
    volumeDb: z.number(),
    volumeMul: z.number(),
    muted: z.boolean(),
  })),
  studioMode: z.boolean(),
  streamStatus: z.object({
    active: z.boolean(),
    reconnecting: z.boolean(),
    timecode: z.string(),
  }),
  recordStatus: z.object({
    active: z.boolean(),
    paused: z.boolean(),
    timecode: z.string(),
  }),
  virtualCameraStatus: z.boolean(),
});
export type ObsSnapshot = z.infer<typeof ObsSnapshotSchema>;

// Commands Discriminated Union
export const ObsCommandSetCurrentProgramSceneSchema = z.object({
  type: z.literal('scene.setCurrentProgram'),
  payload: z.object({ sceneName: z.string() }),
});

export const ObsCommandSetSceneItemEnabledSchema = z.object({
  type: z.literal('sceneItem.setEnabled'),
  payload: z.object({
    sceneName: z.string(),
    sceneItemId: z.number(),
    enabled: z.boolean(),
  }),
});

export const ObsCommandSetInputMuteSchema = z.object({
  type: z.literal('input.setMute'),
  payload: z.object({
    inputName: z.string(),
    muted: z.boolean(),
  }),
});

export const ObsCommandSetInputVolumeSchema = z.object({
  type: z.literal('input.setVolume'),
  payload: z.object({
    inputName: z.string(),
    volumeDb: z.number(),
  }),
});

export const ObsCommandStartStreamSchema = z.object({
  type: z.literal('stream.start'),
  payload: z.object({}).optional(),
});

export const ObsCommandStopStreamSchema = z.object({
  type: z.literal('stream.stop'),
  payload: z.object({}).optional(),
});

export const ObsCommandStartRecordSchema = z.object({
  type: z.literal('record.start'),
  payload: z.object({}).optional(),
});

export const ObsCommandStopRecordSchema = z.object({
  type: z.literal('record.stop'),
  payload: z.object({}).optional(),
});

export const ObsCommandSchema = z.discriminatedUnion('type', [
  ObsCommandSetCurrentProgramSceneSchema,
  ObsCommandSetSceneItemEnabledSchema,
  ObsCommandSetInputMuteSchema,
  ObsCommandSetInputVolumeSchema,
  ObsCommandStartStreamSchema,
  ObsCommandStopStreamSchema,
  ObsCommandStartRecordSchema,
  ObsCommandStopRecordSchema,
]);

export type ObsCommand = z.infer<typeof ObsCommandSchema>;

// Result
export const ObsCommandResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type ObsCommandResult = z.infer<typeof ObsCommandResultSchema>;

// Events Discriminated Union
export const ObsEventCurrentProgramSceneChangedSchema = z.object({
  type: z.literal('CurrentProgramSceneChanged'),
  eventData: z.object({ sceneName: z.string() }),
});

export const ObsEventSceneItemEnableStateChangedSchema = z.object({
  type: z.literal('SceneItemEnableStateChanged'),
  eventData: z.object({
    sceneName: z.string(),
    sceneItemId: z.number(),
    sceneItemEnabled: z.boolean(),
  }),
});

export const ObsEventInputMuteStateChangedSchema = z.object({
  type: z.literal('InputMuteStateChanged'),
  eventData: z.object({
    inputName: z.string(),
    inputMuted: z.boolean(),
  }),
});

export const ObsEventInputVolumeChangedSchema = z.object({
  type: z.literal('InputVolumeChanged'),
  eventData: z.object({
    inputName: z.string(),
    inputVolumeDb: z.number(),
    inputVolumeMul: z.number(),
  }),
});

export const ObsEventStreamStateChangedSchema = z.object({
  type: z.literal('StreamStateChanged'),
  eventData: z.object({
    outputActive: z.boolean(),
    outputState: z.string(),
  }),
});

export const ObsEventRecordStateChangedSchema = z.object({
  type: z.literal('RecordStateChanged'),
  eventData: z.object({
    outputActive: z.boolean(),
    outputState: z.string(),
  }),
});

export const ObsEventSchema = z.discriminatedUnion('type', [
  ObsEventCurrentProgramSceneChangedSchema,
  ObsEventSceneItemEnableStateChangedSchema,
  ObsEventInputMuteStateChangedSchema,
  ObsEventInputVolumeChangedSchema,
  ObsEventStreamStateChangedSchema,
  ObsEventRecordStateChangedSchema,
]);

export type ObsEvent = z.infer<typeof ObsEventSchema>;
