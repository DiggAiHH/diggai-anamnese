# =============================================================================
# DiggAI Anamnese Platform - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Security features:
# - Non-root user execution
# - Minimal Alpine base image
# - No build tools in final image
# - Health check enabled
# - Secrets managed via environment variables
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

# Security: Install security updates
RUN apk add --no-cache dumb-init ca-certificates

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 2: Builder (for compiled/bundled output)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Build application (if needed)
# RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

# Security: Metadata
LABEL maintainer="DiggAI Security Team <security@diggai.de>"
LABEL version="3.0.0"
LABEL description="DiggAI Anamnese Platform - Production"

# Security: Install minimal runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    && rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Security: Set proper permissions
RUN chown -R nextjs:nodejs /app

# Copy built application
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package*.json ./
COPY --chown=nextjs:nodejs server ./server
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs logs ./logs

# Create required directories with proper permissions
RUN mkdir -p /app/logs /app/tmp /app/backups && \
    chown -R nextjs:nodejs /app/logs /app/tmp /app/backups && \
    chmod 755 /app/logs /app/tmp /app/backups

# Security: Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3001

# Health check
# Checks the /api/system/health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/system/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server/index.js"]

# -----------------------------------------------------------------------------
# Security Notes
# -----------------------------------------------------------------------------
# 1. Non-root user (nextjs:nodejs) runs the application
# 2. No build tools or dev dependencies in final image
# 3. Minimal Alpine Linux base reduces attack surface
# 4. Secrets must be passed via environment variables at runtime
# 5. Health check ensures container is marked unhealthy if app fails
# 6. dumb-init handles zombie processes and signal forwarding
# -----------------------------------------------------------------------------
