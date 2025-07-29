# Sourcebot Helm Chart with OAuth2 Proxy

This Helm chart deploys Sourcebot with OAuth2 Proxy for enterprise-grade authentication using Okta SSO.

## Architecture

```
User -> OAuth2 Proxy -> Sourcebot Application
```

- **OAuth2 Proxy**: Handles authentication with Okta, sets user headers
- **Sourcebot**: Trusts headers from OAuth2 Proxy for user identification

## Prerequisites

1. Kubernetes cluster
2. Helm 3.x
3. Okta application configured for OAuth2/OIDC
4. PostgreSQL database
5. Ingress controller (nginx recommended)

## Installation

### 1. Create Okta Application

1. Log in to your Okta Admin Console
2. Go to Applications > Applications > Create App Integration
3. Choose "OIDC - OpenID Connect" and "Web Application"
4. Configure:
   - **Sign-in redirect URIs**: `https://your-domain.com/oauth2/callback`
   - **Sign-out redirect URIs**: `https://your-domain.com/oauth2/sign_out`
   - **Assignments**: Configure user/group access as needed

### 2. Prepare Values

Create a `values.yaml` file:

```yaml
# Required: Database configuration
secrets:
  sourcebot:
    databaseUrl: "postgresql://user:password@host:5432/sourcebot"
    authSecret: "your-32-character-secret"  # Generate with: openssl rand -base64 32
  
  oauth2Proxy:
    clientSecret: "your-okta-client-secret"
    cookieSecret: "your-32-character-cookie-secret"  # Generate with: python -c 'import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'

# OAuth2 Proxy configuration
oauth2Proxy:
  enabled: true
  config:
    provider: "oidc"
    oidc_issuer_url: "https://your-domain.okta.com/oauth2/default"
    client_id: "your-okta-client-id"
    redirect_url: "https://your-domain.com/oauth2/callback"
    email_domains:
      - "your-company.com"  # Restrict to your domain
    upstream: "http://sourcebot:3000"
  
  ingress:
    enabled: true
    hosts:
      - host: your-domain.com
        paths:
          - path: /
            pathType: Prefix
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      - secretName: sourcebot-tls
        hosts:
          - your-domain.com

# Sourcebot configuration
sourcebot:
  config:
    connections:
      github-connection:
        type: "github"
        token:
          env: "GITHUB_TOKEN"
        repos:
          - "your-org/your-repo"

# Persistent storage
persistence:
  enabled: true
  size: 20Gi
  storageClass: "your-storage-class"
```

### 3. Install the Chart

```bash
# Add the Helm repository (if publishing to a repository)
helm repo add sourcebot https://your-helm-repo.com
helm repo update

# Install from local chart
helm install sourcebot ./helm/sourcebot \
  --namespace sourcebot \
  --create-namespace \
  -f values.yaml

# Or install with inline values
helm install sourcebot ./helm/sourcebot \
  --namespace sourcebot \
  --create-namespace \
  --set secrets.sourcebot.databaseUrl="postgresql://..." \
  --set secrets.sourcebot.authSecret="..." \
  --set secrets.oauth2Proxy.clientSecret="..." \
  --set secrets.oauth2Proxy.cookieSecret="..." \
  --set oauth2Proxy.config.oidc_issuer_url="https://your-domain.okta.com/oauth2/default" \
  --set oauth2Proxy.config.client_id="your-client-id" \
  --set oauth2Proxy.config.redirect_url="https://your-domain.com/oauth2/callback"
```

## Configuration Reference

### OAuth2 Proxy Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `oauth2Proxy.enabled` | Enable OAuth2 Proxy | `true` |
| `oauth2Proxy.config.provider` | OAuth2 provider | `"oidc"` |
| `oauth2Proxy.config.oidc_issuer_url` | Okta issuer URL | `""` |
| `oauth2Proxy.config.client_id` | Okta client ID | `""` |
| `oauth2Proxy.config.redirect_url` | OAuth2 callback URL | `""` |
| `oauth2Proxy.config.email_domains` | Allowed email domains | `["*"]` |
| `oauth2Proxy.config.upstream` | Sourcebot service URL | `"http://sourcebot:3000"` |

