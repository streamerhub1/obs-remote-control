import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { collaborationsRoutes } from './collaborations.js';
import { initDb, getDb } from '../db.js';
import {
  users,
  collaborations,
  collaborationParticipants,
  calendarEvents,
  auditLogs,
  collaborationApplications,
  collaborationInvitations,
} from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Collaborations API Integration', () => {
  let app: FastifyInstance;
  let streamerId: string;
  let participantId: string;
  let currentUserId: string;
  let collaborationId: string;

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
    if (collaborationId) {
      await db
        .delete(auditLogs)
        .where(eq(auditLogs.resourceId, collaborationId));
      await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.sourceId, collaborationId));
      await db
        .delete(collaborationParticipants)
        .where(eq(collaborationParticipants.collaborationId, collaborationId));
      await db
        .delete(collaborationApplications)
        .where(eq(collaborationApplications.collaborationId, collaborationId));
      await db
        .delete(collaborationInvitations)
        .where(eq(collaborationInvitations.collaborationId, collaborationId));
      await db
        .delete(collaborations)
        .where(eq(collaborations.id, collaborationId));
    }
    if (streamerId) await db.delete(users).where(eq(users.id, streamerId));
    if (participantId)
      await db.delete(users).where(eq(users.id, participantId));
    await app.close();
  });

  it('should return empty list on GET /collaborations', async () => {
    currentUserId = streamerId;
    const res = await app.inject({
      method: 'GET',
      url: '/collaborations',
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toEqual({ data: [], nextCursor: null });
  });

  it('should create an open collaboration and GET returns enriched data', async () => {
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
    collaborationId = createdCollab.id;

    // GET as owner — should see 1 collab with enriched host, 1 participant, myApplication accepted
    currentUserId = streamerId;
    const listRes = await app.inject({
      method: 'GET',
      url: '/collaborations',
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.payload);
    expect(listData.data.length).toBeGreaterThanOrEqual(1);

    const collab = listData.data.find(
      (c: { id: string }) => c.id === collaborationId,
    );
    expect(collab).toBeDefined();

    // host fields are populated
    expect(collab.host).not.toBeNull();
    expect(collab.host.id).toBe(streamerId);
    expect(collab.host.displayName).toBe('Collab Streamer');

    // owner is automatically a participant (1 participant)
    expect(collab.currentParticipants).toBe(1);

    // applicationMode
    expect(collab.applicationMode).toBe('open');

    // owner's myApplication should be accepted (via participant row)
    expect(collab.myApplication).not.toBeNull();
    expect(collab.myApplication.status).toBe('accepted');
  });

  it('should join open collaboration and GET reflects 2 participants', async () => {
    // Participant joins the open collaboration
    currentUserId = participantId;

    const joinRes = await app.inject({
      method: 'POST',
      url: `/collaborations/${collaborationId}/join`,
    });
    expect(joinRes.statusCode).toBe(200);

    // GET as participant — should now see 2 participants
    const listRes = await app.inject({
      method: 'GET',
      url: '/collaborations',
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.payload);

    const collab = listData.data.find(
      (c: { id: string }) => c.id === collaborationId,
    );
    expect(collab).toBeDefined();
    expect(collab.currentParticipants).toBe(2);

    // participant myApplication should be accepted (joined via participant row)
    expect(collab.myApplication).not.toBeNull();
    expect(collab.myApplication.status).toBe('accepted');
  });
});
