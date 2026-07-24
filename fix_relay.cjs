const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/routes/relay.integration.test.ts', 'utf8');

const afterAll = `  afterAll(async () => {
    const db = getDb();
    const { auditLogs } = require('@obs-remote/database');
    await db.delete(auditLogs).where(eq(auditLogs.resourceId, relationshipId));
    await db
      .delete(moderatorPermissions)
`;

code = code.replace(
  `  afterAll(async () => {
    const db = getDb();
    await db
      .delete(moderatorPermissions)`,
  afterAll
);
fs.writeFileSync('apps/backend/src/routes/relay.integration.test.ts', code);
