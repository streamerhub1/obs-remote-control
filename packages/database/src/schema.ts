import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  json,
  boolean,
  varchar,
  integer,
  jsonb,
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
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const oauthAccounts = pgTable('oauth_accounts', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
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
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  publicKey: text('public_key').notNull(),
  appVersion: text('app_version').notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  familyId: uuid('family_id').notNull(),
  replacedBySessionId: uuid('replaced_by_session_id'),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moderatorRelationships = pgTable('moderator_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  streamerId: uuid('streamer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moderatorId: uuid('moderator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
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
  status: varchar('status', { length: 20 }).default('creating').notNull(),
  transport: varchar('transport', { length: 20 }).default('relay').notNull(),
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

// --- SOCIAL NETWORK MODELS ---

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  bannerUrl: text('banner_url'),
  bio: text('bio'),
  languages: jsonb('languages').default([]).notNull(), // array of strings
  categories: jsonb('categories').default([]).notNull(), // array of strings
  socialLinks: jsonb('social_links').default([]).notNull(), // array of objects
  timezone: text('timezone').default('UTC').notNull(),
  collaborationAvailability: boolean('collaboration_availability').default(true).notNull(),
  followersCount: integer('followers_count').default(0).notNull(),
  followingCount: integer('following_count').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    followerFollowingIdx: uniqueIndex('follower_following_idx').on(table.followerId, table.followingId),
  };
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  mediaUrls: jsonb('media_urls').default([]).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  commentsCount: integer('comments_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    authorCreatedAtIdx: uniqueIndex('posts_author_created_at_idx').on(table.authorId, table.createdAt),
  };
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const reactions = pgTable('reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: varchar('target_type', { length: 20 }).notNull(), // post, comment
  targetId: uuid('target_id').notNull(),
  reactionType: varchar('reaction_type', { length: 20 }).default('like').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userReactionTargetIdx: uniqueIndex('user_reaction_target_idx').on(table.userId, table.targetType, table.targetId, table.reactionType),
  };
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // follow, like, comment, mention, collab_invite, session_request
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- COLLABORATIONS ---

export const collaborations = pgTable('collaborations', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  language: text('language'),
  startAt: timestamp('start_at').notNull(),
  expectedDurationMinutes: integer('expected_duration_minutes').notNull(),
  timezone: text('timezone').notNull(),
  maximumParticipants: integer('maximum_participants').notNull(),
  requirementsJson: jsonb('requirements_json').default({}).notNull(),
  applicationMode: varchar('application_mode', { length: 20 }).default('approval').notNull(), // approval, open
  visibility: varchar('visibility', { length: 20 }).default('public').notNull(), // public, private, invite_only
  status: varchar('status', { length: 20 }).default('open').notNull(), // open, closed, cancelled, completed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    ownerStatusIdx: uniqueIndex('collab_owner_status_idx').on(table.ownerId, table.status),
  };
});

export const collaborationParticipants = pgTable('collaboration_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  collaborationId: uuid('collaboration_id').references(() => collaborations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('participant').notNull(), // owner, participant
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
  return {
    collaborationUserIdx: uniqueIndex('collaboration_user_idx').on(table.collaborationId, table.userId),
  };
});

export const collaborationApplications = pgTable('collaboration_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  collaborationId: uuid('collaboration_id').references(() => collaborations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  message: text('message'),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, accepted, rejected
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    collabAppUserIdx: uniqueIndex('collab_app_user_idx').on(table.collaborationId, table.userId),
  };
});

export const collaborationInvitations = pgTable('collaboration_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  collaborationId: uuid('collaboration_id').references(() => collaborations.id, { onDelete: 'cascade' }).notNull(),
  inviterId: uuid('inviter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  inviteeId: uuid('invitee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, accepted, declined
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    collabInviteUserIdx: uniqueIndex('collab_invite_user_idx').on(table.collaborationId, table.inviteeId),
  };
});

// --- CALENDAR ---

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  timezone: text('timezone').notNull(),
  recurrenceRule: text('recurrence_rule'), // optional RRULE string
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // scheduled, cancelled, completed
  visibility: varchar('visibility', { length: 20 }).default('private').notNull(), // private, public
  sourceType: varchar('source_type', { length: 50 }).notNull(), // collaboration, stream, personalPlan, reminder
  sourceId: uuid('source_id'), // e.g. collaboration ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    ownerStartEndIdx: uniqueIndex('calendar_owner_start_end_idx').on(table.ownerId, table.startAt, table.endAt),
  };
});
