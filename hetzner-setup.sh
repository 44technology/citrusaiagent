#!/bin/bash
# ============================================================
#  Citrus AI — Hetzner VPS Setup Script
#  Run as root on Ubuntu 22.04 or 24.04
#  Usage: bash hetzner-setup.sh
# ============================================================
set -e

REPO_URL="https://github.com/44technology/citrusaiagent.git"
DOMAIN="5.78.195.90"
APP_DIR="/var/www/citrus"
UPLOADS_DIR="/var/uploads/citrus"
LOG_DIR="/var/log/citrus"

echo "🍊 Starting Citrus AI server setup..."

# ── 0. Swap (critical for 2GB RAM servers like CPX11) ───────
if [ ! -f /swapfile ]; then
  echo "Creating 2GB swap file (needed for npm build on low-RAM servers)..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "✅ Swap enabled (2GB) — effective RAM is now 4GB"
else
  echo "✅ Swap already exists, skipping."
fi

# ── 1. System update ────────────────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ── 2. Node.js 20 LTS ───────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "✅ Node.js $(node -v) installed"

# ── 3. PM2 (process manager) ────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "✅ PM2 installed"

# ── 4. Create directories ────────────────────────────────────
mkdir -p $APP_DIR $UPLOADS_DIR $LOG_DIR
echo "✅ Directories created"

# ── 5. Clone repo ────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "Repo exists — pulling latest..."
  cd $APP_DIR && git pull
else
  git clone $REPO_URL $APP_DIR
fi
echo "✅ Repo cloned"

# ── 6. Backend setup ─────────────────────────────────────────
cd $APP_DIR/server
npm install --production

# Copy .env (you must create this file first — see .env.production.example)
if [ ! -f "$APP_DIR/server/.env" ]; then
  echo ""
  echo "⚠️  IMPORTANT: Create the .env file at $APP_DIR/server/.env"
  echo "   Copy from $APP_DIR/server/.env.production.example and fill in values."
  echo ""
fi

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

echo "✅ Backend setup complete"

# ── 7. Frontend build ────────────────────────────────────────
cd $APP_DIR
npm install
VITE_API_URL=/api npm run build
echo "✅ Frontend built"

# ── 8. Nginx config ──────────────────────────────────────────
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/citrus
# Replace placeholder domain
sed -i "s/YOUR_DOMAIN_OR_IP/$DOMAIN/g" /etc/nginx/sites-available/citrus
ln -sf /etc/nginx/sites-available/citrus /etc/nginx/sites-enabled/citrus
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "✅ Nginx configured"

# ── 9. Start app with PM2 ────────────────────────────────────
cd $APP_DIR/server
pm2 start ecosystem.config.cjs --env production
pm2 save
echo "✅ App started with PM2"

# ── 10. Firewall ─────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "✅ Firewall configured"

# ── 11. Secure uploads directory permissions ─────────────────
# Only the node process (root) can read/write uploads
chmod 700 $UPLOADS_DIR
echo "✅ Uploads directory secured (chmod 700)"

# ── 12. Auto daily backup of uploads ────────────────────────
BACKUP_DIR="/var/backups/citrus"
mkdir -p $BACKUP_DIR

cat > /usr/local/bin/citrus-backup.sh << 'BACKUP'
#!/bin/bash
# Daily backup of uploaded documents
BACKUP_DIR="/var/backups/citrus"
UPLOADS_DIR="/var/uploads/citrus"
DATE=$(date +%Y-%m-%d)

# Create compressed archive
tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" -C "$UPLOADS_DIR" .

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +30 -delete

echo "Backup complete: uploads-$DATE.tar.gz"
BACKUP

chmod +x /usr/local/bin/citrus-backup.sh

# Schedule backup at 2am every day
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/citrus-backup.sh >> /var/log/citrus/backup.log 2>&1") | crontab -
echo "✅ Daily backup scheduled (2am, kept 30 days)"

# ── 13. Fail2ban (brute-force protection) ────────────────────
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
echo "✅ Fail2ban installed (SSH brute-force protection)"

echo ""
echo "============================================================"
echo "  🍊 Citrus AI is running!"
echo "  URL: http://$DOMAIN"
echo ""
echo "  Security summary:"
echo "  ✅ Uploads: NOT publicly accessible (auth required)"
echo "  ✅ Firewall: only ports 22, 80, 443 open"
echo "  ✅ Fail2ban: SSH brute-force protection active"
echo "  ✅ Daily backups: /var/backups/citrus (30 days)"
echo ""
echo "  Next steps:"
echo "  1. Point your domain DNS A record to this server IP"
echo "  2. Run: certbot --nginx -d $DOMAIN   (free HTTPS)"
echo "  3. Enable Hetzner snapshot backups in the dashboard (+€0.79/mo)"
echo "============================================================"
