import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      deviceId?: string;
      id?: string;
      role?: string;
      remoteSessionId?: string;
    };
    user: {
      sub: string;
      deviceId?: string;
      id?: string;
      role?: string;
      remoteSessionId?: string;
    };
  }
}
