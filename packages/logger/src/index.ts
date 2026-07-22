import pino from 'pino';

export interface LoggerConfig {
  env: 'development' | 'production' | 'test';
  name: string;
}

export function createLogger(config: LoggerConfig) {
  return pino({
    name: config.name,
    level:
      config.env === 'production'
        ? 'info'
        : config.env === 'test'
          ? 'silent'
          : 'debug',
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'secret',
        'refresh_token',
        'access_token',
      ],
      censor: '[REDACTED]',
    },
  });
}
