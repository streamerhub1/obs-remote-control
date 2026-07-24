import { buildApp } from './app.js';
import { parseEnv, envSchemas } from '@obs-remote/env';

async function start() {
  const env = parseEnv(
    envSchemas.backend,
    process.env as Record<string, string | undefined>,
  );
  const app = await buildApp();

  // Graceful shutdown
  const close = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
