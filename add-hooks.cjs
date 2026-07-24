const fs = require('fs');
const files = [
  'collaborations.ts', 'calendar.ts', 'feed.ts',
  'search.ts', 'notifications.ts', 'profiles.ts', 'relationships.ts'
];
const hookCode = `
  app.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<{ sub: string; deviceId?: string; role?: string; remoteSessionId?: string }>();
      request.user = decoded;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });
`;

for (const file of files) {
  const path = 'apps/backend/src/routes/' + file;
  let code = fs.readFileSync(path, 'utf8');
  if (!code.includes('preHandler')) {
    code = code.replace(
      'const app = appOriginal.withTypeProvider<ZodTypeProvider>();',
      'const app = appOriginal.withTypeProvider<ZodTypeProvider>();\n' + hookCode
    );
    fs.writeFileSync(path, code);
    console.log('Updated ' + file);
  }
}
