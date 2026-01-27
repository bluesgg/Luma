#!/bin/bash

# Phase 4: AI Interactive Tutor - Dependency Installation Script
# Run this script to install all required dependencies

set -e  # Exit on error

echo "==========================================="
echo "Phase 4: Installing Dependencies"
echo "==========================================="
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing NPM dependencies..."
echo ""

# AWS SDK for Cloudflare R2
echo "→ Installing AWS SDK packages for R2..."
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Trigger.dev
echo "→ Installing Trigger.dev SDK..."
npm install @trigger.dev/sdk

# KaTeX for LaTeX rendering
echo "→ Installing KaTeX for LaTeX support..."
npm install katex react-katex
npm install --save-dev @types/katex

echo ""
echo "✅ NPM dependencies installed successfully!"
echo ""

# Python dependencies
echo "==========================================="
echo "📦 Installing Python dependencies..."
echo "==========================================="
echo ""

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Warning: python3 not found. Please install Python 3.8+ manually."
    echo "   Visit: https://www.python.org/downloads/"
else
    PYTHON_VERSION=$(python3 --version)
    echo "✓ Found: $PYTHON_VERSION"
    echo ""

    # Install PyMuPDF
    echo "→ Installing PyMuPDF (fitz)..."
    pip3 install PyMuPDF

    echo ""
    echo "✅ Python dependencies installed successfully!"
fi

echo ""
echo "==========================================="
echo "✨ Installation Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "1. Configure environment variables in .env.local"
echo "2. Review PHASE4_COMPLETION_GUIDE.md for setup instructions"
echo "3. Test the implementation with a sample PDF upload"
echo ""
echo "Required environment variables:"
echo "  - OPENROUTER_API_KEY"
echo "  - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
echo "  - TRIGGER_API_KEY, TRIGGER_API_URL (optional for MVP)"
echo "  - MATHPIX_APP_ID, MATHPIX_APP_KEY (optional)"
echo ""
