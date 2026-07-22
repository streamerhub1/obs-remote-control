# API и события

## REST

```text
GET  /api/v1/auth/twitch/start
GET  /api/v1/auth/twitch/callback
POST /api/v1/auth/desktop/request
POST /api/v1/auth/desktop/exchange
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

GET    /api/v1/me
POST   /api/v1/me/invite-code/reset
DELETE /api/v1/me

GET    /api/v1/devices
POST   /api/v1/devices/register
DELETE /api/v1/devices/:id

GET    /api/v1/moderators
POST   /api/v1/moderators/invitations
POST   /api/v1/moderators/invitations/:id/accept
POST   /api/v1/moderators/invitations/:id/reject
PATCH  /api/v1/moderators/:relationshipId
DELETE /api/v1/moderators/:relationshipId

GET  /api/v1/access/streamers
POST /api/v1/remote-sessions
GET  /api/v1/remote-sessions
DELETE /api/v1/remote-sessions/:id

GET  /api/v1/billing/subscription
POST /api/v1/billing/checkout
POST /api/v1/billing/portal
POST /api/v1/billing/webhook

GET /api/v1/releases/latest
```

## Signaling

```text
signaling.join
signaling.offer
signaling.answer
signaling.ice
signaling.ready
signaling.close
session.revoked
```

## Realtime account events

```text
user.updated
subscription.updated
moderator.invited
moderator.accepted
moderator.revoked
remoteSession.created
remoteSession.revoked
device.revoked
release.available
```

## Error codes

```text
AUTH_REQUIRED
TOKEN_EXPIRED
DEVICE_REVOKED
INVITE_CODE_NOT_FOUND
RELATIONSHIP_EXISTS
RELATIONSHIP_NOT_ACTIVE
PERMISSION_DENIED
SUBSCRIPTION_REQUIRED
SESSION_EXPIRED
STREAMER_OFFLINE
OBS_NOT_CONNECTED
P2P_FAILED
RATE_LIMITED
VALIDATION_ERROR
```

API использует `/api/v1`, request ID, Zod, OpenAPI и единый формат ошибок.
