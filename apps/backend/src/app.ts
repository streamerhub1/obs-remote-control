import fastify from 'fastify';
import { createLogger } from '@obs-remote/logger';
import { AppError } from '@obs-remote/shared-types';
import crypto from 'crypto';

export async function buildApp(): Promise<any> {
  const logger = createLogger({
    env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    name: 'backend',
  });

  const app = fastify({
    logger,
    genReqId: () => crypto.randomUUID(),
  });

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

  // Health route
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
