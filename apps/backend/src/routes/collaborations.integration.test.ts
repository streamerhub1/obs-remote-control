import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { collaborationsRoutes } from './collaborations.js';
import { initDb, getDb } from '../db.js';
import {
  users,
  collaborations,
  collaborationParticipants,
  calendarEvents,
} from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Collaborations API Integration', () => {
  let app: FastifyInstance;
  let streamerId: string;
  let participantId: string;
  let currentUserId: string;

  beforeAll(async () => {
    initDb(process.env.DATABASE_URL!);

    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.addHook('onRequest', async (request) => {
      request.jwtVerify = async () => ({ sub: currentUserId });
      request.user = { sub: currentUserId };
    });

    await app.register(collaborationsRoutes);

    const db = getDb();

    const streamerResult = await db
      .insert(users)
      .values({
        twitchId: crypto.randomUUID(),
        twitchLogin: crypto.randomUUID(),
        displayName: 'Collab Streamer',
        avatarUrl: '',
        inviteCode: crypto.randomUUID(),
        inviteCodeNormalized: crypto.randomUUID(),
      })
      .returning();
    streamerId = streamerResult[0].id;

    const participantResult = await db
      .insert(users)
      .values({
        twitchId: crypto.randomUUID(),
        twitchLogin: crypto.randomUUID(),
        displayName: 'Collab Participant',
        avatarUrl: '',
        inviteCode: crypto.randomUUID(),
        inviteCodeNormalized: crypto.randomUUID(),
      })
      .returning();
    participantId = participantResult[0].id;
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(collaborationParticipants)
      .where(eq(collaborationParticipants.userId, participantId));
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.ownerId, streamerId));
    await db
      .delete(collaborations)
      .where(eq(collaborations.ownerId, streamerId));
    await db.delete(users).where(eq(users.id, streamerId));
    await db.delete(users).where(eq(users.id, participantId));
    await app.close();
  });

  it('should create an open collaboration and join', async () => {
    currentUserId = streamerId;

    const createRes = await app.inject({
      method: 'POST',
      url: '/collaborations',
      payload: {
        title: 'Epic Stream Collab',
        description: 'Playing games together',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        expectedDurationMinutes: 60,
        visibility: 'public',
        applicationMode: 'open',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdCollab = JSON.parse(createRes.payload);
    expect(createdCollab.title).toBe('Epic Stream Collab');

    currentUserId = participantId;

    const joinRes = await app.inject({
      method: 'POST',
      url: `/collaborations/${createdCollab.id}/join`,
    });
    expect(joinRes.statusCode).toBe(200);

    const db = getDb();
    const participants = await db
      .select()
      .from(collaborationParticipants)
      .where(eq(collaborationParticipants.collaborationId, createdCollab.id));

    expect(participants.length).toBe(1);
    expect(participants[0].userId).toBe(participantId);
  });
});
