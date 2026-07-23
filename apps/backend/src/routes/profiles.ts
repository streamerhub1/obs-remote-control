import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { profiles, users } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const profilesRoutes: FastifyPluginAsyncZod = async (app) => {
  // Get current user profile
  app.get('/profiles/me', async (request, reply) => {
    const userId = request.user.sub;
    const db = getDb();
    
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!profile) {
      // Create empty profile if not exists
      [profile] = await db.insert(profiles).values({ userId }).returning();
    }

    return reply.send({ ...profile, user });
  });

  // Update current user profile
  app.patch('/profiles/me', {
    schema: {
      body: z.object({
        bannerUrl: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        languages: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        timezone: z.string().optional(),
        collaborationAvailability: z.boolean().optional(),
        socialLinks: z.array(z.object({
          platform: z.string(),
          url: z.string()
        })).optional()
      })
    }
  }, async (request, reply) => {
    const userId = request.user.sub;
    const updates = request.body;
    const db = getDb();

    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!existing) {
      await db.insert(profiles).values({ userId });
    }

    const [updatedProfile] = await db.update(profiles)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(profiles.userId, userId))
      .returning();

    return reply.send(updatedProfile);
  });
  
  // Get a specific user profile
  app.get('/profiles/:userId', {
    schema: {
      params: z.object({ userId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { userId } = request.params;
    const db = getDb();
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ ...(profile || {}), user });
  });
};
