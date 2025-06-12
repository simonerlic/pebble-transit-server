.PHONY: help install build clean test dev prod docker-build docker-run docker-dev docker-prod docker-stop docker-logs deploy-railway deploy-render validate lint type-check

# Default target
help:
	@echo "BC Transit GTFS API - Production Deployment Commands"
	@echo "=================================================="
	@echo ""
	@echo "Development:"
	@echo "  install     - Install dependencies"
	@echo "  dev         - Start development server"
	@echo "  test        - Run API tests"
	@echo "  lint        - Run TypeScript linter"
	@echo "  type-check  - Check TypeScript types"
	@echo "  validate    - Full validation (type-check + build + test)"
	@echo ""
	@echo "Production:"
	@echo "  build       - Build production assets"
	@echo "  prod        - Start production server"
	@echo "  clean       - Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build  - Build Docker image"
	@echo "  docker-run    - Run Docker container"
	@echo "  docker-dev    - Start development with Docker Compose"
	@echo "  docker-prod   - Start production with Docker Compose"
	@echo "  docker-stop   - Stop Docker Compose services"
	@echo "  docker-logs   - View Docker logs"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-railway - Deploy to Railway.app"
	@echo "  deploy-render  - Instructions for Render deployment"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install && make dev"

# Development commands
install:
	@echo "🔧 Installing dependencies..."
	npm install

dev:
	@echo "🚀 Starting development server..."
	npm run dev

test:
	@echo "🧪 Running API tests..."
	npm test

lint:
	@echo "🔍 Running TypeScript linter..."
	npm run lint

type-check:
	@echo "📝 Checking TypeScript types..."
	npm run type-check

validate: type-check build test
	@echo "✅ All validations passed!"

# Production commands
build:
	@echo "🏗️  Building production assets..."
	npm run build

prod: build
	@echo "🚀 Starting production server..."
	npm run prod:start

clean:
	@echo "🧹 Cleaning build artifacts..."
	npm run clean
	rm -rf node_modules/.cache

# Docker commands
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t bc-transit-api:latest .

docker-run: docker-build
	@echo "🐳 Running Docker container..."
	docker run -p 3000:3000 --env-file .env.example bc-transit-api:latest

docker-dev:
	@echo "🐳 Starting development environment with Docker Compose..."
	docker-compose --profile dev up --build

docker-prod:
	@echo "🐳 Starting production environment with Docker Compose..."
	docker-compose up --build -d
	@echo "✅ Production environment started!"
	@echo "📚 API: http://localhost:3000/api"
	@echo "🔍 Health: http://localhost:3000/api/health"

docker-stop:
	@echo "🛑 Stopping Docker Compose services..."
	docker-compose down

docker-logs:
	@echo "📋 Viewing Docker logs..."
	docker-compose logs -f transit-api

# Production deployment commands
deploy-railway:
	@echo "🚂 Deploying to Railway..."
	@if command -v railway >/dev/null 2>&1; then \
		railway deploy; \
	else \
		echo "❌ Railway CLI not installed. Install with: npm install -g @railway/cli"; \
		exit 1; \
	fi

deploy-render:
	@echo "🎨 Render Deployment Instructions:"
	@echo "=================================="
	@echo "1. Go to https://render.com"
	@echo "2. Connect your GitHub repository"
	@echo "3. Create a new Web Service"
	@echo "4. Set build command: npm run build"
	@echo "5. Set start command: npm start"
	@echo "6. Add environment variables from .env.example"
	@echo "7. Deploy!"

# Environment setup
setup-env:
	@echo "📝 Setting up environment file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file from template"; \
		echo "⚠️  Please update .env with your configuration"; \
	else \
		echo "ℹ️  .env file already exists"; \
	fi

# Health checks
health-check:
	@echo "🔍 Checking API health..."
	@curl -s http://localhost:3000/api/health | jq . || echo "❌ API not responding"

# Performance testing
load-test:
	@echo "⚡ Running basic load test..."
	@if command -v ab >/dev/null 2>&1; then \
		ab -n 100 -c 10 http://localhost:3000/api/health; \
	else \
		echo "❌ Apache Bench (ab) not installed. Install with: brew install httpd (macOS)"; \
	fi

# Security scan
security-scan:
	@echo "🔒 Running security audit..."
	npm audit --audit-level moderate

# Production readiness check
prod-check: validate security-scan
	@echo "🚀 Production Readiness Check"
	@echo "============================"
	@echo "✅ TypeScript compilation"
	@echo "✅ Tests passing"
	@echo "✅ Security audit"
	@echo ""
	@echo "Next steps:"
	@echo "1. Set up environment variables"
	@echo "2. Choose deployment platform:"
	@echo "   - Railway: make deploy-railway"
	@echo "   - Docker: make docker-prod"
	@echo "   - Render: make deploy-render"

# Database setup (for future enhancements)
setup-db:
	@echo "🗄️  Database setup not yet implemented"
	@echo "Current version uses in-memory storage only"

# SSL certificate generation (for Docker with HTTPS)
generate-ssl:
	@echo "🔐 Generating self-signed SSL certificates..."
	@mkdir -p ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout ssl/key.pem \
		-out ssl/cert.pem \
		-subj "/C=CA/ST=BC/L=Victoria/O=Transit API/CN=localhost"
	@echo "✅ SSL certificates generated in ./ssl/"

# Monitoring setup
setup-monitoring:
	@echo "📊 Setting up monitoring stack..."
	docker-compose --profile monitoring up -d
	@echo "✅ Monitoring stack started!"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001 (admin/admin)"

# Full production setup
full-setup: install setup-env validate docker-build
	@echo "🎉 Full production setup complete!"
	@echo ""
	@echo "Quick start commands:"
	@echo "  Development: make dev"
	@echo "  Production:  make docker-prod"
	@echo "  Deploy:      make deploy-railway"

# Cleanup commands
clean-all: clean
	@echo "🧹 Deep cleaning..."
	docker system prune -f
	docker volume prune -f
	rm -rf node_modules

# Version and info
version:
	@echo "BC Transit GTFS API"
	@echo "=================="
	@node -e "console.log('Version:', require('./package.json').version)"
	@node -e "console.log('Node.js:', process.version)"
	@echo "Docker: $(shell docker --version 2>/dev/null || echo 'Not installed')"
	@echo "Compose: $(shell docker-compose --version 2>/dev/null || echo 'Not installed')"
