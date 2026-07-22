# База данных

## users

- id UUID;
- twitch_id unique;
- twitch_login;
- display_name;
- avatar_url;
- invite_code unique;
- invite_code_normalized unique;
- status;
- created_at;
- updated_at;
- deleted_at.

## oauth_accounts

- user_id;
- provider;
- provider_account_id;
- encrypted access/refresh tokens;
- expires_at;
- scopes.

## devices

- id;
- user_id;
- name;
- platform;
- public_key;
- app_version;
- last_seen_at;
- revoked_at.

## moderator_relationships

- id;
- streamer_id;
- moderator_id;
- status: pending, active, paused, rejected, revoked;
- created_at;
- accepted_at;
- revoked_at.

Уникальная пара: `streamer_id + moderator_id`.

## moderator_permissions

- relationship_id;
- permission_key;
- allowed;
- updated_at.

## subscriptions

- user_id;
- provider;
- provider_customer_id;
- provider_subscription_id;
- plan;
- status;
- current_period_start;
- current_period_end;
- cancel_at_period_end.

## entitlements

- user_id;
- key;
- value_json;
- source;
- expires_at.

## remote_sessions

- streamer_id;
- moderator_id;
- streamer_device_id;
- moderator_device_id;
- status;
- started_at;
- ended_at;
- close_reason;
- session_public_id.

## audit_logs

- actor_user_id;
- target_user_id;
- remote_session_id;
- action;
- resource_type;
- metadata_json;
- success;
- created_at.

## releases

- channel;
- platform;
- architecture;
- version;
- download_url;
- signature;
- sha256;
- mandatory;
- published_at.
