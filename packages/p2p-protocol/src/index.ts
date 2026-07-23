import { z } from 'zod';
import { ObsCommandSchema, ObsSnapshotSchema, ObsEventSchema } from '@obs-remote/obs-contracts';

// The P2P DataChannel Envelope ensures every message has a type, requestId (for acks), and payload
export const P2PEnvelopeSchema = z.object({
  type: z.enum(['request', 'response', 'event']),
  channel: z.enum(['control', 'events', 'preview', 'files']),
  requestId: z.string().optional(),
  payload: z.any(),
});
export type P2PEnvelope = z.infer<typeof P2PEnvelopeSchema>;

// Control Channel Requests (Moderator -> Streamer)
export const P2PControlRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('getSnapshot'),
  }),
  z.object({
    action: z.literal('executeCommand'),
    command: ObsCommandSchema,
  }),
]);
export type P2PControlRequest = z.infer<typeof P2PControlRequestSchema>;

// Control Channel Responses (Streamer -> Moderator)
export const P2PControlResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(), // Snapshot or CommandResult
  error: z.string().optional(),
});
export type P2PControlResponse = z.infer<typeof P2PControlResponseSchema>;

// Events Channel (Streamer -> Moderator)
export const P2PEventSchema = z.object({
  event: ObsEventSchema,
});

// Wrap payloads into Envelope
export function createRequest(channel: P2PEnvelope['channel'], payload: any, requestId?: string): P2PEnvelope {
  return { type: 'request', channel, requestId: requestId || crypto.randomUUID(), payload };
}

export function createResponse(channel: P2PEnvelope['channel'], requestId: string, payload: any): P2PEnvelope {
  return { type: 'response', channel, requestId, payload };
}

export function createEvent(channel: P2PEnvelope['channel'], payload: any): P2PEnvelope {
  return { type: 'event', channel, payload };
}
