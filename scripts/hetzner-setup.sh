#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# DiggAI — Hetzner VPS One-Time Setup Script
# Target: Ubuntu 22.04 LTS (CX22 or higher)
# Run as root:  bash hetzner-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="https://github.com/DiggAiHH/diggai-anamnese.git"
REPO_BRANCH="master"
APP_BASE="/opt/diggai"
DEPLOY_USER="diggai"

print_step() { echo ""; echo "▶ $1"; echo "────────────────────────────────"; }

# ─── 1. System update ────────────────────────────────────────────────────────
print_step "System update"
apt-get update -q && apt-get upgrade -y -q

# ─── 2. Required packages ─────────────────────────────────────────────────────
print_step "Installing packages"
apt-get install -y -q \
  curl git ufw certbot \
  apt-transport-https ca-certificates gnupg lsb-release

# ─── 3. Docker ────────────────────────────────────────────────────────────────
print_step "Installing Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | bash
  systemctl enable --now docker
  echo "Docker installed: $(docker --version)"
else
  echo "Docker already installed: $(docker --version)"
fi

# ─── 4. Deploy user ───────────────────────────────────────────────────────────
print_step "Creating deploy user: $DEPLOY_USER"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash -G docker "$DEPLOY_USER"
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker compose, /usr/local/bin/docker" >> /etc/sudoers.d/diggai
  echo "User created: $DEPLOY_USER"
else
  # Make sure user is in docker group
  usermod -aG docker "$DEPLOY_USER"
  echo "User already exists: $DEPLOY_USER (ensured in docker group)"
fi

# ─── 5. SSH authorized_keys for GitHub Actions ────────────────────────────────
# Create .ssh dir for deploy user so GitHub Actions can log in
print_step "SSH setup for deploy user"
DEPLOY_HOME=$(eval echo "~$DEPLOY_USER")
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
touch "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
echo "→ After this script, paste your GitHub Actions deploy key into:"
echo "  $DEPLOY_HOME/.ssh/authorized_keys"

# ─── 6. Clone repo ────────────────────────────────────────────────────────────
print_step "Cloning repository"
mkdir -p "$APP_BASE"
if [ ! -d "$APP_BASE/repo/.git" ]; then
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_BASE/repo"
  echo "Cloned to $APP_BASE/repo"
else
  echo "Repo already exists at $APP_BASE/repo — skipping clone"
fi

# Symlink so deploy.yml path (/opt/diggai/anamnese-app) resolves correctly
ln -sfn "$APP_BASE/repo/anamnese-app" "$APP_BASE/anamnese-app"

# ─── 7. Directory permissions ─────────────────────────────────────────────────
print_step "Setting up directories"
mkdir -p "$APP_BASE/anamnese-app/uploads"
mkdir -p "$APP_BASE/anamnese-app/backups"
mkdir -p "$APP_BASE/anamnese-app/docker/certs"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_BASE"

# ─── 8. Firewall ──────────────────────────────────────────────────────────────
print_step "Configuring UFW firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  comment "SSH"
ufw allow 80/tcp  comment "HTTP (ACME challenge + redirect)"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable
ufw status verbose

# ─── 9. SSL placeholder (certbot will run after DNS propagates) ───────────────
print_step "Certbot installed — SSL cert comes AFTER DNS is configured"
certbot --version

# ─── Done ─────────────────────────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup complete! Server IP: $SERVER_IP"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "NEXT STEPS (do these in order):"
echo ""
echo "1. Add GitHub Actions deploy SSH key to the server:"
echo "   cat YOUR_DEPLOY_PUBKEY >> $DEPLOY_HOME/.ssh/authorized_keys"
echo ""
echo "2. Copy .env.production to the server:"
echo "   scp anamnese-app/.env.hetzner.template $DEPLOY_USER@$SERVER_IP:$APP_BASE/anamnese-app/.env.production"
echo "   (then SSH in and fill in the real values)"
echo ""
echo "3. Point DNS at INWX:"
echo "   api.diggai.de  →  A  →  $SERVER_IP"
echo "   (wait ~5 min for propagation)"
echo ""
echo "4. Get SSL certificate (run AFTER DNS propagates):"
echo "   certbot certonly --standalone -d api.diggai.de"
echo "   cp /etc/letsencrypt/live/api.diggai.de/fullchain.pem $APP_BASE/anamnese-app/docker/certs/"
echo "   cp /etc/letsencrypt/live/api.diggai.de/privkey.pem   $APP_BASE/anamnese-app/docker/certs/"
echo ""
echo "5. First deploy:"
echo "   cd $APP_BASE/anamnese-app"
echo "   docker compose up -d"
echo ""
echo "6. Set GitHub Secrets (in DiggAiHH/diggai-anamnese → Settings → Secrets):"
echo "   VPS_HOST     = $SERVER_IP"
echo "   VPS_USER     = $DEPLOY_USER"
echo "   VPS_SSH_KEY  = (contents of your deploy private key)"
echo ""
