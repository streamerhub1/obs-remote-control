const fs = require('fs');
let col = fs.readFileSync('apps/backend/src/routes/collaborations.integration.test.ts', 'utf8');

const start = col.indexOf("  it('should create a collaboration");
const newIt = `  it('should create a collaboration, open it, and join', async () => {
    // 1. Create a collaboration
    const createRes = await app.inject({
      method: 'POST',
      url: '/collaborations',
      payload: {
        title: 'Epic Stream Collab',
        description: 'Playing games together',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        expectedDurationMinutes: 60,
        visibility: 'public',
        applicationMode: 'open'
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdCollab = JSON.parse(createRes.payload);
    expect(createdCollab.title).toBe('Epic Stream Collab');

    // 2. Open it
    const openRes = await app.inject({
      method: 'POST',
      url: \`/collaborations/\${createdCollab.id}/open\`,
    });
    expect(openRes.statusCode).toBe(200);

    // 3. Join it as participant
    app.addHook('onRequest', async (request) => {
      request.jwtVerify = async () => ({ sub: participantId });
      request.user = { sub: participantId };
    });

    const joinRes = await app.inject({
      method: 'POST',
      url: \`/collaborations/\${createdCollab.id}/join\`,
    });
    expect(joinRes.statusCode).toBe(200);
  });
});
`;

col = col.substring(0, start) + newIt;
fs.writeFileSync('apps/backend/src/routes/collaborations.integration.test.ts', col);
