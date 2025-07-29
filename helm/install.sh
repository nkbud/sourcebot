#!/bin/bash

# Sourcebot Helm Chart Installation Script
# This script helps install Sourcebot with OAuth2 Proxy for Okta authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
NAMESPACE="sourcebot"
RELEASE_NAME="sourcebot"
CHART_PATH="./helm/sourcebot"
VALUES_FILE=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v helm &> /dev/null; then
        print_error "Helm is not installed. Please install Helm 3.x first."
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_status "Prerequisites check passed!"
}

# Function to generate secrets
generate_secrets() {
    print_status "Generating secrets..."
    
    # Generate auth secret
    AUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    
    # Generate cookie secret
    COOKIE_SECRET=$(python3 -c 'import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())' 2>/dev/null || openssl rand -base64 32 | tr -d '\n')
    
    echo "Generated secrets:"
    echo "  AUTH_SECRET: $AUTH_SECRET"
    echo "  COOKIE_SECRET: $COOKIE_SECRET"
    echo ""
    echo "Save these secrets securely!"
}

# Function to prompt for Okta configuration
prompt_okta_config() {
    print_status "Please provide your Okta configuration:"
    
    read -p "Okta Issuer URL (e.g., https://your-company.okta.com/oauth2/default): " OKTA_ISSUER
    read -p "Okta Client ID: " OKTA_CLIENT_ID
    read -s -p "Okta Client Secret: " OKTA_CLIENT_SECRET
    echo ""
    read -p "Your domain for Sourcebot (e.g., sourcebot.your-company.com): " SOURCEBOT_DOMAIN
    read -p "Allowed email domain (e.g., your-company.com): " EMAIL_DOMAIN
    read -p "Database URL (postgresql://user:pass@host:5432/db): " DATABASE_URL
    
    echo ""
    print_status "Configuration collected!"
}

# Function to create values file
create_values_file() {
    VALUES_FILE="values-generated.yaml"
    
    print_status "Creating values file: $VALUES_FILE"
    
    cat > "$VALUES_FILE" << EOF
# Generated Sourcebot values for OAuth2 Proxy with Okta
secrets:
  sourcebot:
    authSecret: "${AUTH_SECRET}"
    databaseUrl: "${DATABASE_URL}"
  
  oauth2Proxy:
    clientSecret: "${OKTA_CLIENT_SECRET}"
    cookieSecret: "${COOKIE_SECRET}"

oauth2Proxy:
  enabled: true
  config:
    provider: "oidc"
    oidc_issuer_url: "${OKTA_ISSUER}"
    client_id: "${OKTA_CLIENT_ID}"
    redirect_url: "https://${SOURCEBOT_DOMAIN}/oauth2/callback"
    email_domains:
      - "${EMAIL_DOMAIN}"
    upstream: "http://sourcebot:3000"
    
  ingress:
    enabled: true
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/proxy-buffer-size: "16k"
      nginx.ingress.kubernetes.io/proxy-buffers-number: "8"
    hosts:
      - host: ${SOURCEBOT_DOMAIN}
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: sourcebot-tls
        hosts:
          - ${SOURCEBOT_DOMAIN}

sourcebot:
  env:
    SOURCEBOT_TRUST_PROXY_HEADERS: "true"
    AUTH_CREDENTIALS_LOGIN_ENABLED: "false"
    AUTH_EMAIL_CODE_LOGIN_ENABLED: "false"
  
  config:
    connections:
      starter-connection:
        type: "github"
        repos:
          - "nkbud/sourcebot"

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1"

persistence:
  enabled: true
  size: 20Gi

ingress:
  enabled: false
EOF

    print_status "Values file created: $VALUES_FILE"
}

# Function to install the chart
install_chart() {
    print_status "Installing Sourcebot with OAuth2 Proxy..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Install the chart
    helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout 10m
    
    print_status "Installation completed!"
}

# Function to show post-installation instructions
show_instructions() {
    print_status "Post-installation instructions:"
    echo ""
    echo "1. Configure your Okta application:"
    echo "   - Sign-in redirect URI: https://${SOURCEBOT_DOMAIN}/oauth2/callback"
    echo "   - Sign-out redirect URI: https://${SOURCEBOT_DOMAIN}/oauth2/sign_out"
    echo ""
    echo "2. Check the deployment status:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo ""
    echo "3. View logs:"
    echo "   kubectl logs -n $NAMESPACE deployment/sourcebot"
    echo "   kubectl logs -n $NAMESPACE deployment/sourcebot-oauth2-proxy"
    echo ""
    echo "4. Access Sourcebot at: https://${SOURCEBOT_DOMAIN}"
    echo ""
    print_warning "Make sure your DNS points ${SOURCEBOT_DOMAIN} to your ingress controller!"
}

# Main function
main() {
    echo "Sourcebot OAuth2 Proxy Installation Script"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -r|--release)
                RELEASE_NAME="$2"
                shift 2
                ;;
            -f|--values)
                VALUES_FILE="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -n, --namespace NAME    Kubernetes namespace (default: sourcebot)"
                echo "  -r, --release NAME      Helm release name (default: sourcebot)"
                echo "  -f, --values FILE       Use existing values file"
                echo "  -h, --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    check_prerequisites
    
    if [[ -z "$VALUES_FILE" ]]; then
        generate_secrets
        prompt_okta_config
        create_values_file
    else
        print_status "Using existing values file: $VALUES_FILE"
    fi
    
    install_chart
    show_instructions
    
    print_status "Installation script completed successfully!"
}

# Run the main function
main "$@"