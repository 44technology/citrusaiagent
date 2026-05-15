#!/bin/bash
# ============================================================
#  Citrus AI — Deploy Script
#  Run on the Hetzner VPS after initial setup to update the app
#  Usage: bash deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/citrus"
echo "🍊 Deploying Citrus AI..."

cd $APP_DIR

# ── 1. Pull latest code ──────────────────────────────────────
git pull origin main
echo "✅ Code updated"

# ── 2. Backend dependencies & DB migration ───────────────────
cd $APP_DIR/server
npm install --production
npx prisma generate
npx prisma db push
echo "✅ Backend dependencies & DB up to date"

# ── 3. Rebuild frontend ──────────────────────────────────────
cd $APP_DIR
npm install
VITE_API_URL=/api npm run build
echo "✅ Frontend rebuilt"

# ── 4. Restart API with PM2 ──────────────────────────────────
cd $APP_DIR/server
pm2 reload citrus-api --update-env
echo "✅ API restarted"

echo ""
echo "🍊 Deployment complete!"
pm2 status
