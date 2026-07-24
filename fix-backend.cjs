const fs = require('fs');
const path = require('path');

const OLD = '(request as { sub: string; id: string; deviceId?: string; role?: string; remoteSessionId?: string; [key: string]: unknown })';
const NEW = '(request as unknown as { sub: string; id: string; deviceId?: string; role?: string; remoteSessionId?: string; [key: string]: unknown })';

const files = [
  'apps/backend/src/routes/moderators.ts',
  'apps/backend/src/routes/remoteSessions.ts',
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf-8');
  const count = (c.split(OLD).length - 1);
  c = c.split(OLD).join(NEW);
  fs.writeFileSync(file, c);
  console.log(`Fixed ${count} occurrences in ${file}`);
}
