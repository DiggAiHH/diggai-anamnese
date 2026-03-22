#!/bin/bash
#
# DiggAI One-Click Deployment Script
# Usage: curl -fsSL https://diggai.de/install.sh | bash
#
# Engineering Principles:
# - Idempotent: Can run multiple times safely
# - Fail-fast: Exit on first error with clear message
# - Verbose: Show what's happening
# - Self-contained: Minimal external dependencies

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/diggai}"
VERSION="${VERSION:-latest}"
REPO_URL="https://github.com/diggai/anamnese-platform"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "Do not run this script as root"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This script supports Linux only (Ubuntu 20.04+, Debian 11+, CentOS 8+)"
        exit 1
    fi
    
    # Check available tools
    local required=("curl" "git" "docker" "docker-compose")
    local missing=()
    
    for cmd in "${required[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install:"
        log_info "  curl: sudo apt-get install curl"
        log_info "  git:  sudo apt-get install git"
        log_info "  docker: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check available ports
    local ports=("80" "443" "3001" "5432")
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            log_warn "Port $port is already in use"
        fi
    done
    
    log_success "System requirements met"
}

# Create installation directory
setup_directory() {
    log_info "Setting up installation directory: $INSTALL_DIR"
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warn "Directory $INSTALL_DIR already exists"
        read -p "Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Installation cancelled"
            exit 1
        fi
        sudo rm -rf "$INSTALL_DIR"
    fi
    
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$USER:$USER" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    log_success "Directory created"
}

# Clone repository
clone_repo() {
    log_info "Cloning DiggAI repository..."
    
    if [[ "$VERSION" == "latest" ]]; then
        git clone --depth 1 "$REPO_URL" .
    else
        git clone --branch "$VERSION" --depth 1 "$REPO_URL" .
    fi
    
    log_success "Repository cloned"
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    JWT_SECRET=$(openssl rand -base64 48)
    ENCRYPTION_KEY=$(openssl rand -base64 24 | cut -c1-32)
    DB_PASSWORD=$(openssl rand -base64 24)
    
    log_success "Secrets generated"
}

# Create environment file
create_env() {
    log_info "Creating environment configuration..."
    
    cat > .env.production << EOF
# DiggAI Anamnese Platform - Production Environment
# Generated: $(date)

# Database
DATABASE_URL="postgresql://diggai:${DB_PASSWORD}@postgres:5432/anamnese?schema=public"

# Security
JWT_SECRET="${JWT_SECRET}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"
ARZT_PASSWORD="$(openssl rand -base64 12)"

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://\${DOMAIN:-localhost}

# Optional: Redis (for token blacklisting)
# REDIS_URL=redis://redis:6379

# Optional: Stripe (for billing)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# Optional: Email
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=

# Feature Flags
NFC_ENABLED=true
TELEMED_ENABLED=true
PAYMENT_ENABLED=false
TI_ENABLED=false
EOF
    
    log_success "Environment file created at .env.production"
    log_warn "IMPORTANT: Save these credentials securely!"
    log_info "Admin Password: $(grep ARZT_PASSWORD .env.production | cut -d'"' -f2)"
}

# Create docker-compose override
create_docker_override() {
    log_info "Creating Docker Compose configuration..."
    
    cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  app:
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U diggai"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped

volumes:
  postgres_data:
EOF
    
    log_success "Docker Compose override created"
}

# Start services
start_services() {
    log_info "Starting DiggAI services..."
    
    docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml pull
    docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
    
    log_info "Waiting for database to be ready..."
    sleep 10
    
    log_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml \
        exec -T app npx prisma migrate deploy
    
    log_info "Seeding database..."
    docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml \
        exec -T app npx prisma db seed
    
    log_success "Services started successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    read -p "Enter your domain (e.g., praxis.example.com): " DOMAIN
    
    if [[ -z "$DOMAIN" ]]; then
        log_warn "No domain provided, skipping SSL setup"
        return
    fi
    
    # Update nginx config with domain
    sed -i "s/\${DOMAIN}/$DOMAIN/g" docker/nginx.conf
    
    # Run certbot
    docker run -it --rm \
        -v "$INSTALL_DIR/certbot/conf:/etc/letsencrypt" \
        -v "$INSTALL_DIR/certbot/www:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        -d "$DOMAIN" \
        --agree-tos \
        --non-interactive \
        --email "admin@$DOMAIN"
    
    log_success "SSL certificates installed for $DOMAIN"
}

# Create backup cron job
setup_backups() {
    log_info "Setting up automated backups..."
    
    sudo tee /etc/cron.d/diggai-backup > /dev/null << EOF
# DiggAI Automated Backups
0 2 * * * root cd $INSTALL_DIR && docker-compose exec -T postgres pg_dump -U diggai anamnese > backups/backup-\$(date +\%Y\%m\%d-\%H\%M\%S).sql 2>/dev/null
0 3 * * * root find $INSTALL_DIR/backups -name "*.sql" -mtime +30 -delete
EOF
    
    log_success "Backup cron jobs created"
}

# Health check
health_check() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf http://localhost:3001/api/health &> /dev/null; then
            log_success "Application is healthy"
            return 0
        fi
        
        log_info "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    log_error "Application failed to start"
    docker-compose logs app | tail -50
    exit 1
}

# Print completion message
print_completion() {
    local domain=${DOMAIN:-localhost}
    
    echo
    echo "=========================================="
    echo -e "${GREEN}DiggAI Installation Complete!${NC}"
    echo "=========================================="
    echo
    echo "Application URL: https://$domain"
    echo "Admin Password:  $(grep ARZT_PASSWORD .env.production | cut -d'"' -f2)"
    echo
    echo "Installation Directory: $INSTALL_DIR"
    echo
    echo "Useful commands:"
    echo "  cd $INSTALL_DIR"
    echo "  docker-compose logs -f app    # View logs"
    echo "  docker-compose ps             # Check status"
    echo "  docker-compose restart        # Restart services"
    echo
    echo "Backup location: $INSTALL_DIR/backups/"
    echo
    log_warn "IMPORTANT:"
    echo "  1. Save your admin password securely!"
    echo "  2. Configure your DNS to point to this server"
    echo "  3. Review .env.production for additional settings"
    echo "  4. Set up monitoring and alerting"
    echo
    echo "Documentation: https://docs.diggai.de"
    echo "Support: support@diggai.de"
    echo "=========================================="
}

# Main installation flow
main() {
    echo
    echo "=========================================="
    echo "  DiggAI Anamnese Platform Installer"
    echo "=========================================="
    echo
    
    check_root
    check_requirements
    setup_directory
    clone_repo
    generate_secrets
    create_env
    create_docker_override
    start_services
    setup_ssl
    setup_backups
    health_check
    print_completion
}

# Run main function
main "$@"
