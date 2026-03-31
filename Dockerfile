# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy server source and build
COPY server/ ./server/
COPY tsconfig*.json ./

# Build server TypeScript
RUN npx tsc -p tsconfig.server.json

# ─── Stage 2: Production ────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Tini for proper PID 1 handling
RUN apk add --no-cache tini wget

# Copy production node_modules
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx bcryptjs

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy server source (tsx runs .ts directly at runtime)
COPY server/ ./server/

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads

# Security: Run as non-root
USER node

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && (npx prisma db seed || echo 'Seed skipped, continuing...') && node --import tsx server/index.ts"]