### Sourcebot Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sourcebot.env.SOURCEBOT_TRUST_PROXY_HEADERS` | Trust OAuth2 Proxy headers | `"true"` |
| `sourcebot.env.AUTH_CREDENTIALS_LOGIN_ENABLED` | Enable local auth | `"false"` |
| `sourcebot.env.AUTH_EMAIL_CODE_LOGIN_ENABLED` | Enable email auth | `"false"` |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.oauth2Proxy.clientSecret` | Okta client secret | `""` |
| `secrets.oauth2Proxy.cookieSecret` | OAuth2 Proxy cookie secret | `""` |
| `secrets.sourcebot.authSecret` | NextAuth secret | `""` |
| `secrets.sourcebot.databaseUrl` | Database connection string | `""` |

## Authentication Flow

1. User accesses `https://your-domain.com`
2. OAuth2 Proxy intercepts the request
3. If not authenticated, redirects to Okta login
4. After successful login, Okta redirects to OAuth2 Proxy callback
5. OAuth2 Proxy validates the token and sets headers:
   - `X-Forwarded-User`: Username
   - `X-Forwarded-Email`: User email
   - `X-Forwarded-Preferred-Username`: Display name
   - `X-Forwarded-Groups`: User groups (if configured)
6. Request is forwarded to Sourcebot with headers
7. Sourcebot trusts the headers and creates/updates user session

## Troubleshooting

### OAuth2 Proxy Logs

```bash
kubectl logs -n sourcebot deployment/sourcebot-oauth2-proxy
```

### Sourcebot Logs

```bash
kubectl logs -n sourcebot deployment/sourcebot
```

### Common Issues

1. **"Invalid client" error**: Check Okta client ID and secret
2. **"Redirect URI mismatch"**: Ensure Okta redirect URI matches `redirect_url`
3. **"Access denied"**: Check `email_domains` configuration
4. **Headers not trusted**: Verify `SOURCEBOT_TRUST_PROXY_HEADERS=true`

### Testing Headers Locally

You can test header-based authentication by setting headers manually:

```bash
curl -H "X-Forwarded-User: testuser" \
     -H "X-Forwarded-Email: test@company.com" \
     http://localhost:3000/api/auth/signin/oauth2-proxy
```

## Monitoring

The chart includes health checks and monitoring endpoints:

- OAuth2 Proxy: `/ping`
- Sourcebot: `/api/health`

## Security Considerations

1. **TLS**: Always use HTTPS in production
2. **Cookie Security**: OAuth2 Proxy cookies are secure and HTTP-only
3. **Header Validation**: Sourcebot validates headers from trusted proxy
4. **Access Control**: Configure Okta groups/roles for fine-grained access
5. **Network Policies**: Restrict traffic between OAuth2 Proxy and Sourcebot

## Upgrading

```bash
helm upgrade sourcebot ./helm/sourcebot \
  --namespace sourcebot \
  -f values.yaml
```

## Chart Repository

The Helm chart is automatically published to GitHub Container Registry (GHCR) on every push to main and version tags.

### Using the Published Chart

Add the Sourcebot Helm repository:

```bash
# Using OCI registry (Helm 3.8+)
helm upgrade --install sourcebot oci://ghcr.io/nkbud/sourcebot \
  --namespace sourcebot \
  --create-namespace \
  -f values.yaml
```

### Available Versions

- **Latest**: Built from the main branch
- **Versioned**: Built from git tags (e.g., `v1.0.0`)

```bash
# Install specific version
helm upgrade --install sourcebot oci://ghcr.io/nkbud/sourcebot \
  --version 1.0.0 \
  --namespace sourcebot \
  --create-namespace \
  -f values.yaml
```

## Uninstalling

```bash
helm uninstall sourcebot --namespace sourcebot
```

Note: This will not delete PersistentVolumeClaims. Delete them manually if needed:

```bash
kubectl delete pvc -n sourcebot sourcebot-data
```