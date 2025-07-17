# Testing Dex OAuth2 Integration

This document provides comprehensive testing instructions for the Dex OAuth2 authentication implementation in Sourcebot.

## Overview

The Dex OAuth2 integration includes:
- **Unit tests** for the Dex provider configuration
- **End-to-end tests** using Playwright for the full OAuth flow
- **Integration testing** with a real Dex server
- **Manual testing** instructions for development

## Quick Start

### Automated Testing

Run the complete test suite:

```bash
./scripts/test-dex-oauth.sh
```

This script will:
1. Start a test Dex server with mock connectors
2. Set up test databases (Redis + PostgreSQL)
3. Run unit tests for the Dex provider
4. Build and start the Sourcebot application
5. Execute end-to-end tests with Playwright
6. Clean up all test resources

### Manual Testing

For development and debugging:

1. **Start test infrastructure:**
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Configure test environment:**
   ```bash
   cp .env.test .env.local
   ```

3. **Start the application:**
   ```bash
   yarn dev
   ```

4. **Test the OAuth flow:**
   - Visit http://localhost:3000/login
   - Click "Sign in with Dex"
   - You'll be redirected to http://localhost:5556/auth
   - Click "Mock" connector for instant authentication
   - Verify redirect back to Sourcebot with successful login

## Test Components

### 1. Docker Test Environment

**File:** `docker-compose.test.yml`

Provides isolated test infrastructure:
- **Dex server** (localhost:5556) with mock connectors
- **PostgreSQL** (localhost:5433) for test database
- **Redis** (localhost:6380) for test sessions

**File:** `configs/dex-test-config.yaml`

Dex configuration with:
- Mock callback connector for automated testing
- Static client credentials for Sourcebot
- Memory storage (no persistence needed for tests)
- Debug logging enabled

### 2. Unit Tests

**File:** `packages/web/src/auth.test.ts`

Tests the `createDexProvider()` function:
- ✅ Returns `null` when environment variables are missing
- ✅ Creates properly configured OAuth2 provider
- ✅ Maps user profile correctly from ID token claims
- ✅ Handles missing optional fields (like profile picture)
- ✅ Uses correct OAuth2 scopes and endpoints

Run unit tests only:
```bash
yarn workspace @sourcebot/web test auth.test.ts
```

### 3. End-to-End Tests

**File:** `packages/web/tests/e2e/dex-oauth.spec.ts`

Tests the complete OAuth2 flow:
- ✅ Dex login option appears when configured
- ✅ Redirects to Dex authorization endpoint
- ✅ Completes OAuth flow with mock connector
- ✅ Handles OAuth errors gracefully
- ✅ Validates provider configuration

Run e2e tests only:
```bash
yarn workspace @sourcebot/web test:e2e
```

### 4. Configuration Testing

**File:** `.env.test`

Test environment variables:
- Separate database/Redis ports to avoid conflicts
- Dex test server configuration
- Debug logging enabled
- Telemetry disabled for testing

## Testing Different Scenarios

### Test OAuth Error Handling

1. **Access Denied:**
   ```
   GET /api/auth/callback/dex?error=access_denied&error_description=User%20denied%20access
   ```

2. **Invalid State:**
   ```
   GET /api/auth/callback/dex?code=invalid&state=invalid
   ```

3. **Missing Configuration:**
   - Remove Dex environment variables
   - Verify provider doesn't appear on login page

### Test Production-like Setup

1. **With HTTPS (using ngrok or similar):**
   ```bash
   # Update Dex config with HTTPS redirect URI
   redirectURIs:
   - 'https://your-tunnel.ngrok.io/api/auth/callback/dex'
   ```

2. **With Real Identity Provider:**
   ```yaml
   # Add to dex-test-config.yaml
   connectors:
   - type: github
     id: github
     name: GitHub
     config:
       clientID: your-github-client-id
       clientSecret: your-github-client-secret
       redirectURI: http://localhost:5556/callback
   ```

## Debugging Tests

### View Dex Server Logs

```bash
docker-compose -f docker-compose.test.yml logs dex
```

### Check OAuth Configuration

1. **Dex OIDC Discovery:**
   ```bash
   curl http://localhost:5556/.well-known/openid_configuration
   ```

2. **Sourcebot Providers API:**
   ```bash
   curl http://localhost:3000/api/auth/providers
   ```

### Test Database State

```bash
# Connect to test database
docker-compose -f docker-compose.test.yml exec postgres psql -U postgres

# Check users table
\c postgres
SELECT * FROM "User";
```

## Browser Testing

### Playwright UI Mode

For interactive debugging:

```bash
yarn workspace @sourcebot/web test:e2e:ui
```

### Test in Different Browsers

```bash
# Chrome
yarn workspace @sourcebot/web test:e2e --project=chromium

# Firefox  
yarn workspace @sourcebot/web test:e2e --project=firefox

# Safari
yarn workspace @sourcebot/web test:e2e --project=webkit
```

## Performance Testing

### Load Testing OAuth Flow

Use tools like `k6` or `artillery` to test:

```javascript
// k6 script example
import http from 'k6/http';

export default function () {
  // Test login page load
  http.get('http://localhost:3000/login');
  
  // Test providers API
  http.get('http://localhost:3000/api/auth/providers');
}
```

## Troubleshooting

### Common Issues

1. **Port Conflicts:**
   - Ensure ports 5556, 5433, 6380 are available
   - Stop other instances: `docker-compose -f docker-compose-dev.yml down`

2. **Dex Server Not Starting:**
   ```bash
   # Check Dex logs for configuration errors
   docker-compose -f docker-compose.test.yml logs dex
   
   # Validate YAML syntax
   yamllint configs/dex-test-config.yaml
   ```

3. **Database Connection Issues:**
   ```bash
   # Check PostgreSQL logs
   docker-compose -f docker-compose.test.yml logs postgres
   
   # Test connection manually
   docker-compose -f docker-compose.test.yml exec postgres pg_isready -U postgres
   ```

4. **Playwright Browser Issues:**
   ```bash
   # Install/update browsers
   npx playwright install
   
   # Run with debug info
   DEBUG=pw:api yarn workspace @sourcebot/web test:e2e
   ```

### Test Cleanup

```bash
# Stop all test services
docker-compose -f docker-compose.test.yml down -v

# Remove test environment file
rm .env.local

# Clean up test artifacts
rm -rf packages/web/test-results/
rm -rf packages/web/playwright-report/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Dex OAuth2
jobs:
  test-dex:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: yarn install
      - run: ./scripts/test-dex-oauth.sh
```

## Security Testing

### OAuth2 Security Checks

1. **State Parameter Validation:**
   - Verify CSRF protection works
   - Test with invalid/missing state

2. **PKCE Support (future enhancement):**
   - Test code challenge/verifier flow
   - Verify replay attack protection

3. **Token Validation:**
   - Verify ID token signature validation
   - Test with expired/invalid tokens

### Testing Checklist

- [ ] Unit tests pass
- [ ] E2E tests pass in all browsers
- [ ] OAuth flow works with test Dex server
- [ ] Error handling works correctly
- [ ] Configuration validation works
- [ ] No sensitive data logged
- [ ] Proper session cleanup on logout
- [ ] CSRF protection enabled
- [ ] Secure cookie settings

## Next Steps

Consider adding:
- **Performance monitoring** for OAuth flows
- **Security scanning** of OAuth endpoints
- **Integration tests** with real identity providers
- **Accessibility testing** for login forms
- **Mobile testing** for OAuth redirects