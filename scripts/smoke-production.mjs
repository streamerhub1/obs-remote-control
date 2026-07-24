const PROD_URL = 'https://obs-remotebackend-production.up.railway.app';

async function runSmokeTest() {
  console.log('Starting Production Smoke Test...\n');
  let hasErrors = false;

  // 1. Test /health
  console.log(`[1] Testing GET ${PROD_URL}/health`);
  try {
    const healthRes = await fetch(`${PROD_URL}/health`);
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
    const healthData = await healthRes.json();
    if (healthData.status === 'ok') {
      console.log('✅ /health is OK');
    } else {
      console.error('❌ /health returned unexpected status', healthData);
      hasErrors = true;
    }
  } catch (e) {
    console.error('❌ /health failed:', e.message);
    hasErrors = true;
  }

  // 2. Test /ready
  console.log(`\n[2] Testing GET ${PROD_URL}/ready`);
  try {
    const readyRes = await fetch(`${PROD_URL}/ready`);
    if (!readyRes.ok) throw new Error(`HTTP ${readyRes.status}`);
    const readyData = await readyRes.json();
    if (
      readyData.status === 'ready' &&
      readyData.checks?.db === 'ok' &&
      readyData.checks?.redis === 'ok'
    ) {
      console.log('✅ /ready is OK (DB and Redis connected)');
    } else {
      console.error(
        '❌ /ready returned unexpected status or missing checks',
        readyData,
      );
      hasErrors = true;
    }
  } catch (e) {
    console.error('❌ /ready failed:', e.message);
    hasErrors = true;
  }

  // 3. Test /api/v1/auth/desktop/login (Redirect)
  console.log(`\n[3] Testing GET ${PROD_URL}/api/v1/auth/desktop/login`);
  try {
    const loginRes = await fetch(`${PROD_URL}/api/v1/auth/desktop/login`, {
      redirect: 'manual',
    });
    if (loginRes.status >= 300 && loginRes.status < 400) {
      const location = loginRes.headers.get('location');
      if (location && location.includes('id.twitch.tv/oauth2/authorize')) {
        console.log('✅ /desktop/login correctly redirects to Twitch OAuth');
      } else {
        console.error(
          '❌ /desktop/login redirected to unexpected URL:',
          location,
        );
        hasErrors = true;
      }
    } else {
      console.error(
        '❌ /desktop/login did not return a redirect. Status:',
        loginRes.status,
      );
      hasErrors = true;
    }
  } catch (e) {
    console.error('❌ /desktop/login failed:', e.message);
    hasErrors = true;
  }

  console.log('\n=======================================');
  if (hasErrors) {
    console.error('❌ Smoke test failed.');
    process.exit(1);
  } else {
    console.log('✅ Smoke test completed successfully!');
  }
}

runSmokeTest();
