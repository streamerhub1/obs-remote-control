import { createDatabase } from '@obs-remote/database';

let db: ReturnType<typeof createDatabase>;

export function initDb(url: string) {
  db = createDatabase(url);
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
