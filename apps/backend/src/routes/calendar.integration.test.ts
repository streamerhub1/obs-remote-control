import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { calendarRoutes } from './calendar.js';
import { initDb, getDb } from '../db.js';
import { users, calendarEvents } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Calendar API Integration', () => {
  let app: FastifyInstance;
  let testUserId: string;

  beforeAll(async () => {
    initDb(process.env.DATABASE_URL!);

    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.addHook('onRequest', async (request) => {
      request.jwtVerify = async () => ({ sub: testUserId });
      request.user = { sub: testUserId };
    });

    await app.register(calendarRoutes);

    const db = getDb();

    const userResult = await db
      .insert(users)
      .values({
        twitchId: crypto.randomUUID(),
        twitchLogin: crypto.randomUUID(),
        displayName: 'Test User Calendar',
        avatarUrl: '',
        inviteCode: crypto.randomUUID(),
        inviteCodeNormalized: crypto.randomUUID(),
      })
      .returning();
    testUserId = userResult[0].id;
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.ownerId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await app.close();
  });

  it('should create a calendar event and retrieve it', async () => {
    const startAt = new Date().toISOString();
    const endAt = new Date(Date.now() + 3600000).toISOString();

    const createRes = await app.inject({
      method: 'POST',
      url: '/calendar',
      payload: {
        sourceType: 'personalPlan',
        title: 'Test Event',
        startAt,
        endAt,
        timezone: 'UTC',
        visibility: 'private',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);
    expect(created.title).toBe('Test Event');

    const getRes = await app.inject({
      method: 'GET',
      url: `/calendar?start=${new Date(Date.now() - 3600000).toISOString()}&end=${new Date(Date.now() + 7200000).toISOString()}`,
    });

    expect(getRes.statusCode).toBe(200);
    const events = JSON.parse(getRes.payload);
    expect(events.length).toBeGreaterThan(0);
    expect(
      events.find((e: { id: string }) => e.id === created.id),
    ).toBeDefined();

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/calendar/${created.id}`,
    });
    expect(delRes.statusCode).toBe(200);
  });
});
