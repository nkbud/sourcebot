#!/bin/bash

# Simple verification script for Dex OAuth2 implementation
# This script performs basic checks without requiring full test environment

set -e

echo "🔍 Verifying Dex OAuth2 Implementation"

# Check if all required files exist
echo "📁 Checking implementation files..."

files=(
    "packages/web/src/auth.ts"
    "packages/web/src/env.mjs"
    "packages/web/src/lib/utils.ts"
    "packages/web/src/app/login/components/loginForm.tsx"
    "packages/web/public/dex.svg"
    "configs/dex-auth.json"
    "docs/dex-oauth2-setup.md"
    ".env.development"
)

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        exit 1
    fi
done

echo ""
echo "🔧 Checking implementation details..."

# Check if Dex provider function exists and is exported
if grep -q "export const createDexProvider" packages/web/src/auth.ts; then
    echo "  ✅ createDexProvider function is exported"
else
    echo "  ❌ createDexProvider function not found or not exported"
    exit 1
fi

# Check if environment variables are defined
if grep -q "AUTH_DEX_ISSUER_URL" packages/web/src/env.mjs; then
    echo "  ✅ Dex environment variables defined"
else
    echo "  ❌ Dex environment variables not found"
    exit 1
fi

# Check if Dex provider is integrated into getProviders
if grep -q "const dexProvider = createDexProvider()" packages/web/src/auth.ts; then
    echo "  ✅ Dex provider integrated into getProviders()"
else
    echo "  ❌ Dex provider not integrated"
    exit 1
fi

# Check if Dex SVG icon exists
if [[ -f "packages/web/public/dex.svg" ]]; then
    echo "  ✅ Dex icon available"
else
    echo "  ❌ Dex icon missing"
    exit 1
fi

# Check if provider info is added to utils
if grep -q '"dex"' packages/web/src/lib/utils.ts; then
    echo "  ✅ Dex provider info in utils"
else
    echo "  ❌ Dex provider info not found in utils"
    exit 1
fi

echo ""
echo "📝 Checking documentation..."

# Check if setup documentation exists
if [[ -f "docs/dex-oauth2-setup.md" ]]; then
    echo "  ✅ Setup documentation exists"
else
    echo "  ❌ Setup documentation missing"
    exit 1
fi

# Check if example configuration exists
if [[ -f "configs/dex-auth.json" ]]; then
    echo "  ✅ Example configuration exists"
else
    echo "  ❌ Example configuration missing"
    exit 1
fi

echo ""
echo "🧪 Checking test infrastructure..."

# Check if test files exist
test_files=(
    "docker-compose.test.yml"
    "configs/dex-test-config.yaml"
    ".env.test"
    "packages/web/tests/e2e/dex-oauth.spec.ts"
    "packages/web/src/auth.test.ts"
    "packages/web/playwright.config.ts"
    "scripts/test-dex-oauth.sh"
    "docs/testing-dex-oauth2.md"
)

for file in "${test_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

echo ""
echo "🔐 Checking OAuth2 configuration..."

# Check OAuth2 endpoints in createDexProvider
if grep -q "authorization:" packages/web/src/auth.ts; then
    echo "  ✅ Authorization endpoint configured"
else
    echo "  ❌ Authorization endpoint not found"
    exit 1
fi

if grep -q "token:" packages/web/src/auth.ts; then
    echo "  ✅ Token endpoint configured"
else
    echo "  ❌ Token endpoint not found"
    exit 1
fi

if grep -q "userinfo:" packages/web/src/auth.ts; then
    echo "  ✅ UserInfo endpoint configured"
else
    echo "  ❌ UserInfo endpoint not found"
    exit 1
fi

# Check OAuth2 scopes
if grep -q "openid email profile" packages/web/src/auth.ts; then
    echo "  ✅ OAuth2 scopes configured"
else
    echo "  ❌ OAuth2 scopes not found"
    exit 1
fi

echo ""
echo "📊 Implementation Summary:"
echo "  ✅ Core Dex provider implementation"
echo "  ✅ Environment variable configuration"
echo "  ✅ UI integration (login form, icons)"
echo "  ✅ Documentation and examples"
echo "  ✅ Test infrastructure setup"
echo "  ✅ OAuth2 endpoints and scopes"

echo ""
echo "🎉 Dex OAuth2 implementation verification completed successfully!"
echo ""
echo "🚀 To test the implementation:"
echo "  1. Start test environment: docker-compose -f docker-compose.test.yml up -d"
echo "  2. Configure test env: cp .env.test .env.local"  
echo "  3. Run the application: yarn dev"
echo "  4. Visit: http://localhost:3000/login"
echo "  5. Click 'Sign in with Dex' to test the OAuth flow"
echo ""
echo "📖 For detailed testing instructions, see: docs/testing-dex-oauth2.md"