import { FastifyInstance } from 'fastify';
import { generateState, generateCodeVerifier } from 'arctic';
import { getTwitch, fetchTwitchUser } from '../services/twitch.js';
import { getDb } from '../db.js';
import { getRedis } from '../redis.js';
import { users, oauthAccounts, devices, sessions } from '@obs-remote/database';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { encryptToken } from '../utils/encryption.js';
import { generateInviteCode } from '../utils/crypto.js';

export default async function authRoutes(app: FastifyInstance) {
  // Website Login
  app.get('/auth/twitch/login', async (request, reply) => {
    const twitch = getTwitch(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!
    );
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = twitch.createAuthorizationURL(state, codeVerifier, ['user:read:email']);

    const redis = getRedis();
    await redis.set(`auth:state:${state}`, JSON.stringify({
      flow: 'website',
      codeVerifier
    }), 'EX', 600); // 10 minutes TTL

    reply.setCookie('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 600,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  // Desktop Login initiation
  app.get('/auth/desktop/login', async (request, reply) => {
    const twitch = getTwitch(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!
    );
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = twitch.createAuthorizationURL(state, codeVerifier, ['user:read:email']);

    const redis = getRedis();
    await redis.set(`auth:state:${state}`, JSON.stringify({
      flow: 'desktop',
      codeVerifier
    }), 'EX', 600); // 10 minutes TTL

    reply.setCookie('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 600,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  // Callback for both flows
  app.get('/auth/twitch/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const { code, state, error } = query;

    if (error) {
      return reply.status(400).send({ error: 'OAuth failed or was cancelled' });
    }

    const storedState = request.cookies['oauth_state'];
    if (!state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid state' });
    }

    const redis = getRedis();
    const stateDataRaw = await redis.get(`auth:state:${state}`);
    
    if (!stateDataRaw) {
      return reply.status(400).send({ error: 'Login request expired or invalid' });
    }

    // Delete state to prevent reuse
    await redis.del(`auth:state:${state}`);
    reply.clearCookie('oauth_state', { path: '/' });

    const stateData = JSON.parse(stateDataRaw) as { flow: string, codeVerifier: string };
    
    if (!code) {
      return reply.status(400).send({ error: 'No code provided' });
    }

    const twitch = getTwitch(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!
    );

    let tokens;
    try {
      tokens = await twitch.validateAuthorizationCode(code, stateData.codeVerifier);
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to validate authorization code' });
    }

    const twitchUser = await fetchTwitchUser(tokens.accessToken());

    const db = getDb();
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.twitchId, twitchUser.id));

    let userId = existingUser?.id;

    if (!userId) {
      const inviteCode = generateInviteCode();
      const [newUser] = await db
        .insert(users)
        .values({
          twitchId: twitchUser.id,
          twitchLogin: twitchUser.login,
          displayName: twitchUser.display_name,
          avatarUrl: twitchUser.profile_image_url,
          inviteCode: inviteCode,
          inviteCodeNormalized: inviteCode.toLowerCase(),
        })
        .returning({ id: users.id });
      userId = newUser.id;
    } else {
      await db
        .update(users)
        .set({
          twitchLogin: twitchUser.login,
          displayName: twitchUser.display_name,
          avatarUrl: twitchUser.profile_image_url,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY!;
    const encryptedAccess = encryptToken(tokens.accessToken(), encryptionKey);
    const encryptedRefresh = tokens.hasRefreshToken() 
      ? encryptToken(tokens.refreshToken(), encryptionKey) 
      : null;

    // Upsert oauth_accounts
    const [existingOauth] = await db
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(and(
        eq(oauthAccounts.provider, 'twitch'),
        eq(oauthAccounts.providerAccountId, twitchUser.id)
      ));

    if (existingOauth) {
      await db.update(oauthAccounts).set({
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        expiresAt: tokens.accessTokenExpiresAt(),
      }).where(and(
        eq(oauthAccounts.provider, 'twitch'),
        eq(oauthAccounts.providerAccountId, twitchUser.id)
      ));
    } else {
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'twitch',
        providerAccountId: twitchUser.id,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        expiresAt: tokens.accessTokenExpiresAt(),
      });
    }

    if (stateData.flow === 'website') {
      const jwtToken = app.jwt.sign({ sub: userId }, { expiresIn: '7d' });
      reply.setCookie('auth_token', jwtToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'lax',
      });
      return reply.redirect(process.env.WEBSITE_URL ? `${process.env.WEBSITE_URL}/dashboard` : 'http://localhost:3001/dashboard');
    } else {
      // Desktop Flow: create temporary exchange code
      const exchangeCode = crypto.randomBytes(32).toString('hex');
      await redis.set(`auth:exchange:${exchangeCode}`, JSON.stringify({ userId }), 'EX', 300); // 5 min
      
      const deepLink = `${process.env.DESKTOP_DEEP_LINK!}?code=${exchangeCode}`;
      
      return reply.type('text/html').send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0A0A0A; color: white;">
            <h2>Authorization Successful!</h2>
            <p>You can close this window now. The application will resume shortly.</p>
            <script>
              window.location.href = "${deepLink}";
            </script>
          </body>
        </html>
      `);
    }
  });

  // Desktop Code Exchange
  app.post('/api/auth/desktop/exchange', async (request, reply) => {
    const { code, publicKey, deviceName, platform, appVersion } = request.body as any;

    if (!code || !publicKey) {
      return reply.status(400).send({ error: 'Missing code or publicKey' });
    }

    const redis = getRedis();
    const exchangeDataRaw = await redis.get(`auth:exchange:${code}`);
    
    if (!exchangeDataRaw) {
      return reply.status(400).send({ error: 'Invalid or expired exchange code' });
    }

    await redis.del(`auth:exchange:${code}`);
    
    const { userId } = JSON.parse(exchangeDataRaw);

    const db = getDb();
    
    // Register Device
    const [device] = await db.insert(devices).values({
      userId,
      name: deviceName || 'Unknown Device',
      platform: platform || 'unknown',
      publicKey,
      appVersion: appVersion || '1.0.0',
    }).returning({ id: devices.id });

    // Generate Application Session Refresh Token
    const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenPlain).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days valid

    await db.insert(sessions).values({
      userId,
      deviceId: device.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    // Generate short-lived Application JWT
    const accessToken = app.jwt.sign(
      { sub: userId, deviceId: device.id },
      { expiresIn: '15m' }
    );

    return reply.send({
      accessToken,
      refreshToken: refreshTokenPlain,
    });
  });

  // Proof of Possession Challenge Initiation
  app.post('/api/auth/desktop/challenge', async (request, reply) => {
    const { deviceId } = request.body as any;
    if (!deviceId) return reply.status(400).send({ error: 'Missing deviceId' });

    const db = getDb();
    const [device] = await db.select({ id: devices.id }).from(devices).where(eq(devices.id, deviceId));
    
    if (!device) return reply.status(404).send({ error: 'Device not found' });

    const challenge = crypto.randomBytes(32).toString('hex');
    const redis = getRedis();
    await redis.set(`auth:challenge:${deviceId}`, challenge, 'EX', 60); // 60 seconds TTL

    return reply.send({ challenge });
  });

  // Proof of Possession Verification
  app.post('/api/auth/desktop/verify', async (request, reply) => {
    const { deviceId, signature } = request.body as any;
    if (!deviceId || !signature) return reply.status(400).send({ error: 'Missing deviceId or signature' });

    const redis = getRedis();
    const challenge = await redis.get(`auth:challenge:${deviceId}`);
    
    if (!challenge) return reply.status(400).send({ error: 'Challenge expired or not found' });

    const db = getDb();
    const [device] = await db.select({ publicKey: devices.publicKey }).from(devices).where(eq(devices.id, deviceId));
    
    if (!device) return reply.status(404).send({ error: 'Device not found' });

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(challenge);
      verify.end();
      const isValid = verify.verify(device.publicKey, signature, 'base64');

      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      await redis.del(`auth:challenge:${deviceId}`);
      return reply.send({ success: true });
    } catch (e) {
      return reply.status(400).send({ error: 'Verification failed' });
    }
  });

  // Logout (revoke session)
  app.post('/api/auth/logout', async (request, reply) => {
    // Requires authentication, implemented via hook in a real setup.
    // For now, clear website cookie
    reply.clearCookie('auth_token', { path: '/' });
    return reply.send({ success: true });
  });
}
