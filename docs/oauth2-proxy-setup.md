# OAuth2 Proxy with Okta SSO Integration

This document describes the migration from NextAuth.js to OAuth2 Proxy with Okta SSO for centralized authentication.

## Overview

The new authentication architecture replaces the previous NextAuth.js implementation with:

- **OAuth2 Proxy**: Standalone proxy service that handles authentication
- **Okta SSO**: Identity provider for centralized authentication
- **Header-based Authentication**: Application trusts user information from proxy headers

## Architecture

```
User → OAuth2 Proxy → Sourcebot App
              ↓
          Okta SSO
```

### Flow

1. User accesses the application
2. OAuth2 Proxy intercepts unauthenticated requests
3. OAuth2 Proxy redirects to Okta for authentication
4. After successful authentication, OAuth2 Proxy forwards requests with user headers
5. Sourcebot application trusts and uses the header information

## Configuration

### OAuth2 Proxy Setup

1. **Create Okta Application**:
   - Application Type: Web Application
   - Grant Types: Authorization Code
   - Redirect URIs: `http://your-domain:4180/oauth2/callback`
   - Trusted Origins: `http://your-domain:4180`

2. **Configure OAuth2 Proxy**:
   ```bash
   # Copy and configure environment file
   cp .env.oauth2-proxy.template .env.oauth2-proxy
   
   # Edit .env.oauth2-proxy with your Okta settings:
   # - OKTA_ISSUER_URL
   # - OKTA_CLIENT_ID
   # - OKTA_CLIENT_SECRET
   # - OAUTH2_PROXY_COOKIE_SECRET
   # - ALLOWED_EMAIL_DOMAINS
   # - ALLOWED_GROUPS
   ```

3. **Start with Docker Compose**:
   ```bash
   docker-compose -f docker-compose.oauth2-proxy.yml --env-file .env.oauth2-proxy up -d
   ```

### Okta Configuration

1. **Create Groups** (optional):
   - `sourcebot-users`: General application access
   - `sourcebot-admins`: Administrative access

2. **Assign Users to Groups**:
   - Add users to appropriate groups
   - Configure group claims in Okta

3. **Application Settings**:
   - Enable "Refresh Token" grant type
   - Set appropriate token lifetimes
   - Configure group claims if using group-based access control

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OAUTH2_PROXY_ENABLED` | Enable OAuth2 Proxy integration | `true` |
| `OAUTH2_PROXY_VALIDATE_HEADERS` | Validate incoming headers | `true` |
| `OAUTH2_PROXY_REQUIRED_GROUPS` | Required groups for access | `sourcebot-users` |
| `OKTA_ISSUER_URL` | Okta issuer URL | `https://your-org.okta.com/oauth2/default` |
| `OKTA_CLIENT_ID` | Okta application client ID | `your-client-id` |
| `OKTA_CLIENT_SECRET` | Okta application client secret | `your-client-secret` |
| `OAUTH2_PROXY_COOKIE_SECRET` | Cookie encryption secret | Generated 32-byte secret |
| `ALLOWED_EMAIL_DOMAINS` | Allowed email domains | `company.com` |
| `ALLOWED_GROUPS` | Allowed Okta groups | `sourcebot-users,admins` |

## Headers

OAuth2 Proxy sets the following headers that the application uses:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Forwarded-User` | User identifier | `user123` |
| `X-Forwarded-Email` | User email address | `user@company.com` |
| `X-Forwarded-Groups` | Comma-separated groups | `sourcebot-users,admins` |
| `X-Forwarded-Preferred-Username` | Display name | `John Doe` |

## Security Considerations

1. **Header Validation**: Application validates headers to prevent spoofing
2. **TLS Enforcement**: All communication should use HTTPS in production
3. **Group-based Access**: Configure appropriate group restrictions
4. **Token Refresh**: OAuth2 Proxy handles token refresh automatically
5. **Session Management**: Sessions are managed by OAuth2 Proxy, not the application

## Migration Notes

### Removed Components

The following NextAuth.js components have been removed:
- Login forms and UI
- Provider configurations (DEX, credentials, magic link)
- Session management
- JWT handling
- User registration flows

### Legacy Compatibility

For a transition period, legacy authentication environment variables are still accepted but deprecated:
- `AUTH_SECRET` → No longer used
- `AUTH_CREDENTIALS_LOGIN_ENABLED` → Set to `false`
- `AUTH_DEX_*` → No longer used

### Database Changes

Users are now created via Just-In-Time (JIT) provisioning:
- Users are created automatically on first login
- User information is sourced from Okta
- In single-tenant mode, users are automatically added to the organization

## Troubleshooting

### User Not Found

If users can't access the application:
1. Check OAuth2 Proxy logs for authentication errors
2. Verify Okta group memberships
3. Ensure `ALLOWED_GROUPS` is configured correctly
4. Check database for user creation

### Header Validation Issues

If header validation fails:
1. Ensure OAuth2 Proxy is properly configured
2. Check `OAUTH2_PROXY_VALIDATE_HEADERS` setting
3. Verify OAuth2 Proxy is setting required headers
4. Check network configuration for header stripping

### Authentication Loops

If users get stuck in authentication loops:
1. Clear browser cookies
2. Check OAuth2 Proxy cookie settings
3. Verify Okta redirect URIs
4. Check for cookie domain mismatches

## Production Deployment

For production deployment:

1. **Use HTTPS**: Configure TLS certificates
2. **Secure Cookies**: Set `OAUTH2_PROXY_COOKIE_SECURE=true`
3. **Proper Domains**: Configure correct cookie domains
4. **Rate Limiting**: Implement rate limiting on OAuth2 Proxy
5. **Monitoring**: Set up logging and monitoring
6. **High Availability**: Deploy OAuth2 Proxy in HA mode

## Testing

To test the OAuth2 Proxy integration:

1. **Start Services**:
   ```bash
   docker-compose -f docker-compose.oauth2-proxy.yml up -d
   ```

2. **Access Application**:
   - Navigate to `http://localhost:4180`
   - Should redirect to Okta login
   - After login, should access Sourcebot application

3. **Verify Headers**:
   - Check browser developer tools for forwarded headers
   - Verify user information is correctly displayed

4. **Test Authorization**:
   - Test with users in different groups
   - Verify group-based access control works