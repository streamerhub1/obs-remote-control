const { Client } = require('pg');
async function clearDb() {
  const client = new Client({
    connectionString:
      'postgresql://streamerhub:secret@localhost:5432/obs_remote',
  });
  await client.connect();
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  for (let row of res.rows) {
    if (row.table_name !== 'drizzle_migrations') {
      await client.query('DROP TABLE "' + row.table_name + '" CASCADE');
    }
  }
  await client.end();
}
clearDb()
  .then(() => console.log('Cleaned'))
  .catch(console.error);
