const fs = require('fs');

// apps/backend/src/routes/api.ts
let api = fs.readFileSync('apps/backend/src/routes/api.ts', 'utf8');
api = api.replace(/import \{ FastifyPluginAsync \} from 'fastify';\r?\n/g, '');
api = api.replace(/import \{ eq, and \} from 'drizzle-orm';\r?\n/g, 'import { eq } from \'drizzle-orm\';\n');
api = api.replace(/\} catch \(err\) \{/g, '} catch (_err) {');
api = api.replace(/async \(request, reply\) => \{/g, 'async (request, _reply) => {');
fs.writeFileSync('apps/backend/src/routes/api.ts', api);

// apps/backend/src/routes/auth.integration.test.ts
let auth = fs.readFileSync('apps/backend/src/routes/auth.integration.test.ts', 'utf8');
auth = auth.replace(/  moderatorRelationships,\r?\n  moderatorPermissions,\r?\n/g, '');
auth = auth.replace(/const \[session\] = await db/g, 'await db');
fs.writeFileSync('apps/backend/src/routes/auth.integration.test.ts', auth);

// apps/backend/src/collaborations.test.ts
let collabTest = fs.readFileSync('apps/backend/src/collaborations.test.ts', 'utf8');
collabTest = collabTest.replace(/import \{ FastifyInstance \} from 'fastify';\r?\n/g, '');
fs.writeFileSync('apps/backend/src/collaborations.test.ts', collabTest);

// apps/backend/src/app.ts
let appTs = fs.readFileSync('apps/backend/src/app.ts', 'utf8');
appTs = appTs.replace(/\} catch \(e\) \{/g, '} catch (_e) {');
fs.writeFileSync('apps/backend/src/app.ts', appTs);

// apps/backend/src/app.test.ts
let appTest = fs.readFileSync('apps/backend/src/app.test.ts', 'utf8');
appTest = appTest.replace(/import \{ FastifyInstance \} from 'fastify';\r?\n/g, '');
fs.writeFileSync('apps/backend/src/app.test.ts', appTest);
