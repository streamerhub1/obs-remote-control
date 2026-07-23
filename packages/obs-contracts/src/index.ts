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

// Basic State Snapshot
export const ObsSnapshotSchema = z.object({
  revision: z.number(),
  obsVersion: z.string(),
  websocketVersion: z.string(),
  currentProgramScene: z.string(),
  currentPreviewScene: z.string().optional(),
  scenes: z.array(z.string()), // simplified for now
  studioMode: z.boolean(),
  streamStatus: z.object({
    active: z.boolean(),
    reconnecting: z.boolean(),
    timecode: z.string().optional(),
  }).optional(),
  recordStatus: z.object({
    active: z.boolean(),
    paused: z.boolean(),
    timecode: z.string().optional(),
  }).optional(),
  audioMixer: z.array(z.object({
    sourceName: z.string(),
    volume: z.number(),
    muted: z.boolean(),
  })).optional(),
});
export type ObsSnapshot = z.infer<typeof ObsSnapshotSchema>;

// Commands
export const ObsCommandTypeSchema = z.enum([
  'SetCurrentProgramScene',
  'SetInputMute',
  'SetInputVolume',
  'StartStream',
  'StopStream',
  'StartRecord',
  'StopRecord',
]);

export const ObsCommandSchema = z.object({
  type: ObsCommandTypeSchema,
  payload: z.record(z.any()), // Specific commands will be validated by the adapter
});
export type ObsCommand = z.infer<typeof ObsCommandSchema>;

export const ObsCommandResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: z.any().optional(),
});
export type ObsCommandResult = z.infer<typeof ObsCommandResultSchema>;

export const ObsEventSchema = z.object({
  type: z.string(),
  eventData: z.any(),
});
export type ObsEvent = z.infer<typeof ObsEventSchema>;
