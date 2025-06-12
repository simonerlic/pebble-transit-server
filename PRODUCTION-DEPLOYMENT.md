# Production Deployment Guide

This guide covers deploying your BC Transit GTFS API to production with various hosting providers and deployment strategies.

## 🚀 Quick Start (5 minutes)

### Option 1: Railway.app (Recommended for beginners)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway deploy

# 3. Set environment variables in Railway dashboard
# 4. Your API is live! 🎉
```

### Option 2: Docker (Recommended for production)
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Update .env with your settings
# 3. Build and run
make docker-prod

# 4. Your API is running at http://localhost:3000
```

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Rate limiting enabled
- [ ] Security headers enabled
- [ ] Health check endpoint working
- [ ] Build passes without errors
- [ ] Tests passing
- [ ] Dependencies security audited

Run the complete check:
```bash
make prod-check
```

## 🌐 Hosting Options Comparison

| Platform | Cost | Difficulty | Features | Best For |
|----------|------|------------|----------|----------|
| **Railway** | $5/month | ⭐ Easy | Auto-deploy, metrics | Getting started |
| **Render** | $7/month | ⭐ Easy | Auto-sleep, SSL | Hobby projects |
| **Fly.io** | $2-5/month | ⭐⭐ Medium | Global edge, no cold starts | Always-on apps |
| **DigitalOcean** | $5/month | ⭐⭐ Medium | Full control, scaling | Production apps |
| **AWS/GCP** | $10+/month | ⭐⭐⭐ Hard | Enterprise features | Large scale |
| **VPS/Docker** | $5/month | ⭐⭐⭐ Hard | Complete control | Custom setups |

## 🚂 Railway.app Deployment

### Step 1: Prepare Repository
```bash
# Ensure your code is pushed to GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Deploy via CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway deploy
```

### Step 3: Configure Environment
In Railway dashboard, add these environment variables:
```env
NODE_ENV=production
GTFS_REALTIME_URL=https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48
GTFS_STATIC_URL=https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48
RATE_LIMITING_ENABLED=true
ENABLE_COMPRESSION=true
ENABLE_SECURITY_HEADERS=true
TRUST_PROXY=true
```

### Step 4: Custom Domain (Optional)
```bash
# Add custom domain
railway domain add yourdomain.com
```

**Cost**: $5/month after free tier
**Pros**: Zero configuration, auto-deploy, great DX
**Cons**: Limited to North America/Europe

## 🎨 Render.com Deployment

