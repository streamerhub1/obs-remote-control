import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      sub: string;
      deviceId?: string;
    };
  }
}
