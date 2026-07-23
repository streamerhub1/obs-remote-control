import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { posts, users, comments, reactions, follows } from '@obs-remote/database';
import { eq, and, desc, lt, inArray, sql } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const feedRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();
  // Get feed (posts from people I follow + mine)
  app.get('/feed', {
    schema: {
      querystring: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(50).default(20),
      })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { cursor, limit } = request.query;
    const db = getDb();
    
    // Get users I follow
    const myFollows = await db.select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
      
    const authorIds = [userId, ...myFollows.map(f => f.followingId)];

    let query = db.select({
      id: posts.id,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        displayName: users.displayName,
        twitchLogin: users.twitchLogin,
        avatarUrl: users.avatarUrl,
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(
      inArray(posts.authorId, authorIds),
      cursor ? lt(posts.createdAt, new Date(cursor)) : undefined
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

    const results = await query;
    
    const nextCursor = results.length === limit ? results[results.length - 1].createdAt.toISOString() : null;

    return reply.send({
      data: results,
      nextCursor
    });
  });

  // Create post
  app.post('/feed/posts', {
    schema: {
      body: z.object({
        content: z.string().min(1).max(2000),
        mediaUrls: z.array(z.string().url()).max(4).default([]),
      })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { content, mediaUrls } = request.body;
    const db = getDb();
    
    const [post] = await db.insert(posts).values({
      authorId: userId,
      content,
      mediaUrls,
    }).returning();

    return reply.status(201).send(post);
  });
  
  // Like a post
  app.post('/feed/posts/:id/like', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { id } = request.params;
    const db = getDb();
    
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(reactions).where(and(
        eq(reactions.userId, userId),
        eq(reactions.targetType, 'post'),
        eq(reactions.targetId, id),
        eq(reactions.reactionType, 'like')
      ));

      if (existing) {
        // Unlike
        await tx.delete(reactions).where(eq(reactions.id, existing.id));
        await tx.update(posts).set({ likesCount: sql`${posts.likesCount} - 1` }).where(eq(posts.id, id));
        return reply.send({ liked: false });
      } else {
        // Like
        await tx.insert(reactions).values({
          userId,
          targetType: 'post',
          targetId: id,
          reactionType: 'like'
        });
        await tx.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, id));
        return reply.send({ liked: true });
      }
    });
  });

  // Comment on a post
  app.post('/feed/posts/:id/comments', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ content: z.string().min(1).max(1000) })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { id } = request.params;
    const { content } = request.body;
    const db = getDb();
    
    return await db.transaction(async (tx) => {
      const [comment] = await tx.insert(comments).values({
        postId: id,
        authorId: userId,
        content,
      }).returning();
      
      await tx.update(posts).set({ commentsCount: sql`${posts.commentsCount} + 1` }).where(eq(posts.id, id));
      
      return reply.status(201).send(comment);
    });
  });
  
  // Get comments for a post
  app.get('/feed/posts/:id/comments', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(50).default(20),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { cursor, limit } = request.query;
    const db = getDb();
    
    let query = db.select({
      id: comments.id,
      content: comments.content,
      likesCount: comments.likesCount,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        displayName: users.displayName,
        twitchLogin: users.twitchLogin,
        avatarUrl: users.avatarUrl,
      }
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(
      eq(comments.postId, id),
      cursor ? lt(comments.createdAt, new Date(cursor)) : undefined
    ))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

    const results = await query;
    const nextCursor = results.length === limit ? results[results.length - 1].createdAt.toISOString() : null;

    return reply.send({
      data: results,
      nextCursor
    });
  });
};
