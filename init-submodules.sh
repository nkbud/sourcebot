#!/bin/bash

# init-submodules.sh
# This script ensures that git submodules are initialized and updated.
# This is required before building the Docker image or running the application.

set -e

echo "🔧 Checking git submodules..."

# Check if vendor/zoekt directory exists and has content
if [ ! -f "vendor/zoekt/install-ctags-alpine.sh" ]; then
    echo "📦 Initializing git submodules..."
    git submodule init
    git submodule update
    echo "✅ Git submodules initialized successfully"
else
    echo "✅ Git submodules are already initialized"
fi

# Verify the required file exists
if [ ! -f "vendor/zoekt/install-ctags-alpine.sh" ]; then
    echo "❌ Error: Required file vendor/zoekt/install-ctags-alpine.sh is still missing"
    echo "   This may indicate a problem with the git submodules."
    echo "   Try running: git submodule update --init --recursive"
    exit 1
fi

echo "🎉 All required files are present. You can now build the Docker image."