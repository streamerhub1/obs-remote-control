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
  familyId: uuid('family_id').notNull(), // all tokens in the same refresh chain
  replacedBySessionId: uuid('replaced_by_session_id'), // detecting reuse
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moderatorRelationships = pgTable('moderator_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  streamerId: uuid('streamer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moderatorId: uuid('moderator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, active, paused, rejected, revoked
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at'),
  pausedAt: timestamp('paused_at'),
  revokedAt: timestamp('revoked_at'),
  permissionsVersion: uuid('permissions_version').defaultRandom().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    streamerModeratorIndex: uniqueIndex('streamer_moderator_idx').on(table.streamerId, table.moderatorId),
  };
});

export const moderatorPermissions = pgTable('moderator_permissions', {
  relationshipId: uuid('relationship_id').references(() => moderatorRelationships.id, { onDelete: 'cascade' }).notNull(),
  permissionKey: text('permission_key').notNull(),
  allowed: boolean('allowed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    relationshipPermissionIndex: uniqueIndex('relationship_permission_idx').on(table.relationshipId, table.permissionKey),
  };
});

export const remoteSessions = pgTable('remote_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').unique().notNull(),
  streamerId: uuid('streamer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moderatorId: uuid('moderator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  streamerDeviceId: uuid('streamer_device_id').references(() => devices.id),
  moderatorDeviceId: uuid('moderator_device_id').references(() => devices.id),
  relationshipId: uuid('relationship_id').references(() => moderatorRelationships.id).notNull(),
  status: varchar('status', { length: 20 }).default('creating').notNull(), // creating, signaling, connecting, active, reconnecting, closed, failed, revoked
  transport: varchar('transport', { length: 20 }).default('unknown').notNull(), // direct, relay, unknown
  permissionsVersion: text('permissions_version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  connectedAt: timestamp('connected_at'),
  endedAt: timestamp('ended_at'),
  expiresAt: timestamp('expires_at').notNull(),
  closeReason: text('close_reason'),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  targetUserId: uuid('target_user_id').references(() => users.id),
  relationshipId: uuid('relationship_id').references(() => moderatorRelationships.id),
  remoteSessionId: uuid('remote_session_id').references(() => remoteSessions.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  success: boolean('success').notNull(),
  metadataJson: json('metadata_json'),
  requestId: text('request_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
