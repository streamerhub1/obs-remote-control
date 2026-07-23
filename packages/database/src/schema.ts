import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  json,
  boolean,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  twitchId: text('twitch_id').unique().notNull(),
  twitchLogin: text('twitch_login').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  inviteCode: text('invite_code').unique().notNull(),
  inviteCodeNormalized: text('invite_code_normalized').unique().notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const oauthAccounts = pgTable('oauth_accounts', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  encryptedAccessToken: text('encrypted_access_token').notNull(),
  encryptedRefreshToken: text('encrypted_refresh_token'),
  expiresAt: timestamp('expires_at'),
  scopes: text('scopes'),
}, (table) => {
  return {
    providerAccountIdIndex: uniqueIndex('provider_account_id_idx').on(table.provider, table.providerAccountId),
  };
});

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  publicKey: text('public_key').notNull(),
  appVersion: text('app_version').notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  deviceId: uuid('device_id')
    .references(() => devices.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
