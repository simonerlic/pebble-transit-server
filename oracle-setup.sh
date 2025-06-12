#!/bin/bash
set -e

echo "Setting up BC Transit API on Oracle Cloud..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git jq nginx certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/pebble-transit-server.git
cd pebble-transit-server

# Install dependencies and build
npm ci
npm run build

# Setup environment
cp .env.example .env
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
sed -i 's/RATE_LIMITING_ENABLED=false/RATE_LIMITING_ENABLED=true/' .env

# Start with PM2
pm2 start dist/index.js --name "transit-api"
pm2 startup
pm2 save

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/transit-api
sudo ln -s /etc/nginx/sites-available/transit-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Deployment complete!"
echo "🌐 API available at: http://$(curl -s ifconfig.me)/api"
echo "🔍 Health check: http://$(curl -s ifconfig.me)/api/health"
