#!/bin/bash

# Dex OAuth2 Integration Test Script
# This script sets up and runs tests for the Dex OAuth2 authentication integration

set -e

echo "🧪 Starting Dex OAuth2 Integration Tests"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up test environment..."
    docker-compose -f docker-compose.test.yml down -v
}
trap cleanup EXIT

# Start test infrastructure
echo "🚀 Starting test infrastructure (Dex, Redis, PostgreSQL)..."
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if Dex is responding
echo "🔍 Checking Dex server health..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:5556/.well-known/openid_configuration > /dev/null 2>&1; then
        echo "✅ Dex server is ready"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for Dex server... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Dex server failed to start within expected time"
    docker-compose -f docker-compose.test.yml logs dex
    exit 1
fi

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL health..."
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if docker-compose -f docker-compose.test.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for PostgreSQL... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ PostgreSQL failed to start within expected time"
    docker-compose -f docker-compose.test.yml logs postgres
    exit 1
fi

# Copy test environment configuration
echo "⚙️  Setting up test environment..."
cp .env.test .env.local

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Install Playwright browsers if needed
echo "🎭 Setting up Playwright..."
cd packages/web
if [ ! -d "node_modules/@playwright/test" ]; then
    yarn add -D @playwright/test
fi
npx playwright install

# Run database migrations
echo "🗃️  Running database migrations..."
yarn workspace @sourcebot/db prisma:migrate:deploy

# Run unit tests for Dex provider
echo "🧪 Running unit tests..."
yarn workspace @sourcebot/web test auth.test.ts

# Build the application
echo "🔨 Building application..."
yarn workspace @sourcebot/web build

# Start the application in test mode
echo "🚀 Starting Sourcebot application..."
yarn workspace @sourcebot/web start &
APP_PID=$!

# Wait for the application to be ready
echo "⏳ Waiting for application to be ready..."
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Sourcebot application is ready"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for application... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Application failed to start within expected time"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi

# Run Playwright e2e tests
echo "🎭 Running e2e tests..."
yarn workspace @sourcebot/web test:e2e

# Stop the application
kill $APP_PID 2>/dev/null || true

echo "🎉 All tests completed successfully!"
echo ""
echo "📋 Test Summary:"
echo "   ✅ Dex server configuration"
echo "   ✅ OAuth2 provider setup"  
echo "   ✅ Unit tests for Dex provider"
echo "   ✅ End-to-end authentication flow"
echo ""
echo "🔗 You can now test manually by:"
echo "   1. Starting services: docker-compose -f docker-compose.test.yml up -d"
echo "   2. Using test environment: cp .env.test .env.local"
echo "   3. Running the app: yarn dev"
echo "   4. Visiting: http://localhost:3000/login"