import fastify from 'fastify';
import { createLogger } from '@obs-remote/logger';
import { AppError } from '@obs-remote/shared-types';
import crypto from 'crypto';

import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import moderatorsRoutes from './routes/moderators.js';
import signalingRoutes from './routes/signaling.js';
import remoteSessionsRoutes from './routes/remoteSessions.js';
import { relationshipsRoutes } from './routes/relationships.js';
import { profilesRoutes } from './routes/profiles.js';
import { collaborationsRoutes } from './routes/collaborations.js';
import { calendarRoutes } from './routes/calendar.js';
import { feedRoutes } from './routes/feed.js';
import { searchRoutes } from './routes/search.js';
import { notificationsRoutes } from './routes/notifications.js';
import fastifyWebsocket from '@fastify/websocket';
import { initDb } from './db.js';
import { initRedis } from './redis.js';

export async function buildApp(): Promise<any> {
  const logger = createLogger({
    env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    name: 'backend',
  });

  const app = fastify({
    logger,
    genReqId: () => crypto.randomUUID(),
  });

  // Init DB and Redis
  initDb(process.env.DATABASE_URL!);
  initRedis(process.env.REDIS_URL!);

  await app.register(fastifyCors, {
    origin: ['http://localhost:3001', 'http://localhost:5173'], // Frontend & Electron dev server
    credentials: true,
  });

  await app.register(fastifyCookie);
  
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(fastifyWebsocket);

  // Rate Limiting
  const fastifyRateLimit = (await import('@fastify/rate-limit')).default;
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Zod Type Provider
  const { serializerCompiler, validatorCompiler } = await import('fastify-type-provider-zod');
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(400).send(error.toJSON());
    } else {
      app.log.error(error);
      reply
        .status(500)
        .send({ error: 'INTERNAL', message: 'Internal Server Error' });
    }
  });

  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(apiRoutes, { prefix: '/api/v1' });
  await app.register(moderatorsRoutes, { prefix: '/api/v1' });
  await app.register(remoteSessionsRoutes, { prefix: '/api/v1' });
  await app.register(relationshipsRoutes, { prefix: '/api/v1' });
  await app.register(profilesRoutes, { prefix: '/api/v1' });
  await app.register(collaborationsRoutes, { prefix: '/api/v1' });
  await app.register(calendarRoutes, { prefix: '/api/v1' });
  await app.register(feedRoutes, { prefix: '/api/v1' });
  await app.register(searchRoutes, { prefix: '/api/v1' });
  await app.register(notificationsRoutes, { prefix: '/api/v1' });
  await app.register(signalingRoutes, { prefix: '/api/v1' });

  return app;
}
