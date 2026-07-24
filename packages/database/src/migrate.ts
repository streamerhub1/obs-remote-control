// dotenv is a devDependency; skip in production containers where env comes from runtime
try {
  await import('dotenv/config');
} catch {
  // dotenv not available (production) — env vars provided by runtime
}
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function main() {
  const databaseUrl =
    process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL or DATABASE_DIRECT_URL is required for migrations',
    );
  }

  console.log('Running migrations...');
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../migrations'),
  });

  console.log('Migrations completed successfully');
  await migrationClient.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
