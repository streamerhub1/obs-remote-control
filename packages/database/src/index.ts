import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export * from './schema.js';

export function createDatabase(url: string) {
  const client = postgres(url, { max: 1 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
