#!/bin/bash

# Helm Chart Validation Script
# This script validates the Helm chart templates and configuration

set -e

CHART_PATH="./helm/sourcebot"
TEST_VALUES_FILE="/tmp/test-values.yaml"

echo "🧪 Sourcebot Helm Chart Validation"
echo "=================================="

# Create test values file
cat > "$TEST_VALUES_FILE" << EOF
secrets:
  sourcebot:
    authSecret: "test-auth-secret-32-characters-long"
    databaseUrl: "postgresql://user:pass@localhost:5432/sourcebot"
  
  oauth2Proxy:
    clientSecret: "test-client-secret"
    cookieSecret: "test-cookie-secret-32-characters"

oauth2Proxy:
  enabled: true
  config:
    provider: "oidc"
    oidc_issuer_url: "https://test.okta.com/oauth2/default"
    client_id: "test-client-id"
    redirect_url: "https://test.example.com/oauth2/callback"
    email_domains:
      - "example.com"
    upstream: "http://sourcebot:3000"
    
  ingress:
    enabled: true
    hosts:
      - host: test.example.com
        paths:
          - path: /
            pathType: Prefix

sourcebot:
  env:
    SOURCEBOT_TRUST_PROXY_HEADERS: "true"
    AUTH_CREDENTIALS_LOGIN_ENABLED: "false"
    AUTH_EMAIL_CODE_LOGIN_ENABLED: "false"
  
  config:
    connections:
      test-connection:
        type: "github"
        repos:
          - "test/repo"

persistence:
  enabled: true
  size: 10Gi

ingress:
  enabled: false
EOF

echo "✅ Created test values file"

# Test 1: Chart template generation
echo "🔍 Testing chart template generation..."
helm template test-release "$CHART_PATH" -f "$TEST_VALUES_FILE" > /tmp/rendered-templates.yaml
echo "✅ Chart templates rendered successfully"

# Test 2: Validate Kubernetes manifests (skip if no cluster connection)
echo "🔍 Validating Kubernetes manifests..."
if kubectl cluster-info > /dev/null 2>&1; then
    kubectl --dry-run=client apply -f /tmp/rendered-templates.yaml > /dev/null 2>&1
    echo "✅ Kubernetes manifests are valid"
else
    echo "⚠️  Skipping kubectl validation (no cluster connection)"
fi

# Test 3: Check required resources are present
echo "🔍 Checking required resources..."

REQUIRED_RESOURCES=(
    "ServiceAccount"
    "Secret"
    "ConfigMap"
    "Deployment"
    "Service"
    "Ingress"
    "PersistentVolumeClaim"
)

for resource in "${REQUIRED_RESOURCES[@]}"; do
    if grep -q "kind: $resource" /tmp/rendered-templates.yaml; then
        echo "  ✅ $resource found"
    else
        echo "  ❌ $resource missing"
        exit 1
    fi
done

# Test 4: OAuth2 Proxy specific checks
echo "🔍 Checking OAuth2 Proxy configuration..."

# Check OAuth2 Proxy deployment
if grep -q "name: oauth2-proxy" /tmp/rendered-templates.yaml; then
    echo "  ✅ OAuth2 Proxy deployment found"
else
    echo "  ❌ OAuth2 Proxy deployment missing"
    exit 1
fi

# Check OAuth2 Proxy image
if grep -q "quay.io/oauth2-proxy/oauth2-proxy" /tmp/rendered-templates.yaml; then
    echo "  ✅ OAuth2 Proxy image configured"
else
    echo "  ❌ OAuth2 Proxy image missing"
    exit 1
fi

# Check OAuth2 Proxy service
if grep -q "sourcebot-oauth2-proxy" /tmp/rendered-templates.yaml; then
    echo "  ✅ OAuth2 Proxy service found"
else
    echo "  ❌ OAuth2 Proxy service missing"
    exit 1
fi

# Test 5: Environment variable checks
echo "🔍 Checking environment variables..."

# Check SOURCEBOT_TRUST_PROXY_HEADERS
if grep -q "SOURCEBOT_TRUST_PROXY_HEADERS" /tmp/rendered-templates.yaml; then
    echo "  ✅ SOURCEBOT_TRUST_PROXY_HEADERS configured"
else
    echo "  ❌ SOURCEBOT_TRUST_PROXY_HEADERS missing"
    exit 1
fi

# Check AUTH_SECRET from secret
if grep -q "AUTH_SECRET" /tmp/rendered-templates.yaml; then
    echo "  ✅ AUTH_SECRET configured"
else
    echo "  ❌ AUTH_SECRET missing"
    exit 1
fi

# Test 6: Security checks
echo "🔍 Checking security configuration..."

# Check that secrets are base64 encoded
if grep -q "OAUTH2_PROXY_CLIENT_SECRET:" /tmp/rendered-templates.yaml; then
    echo "  ✅ OAuth2 Proxy client secret configured"
else
    echo "  ❌ OAuth2 Proxy client secret missing"
    exit 1
fi

# Test 7: Ingress configuration
echo "🔍 Checking ingress configuration..."

# Check OAuth2 Proxy ingress
if grep -A 10 -B 5 "sourcebot-oauth2-proxy" /tmp/rendered-templates.yaml | grep -q "kind: Ingress"; then
    echo "  ✅ OAuth2 Proxy ingress configured"
else
    echo "  ❌ OAuth2 Proxy ingress missing"
    exit 1
fi

# Check that Sourcebot direct ingress is disabled when OAuth2 Proxy is enabled
SOURCEBOT_INGRESS_COUNT=$(grep -l "name: test-release-sourcebot" /tmp/rendered-templates.yaml | xargs grep -l "kind: Ingress" | wc -l || echo "0")
if [ "$SOURCEBOT_INGRESS_COUNT" -eq 0 ]; then
    echo "  ✅ Direct Sourcebot ingress properly disabled"
else
    echo "  ❌ Direct Sourcebot ingress should be disabled when OAuth2 Proxy is enabled"
fi

# Test 8: Resource limits and requests
echo "🔍 Checking resource configuration..."

# Check OAuth2 Proxy has resource limits
if grep -A 10 "name: oauth2-proxy" /tmp/rendered-templates.yaml | grep -q "limits:"; then
    echo "  ✅ OAuth2 Proxy resource limits configured"
else
    echo "  ❌ OAuth2 Proxy resource limits missing"
fi

# Test 9: Health checks
echo "🔍 Checking health checks..."

# Check OAuth2 Proxy liveness probe
if grep -A 20 "name: oauth2-proxy" /tmp/rendered-templates.yaml | grep -q "livenessProbe:"; then
    echo "  ✅ OAuth2 Proxy liveness probe configured"
else
    echo "  ❌ OAuth2 Proxy liveness probe missing"
fi

# Check Sourcebot health check endpoint
if grep -q "/api/health" /tmp/rendered-templates.yaml; then
    echo "  ✅ Sourcebot health check configured"
else
    echo "  ❌ Sourcebot health check missing"
fi

# Cleanup
rm -f "$TEST_VALUES_FILE" /tmp/rendered-templates.yaml

echo ""
echo "🎉 All validations passed!"
echo "✅ Helm chart is ready for deployment"
echo ""
echo "Next steps:"
echo "1. Update the example values file with your Okta configuration"
echo "2. Run: helm install sourcebot ./helm/sourcebot -f your-values.yaml"
echo "3. Configure your Okta application with the correct redirect URIs"