const fs = require('fs');
const files = [
  'collaborations.test.ts',
  'routes/auth.integration.test.ts',
  'routes/relay.integration.test.ts'
];
for (const file of files) {
  const path = 'apps/backend/src/' + file;
  let code = fs.readFileSync(path, 'utf8');
  
  // Remove the block in beforeAll
  const block1 = `    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      console.warn(
        'Skipping collaborations test because DATABASE_URL or REDIS_URL are missing.',
      );
      return;
    }`;
  const block2 = `    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      console.warn(
        'Skipping real integration tests because DATABASE_URL or REDIS_URL are missing.',
      );
      return;
    }`;
  const block3 = `    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) return;`;

  code = code.replace(block1, '').replace(block2, '').replaceAll(block3, '');
  fs.writeFileSync(path, code);
  console.log('Cleaned ' + file);
}
