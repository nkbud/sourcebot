# OAuth2 Proxy Authentication Integration

This document describes the OAuth2 Proxy authentication integration for Sourcebot, including security considerations, MCP server compatibility, and deployment guidelines.

## Overview

The OAuth2 Proxy authentication integration provides header-based authentication for Sourcebot when deployed with OAuth2 Proxy as a sidecar service. This setup enables enterprise SSO authentication through OIDC/OAuth2 providers like Okta, Azure AD, and others.

## Architecture

```
Internet → Ingress → OAuth2 Proxy → Sourcebot Application
                            ↓
                    OIDC/OAuth2 Provider
                       (Okta, Azure AD, etc.)
```

### Authentication Flow

1. **User Request**: User accesses Sourcebot through the ingress
2. **OAuth2 Proxy Check**: OAuth2 Proxy checks for valid session
3. **Redirect to Provider**: If not authenticated, redirects to OIDC provider
4. **Provider Authentication**: User authenticates with OIDC provider
5. **Return to OAuth2 Proxy**: Provider redirects back with authorization code
6. **Token Exchange**: OAuth2 Proxy exchanges code for tokens
7. **Header Injection**: OAuth2 Proxy forwards request with user headers
8. **Sourcebot Authentication**: Sourcebot validates headers and creates session

## Security Model

### Network-Level Security

When OAuth2 Proxy authentication is enabled, the following security measures are enforced:

1. **Network Policies**: Kubernetes NetworkPolicies prevent direct access to Sourcebot
2. **Ingress Isolation**: Only OAuth2 Proxy is exposed through the ingress
3. **Header Validation**: Sourcebot validates required OAuth2 Proxy headers
4. **Direct Access Prevention**: Middleware blocks requests without proper headers

### Header Validation

Sourcebot validates the following headers from OAuth2 Proxy:

| Header | Required | Purpose |
|--------|----------|---------|
| `X-Forwarded-Email` | Yes | User's email address |
| `X-Forwarded-User` | Yes | User identifier |
| `X-Forwarded-Preferred-Username` | No | Display name |
| `X-Forwarded-Groups` | No | User groups |

### Configuration Security

Critical security configurations:

```yaml
# Environment variables
SOURCEBOT_TRUST_PROXY_HEADERS=true           # Enable OAuth2 Proxy mode
SOURCEBOT_PROXY_EMAIL_HEADER=X-Forwarded-Email
SOURCEBOT_PROXY_USER_HEADER=X-Forwarded-User

# Helm values
oauth2Proxy:
  enabled: true
  config:
    cookie_secure: true        # Secure cookies
    cookie_httponly: true      # HttpOnly cookies
    cookie_samesite: lax       # SameSite protection

networkPolicy:
  enabled: true               # Enable network policies
```

## MCP Server Integration

### Overview

The Model Context Protocol (MCP) server in Sourcebot maintains full compatibility with OAuth2 Proxy authentication. The MCP server respects the same authentication headers and security model.

### Authentication Headers for MCP

When accessing MCP endpoints through OAuth2 Proxy, the following headers are automatically forwarded:

```http
GET /api/mcp/tools
X-Forwarded-Email: user@company.com
X-Forwarded-User: user123
X-Forwarded-Preferred-Username: John Doe
X-Forwarded-Groups: developers,admin
```

### MCP Server Behavior

1. **Header-Based Authentication**: MCP server validates OAuth2 Proxy headers
2. **User Context**: MCP operations are performed in the authenticated user's context
3. **Permission Enforcement**: User permissions are enforced for MCP operations
4. **Audit Logging**: All MCP operations are logged with user identity

### MCP Client Configuration

When using MCP clients with OAuth2 Proxy-authenticated Sourcebot:

```json
{
  "mcpServers": {
    "sourcebot": {
      "command": "npx",
      "args": ["@sourcebot/mcp-server"],
      "env": {
        "SOURCEBOT_API_URL": "https://sourcebot.company.com/api/mcp",
        "SOURCEBOT_AUTH_MODE": "oauth2_proxy"
      }
    }
  }
}
```

### Direct MCP Access

**Important**: When OAuth2 Proxy mode is enabled, direct access to MCP endpoints is blocked. All MCP requests must go through OAuth2 Proxy to ensure proper authentication.

## Deployment Guide

### Prerequisites

1. Kubernetes cluster with ingress controller
2. OAuth2 provider (Okta, Azure AD, etc.) configured
3. DNS configuration for your domain
4. TLS certificates

### Helm Installation

```bash
# Add repository and update
helm repo add sourcebot oci://ghcr.io/nkbud/sourcebot
helm repo update

# Install with OAuth2 Proxy
helm install sourcebot sourcebot/sourcebot \
  --set oauth2Proxy.enabled=true \
  --set oauth2Proxy.config.oidc_issuer_url="https://company.okta.com/oauth2/default" \
  --set oauth2Proxy.config.client_id="your-client-id" \
  --set-string secrets.oauth2Proxy.clientSecret="your-client-secret" \
  --set-string secrets.oauth2Proxy.cookieSecret="$(openssl rand -base64 32)" \
  --set-string secrets.sourcebot.authSecret="$(openssl rand -base64 32)" \
  --set oauth2Proxy.ingress.hosts[0].host="sourcebot.company.com" \
  --set oauth2Proxy.ingress.hosts[0].paths[0].path="/" \
  --set oauth2Proxy.ingress.hosts[0].paths[0].pathType="Prefix"
```

