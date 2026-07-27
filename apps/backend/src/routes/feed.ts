import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  posts,
  users,
  comments,
  reactions,
  follows,
  notifications,
} from '@obs-remote/database';
import { eq, and, desc, lt, inArray, sql, isNull } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

type JwtPayload = {
  sub: string;
  deviceId?: string;
  role?: string;
  remoteSessionId?: string;
};

const getUserId = (requestUser: unknown) => (requestUser as JwtPayload).sub;

export const feedRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', async (request, reply) => {
    try {
      request.user = await request.jwtVerify<JwtPayload>();
    } catch (_err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  app.get(
    '/feed',
    {
      schema: {
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().min(1).max(50).default(20),
          tab: z.enum(['all', 'following', 'forYou']).default('all'),
        }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request.user);
      const { cursor, limit, tab } = request.query;
      const db = getDb();

      const whereParts = [
        isNull(posts.deletedAt),
        cursor ? lt(posts.createdAt, new Date(cursor)) : undefined,
      ];

      // Feed tab architecture: all = public chronological community feed;
      // following = subscriptions; forYou currently aliases all until ranking signals exist.
      if (tab === 'following') {
        const myFollows = await db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, userId));
        const authorIds = [userId, ...myFollows.map((f) => f.followingId)];
        whereParts.push(inArray(posts.authorId, authorIds));
      }

      const results = await db
        .select({
          id: posts.id,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          createdAt: posts.createdAt,
          author: {
            id: users.id,
            publicId: users.publicId,
            displayName: users.displayName,
            twitchLogin: users.twitchLogin,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(...whereParts))
        .orderBy(desc(posts.createdAt))
        .limit(limit);

      const nextCursor =
        results.length === limit
          ? results[results.length - 1].createdAt.toISOString()
          : null;

      return reply.send({ data: results, nextCursor, tab });
    },
  );

  app.post(
    '/feed/posts',
    {
      schema: {
        body: z.object({
          content: z.string().min(1).max(2000),
          mediaUrls: z.array(z.string().url()).max(4).default([]),
        }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request.user);
      const { content, mediaUrls } = request.body;
      const db = getDb();

      const [post] = await db
        .insert(posts)
        .values({ authorId: userId, content, mediaUrls })
        .returning();

      return reply.status(201).send(post);
    },
  );

  app.post(
    '/feed/posts/:id/like',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request.user);
      const { id } = request.params;
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [post] = await tx
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(and(eq(posts.id, id), isNull(posts.deletedAt)));
        if (!post) return reply.status(404).send({ error: 'Post not found' });

        const [existing] = await tx
          .select()
          .from(reactions)
          .where(
            and(
              eq(reactions.userId, userId),
              eq(reactions.targetType, 'post'),
              eq(reactions.targetId, id),
              eq(reactions.reactionType, 'like'),
            ),
          );

        if (existing) {
          await tx.delete(reactions).where(eq(reactions.id, existing.id));
          await tx
            .update(posts)
            .set({ likesCount: sql`greatest(${posts.likesCount} - 1, 0)` })
            .where(eq(posts.id, id));
          return reply.send({ liked: false });
        }

        await tx.insert(reactions).values({
          userId,
          targetType: 'post',
          targetId: id,
          reactionType: 'like',
        });
        await tx
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, id));

        return reply.send({ liked: true });
      });
    },
  );

  app.post(
    '/feed/posts/:id/comments',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ content: z.string().min(1).max(1000) }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request.user);
      const { id } = request.params;
      const { content } = request.body;
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [post] = await tx
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(and(eq(posts.id, id), isNull(posts.deletedAt)));
        if (!post) return reply.status(404).send({ error: 'Post not found' });

        const [comment] = await tx
          .insert(comments)
          .values({ postId: id, authorId: userId, content })
          .returning();

        await tx
          .update(posts)
          .set({ commentsCount: sql`${posts.commentsCount} + 1` })
          .where(eq(posts.id, id));

        if (post.authorId !== userId) {
          await tx.insert(notifications).values({
            userId: post.authorId,
            actorId: userId,
            type: 'comment',
            targetType: 'post',
            targetId: id,
          });
        }

        return reply.status(201).send(comment);
      });
    },
  );

  app.get(
    '/feed/posts/:id/comments',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { cursor, limit } = request.query;
      const db = getDb();

      const results = await db
        .select({
          id: comments.id,
          content: comments.content,
          likesCount: comments.likesCount,
          createdAt: comments.createdAt,
          author: {
            id: users.id,
            publicId: users.publicId,
            displayName: users.displayName,
            twitchLogin: users.twitchLogin,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(
          and(
            eq(comments.postId, id),
            isNull(comments.deletedAt),
            cursor ? lt(comments.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(comments.createdAt))
        .limit(limit);

      const nextCursor =
        results.length === limit
          ? results[results.length - 1].createdAt.toISOString()
          : null;

      return reply.send({ data: results, nextCursor });
    },
  );
};
