#!/bin/bash
# ══════════════════════════════════════════════════════════════
# DiggAI Anamnese — Hetzner VPS Setup Script
# Run as root on a fresh Ubuntu 22.04/24.04 server
# Usage: curl -sSL <url> | bash  OR  bash server-setup.sh
# ══════════════════════════════════════════════════════════════
set -euo pipefail

echo "╔══════════════════════════════════════════════╗"
echo "║  DiggAI Anamnese — Server Setup              ║"
echo "║  Target: Ubuntu 22.04/24.04 on Hetzner       ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. System Update ──────────────────────────────────────
echo "→ [1/8] System update..."
apt update && apt upgrade -y
apt install -y curl wget git unzip jq htop ncdu ufw fail2ban ca-certificates gnupg

# ── 2. Create deploy user ────────────────────────────────
echo "→ [2/8] Creating deploy user..."
if ! id "diggai-deploy" &>/dev/null; then
    adduser --disabled-password --gecos "DiggAI Deploy" diggai-deploy
    usermod -aG sudo diggai-deploy
    echo "diggai-deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/diggai-deploy
    chmod 0440 /etc/sudoers.d/diggai-deploy

    # Copy SSH keys from root
    mkdir -p /home/diggai-deploy/.ssh
    cp /root/.ssh/authorized_keys /home/diggai-deploy/.ssh/authorized_keys
    chown -R diggai-deploy:diggai-deploy /home/diggai-deploy/.ssh
    chmod 700 /home/diggai-deploy/.ssh
    chmod 600 /home/diggai-deploy/.ssh/authorized_keys
    echo "  ✓ User diggai-deploy created"
else
    echo "  ✓ User diggai-deploy already exists"
fi

# ── 3. SSH Hardening ─────────────────────────────────────
echo "→ [3/8] SSH hardening..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup 2>/dev/null || true

cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
AllowUsers diggai-deploy
EOF

echo "  ⚠️  SSH hardening written (takes effect after restart)"
echo "  ⚠️  TEST LOGIN AS diggai-deploy BEFORE restarting sshd!"

# ── 4. Firewall ──────────────────────────────────────────
echo "→ [4/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  ✓ UFW enabled (SSH + HTTP + HTTPS)"

# ── 5. Fail2Ban ─────────────────────────────────────────
echo "→ [5/8] Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 3
bantime = 7200
EOF

systemctl enable fail2ban
systemctl start fail2ban
echo "  ✓ Fail2Ban active"

# ── 6. Swap (for VPS ≤ 4GB) ─────────────────────────────
echo "→ [6/8] Setting up swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p
    echo "  ✓ 2GB swap created"
else
    echo "  ✓ Swap already exists"
fi

# ── 7. Docker + Docker Compose ───────────────────────────
echo "→ [7/8] Installing Docker..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    usermod -aG docker diggai-deploy
    systemctl enable docker
    systemctl start docker
    echo "  ✓ Docker installed"
else
    echo "  ✓ Docker already installed: $(docker --version)"
fi

# ── 8. Clone repo & prepare ──────────────────────────────
echo "→ [8/8] Preparing application directory..."
mkdir -p /opt/diggai-anamnese
chown diggai-deploy:diggai-deploy /opt/diggai-anamnese

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ Server setup complete!                    ║"
echo "║                                              ║"
echo "║  NEXT STEPS (as diggai-deploy):              ║"
echo "║  1. ssh diggai-deploy@<THIS_IP>              ║"
echo "║  2. cd /opt/diggai-anamnese                  ║"
echo "║  3. git clone <repo> .                       ║"
echo "║  4. Create .env.production                   ║"
echo "║  5. Get SSL certs (certbot)                  ║"
echo "║  6. docker compose up -d --build             ║"
echo "╚══════════════════════════════════════════════╝"