### Environment Variables

The following environment variables are automatically configured when using the Helm chart:

```bash
# OAuth2 Proxy authentication
SOURCEBOT_TRUST_PROXY_HEADERS=true
SOURCEBOT_PROXY_EMAIL_HEADER=X-Forwarded-Email
SOURCEBOT_PROXY_USER_HEADER=X-Forwarded-User
SOURCEBOT_PROXY_NAME_HEADER=X-Forwarded-Preferred-Username
SOURCEBOT_PROXY_GROUPS_HEADER=X-Forwarded-Groups

# NextAuth configuration
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://sourcebot.company.com
```

## Security Best Practices

### Network Security

1. **Enable Network Policies**: Always enable NetworkPolicies in production
2. **Restrict Ingress**: Only OAuth2 Proxy should be accessible from outside
3. **Use TLS**: Enable TLS for all communications
4. **Firewall Rules**: Configure firewall rules to prevent direct access

### OAuth2 Provider Configuration

1. **Validate Domains**: Configure email domain restrictions
2. **Group Mapping**: Use group claims for role-based access
3. **Token Validation**: Enable proper token validation
4. **Audit Logging**: Enable audit logging at the provider level

### Application Security

1. **Header Validation**: Always validate OAuth2 Proxy headers
2. **Session Security**: Use secure session configuration
3. **CSRF Protection**: Enable CSRF protection
4. **Content Security Policy**: Configure proper CSP headers

## Monitoring and Debugging

### Health Checks

Monitor the following endpoints:

- OAuth2 Proxy: `http://oauth2-proxy:4180/ping`
- Sourcebot: `http://sourcebot:3000/api/health`

### Logs

Key log entries to monitor:

```
# OAuth2 Proxy authentication success
OAuth2 Proxy authentication for user: user@company.com, groups: developers, admin

# OAuth2 Proxy authentication failure
OAuth2 Proxy authentication failed: Missing or invalid email header

# Direct access attempt
Request missing required OAuth2 Proxy headers - possible direct access attempt
```

### Common Issues

1. **Direct Access Blocked**: Ensure all traffic goes through OAuth2 Proxy
2. **Header Missing**: Check OAuth2 Proxy configuration for header forwarding
3. **Network Policy**: Verify NetworkPolicy allows OAuth2 Proxy → Sourcebot traffic
4. **OIDC Configuration**: Validate OIDC provider settings

## Testing

### Unit Tests

Run OAuth2 Proxy authentication tests:

```bash
cd packages/web
npm test -- oauth2ProxyAuth.test.ts
```

### Integration Tests

Test the complete authentication flow:

```bash
# Test OAuth2 Proxy endpoint
curl -H "X-Forwarded-Email: test@company.com" \
     -H "X-Forwarded-User: testuser" \
     https://sourcebot.company.com/api/health

# Test direct access blocking (should fail)
curl https://sourcebot.company.com/api/health
```

## Migration from Other Authentication

### From Username/Password

1. Deploy OAuth2 Proxy alongside existing authentication
2. Test OAuth2 Proxy authentication with test users
3. Update configuration to enable `SOURCEBOT_TRUST_PROXY_HEADERS`
4. Disable password authentication
5. Remove unused authentication providers

### From SAML

1. Configure OIDC provider as SAML bridge
2. Deploy OAuth2 Proxy with OIDC configuration
3. Test authentication flow
4. Update user mappings if necessary
5. Switch traffic to OAuth2 Proxy

## Troubleshooting

### Authentication Failures

1. Check OAuth2 Proxy logs for OIDC errors
2. Verify OIDC provider configuration
3. Validate client ID and secret
4. Check network connectivity to OIDC provider

### Direct Access Issues

1. Verify NetworkPolicy is applied
2. Check ingress configuration
3. Validate middleware is processing headers
4. Review Sourcebot application logs

### MCP Server Issues

1. Ensure MCP requests include authentication headers
2. Check MCP server logs for authentication errors
3. Verify user permissions for MCP operations
4. Test MCP endpoints through OAuth2 Proxy

## Security Considerations

### Production Checklist

- [ ] OAuth2 Proxy is the only public-facing service
- [ ] NetworkPolicies are enabled and restrictive
- [ ] TLS is enabled end-to-end
- [ ] OIDC provider is properly configured
- [ ] Audit logging is enabled
- [ ] Security headers are configured
- [ ] Direct access to Sourcebot is blocked
- [ ] MCP server requires authentication headers
- [ ] Monitoring and alerting are configured

### Threat Model

The OAuth2 Proxy integration protects against:

- **Direct Access**: Network policies prevent bypassing OAuth2 Proxy
- **Header Injection**: Headers are validated and sanitized
- **Session Hijacking**: Secure cookies and CSRF protection
- **Unauthorized MCP Access**: MCP operations require authentication

### Known Limitations

- Requires Kubernetes environment with NetworkPolicy support
- OAuth2 Proxy adds latency to requests
- Complex initial setup compared to simple authentication
- Dependency on external OIDC provider availability

## References

- [OAuth2 Proxy Documentation](https://oauth2-proxy.github.io/oauth2-proxy/)
- [Kubernetes NetworkPolicy Guide](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [OIDC Specification](https://openid.net/connect/)
- [Sourcebot MCP Server Documentation](../README.md#mcp-server)