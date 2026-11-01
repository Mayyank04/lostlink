# ==============================================================================
# LOSTLINK 2.0 — NEXT.JS PRODUCTION WEB APPLICATION CONTAINER
# Multi-stage Docker build targeting Debian-slim (Node 20 LTS)
# ==============================================================================

# STAGE 1: Dependencies & Prisma Generation
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci && npx prisma generate

# STAGE 2: Application Production Builder
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://lostlink:lostlink@localhost:5432/lostlink?schema=public"
ENV NEXTAUTH_SECRET="build-time-secret-key-for-standalone-32chars"
ENV NEXTAUTH_URL="http://localhost:3000"

RUN npm run build

# STAGE 3: Minimal Production Runner
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for container security compliance
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Copy standalone Next.js server bundle
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/live || exit 1

CMD ["node", "server.js"]
