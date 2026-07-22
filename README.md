# OBS Remote Control

Secure P2P remote control for OBS Studio.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Setup

1. `pnpm install --frozen-lockfile`
2. Setup env: `cp infrastructure/docker/.env.example infrastructure/docker/.env`
3. Start infrastructure: `docker compose -f infrastructure/docker/docker-compose.yml up -d`

## Commands

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run ESLint across the workspace
- `pnpm typecheck` - Run TypeScript checks
- `pnpm test` - Run Vitest test suite
- `pnpm format:check` - Check formatting

## Structure

- `apps/backend` - Fastify backend (Health route setup)
- `apps/website` - Next.js App Router (Base page setup)
- `apps/desktop` - Electron + React + Vite (Window config and IPC setup)
- `packages/env` - Zod environment validation
- `packages/logger` - Pino logger
- `packages/shared-types` - Common errors and types
- `packages/validation` - Zod schemas

## Current Status

- ✅ Monorepo foundation established
- ✅ Apps scaffolded and building
- ✅ Packages established with unit tests
- ❌ Twitch OAuth (Next step)
- ❌ WebRTC P2P
- ❌ OBS Connection