### Step 1: Connect GitHub
1. Go to [render.com](https://render.com)
2. Connect your GitHub account
3. Select your repository

### Step 2: Configure Service
- **Environment**: Node
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18

### Step 3: Environment Variables
Add in Render dashboard:
```env
NODE_ENV=production
GTFS_REALTIME_URL=https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48
GTFS_STATIC_URL=https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48
RATE_LIMITING_ENABLED=true
PORT=10000
```

**Cost**: $7/month (free tier available with limitations)
**Pros**: Easy setup, auto-SSL, GitHub integration
**Cons**: Cold starts on free tier, slower in some regions

## ✈️ Fly.io Deployment

### Step 1: Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux/Windows
curl -L https://fly.io/install.sh | sh
```

### Step 2: Initialize and Deploy
```bash
# Login
fly auth login

# Initialize app
fly launch

# Deploy
fly deploy
```

### Step 3: Configure Environment
```bash
# Set environment variables
fly secrets set NODE_ENV=production
fly secrets set GTFS_REALTIME_URL=https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48
fly secrets set GTFS_STATIC_URL=https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48
fly secrets set RATE_LIMITING_ENABLED=true
```

### Step 4: Scale and Regions
```bash
# Scale to multiple regions
fly regions add sea lax
fly scale count 2
```

**Cost**: $2-5/month depending on usage
**Pros**: Global edge deployment, no cold starts, great performance
**Cons**: More complex setup, newer platform

## 🌊 DigitalOcean App Platform

### Step 1: Create App
1. Go to DigitalOcean App Platform
2. Connect GitHub repository
3. Choose Node.js environment

### Step 2: Configure Build
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment Variables**: Add from .env.example

### Step 3: Configure Resources
- **Instance Type**: Basic ($5/month)
- **Instance Count**: 1-3 depending on traffic
- **Auto-scaling**: Enable for traffic spikes

**Cost**: $5/month minimum
**Pros**: Reliable, good scaling, managed platform
**Cons**: More expensive than some alternatives

## 🐳 Docker Production Deployment

### Option A: Single Container
```bash
# Build production image
docker build -t bc-transit-api .

# Run with environment file
docker run -d \
  --name transit-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  bc-transit-api
```

### Option B: Docker Compose (Recommended)
```bash
# Create production environment
cp .env.example .env
# Update .env with production settings

# Start production stack
make docker-prod

# View logs
make docker-logs

# Stop
make docker-stop
```

### Option C: Docker with Nginx
```bash
# Start full production stack with reverse proxy
docker-compose --profile production up -d

# Includes:
# - API server
# - Nginx reverse proxy
# - Rate limiting
# - SSL termination
# - Caching
```

### Production Docker Compose
The included `docker-compose.yml` provides several profiles:

- **Development**: `docker-compose --profile dev up`
- **Production**: `docker-compose --profile production up`
- **Full Stack**: `docker-compose --profile production-full up`
- **Monitoring**: `docker-compose --profile monitoring up`

## 🔧 VPS/Server Deployment

### Step 1: Server Setup (Ubuntu 20.04+)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Step 2: Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/pebble-transit-server.git
cd pebble-transit-server

# Install dependencies and build
npm ci --only=production
npm run build

# Create environment file
cp .env.example .env
# Edit .env with production settings

# Start with PM2
pm2 start dist/index.js --name "transit-api"
pm2 startup
pm2 save
```

### Step 3: Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx

# Copy provided nginx.conf
sudo cp nginx.conf /etc/nginx/sites-available/transit-api
sudo ln -s /etc/nginx/sites-available/transit-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Security Configuration

### Essential Security Settings
```env
# Enable all security features
ENABLE_SECURITY_HEADERS=true
RATE_LIMITING_ENABLED=true
API_KEY_REQUIRED=true  # For production APIs
CORS_ORIGIN=https://yourdomain.com  # Restrict CORS

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
STRICT_RATE_LIMIT_MAX_REQUESTS=20
```

### SSL/TLS Setup

#### Option 1: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option 2: Cloudflare (Recommended)
1. Add domain to Cloudflare
2. Enable SSL/TLS encryption
3. Set SSL mode to "Full (strict)"
4. Enable security features (DDoS protection, WAF)

### API Key Authentication
```bash
# Generate secure API key
openssl rand -base64 32

# Set in environment
export ADMIN_API_KEY=your-generated-key
```

## 📊 Monitoring and Logging

### Basic Monitoring
```bash
# Start monitoring stack
make setup-monitoring

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
```

### Production Logging
```env
# Enable comprehensive logging
ACCESS_LOG_ENABLED=true
LOG_LEVEL=info
PERFORMANCE_MONITORING=true
```

### Health Checks
```bash
# Basic health check
curl https://yourapi.com/api/health

# Automated monitoring with curl
*/5 * * * * curl -f https://yourapi.com/api/health || echo "API down"
```

### Error Tracking (Optional)
Consider integrating with services like:
- Sentry for error tracking
- LogRocket for session replay
- DataDog for comprehensive monitoring

## 🚀 Performance Optimization

### Caching Strategy
```env
# Enable caching
CACHE_ENABLED=true
CACHE_ARRIVALS_TTL=30      # 30 seconds for live data
CACHE_STATIC_DATA_TTL=3600 # 1 hour for static data
```

### Load Balancing
For high traffic, use multiple instances:

```bash
# Docker Swarm
docker swarm init
docker service create --replicas 3 bc-transit-api

# Kubernetes
kubectl apply -f k8s/
kubectl scale deployment transit-api --replicas=3
```

### CDN Integration
- Cloudflare: Automatic global caching
- AWS CloudFront: Custom caching rules
- KeyCDN: Affordable CDN solution

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install and build
        run: |
          npm ci
          npm run build
          npm test
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

#### Memory Issues
```bash
# Check memory usage
docker stats
# Limit memory usage
docker run --memory=512m bc-transit-api
```

#### GTFS Feed Errors
```bash
# Check feed accessibility
curl -I https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48

# Check logs for errors
docker logs transit-api
```

#### Rate Limiting Too Strict
```env
# Increase limits temporarily
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000
```

### Debug Mode
```env
# Enable debug logging
DEBUG=true
LOG_LEVEL=debug
DEV_DETAILED_ERRORS=true
```

## 📈 Scaling Strategies

### Vertical Scaling
- Increase memory/CPU on existing instances
- Suitable for small to medium traffic

### Horizontal Scaling
- Add more instances behind load balancer
- Required for high traffic applications

### Database Scaling (Future)
- Redis for caching
- PostgreSQL for persistent data
- Separate read/write instances

## 💰 Cost Optimization

### Free Tier Options
1. **Railway**: 500 hours/month free
2. **Render**: 750 hours/month free
3. **Fly.io**: 3 VMs free
4. **Heroku**: 1000 dyno hours free (deprecated)

### Cost-Effective Production
1. **Fly.io**: $2-5/month for always-on
2. **Railway**: $5/month with predictable pricing
3. **DigitalOcean**: $5/month droplet with manual setup
4. **Vultr/Linode**: $3.50-5/month VPS

### Traffic-Based Scaling
```env
# Scale down during low traffic
CLUSTER_WORKERS=1

# Scale up during peak hours
CLUSTER_WORKERS=4
```

## 🔮 Advanced Features

### Multi-Region Deployment
Deploy to multiple regions for global performance:
- North America: US-East, US-West
- Europe: London, Frankfurt
- Asia: Singapore, Tokyo

### Blue-Green Deployment
Implement zero-downtime deployments:
1. Deploy to "green" environment
2. Run health checks
3. Switch traffic from "blue" to "green"
4. Keep "blue" as rollback option

### Feature Flags
Use environment variables for feature control:
```env
ENABLE_VEHICLE_TRACKING=true
ENABLE_SERVICE_ALERTS=true
ENABLE_NEARBY_STOPS=true
ENABLE_ANALYTICS=false
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly
- [ ] Check SSL certificate expiry
- [ ] Monitor error rates and performance
- [ ] Review and adjust rate limits
- [ ] Backup configuration and data

### Emergency Procedures
1. **API Down**: Check health endpoint, restart service
2. **High Error Rate**: Check GTFS feed status, review logs
3. **Performance Issues**: Scale up resources, check database
4. **Security Incident**: Rotate keys, review access logs

### Getting Help
- GitHub Issues: Report bugs and feature requests
- Documentation: Check README and examples
- Community: Join discussions and share experiences

---

## Quick Reference

### Essential Commands
```bash
# Development
make dev

# Production check
make prod-check

# Docker deployment
make docker-prod

# Railway deployment
make deploy-railway

# Health check
curl https://yourapi.com/api/health
```

### Important URLs
- API Documentation: `https://yourapi.com/api`
- Health Check: `https://yourapi.com/api/health`
- Live Arrivals: `https://yourapi.com/api/arrivals/12345`

### Environment Variables
```env
NODE_ENV=production
GTFS_REALTIME_URL=https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48
GTFS_STATIC_URL=https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48
RATE_LIMITING_ENABLED=true
ENABLE_COMPRESSION=true
ENABLE_SECURITY_HEADERS=true
```

🎉 **Congratulations!** Your BC Transit GTFS API is now production-ready and deployed!