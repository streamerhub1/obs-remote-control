FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV="production"

RUN corepack enable \
    && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy everything (.dockerignore excludes .git, node_modules, dist, etc.)
COPY . .

# Install all dependencies (devDependencies needed for TypeScript build)
RUN NODE_ENV=development pnpm install --frozen-lockfile

# Build backend and all its workspace dependencies
RUN pnpm --filter @obs-remote/backend... build

EXPOSE 3000

# Run migrations then start the server.
# Migration failure (non-zero exit) stops the container.
CMD ["sh", "-c", "node packages/database/dist/migrate.js && node apps/backend/dist/server.js"]
