#!/bin/bash
# ============================================================
# setup-vps.sh — Runs ON the VPS after files are synced
# Safe for multi-site VPS: only touches 88-seven.com config
# Run via: bash push.sh  (from your Mac)
# ============================================================
set -e

DOMAIN="88-seven.com"
APP_DIR="/var/www/88-seven"
DB_NAME="eightyseven"
DB_USER="eightyseven_user"
DB_PASS="Payroo@88Seven2024!"
JWT_SECRET="88seven_jwt_super_secret_2024_payroo_platform"
NODE_VERSION="20"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         88-seven.com — VPS Setup & Deploy            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── 1. INSTALL NODE.JS IF MISSING ──────────────────────────
echo "▶ [1/7] Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "   Installing Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 --silent
fi
echo "   Node: $(node -v) | NPM: $(npm -v)"

# ─── 2. POSTGRESQL ──────────────────────────────────────────
echo "▶ [2/7] Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
  echo "   Database already exists, skipping."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "   ✓ PostgreSQL ready"

# ─── 3. WRITE .env.local ────────────────────────────────────
echo "▶ [3/7] Writing .env.local..."
cat > $APP_DIR/.env.local << EOF
# PostgreSQL
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public

# JWT
JWT_SECRET=$JWT_SECRET

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCCkjIavh4Ip6Zud9z6ydmpSmfGQJ5BJRA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sari-pos-88979.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sari-pos-88979
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sari-pos-88979.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=412821814538
NEXT_PUBLIC_FIREBASE_APP_ID=1:412821814538:web:b4cb53f58d5d54c5ef8ef3
NEXT_PUBLIC_STORE_ID=8807
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAM5RkdgCT-TfC2_KEI_tMipzP_bY3aUpI

# Xendit
XENDIT_SECRET_KEY=xnd_production_vO9vpc6Xnrz81qTUk1l9sVWfn4ar8K3URrIC4FF2msR1PR05YJyPo2hdZAuTHb
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_production_tTjuEUpqHV4FM0HUfTzfT2LpUskmHfPQWVnSwaXpmFwX7vlMzADuI07QpCVBr8

# Firebase Admin SDK (set this in your VPS .env.local manually)
FIREBASE_SERVICE_ACCOUNT_KEY=<your-firebase-service-account-json>

NODE_ENV=production
PORT=3051
EOF

chmod 600 $APP_DIR/.env.local
echo "   ✓ .env.local written"

# ─── 4. INSTALL DEPS, MIGRATE, BUILD ────────────────────────
echo "▶ [4/7] Installing packages..."
cd $APP_DIR
npm install --legacy-peer-deps --silent

echo "▶ Running DB migrations..."
npx prisma generate
npx prisma migrate deploy

echo "▶ Building Next.js..."
npm run build
echo "   ✓ Build complete"

# ─── 5. PM2 ─────────────────────────────────────────────────
echo "▶ [5/7] Starting PM2..."
mkdir -p /var/log/pm2
pm2 delete 88-seven 2>/dev/null || true
pm2 start $APP_DIR/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo\|systemctl" | bash || true
echo "   ✓ PM2 running"

# ─── 6. NGINX — only 88-seven.com config ────────────────────
echo "▶ [6/7] Configuring Nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX'
server {
    listen 80;
    server_name 88-seven.com www.88-seven.com;

    client_max_body_size 20M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;

    location /_next/static/ {
        alias /var/www/88-seven/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public/ {
        alias /var/www/88-seven/public/;
        expires 7d;
    }

    location / {
        proxy_pass http://127.0.0.1:3051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
nginx -t && systemctl reload nginx
echo "   ✓ Nginx config added for $DOMAIN"

# ─── 7. SSL ─────────────────────────────────────────────────
echo "▶ [7/7] Installing SSL certificate..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx -qq
fi

certbot --nginx \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --non-interactive \
  --agree-tos \
  --email admin@$DOMAIN \
  --redirect || echo "   ⚠ SSL failed — ensure DNS A record points to this server first"

# Auto-renew cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | sort -u | crontab -

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              DEPLOY COMPLETE ✓                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  🌐 Site:    https://$DOMAIN"
echo "  📁 App:     $APP_DIR"
echo "  🗄️  DB:      postgresql://$DB_USER:****@localhost:5432/$DB_NAME"
echo "  📊 PM2:     pm2 status"
echo "  📋 Logs:    pm2 logs 88-seven"
echo ""
pm2 status
