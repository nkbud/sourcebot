# OAuth2 Proxy with Okta SSO Migration

## Overview

This migration replaces the existing NextAuth.js authentication system with OAuth2 Proxy and Okta SSO. The new system provides:

- **Centralized Authentication**: All authentication handled by OAuth2 Proxy
- **Simplified Application**: No session management in the application
- **Better Security**: Headers validated to prevent spoofing
- **Single Sign-On**: Seamless integration with Okta

## Architecture

```
User → OAuth2 Proxy → Sourcebot App
              ↓
          Okta SSO
```

## Changes Made

### 1. Authentication Infrastructure
- **Added**: OAuth2 Proxy header-based authentication (`lib/oauth2-proxy-auth.ts`)
- **Added**: New authentication utilities (`lib/auth-new.ts`)
- **Added**: User management with JIT provisioning (`lib/oauth2-proxy-user-management.ts`)
- **Added**: Client-side authentication hook (`hooks/useOAuth2ProxyAuth.ts`)

### 2. Legacy Code Removed
- **Removed**: Login forms and UI components
- **Removed**: Signup page
- **Removed**: Email verification components
- **Removed**: NextAuth.js API routes
- **Removed**: SessionProvider from root layout
- **Deprecated**: `auth.ts` (marked for removal)

### 3. Updated Components
- **Updated**: Settings dropdown to use OAuth2 Proxy authentication
- **Updated**: Logout escape hatch to use OAuth2 Proxy sign-out
- **Updated**: All server actions to use new authentication
- **Updated**: Middleware to handle OAuth2 Proxy headers
- **Updated**: All pages to use new authentication system

### 4. Configuration
- **Added**: OAuth2 Proxy Docker Compose configuration
- **Added**: Environment variables for OAuth2 Proxy
- **Added**: Configuration templates and examples
- **Updated**: Development environment configuration

## Migration Steps

1. **Deploy OAuth2 Proxy**: Use the provided Docker Compose configuration
2. **Configure Okta**: Set up Okta application with appropriate settings
3. **Update Environment**: Configure OAuth2 Proxy environment variables
4. **Test Authentication**: Verify the authentication flow works
5. **Remove Legacy Code**: Clean up any remaining NextAuth.js references

## New Authentication Flow

1. User accesses application
2. OAuth2 Proxy intercepts request
3. If not authenticated, redirects to Okta
4. After authentication, forwards request with headers:
   - `X-Forwarded-User`: User ID
   - `X-Forwarded-Email`: User email
   - `X-Forwarded-Groups`: User groups (comma-separated)
   - `X-Forwarded-Preferred-Username`: Display name
5. Application validates headers and creates/updates user in database
6. User is granted access based on group membership

## Security Features

- **Header Validation**: Prevents header spoofing
- **Group-based Access**: Control access via Okta groups
- **JIT Provisioning**: Users created automatically on first login
- **Session Management**: Handled entirely by OAuth2 Proxy
- **No Application Sessions**: Reduced attack surface

## Configuration Files

- `docker-compose.oauth2-proxy.yml`: OAuth2 Proxy deployment
- `.env.oauth2-proxy.template`: Environment variable template
- `docs/oauth2-proxy-setup.md`: Detailed setup instructions

## Testing

Use the provided Docker Compose configuration to test:

```bash
# Copy and configure environment file
cp .env.oauth2-proxy.template .env.oauth2-proxy
# Edit .env.oauth2-proxy with your Okta settings

# Start OAuth2 Proxy with Sourcebot
docker-compose -f docker-compose.oauth2-proxy.yml --env-file .env.oauth2-proxy up -d
```

Navigate to `http://localhost:4180` to test the authentication flow.

## Notes

- This is a breaking change that requires OAuth2 Proxy to be deployed
- All existing user sessions will be invalidated
- Users will need to authenticate through Okta on their next visit
- The application will not function without OAuth2 Proxy in front of it

## Next Steps

1. Deploy OAuth2 Proxy in production
2. Configure Okta for production use
3. Set up monitoring and logging
4. Remove deprecated `auth.ts` file
5. Update any remaining NextAuth.js references