/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import { collaborationsRoutes } from './collaborations.js';
import { initDb, getDb } from '../db.js';
import {
  users,
  collaborations,
  collaborationParticipants,
} from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Collaborations API Integration', () => {
  let app: any;
  let streamerId: string;
  let participantId: string;

  beforeAll(async () => {
    initDb(process.env.DATABASE_URL!);

    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Mock user for requests
    app.addHook('onRequest', async (request: any) => {
      request.jwtVerify = async () => ({ sub: streamerId });
      request.user = { sub: streamerId };
    });

    await app.register(collaborationsRoutes);

    const db = getDb();

    // Create a test streamer
    const streamerResult = await db
      .insert(users)
      .values({
        twitchId: 'collab_streamer123',
        twitchLogin: 'collabstreamer',
        displayName: 'Collab Streamer',
        avatarUrl: '',
        inviteCode: crypto.randomUUID(),
        inviteCodeNormalized: crypto.randomUUID(),
      })
      .returning();
    streamerId = streamerResult[0].id;

    // Create a participant
    const participantResult = await db
      .insert(users)
      .values({
        twitchId: 'collab_participant123',
        twitchLogin: 'collabparticipant',
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
      .delete(collaborations)
      .where(eq(collaborations.ownerId, streamerId));
    await db.delete(users).where(eq(users.id, streamerId));
    await db.delete(users).where(eq(users.id, participantId));
  });

  it('should create a collaboration, open it, and join', async () => {
    // 1. Create a collaboration
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

    // 2. Open it
    const openRes = await app.inject({
      method: 'POST',
      url: `/collaborations/${createdCollab.id}/open`,
    });
    expect(openRes.statusCode).toBe(200);

    // 3. Join it as participant
    app.addHook('onRequest', async (request: any) => {
      request.jwtVerify = async () => ({ sub: participantId });
      request.user = { sub: participantId };
    });

    const joinRes = await app.inject({
      method: 'POST',
      url: `/collaborations/${createdCollab.id}/join`,
    });
    expect(joinRes.statusCode).toBe(200);
  });
});
