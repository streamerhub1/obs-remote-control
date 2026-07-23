import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for migrations');
  }

  console.log('Running migrations...');
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../migrations') });
  
  console.log('Migrations completed successfully');
  await migrationClient.end();
}

// Removed auto-execution so it can be imported safely
