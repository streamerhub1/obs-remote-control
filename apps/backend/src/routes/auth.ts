import { FastifyInstance } from 'fastify';
import { generateState } from 'arctic';
import { getTwitch, fetchTwitchUser } from '../services/twitch.js';
import { getDb } from '../db.js';
import { getRedis } from '../redis.js';
import { users, oauthAccounts } from '@obs-remote/database';
// drizzle-orm import is fine if added to package.json, or we use our db query
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
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
    const url = twitch.createAuthorizationURL(state, ['user:read:email']);

    reply.setCookie('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: 'lax',
    });

    reply.setCookie('auth_flow', 'website', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10,
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
    const url = twitch.createAuthorizationURL(state, ['user:read:email']);

    reply.setCookie('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: 'lax',
    });

    reply.setCookie('auth_flow', 'desktop', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  // Callback
  app.get('/auth/twitch/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string; error?: string };
    const storedState = request.cookies.oauth_state;
    const authFlow = request.cookies.auth_flow;

    if (!code || !state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid state or missing code' });
    }

    const twitch = getTwitch(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!
    );

    try {
      const tokens = await twitch.validateAuthorizationCode(code);
      const twitchUser = await fetchTwitchUser(tokens.accessToken());

      const db = getDb();
      // Upsert User
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.twitchId, twitchUser.id))
        .limit(1);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        await db
          .update(users)
          .set({
            twitchLogin: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
          })
          .where(eq(users.id, userId));
      } else {
        const inviteCode = generateInviteCode();
        const [newUser] = await db
          .insert(users)
          .values({
            twitchId: twitchUser.id,
            twitchLogin: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
            inviteCode,
            inviteCodeNormalized: inviteCode.toLowerCase(),
          })
          .returning({ id: users.id });
        userId = newUser.id;
      }

      // Upsert OAuth Account
      const [existingOauth] = await db
        .select()
        .from(oauthAccounts)
        .where(eq(oauthAccounts.providerAccountId, twitchUser.id))
        .limit(1);

      if (existingOauth) {
        await db
          .update(oauthAccounts)
          .set({
            encryptedAccessToken: tokens.accessToken(), // Ideally encrypt
            encryptedRefreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          })
          .where(eq(oauthAccounts.providerAccountId, twitchUser.id));
      } else {
        await db.insert(oauthAccounts).values({
          userId,
          provider: 'twitch',
          providerAccountId: twitchUser.id,
          encryptedAccessToken: tokens.accessToken(),
          encryptedRefreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
        });
      }

      if (authFlow === 'desktop') {
        // Desktop flow: Generate one-time exchange code
        const exchangeCode = crypto.randomBytes(32).toString('hex');
        const redis = getRedis();
        await redis.setex(`exchange:${exchangeCode}`, 300, userId); // 5 minutes

        const deepLink = process.env.DESKTOP_DEEP_LINK!;
        return reply.redirect(`${deepLink}?code=${exchangeCode}`);
      } else {
        // Website flow: Create session and redirect to frontend
        const sessionToken = await reply.jwtSign({ sub: userId });
        reply.setCookie('session', sessionToken, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        // Assuming website runs on 3001 or using frontend proxy
        return reply.redirect('http://localhost:3001/dashboard');
      }
    } catch (e) {
      app.log.error(e);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Desktop Exchange Code for Tokens
  app.post('/api/auth/desktop/exchange', async (request, reply) => {
    const { code, deviceName, platform, publicKey, appVersion } = request.body as any;
    if (!code || !deviceName || !platform || !publicKey) {
      return reply.status(400).send({ error: 'Missing parameters' });
    }

    const redis = getRedis();
    const userId = await redis.get(`exchange:${code}`);
    if (!userId) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    await redis.del(`exchange:${code}`);

    const db = getDb();
    
    // Check if device already exists based on publicKey or create new
    // We should probably just create a new device
    // Since we generate a new key pair on each clean login
    const { devices } = await import('@obs-remote/database');
    const [device] = await db
      .insert(devices)
      .values({
        userId,
        name: deviceName,
        platform,
        publicKey,
        appVersion: appVersion || '1.0.0',
      })
      .returning();

    // Create session
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const { sessions } = await import('@obs-remote/database');
    await db.insert(sessions).values({
      userId,
      deviceId: device.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const accessToken = await reply.jwtSign({ sub: userId, deviceId: device.id });

    return {
      accessToken,
      refreshToken,
      device,
    };
  });
}
