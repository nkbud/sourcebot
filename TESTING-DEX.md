# Testing Dex OAuth2 Implementation

## Quick Test Commands

### Verify Implementation
```bash
# Check that all required files and configurations are in place
yarn verify:dex
```

### Full Integration Test
```bash
# Run complete test suite with Docker, unit tests, and e2e tests
yarn test:dex
```

### Manual Testing
```bash
# 1. Start test environment
docker compose -f docker-compose.test.yml up -d

# 2. Configure test environment
cp .env.test .env.local

# 3. Start the application
yarn dev

# 4. Visit http://localhost:3000/login
# 5. Click "Sign in with Dex"
# 6. Choose "Mock" connector for instant authentication
```

## What Gets Tested

- ✅ **Unit Tests**: Dex provider configuration and OAuth2 setup
- ✅ **Integration Tests**: Real Dex server with mock connectors  
- ✅ **E2E Tests**: Complete OAuth flow using Playwright
- ✅ **Configuration Tests**: Environment variables and endpoints
- ✅ **UI Tests**: Login form integration and provider display

## Test Infrastructure

- **Docker Compose**: Isolated test environment with Dex, Redis, PostgreSQL
- **Mock Connectors**: Instant authentication for automated testing
- **Playwright**: Cross-browser e2e testing
- **Vitest**: Unit testing framework

For detailed testing documentation, see [docs/testing-dex-oauth2.md](docs/testing-dex-oauth2.md).