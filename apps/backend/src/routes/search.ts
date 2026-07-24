import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { users, profiles, collaborations } from '@obs-remote/database';
import { sql, ilike, or } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const searchRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();
  app.get(
    '/search',
    {
      schema: {
        querystring: z.object({
          q: z.string().min(1),
          type: z.enum(['all', 'users', 'collaborations']).default('all'),
          limit: z.coerce.number().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const { q, type, limit } = request.query;
      const db = getDb();

      // In PostgreSQL, ILIKE provides case-insensitive search.
      // For more advanced search, tsvector/tsquery can be used, but ILIKE is sufficient for MVP.
      const searchPattern = `%${q}%`;

      const results: Record<string, unknown> = {
        users: [],
        collaborations: [],
      };

      if (type === 'all' || type === 'users') {
        results.users = await db
          .select({
            id: users.id,
            displayName: users.displayName,
            twitchLogin: users.twitchLogin,
            avatarUrl: users.avatarUrl,
            bio: profiles.bio,
          })
          .from(users)
          .leftJoin(profiles, sql`${users.id} = ${profiles.userId}`)
          .where(
            or(
              ilike(users.displayName, searchPattern),
              ilike(users.twitchLogin, searchPattern),
              ilike(profiles.bio, searchPattern),
            ),
          )
          .limit(limit);
      }

      if (type === 'all' || type === 'collaborations') {
        results.collaborations = await db
          .select({
            id: collaborations.id,
            title: collaborations.title,
            description: collaborations.description,
            category: collaborations.category,
            startAt: collaborations.startAt,
          })
          .from(collaborations)
          .where(
            or(
              ilike(collaborations.title, searchPattern),
              ilike(collaborations.description, searchPattern),
              ilike(collaborations.category, searchPattern),
            ),
          )
          .limit(limit);
      }

      return reply.send(results);
    },
  );
};
