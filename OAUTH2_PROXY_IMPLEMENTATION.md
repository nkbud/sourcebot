# OAuth2 Proxy Implementation Summary

This document summarizes the OAuth2 Proxy implementation for Sourcebot with Okta SSO authentication.

## What Was Implemented

### 1. Complete Helm Chart (`helm/sourcebot/`)

A production-ready Helm chart that deploys:
- **Sourcebot application** with header-based authentication support
- **OAuth2 Proxy** as a standalone authentication service
- **PostgreSQL** database integration
- **Persistent storage** for repository indexes
- **Ingress configuration** for external access
- **Secrets management** for credentials

### 2. OAuth2 Proxy Integration

- **Standalone OAuth2 Proxy deployment** using `quay.io/oauth2-proxy/oauth2-proxy:v7.6.0`
- **Okta OIDC configuration** for enterprise SSO
- **Header forwarding** (`X-Forwarded-User`, `X-Forwarded-Email`, etc.)
- **Cookie-based session management** with secure configuration
- **Health checks and monitoring** endpoints

### 3. Sourcebot Authentication Updates

- **New environment variables**:
  - `SOURCEBOT_TRUST_PROXY_HEADERS=true` - Enable header-based auth
  - `SOURCEBOT_PROXY_USER_HEADER` - Configurable user header (default: X-Forwarded-User)
  - `SOURCEBOT_PROXY_EMAIL_HEADER` - Configurable email header (default: X-Forwarded-Email)
  - `SOURCEBOT_PROXY_NAME_HEADER` - Configurable name header (default: X-Forwarded-Preferred-Username)
  - `SOURCEBOT_PROXY_GROUPS_HEADER` - Configurable groups header (default: X-Forwarded-Groups)

- **New OAuth2 Proxy authentication provider** in NextAuth.js:
  - Validates headers from trusted proxy
  - Creates/updates users based on header information
  - Supports group/role information from headers
  - Maintains backward compatibility with existing auth methods

### 4. Security Features

- **TLS termination** at ingress level
- **Secure cookie configuration** (HTTP-only, secure, SameSite)
- **Header validation** to prevent spoofing
- **Resource limits** and security contexts
- **Secret management** via Kubernetes secrets

### 5. Documentation and Tooling

- **Comprehensive documentation** (`helm/README.md`)
- **Interactive installation script** (`helm/install.sh`)
- **Validation and testing script** (`helm/validate.sh`)
- **Example configurations** (`helm/sourcebot/examples/`)
- **Unit tests** for OAuth2 Proxy logic

## Architecture

```
Internet → Ingress → OAuth2 Proxy → Sourcebot Application
                            ↓
                    Okta OIDC/OAuth2
```

### Authentication Flow

1. **User accesses Sourcebot URL**
2. **OAuth2 Proxy intercepts request**
3. **If not authenticated**: Redirect to Okta login
4. **User authenticates with Okta**
5. **Okta redirects to OAuth2 Proxy callback**
6. **OAuth2 Proxy validates token and sets headers**:
   - `X-Forwarded-User`: Username/ID
   - `X-Forwarded-Email`: User email
   - `X-Forwarded-Preferred-Username`: Display name
   - `X-Forwarded-Groups`: User groups (comma-separated)
7. **Request forwarded to Sourcebot with headers**
8. **Sourcebot validates headers and creates/updates user session**

## Key Benefits

### For Users
- **Single Sign-On** with existing Okta credentials
- **Seamless authentication** experience
- **Group-based access control** (if configured)
- **Enterprise security standards** compliance

### For Administrators
- **Centralized access control** via Okta
- **Easy deployment** with Helm
- **Scalable architecture** on Kubernetes
- **Monitoring and logging** capabilities
- **Configuration flexibility** through values.yaml

### For Developers
- **Minimal code changes** to existing authentication
- **Backward compatibility** with existing auth methods
- **Clear separation of concerns** (auth proxy vs. application)
- **Standard OAuth2/OIDC implementation**

## Configuration Examples

### Minimal Okta Configuration
```yaml
oauth2Proxy:
  config:
    oidc_issuer_url: "https://company.okta.com/oauth2/default"
    client_id: "okta-client-id"
    redirect_url: "https://sourcebot.company.com/oauth2/callback"
    email_domains: ["company.com"]
```

### Advanced Security Configuration
```yaml
oauth2Proxy:
  config:
    cookie_secure: true
    cookie_httponly: true
    cookie_samesite: "strict"
    insecure_oidc_allow_unverified_email: false
    pass_authorization_header: false
    pass_access_token: false
```

## Deployment Options

### Quick Setup
```bash
./helm/install.sh  # Interactive installation
```

### Manual Installation
```bash
helm install sourcebot ./helm/sourcebot \
  --set secrets.oauth2Proxy.clientSecret="your-secret" \
  --set oauth2Proxy.config.oidc_issuer_url="https://company.okta.com/oauth2/default"
```

### Production Deployment
```bash
helm install sourcebot ./helm/sourcebot \
  --namespace sourcebot \
  --create-namespace \
  -f production-values.yaml
```

## Testing and Validation

The implementation includes comprehensive testing:

- **Helm chart validation** (`helm/validate.sh`)
- **Template generation testing**
- **Kubernetes manifest validation**
- **OAuth2 Proxy configuration checks**
- **Security configuration validation**
- **Unit tests** for authentication logic

## Migration Path

This implementation provides a clear migration path from existing authentication:

1. **Phase 1**: Deploy with OAuth2 Proxy alongside existing auth
2. **Phase 2**: Migrate users to OAuth2 Proxy authentication
3. **Phase 3**: Disable legacy authentication methods (future enhancement)

## Future Enhancements

Potential future improvements (not implemented in this PR):

- **Remove legacy authentication code** (per strategic plan)
- **Advanced group/role mapping** from Okta to Sourcebot permissions
- **Multi-tenant support** with OAuth2 Proxy
- **Additional OAuth2 providers** (Azure AD, Google Workspace)
- **Advanced monitoring and metrics** collection

## Files Modified/Added

### Modified Files
- `packages/web/src/env.mjs` - Added OAuth2 Proxy environment variables
- `packages/web/src/ee/features/sso/sso.tsx` - Added OAuth2 Proxy authentication provider
- `README.md` - Added Helm chart deployment documentation

### New Files
- `helm/sourcebot/Chart.yaml` - Helm chart metadata
- `helm/sourcebot/values.yaml` - Default configuration values
- `helm/sourcebot/templates/*.yaml` - Kubernetes resource templates
- `helm/sourcebot/examples/okta-oauth2-proxy.yaml` - Example configuration
- `helm/README.md` - Comprehensive deployment guide
- `helm/install.sh` - Interactive installation script
- `helm/validate.sh` - Validation and testing script
- `packages/web/src/ee/features/sso/oauth2-proxy.test.ts` - Unit tests

This implementation provides a complete, production-ready solution for deploying Sourcebot with OAuth2 Proxy and Okta SSO authentication while maintaining minimal changes to the existing codebase.