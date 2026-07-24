# StreamerHub Backend — Northflank Deployment Guide

## Prerequisites

- GitHub repository connected to Northflank
- Neon PostgreSQL database created
- Redis instance created (e.g. Upstash, Railway, or Northflank addon)
- Twitch Developer application created

---

## 1. Northflank Build Settings

| Setting         | Value         |
| --------------- | ------------- |
| Build type      | Dockerfile    |
| Dockerfile path | `/Dockerfile` |
| Build context   | `/`           |
| Branch          | `master`      |

---

## 2. Runtime Environment Variables

Set these in Northflank → Service → Environment:

```
NODE_ENV=production
PORT=3000

DATABASE_URL=<NEON_POOLED_CONNECTION_STRING>
DATABASE_DIRECT_URL=<NEON_DIRECT_CONNECTION_STRING>

REDIS_URL=<REDIS_CONNECTION_STRING>

TWITCH_CLIENT_ID=<TWITCH_CLIENT_ID>
TWITCH_CLIENT_SECRET=<TWITCH_CLIENT_SECRET>
TWITCH_REDIRECT_URI=https://<NORTHFLANK_PUBLIC_DOMAIN>/api/v1/auth/twitch/callback

DESKTOP_DEEP_LINK=streamerhub://auth/callback

JWT_SECRET=<RANDOM_SECRET_AT_LEAST_10_CHARS>
SESSION_SECRET=<ANOTHER_RANDOM_SECRET_AT_LEAST_10_CHARS>
TOKEN_ENCRYPTION_KEY=<EXACTLY_64_HEX_CHARACTERS>

WEBSITE_ORIGIN=https://<VERCEL_WEBSITE_DOMAIN>
```

### Where to get the values

| Variable               | Source                                                    |
| ---------------------- | --------------------------------------------------------- |
| `DATABASE_URL`         | Neon → Dashboard → Connection String → **Pooled**         |
| `DATABASE_DIRECT_URL`  | Neon → Dashboard → Connection String → **Direct**         |
| `REDIS_URL`            | Your Redis provider dashboard                             |
| `TWITCH_CLIENT_ID`     | [Twitch Developer Console](https://dev.twitch.tv/console) |
| `TWITCH_CLIENT_SECRET` | Twitch Developer Console → Manage → Client Secret         |
| `JWT_SECRET`           | Generate: `openssl rand -hex 32`                          |
| `SESSION_SECRET`       | Generate: `openssl rand -hex 32`                          |
| `TOKEN_ENCRYPTION_KEY` | Generate: `openssl rand -hex 32`                          |

---

## 3. Northflank Port Configuration

| Setting       | Value   |
| ------------- | ------- |
| Internal port | `3000`  |
| Protocol      | HTTP    |
| Public        | Enabled |

---

## 4. Health Checks

### Liveness Probe

| Setting       | Value     |
| ------------- | --------- |
| Path          | `/health` |
| Port          | `3000`    |
| Initial delay | 10s       |

### Readiness Probe

| Setting       | Value    |
| ------------- | -------- |
| Path          | `/ready` |
| Port          | `3000`   |
| Initial delay | 15s      |

The `/ready` endpoint checks both PostgreSQL and Redis connectivity.
Returns `200` when both are healthy, `503` when either is unavailable.

---

## 5. Twitch OAuth Setup

In the Twitch Developer Console, add this OAuth Redirect URL:

```
https://<NORTHFLANK_PUBLIC_DOMAIN>/api/v1/auth/twitch/callback
```

This must **exactly match** the `TWITCH_REDIRECT_URI` environment variable.

---

## 6. Vercel Website Configuration

The website needs only one environment variable:

```
NEXT_PUBLIC_API_URL=https://<NORTHFLANK_PUBLIC_DOMAIN>
```

After setting this variable in Vercel, **redeploy** the website.

The website does NOT need `DATABASE_URL`, `REDIS_URL`, or any secrets.

---

## 7. Desktop App

For development, no configuration is needed (defaults to `localhost:3000`).

For a production build, create `apps/desktop/.env` with:

```
VITE_STREAMERHUB_API_URL=https://<NORTHFLANK_PUBLIC_DOMAIN>
VITE_STREAMERHUB_WS_URL=wss://<NORTHFLANK_PUBLIC_DOMAIN>
```

These are injected at **compile time** by electron-vite.

---

## 8. Verifying the Deployment

After Northflank builds and starts the container:

```bash
# Health check
curl https://<NORTHFLANK_PUBLIC_DOMAIN>/health
# Expected: {"status":"ok","timestamp":"..."}

# Readiness check
curl https://<NORTHFLANK_PUBLIC_DOMAIN>/ready
# Expected: {"status":"ready","checks":{"db":"ok","redis":"ok"},"timestamp":"..."}
```

---

## 9. Troubleshooting

| Symptom                      | Likely cause                                       |
| ---------------------------- | -------------------------------------------------- |
| Container crashes on startup | Missing environment variable or migration failure  |
| `/ready` returns 503         | PostgreSQL or Redis connection string is wrong     |
| Twitch login fails           | `TWITCH_REDIRECT_URI` doesn't match Twitch console |
| CORS errors from website     | `WEBSITE_ORIGIN` doesn't match the Vercel domain   |
| Desktop can't connect        | `VITE_STREAMERHUB_API_URL` not set at build time   |
