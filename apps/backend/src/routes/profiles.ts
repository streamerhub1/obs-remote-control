import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { oauthAccounts, profiles, users } from '@obs-remote/database';
import { and, eq } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { decryptToken } from '../utils/encryption.js';
import { fetchTwitchUser } from '../services/twitch.js';

type JwtPayload = {
  sub: string;
  deviceId?: string;
  role?: string;
  remoteSessionId?: string;
};

const getUserId = (requestUser: unknown) => (requestUser as JwtPayload).sub;

async function syncBaseProfileFromTwitch(userId: string) {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) return;

  const db = getDb();
  const [account] = await db
    .select({ encryptedAccessToken: oauthAccounts.encryptedAccessToken })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.provider, 'twitch'),
      ),
    );

  if (!account) return;

  try {
    const accessToken = decryptToken(account.encryptedAccessToken, encryptionKey);
    const twitchUser = await fetchTwitchUser(accessToken);
    await db
      .update(users)
      .set({
        twitchLogin: twitchUser.login,
        displayName: twitchUser.display_name,
        avatarUrl: twitchUser.profile_image_url,
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Twitch profile sync skipped: ${message}`);
  }
}

export const profilesRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', async (request, reply) => {
    try {
      request.user = await request.jwtVerify<JwtPayload>();
    } catch (_err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  app.get('/profiles/me', async (request, reply) => {
    const userId = getUserId(request.user);
    const db = getDb();

    await syncBaseProfileFromTwitch(userId);

    let [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!profile) {
      [profile] = await db.insert(profiles).values({ userId }).returning();
    }

    return reply.send({ ...profile, user });
  });

  app.patch(
    '/profiles/me',
    {
      schema: {
        body: z.object({
          bannerUrl: z.string().nullable().optional(),
          bio: z.string().nullable().optional(),
          languages: z.array(z.string()).optional(),
          categories: z.array(z.string()).optional(),
          timezone: z.string().nullable().optional(),
          collaborationAvailability: z.boolean().optional(),
          socialLinks: z
            .array(
              z.object({
                platform: z.string(),
                url: z.string(),
              }),
            )
            .optional(),
        }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request.user);
      const updates = request.body;
      const db = getDb();

      let [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      if (!existing) {
        [existing] = await db.insert(profiles).values({ userId }).returning();
      }

      const profileUpdates: Partial<typeof profiles.$inferInsert> = {
        updatedAt: new Date(),
      };
      if ('bannerUrl' in updates) profileUpdates.bannerUrl = updates.bannerUrl ?? null;
      if ('bio' in updates) profileUpdates.bio = updates.bio ?? null;
      if ('languages' in updates) profileUpdates.languages = updates.languages ?? [];
      if ('categories' in updates) profileUpdates.categories = updates.categories ?? [];
      if ('socialLinks' in updates) profileUpdates.socialLinks = updates.socialLinks ?? [];
      if ('timezone' in updates) profileUpdates.timezone = updates.timezone?.trim() || existing.timezone || 'UTC';
      if ('collaborationAvailability' in updates) {
        profileUpdates.collaborationAvailability = updates.collaborationAvailability ?? true;
      }

      const [updatedProfile] = await db
        .update(profiles)
        .set(profileUpdates)
        .where(eq(profiles.userId, userId))
        .returning();

      return reply.send(updatedProfile);
    },
  );

  app.get(
    '/profiles/:userId',
    {
      schema: {
        params: z.object({ userId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const db = getDb();

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ ...(profile || {}), user });
    },
  );
};
