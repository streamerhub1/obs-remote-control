import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { generateState, generateCodeVerifier } from 'arctic';
import { getTwitchOAuth, fetchTwitchUser } from '../services/twitch.js';
import { getDb } from '../db.js';
import { getRedis } from '../redis.js';
import { users, oauthAccounts, devices, sessions } from '@obs-remote/database';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { encryptToken } from '../utils/encryption.js';
import { generateInviteCode } from '../utils/crypto.js';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getSessionPublicKey } from '../utils/sessionToken.js';

export default async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get('/desktop/public-key', async (request, reply) => {
    return { publicKey: getSessionPublicKey() };
  });

  server.get('/desktop/login', async (request, reply) => {
    const oauthClient = getTwitchOAuth(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!,
    );
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    // Twitch uses S256 for code_challenge_method (value 0 in arctic CodeChallengeMethod enum)
    const url = oauthClient.createAuthorizationURLWithPKCE(
      'https://id.twitch.tv/oauth2/authorize',
      state,
      0, // S256
      codeVerifier,
      [],
    );

    const redis = getRedis();
    await redis.set(
      `auth:state:${state}`,
      JSON.stringify({
        flow: 'desktop',
        codeVerifier,
      }),
      'EX',
      600,
    ); // 10 minutes TTL

    reply.setCookie('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 600,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  server.get('/twitch/callback', async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };
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
      return reply
        .status(400)
        .send({ error: 'Login request expired or invalid' });
    }

    await redis.del(`auth:state:${state}`);
    reply.clearCookie('oauth_state', { path: '/' });

    const stateData = JSON.parse(stateDataRaw);

    if (!code) {
      return reply.status(400).send({ error: 'No code provided' });
    }

    const oauthClient = getTwitchOAuth(
      process.env.TWITCH_CLIENT_ID!,
      process.env.TWITCH_CLIENT_SECRET!,
      process.env.TWITCH_REDIRECT_URI!,
    );

    let tokens;
    try {
      tokens = await oauthClient.validateAuthorizationCode(
        'https://id.twitch.tv/oauth2/token',
        code,
        stateData.codeVerifier,
      );
    } catch (err) {
      return reply
        .status(400)
        .send({ error: 'Failed to validate authorization code' });
    }

    const twitchUser = await fetchTwitchUser(tokens.accessToken());
    const db = getDb();

    let userId: string;
    await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.twitchId, twitchUser.id));

      if (!existingUser) {
        let newCode = '';
        let codeSuccess = false;
        while (!codeSuccess) {
          newCode = generateInviteCode();
          try {
            const [newUser] = await tx
              .insert(users)
              .values({
                twitchId: twitchUser.id,
                twitchLogin: twitchUser.login,
                displayName: twitchUser.display_name,
                avatarUrl: twitchUser.profile_image_url,
                inviteCode: newCode,
                inviteCodeNormalized: newCode.toLowerCase(),
              })
              .returning({ id: users.id });
            userId = newUser.id;
            codeSuccess = true;
          } catch (e: unknown) {
            if (e && typeof e === 'object' && 'code' in e && e.code !== '23505')
              throw e;
          }
        }
      } else {
        userId = existingUser.id;
        await tx
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

      const [existingOauth] = await tx
        .select({ userId: oauthAccounts.userId })
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, 'twitch'),
            eq(oauthAccounts.providerAccountId, twitchUser.id),
          ),
        );

      if (existingOauth) {
        await tx
          .update(oauthAccounts)
          .set({
            encryptedAccessToken: encryptedAccess,
            encryptedRefreshToken: encryptedRefresh,
            expiresAt: tokens.accessTokenExpiresAt(),
          })
          .where(
            and(
              eq(oauthAccounts.provider, 'twitch'),
              eq(oauthAccounts.providerAccountId, twitchUser.id),
            ),
          );
      } else {
        await tx.insert(oauthAccounts).values({
          userId,
          provider: 'twitch',
          providerAccountId: twitchUser.id,
          encryptedAccessToken: encryptedAccess,
          encryptedRefreshToken: encryptedRefresh,
          expiresAt: tokens.accessTokenExpiresAt(),
        });
      }
    });

    if (stateData.flow === 'website') {
      // Not implemented in this step, but placeholders.
      return reply.status(400).send({ error: 'Website flow not implemented' });
    } else {
      const exchangeCode = crypto.randomBytes(32).toString('hex');
      await redis.set(
        `auth:exchange:${exchangeCode}`,
        JSON.stringify({ userId: userId! }),
        'EX',
        300,
      );

      const deepLink = `streamerhub://auth/callback?code=${exchangeCode}`;

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

  server.post(
    '/desktop/exchange',
    {
      schema: {
        body: z.object({
          code: z.string(),
          publicKey: z.string(),
          deviceName: z.string(),
          platform: z.string(),
          appVersion: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            deviceId: z.string().uuid(),
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { code, publicKey, deviceName, platform, appVersion } =
        request.body;

      const redis = getRedis();
      const exchangeDataRaw = await redis.get(`auth:exchange:${code}`);

      if (!exchangeDataRaw) {
        return reply
          .status(400)
          .send({ error: 'Invalid or expired exchange code' });
      }

      await redis.del(`auth:exchange:${code}`);
      const { userId } = JSON.parse(exchangeDataRaw);
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [device] = await tx
          .insert(devices)
          .values({
            userId,
            name: deviceName,
            platform,
            publicKey,
            appVersion,
          })
          .returning({ id: devices.id });

        const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
        const refreshTokenHash = crypto
          .createHash('sha256')
          .update(refreshTokenPlain)
          .digest('hex');

        const familyId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await tx.insert(sessions).values({
          userId,
          deviceId: device.id,
          tokenHash: refreshTokenHash,
          familyId,
          expiresAt,
        });

        const accessToken = app.jwt.sign(
          { sub: userId, deviceId: device.id },
          { expiresIn: '15m' },
        );

        return {
          accessToken,
          refreshToken: refreshTokenPlain,
          deviceId: device.id,
        };
      });
    },
  );

  server.post(
    '/desktop/challenge',
    {
      schema: {
        body: z.object({ deviceId: z.string().uuid() }),
        response: {
          200: z.object({ challenge: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { deviceId } = request.body;
      const db = getDb();
      const [device] = await db
        .select({ id: devices.id, revokedAt: devices.revokedAt })
        .from(devices)
        .where(eq(devices.id, deviceId));

      if (!device) return reply.status(404).send({ error: 'Device not found' });
      if (device.revokedAt)
        return reply.status(403).send({ error: 'Device revoked' });

      const challenge = crypto.randomBytes(32).toString('hex');
      const redis = getRedis();
      await redis.set(`auth:challenge:${deviceId}`, challenge, 'EX', 60);

      return { challenge };
    },
  );

  server.post(
    '/desktop/refresh',
    {
      schema: {
        body: z.object({
          deviceId: z.string().uuid(),
          refreshToken: z.string(),
          signature: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { deviceId, refreshToken, signature } = request.body;

      const redis = getRedis();
      const challenge = await redis.get(`auth:challenge:${deviceId}`);

      if (!challenge)
        return reply
          .status(400)
          .send({ error: 'Challenge expired or not found' });
      await redis.del(`auth:challenge:${deviceId}`);

      const db = getDb();

      return await db.transaction(async (tx) => {
        const [device] = await tx
          .select({
            publicKey: devices.publicKey,
            revokedAt: devices.revokedAt,
            userId: devices.userId,
          })
          .from(devices)
          .where(eq(devices.id, deviceId));

        if (!device)
          return reply.status(404).send({ error: 'Device not found' });
        if (device.revokedAt)
          return reply.status(403).send({ error: 'Device revoked' });

        try {
          const isValid = crypto.verify(
            null,
            Buffer.from(challenge),
            device.publicKey,
            Buffer.from(signature, 'base64'),
          );
          if (!isValid) {
            return reply.status(401).send({ error: 'Invalid signature' });
          }
        } catch (e) {
          return reply.status(400).send({ error: 'Verification failed' });
        }

        const refreshTokenHash = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        const [session] = await tx
          .select()
          .from(sessions)
          .where(eq(sessions.tokenHash, refreshTokenHash));

        if (!session) {
          return reply.status(401).send({ error: 'Invalid refresh token' });
        }

        // Reuse detection
        if (session.revokedAt || session.replacedBySessionId) {
          // Token reuse detected! Revoke the entire token family.
          await tx
            .update(sessions)
            .set({ revokedAt: new Date() })
            .where(eq(sessions.familyId, session.familyId));
          return reply
            .status(401)
            .send({ error: 'Token reuse detected. Family revoked.' });
        }

        if (session.expiresAt < new Date()) {
          return reply.status(401).send({ error: 'Refresh token expired' });
        }

        const newRefreshTokenPlain = crypto.randomBytes(32).toString('hex');
        const newRefreshTokenHash = crypto
          .createHash('sha256')
          .update(newRefreshTokenPlain)
          .digest('hex');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const [newSession] = await tx
          .insert(sessions)
          .values({
            userId: device.userId,
            deviceId: deviceId,
            tokenHash: newRefreshTokenHash,
            familyId: session.familyId,
            expiresAt,
          })
          .returning({ id: sessions.id });

        await tx
          .update(sessions)
          .set({
            replacedBySessionId: newSession.id,
            lastUsedAt: new Date(),
            revokedAt: new Date(),
          })
          .where(eq(sessions.id, session.id));

        await tx
          .update(devices)
          .set({ lastSeenAt: new Date() })
          .where(eq(devices.id, deviceId));

        const accessToken = app.jwt.sign(
          { sub: device.userId, deviceId: deviceId },
          { expiresIn: '15m' },
        );

        return {
          accessToken,
          refreshToken: newRefreshTokenPlain,
        };
      });
    },
  );

  server.post(
    '/logout',
    {
      schema: {
        body: z.object({
          refreshToken: z.string().optional(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      if (refreshToken) {
        const refreshTokenHash = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');
        const db = getDb();
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.tokenHash, refreshTokenHash));
      }

      reply.clearCookie('auth_token', { path: '/' });
      return { success: true };
    },
  );
}
