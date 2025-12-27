#!/bin/bash

# YCW Email Relay Service Setup Script

echo "🚀 Setting up YCW Email Relay Service..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the application"
else
    echo "✅ .env file already exists"
fi

# Create database directory
echo "🗄️  Creating database directory..."
mkdir -p database

# Initialize database
echo "🗄️  Initializing database..."
pnpm migrate

# Build project
echo "🔨 Building project..."
pnpm build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'pnpm dev' for development or 'pnpm start' for production"
echo "3. Generate an API key: POST /api/v1/api-keys/generate"
echo ""

