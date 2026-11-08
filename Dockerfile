# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS frontend-build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
RUN npm run build

FROM base AS api-build
WORKDIR /app
# postinstall genera Prisma: necesita el esquema y la configuración antes de npm ci.
COPY api/package.json api/package-lock.json api/prisma.config.ts ./
COPY api/prisma/ ./prisma/
RUN npm ci --no-audit --no-fund
COPY api/ ./
RUN npm run build && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_PATH=public
WORKDIR /app
COPY --from=api-build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=api-build --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=api-build --chown=node:node /app/dist/ ./dist/
COPY --from=frontend-build --chown=node:node /app/dist/ ./public/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health', { signal: AbortSignal.timeout(3000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/app.js"]
