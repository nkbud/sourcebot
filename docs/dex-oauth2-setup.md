# Dex OAuth2 Integration

This document outlines how to configure Dex OAuth2 authentication for Sourcebot.

## Overview

Dex is an OpenID Connect (OIDC) identity service that uses pluggable connectors to authenticate users through other identity providers. Sourcebot supports Dex as an authentication provider for the standard OAuth2 flow.

## Prerequisites

1. A running Dex server instance
2. A Dex client configured for Sourcebot

## Configuration

### 1. Configure Dex Server

First, configure your Dex server with a client for Sourcebot. Add the following to your Dex configuration:

```yaml
# dex-config.yaml
staticClients:
- id: sourcebot
  redirectURIs:
  - 'http://localhost:3000/api/auth/callback/dex'  # For development
  - 'https://your-sourcebot-domain.com/api/auth/callback/dex'  # For production
  name: 'Sourcebot'
  secret: 'your-secure-client-secret'
```

### 2. Configure Sourcebot Environment Variables

Add the following environment variables to your Sourcebot configuration:

```bash
# Required for Dex OAuth2 support
AUTH_DEX_ISSUER_URL=https://your-dex-server.example.com
AUTH_DEX_CLIENT_ID=sourcebot
AUTH_DEX_CLIENT_SECRET=your-secure-client-secret
```

### 3. Restart Sourcebot

After configuring the environment variables, restart your Sourcebot instance. The Dex provider will automatically appear on the login page if all three environment variables are properly configured.

## OAuth2 Flow

When configured, Sourcebot follows the standard OAuth2 authorization code flow with Dex:

1. User visits Sourcebot and clicks "Sign in with Dex"
2. User is redirected to Dex authorization endpoint
3. Dex determines user identity through its configured connectors
4. User is redirected back to Sourcebot with an authorization code
5. Sourcebot exchanges the code for an ID token and access token
6. User profile information is extracted from the ID token
7. User is signed into Sourcebot

## Supported Claims

Sourcebot extracts the following claims from the Dex ID token:

- `sub` - User ID (required)
- `email` - User email address
- `name` - User display name
- `picture` - User profile picture URL

## Security Considerations

1. **HTTPS**: Always use HTTPS for production deployments
2. **Client Secret**: Keep the client secret secure and rotate it regularly  
3. **Redirect URIs**: Only configure necessary redirect URIs in Dex
4. **Scopes**: Sourcebot requests minimal scopes: `openid email profile`

## Troubleshooting

### Dex Provider Not Showing

If the Dex provider doesn't appear on the login page:

1. Verify all three environment variables are set
2. Check the Sourcebot logs for configuration errors
3. Restart the Sourcebot service

### Authentication Failures

Common issues and solutions:

1. **Invalid redirect URI**: Ensure the redirect URI in Dex matches exactly
2. **Invalid client credentials**: Verify the client ID and secret match Dex configuration
3. **Network connectivity**: Ensure Sourcebot can reach the Dex server
4. **SSL/TLS issues**: Verify certificates if using HTTPS

### Debug Mode

Enable debug logging to troubleshoot authentication issues:

```bash
SOURCEBOT_LOG_LEVEL=debug
```

## Example Dex Configuration

Here's a complete example Dex configuration that includes GitHub as a connector:

```yaml
# dex-config.yaml
issuer: https://dex.example.com

storage:
  type: memory

web:
  http: 0.0.0.0:8080

connectors:
- type: github
  id: github
  name: GitHub
  config:
    clientID: your-github-client-id
    clientSecret: your-github-client-secret
    redirectURI: https://dex.example.com/callback

staticClients:
- id: sourcebot
  redirectURIs:
  - 'https://sourcebot.example.com/api/auth/callback/dex'
  name: 'Sourcebot'
  secret: 'secure-random-secret'

enablePasswordDB: false
```

This configuration allows users to sign into Sourcebot via Dex, which authenticates them through GitHub.