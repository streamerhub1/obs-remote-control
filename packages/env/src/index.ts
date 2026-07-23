import { z } from 'zod';

const backendSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  TWITCH_CLIENT_ID: z.string().min(1),
  TWITCH_CLIENT_SECRET: z.string().min(1),
  TWITCH_REDIRECT_URI: z.string().url(),
  DESKTOP_DEEP_LINK: z.string().url(),
  JWT_SECRET: z.string().min(10),
  SESSION_SECRET: z.string().min(10),
  TOKEN_ENCRYPTION_KEY: z.string().length(64).describe('32-byte hex string'),
});

const websiteSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

const desktopSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VITE_API_URL: z.string().url(),
});

export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Missing or invalid environment variables: ${errors}`);
  }
  return result.data;
}

export const envSchemas = {
  backend: backendSchema,
  website: websiteSchema,
  desktop: desktopSchema,
};
