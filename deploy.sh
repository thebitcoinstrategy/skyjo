#!/bin/bash
# Deployment script for DigitalOcean droplet
# Run this on the droplet after cloning the repo

set -e

echo "=== Skyjo Deployment ==="

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 24..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build all packages
echo "Building..."
npm run build

# Start/restart with PM2
echo "Starting server..."
pm2 delete skyjo 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "=== Deployment complete ==="
echo "Server running on port 3000"
echo ""
echo "To set up auto-start on reboot: pm2 startup"
echo "To set up Caddy:"
echo "  1. Edit Caddyfile with your domain"
echo "  2. Install Caddy: apt install caddy"
echo "  3. Copy Caddyfile to /etc/caddy/Caddyfile"
echo "  4. systemctl restart caddy"
