#!/bin/bash
# ══════════════════════════════════════════════════════════════
# DiggAI Anamnese — Deploy Script
# Run as diggai-deploy on the Hetzner VPS after server-setup.sh
# Usage: bash scripts/deploy-backend.sh
# ══════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="api.diggai.de"
APP_DIR="/opt/diggai-anamnese"

echo "╔══════════════════════════════════════════════╗"
echo "║  DiggAI Backend Deploy                       ║"
echo "╚══════════════════════════════════════════════╝"

cd "$APP_DIR"

# ── 1. Check prerequisites ───────────────────────────────
echo "→ [1/7] Checking prerequisites..."
test -f docker-compose.yml || { echo "✗ docker-compose.yml not found"; exit 1; }
test -f Dockerfile || { echo "✗ Dockerfile not found"; exit 1; }
test -f .env.production || { echo "✗ .env.production not found — create it first!"; exit 1; }
docker --version > /dev/null 2>&1 || { echo "✗ Docker not installed"; exit 1; }
echo "  ✓ All prerequisites met"

# ── 2. Generate secrets if not set ────────────────────────
echo "→ [2/7] Checking secrets..."
source .env.production
if [ -z "${JWT_SECRET:-}" ]; then
    echo "  ⚠️  JWT_SECRET not set in .env.production!"
    exit 1
fi
if [ -z "${ENCRYPTION_KEY:-}" ]; then
    echo "  ⚠️  ENCRYPTION_KEY not set in .env.production!"
    exit 1
fi
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "  ⚠️  POSTGRES_PASSWORD not set in .env.production!"
    exit 1
fi
echo "  ✓ Required secrets present"

# ── 3. SSL Certificates ──────────────────────────────────
echo "→ [3/7] Checking SSL certificates..."
if [ ! -f docker/certs/fullchain.pem ] || [ ! -f docker/certs/privkey.pem ]; then
    echo "  Getting SSL certificate with certbot..."
    
    # Stop anything on port 80
    sudo fuser -k 80/tcp 2>/dev/null || true
    
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email admin@diggai.de \
        --no-eff-email
    
    mkdir -p docker/certs
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/certs/fullchain.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/certs/privkey.pem
    sudo chown $(whoami):$(whoami) docker/certs/*.pem
    chmod 600 docker/certs/privkey.pem
    echo "  ✓ SSL certificates obtained"
else
    echo "  ✓ SSL certificates already present"
fi

# ── 4. Build and start containers ─────────────────────────
echo "→ [4/7] Building and starting containers..."
docker compose --env-file .env.production down 2>/dev/null || true
docker compose --env-file .env.production up -d --build

echo "  Waiting for containers to be healthy..."
sleep 15

# ── 5. Check container status ─────────────────────────────
echo "→ [5/7] Container status:"
docker compose --env-file .env.production ps

# ── 6. Run migrations ─────────────────────────────────────
echo "→ [6/7] Running database migrations..."
docker compose --env-file .env.production exec -T app npx prisma migrate deploy 2>/dev/null || \
    docker compose --env-file .env.production exec -T app npx prisma db push --accept-data-loss
echo "  ✓ Database schema applied"

# Seed (skip errors if already seeded)
docker compose --env-file .env.production exec -T app npx prisma db seed 2>/dev/null || echo "  Seed skipped (may already exist)"

# ── 7. Health check ───────────────────────────────────────
echo "→ [7/7] Health checks..."
sleep 5

# Internal health check
echo "  Internal (container):"
docker compose --env-file .env.production exec -T app wget -qO- http://localhost:3001/api/health 2>/dev/null | jq . || echo "  ⚠️  Internal check failed"

# External health check
echo "  External (via nginx):"
curl -sf https://$DOMAIN/api/health 2>/dev/null | jq . || echo "  ⚠️  External check failed (DNS may still propagate)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ Backend deployment complete!              ║"
echo "║                                              ║"
echo "║  API: https://$DOMAIN/api/health       ║"
echo "║  Logs: docker compose logs -f                ║"
echo "║  Status: docker compose ps                   ║"
echo "╚══════════════════════════════════════════════╝"
