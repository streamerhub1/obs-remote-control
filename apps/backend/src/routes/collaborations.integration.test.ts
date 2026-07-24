import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import { collaborationsRoutes } from './collaborations.js';
import { initDb, getDb } from '../db.js';
import { users, collaborations, collaborationParticipants } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Collaborations API Integration', () => {
  let app: any;
  let streamerId: string;
  let participantId: string;

  beforeAll(async () => {
    initDb(process.env.DATABASE_URL!);
    
    app = fastify();
    
    const { serializerCompiler, validatorCompiler } = await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    
    // Mock user for requests
    app.addHook('onRequest', async (request: any) => {
      request.user = { sub: streamerId };
    });

    await app.register(collaborationsRoutes);

    const db = getDb();

    // Create a test streamer
    const streamerResult = await db.insert(users).values({
      twitchId: 'collab_streamer123',
      twitchLogin: 'collabstreamer',
      displayName: 'Collab Streamer',
      avatarUrl: '',
      inviteCode: crypto.randomUUID(),
      inviteCodeNormalized: crypto.randomUUID(),
    }).returning();
    streamerId = streamerResult[0].id;

    // Create a participant
    const participantResult = await db.insert(users).values({
      twitchId: 'collab_participant123',
      twitchLogin: 'collabparticipant',
      displayName: 'Collab Participant',
      avatarUrl: '',
      inviteCode: crypto.randomUUID(),
      inviteCodeNormalized: crypto.randomUUID(),
    }).returning();
    participantId = participantResult[0].id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(collaborationParticipants).where(eq(collaborationParticipants.userId, participantId));
    await db.delete(collaborations).where(eq(collaborations.ownerId, streamerId));
    await db.delete(users).where(eq(users.id, streamerId));
    await db.delete(users).where(eq(users.id, participantId));
  });

  it('should create a collaboration, add a participant, and list them', async () => {
    // 1. Create a collaboration
    const createRes = await app.inject({
      method: 'POST',
      url: '/collaborations',
      payload: {
        title: 'Epic Stream Collab',
        description: 'Playing games together',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        visibility: 'public'
      }
    });

    expect(createRes.statusCode).toBe(201);
    const createdCollab = JSON.parse(createRes.payload);
    expect(createdCollab.title).toBe('Epic Stream Collab');

    // 2. Add participant
    const inviteRes = await app.inject({
      method: 'POST',
      url: `/collaborations/${createdCollab.id}/participants`,
      payload: {
        twitchLogin: 'collabparticipant',
        role: 'co_host'
      }
    });

    expect(inviteRes.statusCode).toBe(200);

    // 3. List collaborations
    const listRes = await app.inject({
      method: 'GET',
      url: '/collaborations',
    });

    expect(listRes.statusCode).toBe(200);
    const collabs = JSON.parse(listRes.payload);
    expect(collabs.length).toBeGreaterThan(0);
    
    const ourCollab = collabs.find((c: any) => c.id === createdCollab.id);
    expect(ourCollab).toBeDefined();

    // Verify participant was added
    const participantsRes = await app.inject({
      method: 'GET',
      url: `/collaborations/${createdCollab.id}/participants`,
    });
    
    expect(participantsRes.statusCode).toBe(200);
    const participants = JSON.parse(participantsRes.payload);
    expect(participants.length).toBe(1);
    expect(participants[0].userId).toBe(participantId);
    expect(participants[0].role).toBe('co_host');
  });
});
