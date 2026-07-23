import { z } from 'zod';
import { ObsCommandSchema, ObsSnapshotSchema, ObsEventSchema } from '@obs-remote/obs-contracts';

const BasePayloadSchema = z.object({});

const HandshakeHelloSchema = z.object({
  type: z.literal('handshake.hello'),
  payload: z.object({
    appVersion: z.string(),
    deviceId: z.string(),
  }),
});

const HandshakeChallengeSchema = z.object({
  type: z.literal('handshake.challenge'),
  payload: z.object({
    challenge: z.string(),
  }),
});

const HandshakeProofSchema = z.object({
  type: z.literal('handshake.proof'),
  payload: z.object({
    proof: z.string(),
  }),
});

const HandshakeAcceptedSchema = z.object({
  type: z.literal('handshake.accepted'),
  payload: z.object({
    permissionsVersion: z.string(),
  }),
});

const StateSnapshotSchema = z.object({
  type: z.literal('state.snapshot'),
  payload: z.object({
    revision: z.number(),
    snapshot: ObsSnapshotSchema,
  }),
});

const StatePatchSchema = z.object({
  type: z.literal('state.patch'),
  payload: z.object({
    revision: z.number(),
    event: ObsEventSchema,
  }),
});

const StateResyncRequestSchema = z.object({
  type: z.literal('state.resyncRequest'),
  payload: z.object({
    lastKnownRevision: z.number(),
  }),
});

const CommandRequestSchema = z.object({
  type: z.literal('command.request'),
  payload: z.object({
    commandId: z.string(),
    command: ObsCommandSchema,
    expectedRevision: z.number().optional(),
  }),
});

const CommandResultSchema = z.object({
  type: z.literal('command.result'),
  payload: z.object({
    commandId: z.string(),
    success: z.boolean(),
    result: z.unknown().optional(), // Obs return data can vary, but we don't use `any`
    error: z.object({
      code: z.string(),
      message: z.string(),
    }).optional(),
    revision: z.number().optional(),
  }),
});

const HeartbeatPingSchema = z.object({
  type: z.literal('heartbeat.ping'),
  payload: z.object({
    timestamp: z.number(),
  }),
});

const HeartbeatPongSchema = z.object({
  type: z.literal('heartbeat.pong'),
  payload: z.object({
    timestamp: z.number(),
  }),
});

const PermissionsUpdatedSchema = z.object({
  type: z.literal('permissions.updated'),
  payload: z.object({
    permissionsVersion: z.string(),
  }),
});

const SessionCloseSchema = z.object({
  type: z.literal('session.close'),
  payload: z.object({
    reason: z.string(),
  }),
});

const ErrorSchema = z.object({
  type: z.literal('error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const P2PPayloadSchema = z.discriminatedUnion('type', [
  HandshakeHelloSchema,
  HandshakeChallengeSchema,
  HandshakeProofSchema,
  HandshakeAcceptedSchema,
  StateSnapshotSchema,
  StatePatchSchema,
  StateResyncRequestSchema,
  CommandRequestSchema,
  CommandResultSchema,
  HeartbeatPingSchema,
  HeartbeatPongSchema,
  PermissionsUpdatedSchema,
  SessionCloseSchema,
  ErrorSchema,
]);

export type P2PPayload = z.infer<typeof P2PPayloadSchema>;

export const P2PEnvelopeSchema = z.object({
  protocolVersion: z.literal('1.0'),
  sessionId: z.string(),
  messageId: z.string(),
  sequence: z.number(),
  sentAt: z.number(),
  type: P2PPayloadSchema.shape.type,
  payload: P2PPayloadSchema.shape.payload,
}); // Note: This doesn't strictly tie `type` to `payload` shape in Zod easily without intersection/union on the envelope.
// Let's do it properly as a discriminated union on the envelope level.

export const P2PMessageSchema = z.intersection(
  z.object({
    protocolVersion: z.literal('1.0'),
    sessionId: z.string(),
    messageId: z.string(),
    sequence: z.number(),
    sentAt: z.number(),
  }),
  P2PPayloadSchema
);

export type P2PMessage = z.infer<typeof P2PMessageSchema>;

export function createP2PMessage<T extends P2PPayload['type']>(
  sessionId: string,
  sequence: number,
  type: T,
  payload: Extract<P2PPayload, { type: T }>['payload']
): P2PMessage {
  return {
    protocolVersion: '1.0',
    sessionId,
    messageId: crypto.randomUUID(),
    sequence,
    sentAt: Date.now(),
    type,
    payload,
  } as P2PMessage;
}
